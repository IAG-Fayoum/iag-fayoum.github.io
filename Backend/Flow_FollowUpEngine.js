/**
 * 11_FollowUpEngine.gs  (IAG V0.07)
 *
 * يولد جدول متابعة تلقائياً من CAR_REGISTER
 * يُستدعى بعد carEngine_processNewFindings_direct_()
 *
 * Entry points:
 *   followUpEngine_processNewCARs_direct_()  ← بدون Lock
 *   followUpEngine_processNewCARs()          ← مع Lock
 *   followUpEngine_testLastBatch()           ← اختبار يدوي
 */

/* ============================================================
   SECTION 1 — Entry Points
   ============================================================ */

function followUpEngine_processNewCARs() {
  return govV8_run(
    "followUpEngine_processNewCARs",
    { actionType: "FOLLOWUP_GENERATE" },
    function() { return followUpEngine_processNewCARs_direct_(); }
  );
}

function followUpEngine_processNewCARs_direct_() {
  try {
  var carSS      = SpreadsheetApp.openById(CONFIG.CAR_SPREADSHEET_ID);
  var carSh      = carSS.getSheetByName(SHEETS.CAR);
  var followSh   = carSS.getSheetByName(SHEETS.CAR_FOLLOWUP);
  var findingsSh = carSS.getSheetByName(SHEETS.FINDINGS);

  if (!carSh)    throw new Error("Missing: " + SHEETS.CAR);
  if (!followSh) throw new Error("Missing: " + SHEETS.CAR_FOLLOWUP);
  if (carSh.getLastRow() < 2) return { ok: true, processed: 0 };

  var carMap    = followUpEngine_buildHeaderMap_(carSh);
  var followMap = followUpEngine_buildHeaderMap_(followSh);
  var carData   = carSh.getRange(2, 1, carSh.getLastRow()-1, carSh.getLastColumn()).getValues();
  var now       = new Date();
  var processed = 0;

  // ── بناء خريطة car_id → هل فيه مخالفة عالية الخطورة ──
  var highSeverityCarIds = {};
  if (findingsSh && findingsSh.getLastRow() > 1) {
    var fMap  = followUpEngine_buildHeaderMap_(findingsSh);
    var fData = findingsSh.getRange(2, 1, findingsSh.getLastRow()-1, findingsSh.getLastColumn()).getValues();
    fData.forEach(function(fr) {
      var fCarId   = String(fr[fMap["car_id"]]   || "").trim();
      var severity = String(fr[fMap["severity"]] || "").trim();
      if (fCarId && severity === "عالي") highSeverityCarIds[fCarId] = true;
    });
  }

  carData.forEach(function(row) {
    var status = String(row[carMap["status"]] || "").trim();
    if (status !== "مفتوح") return;

    var carId     = String(row[carMap["car_id"]]     || "").trim();
    var findingId = String(row[carMap["finding_id"]] || "").trim();
    var unitName  = String(row[carMap["unit_name"]]  || "").trim();
    var deadline  = row[carMap["deadline"]];
    if (!carId) return;

    // تحقق: مش عملنا followup لهذا الـ CAR قبل كده
    if (followUpEngine_carHasFollowup_(followSh, followMap, carId)) return;

    var deadlineDate = (deadline instanceof Date) ? deadline : new Date(deadline || now);
    var followDate   = new Date(deadlineDate.getTime() - 2 * 24 * 60 * 60 * 1000); // قبل الـ deadline بيومين

    var followRow = new Array(followSh.getLastColumn() || 11).fill("");
    var set = function(col, val) {
      var idx = followMap[col];
      if (idx !== undefined) followRow[idx] = val;
    };

    set("followup_id",           "FUP-" + carId.replace("CAR-", ""));
    set("finding_id",            findingId);
    set("car_id",                carId);
    set("unit_name",             unitName);
    set("scheduled_date",        followDate);
    set("officer",               "");
    set("result",                "");
    set("verification_required", highSeverityCarIds[carId] ? "نعم" : "لا");
    set("notes",                 "مجدول تلقائياً");
    set("created_at",            now);
    set("uuid",                  Utilities.getUuid());

    followSh.appendRow(followRow);
    processed++;
  });

  if (processed > 0) {
    auditEngine_logEvent("SYSTEM", "FOLLOWUP_GENERATED",
      "أنشأ " + processed + " متابعة", "", { count: processed }, "SUCCESS");
    try { verificationEngine_processPending_direct_(); } catch (e) {
      auditEngine_logError("followUpEngine → verificationEngine_processPending_direct_", e, "");
    }
  }
  return { ok: true, processed: processed };
  } catch (e) {
    auditEngine_logError("followUpEngine_processNewCARs_direct_", e, "");
    throw e;
  }
}

function followUpEngine_testLastBatch() {
  try {
    var result = followUpEngine_processNewCARs();
    SpreadsheetApp.getUi().alert("✅ FollowUp Engine\n\n" + JSON.stringify(result, null, 2));
  } catch (e) {
    SpreadsheetApp.getUi().alert("❌ خطأ\n\n" + e.message);
  }
}

/* ============================================================
   SECTION 2 — Helpers
   ============================================================ */

function followUpEngine_carHasFollowup_(followSh, followMap, carId) {
  if (followSh.getLastRow() < 2) return false;
  var data  = followSh.getRange(2, 1, followSh.getLastRow()-1, followSh.getLastColumn()).getValues();
  var carIdx= followMap["car_id"];
  if (carIdx === undefined) return false;
  for (var i = 0; i < data.length; i++) {
    if (String(data[i][carIdx] || "").trim() === carId) return true;
  }
  return false;
}

function followUpEngine_buildHeaderMap_(sheet) {
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var map = {};
  headers.forEach(function(h, i) { var k = String(h||"").trim(); if (k) map[k] = i; });
  return map;
}