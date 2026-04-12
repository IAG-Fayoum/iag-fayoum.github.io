/**
 * 00_Diagnostics.gs  (IAG V8.1)
 * ─────────────────────────────────────────────────────────────
 * فحص تلقائي شامل للنظام — شغّل iagV81_runDiagnostics()
 * يكتب النتائج في شيت DIAGNOSTICS ويفتحه تلقائياً
 * ─────────────────────────────────────────────────────────────
 */

var DIAG_SHEET = "DIAGNOSTICS";
var _diagResults = [];
var _diagSS      = null;

/* ============================================================
   ENTRY POINT
   ============================================================ */

function iagV81_runDiagnostics() {
  _diagResults = [];

  try {
    _diagSS = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  } catch (e) {
    Browser.msgBox("❌ فشل: CONFIG.SPREADSHEET_ID غير صحيح\n" + e.message);
    return;
  }

  // ── تشغيل كل مجموعات الفحص ──
  _diagCheck_Config();
  _diagCheck_Sheets();
  _diagCheck_Folders();
  _diagCheck_Templates();
  _diagCheck_Triggers();
  _diagCheck_Employees();
  _diagCheck_DistributionRules();
  _diagCheck_AI();
  _diagCheck_Governance();

  // ── كتابة النتائج ──
  _diagWriteResults();
}


/* ============================================================
   1) CONFIG & SYSTEM_CONFIG
   ============================================================ */

function _diagCheck_Config() {
  _diagSection("⚙️ Config & SYSTEM_CONFIG");

  // SPREADSHEET_ID في CONFIG
  _pass("CONFIG.SPREADSHEET_ID معرّف", CONFIG.SPREADSHEET_ID || "");

  // SYSTEM_CONFIG شيت موجود
  var cfgSh = _diagSS.getSheetByName(SHEETS.SYSTEM_CONFIG);
  if (!cfgSh) { _fail("SYSTEM_CONFIG شيت موجود", "الشيت غير موجود"); return; }
  _pass("SYSTEM_CONFIG شيت موجود");

  var rows = cfgSh.getLastRow() < 2 ? [] : cfgSh.getRange(2,1,cfgSh.getLastRow()-1,2).getValues();
  var cfgMap = {};
  rows.forEach(function(r){ if(r[0]) cfgMap[String(r[0]).trim()] = String(r[1]||"").trim(); });

  var critKeys = [
    "WORK_SHARED_ID",
    "ARCHIVE_PRIVATE_ID",
    "TEMPLATE_ID_COMPLAINT_PROSECUTION",
    "TEMPLATE_ID_COMPLAINT_UNDERSECRETARY",
    "TEMPLATE_ID_TECH_HOSP",
    "TEMPLATE_ID_TECH_UNITS",
    "TEMPLATE_ID_FIN_ADMIN"
  ];
  critKeys.forEach(function(k) {
    var v = cfgMap[k] || "";
    if (v && v !== "PUT_FOLDER_ID_HERE" && v !== "PUT_TEMPLATE_ID_HERE")
      _pass(k, v.substring(0,30) + (v.length>30?"…":""));
    else
      _fail(k, "مش موجود أو placeholder");
  });

  // AI keys
  var aiKey = cfgMap["GEMINI_KEY"] || cfgMap["GEMINI_API_KEY"] || PropertiesService.getScriptProperties().getProperty("GEMINI_KEY") || "";
  if (aiKey) _pass("GEMINI_API_KEY موجود", "***" + aiKey.slice(-4));
  else        _warn("GEMINI_API_KEY غير موجود", "AI لن يعمل");

  var aiEnabled = cfgMap["AI_ENABLED"] || "FALSE";
  _info("AI_ENABLED", aiEnabled);

  // Admin emails
  var adminEmail = cfgMap["ADMIN_EMAIL"] || "fhealth.governance@gmail.com";
  _pass("ADMIN_EMAIL", adminEmail);

  var mgrEmail = cfgMap["MANAGER_EMAIL"] || "";
  if (!mgrEmail) {
    var empSh = _diagSS.getSheetByName(SHEETS.EMPLOYEES);
    if (empSh && empSh.getLastRow() > 1) {
      var eHdrs = empSh.getRange(1,1,1,empSh.getLastColumn()).getValues()[0];
      var eData = empSh.getRange(2,1,empSh.getLastRow()-1,empSh.getLastColumn()).getValues();
      var roleIdx = eHdrs.indexOf("المسمى الوظيفي");
      var emailIdx2 = eHdrs.indexOf("الايميل");
      if (roleIdx >= 0 && emailIdx2 >= 0) {
        eData.forEach(function(r){ if (String(r[roleIdx]).indexOf("مدير") !== -1) mgrEmail = String(r[emailIdx2]); });
      }
    }
  }
  if (mgrEmail) _pass("MANAGER_EMAIL", mgrEmail);
  else          _warn("MANAGER_EMAIL غير موجود");
}


/* ============================================================
   2) SHEETS
   ============================================================ */

function _diagCheck_Sheets() {
  _diagSection("📊 الشيتات");

  var required = [
    { key: "INOUT_MASTER",         label: "INOUT_MASTER",          critical: true  },
    { key: "INOUT_RESPONSES",      label: "INOUT_RESPONSES",        critical: true  },
    { key: "COMPLAINTS_RESPONSES", label: "COMPLAINTS_RESPONSES",   critical: true  },
    { key: "TECH_HOSP_RESPONSES",  label: "TECH_HOSP_RESPONSES",   critical: true  },
    { key: "TECH_UNITS_RESPONSES", label: "TECH_UNITS_RESPONSES",  critical: true  },
    { key: "FIN_RESPONSES",        label: "FIN_RESPONSES",         critical: true  },
    { key: "EMPLOYEES",            label: "EMPLOYEES",             critical: true  },
    { key: "DISTRIBUTION_RULES",   label: "DISTRIBUTION_RULES",    critical: true  },
    { key: "REPORTS_LOG",          label: "REPORTS_LOG",           critical: false },
    { key: "ERRORS_LOG",           label: "ERRORS_LOG",            critical: false },
    { key: "AUDIT_LOG",            label: "AUDIT_LOG",             critical: false },
    { key: "SYSTEM_CONFIG",        label: "SYSTEM_CONFIG",         critical: true  },
    { key: "PENDING_LINKS",        label: "PENDING_LINKS",         critical: false },
    { key: "AI_GLOSSARY",          label: "AI_GLOSSARY",           critical: false }
  ];

  required.forEach(function(s) {
    var shName = SHEETS[s.key] || s.label;
    var sh = _diagSS.getSheetByName(shName);
    if (sh) {
      var rows = sh.getLastRow();
      _pass(shName + " موجود", rows + " صف");
    } else {
      if (s.critical) _fail(shName + " موجود", "الشيت غير موجود ❌");
      else            _warn(shName + " موجود", "غير موجود — سيُنشأ تلقائياً عند الحاجة");
    }
  });
}


/* ============================================================
   3) FOLDERS (Drive)
   ============================================================ */

function _diagCheck_Folders() {
  _diagSection("📁 مجلدات Drive");

  // Work folder
  try {
    var cfgSh2   = _diagSS.getSheetByName(SHEETS.SYSTEM_CONFIG);
    var cfgRows2 = cfgSh2.getRange(2,1,cfgSh2.getLastRow()-1,2).getValues();
    var workId   = "";
    cfgRows2.forEach(function(r){ if (String(r[0]).trim() === "WORK_SHARED_ID") workId = String(r[1]).trim(); });
    if (!workId) { _fail("مجلد Work موجود", "WORK_SHARED_ID فارغ في SYSTEM_CONFIG"); }
    else {
      var workF = DriveApp.getFolderById(workId);
      _pass("مجلد Work موجود", workF.getName() + " | " + workId.substring(0,20)+"…");
    }
  } catch (e) {
    _fail("مجلد Work موجود", e.message);
  }

  // Archive folder
  try {
    var archId = CONFIG.getArchivePrivateRootId();
    var archF  = DriveApp.getFolderById(archId);
    _pass("مجلد Archive موجود", archF.getName() + " | " + archId.substring(0,20)+"…");
  } catch (e) {
    _fail("مجلد Archive موجود", e.message);
  }
}


/* ============================================================
   4) TEMPLATES
   ============================================================ */

function _diagCheck_Templates() {
  _diagSection("📄 قوالب التقارير");

  var templates = [
    { fn: "getTemplateComplaintProsecution",    label: "قالب شكاوى النيابة" },
    { fn: "getTemplateComplaintUndersecretary", label: "قالب شكاوى وكيل الوزارة" },
    { fn: "getTemplateTechHosp",                label: "قالب مرور فني مستشفيات" },
    { fn: "getTemplateTechUnits",               label: "قالب مرور فني وحدات" },
    { fn: "getTemplateFinAdmin",                label: "قالب مرور مالي وإداري" }
  ];

  templates.forEach(function(t) {
    try {
      var id   = CONFIG[t.fn]();
      var file = DriveApp.getFileById(id);
      _pass(t.label, file.getName() + " ✓");
    } catch (e) {
      _fail(t.label, e.message);
    }
  });
}


/* ============================================================
   5) TRIGGERS
   ============================================================ */

function _diagCheck_Triggers() {
  _diagSection("⚡ التريجرز");

  var triggers = ScriptApp.getProjectTriggers();
  if (triggers.length === 0) {
    _fail("التريجرز مثبتة", "لا يوجد أي trigger — شغّل iagV81_setupAllTriggers()");
    return;
  }

  _pass("عدد التريجرز الإجمالي", triggers.length + " trigger");

  var handlerCount = {};
  triggers.forEach(function(t) {
    var h = t.getHandlerFunction();
    handlerCount[h] = (handlerCount[h] || 0) + 1;
  });

  // التحقق من وجود trgV8_onFormSubmit
  var mainCount = handlerCount["trgV8_onFormSubmit"] || 0;
  if (mainCount === 5)
    _pass("trgV8_onFormSubmit — 5 triggers", "وارد + شكاوى + فني_مستشفى + فني_وحدات + مالي");
  else if (mainCount > 0 && mainCount < 5)
    _warn("trgV8_onFormSubmit", "موجود " + mainCount + " بدل 5 — ربما بعض الفورمز غير مربوطة");
  else
    _fail("trgV8_onFormSubmit غير موجود", "شغّل iagV81_setupAllTriggers()");

  // تريجرز قديمة/غريبة
  var knownHandlers = ["trgV8_onFormSubmit", "iagV81_setupAllTriggers", "iagV81_runDiagnostics", "pendingV8_resolveAll"];
  var unknown = [];
  triggers.forEach(function(t) {
    var h = t.getHandlerFunction();
    if (knownHandlers.indexOf(h) === -1) unknown.push(h);
  });
  if (unknown.length > 0)
    _warn("تريجرز غير معروفة", unknown.join(", ") + " — تحقق منها");
  else
    _pass("لا توجد تريجرز قديمة/غريبة");
}


/* ============================================================
   6) EMPLOYEES
   ============================================================ */

function _diagCheck_Employees() {
  _diagSection("👥 الموظفون");

  var sh = _diagSS.getSheetByName(SHEETS.EMPLOYEES);
  if (!sh) { _fail("شيت EMPLOYEES موجود", "غير موجود"); return; }

  var lastRow = sh.getLastRow();
  if (lastRow < 2) { _fail("EMPLOYEES به بيانات", "الشيت فارغ"); return; }

  var headers = sh.getRange(1,1,1,sh.getLastColumn()).getValues()[0].map(function(h){ return String(h||"").trim(); });
  var data    = sh.getRange(2,1,lastRow-1,sh.getLastColumn()).getValues();

  _pass("عدد الموظفين", (lastRow-1) + " موظف");

  // تحقق الأعمدة المطلوبة
  var reqCols = ["الاسم","الايميل","المسمى الوظيفي","نشط"];
  reqCols.forEach(function(col) {
    var found = headers.some(function(h){ return h.indexOf(col) !== -1; });
    if (found) _pass("عمود " + col + " موجود");
    else       _fail("عمود " + col + " موجود", "العمود غير موجود");
  });

  // تحقق إيميلات صحيحة
  var emailIdx = -1;
  headers.forEach(function(h,i){ if(h.indexOf("الايميل") !== -1) emailIdx = i; });
  var activeIdx = -1;
  headers.forEach(function(h,i){ if(h.indexOf("نشط") !== -1) activeIdx = i; });

  if (emailIdx >= 0) {
    var badEmails = 0, activeCount = 0;
    data.forEach(function(row) {
      var isActive = activeIdx >= 0 ? (String(row[activeIdx]||"").toLowerCase() === "true" || row[activeIdx] === true) : true;
      if (isActive) {
        activeCount++;
        var email = String(row[emailIdx]||"").trim();
        if (!email || email.indexOf("@") === -1) badEmails++;
      }
    });
    _pass("موظفين نشطين", activeCount + " موظف نشط");
    if (badEmails > 0) _warn("إيميلات الموظفين", badEmails + " موظف نشط بإيميل غير صحيح");
    else               _pass("إيميلات الموظفين سليمة");
  }
}


/* ============================================================
   7) DISTRIBUTION_RULES
   ============================================================ */

function _diagCheck_DistributionRules() {
  _diagSection("📬 قواعد التوزيع");

  var sh = _diagSS.getSheetByName(SHEETS.DISTRIBUTION_RULES);
  if (!sh) { _fail("DISTRIBUTION_RULES موجود", "الشيت غير موجود"); return; }
  if (sh.getLastRow() < 2) { _warn("DISTRIBUTION_RULES به بيانات", "الشيت فارغ — الإيميلات لن ترسل"); return; }

  var headers = sh.getRange(1,1,1,sh.getLastColumn()).getValues()[0].map(function(h){ return String(h||"").trim(); });
  var data    = sh.getRange(2,1,sh.getLastRow()-1,sh.getLastColumn()).getValues();

  var typeIdx  = headers.indexOf("نوع_المهمة");
  var rolesIdx = -1;
  headers.forEach(function(h,i){ if(h.indexOf("المسميات") !== -1) rolesIdx = i; });

  if (typeIdx === -1) { _fail("عمود نوع_المهمة موجود"); return; }
  _pass("عمود نوع_المهمة موجود");

  _pass("DISTRIBUTION_RULES — عدد القواعد", data.length + " قاعدة توزيع");
  _info("DISTRIBUTION_RULES", "الشيت للتوزيع على المراجعين في الوارد/الصادر");
}


/* ============================================================
   8) AI ENGINE
   ============================================================ */

function _diagCheck_AI() {
  _diagSection("🤖 محرك الذكاء الاصطناعي");

  var apiKey = "";
  try {
    var cfgShAI = _diagSS.getSheetByName(SHEETS.SYSTEM_CONFIG);
    var cfgRowsAI = cfgShAI.getRange(2,1,cfgShAI.getLastRow()-1,2).getValues();
    cfgRowsAI.forEach(function(r){
      var k = String(r[0]).trim();
      if (k === "GEMINI_KEY" || k === "GEMINI_API_KEY") apiKey = String(r[1]).trim();
    });
  } catch(e) {}

  if (!apiKey) {
    _warn("Gemini API Key", "غير موجود — AI معطل");
    return;
  }
  _pass("Gemini API Key موجود");

  // اختبار فعلي للـ API
  try {
    var url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" + apiKey;
    var payload = {
      contents: [{ parts: [{ text: "صحح: \"انا بحب العمل\"" }] }],
      generationConfig: { maxOutputTokens: 50, temperature: 0 }
    };
    var res = UrlFetchApp.fetch(url, {
      method: "post",
      contentType: "application/json",
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    });
    var code = res.getResponseCode();
    if (code === 200) {
      var json = JSON.parse(res.getContentText());
      var txt  = json.candidates && json.candidates[0] && json.candidates[0].content
        ? json.candidates[0].content.parts[0].text : "";
      _pass("Gemini API يستجيب (gemini-2.5-flash)", "رد: " + txt.substring(0,40));
    } else if (code === 429) {
      _warn("Gemini API", "Rate limit / Quota نُفذت — جرب لاحقاً");
    } else {
      _fail("Gemini API", "HTTP " + code + " — تحقق من الـ API Key");
    }
  } catch (e) {
    _fail("Gemini API اتصال", e.message);
  }

  // تحقق AI_ENABLED
  var aiEnabled = String(CONFIG.get("AI_ENABLED","FALSE")).toUpperCase();
  _info("AI_ENABLED في SYSTEM_CONFIG", aiEnabled);
}


/* ============================================================
   9) GOVERNANCE
   ============================================================ */

function _diagCheck_Governance() {
  _diagSection("🛡️ الحوكمة والرقابة");

  // ERRORS_LOG
  var errSh = _diagSS.getSheetByName(SHEETS.ERRORS_LOG);
  if (errSh) _pass("ERRORS_LOG موجود", errSh.getLastRow()-1 + " خطأ مسجل");
  else       _warn("ERRORS_LOG", "غير موجود — سيُنشأ عند أول خطأ");

  // AUDIT_LOG
  var audSh = _diagSS.getSheetByName(SHEETS.AUDIT_LOG);
  if (audSh) _pass("AUDIT_LOG موجود", audSh.getLastRow()-1 + " سجل");
  else       _warn("AUDIT_LOG", "غير موجود — سيُنشأ تلقائياً");

  // REPORTS_LOG
  var repSh = _diagSS.getSheetByName(SHEETS.REPORTS_LOG);
  if (repSh) _pass("REPORTS_LOG موجود", repSh.getLastRow()-1 + " تقرير مسجل");
  else       _warn("REPORTS_LOG", "غير موجود — سيُنشأ تلقائياً");

  // CONFIG.SPREADSHEET_ID مضبوط
  var ssId = CONFIG.SPREADSHEET_ID || "";
  if (ssId && ssId.length > 10) _pass("CONFIG.SPREADSHEET_ID مضبوط", ssId.substring(0,20)+"…");
  else                          _fail("CONFIG.SPREADSHEET_ID مضبوط", "القيمة فارغة أو خاطئة");

  // MailApp quota
  try {
    var remaining = MailApp.getRemainingDailyQuota();
    if (remaining > 20)      _pass("MailApp Quota متاح", remaining + " إيميل متبقي اليوم");
    else if (remaining > 0)  _warn("MailApp Quota", "تحذير: " + remaining + " إيميل فقط متبقي اليوم");
    else                     _fail("MailApp Quota", "الحد اليومي نُفذ — الإيميلات لن ترسل اليوم");
  } catch (e) {
    _warn("MailApp Quota", "تعذر التحقق: " + e.message);
  }
}


/* ============================================================
   HELPERS — نتائج الفحص
   ============================================================ */

function _diagSection(title) {
  _diagResults.push({ type: "SECTION", label: title });
}

function _pass(label, detail) {
  _diagResults.push({ type: "PASS", label: label, detail: detail || "" });
}

function _fail(label, detail) {
  _diagResults.push({ type: "FAIL", label: label, detail: detail || "فشل" });
}

function _warn(label, detail) {
  _diagResults.push({ type: "WARN", label: label, detail: detail || "تحذير" });
}

function _info(label, detail) {
  _diagResults.push({ type: "INFO", label: label, detail: detail || "" });
}


/* ============================================================
   WRITE RESULTS TO SHEET
   ============================================================ */

function _diagWriteResults() {
  // احذف الشيت القديم وأنشئ جديد
  var old = _diagSS.getSheetByName(DIAG_SHEET);
  if (old) _diagSS.deleteSheet(old);
  Utilities.sleep(300);
  var sh = _diagSS.insertSheet(DIAG_SHEET);

  // Header row
  sh.getRange(1,1,1,4).setValues([["الحالة","البند","التفاصيل","الوقت"]]);
  sh.getRange(1,1,1,4)
    .setBackground("#044d47").setFontColor("#ffffff")
    .setFontWeight("bold").setFontSize(12);

  var now = new Date();
  var rows = [];

  var pass=0, fail=0, warn=0;
  _diagResults.forEach(function(r) {
    if      (r.type === "PASS") pass++;
    else if (r.type === "FAIL") fail++;
    else if (r.type === "WARN") warn++;
  });

  // Summary row
  rows.push(["📊 ملخص",
    "✅ " + pass + " ناجح | ❌ " + fail + " فشل | ⚠️ " + warn + " تحذير",
    fail === 0 ? "النظام جاهز ✅" : fail + " مشكلة حرجة تحتاج معالجة",
    Utilities.formatDate(now, "Africa/Cairo", "dd MMM yyyy HH:mm")]);

  _diagResults.forEach(function(r) {
    if (r.type === "SECTION") {
      rows.push(["───", r.label, "", ""]);
    } else {
      var icon = r.type === "PASS" ? "✅" : r.type === "FAIL" ? "❌" : r.type === "WARN" ? "⚠️" : "ℹ️";
      rows.push([icon + " " + r.type, r.label, r.detail, ""]);
    }
  });

  if (rows.length > 0) {
    sh.getRange(2, 1, rows.length, 4).setValues(rows);
  }

  // Formatting
  sh.setColumnWidth(1, 100);
  sh.setColumnWidth(2, 320);
  sh.setColumnWidth(3, 350);
  sh.setColumnWidth(4, 150);
  sh.setFrozenRows(1);
  sh.setRightToLeft(true);

  // Color rows
  for (var i = 0; i < rows.length; i++) {
    var rowNum = i + 2;
    var rng = sh.getRange(rowNum, 1, 1, 4);
    var type = _diagResults[i] ? _diagResults[i].type : "";

    if (i === 0) {
      rng.setBackground("#e8f5f4").setFontWeight("bold");
    } else if (type === "SECTION") {
      rng.setBackground("#f0f4f3").setFontWeight("bold").setFontColor("#044d47");
    } else if (type === "FAIL") {
      rng.setBackground("#fde8e8");
    } else if (type === "WARN") {
      rng.setBackground("#fff8e1");
    } else if (type === "PASS") {
      rng.setBackground("#f0faf4");
    }

    rng.setHorizontalAlignment("right");
    sh.getRange(rowNum, 1).setFontWeight("bold");
  }

  // Navigate to sheet
  _diagSS.setActiveSheet(sh);
  SpreadsheetApp.flush();

  // Alert
  var summary =
    "🔍 نتائج الفحص التلقائي\n\n" +
    "✅ ناجح:   " + pass + "\n" +
    "❌ فشل:    " + fail + "\n" +
    "⚠️ تحذير:  " + warn + "\n\n" +
    (fail === 0
      ? "✅ النظام جاهز للتشغيل"
      : "❌ " + fail + " مشكلة حرجة — راجع شيت DIAGNOSTICS");

  SpreadsheetApp.getUi().alert(summary);
}