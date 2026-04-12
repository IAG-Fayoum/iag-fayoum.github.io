/**
 * 09_Report_TechUnits.gs  (IAG V0.10)
 *
 * الإصلاحات الجوهرية:
 *   1. اسم الوحدة والإدارة يُستخرجان صح
 *   2. لا "تلاحظ:" قبل كل بند — السلبية مباشرة
 *   3. التواريخ تُعرض بالعربي (1 مارس 2026)
 *   4. التاريخ والنتيجة في سطر واحد
 *   5. الأسئلة نعم/لا — تُكتب كمخالفة فقط لو الجواب يدل على مشكلة
 *   6. الحقول المرتبطة تتجمع (نقص + تفاصيل النقص = سطر واحد)
 *   7. التوصيات: مجمعة موجهة لشخص محدد
 *   8. ملحق الصور يُضاف من عمود "الخاتمة والمرفقات"
 */

/* ============================================================
   SECTION 1 — Constants
   ============================================================ */

const TECH_UNITS_REPORT_TYPE  = "مرور فني وحدات";
const TECH_UNITS_OBSERVED_VAL = "مرصودة (مخالفة/نقص)";

const TECH_UNITS_AREA_COLS = [
  " اختر الوحدة / المركز الصحي لبندر الفيوم",
  "اختر الوحدة / المركز الصحي لمركز الفيوم",
  "اختر الوحدة / المركز الصحي لسنورس",
  "اختر الوحدة / المركز الصحي لاطسا",
  "اختر الوحدة / المركز الصحي لطامية",
  "اختر الوحدة / المركز الصحي لابشواى",
  "اختر الوحدة / المركز الصحي ليوسف الصديق"
];

const TECH_UNITS_AREA_ADMIN = {
  " اختر الوحدة / المركز الصحي لبندر الفيوم":  "بندر الفيوم",
  "اختر الوحدة / المركز الصحي لمركز الفيوم":   "مركز الفيوم",
  "اختر الوحدة / المركز الصحي لسنورس":          "سنورس",
  "اختر الوحدة / المركز الصحي لاطسا":           "اطسا",
  "اختر الوحدة / المركز الصحي لطامية":          "طامية",
  "اختر الوحدة / المركز الصحي لابشواى":         "ابشواى",
  "اختر الوحدة / المركز الصحي ليوسف الصديق":   "يوسف الصديق"
};

const TECH_UNITS_LEGAL_CODES = [
  "بدون ترخيص", "تعديل أو حذف في السجلات",
  "موافقة المريض", "الأدوية المخدرة",
  "قفل أمان على خزانة", "تطعيمات منتهية الصلاحية",
  "سلسلة التبريد", "عزل غرف الأشعة",
  "حمل الحوامل قبل التعرض للأشعة",
  "تعارض أو عدم تطابق في بيانات الإثبات",
  "الأمصال واللقاحات"
];

const TECH_UNITS_LINKED_PAIRS = {
  "هل يوجد نقص في الملفات":     "اذكر نواقص الملفات",
  "هل يوجد نقص في الاستمارات":  "اذكر نواقص الاستمارات",
  "يوجد أدوية راكدة بالصيدلية": "اذكر الأدوية الراكدة"
};

const TECH_UNITS_YESNO_FINDINGS = [
  { col: "هل يوجد تحديث للفحص الطبي",  bad: ["لا"],  tmpl: "لا يوجد تحديث للملف الطبي بغرفة الملفات" },
  { col: "هل يوجد نقص في الملفات",      bad: ["نعم"], tmpl: "يوجد نقص في الملفات" },
  { col: "هل يوجد نقص في الاستمارات",   bad: ["نعم"], tmpl: "يوجد نقص في الاستمارات" },
  { col: "يوجد أدوية راكدة بالصيدلية",  bad: ["نعم"], tmpl: "يوجد أدوية راكدة بالصيدلية" }
];

const TECH_UNITS_DATE_RESULT_PAIRS = [
  { date: "تاريخ آخر عينة مياه تم أخذها",           result: "نتيجة آخر عينة مياه",                        label: "آخر عينة مياه" },
  { date: "تاريخ آخر رفع للنفايات الطبية من الوحدة", result: "وزن آخر دفعة نفايات طبية تم رفعها (كيلو)", label: "آخر رفع نفايات طبية" }
];

/* ============================================================
   SECTION 2 — Entry Points
   ============================================================ */

function rptTechUnits_onSubmit(e) {
  var data = {};
  if (e && e.namedValues) {
    Object.keys(e.namedValues).forEach(function(k) {
      data[k.trim()] = Array.isArray(e.namedValues[k]) ? e.namedValues[k][0] : e.namedValues[k];
    });
  } else if (e && e.range) {
    var sh      = e.range.getSheet();
    var headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
    var vals    = e.values || sh.getRange(e.range.getRow(), 1, 1, sh.getLastColumn()).getValues()[0];
    headers.forEach(function(h, i) { if (h) data[String(h).trim()] = vals[i]; });
  }
  return rptTechUnits_create_(data);
}

function rptTechUnits_testLastRow() {
  var ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  var sh = ss.getSheetByName(SHEETS.TECH_UNITS_RESPONSES);
  if (!sh || sh.getLastRow() < 2) throw new Error("لا توجد بيانات");
  var headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  var vals    = sh.getRange(sh.getLastRow(), 1, 1, sh.getLastColumn()).getValues()[0];
  var data    = {};
  headers.forEach(function(h, i) { if (h) data[String(h).trim()] = vals[i]; });
  return rptTechUnits_create_(data);
}

/* ============================================================
   SECTION 3 — Core Logic
   ============================================================ */

function rptTechUnits_create_(data) {
  console.log("🏥 بدء إنشاء تقرير المرور الفني للوحدات");
  try {
    var meta = rptTechUnits_extractMeta_(data);
    console.log("👤 " + meta.officer + " | 🏥 " + meta.unitName + " | إدارة: " + meta.adminArea);

    var lock = LockService.getScriptLock();
    try { lock.waitLock(15000); } catch (le) {
      throw new Error("الملف مشغول — يرجى إعادة المحاولة بعد لحظات");
    }

    try {
      var sections = rptTechUnits_extractSections_(data);
      console.log("📊 الأقسام: " + sections.length);

      sections = rptTechUnits_correctSections_(sections);

      var visitDate = meta.visitDate;
      var year      = String(visitDate.getFullYear());
      var month     = fmtV8_monthFolderName_(visitDate);
      var dateStr   = fmtV8_dateArabic(visitDate);

      var archRoot      = DriveApp.getFolderById(CONFIG.getArchivePrivateRootId());
      var reportsFolder = folderV8_getOrCreate(archRoot, "REPORTS");
      var typeFolder    = folderV8_getOrCreate(reportsFolder, TECH_UNITS_REPORT_TYPE);
      var yearFolder    = folderV8_getOrCreate(typeFolder, year);
      var monthFolder   = folderV8_getOrCreate(yearFolder, month);
      var adminFolder   = folderV8_getOrCreate(monthFolder, meta.adminArea || "غير محددة");
      var archUnit      = folderV8_getOrCreate(adminFolder, meta.unitName  || "غير محدد");

      var templateId = CONFIG.getTemplateTechUnits();
      var fileName   = "مرور فني - " + (meta.unitName || "وحدة") + " - " + fmtV8_dateFileName(visitDate);

      var oldFolder = folderV8_getOrCreate(archUnit, "_OLD_VERSIONS");
      var old = archUnit.getFilesByName(fileName);
      while (old.hasNext()) {
        var oldFile = old.next();
        oldFolder.addFile(oldFile);
        archUnit.removeFile(oldFile);
      }

      var docFile = DriveApp.getFileById(templateId).makeCopy(fileName, archUnit);
      docFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

      rptTechUnits_fillDoc_(docFile.getId(), meta, sections, dateStr, data);

      var legalFile     = null;
      var legalSections = rptTechUnits_extractLegalSections_(sections);
      if (legalSections.length > 0) {
        try {
          legalFile = rptTechUnits_createLegalFile_(archUnit, meta, legalSections, dateStr, fileName);
          console.log("⚖️ ملف قانوني: " + legalFile.getUrl());
        } catch (le) { govV8_logError("rptTechUnits legal file", le); }
      }

      try { iag_distributeShortcuts(docFile, TECH_UNITS_REPORT_TYPE, meta.unitName, visitDate, meta.officer); }
      catch (scErr) { console.warn("Shortcuts:", scErr.message); }

      var pdfBlob = null;
      try { pdfBlob = govV8_exportPdfWithRetry_(docFile, fileName); } catch (pe) {}

      var legalPdfBlob = null;
      if (legalFile) {
        try { legalPdfBlob = govV8_exportPdfWithRetry_(legalFile, legalFile.getName()); } catch (pe) {}
      }

      var emailResult = { sent: false };
      try {
        emailResult = emailV8_sendReportEmail({
          reportType: TECH_UNITS_REPORT_TYPE, authorName: meta.officer,
          entityOrId: meta.unitName, dateStr: dateStr,
          docUrl: docFile.getUrl(), pdfBlob: pdfBlob,
          extraPdfBlobs: legalPdfBlob ? [legalPdfBlob] : [],
          legalDocUrl: legalFile ? legalFile.getUrl() : ""
        });
      } catch (ee) { console.warn("Email:", ee.message); }

      try {
        compV8_registerReport_({
          type: TECH_UNITS_REPORT_TYPE, key: "PHC-" + meta.unitName,
          officer: meta.officer, visitDate: dateStr,
          fileName: fileName, docUrl: docFile.getUrl(),
          emailStatus: emailResult.sent ? "تم" : "خطأ"
        });
      } catch (re) { console.warn("Register:", re.message); }

      console.log("✅ تم إنشاء التقرير: " + docFile.getUrl());
      return { ok: true, docUrl: docFile.getUrl(), unit: meta.unitName, legalUrl: legalFile ? legalFile.getUrl() : null };

    } finally {
      lock.releaseLock();
    }

  } catch (err) {
    console.error("❌ rptTechUnits_create_:", err.message);
    govV8_logError("rptTechUnits_create_", err);
    throw err;
  }
}

/* ============================================================
   SECTION 4 — Meta Extraction
   ============================================================ */

function rptTechUnits_extractMeta_(data) {
  var unitName  = "";
  var adminArea = "";

  for (var ci = 0; ci < TECH_UNITS_AREA_COLS.length; ci++) {
    var col     = TECH_UNITS_AREA_COLS[ci];
    var colTrim = col.trim();
    var val     = data[col] || data[colTrim] || "";
    val = String(val).trim();
    if (val && val !== "—" && val !== "") {
      unitName  = val;
      adminArea = TECH_UNITS_AREA_ADMIN[col] || TECH_UNITS_AREA_ADMIN[colTrim] || "";
      break;
    }
  }

  if (!adminArea) adminArea = String(data["الإدارة الصحية"] || "").trim();

  var visitDate    = new Date();
  var dateColNames = ["تاريخ المرور", "Timestamp"];
  for (var i = 0; i < dateColNames.length; i++) {
    if (data[dateColNames[i]]) {
      var d = (data[dateColNames[i]] instanceof Date)
        ? data[dateColNames[i]]
        : new Date(data[dateColNames[i]]);
      if (!isNaN(d.getTime())) { visitDate = d; break; }
    }
  }

  var officer     = String(data["اسم فريق المرور"] || data["اسم المراجع"] || "").trim();
  var officerList = officer.split(/[,،\n]/).map(function(s) { return s.trim(); }).filter(Boolean);

  return {
    unitName:    unitName  || "غير محدد",
    adminArea:   adminArea || "",
    visitDate:   visitDate,
    officer:     officer,
    officerList: officerList,
    timeStr:     String(data["ساعة المرور"]  || "").trim(),
    period:      String(data["توقيت المرور"] || "").trim(),
    unitManager: String(data["اسم مدير الوحدة / المركز الطبي"] || "").trim(),
    absentNames: String(data["أسماء المتغيبين عن العمل (الاسم رباعي + الوظيفة + الغياب بدون إذن)"] || "").trim(),
    absentCount: String(data["إجمالي عدد المتغيبين"] || "").trim()
  };
}

/* ============================================================
   SECTION 5 — Section Extraction
   ============================================================ */

function rptTechUnits_extractSections_(data) {
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

  var skipKeys = {};
  Object.keys(TECH_UNITS_LINKED_PAIRS).forEach(function(k) { skipKeys[k] = true; });
  TECH_UNITS_DATE_RESULT_PAIRS.forEach(function(p) { skipKeys[p.result] = true; });
  TECH_UNITS_YESNO_FINDINGS.forEach(function(y) { skipKeys[y.col] = true; });

  var hardSkip = {
    "أسماء المتغيبين عن العمل (الاسم رباعي + الوظيفة + الغياب بدون إذن)": true,
    "عجز بفئات (طبيب/تمريض/أسنان/صيادلة) — الفئة والعدد الحالي والاحتياج": true
  };

  var sectionBlocks = [];
  var blockKeys     = [];
  var passedMeta    = false;

  for (var i = 0; i < orderedKeys.length; i++) {
    var k = orderedKeys[i];
    if (!passedMeta) {
      if (k.indexOf("تقييم عناصر المجموعة") === 0) passedMeta = true;
      else continue;
    }
    if (k === "الخاتمة والمرفقات") continue;

    if (k.indexOf("ملاحظات أخرى —") !== -1) {
      var secName = k.replace("ملاحظات أخرى —", "").trim();
      blockKeys.push({ key: k, isSectionEnd: true, sectionName: secName });
      sectionBlocks.push(blockKeys.slice());
      blockKeys = [];
    } else {
      blockKeys.push({ key: k, isSectionEnd: false });
    }
  }
  if (blockKeys.length > 0) sectionBlocks.push(blockKeys.slice());

  var sections   = [];
  var sectionMap = {};

  sectionBlocks.forEach(function(block) {
    var lastItem = block[block.length - 1];
    var secName  = (lastItem && lastItem.isSectionEnd) ? lastItem.sectionName : "ملاحظات ختامية";
    var sec      = { name: secName, violations: [], info: [] };

    block.forEach(function(item) {
      var key = item.key;
      var val = String(data[key] || "").trim();

      if (item.isSectionEnd) {
        if (val && val !== "لا يوجد" && val !== "—") sec.info.push({ label: "ملاحظات عامة", value: val });
        return;
      }

      if (key.indexOf("تقييم عناصر المجموعة") === 0) {
        if (val.indexOf("مرصودة") !== -1 || val.indexOf("🔴") !== -1) {
          var match = key.match(/\[(.+)\]/);
          if (match) sec.violations.push(match[1].trim());
        }
        return;
      }

      if (skipKeys[key]) return;
      if (hardSkip[key]) return;

      for (var dp = 0; dp < TECH_UNITS_DATE_RESULT_PAIRS.length; dp++) {
        var pair = TECH_UNITS_DATE_RESULT_PAIRS[dp];
        if (key === pair.date) {
          var dateVal   = rptTechUnits_formatDate_(val);
          var resultVal = String(data[pair.result] || "").trim();
          if (dateVal || resultVal) {
            var combined = pair.label + ": " + dateVal;
            if (resultVal) combined += " — النتيجة: " + resultVal;
            sec.info.push({ label: "", value: combined, raw: true });
          }
          return;
        }
      }

      var isYN = false;
      for (var yn = 0; yn < TECH_UNITS_YESNO_FINDINGS.length; yn++) {
        var ynItem = TECH_UNITS_YESNO_FINDINGS[yn];
        if (key === ynItem.col) {
          isYN = true;
          var isBad = ynItem.bad.some(function(b) { return val.toLowerCase() === b.toLowerCase(); });
          if (isBad) {
            var detailKey   = TECH_UNITS_LINKED_PAIRS[key];
            var detailVal   = detailKey ? String(data[detailKey] || "").trim() : "";
            var findingText = ynItem.tmpl;
            if (detailVal) findingText += ": " + detailVal;
            sec.violations.push(findingText);
          }
          break;
        }
      }
      if (isYN) return;

      if (val && val !== "لا يوجد" && val !== "—" && val !== "0") {
        if (rptTechUnits_isInfoField_(key)) {
          var mapped = TECH_UNITS_TEXT_MAP[rptTechUnits_shortenLabel_(key)]
                    || TECH_UNITS_TEXT_MAP[key];
          if (mapped === "SKIP") return;
          sec.info.push({ label: rptTechUnits_shortenLabel_(key), value: val });
        }
      }
    });

    if (sec.violations.length > 0 || sec.info.length > 0) {
      sectionMap[secName] = sections.length;
      sections.push(sec);
    }
  });

  var tailMap = {
    "حالة خدمة الاسنان بالوحدة": "الاسنان",
    "حالة المعمل بالوحدة":        "المعمل"
  };
  Object.keys(tailMap).forEach(function(tailKey) {
    var targetSec  = tailMap[tailKey];
    var val        = String(data[tailKey] || "").trim();
    if (!val || val === "لا يوجد" || val === "—" || val === "مفعلة وتعمل" || val === "مفعل ويعمل") return;
    var label      = rptTechUnits_shortenLabel_(tailKey);
    var isBadState = val.indexOf("لا تعمل") !== -1 || val.indexOf("لا يعمل") !== -1
                  || val.indexOf("معطل")    !== -1 || val.indexOf("متوقف")   !== -1;
    if (sectionMap[targetSec] !== undefined) {
      if (isBadState) sections[sectionMap[targetSec]].violations.unshift(label + " — " + val);
      else            sections[sectionMap[targetSec]].info.unshift({ label: label, value: val });
    } else {
      var newSec = { name: targetSec, violations: [], info: [] };
      if (isBadState) newSec.violations.push(label + " — " + val);
      else            newSec.info.push({ label: label, value: val });
      sections.push(newSec);
    }
  });

  return sections;
}

function rptTechUnits_formatDate_(val) {
  if (!val) return "";
  var months = {
    "Jan":"يناير","Feb":"فبراير","Mar":"مارس","Apr":"أبريل",
    "May":"مايو","Jun":"يونيو","Jul":"يوليو","Aug":"أغسطس",
    "Sep":"سبتمبر","Oct":"أكتوبر","Nov":"نوفمبر","Dec":"ديسمبر"
  };
  var m = String(val).match(/(\w{3})\s+(\d{1,2})\s+(\d{4})/);
  if (m) return parseInt(m[2]) + " " + (months[m[1]] || m[1]) + " " + m[3];
  var d = (val instanceof Date) ? val : new Date(val);
  if (!isNaN(d.getTime())) {
    var mo = ["يناير","فبراير","مارس","أبريل","مايو","يونيو",
              "يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"];
    return d.getDate() + " " + mo[d.getMonth()] + " " + d.getFullYear();
  }
  return String(val);
}

function rptTechUnits_isInfoField_(key) {
  var prefixes = [
    "تفاصيل","اذكر","أسماء","سبب","عدد","نسبة","متوسط","وزن","حالة",
    "المبادرات الرئاسية المفعّلة","أسماء العيادات",
    "أدوية أخرى","إجمالي عدد","عدد أجهزة",
    "أسماء المتغيبين","عجز بفئات"
  ];
  for (var i = 0; i < prefixes.length; i++) {
    if (key.indexOf(prefixes[i]) !== -1) return true;
  }
  return false;
}

function rptTechUnits_shortenLabel_(label) {
  var s = String(label || "").trim()
    .replace(/^تقييم عناصر المجموعة\s*\[?/, "")
    .replace(/\]$/, "")
    .replace(/^تفاصيل /, "");
  return s.length > 55 ? s.substring(0, 52) + "..." : s;
}

/* ============================================================
   SECTION 6 — AI Correction
   ============================================================ */

function rptTechUnits_correctSections_(sections) {
  var isAI = false;
  try { isAI = CONFIG.isAIEnabled() && !!aiV8_getGeminiKey_(); } catch (e) {}
  if (!isAI) return sections;

  return sections.map(function(sec) {
    return {
      name:       sec.name,
      violations: sec.violations,
      info: sec.info.map(function(item) {
        if (item.raw) return item;
        if (item.label === "ملاحظات عامة" || item.label === "") {
          try {
            var c = aiV8_correctText(item.value, {
              mode: "spelling_only", context: "formal_arabic",
              instructions: "صحح الأخطاء الإملائية والنحوية فقط. لا تغير المصطلحات الطبية أو العلمية أو أسماء الأدوية أو المستلزمات. أعد النص مصححاً فقط."
            });
            return { label: item.label, value: (c && c.length > 3) ? c : item.value };
          } catch (e) { return item; }
        }
        return item;
      })
    };
  });
}

/* ============================================================
   SECTION 7 — Document Fill
   ============================================================ */

function rptTechUnits_fillDoc_(docId, meta, sections, dateStr, data) {
  var doc  = DocumentApp.openById(docId);
  var body = doc.getBody();

  body.replaceText(
    "تم المرور على \\{\\{entity\\}\\} يوم \\{\\{date\\}\\}",
    "تم المرور على الوحدة الصحية " + (meta.unitName || "غير محدد") +
    " التابعة للإدارة الصحية " + (meta.adminArea || "") +
    " يوم " + dateStr
  );
  body.replaceText("\\{\\{entity\\}\\}",         meta.unitName  || "غير محدد");
  body.replaceText("\\{\\{date\\}\\}",            dateStr        || "");
  body.replaceText("\\{\\{UNIT\\}\\}",            meta.unitName  || "غير محدد");
  body.replaceText("\\{\\{DATE\\}\\}",            dateStr        || "");
  body.replaceText("\\{\\{AREA\\}\\}",            meta.adminArea || "");
  body.replaceText("\\{\\{TIME\\}\\}",            meta.timeStr   || "");
  body.replaceText("\\{\\{PERIOD\\}\\}",          meta.period    || "");
  body.replaceText("\\{\\{OFFICER\\}\\}",         meta.officer   || "");
  body.replaceText("\\{\\{ENTITY\\}\\}",          meta.unitName  || "غير محدد");
  body.replaceText("\\{\\{الإدارة_الصحية\\}\\}", meta.adminArea || "");
  body.replaceText("\\{\\{اسم_المراجع\\}\\}",    meta.officerList.join("\n"));

  var sectionsBlock  = rptTechUnits_buildSectionsBlock_(sections);
  var recommendBlock = rptTechUnits_buildRecommendations_(sections, meta);
  var fullContent    = sectionsBlock + "\n" + recommendBlock;

  if (body.getText().indexOf("{{data}}") !== -1) {
    body.replaceText("\\{\\{data\\}\\}", fullContent);
  } else {
    body.appendParagraph(fullContent).setAlignment(DocumentApp.HorizontalAlignment.RIGHT);
  }

  body.appendPageBreak();
  rptTechUnits_insertImages_(body, data);
  doc.saveAndClose();
}

/* ============================================================
   SECTION 8 — Sections Block Builder
   ============================================================ */

var ARABIC_ORDINALS = [
  "أولاً","ثانياً","ثالثاً","رابعاً","خامساً","سادساً","سابعاً",
  "ثامناً","تاسعاً","عاشراً","حادي عشر","ثاني عشر","ثالث عشر",
  "رابع عشر","خامس عشر"
];

var TECH_UNITS_TEXT_MAP = {
  "أسماء العيادات المفعّلة ومواعيد العمل"                                  : "العيادات المفعّلة ومواعيدها:",
  "سبب عدم تفعيل أي عيادة متخصصة"                                         : "سبب توقف العيادات:",
  "أسماء المتغيبين عن العمل (الاسم رباعي + الوظيفة + الغياب بدون إذن)"   : "SKIP",
  "إجمالي عدد المتغيبين"                                                    : "عدد المتغيبين عن العمل:",
  "عجز بفئات (طبيب/تمريض/أسنان/صيادلة) — الفئة والعدد الحالي والاحتياج" : "SKIP",
  "حالة جهاز البصمة"                                                        : "جهاز البصمة:",
  "المبادرات الرئاسية المفعّلة بالوحدة / المركز — اذكرها"                  : "المبادرات الرئاسية المفعّلة:",
  "اذكر نواقص الاستمارات"                                                   : "الاستمارات الناقصة:",
  "عدد الملفات المفعّلة بالوحدة"                                            : "عدد الملفات المفعّلة:",
  "عدد الملفات الراكدة"                                                     : "عدد الملفات الراكدة:",
  "عدد الملفات الجديدة التي تم فتحها خلال الشهر الحالي"                    : "ملفات جديدة هذا الشهر:",
  "نواقص أدوية الطوارئ"                                                     : "الأدوية الناقصة بالطوارئ:",
  "نواقص مستلزمات الطوارئ"                                                  : "المستلزمات الناقصة بالطوارئ:",
  "نواقص الأمصال واللقاحات"                                                 : "الأمصال واللقاحات الناقصة:",
  "اذكر الأدوية الراكدة"                                                    : "الأدوية الراكدة بالصيدلية:",
  "أدوية أخرى — اذكرها"                                                     : "أدوية ناقصة أخرى:",
  "نسبة تغطية الأطفال حديثي الولادة لفحص الغدة الدرقية (%)"               : "نسبة تغطية فحص الغدة الدرقية:",
  "متوسط عدد زيارات الحامل للمتابعة لاخر شهر سابق (لا يقل عن 4 زيارات)" : "متوسط زيارات الحامل للمتابعة:",
  "النقص في رصيد وسائل تنظيم الأسرة"                                       : "النقص في وسائل تنظيم الأسرة:",
  "نواقص مستلزمات الأسنان"                                                  : "المستلزمات الناقصة بالأسنان:",
  "حالة خدمة الأشعة بالوحدة"                                               : "حالة خدمة الأشعة:",
  "النقص في مستلزمات أو أفلام الأشعة"                                       : "النقص في مستلزمات الأشعة:",
  "اجمالي عدد أجهزة التعقيم"                                                : "إجمالي أجهزة التعقيم:",
  "عدد أجهزة التعقيم المعطلة"                                               : "أجهزة التعقيم المعطلة:",
  "تاريخ آخر رفع للنفايات الطبية من الوحدة"                                : "آخر رفع للنفايات الطبية:",
  "وزن آخر دفعة نفايات طبية تم رفعها (كيلو)"                              : "وزن آخر دفعة نفايات (كجم):"
};

function rptTechUnits_buildSectionsBlock_(sections) {
  if (!sections || !sections.length) return "لا توجد ملاحظات مسجلة.";

  var lines  = [];
  var secIdx = 0;

  sections.forEach(function(sec) {
    if (!sec.violations.length && !sec.info.length) return;

    var ordinal = ARABIC_ORDINALS[secIdx] || (secIdx + 1) + ".";
    secIdx++;

    lines.push("");
    lines.push(ordinal + ": " + sec.name);
    lines.push("──────────────────────────────────────");

    sec.violations.forEach(function(v, vi) {
      lines.push((vi + 1) + ". " + v);
    });

    if (sec.info.length > 0) {
      if (sec.violations.length > 0) lines.push("");
      sec.info.forEach(function(item) {
        if (item.raw) { lines.push("• " + item.value); return; }
        var mappedLabel = TECH_UNITS_TEXT_MAP[item.label];
        if (mappedLabel === "SKIP") return;
        if (!mappedLabel && item.label === "ملاحظات عامة") { lines.push("• " + item.value); return; }
        var displayLabel = mappedLabel || (item.label + ":");
        lines.push("• " + displayLabel + " " + item.value);
        if (mappedLabel === "عدد المتغيبين عن العمل:") {
          lines.push("• تم تحرير مذكرة بأسمائهم وتحويلهم إلى إدارة الشؤون القانونية.");
        }
      });
    }
  });

  return lines.join("\n");
}

/* ============================================================
   SECTION 9 — Recommendations Builder
   ============================================================ */

function rptTechUnits_buildRecommendations_(sections, meta) {
  var hasViolations = sections.some(function(s) { return s.violations.length > 0; });
  if (!hasViolations) return "";

  var adminName = meta.adminArea || "الإدارة الصحية المختصة";
  var unitName  = meta.unitName  || "الوحدة الصحية";

  var lines = [];
  lines.push("━━━━━━━━━━━━━━━━━━━━━━━━");
  lines.push("■ التوصيات");
  lines.push("━━━━━━━━━━━━━━━━━━━━━━━━");
  lines.push("1. مدير إدارة " + adminName + ":");
  lines.push("   سرعة تلافي ما ورد من سلبيات بالوحدة الصحية " + unitName +
             " خلال أسبوعين على الأكثر، وموافاة إدارة المراجعة الداخلية والحوكمة بما تم اتخاذه من إجراءات تصحيحية.");
  lines.push("2. مدير إدارة الرعاية الأولية بمديرية الشئون الصحية بالفيوم:");
  lines.push("   متابعة تلافي ما ورد من سلبيات بالوحدة الصحية " + unitName +
             " والتأكد من تنفيذ الإجراءات التصحيحية اللازمة.");

  return lines.join("\n");
}

/* ============================================================
   SECTION 10 — Image Handling
   ============================================================ */

function rptTechUnits_insertImages_(body, data) {
  var attachRaw = String(data["الخاتمة والمرفقات"] || "").trim();
  console.log("🖼️ attachRaw length: " + attachRaw.length + " | preview: " + attachRaw.substring(0, 150));

  var sep1 = body.appendParagraph("━━━━━━━━━━━━━━━━━━━━━━━━");
  sep1.setAlignment(DocumentApp.HorizontalAlignment.RIGHT);
  var header = body.appendParagraph("■ ملحق الصور والمرفقات");
  header.setAlignment(DocumentApp.HorizontalAlignment.RIGHT);
  header.editAsText().setBold(true);
  var sep2 = body.appendParagraph("━━━━━━━━━━━━━━━━━━━━━━━━");
  sep2.setAlignment(DocumentApp.HorizontalAlignment.RIGHT);

  if (!attachRaw) {
    body.appendParagraph("لم يتم إرفاق صور التوثيق الميداني في هذه الزيارة.")
        .setAlignment(DocumentApp.HorizontalAlignment.RIGHT);
    return;
  }

  try {
    var fileIds  = [];
    var patterns = [
      /[?&]id=([a-zA-Z0-9_-]{20,})/g,
      /\/d\/([a-zA-Z0-9_-]{20,})/g,
      /\/file\/d\/([a-zA-Z0-9_-]{20,})/g
    ];
    patterns.forEach(function(re) {
      var m;
      while ((m = re.exec(attachRaw)) !== null) {
        if (fileIds.indexOf(m[1]) === -1) fileIds.push(m[1]);
      }
    });
    if (!fileIds.length) {
      try { fileIds = driveV8_extractFileIds_(attachRaw); } catch(e) {}
    }

    if (!fileIds.length) {
      body.appendParagraph("لم يتم إرفاق صور التوثيق الميداني في هذه الزيارة.")
          .setAlignment(DocumentApp.HorizontalAlignment.RIGHT);
      return;
    }

    var added = 0;
    fileIds.forEach(function(fileId) {
      try {
        var file = DriveApp.getFileById(fileId);
        var mime = file.getMimeType() || "";
        if (mime.indexOf("image") !== -1) {
          var caption = body.appendParagraph("صورة " + (added + 1) + ":");
          caption.setAlignment(DocumentApp.HorizontalAlignment.RIGHT);
          caption.editAsText().setBold(true);
          var imgPara = body.appendParagraph("");
          imgPara.appendInlineImage(file.getBlob()).setWidth(420).setHeight(300);
          imgPara.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
          body.appendParagraph("").setAlignment(DocumentApp.HorizontalAlignment.RIGHT);
          added++;
        }
      } catch (imgErr) { console.warn("Image skip:", fileId, imgErr.message); }
    });

    if (added === 0) {
      body.appendParagraph("لم يتم إرفاق صور التوثيق الميداني في هذه الزيارة.")
          .setAlignment(DocumentApp.HorizontalAlignment.RIGHT);
    } else {
      console.log("🖼️ أُضيفت " + added + " صورة");
    }

  } catch (e) {
    console.warn("insertImages_:", e.message);
    body.appendParagraph("تعذّر تحميل الصور — " + e.message)
        .setAlignment(DocumentApp.HorizontalAlignment.RIGHT);
  }
}

/* ============================================================
   SECTION 11 — Legal File (ملف مستقل)
   ============================================================ */

function rptTechUnits_extractLegalSections_(sections) {
  var legal = [];
  sections.forEach(function(sec) {
    var legalViolations = sec.violations.filter(function(v) {
      return TECH_UNITS_LEGAL_CODES.some(function(lc) { return v.indexOf(lc) !== -1; });
    });
    if (legalViolations.length > 0) legal.push({ name: sec.name, violations: legalViolations });
  });
  return legal;
}

function rptTechUnits_createLegalFile_(folder, meta, legalSections, dateStr, baseName) {
  var LEGAL_TEMPLATE_ID = "1AbtybuX7cR6fTR6Q7A4-tG4JBoZmWAXJmzEqH22cSLk";
  var legalFileName     = "قانوني — " + baseName;

  var file = DriveApp.getFileById(LEGAL_TEMPLATE_ID).makeCopy(legalFileName, folder);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

  var doc  = DocumentApp.openById(file.getId());
  var body = doc.getBody();

  // Placeholders
  var fullDesc = "الوحدة الصحية " + (meta.unitName || "غير محدد") +
                 " التابعة للإدارة الصحية " + (meta.adminArea || "") +
                 " بتاريخ " + (dateStr || "");
  body.replaceText("\\{\\{entity\\}\\} يوم \\{\\{date\\}\\}", fullDesc);
  body.replaceText("\\{\\{entity\\}\\}",      meta.unitName || "غير محدد");
  body.replaceText("\\{\\{date\\}\\}",         dateStr       || "");
  body.replaceText("\\{\\{اسم_المراجع\\}\\}", meta.officerList.join("\n"));

  // بناء {{data}}
  var lines = [];

  // أولاً: مدير الوحدة
  var unitManager = String(meta.unitManager || "").trim();
  if (unitManager) {
    lines.push("أولاً: بيانات مسؤول الوحدة");
    lines.push("──────────────────────────────────────");
    lines.push("اسم مدير الوحدة / المركز الطبي: " + unitManager);
  }

  // ثانياً: المتغيبون
  var absentNames = String(meta.absentNames || "").trim();
  var absentCount = String(meta.absentCount || "").trim();
  if (absentNames || absentCount) {
    lines.push("ثانياً: المتغيبون عن العمل");
    lines.push("──────────────────────────────────────");
    if (absentCount) lines.push("إجمالي عدد المتغيبين: " + absentCount);
    if (absentNames) {
      var namesList = absentNames.split(/[\n,،]/).map(function(s) { return s.trim(); }).filter(Boolean);
      namesList.forEach(function(n, i) { lines.push((i + 1) + ". " + n); });
    }
  }

  // ثالثاً: المخالفات
  if (legalSections.length > 0) {
    lines.push("ثالثاً: المخالفات المرصودة التي تستوجب الإجراء القانوني");
    lines.push("──────────────────────────────────────");
    var vNum = 1;
    legalSections.forEach(function(sec) {
      lines.push("▸ " + sec.name + ":");
      sec.violations.forEach(function(v) {
        lines.push("  " + vNum + ". " + v);
        vNum++;
      });
    });
  }

  body.replaceText("\\{\\{data\\}\\}", lines.join("\n"));
  doc.saveAndClose();
  return file;
}

/* ============================================================
   SECTION 12 — Shortcuts Alias
   ============================================================ */

function iag_distributeShortcuts(file, reportType, entityName, date, officer) {
  try { folderV8_distributeShortcuts_(file, file.getName(), officer, date, reportType); }
  catch (e) { console.warn("iag_distributeShortcuts:", e.message); }
}

/* ============================================================
   SECTION 12b — Test Utilities
   ============================================================ */

function rptTechUnits_clearDedup() {
  PropertiesService.getScriptProperties().deleteAllProperties();
  Logger.log("✅ تم مسح جميع Dedup keys");
  SpreadsheetApp.getUi().alert("✅ تم مسح Dedup — يمكنك الآن إعادة التجربة");
}

/* ============================================================
   SECTION 13 — Dedup Helpers
   ============================================================ */

function rptTechUnits_buildSubmissionKey_(meta, data) {
  var ts        = String(data["Timestamp"] || "").trim();
  var visitDate = meta.visitDate
    ? Utilities.formatDate(meta.visitDate, Session.getScriptTimeZone(), "yyyy-MM-dd")
    : "";
  return (meta.unitName || "unknown") + "|" + visitDate + "|" + ts;
}

function rptTechUnits_isDuplicate_(key) {
  try {
    return !!PropertiesService.getScriptProperties().getProperty("DEDUP_RPT_" + key);
  } catch (e) {
    console.warn("isDuplicate check failed:", e.message);
    return false;
  }
}

function rptTechUnits_markProcessed_(key, docId) {
  try {
    PropertiesService.getScriptProperties()
      .setProperty("DEDUP_RPT_" + key, docId + "|" + new Date().toISOString());
  } catch (e) {
    console.warn("markProcessed failed:", e.message);
  }
}