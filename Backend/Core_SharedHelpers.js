/**
 * 02_SharedHelpers.gs  (IAG V8.1.4)
 * موحّد من: 01_Schema + 02_Governance + 07_RecordIdEngine
 *           11_Assignment + 12_PendingEngine + 20_SLA
 *           31_WorkflowLinks + 80_Patches
 *
 * التغييرات في V8.1.4:
 *   - أضيف PARENT_NUM + PARENT_YEAR في SCHEMA_ALIASES.INOUT
 *   - تصحيح assignV8_pickAssignee: الروته يعدّ الأصول فقط (PARENT_ID فاضي)
 *
 * Prefixes:
 *   schemaV8_  govV8_  fmtV8_  folderV8_
 *   slaV8_  assignV8_  pendingV8_  workflowV8_  driveV8_
 */

/* ============================================================
   SECTION 1 — Schema  (schemaV8_)
   ============================================================ */

function schemaV8_buildHeaderMap(sheet) {
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var map = {};
  headers.forEach(function (h, idx) {
    var key = String(h || "").trim();
    if (key) map[key] = idx;
  });
  return map;
}

function schemaV8_pick(rowArr, headerMap, aliasList) {
  for (var i = 0; i < aliasList.length; i++) {
    var name = aliasList[i];
    if (headerMap[name] !== undefined) {
      var v = rowArr[headerMap[name]];
      if (v !== null && v !== "" && v !== undefined) return v;
    }
  }
  return null;
}

function schemaV8_normalizeDocType(raw) {
  var v = String(raw || "").trim().toLowerCase();
  if (!v) return "INBOUND";
  if (v.includes("صادر") || v.includes("outbound") || v === "out") return "OUTBOUND";
  return "INBOUND";
}

const SCHEMA_ALIASES = {
  INOUT: {
    DOC_TYPE:       ["نوع المستند", "نوع_المستند"],
    INBOUND_NO:     ["رقم القيد بدفتر الوارد", "رقم القيد", "رقم_القيد"],
    INBOUND_DATE:   ["تاريخ الوارد", "التاريخ", "تاريخ"],
    INBOUND_FROM:   ["الجهة (الوارد) منها", "الجهة (الوارد) منها "],
    SUBJECT_IN:     ["موضوع الوارد", "الموضوع", "موضوع"],
    CASE_NO:        ["رقم القضية", "رقم_القضية"],
    CASE_YEAR:      ["سنة القضية", "سنة_القضية"],
    TX_TYPE:        ["نوع المعاملة", "نوع_المعاملة"],
    IMPORTANCE:     ["الأهمية"],
    URGENCY:        ["الاستعجال"],
    IN_ATTACH:      ["مرفقات الوارد", "مرفقات"],
    IN_NOTES:       ["ملاحظات الوارد", "ملاحظات"],
    OUTBOUND_NO:    ["رقم القيد بدفتر الصادر", "رقم الصادر"],
    LINKED_IN_NO:   ["رقم قيد الوارد المرتبط به", "رقم الوارد المرتبط"],
    OUT_DATE:       ["تاريخ الصادر", "تاريخ"],
    OUT_TO:         ["الجهة (الصادر) لها"],
    SUBJECT_OUT:    ["موضوع الصادر"],
    OUT_ATTACH:     ["مرفقات الصادر", "مرفقات"],
    OUT_NOTES:      ["ملاحظات الصادر", "ملاحظات"],
    ENTITY_EXEC:    ["الجهة محل التنفيذ", "الجهة_محل_التنفيذ"],
    FINISHED_FLAG:  ["هل تم إنتهاء الموضوع", "هل تم إنهاء الموضوع"],
    PARENT_NUM:     ["رقم الوارد للمعاملة الأصلية"],   // ✅ جديد
    PARENT_YEAR:    ["سنة الوارد للمعاملة الأصلية"]    // ✅ جديد
  }
};

function schema_buildHeaderMap_(sheet)             { return schemaV8_buildHeaderMap(sheet); }
function schema_pick_(rowArr, headerMap, aliasList){ return schemaV8_pick(rowArr, headerMap, aliasList); }
function schema_normalizeDocType_(raw)             { return schemaV8_normalizeDocType(raw); }

function schema_requireHeaders_(headerMap, required, context) {
  var missing = required.filter(function (h) { return headerMap[h] === undefined; });
  if (missing.length) throw new Error("SchemaError: Missing headers in " + context + ": " + missing.join(", "));
}

/* ============================================================
   SECTION 2 — Governance  (govV8_)
   ============================================================ */

function govV8_withLock(fn, timeoutMs) {
  var lock = LockService.getScriptLock();
  lock.waitLock(timeoutMs || 30000);
  try {
    return fn();
  } finally {
    lock.releaseLock();
  }
}

function govV8_isDuplicate(eventKey) {
  if (!eventKey) return false;
  var cache = CacheService.getScriptCache();
  if (cache.get("EVT:" + eventKey)) return true;
  var props = PropertiesService.getScriptProperties();
  var propKey = "EVT:" + eventKey;
  if (props.getProperty(propKey)) return true;
  cache.put("EVT:" + eventKey, "1", 6 * 60 * 60);
  props.setProperty(propKey, new Date().toISOString());
  return false;
}

function gov_getUser_() {
  try {
    return Session.getActiveUser().getEmail() ||
           Session.getEffectiveUser().getEmail() || "UNKNOWN";
  } catch (e) {
    return "UNKNOWN";
  }
}
// Audit and logging merged to 15_AuditEngine.js


function govV8_notify(type, message, ref) {
  try {
    var ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    var sh = ss.getSheetByName(SHEETS.NOTIFICATIONS);
    if (!sh) {
      sh = ss.insertSheet(SHEETS.NOTIFICATIONS);
      sh.appendRow(["notification_id", "employee_name", "task_id", "notification_type", "timestamp", "read", "task_data"]);
    }
    sh.appendRow([
      Utilities.getUuid(),
      gov_getUser_(),
      ref || "",
      type || "",
      new Date(),
      false,
      message || ""
    ]);
  } catch (e) {
    auditEngine_logError("govV8_notify", e, {});
  }
}

function govV8_run(contextName, options, fn) {
  return govV8_withLock(function () {
    var eventKey = options && options.eventKey ? options.eventKey : "";
    if (eventKey && govV8_isDuplicate(eventKey)) {
      return { ok: true, skipped: true, reason: "duplicate" };
    }
    try {
      var res = fn();
      if (cfg_isEnabled("USE_GOVERNANCE") && options && options.actionType) {
        auditEngine_logEvent(typeof Session !== "undefined" ? (Session.getActiveUser().getEmail() || "SYSTEM") : "SYSTEM", options.actionType, options.details || contextName, "", "", "SUCCESS");
      }
      return { ok: true, result: res };
    } catch (err) {
      try { auditEngine_logError(contextName, err && err.message ? err.message : String(err), err && err.stack ? err.stack : ""); } catch (e) {}
      if (cfg_isEnabled("USE_GOVERNANCE")) {
        try { auditEngine_logEvent(typeof Session !== "undefined" ? (Session.getActiveUser().getEmail() || "SYSTEM") : "SYSTEM", "ERROR", contextName, "", (err && err.message, "SUCCESS") ? err.message : String(err)); } catch (e) {}
      }
      throw err;
    }
  });
}

// gov_audit_ and gov_logError_ moved to 15_AuditEngine.js

function engine_notifySafe_(type, message, ref) { govV8_notify(type, message, ref); }
function gov_notify_(type, message, recordRef) { govV8_notify(type, message, recordRef); }
function gov_withLock_(fn, timeoutMs) { return govV8_withLock(fn, timeoutMs); }
function gov_isDuplicateEvent_(eventKey) { return govV8_isDuplicate(eventKey); }
function gov_run_(contextName, options, fn) { return govV8_run(contextName, options, fn); }

/* ============================================================
   SECTION 3 — Format / IDs  (fmtV8_)
   ============================================================ */

const FMT_ARABIC_MONTHS = ["يناير","فبراير","مارس","أبريل","مايو","يونيو",
                            "يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"];

function fmtV8_monthFolderName_(d) {
  var dt = (d instanceof Date) ? d : new Date(d || new Date());
  return fmtV8_pad2(dt.getMonth() + 1) + " - " + FMT_ARABIC_MONTHS[dt.getMonth()];
}

function fmtV8_reportFolderName_(entityName, prefix, d) {
  var dateStr = fmtV8_dateArabic(d || new Date());
  return prefix + " - " + String(entityName || "").trim() + " - " + dateStr;
}

function fmtV8_pad2(n) {
  n = Number(n) || 0;
  return (n < 10 ? "0" : "") + String(n);
}

function fmtV8_dateArabic(d) {
  if (!d) return "غير محدد";
  try {
    var dt = (d instanceof Date) ? d : new Date(d);
    if (isNaN(dt.getTime())) return "غير محدد";
    return dt.getDate() + " " + FMT_ARABIC_MONTHS[dt.getMonth()] + " " + dt.getFullYear();
  } catch (e) { return "غير محدد"; }
}

function fmtV8_dateFileName(d) {
  if (!d) return "";
  try {
    var dt = (d instanceof Date) ? d : new Date(d);
    if (isNaN(dt.getTime())) return "";
    return String(dt.getDate()).padStart(2, "0") + "-" + FMT_ARABIC_MONTHS[dt.getMonth()] + "-" + dt.getFullYear();
  } catch (e) { return ""; }
}

function fmtV8_compositeId(number, dateOrYear) {
  var year;
  if (dateOrYear instanceof Date) {
    year = dateOrYear.getFullYear();
  } else if (typeof dateOrYear === "number" && dateOrYear > 1000) {
    year = dateOrYear;
  } else {
    year = (dateOrYear instanceof Date) ? dateOrYear.getFullYear() : new Date(dateOrYear).getFullYear();
    if (isNaN(year)) year = new Date().getFullYear();
  }
  return "IN-" + String(number).trim() + "-" + year;
}

function record_generateId_(docTypeRaw, number, dateObj) {
  var year = (dateObj instanceof Date) ? dateObj.getFullYear() : new Date(dateObj).getFullYear();
  var prefix = schemaV8_normalizeDocType(docTypeRaw) === "OUTBOUND" ? "OUT" : "IN";
  return prefix + "-" + String(number).trim() + "-" + year;
}

/* ============================================================
   SECTION 4 — SLA  (slaV8_)
   ============================================================ */

function slaV8_isWorkDay(d) {
  var day = d.getDay();
  return day !== 5 && day !== 6;
}

function slaV8_addWorkdays(startDate, workdays) {
  var d = new Date(startDate);
  var added = 0;
  while (added < workdays) {
    d.setDate(d.getDate() + 1);
    if (slaV8_isWorkDay(d)) added++;
  }
  return d;
}

function slaV8_workdaysBetween(fromDate, toDate) {
  var a = new Date(fromDate); a.setHours(0,0,0,0);
  var b = new Date(toDate);   b.setHours(0,0,0,0);
  var days = 0;
  var step = a <= b ? 1 : -1;
  while ((step === 1 && a < b) || (step === -1 && a > b)) {
    a.setDate(a.getDate() + step);
    if (slaV8_isWorkDay(a)) days += step;
  }
  return days;
}

function sla_isWeekend_(d)               { return !slaV8_isWorkDay(d); }
function sla_addWorkdays_(start, days)   { return slaV8_addWorkdays(start, days); }
function sla_workdaysBetween_(a, b)      { return slaV8_workdaysBetween(a, b); }

/* ============================================================
   SECTION 5 — Folder Management  (folderV8_)
   ============================================================ */

function folderV8_getOrCreate(parent, name) {
  var n = String(name || "").trim();
  if (!n) return parent;
  var it = parent.getFoldersByName(n);
  return it.hasNext() ? it.next() : parent.createFolder(n);
}

function folderV8_getMonthFolder(parentFolder, date) {
  var d = (date instanceof Date) ? date : new Date(date || new Date());
  var name = d.getFullYear() + "-" + fmtV8_pad2(d.getMonth() + 1);
  return folderV8_getOrCreate(parentFolder, name);
}

function folderV8_distributeToEmployee(file, fileName, officerStr, date, reportType) {
  try {
    var rootId = CONFIG.getWorkSharedRootId();
    var root = DriveApp.getFolderById(rootId);
    var d = (date instanceof Date) ? date : new Date(date || new Date());
    var year  = String(d.getFullYear());
    var month = fmtV8_monthFolderName_(d);

    String(officerStr || "").split(/[،,]+/).map(function (s) { return s.trim(); })
      .filter(Boolean)
      .forEach(function (officer) {
        try {
          var empF  = folderV8_getOrCreate(root, officer);
          var typeF = folderV8_getOrCreate(empF, reportType);
          var yearF = folderV8_getOrCreate(typeF, year);
          var monF  = folderV8_getOrCreate(yearF, month);
          var old = monF.getFilesByName(fileName);
          while (old.hasNext()) old.next().setTrashed(true);
          file.makeCopy(fileName, monF);
        } catch (e) {
          auditEngine_logError("folderV8_distributeToEmployee", e, { officer: officer });
        }
      });
  } catch (e) {
    auditEngine_logError("folderV8_distributeToEmployee", e, {});
  }
}

/**
 * توزيع Shortcut على فولدرات الموظفين المسجلين في EMPLOYEES فقط
 * ⚠️ يتطلب تفعيل: Extensions → Services → Drive API
 */
function folderV8_distributeShortcuts_(file, fileName, officerStr, date, reportType) {
  try {
    var rootId = CONFIG.getWorkSharedRootId();
    var root   = DriveApp.getFolderById(rootId);
    var d      = (date instanceof Date) ? date : new Date(date || new Date());
    var year   = String(d.getFullYear());
    var month  = fmtV8_monthFolderName_(d);

    var ss    = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    var empSh = ss.getSheetByName(SHEETS.EMPLOYEES);
    var registeredNames = {};
    if (empSh && empSh.getLastRow() >= 2) {
      var empMap  = schemaV8_buildHeaderMap(empSh);
      var empData = empSh.getRange(2, 1, empSh.getLastRow()-1, empSh.getLastColumn()).getValues();
      var ni = empMap["الاسم"], ai = empMap["نشط"];
      if (ni !== undefined && ai !== undefined) {
        empData.forEach(function(r) {
          var active = r[ai];
          if (active === true || String(active).toLowerCase() === "true") {
            var n = String(r[ni] || "").trim();
            if (n) registeredNames[n] = true;
          }
        });
      }
    }

    var names = String(officerStr || "")
      .split(/[،,]+|\s+و\s+/)
      .map(function(s) { return s.trim(); })
      .filter(function(s) { return s && registeredNames[s]; });

    var fileId = file.getId();

    names.forEach(function(officer) {
      try {
        var empF  = folderV8_getOrCreate(root, officer);
        var typeF = folderV8_getOrCreate(empF, reportType);
        var yearF = folderV8_getOrCreate(typeF, year);
        var monF  = folderV8_getOrCreate(yearF, month);

        var old = monF.getFilesByName(fileName);
        while (old.hasNext()) old.next().setTrashed(true);

        Drive.Files.create({
          name: fileName,
          mimeType: "application/vnd.google-apps.shortcut",
          shortcutDetails: { targetId: fileId },
          parents: [monF.getId()]
        });
      } catch (e) {
        auditEngine_logError("folderV8_distributeShortcuts_", e, { officer: officer });
      }
    });
  } catch (e) {
    auditEngine_logError("folderV8_distributeShortcuts_", e && e.message ? e.message : String(e), e && e.stack ? e.stack : "");
  }
}

function folderV8_archiveFile(file, fileName, reportType, date) {
  try {
    var archId = CONFIG.getArchivePrivateRootId();
    var arch   = DriveApp.getFolderById(archId);
    var d      = (date instanceof Date) ? date : new Date(date || new Date());
    var year   = String(d.getFullYear());
    var month  = fmtV8_monthFolderName_(d);

    var reportsF = folderV8_getOrCreate(arch, "REPORTS");
    var typeF    = folderV8_getOrCreate(reportsF, reportType);
    var yearF    = folderV8_getOrCreate(typeF, year);
    var monthF   = folderV8_getOrCreate(yearF, month);

    var old = monthF.getFilesByName(fileName);
    while (old.hasNext()) old.next().setTrashed(true);

    file.makeCopy(fileName, monthF);

    var attachFolder = folderV8_getOrCreate(monthF, "مرفقات " + fileName);
    return attachFolder;

  } catch (e) {
    auditEngine_logError("folderV8_archiveFile", e && e.message ? e.message : String(e), e && e.stack ? e.stack : "");
    return null;
  }
}

function folderV8_archiveAttachments_(attachFolder, fileIds, prefix) {
  if (!attachFolder || !fileIds || !fileIds.length) return;
  for (var i = 0; i < fileIds.length; i++) {
    try {
      var f = DriveApp.getFileById(fileIds[i]);
      var name = (prefix ? prefix + " - " : "") + f.getName();
      f.makeCopy(name, attachFolder);
    } catch (e) {
      auditEngine_logError("folderV8_archiveAttachments_", e, { fileId: fileIds[i] });
    }
  }
}

function workflowV8_prepareInboundFolders(inboundId, dt, docDirection) {
  var roots = folderV8_getRootIds_();
  if (!roots.arch) throw new Error("Missing ARCHIVE_PRIVATE_ID");

  var d = (dt instanceof Date) ? dt : new Date(dt);
  if (isNaN(d.getTime())) throw new Error("Invalid date for folder build");

  var year  = String(d.getFullYear());
  var month = fmtV8_monthFolderName_(d);
  var dir   = (docDirection === "OUT") ? "OUT" : "IN";

  var archFolder = folderV8_ensurePath_(roots.arch, ["INOUT", dir, year, month]);

  return {
    archiveFolderUrl: archFolder.getUrl(),
    archiveFolderId:  archFolder.getId(),
    workFolderUrl:    "",
    workFolderId:     ""
  };
}

function workflowV8_ensureLinks(masterSh, masterMap, rowIndex) {
  var row = masterSh.getRange(rowIndex, 1, 1, masterSh.getLastColumn()).getValues()[0];
  var idxId   = masterMap["رقم_القيد"];
  var idxDate = masterMap["التاريخ"];
  var idxWork = masterMap["رابط_المرفقات"];
  var idxArch = masterMap["رابط_الأرشيف"];

  if (idxId === undefined || idxDate === undefined) return null;

  var inboundId = String(row[idxId] || "").trim();
  var dtRaw = row[idxDate];
  var dt = (dtRaw instanceof Date) ? dtRaw : new Date(dtRaw);
  if (!inboundId || isNaN(dt.getTime())) return null;

  var hasWork = idxWork !== undefined && String(row[idxWork] || "").trim();
  var hasArch = idxArch !== undefined && String(row[idxArch] || "").trim();
  if (hasWork && hasArch) return { inboundId: inboundId, work: row[idxWork], archive: row[idxArch] };

  var folders = workflowV8_prepareInboundFolders(inboundId, dt);
  var updates = {};
  if (idxWork !== undefined && !hasWork) updates["رابط_المرفقات"] = folders.workFolderUrl;
  if (idxArch !== undefined && !hasArch) updates["رابط_الأرشيف"] = folders.archiveFolderUrl;
  if (masterMap["آخر_تعديل_بواسطة"] !== undefined) updates["آخر_تعديل_بواسطة"] = gov_getUser_();
  if (masterMap["تاريخ_آخر_تعديل"]  !== undefined) updates["تاريخ_آخر_تعديل"]  = new Date();

  var newRow = row.slice();
  Object.keys(updates).forEach(function (h) {
    var idx = masterMap[h];
    if (idx !== undefined) newRow[idx] = updates[h];
  });
  masterSh.getRange(rowIndex, 1, 1, masterSh.getLastColumn()).setValues([newRow]);

  try { auditEngine_logEvent(typeof Session !== "undefined" ? (Session.getActiveUser().getEmail() || "SYSTEM") : "SYSTEM", "FOLDERS_LINKS", "Ensure links for " + inboundId + " row=" + rowIndex, "", { workFolderUrl: folders.workFolderUrl, archiveFolderUrl: folders.archiveFolderUrl }, "SUCCESS"); } catch (e) {}

  return { inboundId: inboundId, work: folders.workFolderUrl, archive: folders.archiveFolderUrl };
}

function workflow_ensureLinksForInbound_(masterSh, masterMap, rowIndex) {
  return workflowV8_ensureLinks(masterSh, masterMap, rowIndex);
}

function folderV8_getRootIds_() {
  var work = "", arch = "";
  try {
    if (typeof CONFIG !== "undefined" && CONFIG) {
      if (typeof CONFIG.getWorkSharedRootId === "function")     work = String(CONFIG.getWorkSharedRootId()    || "").trim();
      if (typeof CONFIG.getArchivePrivateRootId === "function") arch = String(CONFIG.getArchivePrivateRootId() || "").trim();
    }
  } catch (e) {}
  if (!work || !arch) {
    var sp = PropertiesService.getScriptProperties();
    if (!work) work = sp.getProperty("WORK_SHARED_ID")    || "";
    if (!arch) arch = sp.getProperty("ARCHIVE_PRIVATE_ID") || "";
  }
  return { work: work, arch: arch };
}

function folderV8_ensurePath_(rootId, parts) {
  var folder = DriveApp.getFolderById(rootId);
  parts.forEach(function (p) {
    var name = String(p || "").trim();
    if (!name) return;
    var it = folder.getFoldersByName(name);
    folder = it.hasNext() ? it.next() : folder.createFolder(name);
  });
  return folder;
}

var compFolderMgr_ = {
  getOrCreateMonthFolder: function (parentFolder, date) {
    return folderV8_getMonthFolder(parentFolder, date);
  },
  distributeToEmployeeFolders: function (file, fileName, officerStr, date, reportType) {
    folderV8_distributeToEmployee(file, fileName, officerStr, date, reportType);
  },
  _getOrCreate: function (parent, name) {
    return folderV8_getOrCreate(parent, name);
  }
};

function compV8_getCfg_(key) {
  try { return CONFIG.get(key, "") || ""; } catch (e) { return ""; }
}

function compV8_registerReport_(p) {
  try {
    var sh = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID).getSheetByName(SHEETS.REPORTS_LOG);
    if (!sh) return;
    var map = {};
    sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].forEach(function (h, i) {
      if (h) map[String(h).trim()] = i;
    });
    var row = new Array(sh.getLastColumn()).fill("");
    var s = function (names, v) {
      for (var ni = 0; ni < names.length; ni++) {
        if (map[names[ni]] !== undefined) { row[map[names[ni]]] = v; return; }
      }
    };
    s(["التاريخ_والوقت","التوقيت","Timestamp"], new Date());
    s(["نوع_التقرير"],                           p.type     || "");
    s(["رقم_القيد_أو_الجهة","المفتاح"],          p.key      || "");
    s(["القائم_بالمرور","القائم_بالفحص"],        p.officer  || "");
    s(["تاريخ_المرور","تاريخ_الفحص"],            p.visitDate|| "");
    s(["اسم_الملف"],                             p.fileName || "");
    s(["رابط_Google_Doc"],                       p.docUrl   || "");
    s(["رابط_PDF_Drive"],  p.pdfUrl || "");
    s(["حالة_الإرسال"],                          p.emailStatus || "تم");
    s(["المخاطب"],                               p.addressee   || "");
    sh.appendRow(row);
  } catch (e) {
    auditEngine_logError("compV8_registerReport_", e, {});
  }
}

/* ============================================================
   SECTION 5b — PDF Export Helper
   ============================================================ */

function govV8_exportPdfWithRetry_(driveFile, fileName, tries) {
  tries = tries || 3;
  for (var attempt = 1; attempt <= tries; attempt++) {
    try {
      if (attempt > 1) Utilities.sleep(800 * attempt);
      var blob = driveFile.getAs("application/pdf");
      blob.setName(String(fileName || "report") + ".pdf");
      return blob;
    } catch (e) {
      if (attempt === tries) {
        try { auditEngine_logError("govV8_exportPdfWithRetry_", e && e.message ? e.message : String(e), e && e.stack ? e.stack : ""); } catch (_) {}
        return null;
      }
    }
  }
  return null;
}

/* ============================================================
   SECTION 6 — Assignment  (assignV8_)
   ============================================================ */

function assignV8_pickAssignee(sourceEntity, taskDate) {
  var ROUND_ROBIN_START = new Date("2026-01-01");
  var ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);

  var rulesSh  = ss.getSheetByName(SHEETS.DISTRIBUTION_RULES);
  var empSh    = ss.getSheetByName(SHEETS.EMPLOYEES);
  var masterSh = ss.getSheetByName(SHEETS.INOUT_MASTER);

  if (!rulesSh)  throw new Error("Missing: " + SHEETS.DISTRIBUTION_RULES);
  if (!empSh)    throw new Error("Missing: " + SHEETS.EMPLOYEES);
  if (!masterSh) throw new Error("Missing: " + SHEETS.INOUT_MASTER);

  var rulesMap  = schemaV8_buildHeaderMap(rulesSh);
  var empMap    = schemaV8_buildHeaderMap(empSh);
  var masterMap = schemaV8_buildHeaderMap(masterSh);

  var lastEmpRow = empSh.getLastRow();
  if (lastEmpRow < 2) return null;

  var allEmps = empSh.getRange(2, 1, lastEmpRow - 1, empSh.getLastColumn()).getValues()
    .map(function (r) {
      return {
        name:   String(r[empMap["الاسم"]]          || "").trim(),
        email:  String(r[empMap["الايميل"]]         || "").trim(),
        role:   String(r[empMap["المسمى الوظيفي"]] || "").trim(),
        active: r[empMap["نشط"]]
      };
    })
    .filter(function (e) {
      return (e.active === true || String(e.active).toLowerCase() === "true") && e.name && e.email;
    });

  if (!allEmps.length) return null;

  var lastRuleRow = rulesSh.getLastRow();
  var rule = null, ruleRowIndex = -1;

  if (lastRuleRow >= 2) {
    var rulesData = rulesSh.getRange(2, 1, lastRuleRow - 1, rulesSh.getLastColumn()).getValues();
    var src = String(sourceEntity || "").trim();
    if (src) {
      for (var ri = 0; ri < rulesData.length; ri++) {
        var taskType = String(rulesData[ri][rulesMap["نوع_المهمة"]] || "").trim();
        if (taskType && (taskType === src || src.includes(taskType) || taskType.includes(src))) {
          rule = rulesData[ri];
          ruleRowIndex = ri + 2;
          break;
        }
      }
    }
  }

  var idxMethod       = rulesMap["طريقة_التوزيع"];
  var idxFixedMembers = rulesMap["أعضاء_ثابتين_للمهمة"];
  var idxLastAssigned = rulesMap["آخر_موظف_تم_التكليف"];
  var idxLastDate     = rulesMap["آخر_تاريخ_توزيع"];
  var idxSpecialty    = rulesMap["التخصص_المطلوب"];

  if (rule && idxMethod !== undefined) {
    var method       = String(rule[idxMethod] || "").trim();
    var fixedMembers = idxFixedMembers !== undefined ? String(rule[idxFixedMembers] || "").trim() : "";

    if (method === "ثابت" && fixedMembers) {
      var memberNames   = fixedMembers.split(/[،,]/).map(function (s) { return s.trim(); }).filter(Boolean);
      var eligibleFixed = memberNames.map(function (n) {
        return allEmps.find(function (e) { return e.name === n; }) || { name: n, email: "" };
      }).filter(Boolean);

      if (!eligibleFixed.length) return null;
      var allNames = eligibleFixed.map(function(e){ return e.name; }).join("،");
      assignV8_updateRuleRow_(rulesSh, ruleRowIndex, idxLastAssigned, idxLastDate, allNames);
      return eligibleFixed.length === 1 ? eligibleFixed[0] : eligibleFixed;
    }
  }

  var ruleSpec = (rule && idxSpecialty !== undefined) ? String(rule[idxSpecialty] || "").trim() : "مراجع مالي وإداري";
  var pool = ruleSpec ? allEmps.filter(function (e) { return e.role === ruleSpec; }) : allEmps;
  if (!pool.length) return null;

  var loads = {};
  pool.forEach(function (e) { loads[e.name] = 0; });

  var idxAssignee = masterMap["الموظف_المكلف"];
  var idxDate     = masterMap["التاريخ"];
  var idxFrom     = masterMap["الجهة (الوارد) منها"];
  var masterLast  = masterSh.getLastRow();

  if (masterLast >= 2 && idxAssignee !== undefined && idxDate !== undefined && idxFrom !== undefined) {
    var masterData = masterSh.getRange(2, 1, masterLast - 1, masterSh.getLastColumn()).getValues();
    var srcE = String(sourceEntity || "").trim();
    for (var mi = 0; mi < masterData.length; mi++) {
      var mr = masterData[mi];
      var d0 = mr[idxDate];
      var d  = (d0 instanceof Date) ? d0 : new Date(d0);
      if (isNaN(d.getTime()) || d < ROUND_ROBIN_START) continue;
      var from = String(mr[idxFrom] || "").trim();
      if (srcE && from !== srcE) continue;
      var ass = String(mr[idxAssignee] || "").trim();
      // ✅ يعدّ في الروته الأصول فقط — المعاملات المستقلة (PARENT_ID فاضي)
      var miParentId = masterMap["PARENT_ID"] !== undefined
        ? String(mr[masterMap["PARENT_ID"]] || "").trim()
        : "";
      if (ass && loads[ass] !== undefined && !miParentId) loads[ass]++;
    }
  }

  var best = pool[0], bestLoad = loads[best.name] !== undefined ? loads[best.name] : 999999;
  for (var pi = 0; pi < pool.length; pi++) {
    var l = loads[pool[pi].name] !== undefined ? loads[pool[pi].name] : 0;
    if (l < bestLoad) { best = pool[pi]; bestLoad = l; }
  }

  assignV8_updateRuleRow_(rulesSh, ruleRowIndex, idxLastAssigned, idxLastDate, best.name);
  return best;
}

function assignV8_updateRuleRow_(sh, rowIndex, idxName, idxDate, name) {
  try {
    if (rowIndex < 2) return;
    if (idxName !== undefined) sh.getRange(rowIndex, idxName + 1).setValue(name);
    if (idxDate !== undefined) sh.getRange(rowIndex, idxDate + 1).setValue(new Date());
  } catch (e) {}
}

function assignment_pickAssigneeForInbound_(sourceEntity, taskDate) {
  return assignV8_pickAssignee(sourceEntity, taskDate);
}

/* ============================================================
   SECTION 7 — Pending Links  (pendingV8_)
   ============================================================ */

function pendingV8_sheet_() {
  var ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  var sh = ss.getSheetByName(SHEETS.PENDING_LINKS);
  if (!sh) {
    sh = ss.insertSheet(SHEETS.PENDING_LINKS);
    sh.appendRow(["التوقيت","النوع","inboundId","sourceRow","desiredStatus","status","تفاصيل"]);
  }
  return sh;
}

function pendingV8_add(type, inboundId, sourceRow, desiredStatus, details) {
  var sh = pendingV8_sheet_();
  sh.appendRow([new Date(), type, inboundId, sourceRow || "", desiredStatus || "", "PENDING", details || ""]);
  return { pendingRow: sh.getLastRow() };
}

function pendingV8_resolveAll() {
  return govV8_run("pendingV8_resolveAll", { actionType: "PENDING_RESOLVE_ALL", details: "Resolve all pending links" }, function () {
    var ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    var masterSh = ss.getSheetByName(SHEETS.INOUT_MASTER);
    if (!masterSh) throw new Error("Missing master: " + SHEETS.INOUT_MASTER);

    var sh = pendingV8_sheet_();
    var lastRow = sh.getLastRow();
    if (lastRow < 2) return { scanned: 0, resolved: 0 };

    var data = sh.getRange(2, 1, lastRow - 1, sh.getLastColumn()).getValues();
    var map  = schemaV8_buildHeaderMap(masterSh);
    var resolved = 0;

    for (var i = 0; i < data.length; i++) {
      var row       = data[i];
      var type      = String(row[1] || "").trim();
      var inboundId = String(row[2] || "").trim();
      var desired   = String(row[4] || "").trim();
      var status    = String(row[5] || "").trim();

      if (status !== "PENDING" || !inboundId) continue;

      var found = pendingV8_findMasterRow_(masterSh, map, inboundId);
      if (!found.found) continue;

      var applyStatus = (type === "COMPLAINT") ? BUSINESS.STATUS.PENDING_APPROVAL :
                        (desired || BUSINESS.STATUS.APPROVED_ARCHIVED);

      pendingV8_applyStatus_(masterSh, map, found.rowIndex, inboundId, applyStatus, type);
      row[5] = "RESOLVED";
      resolved++;
    }

    var statusVals = data.map(function (r) { return [r[5]]; });
    sh.getRange(2, 6, statusVals.length, 1).setValues(statusVals);

    auditEngine_logEvent(typeof Session !== "undefined" ? (Session.getActiveUser().getEmail() || "SYSTEM") : "SYSTEM", "PENDING_RESOLVE_DONE", "Resolved pending links", "", { scanned: data.length, resolved: resolved }, "SUCCESS");
    return { scanned: data.length, resolved: resolved };
  });
}

function pendingV8_findMasterRow_(masterSh, masterMap, inboundId) {
  var idxNo = masterMap["رقم_القيد"];
  if (idxNo === undefined) throw new Error("Master missing رقم_القيد");
  var lastRow = masterSh.getLastRow();
  if (lastRow < 2) return { found: false };
  var data = masterSh.getRange(2, 1, lastRow - 1, masterSh.getLastColumn()).getValues();
  for (var i = 0; i < data.length; i++) {
    if (String(data[i][idxNo] || "").trim() === inboundId) return { found: true, rowIndex: i + 2 };
  }
  return { found: false };
}

function pendingV8_applyStatus_(masterSh, masterMap, rowIndex, inboundId, newStatus, pendingType) {
  try {
  var oldRow = masterSh.getRange(rowIndex, 1, 1, masterSh.getLastColumn()).getValues()[0];
  var idxStatus = masterMap["الحالة"];
  var oldStatus = idxStatus !== undefined ? oldRow[idxStatus] : "";

  var updates = {
    "رقم_القيد":         inboundId,
    "الحالة":             newStatus,
    "آخر_تعديل_بواسطة": gov_getUser_(),
    "تاريخ_آخر_تعديل":  new Date()
  };
  if (newStatus === BUSINESS.STATUS.APPROVED_ARCHIVED && masterMap["تاريخ_الإنجاز"] !== undefined) {
    updates["تاريخ_الإنجاز"] = oldRow[masterMap["تاريخ_الإنجاز"]] || new Date();
  }

  var newRow = oldRow.slice();
  Object.keys(updates).forEach(function (h) {
    var idx = masterMap[h];
    if (idx !== undefined) newRow[idx] = updates[h];
  });
  masterSh.getRange(rowIndex, 1, 1, masterSh.getLastColumn()).setValues([newRow]);

  govV8_notify("PENDING_RESOLVED", "تم حل ربط معلق: " + inboundId + " -> " + newStatus, inboundId);
  auditEngine_logEvent(typeof Session !== "undefined" ? (Session.getActiveUser().getEmail() || "SYSTEM") : "SYSTEM", "PENDING_RESOLVED", "Resolve " + inboundId + " row=" + rowIndex, oldStatus, newStatus, "SUCCESS");

  if (pendingType !== "OUTBOUND") return;

  try {
    var outId      = inboundId.replace(/^IN-/, "OUT-");
    var alreadyOut = pendingV8_findMasterRow_(masterSh, masterMap, outId);
    if (!alreadyOut.found) {
      var outDtF = new Date(), outFileIds = [], outAttachUrl = "";
      try {
        var ss2     = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
        var respSh2 = ss2.getSheetByName(SHEETS.INOUT_RESPONSES);
        if (respSh2 && respSh2.getLastRow() >= 2) {
          var respMap2  = schemaV8_buildHeaderMap(respSh2);
          var respData2 = respSh2.getRange(2, 1, respSh2.getLastRow()-1, respSh2.getLastColumn()).getValues();
          var targetNo  = inboundId.replace(/^IN-/, "").replace(/-\d{4}$/, "");
          for (var ri = respData2.length - 1; ri >= 0; ri--) {
            var rr     = respData2[ri];
            var linked = schemaV8_pick(rr, respMap2, SCHEMA_ALIASES.INOUT.LINKED_IN_NO);
            if (String(linked || "").trim() !== targetNo) continue;
            var norm2 = schemaV8_normalizeDocType(schemaV8_pick(rr, respMap2, SCHEMA_ALIASES.INOUT.DOC_TYPE));
            if (norm2 !== "OUTBOUND") continue;
            var od = schemaV8_pick(rr, respMap2, SCHEMA_ALIASES.INOUT.OUT_DATE);
            if (od) { var odp = (od instanceof Date) ? od : new Date(od); if (!isNaN(odp.getTime())) outDtF = odp; }
            var rawAtt = schemaV8_pick(rr, respMap2, SCHEMA_ALIASES.INOUT.OUT_ATTACH);
            if (rawAtt) outFileIds = driveV8_extractFileIds_(rawAtt);
            break;
          }
        }
      } catch (_re) {}

      if (outFileIds.length) {
        try {
          var archF  = workflowV8_prepareInboundFolders(inboundId, outDtF, "OUT");
          var archId = archF.archiveFolderId || "";
          if (archId) {
            var fn = outId + " - " + fmtV8_dateArabic(outDtF);
            outAttachUrl = driveV8_copyFileToFolder_(outFileIds[0], archId, fn) || "";
          }
        } catch (_ae) {}
      }

      var outRowArr = new Array(masterSh.getLastColumn()).fill("");
      var op = function(col, val) { var i = masterMap[col]; if (i !== undefined) outRowArr[i] = val; };
      op("رقم_القيد",           outId);
      op("نوع_المستند",         "الصادر");
      op("التاريخ",              outDtF);
      op("الجهة (الوارد) منها", oldRow[masterMap["الجهة (الوارد) منها"]] || "");
      op("الموضوع",             oldRow[masterMap["الموضوع"]] || "");
      op("الحالة",              newStatus);
      op("رابط_الأرشيف",        outAttachUrl);
      op("UUID",                 Utilities.getUuid());
      op("آخر_تعديل_بواسطة",   gov_getUser_());
      op("تاريخ_آخر_تعديل",    new Date());
      masterSh.appendRow(outRowArr);

      if (outAttachUrl && masterMap["رابط_الأرشيف"] !== undefined) {
        var inRow2 = masterSh.getRange(rowIndex, 1, 1, masterSh.getLastColumn()).getValues()[0];
        inRow2[masterMap["رابط_الأرشيف"]] = outAttachUrl;
        masterSh.getRange(rowIndex, 1, 1, masterSh.getLastColumn()).setValues([inRow2]);
      }

      auditEngine_logEvent(typeof Session !== "undefined" ? (Session.getActiveUser().getEmail() || "SYSTEM") : "SYSTEM", "OUTBOUND_NEW_ROW", "سطر صادر جديد من pending: " + outId, "", outId, "SUCCESS");
    }
  } catch (_oe) {
    auditEngine_logError("pendingV8_applyStatus_ → insertOutboundRow", _oe && _oe.message ? _oe.message : String(_oe), _oe && _oe.stack ? _oe.stack : "");
  }

  } catch (err_pend) {
    auditEngine_logError("pendingV8_applyStatus_", err_pend.message || String(err_pend), err_pend.stack || "");
  }}

function pending_add_(type, inboundId, sourceRow, desiredStatus, details) {
  return pendingV8_add(type, inboundId, sourceRow, desiredStatus, details);
}
function pending_resolveAll() { return pendingV8_resolveAll(); }

function _findEmployeeEmail_(empRows, employeeName) {
  var name = String(employeeName || "").trim();
  if (!name) return "";
  var r = empRows.find(function (e) { return String(e["الاسم"] || "").trim() === name; });
  if (r) return String(r["الايميل"] || "").trim();
  r = empRows.find(function (e) {
    var n = String(e["الاسم"] || "").trim();
    return n && (n.includes(name) || name.includes(n));
  });
  return r ? String(r["الايميل"] || "").trim() : "";
}

/* ============================================================
   SECTION 8 — Drive Helpers  (driveV8_)
   ============================================================ */

function driveV8_extractFileIds_(rawValue) {
  if (!rawValue) return [];
  var text = String(rawValue).trim();
  if (!text) return [];

  var ids = [];
  var seen = {};

  var patterns = [
    /\/file\/d\/([a-zA-Z0-9_-]{25,})/g,
    /id=([a-zA-Z0-9_-]{25,})/g,
    /\/open\?id=([a-zA-Z0-9_-]{25,})/g,
    /\/folders\/([a-zA-Z0-9_-]{25,})/g
  ];

  patterns.forEach(function (rx) {
    var m;
    while ((m = rx.exec(text)) !== null) {
      var id = m[1].replace(/[?&# ].*/,"").trim();
      if (id && !seen[id]) { seen[id] = true; ids.push(id); }
    }
  });

  if (!ids.length) {
    text.split(/[\s,،\|]+/).forEach(function (part) {
      var p = part.trim();
      if (/^[a-zA-Z0-9_-]{25,}$/.test(p) && !seen[p]) {
        seen[p] = true;
        ids.push(p);
      }
    });
  }

  return ids;
}

function driveV8_copyFileToFolder_(fileId, targetFolderId, newName) {
  if (!fileId || !targetFolderId) return "";
  try {
    var file   = DriveApp.getFileById(fileId);
    var folder = DriveApp.getFolderById(targetFolderId);
    var name   = String(newName || file.getName()).trim();

    var old = folder.getFilesByName(name);
    while (old.hasNext()) old.next().setTrashed(true);

    var copy = file.makeCopy(name, folder);
    return copy.getUrl();
  } catch (e) {
    auditEngine_logError("driveV8_copyFileToFolder_", e && e.message ? e.message : String(e), e && e.stack ? e.stack : "");
    return "";
  }
}


// ═══════════════════════════════════════════════════════════════
// SECTION: Shortcuts Distribution  (migrated from Core_FolderShortcuts.js)
// ═══════════════════════════════════════════════════════════════

var SH_EMPLOYEES_ROOT = "ملفات الموظفين";
var SH_CAT_VISITS     = "تقارير المرور";
var SH_CAT_COMPLAINTS = "فحص الشكوى";

/**
 * iag_distributeShortcuts — الدالة الموحدة لتوزيع Shortcuts على فولدرات الموظفين
 *
 * @param {GoogleAppsScript.Drive.File} originalFile  ملف Doc الأصلي في الأرشيف
 * @param {string} reportType   نوع التقرير — مثل "المرور الفني" أو "فحص الشكوى"
 * @param {string} entityOrId   اسم الجهة (مرور) أو رقم القيد (شكوى)
 * @param {Date}   dateObj      تاريخ التقرير
 * @param {string} officersText النص الخام للمكلفين — ممكن فيه أكتر من اسم
 */
function iag_distributeShortcuts(originalFile, reportType, entityOrId, dateObj, officersText) {
  try {
    Logger.log("📎 iag_distributeShortcuts | " + reportType + " | " + entityOrId);

    if (!_sh_isDriveApiAvailable()) {
      Logger.log("⚠️  Advanced Drive Service غير مفعّل — لن تُنشأ Shortcuts");
      return;
    }

    var registeredNames = _sh_getRegisteredEmployees();
    if (!registeredNames.length) {
      Logger.log("⚠️  لا يوجد موظفون نشطون في شيت الموظفين");
      return;
    }

    var matchedNames = _sh_matchOfficers(officersText, registeredNames);
    if (!matchedNames.length) {
      Logger.log("ℹ️  لا تطابق لأسماء موظفين في النص: [" + officersText + "]");
      return;
    }
    Logger.log("👥 موظفون (" + matchedNames.length + "): " + matchedNames.join(" | "));

    var category = _sh_resolveCategory(reportType);
    var year     = String(dateObj.getFullYear());
    var month    = _sh_monthName(dateObj);

    matchedNames.forEach(function(name) {
      try {
        var entity = (category === SH_CAT_COMPLAINTS) ? null : entityOrId;
        var targetFolder = _sh_getOrCreateEmployeeSubFolder(name, category, year, month, entity);
        _sh_createShortcut(originalFile, targetFolder);
        Logger.log("✅ " + name + " → " + [category, year, month, entity].filter(Boolean).join(" / "));
      } catch (empErr) {
        Logger.log("⚠️  فشل Shortcut لـ [" + name + "]: " + empErr.message);
      }
    });

  } catch (err) {
    Logger.log("❌ iag_distributeShortcuts: " + err.message);
  }
}

function folderV8_distributeShortcuts_(originalFile, reportType, entityOrId, dateObj, officersText) {
  // @deprecated — استخدم iag_distributeShortcuts مباشرة
  iag_distributeShortcuts(originalFile, reportType, entityOrId, dateObj, officersText);
}

function _sh_getRegisteredEmployees() {
  var ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  var sh = ss.getSheetByName(SHEETS.EMPLOYEES);
  if (!sh || sh.getLastRow() < 2) return [];

  var headers = sh.getRange(1, 1, 1, sh.getLastColumn())
                  .getValues()[0]
                  .map(function(h) { return String(h || "").trim(); });

  var nameCol   = headers.indexOf("الاسم");
  var activeCol = headers.indexOf("نشط");

  if (nameCol === -1) {
    Logger.log("❌ عمود 'الاسم' غير موجود في شيت الموظفين");
    return [];
  }

  var data  = sh.getRange(2, 1, sh.getLastRow() - 1, sh.getLastColumn()).getValues();
  var names = [];

  data.forEach(function(row) {
    var name = String(row[nameCol] || "").trim();
    if (!name) return;
    if (activeCol !== -1) {
      var active = row[activeCol];
      if (active === false || String(active).toLowerCase() === "false") return;
    }
    names.push(name);
  });

  return names;
}

function _sh_matchOfficers(officersText, registeredNames) {
  if (!officersText) return [];
  var normalizedInput = _sh_normalizeText(String(officersText));
  var matched = [];
  registeredNames.forEach(function(fullName) {
    if (_sh_nameFoundInText(fullName, normalizedInput)) matched.push(fullName);
  });
  return matched;
}

function _sh_nameFoundInText(fullName, normalizedInput) {
  var words = fullName.trim().split(/\s+/);
  if (normalizedInput.indexOf(_sh_normalizeText(fullName)) !== -1) return true;
  if (words.length >= 3) {
    for (var i = 0; i <= words.length - 3; i++) {
      var chunk = _sh_normalizeText(words.slice(i, i + 3).join(" "));
      if (normalizedInput.indexOf(chunk) !== -1) return true;
    }
  }
  if (words.length >= 2) {
    var twoWords = _sh_normalizeText(words.slice(0, 2).join(" "));
    if (twoWords.length >= 6 && normalizedInput.indexOf(twoWords) !== -1) return true;
  }
  return false;
}

function _sh_normalizeText(str) {
  return str
    .replace(/[\u064B-\u065F]/g, "")
    .replace(/[أإآ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .trim();
}

function _sh_resolveCategory(reportType) {
  var t = String(reportType || "");
  if (t.indexOf("شكو") !== -1 || t.indexOf("شكاو") !== -1) return SH_CAT_COMPLAINTS;
  return SH_CAT_VISITS;
}

function _sh_getOrCreateEmployeeSubFolder(employeeName, category, year, month, entityName) {
  var workRoot    = DriveApp.getFolderById(CONFIG.getWorkSharedRootId());
  var empRoot     = _sh_getOrCreate(workRoot,   SH_EMPLOYEES_ROOT);
  var empFolder   = _sh_getOrCreate(empRoot,    employeeName);
  var catFolder   = _sh_getOrCreate(empFolder,  category);
  var yearFolder  = _sh_getOrCreate(catFolder,  year);
  var monthFolder = _sh_getOrCreate(yearFolder, month);
  if (entityName) return _sh_getOrCreate(monthFolder, entityName);
  return monthFolder;
}

function _sh_getOrCreate(parent, name) {
  var it = parent.getFoldersByName(name);
  if (it.hasNext()) return it.next();
  return parent.createFolder(name);
}

function _sh_createShortcut(originalFile, targetFolder) {
  var targetId = originalFile.getId();
  try {
    var existing = Drive.Files.list({
      q: "'" + targetFolder.getId() + "' in parents" +
         " and mimeType = 'application/vnd.google-apps.shortcut'" +
         " and trashed = false",
      fields: "files(id,shortcutDetails)",
      supportsAllDrives: true,
      includeItemsFromAllDrives: true
    });
    if (existing.files && existing.files.length > 0) {
      for (var i = 0; i < existing.files.length; i++) {
        var f = existing.files[i];
        if (f.shortcutDetails && f.shortcutDetails.targetId === targetId) {
          Logger.log("⏭️  Shortcut موجود بالفعل — تم التخطي");
          return;
        }
      }
    }
  } catch (checkErr) {
    Logger.log("⚠️  تعذر التحقق من الـ shortcuts الموجودة: " + checkErr.message);
  }
  Drive.Files.create(
    {
      name    : originalFile.getName(),
      mimeType: "application/vnd.google-apps.shortcut",
      parents : [targetFolder.getId()],
      shortcutDetails: { targetId: targetId }
    },
    null,
    { supportsAllDrives: true }
  );
}

function _sh_isDriveApiAvailable() {
  try { var _ = Drive.Files; return true; } catch (e) { return false; }
}

function _sh_monthName(d) {
  return ["يناير","فبراير","مارس","أبريل","مايو","يونيو",
          "يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"][d.getMonth()];
}

/**
 * initEmployeeFolders — تُشغَّل يدوياً مرة واحدة لإعداد الهيكل الأولي
 */
function initEmployeeFolders() {
  var names = _sh_getRegisteredEmployees();
  if (!names.length) { Logger.log("❌ لا يوجد موظفون مسجلون"); return; }
  var workRoot = DriveApp.getFolderById(CONFIG.getWorkSharedRootId());
  var empRoot  = _sh_getOrCreate(workRoot, SH_EMPLOYEES_ROOT);
  names.forEach(function(name) {
    var empFolder = _sh_getOrCreate(empRoot, name);
    _sh_getOrCreate(empFolder, SH_CAT_VISITS);
    _sh_getOrCreate(empFolder, SH_CAT_COMPLAINTS);
    Logger.log("📁 تم: " + name);
  });
  Logger.log("✅ إنشاء فولدرات: " + names.length + " موظف");
}