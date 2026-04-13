/**
 * 06_Report_Complaint.gs  (IAG V8.2.0)
 *
 * التغييرات في V8.2.0:
 *   - التاريخ المستخدم = تاريخ الوارد (مش تاريخ التسجيل)
 *   - فولدر المرفقات يُنشأ فقط لو في مرفقات فعلية
 *   - Email والـ Register كل واحد في try/catch منفصل
 *   - iag_distributeShortcuts في try/catch
 *   - اسم الملف مختصر لتجنب أسماء طويلة
 *   - AI: إعادة صياغة قانونية مع حماية ثلاثية من فقدان المحتوى
 *
 * Entry points:
 *   rptComplaint_onSubmit(e)
 *   rptComplaintV8_onFormSubmit(e)
 *   rptComplaintV8_testLastRow()
 */

/* ============================================================
   SECTION 1 — Addressees Config
   ============================================================ */

const COMPLAINT_ADDRESSEES = {
  "وكيل الوزارة": {
    title:    "السيد الأستاذ الدكتور/ وكيل وزارة الصحة والسكان بمحافظة الفيوم",
    template: "undersecretary"
  },
  "النيابة الإدارية": {
    title:    "السيد المستشار/ رئيس هيئة النيابة الإدارية بالفيوم",
    template: "prosecution"
  },
  "المديرية المالية": {
    title:    "السيد الأستاذ/ وكيل وزارة المديرية المالية بمحافظة الفيوم",
    template: "prosecution"
  },
  "التنظيم والإدارة": {
    title:    "السيد الدكتور/ مدير مديرية التنظيم والإدارة",
    template: "prosecution"
  },
  "محافظ الفيوم": {
    title:    "الاستاذ الدكتور/ محافظ الفيوم",
    template: "prosecution"
  },
  "الجهاز المركزي للمحاسبات": {
    title:    "رئيس قطاع مديريات الشؤون الصحية والمستشفيات التعليمية والمراكز الطبية بالفيوم",
    template: "prosecution"
  },
  "الرقابة الإدارية": {
    title:    "السيد اللواء/ رئيس هيئة الرقابة الادارية بمحافظة الفيوم",
    template: "prosecution"
  },
  "السكرتير العام": {
    title:    "السيد الأستاذ/ وكيل اول الوزارة السكرتير العام لمحافظة الفيوم",
    template: "prosecution"
  }
};

const COMPLAINT_REPORT_TYPE = "فحص الشكوى";

/* ============================================================
   SECTION 2 — Entry Points
   ============================================================ */

function rptComplaint_onSubmit(e) {
  return rptComplaintV8_onFormSubmit(e);
}

function rptComplaintV8_onFormSubmit(e) {
  var data = {};
  if (e && e.namedValues) {
    Object.keys(e.namedValues).forEach(function (k) {
      data[k] = Array.isArray(e.namedValues[k]) ? e.namedValues[k][0] : e.namedValues[k];
    });
  } else if (e && e.range) {
    var sh      = e.range.getSheet();
    var headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
    var vals    = e.values || sh.getRange(e.range.getRow(), 1, 1, sh.getLastColumn()).getValues()[0];
    headers.forEach(function (h, i) { if (h) data[String(h).trim()] = vals[i]; });
  }
  return rptComplaint_create_(data);
}

function rptComplaintV8_testLastRow() {
  var sh = SpreadsheetApp.getActive().getSheetByName(CONFIG.SHEETS.COMPLAINTS_RESPONSES);
  if (!sh || sh.getLastRow() < 2) throw new Error("COMPLAINTS_RESPONSES: لا توجد بيانات");
  var headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  var vals    = sh.getRange(sh.getLastRow(), 1, 1, sh.getLastColumn()).getValues()[0];
  var data = {};
  headers.forEach(function (h, i) { if (h) data[String(h).trim()] = vals[i]; });
  return rptComplaint_create_(data);
}

/* ============================================================
   SECTION 3 — Core Logic
   ============================================================ */

function rptComplaint_create_(data) {
  auditEngine_logEvent("COMPLAINT_REPORT", "START", "بدء إنشاء تقرير فحص الشكوى", { data: "محاولة جديدة" });

  try {
    // ── 3.1 Extract fields ──
    var rawData = rptComplaint_extractFields_(data);

    // ── 3.2 AI correction (إعادة صياغة قانونية) ──
    var finalData = rptComplaint_correctFields_(rawData);

    // ── 3.3 Addressee ──
    var addresseeKey = String(
      rptComplaint_pick_(data, ["الخطاب موجهة الي", "الخطاب موجهة إلى"]) || "وكيل الوزارة"
    ).trim();

    var addresseeCfg   = COMPLAINT_ADDRESSEES[addresseeKey] || COMPLAINT_ADDRESSEES["وكيل الوزارة"];
    var addresseeTitle = addresseeCfg.title;
    var templateId     = addresseeCfg.template === "undersecretary"
      ? CONFIG.getTemplateComplaintUndersecretary()
      : CONFIG.getTemplateComplaintProsecution();

    // ── 3.4 Identifiers ──
    var recordNumber = String(
      rptComplaint_pick_(data, ["رقم القيد بدفتر الوارد", "رقم القيد بسجل الوارد", "رقم_القيد", "رقم القيد"]) || "—"
    ).trim();

    var reviewerName = String(
      rptComplaint_pick_(data, ["اسم المراجع", "القائم بالفحص", "الموظف_المكلف"]) || "—"
    ).trim();

    // ── 3.5 التاريخ وتسمية الملف ──
    var rawIncomingDate = rptComplaint_pick_(data, ["تاريخ الوارد", "تاريخ الواردة"]);
    var incomingDate    = rptComplaint_parseDate_(rawIncomingDate);
    var dateStr         = fmtV8_dateArabic(incomingDate);

    // اختصار اسم الجهة لتجنب أسماء ملفات طويلة جداً في Drive
    var shortKey = addresseeKey.replace("وكيل الوزارة ", "").replace(/[()]/g, "").trim();
    var fileName = "COMP-" + recordNumber + " - " + (shortKey || addresseeKey) + " - " + dateStr;

    // ── 3.6 هيكل الأرشيف بتاريخ الوارد ──
    var year  = String(incomingDate.getFullYear());
    var month = fmtV8_monthFolderName_(incomingDate);

    var archRoot    = DriveApp.getFolderById(CONFIG.getArchivePrivateRootId());
    var archReports = folderV8_getOrCreate(archRoot,    "REPORTS");
    var archType    = folderV8_getOrCreate(archReports, COMPLAINT_REPORT_TYPE);
    var archYear    = folderV8_getOrCreate(archType,    year);
    var archMonth   = folderV8_getOrCreate(archYear,    month);

    // مسح النسخة القديمة لو الموظف أعاد الإرسال
    var _oldFiles = archMonth.getFilesByName(fileName);
    while (_oldFiles.hasNext()) _oldFiles.next().setTrashed(true);

    // ── 3.7 إنشاء الملف الأصلي ──
    var docFile = DriveApp.getFileById(templateId).makeCopy(fileName, archMonth);
    docFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.EDIT);

    // ── Shortcuts في فولدرات الموظفين ──
    try {
      iag_distributeShortcuts(docFile, COMPLAINT_REPORT_TYPE, recordNumber, incomingDate, reviewerName);
    } catch (scErr) {
      auditEngine_logError("rptComplaint_shortcuts", scErr, { recordNumber: recordNumber });
    }

    // ── 3.8 Fill placeholders ──
    var doc  = DocumentApp.openById(docFile.getId());
    var body = doc.getBody();

    var safeText = function(val) {
      return String(val || "").trim();
    };

    body.replaceText("\\{\\{رقم_القيد\\}\\}",     safeText(recordNumber));
    body.replaceText("\\{\\{الموضوع\\}\\}",        safeText(finalData["الموضوع"]));
    body.replaceText("\\{\\{مضمون_الشكوى\\}\\}",   safeText(finalData["مضمون الشكوى"]));
    body.replaceText("\\{\\{الإجراءات\\}\\}",      safeText(finalData["الإجراءات"]));
    body.replaceText("\\{\\{الفحص\\}\\}",          safeText(finalData["الفحص"]));
    body.replaceText("\\{\\{الرأي\\}\\}",           safeText(finalData["الرأي"]));
    body.replaceText("\\{\\{اسم_المراجع\\}\\}",    safeText(reviewerName));
    body.replaceText("\\{\\{المخاطب\\}\\}",        safeText(addresseeTitle));
    body.replaceText("\\{\\{الجهة\\}\\}",          safeText(addresseeTitle));
    body.replaceText("\\{\\{العنوان\\}\\}",        safeText(addresseeTitle));
    doc.saveAndClose();

    // ── 3.9 مرفقات الشكوى ──
    try {
      var rawComplaintAttach = rptComplaint_pick_(data, ["مرفقات الشكوى", "المرفقات", "مرفقات"]);
      if (rawComplaintAttach && String(rawComplaintAttach).trim() !== "") {
        var attachFileIds = driveV8_extractFileIds_(String(rawComplaintAttach));
        if (attachFileIds.length > 0) {
          var attachmentsFolder = folderV8_getOrCreate(archMonth, "مرفقات " + fileName);
          folderV8_archiveAttachments_(attachmentsFolder, attachFileIds, "COMP-" + recordNumber);
        }
      }
    } catch (attachErr) {
      auditEngine_logError("rptComplaint_attachments", attachErr, { recordNumber: recordNumber });
    }

    // ── 3.10 PDF ──
    var pdfBlob = null;
    var pdfUrl  = "";
    try {
      pdfBlob = govV8_exportPdfWithRetry_(docFile, fileName);
      if (pdfBlob) {
        var pdfFile = archMonth.createFile(pdfBlob);
        pdfFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
        pdfUrl = pdfFile.getUrl();
      }
    } catch (pe) { auditEngine_logError("rptComplaint_pdf", pe, { recordNumber: recordNumber }); }

    // ── 3.11 جلب إيميل الموظف ──
    var authorEmail = "";
    try {
      var _ss   = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
      var _sh   = _ss.getSheetByName(SHEETS.EMPLOYEES);
      if (_sh && _sh.getLastRow() > 1) {
        var _map  = schemaV8_buildHeaderMap(_sh);
        var _data = _sh.getRange(2, 1, _sh.getLastRow() - 1, _sh.getLastColumn()).getValues();
        var _ni   = _map["الاسم"];
        var _ei   = _map["الايميل"];
        if (_ni !== undefined && _ei !== undefined) {
          for (var _r = 0; _r < _data.length; _r++) {
            if (String(_data[_r][_ni] || "").trim() === reviewerName) {
              authorEmail = String(_data[_r][_ei] || "").trim();
              break;
            }
          }
        }
      }
    } catch (_e) {
      auditEngine_logError("rptComplaint_authorEmail", _e, { reviewerName: reviewerName });
    }

    // ── 3.12 Email ──
    var emailResult = { sent: false };
    try {
      emailResult = emailV8_sendReportEmail({
        reportType:  "COMPLAINT",
        authorEmail: authorEmail,
        authorName:  reviewerName,
        entityOrId:  "شكوى " + recordNumber,
        dateStr:     dateStr,
        docUrl:      docFile.getUrl(),
        pdfBlob:     pdfBlob,
        addressee:   addresseeKey
      });
    } catch (errEmail) {
      auditEngine_logError("rptComplaint_email", errEmail, { recordNumber: recordNumber });
    }

    // ── 3.13 Register ──
    try {
      compV8_registerReport_({
        type:        COMPLAINT_REPORT_TYPE,
        key:         "COMPLAINT-" + recordNumber,
        officer:     reviewerName,
        visitDate:   dateStr,
        fileName:    fileName,
        docUrl:      docFile.getUrl(),
        pdfUrl:      pdfUrl,
        addressee:   addresseeKey,
        emailStatus: emailResult.sent ? "تم" : "خطأ"
      });
    } catch (errReg) {
      auditEngine_logError("rptComplaint_registration", errReg, { recordNumber: recordNumber });
    }

    auditEngine_logEvent("COMPLAINT_REPORT", "SUCCESS", "تم إنشاء تقرير الشكوى بنجاح", { docUrl: docFile.getUrl(), key: "COMPLAINT-" + recordNumber });
    return { ok: true, docUrl: docFile.getUrl(), key: "COMPLAINT-" + recordNumber };

  } catch (err) {
    auditEngine_logError("rptComplaint_create_", err);
    return { ok: false, error: err.message };
  }
}

/* ============================================================
   SECTION 4 — Field Helpers
   ============================================================ */

function rptComplaint_extractFields_(data) {
  return {
    "الموضوع":       String(rptComplaint_pick_(data, ["الموضوع"])       || ""),
    "مضمون الشكوى": String(rptComplaint_pick_(data, ["مضمون الشكوى"])   || ""),
    "الإجراءات":    String(rptComplaint_pick_(data, ["الإجراءات"])      || ""),
    "الفحص":        String(rptComplaint_pick_(data, ["الفحص"])          || ""),
    "الرأي":        String(rptComplaint_pick_(data, ["الرأي"])          || "")
  };
}

/* ============================================================
   SECTION 5 — AI Correction (إعادة صياغة قانونية محمية)
   ============================================================ */

function rptComplaint_correctFields_(rawData) {
  var isAI = false;
  try { isAI = CONFIG.isAIEnabled() && !!aiV8_getGeminiKey_(); } catch (e) {}
  if (!isAI) return rawData;

  var out = {};
  Object.keys(rawData).forEach(function (k) {
    var v = rawData[k];
    if (!v || !String(v).trim()) { out[k] = v; return; }
    try {
      var corrected = rptComplaint_aiCorrect_(String(v));
      // حماية: لو الناتج أقل من 85% حجم الأصل → احتفظ بالأصل
      var ratio = corrected.length / String(v).length;
      out[k] = (ratio < 0.85) ? String(v) : corrected;
    } catch (e) {
      out[k] = String(v); // أي خطأ → الأصل دائماً
    }
  });
  return out;
}

/**
 * إعادة صياغة قانونية وإدارية احترافية
 * مع الحفاظ المطلق على كل الوقائع والحقائق
 */
function rptComplaint_aiCorrect_(text) {
  var key = aiV8_getGeminiKey_();
  if (!key) return text;

  var prompt =
    "أنت مراجع إداري قانوني محترف في جهة رقابية حكومية مصرية.\n" +
    "مهمتك: إعادة صياغة النص التالي بأسلوب إداري قانوني رسمي رصين،\n" +
    "مع تصحيح الأخطاء الإملائية والنحوية.\n\n" +
    "قواعد مطلقة لا استثناء فيها:\n" +
    "1. يُمنع حذف أي واقعة أو اسم أو تاريخ أو رقم أو جهة أو تفصيلة ذكرها الموظف.\n" +
    "2. يُمنع الاختصار المخل — أعد بناء الجمل لتصبح أكثر رسمية لا أقصر.\n" +
    "3. يُمنع إضافة وقائع أو معلومات غير موجودة في النص الأصلي.\n" +
    "4. استبدل الألفاظ العامية أو الركيكة بمصطلحات إدارية دقيقة.\n" +
    "   أمثلة: (ثبت من الفحص — تبيّن للمراجعة — بالمخالفة لأحكام — اتُّخذ اللازم).\n" +
    "5. حافظ على تسلسل الأحداث والمعنى الأصلي تماماً.\n" +
    "6. أرجع النص المُصاغ فقط بدون مقدمات أو شروحات أو علامات تنصيص.\n\n" +
    "النص:\n" +
    "---\n" +
    text +
    "\n---";

  var url  = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=" + key;
  var resp = UrlFetchApp.fetch(url, {
    method            : "post",
    contentType       : "application/json",
    muteHttpExceptions: true,
    payload: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.3, maxOutputTokens: 8192 }
    })
  });

  var result    = JSON.parse(resp.getContentText());
  var corrected = (
    result.candidates &&
    result.candidates[0] &&
    result.candidates[0].content &&
    result.candidates[0].content.parts &&
    result.candidates[0].content.parts[0].text
  ) || "";

  // تنظيف: إزالة علامات التنصيص أو الفواصل
  corrected = corrected
    .replace(/^```[\s\S]*?\n/, "")
    .replace(/```$/,           "")
    .replace(/^---\s*/,        "")
    .replace(/\s*---$/,        "")
    .trim();

  // حماية: لو النموذج رفض أو رجع رسالة خطأ → الأصل
  if (
    !corrected ||
    corrected.length < 20 ||
    corrected.includes("عذراً") ||
    corrected.includes("لا أستطيع") ||
    corrected.includes("I cannot") ||
    corrected.includes("I'm sorry")
  ) {
    return text;
  }

  return corrected;
}

/* ============================================================
   SECTION 6 — Utilities
   ============================================================ */

function rptComplaint_pick_(data, keys) {
  for (var i = 0; i < keys.length; i++) {
    var v = data[keys[i]];
    if (v === null || v === undefined || v === "") continue;
    if (Array.isArray(v)) return v[0] || "";
    return v;
  }
  return null;
}

/**
 * تحويل تاريخ الوارد لـ Date object
 */
function rptComplaint_parseDate_(raw) {
  if (!raw) return new Date();
  if (raw instanceof Date && !isNaN(raw.getTime())) return raw;

  var s = String(raw).trim();
  if (!s) return new Date();

  var m1 = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m1) return new Date(parseInt(m1[3]), parseInt(m1[2]) - 1, parseInt(m1[1]));

  var m2 = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m2) return new Date(parseInt(m2[1]), parseInt(m2[2]) - 1, parseInt(m2[3]));

  var d = new Date(s);
  if (!isNaN(d.getTime())) return d;

  auditEngine_logError("rptComplaint_parseDate_", new Error("تعذر تحليل [" + s + "]"), {});
  return new Date();
}