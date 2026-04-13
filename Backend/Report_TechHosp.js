/**
 * 08_Report_TechHosp.gs  (IAG V0.09 — Multi-Submit Aggregation)
 *
 * التغييرات في V0.09:
 *   - إعادة هيكلة كاملة: كل قسم يُرسل منفصلاً من الفورم
 *   - OP_HOSP_SESSIONS لتتبع الجلسات الجارية
 *   - rptTechHosp_aggregateSection_: تجميع الأقسام في Doc واحد
 *   - rptTechHosp_finalizeReport: إنهاء التقرير (PDF + إيميل + أرشفة)
 *   - TECH_HOSP_SECTIONS محدّثة: 13 قسم فعلي من الفورم
 *
 * Entry points:
 *   rptTechHosp_onSubmit(e)          — trigger per section submit
 *   rptTechHosp_finalizeReport(id)   — manual finalize
 *   rptTechHospV7_testLastRow()      — test last row
 */

/* ============================================================
   SECTION 1 — Sections Definition
   ============================================================ */

const TECH_HOSP_REPORT_TYPE = "المرور الفني";
const TECH_HOSP_FOLDER_TYPE = "TECH_HOSP";

// 13 أقسام فعلية من الفورم (V0.09)
const TECH_HOSP_SECTIONS = Object.freeze([
  "إدارة المستشفى",
  "الاستقبال والطوارئ",
  "العناية المركزة",
  "القسم الداخلي",
  "العمليات",
  "الحضانات",
  "وحدة غسيل الكلى",
  "بنك الدم",
  "الصيدلية",
  "المعمل",
  "الأشعة",
  "التعقيم المركزي",
  "المستودعات والخدمات"
]);

const TECH_HOSP_COL = {
  officer:     "القائم بالمرور",
  hospital:    "اسم المستشفى",
  visitDate:   "تاريخ المرور",
  period:      "فترة المرور",
  sectionName: "القسم / الوحدة محل المرور (اختر قسماً واحداً فقط)"
};

/* ============================================================
   SECTION 2 — Entry Points
   ============================================================ */

function rptTechHosp_onSubmit(e) {
  return rptTechHosp_aggregateSection_(e);
}

function rptTechHospV7_onFormSubmit(e) {
  return rptTechHosp_aggregateSection_(e);
}

function rptTechHospV7_testLastRow() {
  var ss = SpreadsheetApp.getActive();
  var sh = ss.getSheetByName(CONFIG.SHEETS.TECH_HOSP_RESPONSES);
  if (!sh) throw new Error("Missing: TECH_HOSP_RESPONSES");
  var last = sh.getLastRow();
  if (last < 2) throw new Error("No rows in TECH_HOSP_RESPONSES");
  var headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  var values  = sh.getRange(last, 1, 1, sh.getLastColumn()).getValues()[0];
  var namedValues = {};
  headers.forEach(function (h, i) { var hh = String(h || "").trim(); if (hh) namedValues[hh] = [values[i]]; });
  return rptTechHosp_aggregateSection_({ namedValues: namedValues });
}

function rptTechHosp_showActiveSessions() {
  var sh = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID).getSheetByName(CONFIG.SHEETS.HOSP_SESSIONS);
  if (!sh) { SpreadsheetApp.getUi().alert("لا توجد جلسات بعد — OP_HOSP_SESSIONS غير موجود"); return; }
  SpreadsheetApp.getActive().setActiveSheet(sh);
}

/* ============================================================
   SECTION 3 — Core Aggregation Logic
   ============================================================ */

function rptTechHosp_aggregateSection_(e) {
  auditEngine_logEvent("تقارير المستشفيات", "النظام", "بدء تجميع قسم جديد بالمستشفى", "نجاح");
  try {
    // ── 3.1 Build data object ──
    var data = {};
    if (e && e.namedValues) {
      Object.keys(e.namedValues).forEach(function (k) {
        data[k] = Array.isArray(e.namedValues[k]) ? e.namedValues[k][0] : e.namedValues[k];
      });
    } else if (e && e.range) {
      var sh      = e.range.getSheet();
      var headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
      var row     = e.values || sh.getRange(e.range.getRow(), 1, 1, sh.getLastColumn()).getValues()[0];
      headers.forEach(function (h, i) { var hh = String(h || "").trim(); if (hh) data[hh] = row[i]; });
    }

    // ── 3.2 Meta ──
    var rawVisitDate = data[TECH_HOSP_COL.visitDate];
    var visitDateObj = (rawVisitDate instanceof Date) ? rawVisitDate : new Date(rawVisitDate || new Date());
    if (isNaN(visitDateObj.getTime())) visitDateObj = new Date();

    var meta = {
      officer:     String(data[TECH_HOSP_COL.officer]     || "غير محدد").trim(),
      hospital:    String(data[TECH_HOSP_COL.hospital]    || "").trim(),
      visitDate:   visitDateObj,
      period:      String(data[TECH_HOSP_COL.period]      || "").trim(),
      sectionName: String(data[TECH_HOSP_COL.sectionName] || "").trim()
    };

    if (!meta.hospital) throw new Error("اسم المستشفى مفقود");
    auditEngine_logEvent("تقارير المستشفيات", meta.officer, "معالجة بيانات قسم: " + meta.sectionName + " بمستشفى " + meta.hospital, "نجاح");

    // ── 3.3 Session Key ──
    var dateStr    = Utilities.formatDate(visitDateObj, Session.getScriptTimeZone(), "yyyyMMdd");
    var sessionKey = meta.hospital + "|" + dateStr + "|" + meta.period;

    // ── 3.4 Find or Create Session ──
    var masterSS = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    var session  = rptTechHosp_findSession_(masterSS, sessionKey);

    var docId, isNew;
    if (session) {
      docId = String(session.sessionRow[5] || "").trim(); // doc_id (col index 5)
      isNew = false;
      auditEngine_logEvent("تقارير المستشفيات", meta.officer, "إضافة لقائمة الجلسة المفتوحة: " + sessionKey, "نجاح");
    } else {
      var templateId  = CONFIG.getTemplateTechHosp();
      var workRoot    = DriveApp.getFolderById(CONFIG.getWorkSharedRootId());
      var typeFolder  = folderV8_getOrCreate(workRoot, TECH_HOSP_REPORT_TYPE);
      var monthFolder = folderV8_getMonthFolder(typeFolder, visitDateObj);
      var arabicDate  = fmtV8_dateFileName(visitDateObj);
      var fileName    = "تقرير مرور فني - " + meta.hospital + " - " + arabicDate;
      var docFile = DriveApp.getFileById(templateId).makeCopy(fileName, monthFolder);
      docFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.EDIT);
      docId = docFile.getId();
      isNew = true;
      rptTechHosp_createSession_(masterSS, sessionKey, meta, docId, docFile.getUrl());
      auditEngine_logEvent("تقارير المستشفيات", meta.officer, "بدء جلسة جديدة: " + sessionKey + " بمعرف " + docId, "نجاح");
    }

    // ── 3.5 Process & append section to Doc ──
    var processed = techHosp_processSingleSection_(data, meta);
    if (processed.sections.length > 0) {
      techHosp_updateDoc_(docId, meta, processed, isNew);
    }

    // ── 3.6 Update sections_submitted ──
    if (meta.sectionName) {
      rptTechHosp_updateSectionsSubmitted_(masterSS, sessionKey, meta.sectionName);
    }

    auditEngine_logEvent("تقارير المستشفيات", meta.officer, "تم تجميع قسم: " + meta.sectionName + " بنجاح", "نجاح");
    return { ok: true, sessionKey: sessionKey, section: meta.sectionName, isNew: isNew };

  } catch (err) {
    auditEngine_logError("rptTechHosp_aggregateSection_", err, { eventData: (e && e.namedValues) ? "Form Data" : "Unknown" });
    throw err;
  }
}

function rptTechHosp_findSession_(masterSS, sessionKey) {
  var sh = masterSS.getSheetByName(CONFIG.SHEETS.HOSP_SESSIONS);
  if (!sh) return null;
  var lastRow = sh.getLastRow();
  if (lastRow < 2) return null;
  var data = sh.getRange(2, 1, lastRow - 1, 11).getValues();
  for (var i = 0; i < data.length; i++) {
    if (String(data[i][0]).trim() === sessionKey) {
      return { rowIndex: i + 2, sessionRow: data[i] };
    }
  }
  return null;
}

function rptTechHosp_createSession_(masterSS, sessionKey, meta, docId, docUrl) {
  var sh = masterSS.getSheetByName(CONFIG.SHEETS.HOSP_SESSIONS);
  if (!sh) {
    sh = masterSS.insertSheet(CONFIG.SHEETS.HOSP_SESSIONS);
    sh.appendRow(SHEET_HEADERS.HOSP_SESSIONS);
  }
  var now = new Date();
  sh.appendRow([
    sessionKey,
    meta.hospital,
    meta.visitDate,
    meta.period,
    meta.officer,
    docId,
    docUrl,
    "جاري",
    JSON.stringify(meta.sectionName ? [meta.sectionName] : []),
    now,
    ""
  ]);
}

function rptTechHosp_updateSectionsSubmitted_(masterSS, sessionKey, sectionName) {
  var sh = masterSS.getSheetByName(CONFIG.SHEETS.HOSP_SESSIONS);
  if (!sh) return;
  var lastRow = sh.getLastRow();
  if (lastRow < 2) return;
  var data = sh.getRange(2, 1, lastRow - 1, 9).getValues();
  for (var i = 0; i < data.length; i++) {
    if (String(data[i][0]).trim() === sessionKey) {
      var current = [];
      try { current = JSON.parse(String(data[i][8] || "[]")); } catch (_) {}
      if (current.indexOf(sectionName) === -1) current.push(sectionName);
      sh.getRange(i + 2, 9).setValue(JSON.stringify(current));
      return;
    }
  }
}

function rptTechHosp_finalizeReport(sessionId) {
  auditEngine_logEvent("إنهاء تقرير مستشفى", "النظام", "بدء إنهاء الجلسة: " + sessionId, "نجاح");
  try {
    var masterSS = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    var session  = rptTechHosp_findSession_(masterSS, sessionId);
    if (!session) throw new Error("لم يتم العثور على الجلسة: " + sessionId);

    var row              = session.sessionRow;
    var hospitalName     = String(row[1] || "").trim();
    var visitDate        = row[2] instanceof Date ? row[2] : new Date(row[2]);
    var period           = String(row[3] || "").trim();
    var officer          = String(row[4] || "").trim();
    var docId            = String(row[5] || "").trim();
    var docUrl           = String(row[6] || "").trim();
    var sectionsSubmitted = [];
    try { sectionsSubmitted = JSON.parse(String(row[8] || "[]")); } catch (_) {}

    var meta = { officer: officer, hospital: hospitalName, visitDate: visitDate, period: period };

    // ── Fill missing sections with placeholder ──
    var allSections = ENUMS.HOSP_SECTIONS;
    var missing = [];
    for (var mi = 0; mi < allSections.length; mi++) {
      if (sectionsSubmitted.indexOf(allSections[mi]) === -1) missing.push(allSections[mi]);
    }
    if (missing.length > 0) {
      auditEngine_logEvent("إنهاء تقرير مستشفى", officer, "إضافة أقسام غائبة لتقرير " + hospitalName + ": " + missing.join(", "), "نجاح");
      var doc    = DocumentApp.openById(docId);
      var body   = doc.getBody();
      var tables = body.getTables();
      var RLE    = '\u202B';
      var PDF    = '\u202C';
      if (tables.length > 0) {
        var notesTable = tables[0];
        missing.forEach(function (secName) {
          techHosp_updateOrAppendRow_(notesTable, secName, "لم يتم المرور", false, RLE, PDF);
        });
      }
      doc.saveAndClose();
    }

    // ── PDF ──
    var docFile    = DriveApp.getFileById(docId);
    var arabicDate = fmtV8_dateFileName(visitDate);
    var fileName   = "تقرير مرور فني - " + hospitalName + " - " + arabicDate;
    var pdfBlob    = null;
    try { pdfBlob = govV8_exportPdfWithRetry_(docFile, fileName); } catch (pe) { auditEngine_logError("rptTechHosp_PDF", pe, { fileName: fileName }); }

    // ── Distribute + Archive ──
    iag_distributeShortcuts(docFile, TECH_HOSP_REPORT_TYPE, hospitalName, visitDate, officer);
    folderV8_archiveFile(docFile, fileName, TECH_HOSP_FOLDER_TYPE, visitDate);

    // ── Email ──
    var emailResult = emailV8_sendReportEmail({
      reportType: TECH_HOSP_REPORT_TYPE,
      authorName: officer,
      entityOrId: hospitalName,
      dateStr:    fmtV8_dateArabic(visitDate),
      docUrl:     docUrl,
      pdfBlob:    pdfBlob
    });

    // ── Register in REPORTS_LOG ──
    compV8_registerReport_({
      type:        TECH_HOSP_REPORT_TYPE,
      key:         "TECH-" + hospitalName,
      officer:     officer,
      visitDate:   fmtV8_dateArabic(visitDate),
      fileName:    fileName,
      docUrl:      docUrl,
      emailStatus: emailResult.sent ? "تم" : "خطأ"
    });

    // ── Update session: status = مكتمل ──
    var sh = masterSS.getSheetByName(CONFIG.SHEETS.HOSP_SESSIONS);
    if (sh) {
      sh.getRange(session.rowIndex, 8).setValue("مكتمل");
      sh.getRange(session.rowIndex, 11).setValue(new Date());
    }

    auditEngine_logEvent("إنهاء تقرير مستشفى", officer, "اكتمل التقرير بنجاح للمستشفى: " + hospitalName, "نجاح", docUrl);
    return { ok: true, docUrl: docUrl, sessionId: sessionId };

  } catch (err) {
    auditEngine_logError("rptTechHosp_finalizeReport", err, { session: sessionId });
    throw err;
  }
}

/* ── Single-Section Processing (V0.09) ── */

function techHosp_processSingleSection_(data, meta) {
  var sectionName = meta.sectionName;
  if (!sectionName) return { sections: [], rawData: [] };

  var observations = techHosp_extractSectionData_(data, sectionName);
  if (observations.length === 0) return { sections: [], rawData: [] };

  var finalText = observations.map(function (obs) { return "• " + obs; }).join("\n");

  var isAI = false;
  try { isAI = CONFIG.isAIEnabled() && !!aiV8_getGeminiKey_(); } catch (e) {}
  if (isAI && finalText.length > 5) {
    try {
      var corrected = aiV8_correctText(finalText, { mode: "fix_only", context: "technical" });
      if (corrected && corrected.length > 0) finalText = corrected;
    } catch (ae) { auditEngine_logError("rptTechHosp_AI", ae, {}); }
  }

  var imagesFolder = techHosp_createImagesFolder_(meta);
  var images = "";
  Object.keys(data).forEach(function (key) {
    if (key.indexOf(sectionName) >= 0 && (key.indexOf("صور") >= 0 || key.indexOf("مرفق") >= 0)) {
      var imgVal = String(data[key] || "").trim();
      if (imgVal) images = techHosp_organizeImages_(imgVal, imagesFolder, sectionName);
    }
  });

  return {
    sections: [{ name: sectionName, tableRow: sectionName, text: finalText, images: images }],
    rawData:  [{ section: sectionName, data: { notes: finalText } }]
  };
}

function techHosp_extractSectionData_(data, sectionName) {
  var skip = {};
  skip[TECH_HOSP_COL.officer]     = true;
  skip[TECH_HOSP_COL.hospital]    = true;
  skip[TECH_HOSP_COL.visitDate]   = true;
  skip[TECH_HOSP_COL.period]      = true;
  skip[TECH_HOSP_COL.sectionName] = true;
  skip["Timestamp"]               = true;
  skip["البريد الإلكتروني"]       = true;

  var observations = [];
  Object.keys(data).forEach(function (key) {
    if (skip[key]) return;
    if (key.indexOf(sectionName) < 0) return;
    if (key.indexOf("صور") >= 0 || key.indexOf("مرفق") >= 0) return;
    var val = String(data[key] || "").trim();
    if (val && val !== "-" && val !== "—") observations.push(val);
  });
  return observations;
}

/* ============================================================
   SECTION 4 — Section Processing
   ============================================================ */

function techHosp_processSections_(data, meta) {

  var sections = [];
  var rawDataForRecs = [];
  var isAI = false;
  try { isAI = CONFIG.isAIEnabled() && !!aiV8_getGeminiKey_(); } catch (e) {}

  // Images archive folder
  var imagesFolder = techHosp_createImagesFolder_(meta);

  for (var si = 0; si < TECH_HOSP_SECTIONS.length; si++) {
    var secName = TECH_HOSP_SECTIONS[si];
    var observations = techHosp_extractSectionData_(data, secName);
    if (observations.length === 0) continue;

    var finalText = observations.map(function (obs) { return "• " + obs; }).join("\n");

    // ✅ AI: fix_only — تصحيح إملائي فقط بدون إعادة صياغة
    if (isAI && finalText.length > 5) {
      try {
        var corrected = aiV8_correctText(finalText, { mode: "fix_only", context: "technical" });
        if (corrected && corrected.length > 0) finalText = corrected;
      } catch (ae) { auditEngine_logError("rptTechHosp_AI", ae, {}); }
    }

    // Images
    var images = "";
    Object.keys(data).forEach(function (key) {
      if (key.indexOf(secName) >= 0 && (key.indexOf("صور") >= 0 || key.indexOf("مرفق") >= 0)) {
        var imgVal = String(data[key] || "").trim();
        if (imgVal) images = techHosp_organizeImages_(imgVal, imagesFolder, secName);
      }
    });

    rawDataForRecs.push({ section: secName, data: { notes: finalText } });
    sections.push({ name: secName, tableRow: secName, text: finalText, images: images });
    Utilities.sleep(100);
  }

  auditEngine_logEvent("SYSTEM", "SECTIONS_PROCESSED", "techHosp_processSections_", "", { count: sections.length }, "SUCCESS");
  return { sections: sections, rawData: rawDataForRecs };
}

/* ============================================================
   SECTION 5 — Document Update
   ============================================================ */

function techHosp_updateDoc_(docId, meta, processed, isNew) {
  var doc  = DocumentApp.openById(docId);
  var body = doc.getBody();
  var RLE  = '\u202B';
  var PDF  = '\u202C';

  // Replace header placeholders on new doc
  if (isNew) {
    body.replaceText("\\{\\{ENTITY\\}\\}",  meta.hospital || "غير محدد");
    body.replaceText("\\{\\{DATE\\}\\}",    fmtV8_dateArabic(meta.visitDate));
    body.replaceText("\\{\\{PERIOD\\}\\}",  meta.period   || "");
    body.replaceText("\\{\\{OFFICER\\}\\}", meta.officer  || "");
  }

  var tables = body.getTables();
  if (tables.length < 2) {
    auditEngine_logError("techHosp_updateDoc_", new Error("Less than 2 tables in template"), {});
    doc.saveAndClose();
    return;
  }

  var notesTable = tables[0];
  var imgTable   = tables[1];

  processed.sections.forEach(function (sec) {
    if (sec.text)   techHosp_updateOrAppendRow_(notesTable, sec.tableRow, sec.text,   false, RLE, PDF);
    if (sec.images) techHosp_updateOrAppendRow_(imgTable,   sec.tableRow, sec.images, true,  RLE, PDF);
  });

  // Consolidated recommendations
  var allRawData = techHosp_extractAllSections_(body);
  var recs       = techHosp_generateRecs_(allRawData);
  if (recs.length > 0) techHosp_replaceRecommendations_(body, recs, RLE, PDF);

  doc.saveAndClose();
}

function techHosp_updateOrAppendRow_(table, sectionName, content, isImage, RLE, PDF) {
  var targetCell = null;
  for (var i = 0; i < table.getNumRows(); i++) {
    if (table.getRow(i).getCell(0).getText().trim().includes(sectionName)) {
      targetCell = table.getRow(i).getCell(1);
      break;
    }
  }
  if (!targetCell) {
    var newRow = table.appendTableRow();
    var headerCell = newRow.appendTableCell(sectionName);
    headerCell.getChild(0).asParagraph()
      .setAlignment(DocumentApp.HorizontalAlignment.RIGHT)
      .setBold(true);
    targetCell = newRow.appendTableCell("");
  }

  if (targetCell.getNumChildren() === 0) targetCell.appendParagraph("");
  var p = targetCell.getChild(0).asParagraph();
  p.clear();

  if (isImage) {
    techHosp_insertImages_(targetCell, content);
  } else {
    var cleanContent = String(content).trim().split("\n").map(function (line) {
      return line.trim() ? RLE + line.trim() + PDF : line;
    }).join("\n");
    p.setText(cleanContent);
    p.setAlignment(DocumentApp.HorizontalAlignment.RIGHT);
  }
}

function techHosp_insertImages_(cell, urlsString) {
  if (cell.getNumChildren() === 0) cell.appendParagraph("");
  var p    = cell.getChild(0).asParagraph();
  p.clear();
  var urls = String(urlsString || "").split(/[,\s]+/).map(function (u) { return u.trim(); }).filter(Boolean);
  urls.forEach(function (url) {
    try {
      var match = url.match(/(?:id=|\/d\/)([\w-]+)/);
      if (match && match[1]) {
        var blob = DriveApp.getFileById(match[1]).getBlob();
        var img  = p.appendInlineImage(blob);
        img.setWidth(200).setHeight(150);
      }
    } catch (e) { auditEngine_logError("techHosp_insertImages_", e, { url: url }); }
  });
}

/* ============================================================
   SECTION 6 — Recommendations
   ============================================================ */

function techHosp_extractAllSections_(body) {
  var allRawData = [];
  var tables = body.getTables();
  if (tables.length < 1) return allRawData;
  var notesTable = tables[0];
  for (var i = 1; i < notesTable.getNumRows(); i++) {
    var row         = notesTable.getRow(i);
    var sectionName = row.getCell(0).getText().trim();
    var content     = row.getCell(1).getText().trim();
    if (!sectionName || !content) continue;
    var d = techHosp_parseContent_(content);
    if (d.meds || d.supplies || d.devices || d.workforce || d.notes) {
      allRawData.push({ section: sectionName, data: d });
    }
  }
  return allRawData;
}

function techHosp_parseContent_(content) {
  var d     = { meds: "", supplies: "", devices: "", workforce: "", notes: "" };
  var lower = content.toLowerCase();
  if (lower.includes("أدوية") || lower.includes("دواء") || lower.includes("عقار")) { d.meds = content; }
  else if (lower.includes("مستلزم") || lower.includes("أدوات"))                    { d.supplies = content; }
  else if (lower.includes("جهاز") || lower.includes("معطل") || lower.includes("عطل")) { d.devices = content; }
  else if (lower.includes("موظف") || lower.includes("طبيب") || lower.includes("ممرض") || lower.includes("قوى بشرية")) { d.workforce = content; }
  else                                                                               { d.notes = content; }
  return d;
}

function techHosp_generateRecs_(allRawData) {
  var recs = [];
  allRawData.forEach(function (item) {
    var d = item.data;
    if (d.meds)      recs.push("توفير الأدوية الناقصة بـ " + item.section);
    if (d.supplies)  recs.push("توفير المستلزمات الطبية بـ " + item.section);
    if (d.devices)   recs.push("إصلاح الأجهزة المعطلة بـ " + item.section);
    if (d.workforce) recs.push("معالجة عجز القوى البشرية بـ " + item.section);
    if (d.notes)     recs.push("متابعة الملاحظات المسجلة بـ " + item.section);
  });
  return recs;
}

function techHosp_replaceRecommendations_(body, recs, RLE, PDF) {
  var search = body.findText("التوصيات:");
  var headerElement, startIndex;

  if (search) {
    headerElement = search.getElement().getParent();
    startIndex    = body.getChildIndex(headerElement);
    var i = startIndex + 1;
    while (i < body.getNumChildren()) {
      var child = body.getChild(i);
      if (child.getType() === DocumentApp.ElementType.PARAGRAPH) {
        var para    = child.asParagraph();
        var heading = para.getHeading();
        if (heading !== DocumentApp.ParagraphHeading.NORMAL) break;
        var txt = para.getText().trim();
        if (txt.startsWith("•") || txt === "") {
          if (i === body.getNumChildren() - 1) { para.clear(); i++; }
          else { body.removeChild(child); }
          continue;
        }
      }
      i++;
    }
  } else {
    var h = body.appendParagraph(RLE + "التوصيات:" + PDF);
    h.setHeading(DocumentApp.ParagraphHeading.HEADING2)
     .setAlignment(DocumentApp.HorizontalAlignment.RIGHT)
     .setBold(true);
    headerElement = h;
    startIndex    = body.getChildIndex(h);
  }

  var insertIndex = startIndex + 1;
  recs.forEach(function (r) {
    var p = body.insertParagraph(insertIndex++, RLE + "• " + r + PDF);
    p.setAlignment(DocumentApp.HorizontalAlignment.RIGHT);
  });
}

/* ============================================================
   SECTION 7 — Image Helpers
   ============================================================ */

function techHosp_createImagesFolder_(meta) {
  try {
    var workRoot  = DriveApp.getFolderById(CONFIG.getWorkSharedRootId());
    var imgsRoot  = folderV8_getOrCreate(workRoot, "صور المرور الفني");
    var monthName = meta.visitDate.getFullYear() + "-" + fmtV8_pad2(meta.visitDate.getMonth() + 1);
    var monthF    = folderV8_getOrCreate(imgsRoot, monthName);
    var hospF     = folderV8_getOrCreate(monthF, meta.hospital + " - " + fmtV8_dateFileName(meta.visitDate));
    return hospF;
  } catch (e) {
    auditEngine_logError("techHosp_createImagesFolder_", e, {});
    return null;
  }
}

function techHosp_organizeImages_(urlsString, archiveFolder, sectionName) {
  if (!archiveFolder) return urlsString;
  try {
    var secFolder = folderV8_getOrCreate(archiveFolder, sectionName);
    var urls      = urlsString.split(/[,\s]+/).map(function (u) { return u.trim(); }).filter(Boolean);
    var newUrls   = [];
    urls.forEach(function (url, idx) {
      try {
        var match = url.match(/(?:id=|\/d\/)([\w-]+)/);
        if (match && match[1]) {
          var orig     = DriveApp.getFileById(match[1]);
          var fName    = sectionName + "-" + (idx + 1);
          var oldFiles = secFolder.getFilesByName(fName);
          while (oldFiles.hasNext()) oldFiles.next().setTrashed(true);
          newUrls.push(orig.makeCopy(fName, secFolder).getUrl());
        }
      } catch (e) { newUrls.push(url); }
    });
    return newUrls.join(", ");
  } catch (e) {
    return urlsString;
  }
}

/* ============================================================
   SECTION 8 — Compat: rptTechHospV7_*
   ============================================================ */

function rptTechHospV7_getOrCreateReportMonthFolder_(parentOrId, dateObj) {
  var folder = (typeof parentOrId === "string") ? DriveApp.getFolderById(parentOrId) : parentOrId;
  return folderV8_getMonthFolder(folder, dateObj instanceof Date ? dateObj : new Date(dateObj));
}