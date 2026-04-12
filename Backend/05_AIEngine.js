/**
 * 05_AIEngine.gs  (IAG V8.1)
 * موحّد من: AIEngine.txt
 *
 * ⚠️ الملف الوحيد المسموح له باستدعاء Gemini API
 *
 * Public API:
 *   aiV8_correctText(text, options)   → string
 *
 * Compat aliases:
 *   AIEngine.correctText(text, options)
 *   fixTextOnly(text, context)
 *   rewriteLight(text, context)
 *   rewriteFull(text, context)
 *   correctComplaintText(text, apiKey)
 */

/* ============================================================
   SECTION 1 — Config
   ============================================================ */

const AI_CFG = {
  GEMINI: {
    MODELS: [
      'gemini-2.5-flash',
      'gemini-2.5-pro',
      'gemini-1.5-flash',
      'gemini-1.5-pro'
    ],
    BASE_URL: 'https://generativelanguage.googleapis.com/v1beta/models/',
    GENERATION_CONFIG: {
      temperature:      0,
      maxOutputTokens:  4096,
      topP:             1,
      topK:             1
    },
    RETRY: {
      MAX_ATTEMPTS:        3,
      INITIAL_DELAY_MS:    1500,
      BACKOFF_MULTIPLIER:  2
    }
  },

  MODES: {
    FIX_ONLY:       'fix_only',
    REWRITE_LIGHT:  'rewrite_light',
    REWRITE_FULL:   'rewrite_full'
  },

  CONTEXTS: {
    TECHNICAL:  'technical',
    FINANCIAL:  'financial',
    COMPLAINT:  'complaint',
    GENERAL:    'general'
  },

  VALIDATION: {
    MAX_WORD_DROP_RATIO:    0.15,
    ENFORCE_BULLETS_COUNT:  true,
    ENFORCE_NUMBERS_PRESENCE: true
  },

  GLOSSARY: {
    SHEET_NAME: 'AI_GLOSSARY',
    COL_TERM:   'term',
    COL_KEEP:   'keep_exact'
  },

  MAX_CHARS_PER_CHUNK: 900
};

/* ============================================================
   SECTION 2 — Main Entry  (aiV8_correctText)
   ============================================================ */

function aiV8_correctText(text, options) {
  if (!text || typeof text !== 'string' || text.trim().length === 0) return text || '';

  var clean = text.trim();
  if (clean.length < 5)                                       return clean;
  if (clean === '—' || clean === '-' || clean === 'لا يوجد') return clean;

  var opts   = aiV8_processOptions_(options);
  var apiKey = aiV8_getGeminiKey_();
  if (!apiKey) {
    aiV8_logError_('aiV8_correctText', 'Gemini API Key missing', opts);
    return clean;
  }

  var pack = aiV8_protectSensitive_(clean);

  // chunk large text
  if (pack.protectedText.length > AI_CFG.MAX_CHARS_PER_CHUNK) {
    var chunks     = aiV8_splitToChunks_(pack.protectedText, AI_CFG.MAX_CHARS_PER_CHUNK);
    var fixedChunks = [];

    for (var ci = 0; ci < chunks.length; ci++) {
      var chunkPrompt = aiV8_buildPrompt_(chunks[ci], opts);
      var chunkResult = aiV8_tryModels_(chunkPrompt, apiKey);

      if (chunkResult === null) {
        fixedChunks.push(aiV8_restoreSensitive_(chunks[ci], pack));
        continue;
      }

      var restoredChunk   = aiV8_restoreSensitive_(chunkResult, pack);
      var originalChunk   = aiV8_restoreSensitive_(chunks[ci], pack);
      var validation      = aiV8_validateNoShorten_(originalChunk, restoredChunk);

      if (!validation.ok) {
        console.warn('⚠️ AIEngine Chunk ' + (ci + 1) + '/' + chunks.length + ' rejected: ' + validation.reason);
        fixedChunks.push(originalChunk);
      } else {
        fixedChunks.push(restoredChunk);
      }
    }

    return fixedChunks.join('\n');
  }

  // single pass
  var prompt  = aiV8_buildPrompt_(pack.protectedText, opts);
  var result  = aiV8_tryModels_(prompt, apiKey);

  if (result === null) {
    aiV8_logError_('aiV8_correctText', 'All models failed', opts);
    return clean;
  }

  var restored  = aiV8_restoreSensitive_(result, pack);
  var validated = aiV8_validateNoShorten_(clean, restored);
  if (!validated.ok) {
    console.warn('⚠️ AIEngine validation rejected: ' + validated.reason + ' | returning original');
    return clean;
  }

  return restored;
}

/* ============================================================
   SECTION 3 — Options & Prompt
   ============================================================ */

function aiV8_processOptions_(options) {
  var defaults = {
    mode:    AI_CFG.MODES.REWRITE_LIGHT,
    context: AI_CFG.CONTEXTS.GENERAL
  };
  var opts = Object.assign({}, defaults, options || {});

  if (Object.values(AI_CFG.MODES).indexOf(opts.mode) === -1) {
    console.warn('⚠️ AIEngine: invalid mode → rewrite_light');
    opts.mode = AI_CFG.MODES.REWRITE_LIGHT;
  }
  if (Object.values(AI_CFG.CONTEXTS).indexOf(opts.context) === -1) {
    console.warn('⚠️ AIEngine: invalid context → general');
    opts.context = AI_CFG.CONTEXTS.GENERAL;
  }
  return opts;
}

function aiV8_buildPrompt_(text, opts) {
  var sys  = aiV8_getSystemInstruction_(opts.context);
  var ctxG = aiV8_getContextGuidelines_(opts.context);
  var task = '';

  if (opts.mode === AI_CFG.MODES.FIX_ONLY) {
    task = '\nالمهمة: تصحيح إملائي ونحوي فقط دون إعادة صياغة.\nقيود صارمة:\n- لا تحذف أي كلمة أو سطر أو معلومة.\n- لا تختصر.\n- حافظ على نفس ترتيب الجمل.\n- حافظ على نفس فواصل الأسطر تماماً.';
  } else if (opts.mode === AI_CFG.MODES.REWRITE_FULL) {
    task = '\nالمهمة: إعادة صياغة كاملة رسمية + تصحيح لغوي.\nقيود صارمة:\n- احتفظ بجميع المعلومات كما هي دون حذف أو اختصار.\n- لا تضف معلومات جديدة.\n- حافظ على القوائم والنقاط والأرقام والأكواد كما هي.\n- حافظ على فواصل الأسطر قدر الإمكان.';
  } else {
    task = '\nالمهمة: إعادة صياغة خفيفة + تصحيح لغوي.\nقيود صارمة:\n- ممنوع حذف/اختصار أي محتوى.\n- ممنوع إضافة معلومات جديدة.\n- حافظ على فواصل الأسطر والقوائم (• و - و *) كما هي قدر الإمكان.\n- إن اضطررت لتغيير سطر، لا تقلل عدد الكلمات ولا تحذف نقاط.';
  }

  return sys + '\n\n' + ctxG + '\n' + task + '\n\nتعليمات إخراج إلزامية:\n- أعد النص "فقط" بدون مقدمات أو شرح.\n- لا تضف عناوين جديدة من عندك.\n- لا تضع علامات تنصيص حول الناتج.\n\nالنص:\n' + text + '\n\nالناتج:';
}

function aiV8_getSystemInstruction_(context) {
  var m = {
    technical: 'أنت مراجع فني بوزارة الصحة. تكتب بالعربية الرسمية.',
    financial: 'أنت مراجع مالي وإداري حكومي. تكتب بالعربية الرسمية.',
    complaint: 'أنت محقق فحص شكاوى بوزارة الصحة. تكتب بأسلوب محايد وموضوعي.',
    general:   'أنت مدقق لغوي وإداري بوزارة الصحة.'
  };
  return m[context] || m.general;
}

function aiV8_getContextGuidelines_(context) {
  var g = {
    technical: 'إرشادات: استخدم مصطلحات صحية دقيقة. لا تغير أسماء أقسام/أجهزة.',
    financial: 'إرشادات: استخدم مصطلحات رقابية (عهد/مخازن/جرد/سجلات).',
    complaint: 'إرشادات: التزم بالحياد. لا تغير الوقائع. لا تغير أسماء الأشخاص/الجهات/الأرقام.',
    general:   'إرشادات: لغة إدارية رسمية.'
  };
  return g[context] || g.general;
}

/* ============================================================
   SECTION 4 — API Call
   ============================================================ */

function aiV8_tryModels_(prompt, apiKey) {
  for (var mi = 0; mi < AI_CFG.GEMINI.MODELS.length; mi++) {
    var model = AI_CFG.GEMINI.MODELS[mi];
    var out   = aiV8_callModelWithRetry_(model, prompt, apiKey);
    if (out !== null) {
      console.log('✅ AIEngine: succeeded with ' + model);
      return out;
    }
    console.warn('⚠️ AIEngine: ' + model + ' failed, trying next...');
  }
  return null;
}

function aiV8_callModelWithRetry_(model, prompt, apiKey) {
  var delay = AI_CFG.GEMINI.RETRY.INITIAL_DELAY_MS;

  for (var attempt = 1; attempt <= AI_CFG.GEMINI.RETRY.MAX_ATTEMPTS; attempt++) {
    try {
      var url     = AI_CFG.GEMINI.BASE_URL + model + ':generateContent?key=' + apiKey;
      var payload = JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: AI_CFG.GEMINI.GENERATION_CONFIG
      });

      var resp = UrlFetchApp.fetch(url, {
        method:             'POST',
        contentType:        'application/json',
        payload:            payload,
        muteHttpExceptions: true
      });

      var code = resp.getResponseCode();
      var txt  = resp.getContentText();

      if (code === 200) {
        var parsed = JSON.parse(txt);
        var out    = aiV8_extractText_(parsed);
        if (out && String(out).trim()) {
          return String(out).trim();
        }
        console.warn('    ⚠️ Empty response (attempt ' + attempt + ')');
      } else {
        console.warn('    ⚠️ HTTP ' + code + ' (attempt ' + attempt + ')');
      }
    } catch (e) {
      console.warn('    ⚠️ Error attempt ' + attempt + ': ' + (e && e.message ? e.message : e));
    }

    Utilities.sleep(delay);
    delay = Math.floor(delay * AI_CFG.GEMINI.RETRY.BACKOFF_MULTIPLIER);
  }

  return null;
}

function aiV8_extractText_(parsed) {
  try {
    var c     = parsed.candidates && parsed.candidates[0];
    var parts = c && c.content && c.content.parts;
    if (!parts || !parts.length) return null;
    var t = parts.map(function (p) { return p.text || ''; }).join('').trim();
    return t || null;
  } catch (e) {
    return null;
  }
}

function aiV8_getGeminiKey_() {
  try {
    if (typeof CONFIG !== 'undefined' && CONFIG.getGeminiKey) {
      return String(CONFIG.getGeminiKey() || '').trim() || null;
    }
  } catch (e) {}
  try {
    var sp = PropertiesService.getScriptProperties();
    return String(sp.getProperty('GEMINI_API_KEY') || '').trim() || null;
  } catch (e) {}
  return null;
}

/* ============================================================
   SECTION 5 — Validation
   ============================================================ */

function aiV8_validateNoShorten_(original, candidate) {
  var o = String(original  || '').trim();
  var c = String(candidate || '').trim();

  var ow = aiV8_countWords_(o);
  var cw = aiV8_countWords_(c);

  if (ow > 0) {
    var drop = (ow - cw) / ow;
    if (drop > AI_CFG.VALIDATION.MAX_WORD_DROP_RATIO) {
      return { ok: false, reason: 'WordDrop ' + (drop * 100).toFixed(1) + '%' };
    }
  }

  if (AI_CFG.VALIDATION.ENFORCE_BULLETS_COUNT) {
    var ob = aiV8_countBullets_(o);
    var cb = aiV8_countBullets_(c);
    if (ob !== cb) return { ok: false, reason: 'Bullets ' + ob + '→' + cb };
  }

  if (AI_CFG.VALIDATION.ENFORCE_NUMBERS_PRESENCE) {
    var on = aiV8_extractNumbers_(o);
    var cn = aiV8_extractNumbers_(c);
    var onArr = Array.from ? Array.from(on) : Object.keys(on);
    for (var ni = 0; ni < onArr.length; ni++) {
      var num = onArr[ni];
      var inCn = cn.has ? cn.has(num) : (cn[num] !== undefined);
      if (!inCn) return { ok: false, reason: 'MissingNumber ' + num };
    }
  }

  return { ok: true };
}

function aiV8_countWords_(t) {
  var s = String(t || '').trim();
  if (!s) return 0;
  return s.split(/\s+/).filter(function (x) { return x.trim().length > 0; }).length;
}

function aiV8_countBullets_(t) {
  var m = String(t || '').match(/^[\s]*[•\-\*]/gm);
  return m ? m.length : 0;
}

function aiV8_extractNumbers_(t) {
  var m = String(t || '').match(/\d+/g) || [];
  return new Set(m);
}

/* ============================================================
   SECTION 6 — Token Protection
   ============================================================ */

function aiV8_protectSensitive_(text) {
  var s        = String(text || '');
  var tokens   = [];
  var tokenMap = {};

  var addToken = function (value) {
    var key = '__TOK_' + (tokens.length + 1) + '__';
    tokens.push({ key: key, value: value });
    tokenMap[key] = value;
    return key;
  };

  // 1) Glossary terms
  var glossary = aiV8_loadGlossary_();
  glossary.forEach(function (term) {
    if (!term) return;
    var escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    s = s.replace(new RegExp(escaped, 'g'), function () { return addToken(term); });
  });

  // 2) Sensitive patterns
  var patterns = [
    /https?:\/\/\S+/g,
    /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g,
    /\b0\d{9,10}\b/g,
    /\b\d{1,4}[\/\-]\d{1,4}[\/\-]\d{2,4}\b/g,
    /\bIN-\d+-\d{4}\b/g,
    /\bOUT-\d+-\d{4}\b/g
  ];
  patterns.forEach(function (rx) {
    s = s.replace(rx, function (m) { return addToken(m); });
  });

  // 3) Codes/numbers with letters
  s = s.replace(/\b[\w\-]*\d[\w\-]*\b/g, function (m) {
    if (m.length < 3) return m;
    return addToken(m);
  });

  return { protectedText: s, tokens: tokens, tokenMap: tokenMap };
}

function aiV8_restoreSensitive_(text, pack) {
  var s = String(text || '');
  if (!pack || !pack.tokens || !pack.tokens.length) return s;
  for (var i = pack.tokens.length - 1; i >= 0; i--) {
    var t = pack.tokens[i];
    s = s.split(t.key).join(t.value);
  }
  return s;
}

function aiV8_loadGlossary_() {
  try {
    var ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    var sh = ss.getSheetByName(SHEETS.AI_GLOSSARY);
    if (!sh) return [];

    var lr = sh.getLastRow();
    var lc = sh.getLastColumn();
    if (lr < 2 || lc < 1) return [];

    var headers  = sh.getRange(1, 1, 1, lc).getValues()[0].map(function (h) { return String(h || '').trim().toLowerCase(); });
    var idxTerm  = headers.indexOf(AI_CFG.GLOSSARY.COL_TERM);
    var idxKeep  = headers.indexOf(AI_CFG.GLOSSARY.COL_KEEP);
    if (idxTerm === -1) return [];

    var values = sh.getRange(2, 1, lr - 1, lc).getValues();
    var out    = [];
    values.forEach(function (r) {
      var term = String(r[idxTerm] || '').trim();
      if (!term) return;
      if (idxKeep === -1) { out.push(term); return; }
      var keep = String(r[idxKeep] || '').trim().toLowerCase();
      if (keep === 'true' || keep === 'yes' || keep === '1' || keep === 'نعم') out.push(term);
    });
    return out;
  } catch (e) {
    return [];
  }
}

/* ============================================================
   SECTION 7 — Chunking
   ============================================================ */

function aiV8_splitToChunks_(text, maxChars) {
  var s = String(text || '');
  if (s.length <= maxChars) return [s];

  var parts  = s.split(/\n{2,}/);
  var chunks = [];
  var buf    = '';

  var flush = function () {
    if (buf.trim().length) chunks.push(buf.trim());
    buf = '';
  };

  for (var pi = 0; pi < parts.length; pi++) {
    var block = parts[pi].trim();
    if (!block) continue;

    if ((buf + '\n\n' + block).length <= maxChars) {
      buf = buf ? (buf + '\n\n' + block) : block;
    } else {
      flush();
      if (block.length > maxChars) {
        for (var ci = 0; ci < block.length; ci += maxChars) {
          chunks.push(block.slice(ci, ci + maxChars));
        }
      } else {
        buf = block;
      }
    }
  }
  flush();

  return chunks.length ? chunks : [s];
}

/* ============================================================
   SECTION 8 — Error Logging
   ============================================================ */

function aiV8_logError_(where, msg, meta) {
  try {
    if (typeof govV8_logError === 'function') {
      govV8_logError('AI:' + where, new Error(msg));
      return;
    }
    var ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    var sh = ss.getSheetByName(SHEETS.ERRORS_LOG);
    if (!sh) return;
    sh.appendRow([new Date(), 'AI:' + String(where || ''), String(msg || ''), JSON.stringify(meta || {})]);
  } catch (e) {}
}

/* ============================================================
   SECTION 9 — Compat: AIEngine object + convenience wrappers
   ============================================================ */

var AIEngine = {
  correctText: function (text, options) {
    return aiV8_correctText(text, options);
  }
};

function fixTextOnly(text, context) {
  return aiV8_correctText(text, { mode: AI_CFG.MODES.FIX_ONLY, context: context || 'general' });
}

function rewriteLight(text, context) {
  return aiV8_correctText(text, { mode: AI_CFG.MODES.REWRITE_LIGHT, context: context || 'general' });
}

function rewriteFull(text, context) {
  return aiV8_correctText(text, { mode: AI_CFG.MODES.REWRITE_FULL, context: context || 'general' });
}

/**
 * Legacy signature: correctComplaintText(text, apiKey)
 * apiKey ignored — reads from CONFIG/ScriptProperties via aiV8_getGeminiKey_
 */
function correctComplaintText(text) {
  return aiV8_correctText(text, { mode: AI_CFG.MODES.REWRITE_LIGHT, context: AI_CFG.CONTEXTS.COMPLAINT });
}

/* ─── CONFIG extensions (merge with 81_Extensions) ─── */
(function () {
  if (typeof CONFIG === 'undefined') return;

  if (!CONFIG.isAIEnabled) {
    CONFIG.isAIEnabled = function () {
      var v = CONFIG.get ? String(CONFIG.get('AI_ENABLED') || '').trim().toLowerCase() : 'false';
      return v === 'true';
    };
  }

  if (!CONFIG.getGeminiKey) {
    CONFIG.getGeminiKey = function () {
      return CONFIG.get ? String(CONFIG.get('GEMINI_API_KEY') || '').trim() : '';
    };
  }

  if (!CONFIG.isAIStrictMode) {
    CONFIG.isAIStrictMode = function () {
      var v = CONFIG.get ? String(CONFIG.get('AI_STRICT_MODE') || '').trim().toLowerCase() : 'false';
      return v === 'true';
    };
  }

  if (!CONFIG.getAIMaxReductionRatio) {
    CONFIG.getAIMaxReductionRatio = function () {
      var v = CONFIG.get ? parseFloat(CONFIG.get('AI_MAX_REDUCTION_RATIO') || '0.9') : 0.9;
      return isNaN(v) ? 0.9 : v;
    };
  }
})();