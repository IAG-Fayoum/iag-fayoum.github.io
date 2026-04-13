/**
 * 10_QuarterlyReport.gs  (IAG V0.13 - Hierarchical Structure)
 *
 * التحسينات:
 * - هيكلة تقرير المستشفيات: (مستشفى -> قسم -> ملاحظات).
 * - هيكلة تقرير الوحدات: (إدارة صحية -> محور -> وحدات).
 * - تحسين تصنيف الأقسام (صيدلية، معمل، إدارة..) بناءً على النص.
 * - إزالة الروابط والضجيج نهائياً.
 */

/* ============================================================
   SECTION 1 — Constants
   ============================================================ */

const QR_FISCAL_START_MONTH = 7;

const QR_HOSPITALS = [
  "الفيوم العام", "الفيوم النموذجي", "التأمين الصحي",
  "الصدر", "الرمد", "الحميات",
  "ابشواي المركزي", "اطسا المركزي",
  "طامية المركزي", "سنورس المركزي", "فيديمين المركزي"
];

const QR_HEALTH_ADMINS = [
  "بندر الفيوم", "مركز الفيوم", "سنورس",
  "اطسا", "طامية", "ابشواى", "يوسف الصديق"
];

/* ============================================================
   SECTION 2 — Entry Points
   ============================================================ */

function runActualReport() {
  var now        = new Date();
  var month      = now.getMonth() + 1; // 1-12
  var year       = now.getFullYear();

  // السنة المالية تبدأ يوليو (7) — لو قبل يوليو نحن في النصف الثاني من السنة السابقة
  var fiscalStartYear = (month >= 7) ? year : year - 1;
  var fiscalYear      = fiscalStartYear + "-" + (fiscalStartYear + 1);

  // تحديد الربع: Q1=يوليو-سبتمبر، Q2=أكتوبر-ديسمبر، Q3=يناير-مارس، Q4=أبريل-يونيو
  var quarter;
  if      (month >= 7  && month <= 9)  quarter = 1;
  else if (month >= 10 && month <= 12) quarter = 2;
  else if (month >= 1  && month <= 3)  quarter = 3;
  else                                  quarter = 4;

  generateQuarterlyReport(quarter, fiscalYear);
}

function generateQuarterlyReport(quarter, fiscalYear) {
  try {
    quarter    = parseInt(quarter);
    fiscalYear = String(fiscalYear || "").trim();

    if (!quarter || quarter < 1 || quarter > 4) throw new Error("quarter يجب أن يكون 1-4");
    if (!fiscalYear || fiscalYear.indexOf("-") === -1) throw new Error("fiscalYear يجب أن يكون بصيغة YYYY-YYYY");

    var dates     = qr_calcDates_(quarter, fiscalYear);
    var dateFrom  = dates.from;
    var dateTo    = dates.to;
    var periodStr = dates.label;

    Logger.log("📋 التقرير: " + periodStr);

    var employees   = qr_getEmployees_();
    var hospData    = qr_getResponseData_(SHEETS.TECH_HOSP_RESPONSES, dateFrom, dateTo);
    var unitsData   = qr_getResponseData_(SHEETS.TECH_UNITS_RESPONSES, dateFrom, dateTo);
    var inoutData   = qr_getInoutData_(dateFrom, dateTo);

    var hospStats = qr_calcSectionStats_(hospData);
    var unitStats = qr_calcSectionStats_(unitsData);

    var hospText  = qr_generateStructuredReport_(hospData,  "مستشفيات");
    var unitsText = qr_generateStructuredReport_(unitsData, "وحدات");

    var inoutStats = qr_calcInoutStats_(inoutData);

    var docId = qr_buildDocument_(
      quarter, fiscalYear, periodStr,
      employees, hospText, unitsText, inoutStats,
      hospStats, unitStats
    );

    Logger.log("✅ تم إنشاء التقرير: " + docId);
    auditEngine_logEvent("SYSTEM", "QUARTERLY_REPORT",
      "Q" + quarter + " " + fiscalYear, "", { docId: docId }, "SUCCESS");

    return { ok: true, docId: docId };
  } catch (e) {
    auditEngine_logError("generateQuarterlyReport", e, { quarter: quarter, fiscalYear: fiscalYear });
    throw e;
  }
}

/* ============================================================
   SECTION 3 — Date & Data Fetchers (Same)
   ============================================================ */

function qr_calcDates_(quarter, fiscalYear) {
  var years    = fiscalYear.split("-");
  var startYr  = parseInt(years[0]);
  var endYr    = parseInt(years[1]);
  var quarters = [
    { from: new Date(startYr, 6,  1), to: new Date(startYr, 8,  30), label: "الربع الأول" },
    { from: new Date(startYr, 9,  1), to: new Date(startYr, 11, 31), label: "الربع الثاني" },
    { from: new Date(endYr,   0,  1), to: new Date(endYr,   2,  31), label: "الربع الثالث" },
    { from: new Date(endYr,   3,  1), to: new Date(endYr,   5,  30), label: "الربع الرابع" }
  ];
  var q = quarters[quarter - 1];
  return { from : q.from, to : q.to, label: q.label + " من السنة المالية " + fiscalYear };
}

function qr_getEmployees_() {
  var ss      = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  var sh      = ss.getSheetByName(SHEETS.EMPLOYEES);
  if (!sh || sh.getLastRow() < 2) return [];
  var rows    = sh.getRange(2, 1, sh.getLastRow()-1, sh.getLastColumn()).getValues();
  var headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  var nameIdx = headers.indexOf("الاسم");
  var jobIdx  = headers.indexOf("المسمى الوظيفي");
  var actIdx  = headers.indexOf("نشط");
  var result  = [];
  rows.forEach(function(r) {
    var active = String(r[actIdx] || "").trim().toUpperCase();
    if (active === "TRUE" || active === "نعم" || active === "نشط" || active === "1") {
      result.push({ name: String(r[nameIdx] || "").trim(), jobTitle: String(r[jobIdx] || "").trim() });
    }
  });
  return result;
}

function qr_getResponseData_(sheetName, dateFrom, dateTo) {
  var ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  var sh = ss.getSheetByName(sheetName);
  if (!sh || sh.getLastRow() < 2) return [];

  var headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  var rows    = sh.getRange(2, 1, sh.getLastRow()-1, sh.getLastColumn()).getValues();
  var dateColIdx = -1;
  var dateNames  = ["تاريخ المرور", "Timestamp", "تاريخ"];
  for (var d = 0; d < dateNames.length; d++) {
    var idx = headers.indexOf(dateNames[d]);
    if (idx !== -1) { dateColIdx = idx; break; }
  }

  var result = [];
  rows.forEach(function(row) {
    if (!row[0]) return;
    if (dateColIdx !== -1) {
      var rawDate = row[dateColIdx];
      if (rawDate) {
        var d = rawDate instanceof Date ? rawDate : new Date(rawDate);
        if (!isNaN(d.getTime())) {
          if (d < dateFrom || d > dateTo) return;
        }
      }
    }
    var obj = {};
    headers.forEach(function(h, i) {
      var key = String(h || "").trim();
      if (key) obj[key] = row[i];
    });
    result.push(obj);
  });
  return result;
}

function qr_getInoutData_(dateFrom, dateTo) {
  var ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  var sh = ss.getSheetByName(SHEETS.INOUT_MASTER);
  if (!sh || sh.getLastRow() < 2) return [];

  var headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  var rows    = sh.getRange(2, 1, sh.getLastRow()-1, sh.getLastColumn()).getValues();
  var dateIdx = headers.indexOf("التاريخ");
  var srcIdx  = headers.indexOf("الجهة (الوارد) منها");
  var typeIdx = headers.indexOf("نوع_المستند");
  var subIdx  = headers.indexOf("الموضوع");

  var result = [];
  rows.forEach(function(row) {
    if (!row[0]) return;
    var docType = String(row[typeIdx] || "").trim();
    if (docType !== "وارد") return;
    if (dateIdx !== -1) {
      var rawDate = row[dateIdx];
      if (rawDate) {
        var d = rawDate instanceof Date ? rawDate : new Date(rawDate);
        if (!isNaN(d.getTime())) {
          if (d < dateFrom || d > dateTo) return;
        }
      }
    }
    result.push({ source: String(row[srcIdx] || "").trim(), subject: String(row[subIdx] || "").trim() });
  });
  return result;
}

/* ============================================================
   SECTION 5 — Structured Report Generator
   ============================================================ */

function qr_calcSectionStats_(data) {
  var stats = { visits: data.length, negCount: 0, maintCount: 0 };
  data.forEach(function(row) {
    Object.keys(row).forEach(function(key) {
      var val = String(row[key] || "").trim();
      if ((key.indexOf("سلبيات") !== -1 || key.indexOf("ملاحظات") !== -1) && val.length > 3 && val !== "لا يوجد") stats.negCount++;
      if (key.indexOf("اعطال") !== -1 && val.length > 3 && val !== "لا يوجد") stats.maintCount++;
    });
  });
  return stats;
}

function qr_cleanText_(text) {
  if (!text) return "";
  text = text.replace(/https?:\/\/[^\s]+/gi, ""); // إزالة روابط
  text = text.replace(/Option \d+/gi, ""); // إزالة Option 1
  // إزالة الجمل الإيجابية المعروفة
  var noise = ["مفعل ولا يعمل", "المكان نظيف", "لا يوجد سلبيات", "الفريق ملتزم", "جميع الخدمات مفعله", "الالتزام بالزي", "جدول النوبتجيات معلن"];
  noise.forEach(function(n) { text = text.replace(new RegExp(n, "gi"), ""); });
  return text.trim();
}

// دالة تصنيف القسم بناءً على محتوى النص
function qr_detectSection_(text, key) {
  text = text || "";
  key = key || "";
  
  // ترتيب الأولويات للتصنيف
  if (key.indexOf("اعطال") !== -1 || text.indexOf("عطل") !== -1 || text.indexOf("جهاز") !== -1 || text.indexOf("معطل") !== -1) return "الأجهزة والصيانة";
  if (text.indexOf("صيدلية") !== -1 || text.indexOf("دواء") !== -1 || text.indexOf("أدوية") !== -1) return "الصيدلية";
  if (text.indexOf("معمل") !== -1 || text.indexOf("تحاليل") !== -1) return "المعمل";
  if (text.indexOf("مكافحة عدوى") !== -1 || text.indexOf("تعقيم") !== -1 || text.indexOf("نفايات") !== -1) return "مكافحة العدوى";
  if (text.indexOf("طبيب") !== -1 || text.indexOf("تمريض") !== -1 || text.indexOf("أطباء") !== -1) return "القوى البشرية";
  if (text.indexOf("ملف") !== -1 || text.indexOf("سجل") !== -1 || text.indexOf("تسجيل") !== -1) return "التسجيل والملفات الطبية";
  if (text.indexOf("نظافة") !== -1 || text.indexOf("رشح") !== -1 || text.indexOf("بنية") !== -1 || text.indexOf("أسرة") !== -1) return "البنية التحتية والنظافة";
  if (text.indexOf("أمن") !== -1 || text.indexOf("سلامة") !== -1) return "الأمن والسلامة";
  if (text.indexOf("إدارة") !== -1 || text.indexOf("جودة") !== -1 || text.indexOf("سياسة") !== -1 || text.indexOf("خطة") !== -1) return "الجودة والإدارة";
  
  return "أخرى";
}

function qr_generateStructuredReport_(visitRows, sectionType) {
  if (!visitRows || visitRows.length === 0) return "لم تُسجَّل زيارات خلال هذه الفترة.";

  var isHosp  = sectionType === "مستشفيات";
  var structure = {}; // الهيكل الرئيسي

  visitRows.forEach(function(row) {
    var entityName = "";
    var adminName = "أخرى";

    // استخراج اسم الجهة
    if (isHosp) {
      entityName = String(row["اسم المستشفى"] || row["اسم المستشفي"] || "").trim();
    } else {
      Object.keys(row).forEach(function(key) {
        if (key.indexOf("الوحدة") !== -1 || key.indexOf("المركز") !== -1) {
          var val = String(row[key] || "").trim();
          if (val && val !== "—" && val !== "غير محدد") entityName = val;
        }
        if (key.indexOf("الإدارة الصحية") !== -1 || key.indexOf("الادارة الصحية") !== -1) {
           adminName = String(row[key] || "").trim();
        }
      });
      if (adminName === "أخرى") {
        QR_HEALTH_ADMINS.forEach(function(adm) { if (entityName.indexOf(adm) !== -1) adminName = adm; });
      }
    }
    if (!entityName) return;

    var groupKey = isHosp ? ("مستشفى " + entityName) : entityName;

    // معالجة السلبيات
    Object.keys(row).forEach(function(key) {
      var rawVal = String(row[key] || "").trim();
      var val = qr_cleanText_(rawVal);
      if (val.length < 5) return;

      // استخراج النصوص من الخلايا
      var items = [];
      if (key.indexOf("اعطال") !== -1) items = val.split(/\n|,/);
      else if (key.indexOf("سلبيات") !== -1 || key.indexOf("ملاحظات") !== -1) items = val.split(/\n|,/);
      
      items.forEach(function(itemText) {
        itemText = itemText.trim();
        if(itemText.length < 4) return;
        
        // تحديد القسم
        var section = qr_detectSection_(itemText, key);
        
        // بناء الهيكل
        if (isHosp) {
          // هيكل المستشفيات: Hospital -> Section -> Items
          if (!structure[groupKey]) structure[groupKey] = {};
          if (!structure[groupKey][section]) structure[groupKey][section] = [];
          structure[groupKey][section].push(itemText);
        } else {
          // هيكل الوحدات: Admin -> Section -> Item -> Entities
          if (!structure[adminName]) structure[adminName] = {};
          if (!structure[adminName][section]) structure[adminName][section] = {};
          if (!structure[adminName][section][itemText]) structure[adminName][section][itemText] = [];
          if (structure[adminName][section][itemText].indexOf(groupKey) === -1) {
            structure[adminName][section][itemText].push(groupKey);
          }
        }
      });
    });
  });

  // بناء النص النهائي
  var output = [];

  if (isHosp) {
    // طباعة المستشفيات
    Object.keys(structure).sort().forEach(function(hospName) {
      output.push("### " + hospName); // عنوان المستشفى
      var sections = structure[hospName];
      Object.keys(sections).sort().forEach(function(secName) {
        output.push("**" + secName + ":**");
        sections[secName].forEach(function(item) {
          output.push("- " + item);
        });
      });
      output.push(""); // مسافة بين مستشفى وأخرى
    });
  } else {
    // طباعة الوحدات
    Object.keys(structure).sort().forEach(function(adminName) {
      output.push("### " + adminName); // عنوان الإدارة الصحية
      var sections = structure[adminName];
      Object.keys(sections).sort().forEach(function(secName) {
        output.push("**" + secName + ":**");
        var issues = sections[secName];
        Object.keys(issues).forEach(function(issueText) {
          var units = issues[issueText].join("، ");
          output.push("- " + issueText + " (الوحدات: " + units + ").");
        });
      });
    });
  }

  if (output.length === 0) return "لا توجد سلبيات جوهرية مسجلة.";
  return output.join("\n");
}

/* ============================================================
   SECTION 6 — Inout Stats
   ============================================================ */

function qr_calcInoutStats_(inoutData) {
  var stats = {};
  inoutData.forEach(function(row) {
    var src = row.source || "أخرى";
    if (src.indexOf("وكيل") !== -1) src = "وكيل الوزارة";
    else if (src.indexOf("رقابة") !== -1) src = "الرقابة الإدارية";
    else if (src.indexOf("نيابة") !== -1) src = "النيابة العامة";
    else if (src.indexOf("شكوى") !== -1 || src.indexOf("مواطن") !== -1) src = "شكاوى مباشرة";
    stats[src] = (stats[src] || 0) + 1;
  });
  stats["__total__"] = inoutData.length;
  return stats;
}

/* ============================================================
   SECTION 7 — Document Builder
   ============================================================ */

function qr_buildDocument_(quarter, fiscalYear, periodStr, employees, hospText, unitsText, inoutStats, hospStats, unitStats) {
  var archiveId = CONFIG.getArchivePrivateRootId();
  var folder    = DriveApp.getFolderById(archiveId);
  var repFolder = qr_getOrCreateFolder_(folder, "التقارير الربع سنوية");
  var qFolder   = qr_getOrCreateFolder_(repFolder, fiscalYear);

  var docName = "التقرير الربع السنوي — Q" + quarter + " — " + fiscalYear;
  var doc     = DocumentApp.create(docName);
  var body    = doc.getBody();
  body.clear();

  var defaultStyle = {};
  defaultStyle[DocumentApp.Attribute.FONT_FAMILY] = 'Times New Roman';
  defaultStyle[DocumentApp.Attribute.FONT_SIZE] = 14;
  defaultStyle[DocumentApp.Attribute.BOLD] = true;
  defaultStyle[DocumentApp.Attribute.LEFT_TO_RIGHT] = false;
  defaultStyle[DocumentApp.Attribute.HORIZONTAL_ALIGNMENT] = DocumentApp.HorizontalAlignment.RIGHT;
  body.setAttributes(defaultStyle);

  qr_appendHeading_(body, "تقرير إدارة المراجعة الداخلية والحوكمة");
  qr_appendHeading_(body, "نتائج أعمال الإدارة خلال " + periodStr);
  
  qr_appendHeading_(body, "ملخص تنفيذي للنتائج:");
  var pSummary = body.appendParagraph("خلال هذه الفترة، قامت الإدارة بتنفيذ " + hospStats.visits + " زيارة للمستشفيات، و " + unitStats.visits + " زيارة للوحدات الصحية. أسفرت هذه الزيارات عن رصد " + hospStats.negCount + " ملاحظة جوهرية في المستشفيات و " + unitStats.negCount + " ملاحظة في الوحدات، بالإضافة إلى " + hospStats.maintCount + " عطل فني.");
  pSummary.setAttributes(defaultStyle);
  body.appendParagraph("");

  qr_appendHeading_(body, "1- بيانات الوحدة (القوى البشرية):");
  employees.forEach(function(e, i) {
    var p = body.appendListItem((i+1) + ". " + e.name + " — " + e.jobTitle);
    p.setAttributes(defaultStyle);
  });

  qr_appendHeading_(body, "2- الخطة السنوية لأعمال المراجعة الداخلية والحوكمة:");
  body.appendParagraph("تم تنفيذ الخطة المعتمدة بمراجعة الأعمال الفنية والمالية والإدارية.");

  qr_appendHeading_(body, "3- نتائج أعمال المراجعة الداخلية المخططة:");
  
  qr_appendHeading_(body, "أولاً: المستشفيات العام والمركزي والنوعي:");
  qr_appendFormattedText_(body, hospText);
  
  qr_appendHeading_(body, "ثانياً: وحدات الرعاية الأولية التابعة للإدارات الصحية:");
  qr_appendFormattedText_(body, unitsText);

  var staticItems = [
    { title: "4- نتائج أعمال المراجعة الداخلية المفاجئة:", text: "لا يوجد." },
    { title: "5- موقف الالتزام بالتعاقدات والاتفاقيات:", text: "لا يوجد." },
    { title: "6- نتائج أعمال إجراء الفحص الدوري والمفاجئ:", text: "تم ذكره تفصيلاً في البند رقم (3)." },
    { title: "7- نتائج المراجعة على أعمال الشئون الوظيفية:", text: "تم ذكره تفصيلاً ضمن ملاحظات المرور في البند رقم (3)." },
    { title: "8- نتائج تقديم مقترحات تصحيحية:", text: "لا يوجد." },
    { title: "10- نتائج الأبحاث والدراسات:", text: "لم يتم عمل أبحاث." }
  ];

  staticItems.forEach(function(item) {
    qr_appendHeading_(body, item.title);
    body.appendParagraph(item.text).setAttributes(defaultStyle);
  });

  qr_appendHeading_(body, "9- نتائج عرض التقارير وملاحظات الأجهزة الرقابية:");
  var total = inoutStats["__total__"] || 0;
  body.appendParagraph("إجمالي المعاملات والشكاوى الواردة: " + total + " معاملة.").setAttributes(defaultStyle);
  
  Object.keys(inoutStats).forEach(function(src) {
    if (src === "__total__") return;
    body.appendListItem("يوجد (" + inoutStats[src] + ") معاملة واردة من " + src).setAttributes(defaultStyle);
  });

  doc.saveAndClose();
  var file = DriveApp.getFileById(doc.getId());
  qFolder.addFile(file);
  DriveApp.getRootFolder().removeFile(file);
  return doc.getId();
}

/* ============================================================
   SECTION 8 — Helpers
   ============================================================ */

function qr_appendHeading_(body, text) {
  var p = body.appendParagraph(text);
  var style = {};
  style[DocumentApp.Attribute.FONT_FAMILY] = 'Times New Roman';
  style[DocumentApp.Attribute.FONT_SIZE] = 16;
  style[DocumentApp.Attribute.BOLD] = true;
  style[DocumentApp.Attribute.UNDERLINE] = true;
  p.setAttributes(style);
  p.setLeftToRight(false);
  body.appendParagraph("");
}

function qr_appendFormattedText_(body, text) {
  if (!text) return;
  var lines = text.split("\n");
  lines.forEach(function(line) {
    line = line.trim();
    if (!line) return;
    
    // عناوين المستشفيات أو الإدارات (###)
    if (line.startsWith("###")) {
       var p = body.appendParagraph(line.replace("###", "").trim());
       var s = {}; 
       s[DocumentApp.Attribute.BOLD] = true; 
       s[DocumentApp.Attribute.FONT_SIZE] = 15; 
       s[DocumentApp.Attribute.UNDERLINE] = false; 
       // لون مختلف للمستشفى لتمييزه
       s[DocumentApp.Attribute.FOREGROUND_COLOR] = "#000000"; // أسود عادي
       p.setAttributes(s);
       p.setLeftToRight(false);
    }
    // عناوين الأقسام (**)
    else if (line.startsWith("**")) {
       var p = body.appendParagraph(line.replace(/\*\*/g, ""));
       var s = {}; 
       s[DocumentApp.Attribute.BOLD] = true; 
       s[DocumentApp.Attribute.FONT_SIZE] = 14; 
       s[DocumentApp.Attribute.UNDERLINE] = false; 
       s[DocumentApp.Attribute.FOREGROUND_COLOR] = "#666666"; // رمادي غامق للعناوين الفرعية
       p.setAttributes(s);
       p.setLeftToRight(false);
    } 
    // النقاط العادية
    else {
       var p = body.appendListItem(line);
       p.setGlyphType(DocumentApp.GlyphType.BULLET);
       var sList = {}; 
       sList[DocumentApp.Attribute.FONT_FAMILY] = 'Times New Roman'; 
       sList[DocumentApp.Attribute.FONT_SIZE] = 13; 
       sList[DocumentApp.Attribute.BOLD] = true;
       p.setAttributes(sList);
       p.setLeftToRight(false);
    }
  });
}

function qr_getOrCreateFolder_(parent, name) {
  var it = parent.getFoldersByName(name);
  return it.hasNext() ? it.next() : parent.createFolder(name);
}