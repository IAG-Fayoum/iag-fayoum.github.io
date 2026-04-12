/**
 * 07_Report_Financial.gs  (IAG V8.1)
 * موحّد من: 51_Report_Financial.txt + Report_Financial_Admin_V7_FULL.txt
 *
 * Entry points (compat):
 *   rptFin_onSubmit(e)
 *   rptFinAdmV8_onFormSubmit(e)
 *   rptFinAdmV8_testLastRow()
 */

/* ============================================================
   SECTION 1 — Constants
   ============================================================ */

const FIN_REPORT_TYPE = "المرور المالي والإداري";
const FIN_FOLDER_TYPE = "FIN_ADMIN";
const FIN_RTL_MARK    = '\u202B';
const FIN_PDF_MARK    = '\u202C';

/* ============================================================
   SECTION 2 — Entry Points
   ============================================================ */

/** مربوط بـ CentralTrigger */
function rptFin_onSubmit(e) {
  return rptFinAdmV8_onFormSubmit(e);
}

function rptFinAdmV8_onFormSubmit(e) {
  var data = rptFin_eventToObj_(e);
  return rptFin_create_(data, { user: "FORM_TRIGGER" });
}

function rptFinAdmV8_testLastRow() {
  var sh = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID).getSheetByName(SHEETS.FIN_RESPONSES);
  if (!sh || sh.getLastRow() < 2) throw new Error("FIN_RESPONSES: لا توجد بيانات");
  var headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  var vals    = sh.getRange(sh.getLastRow(), 1, 1, sh.getLastColumn()).getValues()[0];
  var data    = {};
  headers.forEach(function (h, i) { if (h) data[String(h).trim()] = vals[i]; });
  return rptFin_create_(data, { user: "MANUAL_TEST" });
}

/* ============================================================
   SECTION 3 — Core Logic
   ============================================================ */

function rptFin_create_(data, ctx) {
  console.log("🚀 بدء إنشاء المرور المالي...");
  try {
    if (!data || Object.keys(data).length === 0) throw new Error("لا توجد بيانات.");

    // ── 3.1 Extract fields ──
    var officer      = rptFin_pick_(data, ["القائم بالمرور", "اسم المراجع", "المراجع"]) || "";
    var visitDateRaw = rptFin_pick_(data, ["تاريخ المرور", "التاريخ", "تاريخ_المرور"]) || new Date();
    var entityName   = rptFin_determineEntity_(data);
    var visitDate    = fmtV8_dateArabic(visitDateRaw instanceof Date ? visitDateRaw : new Date(visitDateRaw));
    var visitDateObj = visitDateRaw instanceof Date ? visitDateRaw : new Date(visitDateRaw);
    if (isNaN(visitDateObj.getTime())) visitDateObj = new Date();

    // ── 3.2 Report data with AI ──
    var reportData = rptFin_buildReportData_(data);

    // ── 3.3 File name ──
    var fileName = "تقرير مرور مالي - " + entityName + " - " + visitDate;
    var templateId = CONFIG.getTemplateFinAdmin();

    // ── 3.4 Find or create doc in Work folder ──
    var workRoot    = DriveApp.getFolderById(CONFIG.getWorkSharedRootId());
    var typeFolder  = folderV8_getOrCreate(workRoot, FIN_REPORT_TYPE);
    var monthFolder = folderV8_getMonthFolder(typeFolder, visitDateObj);

    var docFile, isNewDoc;
    var existing = monthFolder.getFilesByName(fileName);
    if (existing.hasNext()) {
      docFile  = existing.next();
      isNewDoc = false;
      console.log("🔄 تحديث ملف موجود: " + fileName);
    } else {
      docFile  = DriveApp.getFileById(templateId).makeCopy(fileName, monthFolder);
      docFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.EDIT);
      isNewDoc = true;
      console.log("➕ إنشاء ملف جديد: " + fileName);
    }

    // ── 3.5 Update document ──
    rptFin_updateDoc_(docFile.getId(), { entityName: entityName, visitDate: visitDate, officer: officer }, reportData, isNewDoc);

    // ── 3.6 Distribute + Archive (only if new) ──
    if (isNewDoc) {
      iag_distributeShortcuts(docFile, FIN_REPORT_TYPE, entityName, visitDateObj, officer);
    }
    folderV8_archiveFile(docFile, fileName, FIN_FOLDER_TYPE, visitDateObj);

    // ── 3.7 PDF ──
    var pdfBlob = null;
    try {
      pdfBlob = govV8_exportPdfWithRetry_(docFile, fileName);
    } catch (pe) { console.warn("FinReport PDF:", pe.message); }

    // ── 3.8 Email ──
    var emailResult = emailV8_sendReportEmail({
      reportType: FIN_REPORT_TYPE + (isNewDoc ? "" : " (محدّث)"),
      authorName: officer,
      entityOrId: entityName,
      dateStr:    visitDate,
      docUrl:     docFile.getUrl(),
      pdfBlob:    pdfBlob
    });

    // ── 3.9 Register ──
    compV8_registerReport_({
      type:        FIN_REPORT_TYPE,
      key:         "FIN-" + entityName,
      officer:     officer,
      visitDate:   visitDate,
      fileName:    fileName,
      docUrl:      docFile.getUrl(),
      emailStatus: emailResult.sent ? "تم" : "خطأ"
    });

    console.log("✅ اكتمل المرور المالي:", docFile.getUrl());
    return { ok: true, docUrl: docFile.getUrl(), key: "FIN-" + entityName };

  } catch (err) {
    console.error("❌ rptFin_create_:", err.message);
    govV8_logError("rptFin_create_", err);
    return { ok: false, error: err.message };
  }
}

/* ============================================================
   SECTION 4 — Document Building
   ============================================================ */

function rptFin_updateDoc_(docId, meta, reportData, isNewDoc) {
  var doc  = DocumentApp.openById(docId);
  var body = doc.getBody();

  // Replace header placeholders only on new doc
  if (isNewDoc) {
    var r_ = function(s){ return FIN_RTL_MARK + String(s||"غير محدد") + FIN_PDF_MARK; };
    body.replaceText("\\{\\{entity\\}\\}",  r_(meta.entityName));
    body.replaceText("\\{\\{date\\}\\}",    r_(meta.visitDate));
    body.replaceText("\\{\\{officer\\}\\}", r_(meta.officer));
    body.replaceText("\\{\\{الجهة\\}\\}",  r_(meta.entityName));
    body.replaceText("\\{\\{التاريخ\\}\\}", r_(meta.visitDate));
    body.replaceText("\\{\\{المراجع\\}\\}", r_(meta.officer));
  }

  var tables = body.getTables();
  if (tables.length === 0) {
    console.error("❌ لا يوجد جدول في المستند!");
    doc.saveAndClose();
    return;
  }

  var table = tables[0];
  var dept  = String(reportData.department || "—").trim();

  // Search for existing department row
  var targetRowIdx = -1;
  for (var i = 0; i < table.getNumRows(); i++) {
    var cellText = table.getRow(i).getCell(0).getText().trim();
    if (cellText.includes(dept)) { targetRowIdx = i; break; }
  }

  // Create new row if not found
  if (targetRowIdx === -1) {
    var newRow   = table.appendTableRow();
    var deptCell = newRow.appendTableCell(FIN_RTL_MARK + dept + FIN_PDF_MARK);
    deptCell.setBackgroundColor("#F0F0F0");
    var deptPara = deptCell.getChild(0).asParagraph();
    deptPara.setAlignment(DocumentApp.HorizontalAlignment.RIGHT);
    deptPara.setBold(true);
    newRow.appendTableCell("");
    newRow.appendTableCell("");
    newRow.appendTableCell("");
    targetRowIdx = table.getNumRows() - 1;
    console.log("➕ قسم جديد: " + dept);
  } else {
    console.log("🔄 تحديث قسم: " + dept);
  }

  var targetRow = table.getRow(targetRowIdx);

  var fillCell = function (cell, text) {
    if (cell.getNumChildren() === 0) cell.appendParagraph("");
    var para  = cell.getChild(0).asParagraph();
    para.clear();
    var clean = String(text || "—").trim();
    // Apply RTL markers per line
    clean = clean.split("\n").map(function (line) {
      return line.trim() ? FIN_RTL_MARK + line.trim() + FIN_PDF_MARK : line;
    }).join("\n");
    para.setText(clean);
    para.setAlignment(DocumentApp.HorizontalAlignment.RIGHT);
  };

  fillCell(targetRow.getCell(1), reportData.violations);
  fillCell(targetRow.getCell(2), reportData.corrective);
  fillCell(targetRow.getCell(3), reportData.responsible);

  doc.saveAndClose();
  console.log("✅ تم تحديث المستند");
}

/* ============================================================
   SECTION 5 — Data Extraction
   ============================================================ */

function rptFin_buildReportData_(data) {
  var isAI = false;
  try { isAI = CONFIG.isAIEnabled() && !!aiV8_getGeminiKey_(); } catch (e) {}

  var correct = function (text, context) {
    var v = String(text || "—").trim();
    if (!isAI || v === "—" || v.length < 5) return v;
    return aiV8_correctText(v, { mode: "rewrite_light", context: context || "financial" });
  };

  return {
    department:  String(rptFin_pick_(data, ["القسم", "department"])                         || "—").trim(),
    violations:  correct(rptFin_pick_(data, ["المخالفات", "violations"]),                   "financial"),
    corrective:  correct(rptFin_pick_(data, ["التوصيات", "corrective", "الإجراءات"]),       "financial"),
    responsible: correct(rptFin_pick_(data, ["مسئول التنفيذ - المهلة الزمنية", "مسئول التنفيذ", "responsible"]), "financial")
  };
}

function rptFin_determineEntity_(data) {
  var type = rptFin_pick_(data, ["نوع الجهة"]) || "";
  if (String(type).trim() === "مستشفى") {
    var hosp = rptFin_pick_(data, ["اختر المستشفى"]);
    if (hosp && hosp !== "—") return String(hosp).trim();
  }

  var unitKeys = [
    "اختر الوحدة الصحية / المركز الطبي / العيادة في بندر الفيوم",
    "اختر الوحدة الصحية / المركز الطبي / العيادة في مركز الفيوم",
    "الادارة الصحية",
    "اسم الجهة",
    "اسم الوحدة"
  ];
  var v = rptFin_pick_(data, unitKeys);
  if (v && v !== "—") return String(v).trim();

  return rptFin_pick_(data, ["الجهة", "Entity", "Facility"]) || "جهة غير محددة";
}

/* ============================================================
   SECTION 6 — Helpers
   ============================================================ */

function rptFin_eventToObj_(e) {
  var obj = {};
  if (!e) return obj;
  if (e.namedValues) {
    Object.keys(e.namedValues).forEach(function (k) {
      obj[k] = Array.isArray(e.namedValues[k]) ? e.namedValues[k][0] : e.namedValues[k];
    });
  } else if (e.range) {
    var sh      = e.range.getSheet();
    var headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
    var vals    = e.values || sh.getRange(e.range.getRow(), 1, 1, sh.getLastColumn()).getValues()[0];
    headers.forEach(function (h, i) { if (h) obj[String(h).trim()] = vals[i]; });
  }
  return obj;
}

function rptFin_pick_(data, keys) {
  for (var i = 0; i < keys.length; i++) {
    var v = data[keys[i]];
    if (v === null || v === undefined || v === "") continue;
    if (Array.isArray(v)) { var a = v[0]; return (a !== null && a !== undefined && a !== "") ? String(a) : null; }
    var s = String(v).trim();
    if (s && s !== "—") return s;
  }
  return null;
}