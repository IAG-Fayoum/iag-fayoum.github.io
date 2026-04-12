/**
 * 08_FindingsEngine.gs  (IAG V0.07.2)
 *
 * يستخرج المخالفات تلقائياً من استجابات فورم الوحدات
 * ويكتبها في OP_FINDINGS في Governance_CAR_DB
 * ثم يستدعي CAREngine مباشرة بدون Lock
 *
 * ملاحظة: FindingsEngine لا يتغير — يكتب في OP_FINDINGS سطر لكل مخالفة
 * التجميع بالقسم يتم في CAREngine عند كتابة CAR_SECTIONS
 *
 * Entry points:
 *   findingsEngine_processLastRow()   ← يُستدعى من 03_CentralTrigger
 *   findingsEngine_testLastRow()      ← اختبار يدوي
 */

/* ============================================================
   SECTION 1 — Constants
   ============================================================ */

const FINDINGS_OBSERVED_VAL = "مرصودة (مخالفة/نقص)";
const FINDINGS_DEDUP_MONTHS = 12;

const FINDINGS_AREA_COLS = [
  " اختر الوحدة / المركز الصحي لبندر الفيوم",
  "اختر الوحدة / المركز الصحي لمركز الفيوم",
  "اختر الوحدة / المركز الصحي لسنورس",
  "اختر الوحدة / المركز الصحي لاطسا",
  "اختر الوحدة / المركز الصحي لطامية",
  "اختر الوحدة / المركز الصحي لابشواى",
  "اختر الوحدة / المركز الصحي ليوسف الصديق"
];

const FINDINGS_CLASSIFICATION_RULES = [
  { pattern: /طبيب امتياز|بدون ترخيص|ممارسة.*بدون|تعديل.*سجلات|حذف.*سجلات|منتهية الصلاحية|أدوية منتهية|تطعيمات منتهية|كواشف منتهية/,
    classification: "🔴 مخالفة صريحة", severity: "عالي" },
  { pattern: /لا يوجد طبيب|عدم تواجد طبيب|عطل.*أساسي|توقف.*جهاز|جهاز.*معطل|سلسلة التبريد|نقص.*أدوية طوارئ|Adrenaline|Atropine/,
    classification: "🟠 خطر كامن", severity: "عالي" },
  { pattern: /لا يوجد سجل|غير مكتمل|عدم وجود بروتوكول|عدم توثيق|غير معتمد|عدم وجود خطة|عدم الفصل/,
    classification: "🔵 قصور إداري", severity: "متوسط" },
  { pattern: /.*/,
    classification: "🟢 مؤشر", severity: "منخفض" }
];

/* ============================================================
   SECTION 2 — Entry Points
   ============================================================ */

function findingsEngine_processLastRow() {
  return govV8_run(
    "findingsEngine_processLastRow",
    { actionType: "FINDINGS_EXTRACT", details: "Auto-extract findings" },
    function() {
      var ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
      var sh = ss.getSheetByName(SHEETS.TECH_UNITS_RESPONSES);
      if (!sh || sh.getLastRow() < 2) return { skipped: true, reason: "no rows" };

      var headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
      var vals    = sh.getRange(sh.getLastRow(), 1, 1, sh.getLastColumn()).getValues()[0];
      var data    = {};
      headers.forEach(function(h, i) { if (h) data[String(h).trim()] = vals[i]; });

      return findingsEngine_extract_(data, "IAG-PHC-TECH");
    }
  );
}

function findingsEngine_testLastRow() {
  try {
    var result = findingsEngine_processLastRow();
    var msg    = JSON.stringify(result, null, 2);
    Logger.log("✅ findingsEngine_testLastRow:\n" + msg);
    SpreadsheetApp.getUi().alert("✅ Findings Engine\n\n" + msg);
  } catch (e) {
    Logger.log("❌ " + e.message);
    SpreadsheetApp.getUi().alert("❌ خطأ\n\n" + e.message);
  }
}

/* ============================================================
   SECTION 3 — Core Extraction
   ============================================================ */

function findingsEngine_extract_(data, sourceForm) {
  var meta        = findingsEngine_extractMeta_(data);
  var codesMap    = findingsEngine_loadCodesMap_();
  var allFindings = findingsEngine_collectViolations_(data, meta, codesMap);

  if (!allFindings.length) {
    console.log("✅ FindingsEngine: لا مخالفات — " + meta.unitName);
    return { ok: true, extracted: 0, unit: meta.unitName };
  }

  var carSS      = SpreadsheetApp.openById(CONFIG.CAR_SPREADSHEET_ID);
  var findingsSh = carSS.getSheetByName(SHEETS.FINDINGS);
  if (!findingsSh) throw new Error("Missing: " + SHEETS.FINDINGS + " in CAR_DB");

  var headerMap = findingsEngine_buildHeaderMap_(findingsSh);
  var dedupSet  = findingsEngine_buildDedupSet_(findingsSh, meta.unitName, meta.visitDate);
  var now       = new Date();
  var written   = 0;
  var skipped   = 0;
  var visitStr  = Utilities.formatDate(meta.visitDate, "Africa/Cairo", "yyyyMMdd");

  allFindings.forEach(function(f) {
    try {
      var dedupKey = meta.unitName + "|" + visitStr + "|" + (f.findingCode || "") + "|" + f.section;
      if (f.findingCode && dedupSet[dedupKey]) { skipped++; return; }
      if (f.findingCode) dedupSet[dedupKey] = true;

      var repeatInfo = findingsEngine_checkRepeat_(findingsSh, meta.unitName, f.findingCode);

      var row = new Array(findingsSh.getLastColumn() || 17).fill("");
      var set = function(col, val) {
        var idx = headerMap[col];
        if (idx !== undefined) row[idx] = val;
      };

      set("finding_id",           f.findingId);
      set("source_form",          sourceForm || "IAG-PHC-TECH");
      set("unit_name",            meta.unitName);
      set("admin_area",           meta.adminArea);
      set("visit_date",           meta.visitDate);
      set("officer",              meta.officer);
      set("section",              f.section);
      set("violation_text",       f.violationText);
      set("finding_code",         f.findingCode  || "");
      set("classification",       f.classification);
      set("severity",             f.severity);
      set("status",               ENUMS.FINDING_STATUS.OPEN);
      set("is_repeat",            repeatInfo.is_repeat ? "نعم" : "لا");
      set("repeat_of_finding_id", repeatInfo.repeat_of_finding_id);
      set("created_at",           now);
      set("uuid",                 Utilities.getUuid());

      findingsSh.appendRow(row);
      written++;
    } catch (rowErr) {
      govV8_logError("findingsEngine_extract_ row", rowErr);
    }
  });

  console.log("✅ FindingsEngine: كتب " + written + " — تخطى " + skipped + " — " + meta.unitName);
  govV8_audit("FINDINGS_EXTRACTED", "استخرج " + written + " مخالفة من " + meta.unitName, "", { written: written, skipped: skipped });

  try { SpreadsheetApp.flush(); } catch(_) {}

  // ── استدعاء CAREngine مباشر ──
  try {
    carEngine_processNewFindings_direct_();
  } catch (carErr) {
    govV8_logError("findingsEngine → carEngine_direct", carErr);
  }

  return { ok: true, extracted: written, skipped: skipped, unit: meta.unitName };
}

/* ============================================================
   SECTION 4 — Meta Extraction
   ============================================================ */

function findingsEngine_extractMeta_(data) {
  var officer   = String(data["اسم فريق المرور"] || "").trim() || "غير محدد";
  var adminArea = String(data["الإدارة الصحية"]   || "").trim();

  var unitName = "";
  for (var i = 0; i < FINDINGS_AREA_COLS.length; i++) {
    var v = data[FINDINGS_AREA_COLS[i]] || data[FINDINGS_AREA_COLS[i].trim()];
    if (v && String(v).trim() && String(v).trim() !== "—") {
      unitName = String(v).trim();
      break;
    }
  }
  if (!unitName) unitName = "غير محدد";

  var rawDate   = data["تاريخ المرور"];
  var visitDate = (rawDate instanceof Date && !isNaN(rawDate.getTime()))
                  ? rawDate : (rawDate ? new Date(rawDate) : new Date());
  if (isNaN(visitDate.getTime())) visitDate = new Date();

  return { officer: officer, unitName: unitName, adminArea: adminArea, visitDate: visitDate };
}

/* ============================================================
   SECTION 5 — Violations Collector
   ============================================================ */

function findingsEngine_collectViolations_(data, meta, codesMap) {
  codesMap = codesMap || {};

  var ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  var sh = ss.getSheetByName(SHEETS.TECH_UNITS_RESPONSES);

  var orderedKeys;
  if (sh && sh.getLastRow() >= 1) {
    orderedKeys = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0]
      .map(function(h) { return String(h || "").trim(); })
      .filter(function(h) { return h; });
  } else {
    orderedKeys = Object.keys(data);
  }

  var findings   = [];
  var currentSec = "عام";
  var counter    = 1;
  var dateStr    = Utilities.formatDate(meta.visitDate, "Africa/Cairo", "yyyyMMdd");
  var unitShort  = meta.unitName.replace(/\s+/g, "_").substring(0, 10);

  orderedKeys.forEach(function(key) {
    if (key.indexOf("ملاحظات أخرى —") !== -1) {
      currentSec = key.replace("ملاحظات أخرى —", "").trim();
      return;
    }
    if (key.indexOf("تقييم عناصر المجموعة") !== -1) {
      var val = String(data[key] || "").trim();
      if (val.indexOf(FINDINGS_OBSERVED_VAL) === -1) return;

      var match         = key.match(/\[(.+)\]/);
      var violationText = match ? match[1].trim() : key;

      var codeEntry  = findingsEngine_lookupCode_(violationText, codesMap);
      var classified = codeEntry
        ? { classification: codeEntry.classification, severity: codeEntry.severity }
        : findingsEngine_classify_(violationText);
      var findingId  = "FND-" + dateStr + "-" + unitShort + "-" + String(counter).padStart(3, "0");

      findings.push({
        findingId:      findingId,
        section:        currentSec,
        violationText:  violationText,
        findingCode:    codeEntry ? codeEntry.finding_code : "",
        classification: classified.classification,
        severity:       classified.severity
      });
      counter++;
    }
  });

  return findings;
}

/* ============================================================
   SECTION 6 — Classification (Fallback)
   ============================================================ */

function findingsEngine_classify_(text) {
  text = String(text || "");
  for (var i = 0; i < FINDINGS_CLASSIFICATION_RULES.length; i++) {
    if (FINDINGS_CLASSIFICATION_RULES[i].pattern.test(text)) {
      return {
        classification: FINDINGS_CLASSIFICATION_RULES[i].classification,
        severity:       FINDINGS_CLASSIFICATION_RULES[i].severity
      };
    }
  }
  return { classification: "🟢 مؤشر", severity: "منخفض" };
}

/* ============================================================
   SECTION 7 — Helpers
   ============================================================ */

function findingsEngine_buildHeaderMap_(sheet) {
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var map     = {};
  headers.forEach(function(h, i) {
    var key = String(h || "").trim();
    if (key) map[key] = i;
  });
  return map;
}

function findingsEngine_loadCodesMap_() {
  var map = {};
  try {
    var ss   = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    var sh   = ss.getSheetByName(SHEETS.FINDING_CODES);
    if (!sh || sh.getLastRow() < 2) return map;
    var rows = sh.getRange(2, 1, sh.getLastRow() - 1, 9).getValues();
    rows.forEach(function(r) {
      var code     = String(r[0] || "").trim();
      var template = String(r[4] || "").trim();
      if (!code || !template) return;
      map[template] = {
        finding_code      : code,
        classification    : String(r[2] || "").trim(),
        severity          : String(r[5] || "").trim(),
        verification_type : String(r[3] || "").trim()
      };
    });
  } catch(e) {
    govV8_logError("findingsEngine_loadCodesMap_", e);
  }
  return map;
}

function findingsEngine_lookupCode_(violationText, codesMap) {
  var text = String(violationText || "").trim();
  if (codesMap[text]) return codesMap[text];
  var keys = Object.keys(codesMap);
  for (var i = 0; i < keys.length; i++) {
    if (text.indexOf(keys[i]) !== -1 || keys[i].indexOf(text) !== -1) {
      return codesMap[keys[i]];
    }
  }
  return null;
}

function findingsEngine_buildDedupSet_(findingsSh, unitName, visitDate) {
  var dedupSet = {};
  try {
    if (findingsSh.getLastRow() < 2) return dedupSet;
    var hdrMap   = findingsEngine_buildHeaderMap_(findingsSh);
    var rows     = findingsSh.getRange(2, 1, findingsSh.getLastRow() - 1, findingsSh.getLastColumn()).getValues();
    var visitStr = Utilities.formatDate(visitDate, "Africa/Cairo", "yyyyMMdd");
    rows.forEach(function(r) {
      var rUnit = String(r[hdrMap["unit_name"] || 2] || "").trim();
      if (rUnit !== unitName) return;
      var rDate    = r[hdrMap["visit_date"] || 4];
      var rDateStr = (rDate instanceof Date)
        ? Utilities.formatDate(rDate, "Africa/Cairo", "yyyyMMdd")
        : String(rDate || "").substring(0, 8);
      if (rDateStr !== visitStr) return;
      var rCode = String(r[hdrMap["finding_code"] || 0] || "").trim();
      var rSec  = String(r[hdrMap["section"]      || 6] || "").trim();
      dedupSet[rUnit + "|" + rDateStr + "|" + rCode + "|" + rSec] = true;
    });
  } catch(e) {
    govV8_logError("findingsEngine_buildDedupSet_", e);
  }
  return dedupSet;
}

function findingsEngine_checkRepeat_(findingsSh, unitName, findingCode) {
  var result = { is_repeat: false, repeat_of_finding_id: "" };
  try {
    if (!findingCode || findingsSh.getLastRow() < 2) return result;
    var hdrMap  = findingsEngine_buildHeaderMap_(findingsSh);
    var rows    = findingsSh.getRange(2, 1, findingsSh.getLastRow() - 1, findingsSh.getLastColumn()).getValues();
    var cutoff  = new Date();
    cutoff.setMonth(cutoff.getMonth() - FINDINGS_DEDUP_MONTHS);
    var matches = [];
    rows.forEach(function(r) {
      var rUnit = String(r[hdrMap["unit_name"]    || 2] || "").trim();
      var rCode = String(r[hdrMap["finding_code"] || 0] || "").trim();
      if (rUnit !== unitName || rCode !== findingCode) return;
      var rDate = r[hdrMap["visit_date"] || 4];
      if (rDate instanceof Date && rDate >= cutoff) {
        matches.push(String(r[hdrMap["finding_id"] || 0] || "").trim());
      }
    });
    if (matches.length > 0) {
      result.is_repeat            = true;
      result.repeat_of_finding_id = matches[matches.length - 1];
    }
  } catch(e) {
    govV8_logError("findingsEngine_checkRepeat_", e);
  }
  return result;
}