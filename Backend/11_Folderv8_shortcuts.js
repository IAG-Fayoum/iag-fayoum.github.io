/**
 * folderV8_Shortcuts.gs  —  IAG System
 * ══════════════════════════════════════════════════════════════
 *
 * دالة موحدة لتوزيع Shortcuts على فولدرات الموظفين
 *
 * المبدأ:
 *   ① الملف الأصلي (Doc + PDF) يُنشأ مرة واحدة في الأرشيف  ← شغل كل Report script
 *   ② Shortcut يُوضع في فولدر كل موظف معني               ← شغل هذا الملف فقط
 *
 * القواعد:
 *   • الأسماء من شيت "الموظفين" فقط — أي اسم غريب يُتجاهل صامتاً
 *   • لو أكتر من موظف → shortcut في فولدر كل واحد منهم
 *   • فولدر الموظف يتولد تلقائياً أول مرة وما يتولدش تاني
 *   • الكود لا يوقف التقرير لو فشل الـ shortcut
 *
 * هيكل فولدر الموظف:
 *   ملفات الموظفين/
 *   └── [اسم الموظف]/
 *       ├── تقارير المرور/
 *       │   └── [سنة]/[شهر]/[جهة]/
 *       │       └── 🔗 shortcut
 *       └── فحص الشكوى/
 *           └── [سنة]/[شهر]/
 *               └── 🔗 shortcut
 *
 * الاستخدام من أي Report script:
 *   iag_distributeShortcuts(originalFile, reportType, entityOrId, dateObj, officersText);
 *
 * لإضافة نوع تقرير جديد في المستقبل:
 *   فقط استدعِ iag_distributeShortcuts() بنفس الطريقة — لا شيء آخر
 *
 * يتطلب: Advanced Drive Service مفعّل (Services → Drive API v3)
 * ══════════════════════════════════════════════════════════════
 */


// ─────────────────────────────────────────────────────────────
// الثوابت
// ─────────────────────────────────────────────────────────────

var SH_EMPLOYEES_ROOT = "ملفات الموظفين";
var SH_CAT_VISITS     = "تقارير المرور";
var SH_CAT_COMPLAINTS = "فحص الشكوى";


// ─────────────────────────────────────────────────────────────
// الدالة الرئيسية
// ─────────────────────────────────────────────────────────────

/**
 * iag_distributeShortcuts
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

    // ── تحقق من Drive API ──────────────────────────────────
    if (!_sh_isDriveApiAvailable()) {
      Logger.log("⚠️  Advanced Drive Service غير مفعّل — لن تُنشأ Shortcuts");
      Logger.log("    لتفعيله: Apps Script → Services → Drive API v3");
      return;
    }

    // ── جلب الموظفين المسجلين ──────────────────────────────
    var registeredNames = _sh_getRegisteredEmployees();
    if (!registeredNames.length) {
      Logger.log("⚠️  لا يوجد موظفون نشطون في شيت الموظفين");
      return;
    }

    // ── مطابقة الأسماء ─────────────────────────────────────
    var matchedNames = _sh_matchOfficers(officersText, registeredNames);
    if (!matchedNames.length) {
      Logger.log("ℹ️  لا تطابق لأسماء موظفين في النص: [" + officersText + "]");
      return;
    }
    Logger.log("👥 موظفون (" + matchedNames.length + "): " + matchedNames.join(" | "));

    // ── تحديد التصنيف (مرور / شكوى) ────────────────────────
    var category = _sh_resolveCategory(reportType);

    // ── عناصر المسار ────────────────────────────────────────
    var year  = String(dateObj.getFullYear());
    var month = _sh_monthName(dateObj);

    // ── إنشاء Shortcut لكل موظف ─────────────────────────────
    matchedNames.forEach(function(name) {
      try {
        // الشكاوى: بدون sub-folder للجهة / المرور: مع sub-folder للجهة
        var entity = (category === SH_CAT_COMPLAINTS) ? null : entityOrId;

        var targetFolder = _sh_getOrCreateEmployeeSubFolder(
          name, category, year, month, entity
        );
        _sh_createShortcut(originalFile, targetFolder);
        Logger.log("✅ " + name + " → " + [category, year, month, entity].filter(Boolean).join(" / "));
      } catch (empErr) {
        Logger.log("⚠️  فشل Shortcut لـ [" + name + "]: " + empErr.message);
      }
    });

  } catch (err) {
    Logger.log("❌ iag_distributeShortcuts: " + err.message);
    // نكمل ولا نوقف التقرير
  }
}


// ─────────────────────────────────────────────────────────────
// قراءة الموظفين من الشيت
// ─────────────────────────────────────────────────────────────

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

    // تحقق من النشاط
    if (activeCol !== -1) {
      var active = row[activeCol];
      if (active === false || String(active).toLowerCase() === "false") return;
    }

    names.push(name);
  });

  return names;
}


// ─────────────────────────────────────────────────────────────
// مطابقة الأسماء  —  Partial Match
// ─────────────────────────────────────────────────────────────

/**
 * يبحث عن كل اسم مسجل داخل النص الخام
 *
 * يشتغل مع:
 *   "د. سهى مصطفى"         ← يطابق "سهى مصطفى محمد الماوي"
 *   "أحمد, محمود\nريهام"   ← يطابق الثلاثة
 *   أسماء ثلاثية من رباعي
 */
function _sh_matchOfficers(officersText, registeredNames) {
  if (!officersText) return [];
  var normalizedInput = _sh_normalizeText(String(officersText));
  var matched = [];

  registeredNames.forEach(function(fullName) {
    if (_sh_nameFoundInText(fullName, normalizedInput)) {
      matched.push(fullName);
    }
  });

  return matched;
}

function _sh_nameFoundInText(fullName, normalizedInput) {
  var words = fullName.trim().split(/\s+/);

  // مطابقة الاسم كاملاً
  if (normalizedInput.indexOf(_sh_normalizeText(fullName)) !== -1) return true;

  // مطابقة بثلاث كلمات متتالية (من أصل رباعي)
  if (words.length >= 3) {
    for (var i = 0; i <= words.length - 3; i++) {
      var chunk = _sh_normalizeText(words.slice(i, i + 3).join(" "));
      if (normalizedInput.indexOf(chunk) !== -1) return true;
    }
  }

  // مطابقة بأول كلمتين (حد أدنى)
  if (words.length >= 2) {
    var twoWords = _sh_normalizeText(words.slice(0, 2).join(" "));
    if (twoWords.length >= 6 && normalizedInput.indexOf(twoWords) !== -1) return true;
  }

  return false;
}

// تطبيع النص: إزالة التشكيل + توحيد الألف + تاء مربوطة + ألف مقصورة
function _sh_normalizeText(str) {
  return str
    .replace(/[\u064B-\u065F]/g, "")  // تشكيل
    .replace(/[أإآ]/g, "ا")           // ألف
    .replace(/ة/g, "ه")              // تاء مربوطة
    .replace(/ى/g, "ي")              // ألف مقصورة
    .trim();
}


// ─────────────────────────────────────────────────────────────
// تحديد التصنيف
// ─────────────────────────────────────────────────────────────

function _sh_resolveCategory(reportType) {
  var t = String(reportType || "");
  if (t.indexOf("شكو") !== -1 || t.indexOf("شكاو") !== -1) {
    return SH_CAT_COMPLAINTS;
  }
  return SH_CAT_VISITS;
}


// ─────────────────────────────────────────────────────────────
// بناء هيكل فولدر الموظف
// ─────────────────────────────────────────────────────────────

/**
 * مرور:  ملفات الموظفين / [موظف] / تقارير المرور / [سنة] / [شهر] / [جهة]
 * شكوى:  ملفات الموظفين / [موظف] / فحص الشكوى   / [سنة] / [شهر]
 */
function _sh_getOrCreateEmployeeSubFolder(employeeName, category, year, month, entityName) {
  var workRoot    = DriveApp.getFolderById(CONFIG.getWorkSharedRootId());
  var empRoot     = _sh_getOrCreate(workRoot,   SH_EMPLOYEES_ROOT);
  var empFolder   = _sh_getOrCreate(empRoot,    employeeName);
  var catFolder   = _sh_getOrCreate(empFolder,  category);
  var yearFolder  = _sh_getOrCreate(catFolder,  year);
  var monthFolder = _sh_getOrCreate(yearFolder, month);

  if (entityName) {
    return _sh_getOrCreate(monthFolder, entityName);
  }
  return monthFolder;
}

function _sh_getOrCreate(parent, name) {
  var it = parent.getFoldersByName(name);
  if (it.hasNext()) return it.next();
  return parent.createFolder(name);
}


// ─────────────────────────────────────────────────────────────
// إنشاء الـ Shortcut  (يتطلب Drive Advanced Service)
// ─────────────────────────────────────────────────────────────

function _sh_createShortcut(originalFile, targetFolder) {
  var targetId = originalFile.getId();

  // ── تحقق: هل يوجد shortcut لنفس الملف بالفعل في هذا الفولدر؟ ──
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
          return; // موجود، لا نكرر
        }
      }
    }
  } catch (checkErr) {
    Logger.log("⚠️  تعذر التحقق من الـ shortcuts الموجودة: " + checkErr.message);
    // نكمل ونحاول الإنشاء
  }

  // ── إنشاء الـ shortcut ──
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


// ─────────────────────────────────────────────────────────────
// التحقق من Drive API
// ─────────────────────────────────────────────────────────────

function _sh_isDriveApiAvailable() {
  try {
    var _ = Drive.Files;
    return true;
  } catch (e) {
    return false;
  }
}


// ─────────────────────────────────────────────────────────────
// اسم الشهر بالعربي
// ─────────────────────────────────────────────────────────────

function _sh_monthName(d) {
  return ["يناير","فبراير","مارس","أبريل","مايو","يونيو",
          "يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"][d.getMonth()];
}


// ═══════════════════════════════════════════════════════════════
// دالة الإعداد الأولي  —  تُشغَّل يدوياً مرة واحدة فقط
// ═══════════════════════════════════════════════════════════════

/**
 * initEmployeeFolders
 *
 * تُنشئ فولدر لكل موظف نشط مع التصنيفين الرئيسيين
 *
 * • تُشغَّل يدوياً من Apps Script مرة واحدة لإعداد الهيكل الأولي
 * • أي موظف جديد يُضاف لاحقاً → فولدره يتولد تلقائياً
 *   أول ما يُكتب له تقرير عبر iag_distributeShortcuts
 */
function initEmployeeFolders() {
  var names = _sh_getRegisteredEmployees();
  if (!names.length) {
    Logger.log("❌ لا يوجد موظفون مسجلون");
    return;
  }

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