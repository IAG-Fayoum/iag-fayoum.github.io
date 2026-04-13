/**
 * 15_AuditEngine.js
 * مصدر موحد لتوثيق السجلات (Audit) والأخطاء (Errors)
 * ينقي البيانات (Sanitization) ويغلف التنفيذ بـ try...catch
 */

function auditEngine_sanitize_(data) {
  if (data === undefined || data === null) return "";
  var str = typeof data === "string" ? data : JSON.stringify(data);
  // تنقية البيانات الحساسة المحتملة البسيطة
  str = str.replace(/"pin"\s*:\s*"?\w+"?/gi, '"pin":"***"');
  str = str.replace(/"password"\s*:\s*"?\w+"?/gi, '"password":"***"');
  if (str.length > 5000) {
    str = str.substring(0, 5000) + "...[TRUNCATED]";
  }
  return str;
}

function auditEngine_logEvent(user, action, target, oldVal, newVal, status) {
  try {
    var ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    var sh = ss.getSheetByName(CONFIG.SHEETS.AUDIT_LOG);
    if (!sh) return;
    
    var o = auditEngine_sanitize_(oldVal);
    var n = auditEngine_sanitize_(newVal);
    var u = user || "SYSTEM";
    
    sh.appendRow([new Date(), u, action || "", target || "", o, n, status || ""]);
  } catch (e) {
    try { console.error("auditEngine_logEvent Error: " + e.message); } catch (_) {}
  }
}

function auditEngine_logError(context, errorMessage, details) {
  try {
    var ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    var sh = ss.getSheetByName(CONFIG.SHEETS.ERRORS_LOG);
    if (!sh) return;
    
    var det = auditEngine_sanitize_(details);
    var err = errorMessage && typeof errorMessage === "object" && errorMessage.message ? errorMessage.message : String(errorMessage || "");
    
    sh.appendRow([new Date(), String(context || ""), err, det]);
  } catch (e) {
    try { console.error("auditEngine_logError failed: " + e.message); } catch (_) {}
  }
}

// ============================================================
// Legacy Aliases — إزالة الازدواجية مع الحفاظ على التوافق
// ============================================================

function govV8_audit(actionType, details, oldValue, newValue) {
  var user = "SYSTEM";
  try { if (typeof gov_getUser_ === "function") user = gov_getUser_(); } catch(e){}
  auditEngine_logEvent(user, actionType, details, oldValue, newValue, "");
}

function govV8_logError(context, err) {
  auditEngine_logError(context, err, "");
}

function gov_audit_(actionType, details, oldValue, newValue) {
  govV8_audit(actionType, details, oldValue, newValue);
}

function gov_logError_(context, err) {
  govV8_logError(context, err);
}
