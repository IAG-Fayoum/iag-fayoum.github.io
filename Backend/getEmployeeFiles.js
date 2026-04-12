/**
 * getEmployeeFiles.gs  —  IAG System V8.2
 * ══════════════════════════════════════════════════════════════
 * يقرأ ملفات الموظف من الهيكل الجديد:
 *
 *   WORK_ROOT / ملفات الموظفين / [اسم الموظف]
 *     ├── تقارير المرور / [سنة] / [شهر] / [جهة] / shortcut
 *     └── فحص الشكوى   / [سنة] / [شهر] / shortcut
 *
 * يُستدعى من Backend.gs:
 *   case "getEmployeeFiles": result = handleGetEmployeeFiles(body); break;
 * ══════════════════════════════════════════════════════════════
 */

var EMP_FILES_ROOT     = "ملفات الموظفين";
var EMP_CAT_VISITS     = "تقارير المرور";
var EMP_CAT_COMPLAINTS = "فحص الشكوى";

/* ─────────────────────────────────────────────────────────────
   Entry point
   ───────────────────────────────────────────────────────────── */

function handleGetEmployeeFiles(body) {
  var name = String((body && body.name) || "").trim();
  if (!name) return { success: false, error: "اسم الموظف مطلوب" };

  try {
    var workRoot    = DriveApp.getFolderById(CONFIG.getWorkSharedRootId());
    var empRootIt   = workRoot.getFoldersByName(EMP_FILES_ROOT);
    if (!empRootIt.hasNext()) return { success: true, inspections: [], complaints: [] };

    var empRoot     = empRootIt.next();
    var empFolderIt = empRoot.getFoldersByName(name);
    if (!empFolderIt.hasNext()) return { success: true, inspections: [], complaints: [] };

    var empFolder = empFolderIt.next();

    var inspections = _empFiles_readCategory(empFolder, EMP_CAT_VISITS,    true);
    var complaints  = _empFiles_readCategory(empFolder, EMP_CAT_COMPLAINTS, false);

    return { success: true, inspections: inspections, complaints: complaints };

  } catch (e) {
    govV8_logError("handleGetEmployeeFiles", e);
    return { success: false, error: e.message };
  }
}

/* ─────────────────────────────────────────────────────────────
   قراءة تصنيف
   hasEntity=true  → سنة / شهر / جهة / ملفات
   hasEntity=false → سنة / شهر / ملفات
   ───────────────────────────────────────────────────────────── */

function _empFiles_readCategory(empFolder, categoryName, hasEntity) {
  var files = [];

  var catIt = empFolder.getFoldersByName(categoryName);
  if (!catIt.hasNext()) return files;
  var catFolder = catIt.next();

  var yearIt = catFolder.getFolders();
  while (yearIt.hasNext()) {
    var yearFolder = yearIt.next();
    var year = yearFolder.getName();

    var monthIt = yearFolder.getFolders();
    while (monthIt.hasNext()) {
      var monthFolder = monthIt.next();
      var month = monthFolder.getName();

      if (hasEntity) {
        // جهات داخل الشهر
        var entityIt = monthFolder.getFolders();
        while (entityIt.hasNext()) {
          var entityFolder = entityIt.next();
          var entity = entityFolder.getName();
          files = files.concat(_empFiles_readFolder(entityFolder, year, month, entity));
        }
        // ملفات مباشرة في الشهر (بدون جهة)
        files = files.concat(_empFiles_readFolder(monthFolder, year, month, ""));
      } else {
        files = files.concat(_empFiles_readFolder(monthFolder, year, month, ""));
      }
    }
  }

  return files;
}

/* ─────────────────────────────────────────────────────────────
   قراءة ملفات فولدر + حل الـ Shortcuts
   ───────────────────────────────────────────────────────────── */

function _empFiles_readFolder(folder, year, month, entity) {
  var results = [];
  var fileIt  = folder.getFiles();
  while (fileIt.hasNext()) {
    var file = fileIt.next();
    try {
      var obj = _empFiles_resolveFile(file, year, month, entity);
      if (obj) results.push(obj);
    } catch (e) {
      console.warn("_empFiles_readFolder:", file.getName(), e.message);
    }
  }
  return results;
}

function _empFiles_resolveFile(file, year, month, entity) {
  var mime = file.getMimeType() || "";

  if (mime === "application/vnd.google-apps.shortcut") {
    return _empFiles_resolveShortcut(file, year, month, entity);
  }
  return _empFiles_buildObj(file, year, month, entity);
}

function _empFiles_resolveShortcut(shortcut, year, month, entity) {
  try {
    var info = Drive.Files.get(shortcut.getId(), { fields: "shortcutDetails" });
    if (!info.shortcutDetails || !info.shortcutDetails.targetId) return null;
    var target = DriveApp.getFileById(info.shortcutDetails.targetId);
    return _empFiles_buildObj(target, year, month, entity);
  } catch (e) {
    // Drive API غير متاح أو الملف محذوف → نستخدم الـ shortcut نفسه
    return _empFiles_buildObj(shortcut, year, month, entity);
  }
}

function _empFiles_buildObj(file, year, month, entity) {
  var mime = file.getMimeType() || "";
  var modified = "";
  try {
    var d = file.getLastUpdated();
    if (d) modified = d.getDate() + "/" + (d.getMonth()+1) + "/" + d.getFullYear();
  } catch(e) {}

  var size = 0;
  try { size = file.getSize() || 0; } catch(e) {}

  return {
    id:       file.getId(),
    name:     file.getName(),
    url:      file.getUrl(),
    mimeType: mime,
    isDoc:    mime === "application/vnd.google-apps.document",
    isPdf:    mime === "application/pdf",
    year:     year,
    month:    month,
    entity:   entity,
    modified: modified,
    size:     size
  };
}