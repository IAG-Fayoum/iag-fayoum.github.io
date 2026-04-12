// ============================================================
// IAG System — Backend.gs (v8.5 - CAR_SECTIONS + Portal)
// Google Apps Script Web App
// ============================================================

// ============================================================
// 1. CONFIG
// ============================================================

const BE_SS_ID          = CONFIG.SPREADSHEET_ID;
const BE_CAR_SS_ID      = CONFIG.CAR_SPREADSHEET_ID;
const BE_WORK_FOLDER_ID = "1PIR0FtQqE7ucHJx0Dpxr-dc_ozv7cxz_";

const BE_SHEETS = {
  EMPLOYEES    : "REF_EMPLOYEES",
  HEALTH_ADMINS: "REF_HEALTH_ADMINS",   // ← جديد v8.5
  INOUT        : "OP_INOUT_MASTER",
  NOTIFICATIONS: "OP_NOTIFICATIONS",
  REPORTS_LOG  : "OP_REPORTS_LOG",
  AUDIT_LOG    : "OP_AUDIT_LOG",
  ERRORS_LOG   : "OP_ERRORS_LOG",
  STATISTICS   : "OP_STATISTICS"
};

const BE_CAR_SHEETS = {
  FINDINGS    : "OP_FINDINGS",
  CAR_REGISTER: "CAR_REGISTER",
  CAR_SECTIONS: "CAR_SECTIONS",          // ← جديد v8.5
  FOLLOWUP    : "CAR_FOLLOWUP",
  ESCALATIONS : "CAR_ESCALATIONS"
};

const BE_INOUT_COL = {
  RECORD_ID   : 1,
  DOC_TYPE    : 2,
  DATE        : 3,
  SOURCE      : 4,
  ENTITY      : 5,
  SUBJECT     : 6,
  CASE_NUM    : 7,
  CASE_YEAR   : 8,
  TXN_TYPE    : 9,
  IMPORTANCE  : 10,
  URGENCY     : 11,
  ASSIGNED_TO : 12,
  STATUS      : 13,
  ASSIGN_DATE : 14,
  DUE_DATE    : 15,
  DAYS_LEFT   : 16,
  DONE_DATE   : 17,
  ATTACH_URL  : 18,
  ARCHIVE_URL : 19,
  NOTES       : 20,
  UPDATED_BY  : 21,
  UPDATED_AT  : 22,
  UUID        : 23,
  PARENT_ID   : 24
};

const BE_NOTIF_COL = {
  ID        : 1,
  EMP_NAME  : 2,
  TASK_ID   : 3,
  TYPE      : 4,
  TIMESTAMP : 5,
  READ      : 6,
  TASK_DATA : 7
};

const BE_EMP_HEADERS = {
  NAME      : "الاسم",
  EMAIL     : "الايميل",
  JOB_TITLE : "المسمى الوظيفي",
  SPECIALTY : "التخصص",
  ACTIVE    : "نشط",
  PIN       : "PIN",
  ROLE      : "الصلاحية",
  MOBILE    : "الموبايل"
};

const BE_DONE_STATUSES = ["تم الإنجاز", "مكتمل", "تم الاعتماد والأرشفة"];

const BE_FIELD_COL_MAP = {
  "assignee"        : 12,
  "caseNumber"      : 7,
  "caseYear"        : 8,
  "importance"      : 10,
  "notes"           : 20,
  "source"          : 4,
  "status"          : 13,
  "transactionType" : 9,
  "urgency"         : 11,
  "parentId"        : 24
};

// ── جديد v8.5 ──
// قيم staff_status المسموحة في CAR_SECTIONS
const SECTION_STATUS = { OPEN: "مفتوح", IN_PROGRESS: "جاري", CLOSED: "مغلق" };

// حد محاولات البورتال قبل القفل
const PORTAL_MAX_FAILED = 5;


// ============================================================
// 2. ENTRY POINT
// ============================================================

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return buildResponse({ success: false, error: "طلب غير صالح" });
    }

    const body   = JSON.parse(e.postData.contents || "{}");
    const action = String(body.action || "").trim();
    delete body.action;

    if (!action) return buildResponse({ success: false, error: "action مطلوب" });

    let result;

    switch (action) {

      case "login":
        result = handleLogin(body); break;

      case "getAllData":
        result = handleGetAllData(body); break;

      case "getDashboard":
      case "getDashboardData":
        result = handleGetDashboard(body); break;

      case "getTasks":
        result = handleGetTasks(body); break;

      case "getNotifications":
        result = handleGetNotifications(body); break;

      case "markNotifRead":
      case "markAsRead":
        result = handleMarkNotifRead(body); break;

      case "markAllNotifRead":
      case "markAllRead":
        result = handleMarkAllNotifRead(body); break;

      case "deleteNotification":
        result = handleDeleteNotification(body); break;

      case "deleteAllNotifications":
        result = handleDeleteAllNotifications(body); break;

      case "updateTaskStatus":
      case "updateStatus":
      case "adminUpdateStatus":
        result = handleUpdateTaskStatus(body); break;

      case "updateTaskField":
        result = handleUpdateTaskField(body); break;

      case "reassignTask":
        result = handleReassignTask(body); break;

      case "uploadArchiveFile":
        result = handleUploadArchiveFile(body); break;

      case "sendReminderNotification":
      case "sendReminder":
        result = handleSendReminderNotification(body); break;

      case "getEmployeeFiles":
        result = handleGetEmployeeFiles(body); break;

      case "getFindings":
        result = handleGetFindings(body); break;

      case "getCARs":
        result = handleGetCARs(body); break;

      case "getFollowUps":
        result = handleGetFollowUps(body); break;

      case "getEscalations":
        result = handleGetEscalations(body); break;

      case "updateCARResponse":
        result = handleUpdateCARResponse(body); break;

      case "closeCAR":
        result = handleCloseCAR(body); break;

      // ── جديد v8.5 — CAR_SECTIONS (داخلي) ──
      case "getCARSections":
        result = handleGetCARSections(body); break;

      case "updateSectionStatus":
        result = handleUpdateSectionStatus(body); break;

      case "updateFindingStatus":
        result = handleUpdateFindingStatus(body); break;

      // ── جديد v8.5 — Portal (خارجي) ──
      case "portalLogin":
        result = handlePortalLogin(body); break;

      case "portalGetSections":
        result = handlePortalGetSections(body); break;

      case "portalSubmitResponse":
        result = handlePortalSubmitResponse(body); break;

      case "getDashboardStats":
        result = handleGetDashboardStats(body); break;

      // stubs
      case "sendCustomEmail":
      case "broadcastNotification":
      case "getQuarterlyReport":
      case "downloadReportLink":
        result = { success: true, message: "الميزة قيد التطوير" }; break;

      default:
        result = { success: false, error: "action غير معروف: " + action };
    }

    return buildResponse(result);

  } catch (err) {
    logError("doPost", err && err.message ? err.message : String(err), safeStringify_(e));
    return buildResponse({ success: false, error: "خطأ داخلي في السيرفر" });
  }
}

function doGet() {
  return buildResponse({ success: true, message: "IAG Backend v8.5 — Active" });
}


// ============================================================
// 3. HANDLERS
// ============================================================

// ── 3.1 LOGIN ──
function handleLogin(data) {
  const mobile = normalizeDigits_(data && data.mobile);
  const pin    = normalizeDigits_(data && data.pin);

  if (!mobile || !pin) {
    writeAuditLog("SYSTEM", "login_failed_missing_data", "", "", "");
    return { success: false, error: "بيانات ناقصة" };
  }

  let empData;
  try {
    empData = getEmployeesData_();
  } catch (e) {
    return { success: false, error: "خطأ في قراءة بيانات الموظفين: " + e.message };
  }

  const rows        = empData.rows;
  const col         = empData.col;
  const matchedRows = [];

  for (let i = 0; i < rows.length; i++) {
    const row       = rows[i];
    const rowMobile = normalizeDigits_(row[col(BE_EMP_HEADERS.MOBILE)]);
    const rowPin    = normalizeDigits_(row[col(BE_EMP_HEADERS.PIN)]);
    if (rowMobile === mobile && rowPin === pin) {
      matchedRows.push({ row: row, rowNumber: i + 2 });
    }
  }

  if (matchedRows.length === 0) {
    writeAuditLog("SYSTEM", "login_failed_invalid_credentials", mobile, "", "");
    return { success: false, error: "رقم الموبايل أو رمز الدخول غير صحيح" };
  }

  if (matchedRows.length > 1) {
    logError("handleLogin", "Duplicate login identity", JSON.stringify({ mobile: mobile, count: matchedRows.length }));
    return { success: false, error: "تعارض في بيانات المستخدم، تواصل مع المسؤول" };
  }

  const row = matchedRows[0].row;

  if (!isTruthyActive_(row[col(BE_EMP_HEADERS.ACTIVE)])) {
    writeAuditLog("SYSTEM", "login_failed_inactive", mobile, "", "");
    return { success: false, error: "الحساب غير مفعل، تواصل مع المسؤول" };
  }

  const result = {
    success  : true,
    name     : safeStr_(row[col(BE_EMP_HEADERS.NAME)]),
    email    : safeStr_(row[col(BE_EMP_HEADERS.EMAIL)]),
    jobTitle : safeStr_(row[col(BE_EMP_HEADERS.JOB_TITLE)]),
    specialty: safeStr_(row[col(BE_EMP_HEADERS.SPECIALTY)]),
    role     : safeStr_(row[col(BE_EMP_HEADERS.ROLE)]),
    mobile   : safeStr_(row[col(BE_EMP_HEADERS.MOBILE)])
  };

  writeAuditLog(result.name || "SYSTEM", "login_success", mobile, "", "");
  return result;
}


// ── 3.2 GET ALL DATA ──
function handleGetAllData(data) {
  const name = String((data && (data.name || data.employeeName)) || "").trim();
  const role = String((data && data.role) || "").trim();

  const sheet = getSheet(BE_SHEETS.INOUT);
  const rows  = sheet.getDataRange().getValues();
  const tasks = [];

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  var totals = { total: 0, new: 0, pending: 0, completed: 0, followup: 0, overdue: 0 };

  for (var i = 1; i < rows.length; i++) {
    var row      = rows[i];
    var recordId = row[BE_INOUT_COL.RECORD_ID - 1];
    if (!recordId) continue;

    var assignee = String(row[BE_INOUT_COL.ASSIGNED_TO - 1] || "").trim();
    var status   = String(row[BE_INOUT_COL.STATUS - 1] || "").trim();

    if (!isAdminRole_(role) && assignee !== name) continue;

    totals.total++;
    if (status.includes("جديد"))         totals.new++;
    else if (status.includes("بانتظار")) totals.pending++;
    else if (status.includes("تم"))      totals.completed++;
    else if (status.includes("متابعة"))  totals.followup++;

    var dueRaw = row[BE_INOUT_COL.DUE_DATE - 1];
    if (dueRaw && !isDoneStatus_(status)) {
      var dueDate = new Date(dueRaw);
      if (!isNaN(dueDate.getTime())) {
        dueDate.setHours(0, 0, 0, 0);
        if (dueDate < today) totals.overdue++;
      }
    }

    tasks.push(buildTaskObj_(row, i));
  }

  var empData   = getEmployeesData_();
  var empRows   = empData.rows;
  var col       = empData.col;
  var employees = [];

  for (var j = 0; j < empRows.length; j++) {
    if (isTruthyActive_(empRows[j][col(BE_EMP_HEADERS.ACTIVE)])) {
      employees.push({
        name     : safeStr_(empRows[j][col(BE_EMP_HEADERS.NAME)]),
        jobTitle : safeStr_(empRows[j][col(BE_EMP_HEADERS.JOB_TITLE)]),
        specialty: safeStr_(empRows[j][col(BE_EMP_HEADERS.SPECIALTY)]),
        role     : safeStr_(empRows[j][col(BE_EMP_HEADERS.ROLE)])
      });
    }
  }

  var reports = [];
  if (!isAdminRole_(role) && name) {
    try {
      var rSheet = getSheet(BE_SHEETS.REPORTS_LOG);
      var rRows  = rSheet.getDataRange().getValues();
      for (var k = 1; k < rRows.length; k++) {
        var r   = rRows[k];
        var emp = String(r[14] || r[4] || "").trim();
        if (emp && emp !== name) continue;
        reports.push({
          date   : formatDate(r[0]),
          type   : safeStr_(r[1]),
          entity : safeStr_(r[2]),
          by     : safeStr_(r[3]),
          fileUrl: safeStr_(r[6]),
          pdfUrl : safeStr_(r[7]),
          status : safeStr_(r[8])
        });
      }
    } catch (e) { /* تجاهل أخطاء REPORTS_LOG */ }
  }

  return {
    success: true,
    tasks  : tasks,
    reports: reports,
    stats  : {
      totals   : totals,
      employees: employees
    }
  };
}


// ── 3.3 GET DASHBOARD ──
function handleGetDashboard(data) {
  var year   = String((data && data.year)   || "").trim();
  var period = String((data && data.period) || "").trim();

  var sheet  = getSheet(BE_SHEETS.INOUT);
  var rows   = sheet.getDataRange().getValues();
  var today  = new Date(); today.setHours(0,0,0,0);
  var empMap = {};

  for (var i = 1; i < rows.length; i++) {
    var row      = rows[i];
    var recordId = row[BE_INOUT_COL.RECORD_ID - 1];
    if (!recordId) continue;

    if (year) {
      var rowDateRaw = row[BE_INOUT_COL.DATE - 1];
      var rowDate    = rowDateRaw instanceof Date ? rowDateRaw : new Date(rowDateRaw);
      if (isNaN(rowDate.getTime()) || rowDate.getFullYear().toString() !== year) continue;
      if (period) {
        var m = rowDate.getMonth() + 1;
        var matchPeriod = false;
        if      (period === 'Q1') matchPeriod = (m >= 1  && m <= 3);
        else if (period === 'Q2') matchPeriod = (m >= 4  && m <= 6);
        else if (period === 'Q3') matchPeriod = (m >= 7  && m <= 9);
        else if (period === 'Q4') matchPeriod = (m >= 10 && m <= 12);
        else matchPeriod = (m.toString() === period);
        if (!matchPeriod) continue;
      }
    }

    var assignee = safeStr_(row[BE_INOUT_COL.ASSIGNED_TO - 1]).trim();
    if (!assignee) continue;

    var status   = safeStr_(row[BE_INOUT_COL.STATUS - 1]).trim();
    var parentId = safeStr_(row[BE_INOUT_COL.PARENT_ID - 1]).trim();

    if (!empMap[assignee]) {
      empMap[assignee] = { name: assignee, dept: "", total: 0, overdue: 0, completed: 0, tasks: [] };
    }
    var emp = empMap[assignee];

    if (!parentId) emp.total++;

    if (isDoneStatus_(status)) emp.completed++;

    var dueRaw = row[BE_INOUT_COL.DUE_DATE - 1];
    if (dueRaw && !isDoneStatus_(status)) {
      var dueDate = new Date(dueRaw);
      if (!isNaN(dueDate.getTime())) {
        dueDate.setHours(0,0,0,0);
        if (dueDate < today) emp.overdue++;
      }
    }

    emp.tasks.push({
      id     : safeStr_(row[BE_INOUT_COL.RECORD_ID  - 1]),
      status : status,
      source : safeStr_(row[BE_INOUT_COL.SOURCE     - 1]),
      entity : safeStr_(row[BE_INOUT_COL.ENTITY     - 1]),
      subject: safeStr_(row[BE_INOUT_COL.SUBJECT    - 1]),
      date   : formatDate(row[BE_INOUT_COL.DATE     - 1]),
      dueDate: formatDate(row[BE_INOUT_COL.DUE_DATE - 1])
    });
  }

  try {
    var empData = getEmployeesData_();
    empData.rows.forEach(function(r) {
      var n = safeStr_(r[empData.col(BE_EMP_HEADERS.NAME)]).trim();
      var t = safeStr_(r[empData.col(BE_EMP_HEADERS.JOB_TITLE)]).trim();
      if (empMap[n]) empMap[n].dept = t;
    });
  } catch(e) {}

  var employees = Object.values(empMap).map(function(e) {
    e.rate = e.total > 0 ? Math.round((e.completed / e.total) * 100) : 0;
    return e;
  });

  return { success: true, employees: employees };
}


// ── 3.4 GET TASKS ──
function handleGetTasks(data) {
  var name  = String((data && (data.employeeName || data.name)) || "").trim();
  var role  = String((data && data.role) || "").trim();
  var sheet = getSheet(BE_SHEETS.INOUT);
  var rows  = sheet.getDataRange().getValues();
  var tasks = [];

  for (var i = 1; i < rows.length; i++) {
    var row      = rows[i];
    var recordId = row[BE_INOUT_COL.RECORD_ID - 1];
    if (!recordId) continue;
    var assignee = String(row[BE_INOUT_COL.ASSIGNED_TO - 1] || "").trim();
    if (!isAdminRole_(role) && assignee !== name) continue;
    tasks.push(buildTaskObj_(row, i));
  }

  return { success: true, tasks: tasks };
}


// ── 3.5 GET NOTIFICATIONS ──
function handleGetNotifications(data) {
  var employeeName = String((data && (data.employeeName || data.name)) || "").trim();
  if (!employeeName) return { success: false, error: "اسم الموظف مطلوب" };

  var sheet  = getSheet(BE_SHEETS.NOTIFICATIONS);
  var rows   = sheet.getDataRange().getValues();
  var notifs = [];

  for (var i = 1; i < rows.length; i++) {
    var row     = rows[i];
    var empName = String(row[BE_NOTIF_COL.EMP_NAME - 1] || "").trim();
    if (empName !== employeeName) continue;

    var type     = String(row[BE_NOTIF_COL.TYPE - 1] || "").trim();
    var taskData = String(row[BE_NOTIF_COL.TASK_DATA - 1] || "").trim();
    var rawTime  = row[BE_NOTIF_COL.TIMESTAMP - 1];

    notifs.push({
      id       : safeStr_(row[BE_NOTIF_COL.ID - 1]),
      taskId   : safeStr_(row[BE_NOTIF_COL.TASK_ID - 1]),
      type     : type,
      title    : buildNotifTitle_(type),
      message  : buildNotifMessage_(type, taskData),
      date     : formatDateTime(rawTime),
      timestamp: formatDateTime(rawTime),
      read     : row[BE_NOTIF_COL.READ - 1],
      taskData : taskData,
      rowIndex : i + 1
    });
  }

  notifs.sort(function(a, b) {
    return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
  });

  return { success: true, notifications: notifs };
}


// ── 3.6 MARK NOTIFICATION READ ──
function handleMarkNotifRead(data) {
  var notifId      = String((data && data.notifId)              || "").trim();
  var employeeName = String((data && (data.employeeName || data.name)) || "").trim();

  if (!notifId) return { success: false, error: "notifId مطلوب" };

  var lock = LockService.getScriptLock();
  lock.waitLock(15000);

  try {
    var sheet = getSheet(BE_SHEETS.NOTIFICATIONS);
    var rows  = sheet.getDataRange().getValues();

    for (var i = 1; i < rows.length; i++) {
      var rowId = String(rows[i][BE_NOTIF_COL.ID - 1] || "").trim();
      if (rowId !== notifId) continue;

      if (employeeName) {
        var rowEmp = String(rows[i][BE_NOTIF_COL.EMP_NAME - 1] || "").trim();
        if (rowEmp !== employeeName) return { success: false, error: "غير مصرح" };
      }

      sheet.getRange(i + 1, BE_NOTIF_COL.READ).setValue(true);
      return { success: true };
    }

    return { success: false, error: "الإشعار غير موجود" };
  } finally {
    lock.releaseLock();
  }
}


// ── 3.7 MARK ALL NOTIFICATIONS READ ──
function handleMarkAllNotifRead(data) {
  var employeeName = String((data && (data.employeeName || data.name)) || "").trim();
  if (!employeeName) return { success: false, error: "اسم الموظف مطلوب" };

  var lock = LockService.getScriptLock();
  lock.waitLock(15000);

  try {
    var sheet = getSheet(BE_SHEETS.NOTIFICATIONS);
    var rows  = sheet.getDataRange().getValues();
    var count = 0;

    for (var i = 1; i < rows.length; i++) {
      var empName = String(rows[i][BE_NOTIF_COL.EMP_NAME - 1] || "").trim();
      var isRead  = rows[i][BE_NOTIF_COL.READ - 1];
      if (empName === employeeName && !isRead) {
        sheet.getRange(i + 1, BE_NOTIF_COL.READ).setValue(true);
        count++;
      }
    }

    writeAuditLog(employeeName, "markAllNotifRead", employeeName, "", count);
    return { success: true, updated: count };
  } finally {
    lock.releaseLock();
  }
}


// ── 3.8 DELETE NOTIFICATION ──
function handleDeleteNotification(data) {
  var notifId      = String((data && data.notifId)              || "").trim();
  var employeeName = String((data && (data.employeeName || data.name)) || "").trim();

  if (!notifId) return { success: false, error: "notifId مطلوب" };

  var lock = LockService.getScriptLock();
  lock.waitLock(15000);

  try {
    var sheet = getSheet(BE_SHEETS.NOTIFICATIONS);
    var rows  = sheet.getDataRange().getValues();

    for (var i = rows.length - 1; i >= 1; i--) {
      var rowId = String(rows[i][BE_NOTIF_COL.ID - 1] || "").trim();
      if (rowId !== notifId) continue;

      if (employeeName) {
        var rowEmp = String(rows[i][BE_NOTIF_COL.EMP_NAME - 1] || "").trim();
        if (rowEmp !== employeeName) return { success: false, error: "غير مصرح" };
      }

      sheet.deleteRow(i + 1);
      return { success: true };
    }

    return { success: false, error: "الإشعار غير موجود" };
  } finally {
    lock.releaseLock();
  }
}


// ── 3.9 DELETE ALL NOTIFICATIONS ──
function handleDeleteAllNotifications(data) {
  var employeeName = String((data && (data.employeeName || data.name)) || "").trim();
  if (!employeeName) return { success: false, error: "اسم الموظف مطلوب" };

  var lock = LockService.getScriptLock();
  lock.waitLock(15000);

  try {
    var sheet = getSheet(BE_SHEETS.NOTIFICATIONS);
    var rows  = sheet.getDataRange().getValues();
    var count = 0;

    for (var i = rows.length - 1; i >= 1; i--) {
      var empName = String(rows[i][BE_NOTIF_COL.EMP_NAME - 1] || "").trim();
      if (empName === employeeName) {
        sheet.deleteRow(i + 1);
        count++;
      }
    }

    writeAuditLog(employeeName, "deleteAllNotifications", employeeName, "", count);
    return { success: true, deleted: count };
  } finally {
    lock.releaseLock();
  }
}


// ── 3.10 UPDATE TASK STATUS ──
function handleUpdateTaskStatus(data) {
  var uuid      = String((data && data.uuid)      || "").trim();
  var taskId    = String((data && data.taskId)    || "").trim();
  var newStatus = String((data && data.newStatus) || "").trim();
  var updatedBy = String((data && data.updatedBy) || "").trim();
  var notes     = String((data && data.notes)     || "");
  var role      = String((data && data.role)      || "").trim();

  if (!newStatus || !updatedBy)   return { success: false, error: "بيانات ناقصة" };
  if (!uuid && !taskId)           return { success: false, error: "uuid أو taskId مطلوب" };

  var lock = LockService.getScriptLock();
  lock.waitLock(30000);

  try {
    var sheet = getSheet(BE_SHEETS.INOUT);
    var rows  = sheet.getDataRange().getValues();

    for (var i = 1; i < rows.length; i++) {
      var rowUuid     = String(rows[i][BE_INOUT_COL.UUID      - 1] || "").trim();
      var rowRecordId = String(rows[i][BE_INOUT_COL.RECORD_ID - 1] || "").trim();
      var match       = (uuid && rowUuid === uuid) || (taskId && rowRecordId === taskId);
      if (!match) continue;

      var assignedTo = String(rows[i][BE_INOUT_COL.ASSIGNED_TO - 1] || "").trim();
      if (!isAdminRole_(role) && assignedTo !== updatedBy) {
        writeAuditLog(updatedBy, "updateTaskStatus_denied", taskId || uuid, "", newStatus);
        return { success: false, error: "غير مصرح لك بتعديل هذه المهمة" };
      }

      var rowNum    = i + 1;
      var oldStatus = rows[i][BE_INOUT_COL.STATUS - 1];

      sheet.getRange(rowNum, BE_INOUT_COL.STATUS    ).setValue(newStatus);
      sheet.getRange(rowNum, BE_INOUT_COL.UPDATED_BY).setValue(updatedBy);
      sheet.getRange(rowNum, BE_INOUT_COL.UPDATED_AT).setValue(new Date());

      if (isDoneStatus_(newStatus)) {
        sheet.getRange(rowNum, BE_INOUT_COL.DONE_DATE).setValue(new Date());
      }

      if (notes) sheet.getRange(rowNum, BE_INOUT_COL.NOTES).setValue(notes);

      writeAuditLog(updatedBy, "updateTaskStatus", taskId || uuid, oldStatus, newStatus);
      return { success: true };
    }

    return { success: false, error: "المهمة غير موجودة" };
  } finally {
    lock.releaseLock();
  }
}


// ── 3.11 UPDATE TASK FIELD ──
function handleUpdateTaskField(data) {
  var taskId     = String((data && data.taskId)     || "").trim();
  var fieldName  = String((data && data.fieldName)  || "").trim();
  var fieldValue = String((data && data.fieldValue) || "").trim();
  var updatedBy  = String((data && data.updatedBy)  || "").trim();

  if (!taskId || !fieldName || !fieldValue) return { success: false, error: "بيانات ناقصة" };

  var colNum = BE_FIELD_COL_MAP[fieldName];
  if (!colNum) return { success: false, error: "حقل غير معروف: " + fieldName };

  var lock = LockService.getScriptLock();
  lock.waitLock(15000);

  try {
    var sheet = getSheet(BE_SHEETS.INOUT);
    var rows  = sheet.getDataRange().getValues();

    for (var i = 1; i < rows.length; i++) {
      var rowRecordId = String(rows[i][BE_INOUT_COL.RECORD_ID - 1] || "").trim();
      if (rowRecordId !== taskId) continue;

      var rowNum = i + 1;
      var oldVal = rows[i][colNum - 1];

      sheet.getRange(rowNum, colNum                 ).setValue(fieldValue);
      sheet.getRange(rowNum, BE_INOUT_COL.UPDATED_BY).setValue(updatedBy || "النظام");
      sheet.getRange(rowNum, BE_INOUT_COL.UPDATED_AT).setValue(new Date());

      writeAuditLog(updatedBy || "النظام", "updateTaskField:" + fieldName, taskId, oldVal, fieldValue);
      return { success: true };
    }

    return { success: false, error: "المهمة غير موجودة" };
  } finally {
    lock.releaseLock();
  }
}


// ── 3.12 REASSIGN TASK ──
function handleReassignTask(data) {
  var taskId      = String((data && data.taskId)      || "").trim();
  var newEmployee = String((data && data.newEmployee) || "").trim();
  var updatedBy   = String((data && data.updatedBy)   || "").trim();

  if (!taskId || !newEmployee) return { success: false, error: "بيانات ناقصة" };

  var lock = LockService.getScriptLock();
  lock.waitLock(15000);

  try {
    var sheet = getSheet(BE_SHEETS.INOUT);
    var rows  = sheet.getDataRange().getValues();

    for (var i = 1; i < rows.length; i++) {
      var rowRecordId = String(rows[i][BE_INOUT_COL.RECORD_ID - 1] || "").trim();
      if (rowRecordId !== taskId) continue;

      var rowNum = i + 1;
      var oldEmp = rows[i][BE_INOUT_COL.ASSIGNED_TO - 1];

      sheet.getRange(rowNum, BE_INOUT_COL.ASSIGNED_TO).setValue(newEmployee);
      sheet.getRange(rowNum, BE_INOUT_COL.ASSIGN_DATE ).setValue(new Date());
      sheet.getRange(rowNum, BE_INOUT_COL.UPDATED_BY  ).setValue(updatedBy || "المنسق");
      sheet.getRange(rowNum, BE_INOUT_COL.UPDATED_AT  ).setValue(new Date());

      writeAuditLog(updatedBy || "المنسق", "reassignTask", taskId, oldEmp, newEmployee);
      return { success: true };
    }

    return { success: false, error: "المهمة غير موجودة" };
  } finally {
    lock.releaseLock();
  }
}


// ── 3.13 UPLOAD ARCHIVE FILE ──
function handleUploadArchiveFile(data) {
  var taskId    = String((data && data.taskId)     || "").trim();
  var fileName  = String((data && data.fileName)   || "file").trim();
  var base64    = String((data && data.fileBase64) || "").trim();
  var mimeType  = String((data && data.mimeType)   || "application/pdf").trim();
  var updatedBy = String((data && data.updatedBy)  || "").trim();

  if (!taskId || !base64) return { success: false, error: "بيانات ناقصة" };

  var lock = LockService.getScriptLock();
  lock.waitLock(30000);

  try {
    var folder  = DriveApp.getFolderById(BE_WORK_FOLDER_ID);
    var blob    = Utilities.newBlob(Utilities.base64Decode(base64), mimeType, fileName);
    var file    = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    var fileUrl = file.getUrl();

    var sheet = getSheet(BE_SHEETS.INOUT);
    var rows  = sheet.getDataRange().getValues();

    for (var i = 1; i < rows.length; i++) {
      var rowRecordId = String(rows[i][BE_INOUT_COL.RECORD_ID - 1] || "").trim();
      if (rowRecordId !== taskId) continue;

      var rowNum = i + 1;
      sheet.getRange(rowNum, BE_INOUT_COL.ARCHIVE_URL).setValue(fileUrl);
      sheet.getRange(rowNum, BE_INOUT_COL.UPDATED_BY ).setValue(updatedBy || "النظام");
      sheet.getRange(rowNum, BE_INOUT_COL.UPDATED_AT ).setValue(new Date());

      writeAuditLog(updatedBy || "النظام", "uploadArchiveFile", taskId, "", fileUrl);
      return { success: true, fileUrl: fileUrl };
    }

    return { success: true, fileUrl: fileUrl, warning: "المهمة غير موجودة في الشيت" };

  } catch (err) {
    logError("handleUploadArchiveFile", err.message, taskId);
    return { success: false, error: "فشل رفع الملف: " + err.message };
  } finally {
    lock.releaseLock();
  }
}


// ── 3.14 SEND REMINDER NOTIFICATION ──
function handleSendReminderNotification(data) {
  var empName = String((data && data.empName) || "").trim();
  var sentBy  = String((data && data.sentBy)  || "المنسق").trim();
  var tasks   = (data && Array.isArray(data.tasks)) ? data.tasks : [];

  if (!empName)      return { success: false, error: "اسم الموظف مطلوب" };
  if (!tasks.length) return { success: false, error: "لا توجد مهام للتذكير" };

  var empEmail = "";
  try {
    var empData = getEmployeesData_();
    for (var j = 0; j < empData.rows.length; j++) {
      var n = safeStr_(empData.rows[j][empData.col(BE_EMP_HEADERS.NAME)]).trim();
      if (n === empName) {
        empEmail = safeStr_(empData.rows[j][empData.col(BE_EMP_HEADERS.EMAIL)]).trim();
        break;
      }
    }
  } catch(e) {}

  var dateStr  = Utilities.formatDate(new Date(), "Africa/Cairo", "dd/MM/yyyy");
  var taskRows = tasks.map(function(t, i) {
    return "<tr style='border-bottom:1px solid #e2e8f0'>"
      + "<td style='padding:8px 12px;color:#64748b'>" + (i+1) + "</td>"
      + "<td style='padding:8px 12px;font-weight:bold'>" + (t.id||'-') + "</td>"
      + "<td style='padding:8px 12px'>" + (t.subject||'-') + "</td>"
      + "<td style='padding:8px 12px;color:#0f766e'>" + (t.status||'-') + "</td>"
      + "<td style='padding:8px 12px;color:#dc2626'>" + (t.dueDate||'-') + "</td>"
      + "</tr>";
  }).join("");

  var emailBody = "<div dir='rtl' style='font-family:Arial,sans-serif;max-width:640px;margin:auto'>"
    + "<div style='background:#0f766e;padding:20px;border-radius:8px 8px 0 0;text-align:center'>"
    + "<h2 style='color:white;margin:0;font-size:1rem'>إدارة المراجعة الداخلية والحوكمة</h2>"
    + "<p style='color:#ccfbf1;margin:4px 0 0;font-size:0.82rem'>وزارة الصحة — مديرية الشئون الصحية بالفيوم</p>"
    + "</div>"
    + "<div style='background:#f0fdfa;padding:16px 20px;border:1px solid #ccfbf1'>"
    + "<p style='margin:0;font-size:0.9rem;color:#134e4a'>السيد / <strong>" + empName + "</strong></p>"
    + "<p style='margin:8px 0 0;font-size:0.82rem;color:#475569'>تذكير بالمهام القيد التنفيذ — " + dateStr + "</p>"
    + "</div>"
    + "<table style='width:100%;border-collapse:collapse;font-size:0.82rem;border:1px solid #e2e8f0'>"
    + "<thead><tr style='background:#f8fafc'>"
    + "<th style='padding:8px 12px;text-align:right;color:#0f766e'>#</th>"
    + "<th style='padding:8px 12px;text-align:right;color:#0f766e'>رقم المعاملة</th>"
    + "<th style='padding:8px 12px;text-align:right;color:#0f766e'>الموضوع</th>"
    + "<th style='padding:8px 12px;text-align:right;color:#0f766e'>الحالة</th>"
    + "<th style='padding:8px 12px;text-align:right;color:#0f766e'>الموعد</th>"
    + "</tr></thead><tbody>" + taskRows + "</tbody></table>"
    + "<div style='padding:14px 20px;background:#fff;border:1px solid #e2e8f0;border-top:none;font-size:0.78rem;color:#94a3b8'>"
    + "أُرسل هذا التذكير بواسطة: " + sentBy + " | النظام الآلي لإدارة المراجعة الداخلية"
    + "</div></div>";

  var emailSent = false;
  if (empEmail) {
    try {
      GmailApp.sendEmail(empEmail,
        "تذكير: مهام قيد التنفيذ — " + dateStr,
        "يرجى الاطلاع على المهام المطلوبة في الجدول المرفق.",
        { htmlBody: emailBody, name: "إدارة المراجعة الداخلية والحوكمة" }
      );
      emailSent = true;
    } catch(e) {
      logError("sendReminderNotification_email", e.message, empName);
    }
  }

  try {
    var notifSheet = getSheet(BE_SHEETS.NOTIFICATIONS);
    var notifId    = "REM-" + new Date().getTime() + "-" + Math.floor(Math.random()*1000);
    var taskData   = JSON.stringify({
      message: "لديك " + tasks.length + " مهمة تحتاج متابعة — أُرسل بواسطة " + sentBy,
      count  : tasks.length
    });
    notifSheet.appendRow([notifId, empName, "", "تذكير", new Date(), false, taskData]);
  } catch(e) {
    logError("sendReminderNotification_notif", e.message, empName);
  }

  writeAuditLog(sentBy, "sendReminderNotification", empName, "", tasks.length + " مهمة");
  return {
    success  : true,
    emailSent: emailSent,
    message  : emailSent
      ? "تم إرسال التذكير وإشعار داخلي لـ " + empName
      : "تم إرسال إشعار داخلي فقط (لا يوجد إيميل مسجل)"
  };
}


// ── 3.15 GET EMPLOYEE FILES ──
function handleGetEmployeeFiles(payload) {
  try {
    const empName = (payload.name || '').trim();
    if (!empName) return { success: false, error: 'اسم الموظف مطلوب' };

    const rootFolder  = DriveApp.getFolderById(BE_WORK_FOLDER_ID);
    const empFolderIt = rootFolder.getFoldersByName(empName);
    if (!empFolderIt.hasNext()) {
      return { success: true, inspections: [], complaints: [] };
    }
    const empFolder = empFolderIt.next();

    const result = { success: true, inspections: [], complaints: [] };

    const inspIt = empFolder.getFoldersByName('تقارير المرور');
    if (inspIt.hasNext()) result.inspections = _readYearTree(inspIt.next(), 'inspection');

    const compIt = empFolder.getFoldersByName('فحص الشكاوى');
    if (compIt.hasNext()) result.complaints = _readYearTree(compIt.next(), 'complaint');

    return result;
  } catch (e) {
    return { success: false, error: e.toString() };
  }
}

function _readYearTree(parentFolder, type) {
  const items  = [];
  const yearIt = parentFolder.getFolders();

  while (yearIt.hasNext()) {
    const yearFolder = yearIt.next();
    const year       = yearFolder.getName();
    const monthIt    = yearFolder.getFolders();

    while (monthIt.hasNext()) {
      const monthFolder = monthIt.next();
      const month       = monthFolder.getName();

      if (type === 'inspection') {
        const entityIt = monthFolder.getFolders();
        while (entityIt.hasNext()) {
          const entityFolder = entityIt.next();
          const entity       = entityFolder.getName();
          const fileIt       = entityFolder.getFiles();
          while (fileIt.hasNext()) items.push(_buildFileItem(fileIt.next(), year, month, entity, type));

          const attIt = entityFolder.getFoldersByName('مرفقات');
          if (attIt.hasNext()) {
            const attFileIt = attIt.next().getFiles();
            while (attFileIt.hasNext()) items.push(_buildFileItem(attFileIt.next(), year, month, entity + ' — مرفقات', type));
          }
        }
        const directIt = monthFolder.getFiles();
        while (directIt.hasNext()) items.push(_buildFileItem(directIt.next(), year, month, '', type));
      } else {
        const fileIt = monthFolder.getFiles();
        while (fileIt.hasNext()) items.push(_buildFileItem(fileIt.next(), year, month, '', type));
      }
    }
  }
  return items;
}

function _buildFileItem(file, year, month, entity, type) {
  const mimeType = file.getMimeType();
  return {
    id      : file.getId(),
    name    : file.getName(),
    url     : file.getUrl(),
    mimeType: mimeType,
    isDoc   : mimeType === MimeType.GOOGLE_DOCS ||
              mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    size    : file.getSize(),
    modified: Utilities.formatDate(file.getLastUpdated(), 'Africa/Cairo', 'dd/MM/yyyy'),
    year    : year,
    month   : month,
    entity  : entity,
    type    : type
  };
}


// ── 3.16 GET FINDINGS ──
function handleGetFindings(data) {
  var unitId = String((data && data.unitId) || "").trim();
  try {
    var sheet = getCarSheet(BE_CAR_SHEETS.FINDINGS);
    var rows  = sheet.getDataRange().getValues();
    if (rows.length < 2) return { success: true, findings: [] };
    var headers  = rows[0];
    var findings = [];
    for (var i = 1; i < rows.length; i++) {
      var row = rows[i];
      if (!row[0]) continue;
      var obj = {};
      headers.forEach(function(h, j) { obj[String(h).trim()] = safeStr_(row[j]); });
      if (unitId && obj["unit_id"] !== unitId && obj["facility_name"] !== unitId) continue;
      findings.push(obj);
    }
    return { success: true, findings: findings };
  } catch(e) {
    logError("handleGetFindings", e.message, "");
    return { success: false, error: e.message };
  }
}


// ── 3.17 GET CARs ──
function handleGetCARs(data) {
  var status = String((data && data.status) || "").trim();
  try {
    var sheet = getCarSheet(BE_CAR_SHEETS.CAR_REGISTER);
    var rows  = sheet.getDataRange().getValues();
    if (rows.length < 2) return { success: true, cars: [] };
    var headers = rows[0];
    var cars    = [];
    for (var i = 1; i < rows.length; i++) {
      var row = rows[i];
      if (!row[0]) continue;
      var obj = {};
      headers.forEach(function(h, j) { obj[String(h).trim()] = safeStr_(row[j]); });
      if (status && obj["status"] !== status) continue;
      cars.push(obj);
    }
    return { success: true, cars: cars };
  } catch(e) {
    logError("handleGetCARs", e.message, "");
    return { success: false, error: e.message };
  }
}


// ── 3.18 GET FOLLOW-UPS ──
function handleGetFollowUps(data) {
  var carId = String((data && data.carId) || "").trim();
  try {
    var sheet = getCarSheet(BE_CAR_SHEETS.FOLLOWUP);
    var rows  = sheet.getDataRange().getValues();
    if (rows.length < 2) return { success: true, followups: [] };
    var headers   = rows[0];
    var followups = [];
    for (var i = 1; i < rows.length; i++) {
      var row = rows[i];
      if (!row[0]) continue;
      var obj = {};
      headers.forEach(function(h, j) { obj[String(h).trim()] = safeStr_(row[j]); });
      if (carId && obj["car_id"] !== carId) continue;
      followups.push(obj);
    }
    return { success: true, followups: followups };
  } catch(e) {
    logError("handleGetFollowUps", e.message, "");
    return { success: false, error: e.message };
  }
}


// ── 3.19 GET ESCALATIONS ──
function handleGetEscalations(data) {
  try {
    var sheet = getCarSheet(BE_CAR_SHEETS.ESCALATIONS);
    var rows  = sheet.getDataRange().getValues();
    if (rows.length < 2) return { success: true, escalations: [] };
    var headers     = rows[0];
    var escalations = [];
    for (var i = 1; i < rows.length; i++) {
      var row = rows[i];
      if (!row[0]) continue;
      var obj = {};
      headers.forEach(function(h, j) { obj[String(h).trim()] = safeStr_(row[j]); });
      escalations.push(obj);
    }
    return { success: true, escalations: escalations };
  } catch(e) {
    logError("handleGetEscalations", e.message, "");
    return { success: false, error: e.message };
  }
}


// ── 3.20b GET DASHBOARD STATS (filtered live) ──
function handleGetDashboardStats(data) {
  try {
    var now = new Date();
    var dateFrom, dateTo;
    if (data && data.dateFrom && data.dateTo) {
      dateFrom = new Date(data.dateFrom);
      dateTo   = new Date(data.dateTo);
    } else if (data && data.year && data.month) {
      var y = parseInt(data.year,  10);
      var m = parseInt(data.month, 10) - 1;
      dateFrom = new Date(y, m,   1,  0,  0,  0);
      dateTo   = new Date(y, m+1, 0, 23, 59, 59);
    } else {
      dateFrom = new Date(now.getFullYear(), now.getMonth(),   1,  0,  0,  0);
      dateTo   = new Date(now.getFullYear(), now.getMonth()+1, 0, 23, 59, 59);
    }
    var result = analytics_computeFiltered_({
      dateFrom:  dateFrom,
      dateTo:    dateTo,
      adminArea: (data && data.adminArea) || "",
      employee:  (data && data.employee)  || ""
    });
    return { success: true, data: result };
  } catch (e) {
    logError("handleGetDashboardStats", e.message, "");
    return { success: false, error: e.message };
  }
}

// ── 3.20 UPDATE CAR RESPONSE ──
function handleUpdateCARResponse(data) {
  var carId     = String((data && data.carId)     || "").trim();
  var response  = String((data && data.response)  || "").trim();
  var updatedBy = String((data && data.updatedBy) || "").trim();

  if (!carId || !response) return { success: false, error: "carId والرد مطلوبان" };

  var lock = LockService.getScriptLock();
  lock.waitLock(15000);

  try {
    var sheet   = getCarSheet(BE_CAR_SHEETS.CAR_REGISTER);
    var rows    = sheet.getDataRange().getValues();
    var headers = rows[0].map(function(h) { return String(h).trim(); });

    var colCarId    = headers.indexOf("car_id")       + 1;
    var colResponse = headers.indexOf("response")     + 1;
    var colRespDate = headers.indexOf("response_date") + 1;
    var colNotes    = headers.indexOf("notes")        + 1;

    if (!colCarId || !colResponse) return { success: false, error: "هيكل CAR_REGISTER غير متوافق" };

    for (var i = 1; i < rows.length; i++) {
      if (String(rows[i][colCarId - 1] || "").trim() !== carId) continue;

      sheet.getRange(i + 1, colResponse).setValue(response);
      if (colRespDate) sheet.getRange(i + 1, colRespDate).setValue(new Date());
      if (colNotes && data.notes) sheet.getRange(i + 1, colNotes).setValue(String(data.notes));

      writeAuditLog(updatedBy || "النظام", "updateCARResponse", carId, "", response);
      return { success: true };
    }

    return { success: false, error: "CAR غير موجود: " + carId };
  } finally {
    lock.releaseLock();
  }
}


// ── 3.21 CLOSE CAR ──
function handleCloseCAR(data) {
  var carId       = String((data && data.carId)       || "").trim();
  var evidenceUrl = String((data && data.evidenceUrl) || "").trim();
  var closedBy    = String((data && data.closedBy)    || "").trim();
  var notes       = String((data && data.notes)       || "").trim();

  if (!carId) return { success: false, error: "carId مطلوب" };

  var lock = LockService.getScriptLock();
  lock.waitLock(15000);

  try {
    var sheet   = getCarSheet(BE_CAR_SHEETS.CAR_REGISTER);
    var rows    = sheet.getDataRange().getValues();
    var headers = rows[0].map(function(h) { return String(h).trim(); });

    var colCarId    = headers.indexOf("car_id")        + 1;
    var colStatus   = headers.indexOf("status")        + 1;
    var colRespDate = headers.indexOf("response_date") + 1;
    var colNotes    = headers.indexOf("notes")         + 1;

    if (!colCarId || !colStatus) return { success: false, error: "هيكل CAR_REGISTER غير متوافق" };

    for (var i = 1; i < rows.length; i++) {
      if (String(rows[i][colCarId - 1] || "").trim() !== carId) continue;

      var oldStatus = rows[i][colStatus - 1];
      sheet.getRange(i + 1, colStatus).setValue("مغلق");
      if (colRespDate) sheet.getRange(i + 1, colRespDate).setValue(new Date());
      if (colNotes && notes) sheet.getRange(i + 1, colNotes).setValue(notes);

      // تحديث OP_FINDINGS: كل المخالفات المرتبطة بهذا الـ CAR → مغلق
      try {
        var fSheet    = getCarSheet(BE_CAR_SHEETS.FINDINGS);
        var fRows     = fSheet.getDataRange().getValues();
        var fHeaders  = fRows[0].map(function(h) { return String(h).trim(); });
        var fColCarId = fHeaders.indexOf("car_id") + 1;
        var fColSt    = fHeaders.indexOf("status")  + 1;
        if (fColCarId && fColSt) {
          for (var j = 1; j < fRows.length; j++) {
            if (String(fRows[j][fColCarId - 1] || "").trim() === carId) {
              fSheet.getRange(j + 1, fColSt).setValue("مغلق");
            }
          }
        }
      } catch(e) { /* لا يوقف إغلاق الـ CAR */ }

      // تحديث CAR_SECTIONS: كل أقسام هذا الـ CAR → staff_status = مغلق
      try {
        var secSheet   = getCarSheet(BE_CAR_SHEETS.CAR_SECTIONS);
        var secRows    = secSheet.getDataRange().getValues();
        var secHeaders = secRows[0].map(function(h) { return String(h).trim(); });
        var sColCarId  = secHeaders.indexOf("car_id")           + 1;
        var sColStatus = secHeaders.indexOf("staff_status")     + 1;
        var sColBy     = secHeaders.indexOf("staff_updated_by") + 1;
        var sColAt     = secHeaders.indexOf("staff_updated_at") + 1;
        if (sColCarId && sColStatus) {
          for (var k = 1; k < secRows.length; k++) {
            if (String(secRows[k][sColCarId - 1] || "").trim() === carId) {
              secSheet.getRange(k + 1, sColStatus).setValue("مغلق");
              if (sColBy) secSheet.getRange(k + 1, sColBy).setValue(closedBy || "النظام");
              if (sColAt) secSheet.getRange(k + 1, sColAt).setValue(new Date());
            }
          }
        }
      } catch(e) { /* لا يوقف إغلاق الـ CAR */ }

      writeAuditLog(closedBy || "النظام", "closeCAR", carId, oldStatus, "مغلق | evidence: " + (evidenceUrl || "—"));
      return { success: true };
    }

    return { success: false, error: "CAR غير موجود: " + carId };
  } finally {
    lock.releaseLock();
  }
}


// ============================================================
// 3. HANDLERS — CAR_SECTIONS (جديد v8.5)
// ============================================================

// ── 3.22 GET CAR SECTIONS (داخلي) ──
function handleGetCARSections(data) {
  var carId = String((data && data.car_id) || "").trim();
  try {
    var sheet = getCarSheet(BE_CAR_SHEETS.CAR_SECTIONS);
    var rows  = sheet.getDataRange().getValues();
    if (rows.length < 2) return { success: true, sections: [] };

    var headers  = rows[0];
    var sections = [];

    for (var i = 1; i < rows.length; i++) {
      var row = rows[i];
      if (!row[0]) continue;
      var obj = {};
      headers.forEach(function(h, j) { obj[String(h).trim()] = safeStr_(row[j]); });
      if (carId && obj["car_id"] !== carId) continue;
      obj.rowIndex = i + 1;
      sections.push(obj);
    }

    return { success: true, sections: sections };
  } catch(e) {
    logError("handleGetCARSections", e.message, "");
    return { success: false, error: e.message };
  }
}


// ── 3.23 UPDATE SECTION STATUS (داخلي فقط) ──
function handleUpdateSectionStatus(data) {
  var carId       = String((data && data.car_id)       || "").trim();
  var sectionName = String((data && data.section_name) || "").trim();
  var staffStatus = String((data && data.staff_status) || "").trim();
  var staffNote   = String((data && data.staff_note)   || "").trim();
  var updatedBy   = String((data && data.updated_by)   || "").trim();

  if (!carId || !sectionName || !staffStatus || !updatedBy)
    return { success: false, error: "بيانات ناقصة" };

  var allowed = Object.values(SECTION_STATUS);
  if (allowed.indexOf(staffStatus) === -1)
    return { success: false, error: "حالة غير صحيحة: " + staffStatus };

  var lock = LockService.getScriptLock();
  lock.waitLock(15000);

  try {
    var sheet   = getCarSheet(BE_CAR_SHEETS.CAR_SECTIONS);
    var rows    = sheet.getDataRange().getValues();
    var headers = rows[0].map(function(h) { return String(h).trim(); });

    var colCarId     = headers.indexOf("car_id")          + 1;
    var colSecName   = headers.indexOf("section_name")    + 1;
    var colStatus    = headers.indexOf("staff_status")    + 1;
    var colNote      = headers.indexOf("staff_note")      + 1;
    var colUpdBy     = headers.indexOf("staff_updated_by") + 1;
    var colUpdAt     = headers.indexOf("staff_updated_at") + 1;

    for (var i = 1; i < rows.length; i++) {
      if (String(rows[i][colCarId   - 1] || "").trim() !== carId)      continue;
      if (String(rows[i][colSecName - 1] || "").trim() !== sectionName) continue;

      var oldStatus = rows[i][colStatus - 1];
      sheet.getRange(i + 1, colStatus).setValue(staffStatus);
      if (colNote)  sheet.getRange(i + 1, colNote ).setValue(staffNote);
      if (colUpdBy) sheet.getRange(i + 1, colUpdBy).setValue(updatedBy);
      if (colUpdAt) sheet.getRange(i + 1, colUpdAt).setValue(new Date());

      writeAuditLog(updatedBy, "updateSectionStatus",
        carId + "/" + sectionName, oldStatus, staffStatus);
      return { success: true };
    }

    return { success: false, error: "القسم غير موجود" };
  } finally {
    lock.releaseLock();
  }
}


// ── 3.26 UPDATE FINDING STATUS ──
function handleUpdateFindingStatus(data) {
  var findingId   = String((data && data.finding_id)        || "").trim();
  var newStatus   = String((data && data.status)            || "").trim();
  var respParty   = String((data && data.responsible_party) || "").trim();
  var updatedBy   = String((data && data.updated_by)        || "").trim();
  var comment     = String((data && data.comment)           || "").trim();

  if (!findingId || !newStatus || !updatedBy)
    return { success: false, error: "بيانات ناقصة: finding_id, status, updated_by" };

  var allowed = ["مفتوح", "مغلق", "معلق", "قانوني"];
  if (allowed.indexOf(newStatus) === -1)
    return { success: false, error: "حالة غير صحيحة: " + newStatus };

  if (newStatus === "معلق" && !respParty)
    return { success: false, error: "responsible_party مطلوب عند التعليق" };

  var lock = LockService.getScriptLock();
  lock.waitLock(15000);

  try {
    var sheet   = getCarSheet(BE_CAR_SHEETS.FINDINGS);
    var rows    = sheet.getDataRange().getValues();
    var headers = rows[0].map(function(h) { return String(h).trim(); });

    var colFindingId  = headers.indexOf("finding_id")        + 1;
    var colStatus     = headers.indexOf("status")            + 1;
    var colRespParty  = headers.indexOf("responsible_party") + 1;
    var colLegalDate  = headers.indexOf("legal_date")        + 1;
    var colComments   = headers.indexOf("comments")          + 1;

    if (!colFindingId || !colStatus)
      return { success: false, error: "أعمدة الشيت غير مكتملة" };

    for (var i = 1; i < rows.length; i++) {
      if (String(rows[i][colFindingId - 1] || "").trim() !== findingId) continue;

      var oldStatus = rows[i][colStatus - 1];
      sheet.getRange(i + 1, colStatus).setValue(newStatus);

      if (colRespParty && respParty)
        sheet.getRange(i + 1, colRespParty).setValue(respParty);

      if (colLegalDate && newStatus === "قانوني")
        sheet.getRange(i + 1, colLegalDate).setValue(
          Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd")
        );

      if (colComments && comment) {
        var existing = String(rows[i][colComments - 1] || "").trim();
        var entry    = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd")
                       + " | " + updatedBy + ": " + comment;
        sheet.getRange(i + 1, colComments).setValue(existing ? existing + "\n" + entry : entry);
      }

      writeAuditLog(updatedBy, "updateFindingStatus", findingId, oldStatus, newStatus);
      return { success: true, finding_id: findingId, status: newStatus };
    }

    return { success: false, error: "المخالفة غير موجودة: " + findingId };
  } finally {
    lock.releaseLock();
  }
}


// ============================================================
// 3. HANDLERS — Portal (جديد v8.5)
// ============================================================

// ── 3.24 PORTAL LOGIN ──
function handlePortalLogin(data) {
  var adminCode = String((data && data.admin_code) || "").trim();
  var pin       = normalizeDigits_(data && data.pin);

  if (!adminCode || !pin) return { success: false, error: "بيانات ناقصة" };

  var lock = LockService.getScriptLock();
  lock.waitLock(15000);

  try {
    var sheet = getSheet(BE_SHEETS.HEALTH_ADMINS);
    var rows  = sheet.getDataRange().getValues();
    if (rows.length < 2) return { success: false, error: "لا توجد بيانات إدارات" };

    var headers = rows[0].map(function(h) { return String(h).trim(); });
    var h       = {};
    headers.forEach(function(hdr, idx) { h[hdr] = idx; });
    var now = new Date();

    for (var i = 1; i < rows.length; i++) {
      var r = rows[i];
      if (String(r[h["admin_code"]] || "").trim() !== adminCode) continue;

      // فحص القفل
      var lockedUntil = r[h["locked_until"]];
      if (lockedUntil && new Date(lockedUntil) > now) {
        return { success: false, error: "الحساب مقفول حتى " + formatDate(lockedUntil) };
      }

      var rowPin = normalizeDigits_(r[h["PIN"]]);
      if (rowPin !== pin) {
        var failCount = Number(r[h["failed_count"]] || 0) + 1;
        sheet.getRange(i + 1, h["failed_count"] + 1).setValue(failCount);
        sheet.getRange(i + 1, h["last_failed_at"] + 1).setValue(now);

        if (failCount >= PORTAL_MAX_FAILED) {
          var lockUntil = new Date(now.getTime() + 24 * 60 * 60 * 1000);
          sheet.getRange(i + 1, h["locked_until"] + 1).setValue(lockUntil);
          return { success: false, error: "تم قفل الحساب بعد " + PORTAL_MAX_FAILED + " محاولات فاشلة. يُفتح تلقائياً بعد 24 ساعة" };
        }

        return { success: false, error: "رمز الدخول غير صحيح — محاولة " + failCount + "/" + PORTAL_MAX_FAILED };
      }

      // تسجيل دخول ناجح → إعادة تصفير العداد
      sheet.getRange(i + 1, h["failed_count"]  + 1).setValue(0);
      sheet.getRange(i + 1, h["locked_until"]  + 1).setValue("");

      writeAuditLog("portal:" + adminCode, "portalLogin", adminCode, "", "success");
      return {
        success     : true,
        admin_code  : adminCode,
        admin_name  : safeStr_(r[h["admin_name"]]),
        manager_name: safeStr_(r[h["manager_name"]])
      };
    }

    return { success: false, error: "الإدارة غير موجودة" };
  } finally {
    lock.releaseLock();
  }
}


// ── 3.25 PORTAL GET SECTIONS ──
function handlePortalGetSections(data) {
  var adminCode = String((data && data.admin_code) || "").trim();
  if (!adminCode) return { success: false, error: "admin_code مطلوب" };

  try {
    // جلب اسم الإدارة من REF_HEALTH_ADMINS
    var admSheet = getSheet(BE_SHEETS.HEALTH_ADMINS);
    var admRows  = admSheet.getDataRange().getValues();
    var admH     = {};
    admRows[0].forEach(function(h, i) { admH[String(h).trim()] = i; });

    var adminName = "";
    for (var a = 1; a < admRows.length; a++) {
      if (String(admRows[a][admH["admin_code"]] || "").trim() === adminCode) {
        adminName = safeStr_(admRows[a][admH["admin_name"]]);
        break;
      }
    }

    // جلب CAR_SECTIONS المطابقة
    var sheet   = getCarSheet(BE_CAR_SHEETS.CAR_SECTIONS);
    var rows    = sheet.getDataRange().getValues();
    if (rows.length < 2) return { success: true, sections: [], admin_name: adminName };

    var headers = rows[0];
    var h       = {};
    headers.forEach(function(hdr, idx) { h[String(hdr).trim()] = idx; });

    var sections = [];
    for (var i = 1; i < rows.length; i++) {
      var r = rows[i];
      if (!r[h["car_id"]]) continue;

      // فلترة بالإدارة الصحية
      var facility = safeStr_(r[h["facility_name"]]);
      if (adminName && facility.indexOf(adminName) === -1) continue;

      sections.push({
        car_id           : safeStr_(r[h["car_id"]]),
        report_id        : safeStr_(r[h["report_id"]]),
        facility_name    : facility,
        section_name     : safeStr_(r[h["section_name"]]),
        findings_count   : safeStr_(r[h["findings_count"]]),
        findings_text    : safeStr_(r[h["findings_text"]]),
        portal_response  : safeStr_(r[h["portal_response"]]),
        portal_replied_at: safeStr_(r[h["portal_replied_at"]]),
        staff_status     : safeStr_(r[h["staff_status"]]),
        rowIndex         : i + 1
      });
    }

    return { success: true, sections: sections, admin_name: adminName };
  } catch(e) {
    logError("handlePortalGetSections", e.message, adminCode);
    return { success: false, error: e.message };
  }
}


// ── 3.26 PORTAL SUBMIT RESPONSE ──
function handlePortalSubmitResponse(data) {
  var adminCode   = String((data && data.admin_code)   || "").trim();
  var carId       = String((data && data.car_id)       || "").trim();
  var sectionName = String((data && data.section_name) || "").trim();
  var response    = String((data && data.response)     || "").trim();

  if (!adminCode || !carId || !sectionName || !response)
    return { success: false, error: "بيانات ناقصة" };

  var lock = LockService.getScriptLock();
  lock.waitLock(15000);

  try {
    var sheet   = getCarSheet(BE_CAR_SHEETS.CAR_SECTIONS);
    var rows    = sheet.getDataRange().getValues();
    var headers = rows[0].map(function(h) { return String(h).trim(); });

    var colCarId    = headers.indexOf("car_id")           + 1;
    var colSecName  = headers.indexOf("section_name")     + 1;
    var colResponse = headers.indexOf("portal_response")  + 1;
    var colRepliedAt= headers.indexOf("portal_replied_at") + 1;

    for (var i = 1; i < rows.length; i++) {
      if (String(rows[i][colCarId   - 1] || "").trim() !== carId)      continue;
      if (String(rows[i][colSecName - 1] || "").trim() !== sectionName) continue;

      if (colResponse)  sheet.getRange(i + 1, colResponse ).setValue(response);
      if (colRepliedAt) sheet.getRange(i + 1, colRepliedAt).setValue(new Date());

      writeAuditLog("portal:" + adminCode, "portalSubmitResponse",
        carId + "/" + sectionName, "", response.substring(0, 80));
      return { success: true };
    }

    return { success: false, error: "القسم غير موجود" };
  } finally {
    lock.releaseLock();
  }
}


// ============================================================
// 4. HELPERS — بناء الكائنات
// ============================================================

function buildTaskObj_(row, idx) {
  return {
    id             : safeStr_(row[BE_INOUT_COL.RECORD_ID   - 1]),
    docType        : safeStr_(row[BE_INOUT_COL.DOC_TYPE    - 1]),
    date           : formatDate(row[BE_INOUT_COL.DATE       - 1]),
    source         : safeStr_(row[BE_INOUT_COL.SOURCE      - 1]),
    entity         : safeStr_(row[BE_INOUT_COL.ENTITY      - 1]),
    subject        : safeStr_(row[BE_INOUT_COL.SUBJECT     - 1]),
    caseNumber     : safeStr_(row[BE_INOUT_COL.CASE_NUM    - 1]),
    caseYear       : safeStr_(row[BE_INOUT_COL.CASE_YEAR   - 1]),
    transactionType: safeStr_(row[BE_INOUT_COL.TXN_TYPE    - 1]),
    importance     : safeStr_(row[BE_INOUT_COL.IMPORTANCE  - 1]),
    urgency        : safeStr_(row[BE_INOUT_COL.URGENCY     - 1]),
    assignee       : safeStr_(row[BE_INOUT_COL.ASSIGNED_TO - 1]),
    status         : safeStr_(row[BE_INOUT_COL.STATUS      - 1]),
    assignDate     : formatDate(row[BE_INOUT_COL.ASSIGN_DATE - 1]),
    deadline       : formatDate(row[BE_INOUT_COL.DUE_DATE  - 1]),
    dueDate        : formatDate(row[BE_INOUT_COL.DUE_DATE  - 1]),
    daysLeft       : safeStr_(row[BE_INOUT_COL.DAYS_LEFT   - 1]),
    completionDate : formatDate(row[BE_INOUT_COL.DONE_DATE - 1]),
    attachment     : safeStr_(row[BE_INOUT_COL.ATTACH_URL  - 1]),
    archive        : safeStr_(row[BE_INOUT_COL.ARCHIVE_URL - 1]),
    notes          : safeStr_(row[BE_INOUT_COL.NOTES       - 1]),
    uuid           : safeStr_(row[BE_INOUT_COL.UUID        - 1]),
    parentId       : safeStr_(row[BE_INOUT_COL.PARENT_ID   - 1]),
    rowIndex       : idx + 1
  };
}

function buildNotifTitle_(type) {
  if (!type) return "إشعار جديد";
  if (type.includes("تكليف") || type.includes("assign"))     return "تكليف جديد";
  if (type.includes("تحديث") || type.includes("update"))     return "تحديث حالة";
  if (type.includes("تذكير") || type.includes("remind"))     return "تذكير";
  if (type.includes("شكوى")  || type.includes("complaint"))  return "شكوى جديدة";
  if (type.includes("تقرير") || type.includes("report"))     return "تقرير جديد";
  return type;
}

function buildNotifMessage_(type, taskData) {
  if (!taskData) return type || "لا توجد تفاصيل";
  try {
    var obj = JSON.parse(taskData);
    if (obj.subject) return obj.subject;
    if (obj.message) return obj.message;
    return taskData;
  } catch (e) {
    return taskData;
  }
}


// ============================================================
// 5. HELPERS — عامة
// ============================================================

function getSheet(name) {
  var ss    = SpreadsheetApp.openById(BE_SS_ID);
  var sheet = ss.getSheetByName(name);
  if (!sheet) throw new Error("الشيت غير موجود: " + name);
  return sheet;
}

function getCarSheet(name) {
  var ss    = SpreadsheetApp.openById(BE_CAR_SS_ID);
  var sheet = ss.getSheetByName(name);
  if (!sheet) throw new Error("CAR شيت غير موجود: " + name);
  return sheet;
}

function buildResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function getEmployeesData_() {
  var sheet   = getSheet(BE_SHEETS.EMPLOYEES);
  var allRows = sheet.getDataRange().getValues();

  if (!allRows || allRows.length < 2) {
    throw new Error("شيت EMPLOYEES فارغ أو لا يحتوي بيانات");
  }

  var headers = allRows[0].map(function(h) {
    return String(h == null ? "" : h).trim();
  });

  var required = [
    BE_EMP_HEADERS.NAME, BE_EMP_HEADERS.EMAIL, BE_EMP_HEADERS.JOB_TITLE,
    BE_EMP_HEADERS.SPECIALTY, BE_EMP_HEADERS.ACTIVE, BE_EMP_HEADERS.PIN,
    BE_EMP_HEADERS.ROLE, BE_EMP_HEADERS.MOBILE
  ];

  var missing = required.filter(function(h) { return headers.indexOf(h) === -1; });
  if (missing.length > 0) {
    throw new Error("هيدرز EMPLOYEES ناقصة: " + missing.join(" , "));
  }

  return {
    headers: headers,
    rows   : allRows.slice(1),
    col    : function(name) {
      var idx = headers.indexOf(name);
      if (idx === -1) throw new Error("الهيدر غير موجود: " + name);
      return idx;
    }
  };
}

function formatDate(val) {
  if (!val) return "";
  try {
    var d = new Date(val);
    if (isNaN(d.getTime())) return String(val);
    return Utilities.formatDate(d, "Africa/Cairo", "dd/MM/yyyy");
  } catch (e) { return String(val); }
}

function formatDateTime(val) {
  if (!val) return "";
  try {
    var d = new Date(val);
    if (isNaN(d.getTime())) return String(val);
    return Utilities.formatDate(d, "Africa/Cairo", "yyyy-MM-dd HH:mm:ss");
  } catch (e) { return String(val); }
}

function isDoneStatus_(status) {
  return BE_DONE_STATUSES.indexOf(String(status || "").trim()) !== -1;
}

function isAdminRole_(role) {
  var r = String(role || "").trim();
  return r === "مدير" || r === "Admin" || r === "منسق" || r === "coordinator";
}

function isTruthyActive_(val) {
  if (val === true || val === 1) return true;
  var s = String(val == null ? "" : val).trim().toUpperCase();
  return s === "TRUE" || s === "YES" || s === "1" || s === "نعم" ||
         s === "نشط"  || s === "ACTIVE" || s === "مفعل" || s === "فعال" || s === "OK";
}

function normalizeDigits_(value) {
  var s  = String(value == null ? "" : value).trim();
  var ar = "٠١٢٣٤٥٦٧٨٩";
  var en = "0123456789";
  for (var i = 0; i < ar.length; i++) {
    s = s.split(ar[i]).join(en[i]);
  }
  return s.replace(/\s+/g, "");
}

function safeStr_(val) {
  return val == null ? "" : String(val);
}

function safeStringify_(obj) {
  try { return JSON.stringify(obj); } catch (e) { return String(obj); }
}

function writeAuditLog(user, action, target, oldVal, newVal) {
  try {
    var sheet = getSheet(BE_SHEETS.AUDIT_LOG);
    sheet.appendRow([new Date(), user, action, target, JSON.stringify(oldVal), JSON.stringify(newVal), ""]);
  } catch (e) { /* لا يوقف العملية الأصلية */ }
}

function logError(context, message, details) {
  try {
    var sheet = getSheet(BE_SHEETS.ERRORS_LOG);
    sheet.appendRow([new Date(), context, message, details]);
  } catch (e) { /* silent */ }
}