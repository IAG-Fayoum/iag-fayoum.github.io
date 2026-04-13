/**
 * 12_VerificationEngine.gs  (IAG V0.07)
 *
 * يُنشئ سجلات التحقق في CAR_VERIFICATION
 * للـ followups التي verification_required = نعم
 *
 * Entry points:
 *   verificationEngine_processPending_direct_()
 *   verificationEngine_processPending()
 *   verificationEngine_testLastBatch()
 */

function verificationEngine_processPending() {
  return govV8_run(
    "verificationEngine_processPending",
    { actionType: "VERIFICATION_GENERATE" },
    function() { return verificationEngine_processPending_direct_(); }
  );
}

function verificationEngine_processPending_direct_() {
  try {
  var carSS    = SpreadsheetApp.openById(CONFIG.CAR_SPREADSHEET_ID);
  var followSh = carSS.getSheetByName(SHEETS.CAR_FOLLOWUP);
  var verifSh  = carSS.getSheetByName(SHEETS.CAR_VERIFICATION);

  if (!followSh) throw new Error("Missing: " + SHEETS.CAR_FOLLOWUP);
  if (!verifSh)  throw new Error("Missing: " + SHEETS.CAR_VERIFICATION);
  if (followSh.getLastRow() < 2) return { ok: true, processed: 0 };

  var followMap = verificationEngine_buildHeaderMap_(followSh);
  var verifMap  = verificationEngine_buildHeaderMap_(verifSh);
  var followData= followSh.getRange(2, 1, followSh.getLastRow()-1, followSh.getLastColumn()).getValues();
  var now       = new Date();
  var processed = 0;

  followData.forEach(function(row, idx) {
    var required = String(row[followMap["verification_required"]] || "").trim();
    if (required !== "نعم") return;

    var followId  = String(row[followMap["followup_id"]] || "").trim();
    var findingId = String(row[followMap["finding_id"]]  || "").trim();
    var carId     = String(row[followMap["car_id"]]      || "").trim();
    var unitName  = String(row[followMap["unit_name"]]   || "").trim();
    if (!followId) return;

    if (verificationEngine_hasVerification_(verifSh, verifMap, followId)) return;

    var verifRow = new Array(verifSh.getLastColumn() || 12).fill("");
    var set = function(col, val) {
      var idx = verifMap[col];
      if (idx !== undefined) verifRow[idx] = val;
    };

    set("verification_id",   "VRF-" + followId.replace("FUP-", ""));
    set("finding_id",        findingId);
    set("followup_id",       followId);
    set("unit_name",         unitName);
    set("verification_date", new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000));
    set("officer",           "");
    set("type",              "ميداني");
    set("result",            "");
    set("evidence_url",      "");
    set("notes",             "مجدول تلقائياً");
    set("created_at",        now);
    set("uuid",              Utilities.getUuid());

    verifSh.appendRow(verifRow);
    processed++;
  });

  if (processed > 0)
    auditEngine_logEvent("SYSTEM", "VERIFICATION_GENERATED",
      "أنشأ " + processed + " تحقق", "", { count: processed }, "SUCCESS");

  return { ok: true, processed: processed };
  } catch (e) {
    auditEngine_logError("verificationEngine_processPending_direct_", e, "");
    throw e;
  }
}

function verificationEngine_testLastBatch() {
  try {
    var result = verificationEngine_processPending();
    SpreadsheetApp.getUi().alert("✅ Verification Engine\n\n" + JSON.stringify(result, null, 2));
  } catch (e) {
    SpreadsheetApp.getUi().alert("❌ خطأ\n\n" + e.message);
  }
}

function verificationEngine_hasVerification_(verifSh, verifMap, followId) {
  if (verifSh.getLastRow() < 2) return false;
  var data = verifSh.getRange(2, 1, verifSh.getLastRow()-1, verifSh.getLastColumn()).getValues();
  var idx  = verifMap["followup_id"];
  if (idx === undefined) return false;
  for (var i = 0; i < data.length; i++) {
    if (String(data[i][idx] || "").trim() === followId) return true;
  }
  return false;
}

function verificationEngine_buildHeaderMap_(sheet) {
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var map = {};
  headers.forEach(function(h, i) { var k = String(h||"").trim(); if (k) map[k] = i; });
  return map;
}