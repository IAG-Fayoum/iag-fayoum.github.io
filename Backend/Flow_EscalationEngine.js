/**
 * 13_EscalationEngine.gs  (IAG V0.07)
 *
 * يُصعّد تلقائياً الـ CARs المنتهية مواعيدها بدون استجابة
 * يُشغَّل يومياً عبر dailyEscalationCheck()
 *
 * Entry points:
 *   escalationEngine_runDailyCheck()
 *   escalationEngine_testRun()
 */

/* ============================================================
   SECTION 1 — Escalation Rules
   ============================================================ */

const ESCALATION_RULES = [
  { classification: "مخالفة صريحة", days_overdue: 0,  escalate_to: "وكيل الوزارة",      type: "وزاري" },
  { classification: "خطر كامن",     days_overdue: 2,  escalate_to: "مدير الإدارة الصحية", type: "إداري" },
  { classification: "قصور إداري",   days_overdue: 7,  escalate_to: "مدير الإدارة الصحية", type: "إداري" },
  { classification: "مؤشر",        days_overdue: 14, escalate_to: "مدير الإدارة الصحية", type: "إداري" }
];

/* ============================================================
   SECTION 2 — Entry Points
   ============================================================ */

function escalationEngine_runDailyCheck() {
  return govV8_run(
    "escalationEngine_runDailyCheck",
    { actionType: "ESCALATION_CHECK" },
    function() {
      var carSS     = SpreadsheetApp.openById(CONFIG.CAR_SPREADSHEET_ID);
      var carSh     = carSS.getSheetByName(SHEETS.CAR);
      var findSh    = carSS.getSheetByName(SHEETS.FINDINGS);
      var escalSh   = carSS.getSheetByName(SHEETS.CAR_ESCALATIONS);

      if (!carSh || !findSh || !escalSh) return { ok: true, escalated: 0 };
      if (carSh.getLastRow() < 2) return { ok: true, escalated: 0 };

      var carMap   = escalationEngine_buildHeaderMap_(carSh);
      var findMap  = escalationEngine_buildHeaderMap_(findSh);
      var escalMap = escalationEngine_buildHeaderMap_(escalSh);
      var carData  = carSh.getRange(2, 1, carSh.getLastRow()-1, carSh.getLastColumn()).getValues();
      var findData = findSh.getLastRow() > 1
                     ? findSh.getRange(2, 1, findSh.getLastRow()-1, findSh.getLastColumn()).getValues()
                     : [];
      var now      = new Date(); now.setHours(0,0,0,0);
      var escalated= 0;

      carData.forEach(function(row, idx) {
        var status   = String(row[carMap["status"]]   || "").trim();
        var carId    = String(row[carMap["car_id"]]   || "").trim();
        var deadline = row[carMap["deadline"]];
        if (status !== "مفتوح" || !carId || !deadline) return;

        var deadlineDate = (deadline instanceof Date) ? deadline : new Date(deadline);
        deadlineDate.setHours(0,0,0,0);
        var daysOverdue = Math.floor((now - deadlineDate) / (24*60*60*1000));
        if (daysOverdue < 0) return;

        // ابحث عن الـ classification في OP_FINDINGS
        var findingId      = String(row[carMap["finding_id"]] || "").trim();
        var classification = "مؤشر";
        if (findingId && findMap["finding_id"] !== undefined && findMap["classification"] !== undefined) {
          for (var fi = 0; fi < findData.length; fi++) {
            if (String(findData[fi][findMap["finding_id"]] || "").trim() === findingId) {
              classification = String(findData[fi][findMap["classification"]] || "مؤشر").trim();
              break;
            }
          }
        }

        // تحديد مستوى التصعيد
        var rule = null;
        for (var ri = 0; ri < ESCALATION_RULES.length; ri++) {
          if (ESCALATION_RULES[ri].classification === classification &&
              daysOverdue >= ESCALATION_RULES[ri].days_overdue) {
            rule = ESCALATION_RULES[ri];
            break;
          }
        }
        if (!rule) return;

        // تحقق: مش عملنا تصعيد لهذا الـ CAR قبل كده
        if (escalationEngine_hasEscalation_(escalSh, escalMap, carId)) return;

        var unitName      = String(row[carMap["unit_name"]]      || "").trim();
        var violationText = String(row[carMap["violation_text"]] || "").trim();

        var escalRow = new Array(escalSh.getLastColumn() || 11).fill("");
        var set = function(col, val) {
          var i = escalMap[col];
          if (i !== undefined) escalRow[i] = val;
        };

        set("escalation_id",   "ESC-" + carId.replace("CAR-",""));
        set("finding_id",      findingId);
        set("unit_name",       unitName);
        set("violation_text",  violationText);
        set("escalation_type", rule.type);
        set("escalated_to",    rule.escalate_to);
        set("escalation_date", new Date());
        set("reason",          "تجاوز الموعد النهائي بـ " + daysOverdue + " يوم");
        set("status",          "مفتوح");
        set("notes",           "classification: " + classification);
        set("uuid",            Utilities.getUuid());

        escalSh.appendRow(escalRow);

        // تحديث CAR status
        carSh.getRange(idx+2, carMap["status"]+1).setValue("مصعَّد");

        escalated++;
        auditEngine_logEvent("SYSTEM", "ESCALATION", carId, "", { escalateTo: rule.escalate_to }, "SUCCESS");
      });

      if (escalated > 0) {
        auditEngine_logEvent("SYSTEM", "ESCALATIONS_DONE",
          "صعَّد " + escalated + " CAR", "", { count: escalated }, "SUCCESS");
        try { escalationEngine_notifyManager_(escalated); } catch(e) {
          auditEngine_logError("escalationEngine → notifyManager", e, "");
        }
      }

      return { ok: true, escalated: escalated };
    }
  );
}

function escalationEngine_testRun() {
  try {
    var result = escalationEngine_runDailyCheck();
    SpreadsheetApp.getUi().alert("✅ Escalation Engine\n\n" + JSON.stringify(result, null, 2));
  } catch (e) {
    SpreadsheetApp.getUi().alert("❌ خطأ\n\n" + e.message);
  }
}

/* ============================================================
   SECTION 3 — Helpers
   ============================================================ */

function escalationEngine_hasEscalation_(escalSh, escalMap, carId) {
  if (escalSh.getLastRow() < 2) return false;
  var data = escalSh.getRange(2, 1, escalSh.getLastRow()-1, escalSh.getLastColumn()).getValues();
  var idx  = escalMap["escalation_id"];
  if (idx === undefined) return false;
  var target = "ESC-" + carId.replace("CAR-","");
  for (var i = 0; i < data.length; i++) {
    if (String(data[i][idx]||"").trim() === target) return true;
  }
  return false;
}

function escalationEngine_notifyManager_(count) {
  var email = "";
  try { email = CONFIG.getManagerEmail(); } catch(e) {}
  if (!email) return;
  var subject = "🔺 تنبيه — " + count + " إجراء تصحيحي تجاوز الموعد النهائي";
  var body = "<div dir='rtl' style='font-family:Cairo,Arial'>"
    + "<div style='background:#dc2626;padding:16px;text-align:center;color:#fff;border-radius:8px 8px 0 0'>"
    + "<h2 style='margin:0;font-size:1rem'>🔺 تنبيه تصعيد — إدارة المراجعة الداخلية</h2></div>"
    + "<div style='padding:20px;background:#fef2f2;border:1px solid #fecaca'>"
    + "<p style='margin:0;color:#991b1b'>تم تصعيد <strong>" + count + "</strong> إجراء تصحيحي تجاوز موعده النهائي بدون استجابة.</p>"
    + "<p style='margin:8px 0 0;color:#475569;font-size:.85rem'>يرجى مراجعة شيت <strong>CAR_ESCALATIONS</strong> فوراً.</p>"
    + "</div></div>";
  try { MailApp.sendEmail({ to: email, subject: subject, htmlBody: body }); }
  catch(e) { auditEngine_logError("escalationEngine_notifyManager_", e, ""); }
}

function escalationEngine_buildHeaderMap_(sheet) {
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var map = {};
  headers.forEach(function(h, i) { var k = String(h||"").trim(); if (k) map[k] = i; });
  return map;
}