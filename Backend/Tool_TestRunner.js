/* ==========================================================================
   00_TestRunner.gs  (IAG System V8.1)
   🧪 اختبار شامل بآخر بيانات حقيقية من كل شيت
   ──────────────────────────────────────────────
   كل دالة اختبار بتجيب آخر صف من الشيت المقابل
   وتنفذه كأنه تقرير حقيقي — بيانات حقيقية، إيميلات حقيقية، شعارات حقيقية.

   قائمة الاختبارات:
     testAll()                   ← شغّل كل الاختبارات دفعة واحدة
     testComplaintReport()       ← آخر شكوى
     testFinancialReport()       ← آخر مرور مالي
     testTechHospReport()        ← آخر مرور فني مستشفيات
     testTechUnitsReport()       ← آخر مرور فني وحدات
     testEmailEngine()           ← بيانات آخر موظف + إيميل حقيقي
     testAIEngine()              ← نص آخر شكوى → تصحيح AI
     testLogo()                  ← تحقق من ظهور الشعار في الإيميل
   ========================================================================== */

/* ─── مساعد: اجلب آخر صف من شيت وحوّله لـ object ─────────────────────────── */
function testRunner_getLastRow_(sheetName) {
  var ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  var sh = ss.getSheetByName(sheetName);
  if (!sh) throw new Error("❌ الشيت مش موجود: " + sheetName);
  var lastRow = sh.getLastRow();
  if (lastRow < 2) throw new Error("❌ لا توجد بيانات في: " + sheetName);
  var headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  var vals    = sh.getRange(lastRow, 1, 1, sh.getLastColumn()).getValues()[0];
  var data = {};
  headers.forEach(function (h, i) { if (h) data[String(h).trim()] = vals[i]; });
  return data;
}

/* مساعد: اجلب آخر صف كـ namedValues (للدوال اللي بتاخد event) */
function testRunner_getLastRowAsNamedValues_(sheetName) {
  var ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  var sh = ss.getSheetByName(sheetName);
  if (!sh) throw new Error("❌ الشيت مش موجود: " + sheetName);
  var lastRow = sh.getLastRow();
  if (lastRow < 2) throw new Error("❌ لا توجد بيانات في: " + sheetName);
  var headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  var vals    = sh.getRange(lastRow, 1, 1, sh.getLastColumn()).getValues()[0];
  var namedValues = {};
  headers.forEach(function (h, i) {
    var key = String(h || "").trim();
    if (key) namedValues[key] = [vals[i]];
  });
  return namedValues;
}

/* مساعد: طباعة نتيجة موحدة */
function testRunner_log_(testName, result) {
  if (result && result.ok) {
    console.log("✅ [" + testName + "] نجح — " + (result.docUrl || result.key || JSON.stringify(result)));
  } else {
    console.error("❌ [" + testName + "] فشل — " + (result && result.error ? result.error : JSON.stringify(result)));
  }
  return result;
}

/* ============================================================
   1. تقرير فحص الشكوى
   الشيت: COMPLAINTS_RESPONSES
   ينفذ: rptComplaint_create_(data)
   ============================================================ */
function testComplaintReport() {
  console.log("🧪 اختبار تقرير الشكوى — آخر صف من COMPLAINTS_RESPONSES");
  var data = testRunner_getLastRow_(SHEETS.COMPLAINTS_RESPONSES);
  console.log("📋 البيانات:", JSON.stringify(data).substring(0, 300));
  var result = rptComplaint_create_(data);
  return testRunner_log_("testComplaintReport", result);
}

/* ============================================================
   2. تقرير المرور المالي
   الشيت: FIN_RESPONSES
   ينفذ: rptFin_create_(data, ctx)
   ============================================================ */
function testFinancialReport() {
  console.log("🧪 اختبار المرور المالي — آخر صف من FIN_RESPONSES");
  var data = testRunner_getLastRow_(SHEETS.FIN_RESPONSES);
  console.log("📋 البيانات:", JSON.stringify(data).substring(0, 300));
  var result = rptFin_create_(data, { user: "MANUAL_TEST" });
  return testRunner_log_("testFinancialReport", result);
}

/* ============================================================
   3. تقرير المرور الفني للمستشفيات
   الشيت: TECH_HOSP_RESPONSES
   ينفذ: rptTechHosp_onSubmit({ namedValues })
   ============================================================ */
function testTechHospReport() {
  console.log("🧪 اختبار المرور الفني مستشفيات — آخر صف من TECH_HOSP_RESPONSES");
  var namedValues = testRunner_getLastRowAsNamedValues_(SHEETS.TECH_HOSP_RESPONSES);
  console.log("📋 المفاتيح:", Object.keys(namedValues).join(" | "));
  var result = rptTechHosp_onSubmit({ namedValues: namedValues });
  return testRunner_log_("testTechHospReport", result);
}

/* ============================================================
   4. تقرير المرور الفني للوحدات
   الشيت: TECH_UNITS_RESPONSES
   ينفذ: rptTechUnits_testLastRow()
   ============================================================ */
function testTechUnitsReport() {
  console.log("🧪 اختبار المرور الفني وحدات — آخر صف من TECH_UNITS_RESPONSES");
  var result = rptTechUnits_testLastRow();
  return testRunner_log_("testTechUnitsReport", result);
}

/* ============================================================
   5. اختبار EmailEngine
   بيجيب بيانات آخر موظف من EMPLOYEES
   وبيبعتله إيميل تقرير تجريبي حقيقي
   ============================================================ */
function testEmailEngine() {
  console.log("🧪 اختبار EmailEngine — آخر موظف من EMPLOYEES");
  var ss  = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  var sh  = ss.getSheetByName(SHEETS.EMPLOYEES);
  if (!sh || sh.getLastRow() < 2) throw new Error("❌ لا توجد بيانات في EMPLOYEES");

  var empMap = schemaV8_buildHeaderMap(sh);
  var rows   = sh.getRange(2, 1, sh.getLastRow() - 1, sh.getLastColumn()).getValues();

  // نجيب آخر موظف نشط عنده إيميل
  var emp = null;
  for (var i = rows.length - 1; i >= 0; i--) {
    var active = rows[i][empMap["نشط"]];
    var email  = String(rows[i][empMap["الايميل"] !== undefined ? empMap["الايميل"] : empMap["الإيميل"]] || "").trim();
    if ((active === true || String(active).toLowerCase() === "true") && email) {
      emp = {
        name:  String(rows[i][empMap["الاسم"]] || "").trim() || "موظف",
        email: email,
        title: String(rows[i][empMap["المسمى_الوظيفي"] !== undefined ? empMap["المسمى_الوظيفي"] : empMap["المسمى الوظيفي"]] || "").trim()
      };
      break;
    }
  }
  if (!emp) throw new Error("❌ لم يُعثر على موظف نشط بإيميل في EMPLOYEES");
  console.log("👤 الموظف:", emp.name, "—", emp.email, "—", emp.title);

  // نجيب آخر شكوى عشان البيانات تكون حقيقية
  var lastData = {};
  try { lastData = testRunner_getLastRow_(SHEETS.COMPLAINTS_RESPONSES); } catch(e) {}
  var entityOrId = String(lastData["رقم القيد بسجل الوارد"] || lastData["رقم_القيد"] || "TEST-001").trim();
  var dateStr    = fmtV8_dateArabic(new Date());

  var result = emailV8_sendReportEmail({
    reportType:  "COMPLAINT",
    authorName:  emp.name,
    authorEmail: emp.email,
    entityOrId:  "شكوى " + entityOrId,
    dateStr:     dateStr,
    docUrl:      "https://docs.google.com/document/d/TEST",
    pdfBlob:     null,
    addressee:   "وكيل الوزارة"
  });

  var ok = (result === undefined || (result && result.sent !== false));
  testRunner_log_("testEmailEngine", { ok: ok, email: emp.email });
  return { ok: ok, email: emp.email };
}

/* ============================================================
   6. اختبار AI Engine
   بيجيب نص آخر شكوى ويصلحه بالـ AI
   ============================================================ */
function testAIEngine() {
  console.log("🧪 اختبار AI Engine — نص آخر شكوى");
  var data = testRunner_getLastRow_(SHEETS.COMPLAINTS_RESPONSES);

  // نجيب أطول حقل نصي
  var textToTest = "";
  var fieldUsed  = "";
  ["الفحص", "الإجراءات", "مضمون الشكوى", "الرأي"].forEach(function(k) {
    var v = String(data[k] || "").trim();
    if (v.length > textToTest.length) { textToTest = v; fieldUsed = k; }
  });

  if (!textToTest) throw new Error("❌ لا يوجد نص في آخر شكوى لاختبار الـ AI");
  console.log("📝 الحقل:", fieldUsed, "— طول النص:", textToTest.length, "حرف");
  console.log("📝 النص الأصلي (أول 200 حرف):", textToTest.substring(0, 200));

  var corrected = aiV8_correctText(textToTest, { mode: "fix_only", context: "complaint" });
  console.log("✨ النص المصحح (أول 200 حرف):", String(corrected || "").substring(0, 200));

  var ok = !!(corrected && corrected.length > 0);
  testRunner_log_("testAIEngine", { ok: ok, field: fieldUsed, originalLen: textToTest.length, correctedLen: (corrected || "").length });
  return { ok: ok, field: fieldUsed, corrected: corrected };
}

/* ============================================================
   7. اختبار الشعار (Logo)
   بيبعت إيميل تجريبي ويتحقق إن الـ URL شغال
   ============================================================ */
function testLogo() {
  console.log("🧪 اختبار الشعار — التحقق من URL وظهوره في الإيميل");
  var logoUrl = emailV81_LOGO_URL;
  console.log("🖼️ Logo URL:", logoUrl);

  // نتحقق إن الـ URL مش فاضي
  if (!logoUrl || logoUrl.indexOf("drive.google.com") === -1) {
    testRunner_log_("testLogo", { ok: false, error: "URL الشعار غير صحيح: " + logoUrl });
    return { ok: false };
  }

  // نبني HTML مبسط ونتحقق إن الشعار داخله
  var html = emailV81_tplComplaintReport_({
    recipientName: "موظف الاختبار",
    entity:        "اختبار رقم 001",
    dateStr:       fmtV8_dateArabic(new Date()),
    docUrl:        "https://docs.google.com/document/d/TEST",
    addressee:     "وكيل الوزارة"
  });

  var hasLogo = html.indexOf(logoUrl) !== -1;
  console.log(hasLogo ? "✅ الشعار موجود في HTML الإيميل" : "❌ الشعار مش موجود في HTML الإيميل");
  testRunner_log_("testLogo", { ok: hasLogo, logoUrl: logoUrl });
  return { ok: hasLogo, logoUrl: logoUrl };
}

/* ============================================================
   8. testAll — شغّل كل الاختبارات
   ============================================================ */
function testAll() {
  console.log("═══════════════════════════════════════════");
  console.log("🚀 IAG V8.1 — تشغيل كل الاختبارات");
  console.log("═══════════════════════════════════════════");

  var results = {};
  var tests = [
    { name: "تقرير الشكوى",          fn: testComplaintReport   },
    { name: "المرور المالي",          fn: testFinancialReport   },
    { name: "المرور الفني مستشفيات",  fn: testTechHospReport    },
    { name: "المرور الفني وحدات",     fn: testTechUnitsReport   },
    { name: "EmailEngine",            fn: testEmailEngine       },
    { name: "AI Engine",              fn: testAIEngine          },
    { name: "الشعار",                 fn: testLogo              }
  ];

  var passed = 0, failed = 0;

  tests.forEach(function(t) {
    console.log("\n── " + t.name + " ──");
    try {
      var res = t.fn();
      results[t.name] = res;
      if (res && res.ok) passed++;
      else failed++;
    } catch(e) {
      console.error("💥 خطأ غير متوقع في [" + t.name + "]:", e.message);
      results[t.name] = { ok: false, error: e.message };
      failed++;
    }
  });

  console.log("\n═══════════════════════════════════════════");
  console.log("📊 النتيجة: " + passed + " نجح | " + failed + " فشل");
  console.log("═══════════════════════════════════════════");

  return results;
}