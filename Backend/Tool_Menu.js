/**
 * 00_Menu.gs  (IAG V8.1)
 * القائمة المخصصة — تظهر تلقائياً عند فتح الـ Spreadsheet
 */

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("🏛️ نظام IAG")
    .addSubMenu(
      SpreadsheetApp.getUi().createMenu("⚙️ الإعداد")
        .addItem("إعداد التريجرز (شغّل مرة واحدة)", "iagV81_setupAllTriggers")
    )
    .addSeparator()
    .addSubMenu(
      SpreadsheetApp.getUi().createMenu("🔍 الفحص والمراجعة")
        .addItem("فحص شامل للنظام",          "iagV81_runDiagnostics")
        .addItem("فتح قائمة المراجعة",        "iagV81_openChecklist")
    )
    .addSeparator()
    .addSubMenu(
      SpreadsheetApp.getUi().createMenu("🧪 اختبار التقارير")
        .addItem("محاكاة Trigger وارد (بدون فورم)",  "iagTest_simulateTrigger")
        .addSeparator()
        .addItem("اختبار معالجة آخر وارد",           "iagTest_processLastInbound")
        .addItem("اختبار معالجة آخر صادر",           "iagTest_processLastOutbound")
        .addSeparator()
        .addItem("اختبار تقرير الشكاوى",             "rptComplaintV8_testLastRow")
        .addItem("اختبار المرور المالي",              "rptFinAdmV8_testLastRow")
        .addItem("اختبار المرور الفني مستشفيات",     "rptTechHospV7_testLastRow")
        .addItem("اختبار المرور الفني وحدات",        "rptTechUnitsV7_testLastRow")
    )
    .addSeparator()
    .addSubMenu(
      SpreadsheetApp.getUi().createMenu("🏥 تقارير المستشفيات")
        .addItem("إنهاء تقرير مستشفى (إدخال ID)", "trgV8_finalizeHospReport")
        .addItem("عرض جلسات المستشفيات الجارية",  "rptTechHosp_showActiveSessions")
    )
    .addSeparator()
    .addSubMenu(
      SpreadsheetApp.getUi().createMenu("📊 السجلات")
        .addItem("تقرير الأخطاء (آخر 30)",    "iagTest_showErrorsReport")
        .addSeparator()
        .addItem("تنظيف الكاش (Script/User/Document)", "iagV81_clearAllCaches")
        .addSeparator()
        .addItem("فتح سجل التقارير",           "iagV81_openReportsLog")
        .addItem("فتح سجل الأخطاء",           "iagV81_openErrorsLog")
        .addItem("فتح سجل المراجعة",          "iagV81_openAuditLog")
    )
    .addToUi();
}

/* ============================================================
   Helpers للقائمة
   ============================================================ */

function iagV81_openChecklist() {
  var ui = SpreadsheetApp.getUi();
  ui.showSidebar(
    HtmlService.createHtmlOutput(iagV81_checklistHtml_())
      .setTitle("قائمة مراجعة IAG V8.1")
      .setWidth(400)
  );
}

function iagV81_openReportsLog() {
  var sh = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID).getSheetByName(SHEETS.REPORTS_LOG);
  if (!sh) { SpreadsheetApp.getUi().alert("REPORTS_LOG غير موجود بعد — شغّل تقرير أولاً"); return; }
  SpreadsheetApp.getActive().setActiveSheet(sh);
}

function iagV81_openErrorsLog() {
  var sh = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID).getSheetByName(SHEETS.ERRORS_LOG);
  if (!sh) { SpreadsheetApp.getUi().alert("ERRORS_LOG غير موجود بعد — لا توجد أخطاء مسجلة"); return; }
  SpreadsheetApp.getActive().setActiveSheet(sh);
}

function iagV81_openAuditLog() {
  var sh = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID).getSheetByName(SHEETS.AUDIT_LOG);
  if (!sh) { SpreadsheetApp.getUi().alert("AUDIT_LOG غير موجود بعد"); return; }
  SpreadsheetApp.getActive().setActiveSheet(sh);
}

/* ============================================================
   Cache Control (V8.1) — safe clear for IAG keys only
   ============================================================ */

function iagV81_cacheKey_(k) {
  return "IAGV81:" + k;
}

function iagV81_cacheRegistryKey_() {
  return "IAGV81_CACHE_KEYS";
}

/**
 * استخدمها بدل cache.put مباشرة:
 * iagV81_cachePut_("cfg", JSON.stringify(obj), 21600);
 */
function iagV81_cachePut_(key, value, seconds) {
  var k = iagV81_cacheKey_(key);
  var s = seconds || 21600; // 6h default
  CacheService.getScriptCache().put(k, value, s);
  iagV81_cacheRegisterKey_(k);
}

/**
 * قراءة من الكاش
 */
function iagV81_cacheGet_(key) {
  return CacheService.getScriptCache().get(iagV81_cacheKey_(key));
}

/**
 * تسجيل المفاتيح لإمكانية مسحها لاحقاً
 */
function iagV81_cacheRegisterKey_(fullKey) {
  var props = PropertiesService.getScriptProperties();
  var regKey = iagV81_cacheRegistryKey_();
  var raw = props.getProperty(regKey);
  var arr = raw ? JSON.parse(raw) : [];
  if (arr.indexOf(fullKey) === -1) {
    arr.push(fullKey);
    // حد أقصى لمنع تضخم السجل
    if (arr.length > 500) arr = arr.slice(arr.length - 500);
    props.setProperty(regKey, JSON.stringify(arr));
  }
}

/**
 * تنظيف الكاش — يمسح مفاتيح IAG فقط (لا يمسح كاش مشاريع أخرى على نفس السكربت)
 * يمسح: Script/User/Document caches
 */
function iagV81_clearAllCaches() {
  var props = PropertiesService.getScriptProperties();
  var regKey = iagV81_cacheRegistryKey_();
  var raw = props.getProperty(regKey);
  var keys = raw ? JSON.parse(raw) : [];

  var scriptCache = CacheService.getScriptCache();
  var userCache   = CacheService.getUserCache();
  var docCache    = CacheService.getDocumentCache();

  // removeAll يحتاج array مفاتيح
  if (keys.length) {
    // قص دفعات لتفادي حدود الحجم
    for (var i = 0; i < keys.length; i += 100) {
      var batch = keys.slice(i, i + 100);
      scriptCache.removeAll(batch);
      userCache.removeAll(batch);
      docCache.removeAll(batch);
    }
  }

  // تصفير سجل المفاتيح
  props.deleteProperty(regKey);

  SpreadsheetApp.getUi().alert("تم تنظيف كاش IAG V8.1 بنجاح.\n(تم مسح مفاتيح IAG فقط)");
}

/* ============================================================
   Checklist HTML (Sidebar)
   ============================================================ */

function iagV81_checklistHtml_() {
  return '<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8">' +
  '<link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;900&display=swap" rel="stylesheet">' +
  '<style>' +
  '*{box-sizing:border-box;margin:0;padding:0}' +
  'body{font-family:Cairo,sans-serif;background:#f4f7f7;color:#1a1a2e;font-size:13px}' +
  '.hdr{background:#044d47;color:#fff;padding:12px 14px;position:sticky;top:0;z-index:10}' +
  '.hdr h2{font-size:14px;font-weight:900}' +
  '.hdr .sub{font-size:11px;opacity:.75;margin-top:2px}' +
  '.prog-wrap{background:rgba(255,255,255,.2);border-radius:6px;height:5px;margin-top:8px}' +
  '.prog-fill{height:100%;background:#7fffd4;border-radius:6px;transition:width .3s;width:0%}' +
  '.stats{display:flex;gap:6px;padding:8px 14px;background:#e8f5f4;font-size:11px;font-weight:700;color:#044d47}' +
  '.sec-hdr{padding:8px 14px;background:#f0f4f3;font-weight:800;font-size:12px;color:#044d47;' +
            'border-bottom:1px solid #dde4e3;cursor:pointer;display:flex;align-items:center;gap:6px}' +
  '.sec-body{}' +
  '.item{display:flex;align-items:flex-start;gap:10px;padding:8px 14px;border-bottom:1px solid #f0f4f4;cursor:pointer;transition:background .15s}' +
  '.item:hover{background:#e8f5f4}' +
  '.item.done{background:#f0faf4}' +
  '.item.done .lbl{text-decoration:line-through;color:#999}' +
  '.cb{width:17px;height:17px;border:2px solid #ccc;border-radius:4px;flex-shrink:0;margin-top:1px;' +
      'display:flex;align-items:center;justify-content:center;font-size:11px;background:#fff}' +
  '.item.done .cb{background:#1a7a3c;border-color:#1a7a3c;color:#fff}' +
  '.lbl{font-size:12.5px;font-weight:600;line-height:1.4}' +
  '.dtl{font-size:11px;color:#777;margin-top:2px}' +
  '.tag{font-size:10px;font-weight:700;padding:1px 6px;border-radius:6px;display:inline-block;margin-top:3px}' +
  '.tc{background:#fde8e8;color:#c0392b}' +
  '.th{background:#fff3e0;color:#e65100}' +
  '.tm{background:#e8f5e9;color:#2e7d32}' +
  '</style></head><body>' +
  '<div class="hdr"><h2>🔍 مراجعة IAG V8.1</h2><div class="sub">اضغط على البند لتحديده</div>' +
  '<div class="prog-wrap"><div class="prog-fill" id="pb"></div></div></div>' +
  '<div class="stats">✅ <span id="sd">0</span> / <span id="st">0</span> &nbsp;|&nbsp; <span id="sp">0</span>%</div>' +

  // Section 1
  _mSec("⚙️ Config & إعداد النظام") +
  _mItem("SYSTEM_CONFIG شيت موجود وبه بيانات","tc") +
  _mItem("WORK_SHARED_ID مضبوط","tc") +
  _mItem("ARCHIVE_PRIVATE_ID مضبوط","tc") +
  _mItem("GEMINI_API_KEY موجود","th") +
  _mItem("قوالب التقارير الخمسة مضبوطة","tc") +
  _mItem("ADMIN_EMAIL و MANAGER_EMAIL موجودين","th") +

  // Section 2
  _mSec("📊 الشيتات") +
  _mItem("INOUT_MASTER موجود","tc") +
  _mItem("INOUT_RESPONSES مربوط بـ Form","tc") +
  _mItem("COMPLAINTS_RESPONSES مربوط","tc") +
  _mItem("TECH_HOSP_RESPONSES مربوط","tc") +
  _mItem("TECH_UNITS_RESPONSES مربوط","tc") +
  _mItem("FIN_RESPONSES مربوط","tc") +
  _mItem("EMPLOYEES به بيانات وإيميلات صحيحة","tc") +
  _mItem("DISTRIBUTION_RULES مضبوطة","tc") +

  // Section 3
  _mSec("⚡ التريجرز") +
  _mItem("تشغيل iagV81_setupAllTriggers تم","tc") +
  _mItem("5 Triggers موجودة (بدون قديمة)","tc") +
  _mItem("Dedup يمنع التنفيذ المزدوج","th") +

  // Section 4
  _mSec("📋 التقارير الأربعة") +
  _mItem("اختبار تقرير الشكاوى — ينشأ ويرسل","tc") +
  _mItem("اختبار المرور المالي — Append يعمل","tc") +
  _mItem("اختبار المرور الفني مستشفيات","tc") +
  _mItem("اختبار المرور الفني وحدات","tc") +
  _mItem("RTL صحيح في كل التقارير","th") +
  _mItem("تنسيق التاريخ موحد (15 يناير 2026)","th") +
  _mItem("PDF ينشأ ويرسل","th") +

  // Section 5
  _mSec("✉️ البريد الإلكتروني") +
  _mItem("DISTRIBUTION_RULES لكل أنواع التقارير","tc") +
  _mItem("MailApp Quota لم يُستنفذ","th") +
  _mItem("إيميل التكليف يصل للمراجع","th") +
  _mItem("فشل الإيميل لا يوقف النظام","th") +

  // Section 6
  _mSec("📁 Drive والأرشفة") +
  _mItem("مجلد Work موجود وصحيح","tc") +
  _mItem("مجلد Archive موجود وصحيح","tc") +
  _mItem("التوزيع على مجلدات الموظفين يعمل","th") +
  _mItem("الأرشفة تعمل لكل التقارير","th") +

  // Section 7
  _mSec("🤖 الذكاء الاصطناعي") +
  _mItem("Gemini API Key يعمل","th") +
  _mItem("فشل AI لا يوقف التقرير","th") +
  _mItem("أخطاء AI تُسجّل في ERRORS_LOG","tm") +

  // Section 8
  _mSec("🛡️ الحوكمة والرقابة") +
  _mItem("ERRORS_LOG يسجل الأخطاء","tc") +
  _mItem("AUDIT_LOG يسجل العمليات","th") +
  _mItem("openById مستخدم في كل الملفات","tc") +

  '<script>' +
  'var K="iag_cl_v81";' +
  'var state=JSON.parse(localStorage.getItem(K)||"{}");' +
  'function toggle(el){' +
  '  var i=el.dataset.i;' +
  '  if(el.classList.contains("done")){el.classList.remove("done");el.querySelector(".cb").textContent="";state[i]="0";}' +
  '  else{el.classList.add("done");el.querySelector(".cb").textContent="✓";state[i]="1";}' +
  '  localStorage.setItem(K,JSON.stringify(state));upd();' +
  '}' +
  'function upd(){' +
  '  var all=document.querySelectorAll(".item"),d=document.querySelectorAll(".item.done");' +
  '  var t=all.length,dn=d.length,p=t?Math.round(dn/t*100):0;' +
  '  document.getElementById("sd").textContent=dn;' +
  '  document.getElementById("st").textContent=t;' +
  '  document.getElementById("sp").textContent=p;' +
  '  document.getElementById("pb").style.width=p+"%";' +
  '}' +
  'document.querySelectorAll(".item").forEach(function(el,i){' +
  '  el.dataset.i=i;' +
  '  if(state[i]==="1"){el.classList.add("done");el.querySelector(".cb").textContent="✓";}' +
  '  el.addEventListener("click",function(){toggle(el);});' +
  '});' +
  'upd();' +
  '</script></body></html>';
}

function _mSec(title) {
  return '<div class="sec-hdr">'+title+'</div><div class="sec-body">';
}

function _mItem(label, tagClass) {
  var tagMap = { tc: "🔴 حرج", th: "🟠 عالي", tm: "🟢 متوسط" };
  return '<div class="item"><div class="cb"></div><div><div class="lbl">'+label+
    '</div><span class="tag '+tagClass+'">'+tagMap[tagClass]+'</span></div></div>';
}