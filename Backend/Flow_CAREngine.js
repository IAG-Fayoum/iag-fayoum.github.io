/**
 * 10_CAREngine.gs  (IAG V0.09)
 *
 * يولد CAR تلقائياً من OP_FINDINGS في Governance_CAR_DB
 *
 * التغييرات في V0.09:
 *   - وحدة المتابعة = القسم (section) مش المخالفة المنفردة
 *   - CAR_REGISTER: خطاب واحد لكل (unit_name + visit_date)
 *   - CAR_SECTIONS: سطر واحد لكل قسم — يحتوي المخالفات مدمجة
 *   - رد مدير الإدارة على مستوى القسم (portal_response)
 *   - النتيجة النهائية للموظف الداخلي فقط (staff_status)
 *
 * Entry points:
 *   carEngine_processNewFindings()         ← مع Lock
 *   carEngine_processNewFindings_direct_() ← بدون Lock (من FindingsEngine)
 *   carEngine_testLastBatch()              ← اختبار يدوي
 */

/* ============================================================
   SECTION 1 — Constants
   ============================================================ */

const CAR_ACTION_RULES = [
  { pattern: /طبيب امتياز|بدون ترخيص|ممارسة.*بدون/,
    action: "إيقاف الممارسة الطبية فوراً وتقديم وثائق الترخيص الساري خلال 24 ساعة أو إحالة الأمر للجهات القانونية المختصة",
    deadline_days: 1 },
  { pattern: /تعديل.*سجلات|حذف.*سجلات/,
    action: "توثيق أي تعديل في السجلات الرسمية بتوقيع المسؤول وتاريخ التعديل وسببه، والتحقيق في أي تعديل غير موثق",
    deadline_days: 1 },
  { pattern: /منتهية الصلاحية|منتهي الصلاحية/,
    action: "سحب جميع الأصناف منتهية الصلاحية فوراً وإعدامها وفق الإجراءات المعتمدة، وتحديث الجرد",
    deadline_days: 1 },
  { pattern: /Adrenaline|Atropine|Hydrocortisone|أدوية طوارئ أساسية|أدرينالين|أتروبين|هيدروكورتيزون/,
    action: "توفير أدوية الطوارئ الأساسية خلال 48 ساعة من خلال التنسيق مع إدارة الصيدلة والمخازن المركزية",
    deadline_days: 2 },
  { pattern: /عدم تواجد طبيب|لا يوجد طبيب/,
    action: "ضمان تواجد طبيب مختص طوال ساعات العمل الرسمية وتقديم جدول الحضور المعتمد",
    deadline_days: 1 },
  { pattern: /عطل.*جهاز|توقف.*جهاز|جهاز.*معطل/,
    action: "إصلاح الجهاز خلال المدة المحددة أو توفير بديل مؤقت مع تحديد جهة الصيانة المسؤولة",
    deadline_days: 7 },
  { pattern: /سلسلة التبريد|ثلاجة.*لا تعمل/,
    action: "إصلاح وحدة التبريد فوراً والتحقق من سلامة محتوياتها، مع تسجيل أي تطعيمات تضررت",
    deadline_days: 1 },
  { pattern: /أصناف أدوية غير متوفرة|نقص.*أدوية/,
    action: "تقديم طلب توفير الأصناف الناقصة من خلال القنوات الرسمية وتقديم صورة من الطلب",
    deadline_days: 7 },
  { pattern: /عدم وجود بروتوكول|لا يوجد بروتوكول/,
    action: "اعتماد وتعميم البروتوكول المطلوب على جميع أفراد الفريق مع توثيق الاستلام",
    deadline_days: 14 },
  { pattern: /لا يوجد سجل|غير مكتمل|عدم توثيق/,
    action: "استحداث السجل المطلوب وتحديثه فوراً بالبيانات المتاحة وضمان انتظام التدوين",
    deadline_days: 7 },
  { pattern: /نفايات|فصل.*نفايات/,
    action: "الالتزام بمعايير الفصل الصحيح للنفايات الطبية وتدريب الفريق على الإجراءات المعتمدة",
    deadline_days: 7 },
  { pattern: /.*/,
    action: "اتخاذ الإجراء التصحيحي اللازم وإخطار إدارة المراجعة الداخلية والحوكمة بنتيجة التنفيذ",
    deadline_days: 14 }
];

const CAR_SEVERITY_DEADLINES = { "عالي": 2, "متوسط": 7, "منخفض": 14 };

/* ============================================================
   SECTION 2 — Entry Points
   ============================================================ */

function carEngine_processNewFindings() {
  return govV8_run(
    "carEngine_processNewFindings",
    { actionType: "CAR_GENERATE", details: "Generate CARs grouped by section" },
    function() { return carEngine_processNewFindings_direct_(); }
  );
}

function carEngine_processNewFindings_direct_() {
  try {
  var carSS      = SpreadsheetApp.openById(CONFIG.CAR_SPREADSHEET_ID);
  var findingsSh = carSS.getSheetByName(SHEETS.FINDINGS);
  var carSh      = carSS.getSheetByName(SHEETS.CAR);
  var secSh      = carSS.getSheetByName(SHEETS.CAR_SECTIONS);

  if (!findingsSh) throw new Error("Missing: " + SHEETS.FINDINGS);
  if (!carSh)      throw new Error("Missing: " + SHEETS.CAR);
  if (!secSh)      throw new Error("Missing: " + SHEETS.CAR_SECTIONS);
  if (findingsSh.getLastRow() < 2) return { ok: true, processed: 0 };

  var findingsMap  = carEngine_buildHeaderMap_(findingsSh);
  var carMap       = carEngine_buildHeaderMap_(carSh);
  var secMap       = carEngine_buildHeaderMap_(secSh);
  var findingsData = findingsSh.getRange(2, 1, findingsSh.getLastRow()-1, findingsSh.getLastColumn()).getValues();

  var codesMap = carEngine_loadCodesMap_();
  var now      = new Date();

  // ── تجميع المخالفات بـ (unit_name + visit_date + section) ──
  // المخالفات التي ليس لها car_id بعد
  var groups = {}; // key: unitName|visitStr → { unitName, visitDate, officer, sections: { secName: [findings] } }

  findingsData.forEach(function(row) {
    var status = String(row[findingsMap["status"]] || "").trim();
    var carId  = String(row[findingsMap["car_id"]] || "").trim();
    if (status !== ENUMS.FINDING_STATUS.OPEN) return;
    if (carId) return;

    var unitName      = String(row[findingsMap["unit_name"]]      || "").trim();
    var section       = String(row[findingsMap["section"]]        || "عام").trim();
    var violationText = String(row[findingsMap["violation_text"]] || "").trim();
    var severity      = String(row[findingsMap["severity"]]       || "منخفض").trim();
    var officer       = String(row[findingsMap["officer"]]        || "").trim();
    var findingId     = String(row[findingsMap["finding_id"]]     || "").trim();
    var findingCode   = String(row[findingsMap["finding_code"]]   || "").trim();
    var classification= String(row[findingsMap["classification"]] || "").trim();
    var visitDate     = row[findingsMap["visit_date"]];

    if (!unitName || !violationText) return;

    var visitStr = (visitDate instanceof Date)
      ? Utilities.formatDate(visitDate, "Africa/Cairo", "yyyyMMdd")
      : String(visitDate || "").substring(0, 10);

    var adminArea = String(row[findingsMap["admin_area"]] || "").trim();

    var groupKey = unitName + "|" + visitStr;
    if (!groups[groupKey]) {
      groups[groupKey] = { unitName: unitName, visitDate: visitDate, visitStr: visitStr, officer: officer, adminArea: adminArea, sections: {} };
    }

    if (!groups[groupKey].sections[section]) {
      groups[groupKey].sections[section] = [];
    }
    groups[groupKey].sections[section].push({
      findingId: findingId, violationText: violationText,
      severity: severity, findingCode: findingCode, classification: classification
    });
  });

  var groupKeys = Object.keys(groups);
  if (!groupKeys.length) return { ok: true, processed: 0 };

  // ── إنشاء CAR_REGISTER + CAR_SECTIONS لكل مجموعة ──
  var processedGroups = 0;
  var processedSections = 0;

  groupKeys.forEach(function(groupKey) {
    var g = groups[groupKey];
    var sectionNames = Object.keys(g.sections);

    // ── CAR_REGISTER: خطاب واحد للجهة ──
    var carId = "CAR-" + g.visitStr + "-" + g.unitName.replace(/\s+/g,"_").substring(0, 8).toUpperCase();
    // تحقق: هل يوجد CAR لنفس الجهة والتاريخ بالفعل
    var existingCarId = carEngine_findExistingCAR_(carSh, carMap, g.unitName, g.visitStr);
    if (existingCarId) {
      carId = existingCarId;
    } else {
      // احسب أقصر deadline من كل المخالفات
      var minDeadlineDays = 30;
      sectionNames.forEach(function(sec) {
        g.sections[sec].forEach(function(f) {
          var d = carEngine_getDeadlineDays_(f.violationText, f.severity);
          if (d < minDeadlineDays) minDeadlineDays = d;
        });
      });
      var deadline = new Date(now.getTime() + minDeadlineDays * 24 * 60 * 60 * 1000);

      var carRow = new Array(carSh.getLastColumn() || 15).fill("");
      var setC = function(col, val) { var idx = carMap[col]; if (idx !== undefined) carRow[idx] = val; };
      setC("car_id",          carId);
      setC("unit_name",       g.unitName);
      setC("report_id",       g.visitStr + "-" + g.unitName.substring(0,8));
      setC("officer",         g.officer);
      setC("visit_date",      g.visitDate);
      setC("sections_count",  sectionNames.length);
      setC("findings_count",  findingsData.filter(function(r){
        return String(r[findingsMap["unit_name"]]||"").trim() === g.unitName;
      }).length);
      setC("deadline",        deadline);
      setC("issued_at",       now);
      setC("issued_by",       "النظام الآلي — IAG");
      setC("status",          ENUMS.FINDING_STATUS.OPEN);
      setC("uuid",            Utilities.getUuid());
      carSh.appendRow(carRow);
    }

    // ── CAR_SECTIONS: سطر لكل قسم ──
    sectionNames.forEach(function(secName) {
      var secFindings = g.sections[secName];

      // تحقق: هل يوجد section لنفس car_id + section_name
      if (carEngine_sectionExists_(secSh, secMap, carId, secName)) return;

      // دمج نصوص المخالفات
      var findingsText = secFindings.map(function(f, idx) {
        return (idx + 1) + ". " + f.violationText;
      }).join("\n");

      var secRow = new Array(secSh.getLastColumn() || 12).fill("");
      var setS = function(col, val) { var idx = secMap[col]; if (idx !== undefined) secRow[idx] = val; };
      setS("car_id",          carId);
      setS("report_id",       g.visitStr + "-" + g.unitName.substring(0,8));
      setS("facility_name",   g.unitName);
      setS("section_name",    secName);
      setS("findings_count",  secFindings.length);
      setS("findings_text",   findingsText);
      setS("portal_response", "");
      setS("portal_replied_at", "");
      setS("staff_status",    ENUMS.SECTION_STATUS.OPEN);
      setS("staff_note",      "");
      setS("staff_updated_by","");
      setS("staff_updated_at","");
      secSh.appendRow(secRow);
      processedSections++;
    });

    // ── تحديث car_id في OP_FINDINGS ──
    findingsData.forEach(function(row, idx) {
      var rUnit  = String(row[findingsMap["unit_name"]] || "").trim();
      var rDate  = row[findingsMap["visit_date"]];
      var rCarId = String(row[findingsMap["car_id"]]   || "").trim();
      if (rUnit !== g.unitName || rCarId) return;
      var rDateStr = (rDate instanceof Date)
        ? Utilities.formatDate(rDate, "Africa/Cairo", "yyyyMMdd")
        : String(rDate || "").substring(0, 10);
      if (rDateStr !== g.visitStr) return;
      var rowNum = idx + 2;
      if (findingsMap["car_id"] !== undefined)
        findingsSh.getRange(rowNum, findingsMap["car_id"]+1).setValue(carId);
      if (findingsMap["approved_at"] !== undefined)
        findingsSh.getRange(rowNum, findingsMap["approved_at"]+1).setValue(now);
    });

    processedGroups++;
  });

  auditEngine_logEvent("SYSTEM", "CAR_PROCESSED", "carEngine_processNewFindings_direct_", "", { groups: processedGroups, sections: processedSections }, "SUCCESS");

  if (processedGroups > 0) {
    auditEngine_logEvent("SYSTEM", "CAR_GENERATED",
      "أنشأ " + processedGroups + " CAR بـ " + processedSections + " قسم",
      "", { groups: processedGroups, sections: processedSections }, "SUCCESS");
    try { carEngine_notifyManager_(processedGroups, processedSections); } catch(e) {
      auditEngine_logError("carEngine → notifyManager", e, "");
    }
    try { carEngine_notifyAdminPortal_(groups); } catch(e) {
      auditEngine_logError("carEngine → notifyAdminPortal", e, "");
    }
  }

  try { SpreadsheetApp.flush(); } catch(_) {}

  try { followUpEngine_processNewCARs_direct_(); } catch (fe) {
    auditEngine_logError("carEngine → followUpEngine", fe, "");
  }

  return { ok: true, processed: processedGroups, sections: processedSections };
  } catch (e) {
    auditEngine_logError("carEngine_processNewFindings_direct_", e, "");
    throw e;
  }
}

function carEngine_testLastBatch() {
  try {
    var result = carEngine_processNewFindings();
    var msg    = JSON.stringify(result, null, 2);
    Logger.log("✅ carEngine_testLastBatch:\n" + msg);
    SpreadsheetApp.getUi().alert("✅ CAR Engine\n\n" + msg);
  } catch (e) {
    Logger.log("❌ " + e.message);
    SpreadsheetApp.getUi().alert("❌ خطأ\n\n" + e.message);
  }
}

/* ============================================================
   SECTION 3 — Existence Checks
   ============================================================ */

/** يتحقق إذا كان يوجد CAR_REGISTER لنفس الجهة والتاريخ */
function carEngine_findExistingCAR_(carSh, carMap, unitName, visitStr) {
  if (carSh.getLastRow() < 2) return null;
  var data = carSh.getRange(2, 1, carSh.getLastRow()-1, carSh.getLastColumn()).getValues();
  var ui = carMap["unit_name"], vi = carMap["visit_date"], ci = carMap["car_id"];
  if (ui === undefined || vi === undefined || ci === undefined) return null;
  for (var i = 0; i < data.length; i++) {
    var rUnit = String(data[i][ui] || "").trim();
    var rDate = data[i][vi];
    var rDateStr = (rDate instanceof Date)
      ? Utilities.formatDate(rDate, "Africa/Cairo", "yyyyMMdd")
      : String(rDate || "").substring(0, 10);
    if (rUnit === unitName && rDateStr === visitStr) {
      return String(data[i][ci] || "").trim() || null;
    }
  }
  return null;
}

/** يتحقق إذا كان يوجد CAR_SECTIONS لنفس car_id + section_name */
function carEngine_sectionExists_(secSh, secMap, carId, sectionName) {
  if (secSh.getLastRow() < 2) return false;
  var data = secSh.getRange(2, 1, secSh.getLastRow()-1, secSh.getLastColumn()).getValues();
  var ci = secMap["car_id"], si = secMap["section_name"];
  if (ci === undefined || si === undefined) return false;
  for (var i = 0; i < data.length; i++) {
    if (String(data[i][ci]||"").trim() === carId &&
        String(data[i][si]||"").trim() === sectionName) return true;
  }
  return false;
}

/* ============================================================
   SECTION 4 — Action & Deadline Logic
   ============================================================ */

function carEngine_getCorrectiveAction_(violationText) {
  var text = String(violationText || "");
  for (var i = 0; i < CAR_ACTION_RULES.length; i++) {
    if (CAR_ACTION_RULES[i].pattern.test(text)) return CAR_ACTION_RULES[i].action;
  }
  return "اتخاذ الإجراء التصحيحي اللازم وإخطار إدارة المراجعة الداخلية والحوكمة بنتيجة التنفيذ";
}

function carEngine_getDeadlineDays_(violationText, severity) {
  var text = String(violationText || "");
  for (var i = 0; i < CAR_ACTION_RULES.length; i++) {
    var rule = CAR_ACTION_RULES[i];
    if (rule.pattern.test(text) && rule.deadline_days) return rule.deadline_days;
  }
  return CAR_SEVERITY_DEADLINES[severity] || 14;
}

/* ============================================================
   SECTION 5 — REF_FINDING_CODES Loader
   ============================================================ */

function carEngine_loadCodesMap_() {
  var map = {};
  try {
    var ss   = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    var sh   = ss.getSheetByName(SHEETS.FINDING_CODES);
    if (!sh || sh.getLastRow() < 2) return map;
    var rows = sh.getRange(2, 1, sh.getLastRow() - 1, 9).getValues();
    rows.forEach(function(r) {
      var code     = String(r[0] || "").trim();
      var template = String(r[4] || "").trim();
      var deadline = Number(r[6]) || 14;
      var entry    = { code: code, classification: String(r[2]||"").trim(),
                       verification_type: String(r[3]||"").trim(), deadline_days: deadline };
      if (code)     map["code:" + code]    = entry;
      if (template) map["text:" + template] = entry;
    });
  } catch(e) {
    auditEngine_logError("carEngine_loadCodesMap_", e, "");
  }
  return map;
}

function carEngine_lookupCode_(findingCode, violationText, codesMap) {
  if (findingCode && codesMap["code:" + findingCode]) return codesMap["code:" + findingCode];
  var text = String(violationText || "").trim();
  if (codesMap["text:" + text]) return codesMap["text:" + text];
  var keys = Object.keys(codesMap);
  for (var i = 0; i < keys.length; i++) {
    if (keys[i].indexOf("text:") !== 0) continue;
    var t = keys[i].substring(5);
    if (text.indexOf(t) !== -1 || t.indexOf(text) !== -1) return codesMap[keys[i]];
  }
  return null;
}

/* ============================================================
   SECTION 6 — Manager Notification
   ============================================================ */

function carEngine_notifyManager_(groupCount, sectionCount) {
  var managerEmail = "";
  try { managerEmail = CONFIG.getManagerEmail(); } catch(e) {}
  if (!managerEmail) return;

  var subject = "📋 إشعار آلي — تم إصدار " + groupCount + " خطاب إجراء تصحيحي (" + sectionCount + " قسم)";
  var body = "<div dir='rtl' style='font-family:Cairo,Arial;max-width:600px;margin:auto'>"
    + "<div style='background:#044d47;padding:20px;text-align:center;border-radius:8px 8px 0 0'>"
    + "<h2 style='color:#fff;margin:0;font-size:1rem'>إدارة المراجعة الداخلية والحوكمة</h2>"
    + "<p style='color:#a7f3d0;margin:4px 0 0;font-size:.82rem'>وزارة الصحة — مديرية الشئون الصحية بالفيوم</p>"
    + "</div>"
    + "<div style='padding:20px;background:#f0fdf4;border:1px solid #bbf7d0'>"
    + "<p style='margin:0;font-size:.95rem;color:#065f46'>تم إصدار <strong>" + groupCount + "</strong> خطاب إجراء تصحيحي يشمل <strong>" + sectionCount + "</strong> قسم.</p>"
    + "<p style='margin:8px 0 0;font-size:.85rem;color:#475569'>كل خطاب يجمع مخالفات الجهة بالأقسام — مدير الإدارة يرد على مستوى القسم.</p>"
    + "</div>"
    + "<div style='padding:12px 20px;background:#fff;border:1px solid #e2e8f0;border-top:none;font-size:.75rem;color:#94a3b8'>"
    + "أُرسل تلقائياً من نظام الحوكمة — " + fmtV8_dateArabic(new Date())
    + "</div></div>";

  try { MailApp.sendEmail({ to: managerEmail, subject: subject, htmlBody: body }); }
  catch (e) { auditEngine_logError("carEngine_notifyManager_", e, ""); }
}

/* ============================================================
   SECTION 7 — Admin Portal Notification
   ============================================================ */

function carEngine_notifyAdminPortal_(groups) {
  var masterSS  = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  var adminSh   = masterSS.getSheetByName(SHEETS.HEALTH_ADMINS);
  if (!adminSh || adminSh.getLastRow() < 2) return;

  var aMap  = carEngine_buildHeaderMap_(adminSh);
  var aData = adminSh.getRange(2, 1, adminSh.getLastRow()-1, adminSh.getLastColumn()).getValues();

  // بناء lookup: admin_name → { code, managerName, managerEmail }
  var adminLookup = {};
  aData.forEach(function(ar) {
    var name    = String(ar[aMap["admin_name"]]     || "").trim();
    var code    = String(ar[aMap["admin_code"]]     || "").trim();
    var mgr     = String(ar[aMap["manager_name"]]   || "").trim();
    var email   = String(ar[aMap["manager_email"]]  || "").trim();
    if (name && code && email) adminLookup[name] = { code: code, managerName: mgr, managerEmail: email };
  });

  // إرسال إيميل واحد لكل admin_area فريد
  var sentAreas = {};
  Object.keys(groups).forEach(function(gk) {
    var g         = groups[gk];
    var adminArea = g.adminArea || "";
    if (!adminArea || sentAreas[adminArea]) return;

    var adminInfo = adminLookup[adminArea];
    if (!adminInfo) return;

    sentAreas[adminArea] = true;

    var portalUrl = "https://iag-fayoum.github.io/portal.html?code=" + encodeURIComponent(adminInfo.code);
    var greeting  = adminInfo.managerName ? "السيد / " + adminInfo.managerName : "مدير الإدارة";

    var subject = "📋 خطاب إجراء تصحيحي — " + adminArea + " — يرجى الرد عبر البوابة";
    var body = "<div dir='rtl' style='font-family:Cairo,Arial;max-width:620px;margin:auto'>"
      + "<div style='background:#044d47;padding:20px;text-align:center;border-radius:8px 8px 0 0'>"
      + "<h2 style='color:#fff;margin:0;font-size:1rem'>إدارة المراجعة الداخلية والحوكمة</h2>"
      + "<p style='color:#a7f3d0;margin:4px 0 0;font-size:.82rem'>وزارة الصحة — مديرية الشئون الصحية بالفيوم</p>"
      + "</div>"
      + "<div style='padding:24px;background:#f0fdf4;border:1px solid #bbf7d0'>"
      + "<p style='margin:0 0 12px;font-size:.95rem;color:#065f46'>تحية طيبة،</p>"
      + "<p style='margin:0 0 12px;font-size:.95rem;color:#1e293b'>" + greeting + "</p>"
      + "<p style='margin:0 0 16px;font-size:.9rem;color:#334155'>تم إصدار خطابات إجراء تصحيحي لمنشآت <strong>" + adminArea + "</strong> بعد زيارة المرور الفني. "
      + "يُرجى الاطلاع على المخالفات المرصودة والرد على كل قسم عبر بوابة الحوكمة.</p>"
      + "<div style='text-align:center;margin:20px 0'>"
      + "<a href='" + portalUrl + "' style='background:#044d47;color:#fff;padding:12px 32px;border-radius:6px;text-decoration:none;font-size:.95rem;font-weight:bold'>دخول البوابة والرد</a>"
      + "</div>"
      + "<p style='margin:0;font-size:.8rem;color:#64748b'>إذا لم يعمل الزر، انسخ الرابط: <br>" + portalUrl + "</p>"
      + "</div>"
      + "<div style='padding:12px 20px;background:#fff;border:1px solid #e2e8f0;border-top:none;font-size:.75rem;color:#94a3b8'>"
      + "أُرسل تلقائياً من نظام الحوكمة — " + fmtV8_dateArabic(new Date())
      + "</div></div>";

    try {
      MailApp.sendEmail({ to: adminInfo.managerEmail, subject: subject, htmlBody: body });
      auditEngine_logEvent("SYSTEM", "PORTAL_NOTIFIED", "إيميل بوابة → " + adminArea,
        "", { email: adminInfo.managerEmail }, "SUCCESS");
    } catch(e) {
      auditEngine_logError("carEngine_notifyAdminPortal_ → " + adminArea, e, "");
    }
  });
}

/* ============================================================
   SECTION 8 — Helpers
   ============================================================ */

function carEngine_buildHeaderMap_(sheet) {
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var map     = {};
  headers.forEach(function(h, i) {
    var key = String(h || "").trim();
    if (key) map[key] = i;
  });
  return map;
}