/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🏛️ نظام الحوكمة - النواة (Core v6.0)
 * API Handler + Authentication + Database
 * ═══════════════════════════════════════════════════════════════════════════
 */

// ═══════════════════════════════════════════════════════════════════════════
// 🌐 API LAYER
// ═══════════════════════════════════════════════════════════════════════════

function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({ 
    status: "Online", 
    version: "6.0",
    serverTime: new Date().toISOString() 
  })).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) {
    return ContentService.createTextOutput(JSON.stringify({ 
      success: false, 
      error: "السيرفر مشغول، حاول مرة أخرى" 
    })).setMimeType(ContentService.MimeType.JSON);
  }

  let result = {};

  try {
    const requestData = JSON.parse(e.postData.contents);
    const action = requestData.action;
    const user = requestData.user || 'System';

    switch (action) {
      case 'login':
        result = authenticateUser(requestData.pin);
        break;

      case 'getAllData':
        result = getAllData(requestData.role, requestData.name, requestData.startDate, requestData.endDate);
        break;

      case 'reassignTask':
        result = reassignTask(requestData.taskId, requestData.newEmployee, user);
        break;

      case 'updateStatus':
        result = updateTaskStatus(requestData.taskId, requestData.newStatus, user);
        break;

      case 'addTask':
        result = addTaskManual(requestData.taskData, user);
        break;

      default:
        result = { success: false, error: "أمر غير معروف: " + action };
    }

  } catch (error) {
    result = { success: false, error: error.message };
  } finally {
    lock.releaseLock();
  }

  return ContentService.createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

// ═══════════════════════════════════════════════════════════════════════════
// 🔐 AUTHENTICATION
// ═══════════════════════════════════════════════════════════════════════════

function authenticateUser(pin) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName("الموظفين");
    
    if (!sheet) return { success: false, error: "شيت الموظفين غير موجود" };
    
    const data = sheet.getDataRange().getValues();
    
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const storedPin = String(row[9]).trim(); // العمود J: PIN
      
      if (storedPin === String(pin).trim()) {
        const isActive = row[5]; // العمود F: نشط
        
        if (isActive !== true && String(isActive).toUpperCase() !== 'TRUE') {
          return { success: false, error: "الحساب غير نشط" };
        }

        const employeeName = String(row[1]).trim(); // العمود B: الاسم
        const employeeRole = String(row[10]).trim(); // العمود K: الصلاحية

        logChange(employeeName, "LOGIN", "تسجيل دخول ناجح", "-", "-");

        return {
          success: true,
          name: employeeName,
          role: employeeRole,
          pin: storedPin
        };
      }
    }
    
    return { success: false, error: "رمز الدخول غير صحيح" };

  } catch (e) {
    return { success: false, error: "خطأ في المصادقة: " + e.message };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 📊 DATA RETRIEVAL (مصدر واحد للبيانات)
// ═══════════════════════════════════════════════════════════════════════════

function getAllData(role, userName, startDateStr, endDateStr) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const startDate = startDateStr ? new Date(startDateStr) : new Date('2020-01-01');
    const endDate = endDateStr ? new Date(endDateStr) : new Date();
    
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(23, 59, 59, 999);

    // 1️⃣ قراءة المهام
    const tasksSheet = ss.getSheetByName("الصادر_والوارد");
    const tasksData = tasksSheet ? tasksSheet.getDataRange().getValues() : [];
    
    // 2️⃣ قراءة التقارير
    const reportsSheet = ss.getSheetByName("سجل_التقارير");
    const reportsData = reportsSheet ? reportsSheet.getDataRange().getValues() : [];
    
    // 3️⃣ قراءة الموظفين
    const empSheet = ss.getSheetByName("الموظفين");
    const empData = empSheet ? empSheet.getDataRange().getValues() : [];

    // 4️⃣ معالجة البيانات
    let allTasks = [];
    let allReports = [];
    let empStats = {};
    let entityStats = {};
    let totals = { 
      total: 0, completed: 0, inProgress: 0, 
      overdue: 0, pending: 0 
    };

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // بناء قائمة الموظفين النشطين
    for (let i = 1; i < empData.length; i++) {
      const name = String(empData[i][1]).trim();
      const isActive = empData[i][5];
      const empRole = String(empData[i][10]).trim();
      
      if (name && (isActive === true || String(isActive).toUpperCase() === 'TRUE')) {
        empStats[name] = {
          name: name,
          role: empRole,
          total: 0,
          completed: 0,
          inProgress: 0,
          overdue: 0,
          pending: 0
        };
      }
    }

    // معالجة المهام
    for (let i = 1; i < tasksData.length; i++) {
      const row = tasksData[i];
      const taskDate = new Date(row[3]); // العمود D: التاريخ
      
      if (isNaN(taskDate.getTime()) || taskDate < startDate || taskDate > endDate) continue;

      const taskId = String(row[1]).trim(); // B: رقم_القيد
      const assignee = String(row[9]).trim(); // J: الموظف_المكلف
      const status = String(row[10]).trim(); // K: الحالة
      const entity = String(row[5]).trim(); // F: الجهة_محل_التنفيذ
      const source = String(row[4]).trim(); // E: الجهة

      // حساب التأخير
      let delayDays = null;
      if (status.includes("متأخر")) {
        const diff = Math.abs(today - taskDate);
        delayDays = Math.ceil(diff / (1000 * 60 * 60 * 24));
      }

      const task = {
        id: taskId,
        date: formatDate(taskDate),
        source: source,
        entity: entity,
        subject: String(row[6]).trim(), // G: الموضوع
        assignee: assignee,
        status: status,
        attachment: String(row[15]).trim() || null, // P: رابط_المرفقات
        delay: delayDays
      };

      // فلترة حسب الصلاحية
      if (role === 'مدير' || assignee.includes(userName)) {
        allTasks.push(task);
      }

      // الإحصائيات العامة
      totals.total++;
      if (status.includes("تم الاعتماد") || status.includes("منتهي")) {
        totals.completed++;
      } else if (status.includes("متأخر")) {
        totals.overdue++;
        totals.pending++;
      } else if (status.includes("جاري")) {
        totals.inProgress++;
        totals.pending++;
      } else {
        totals.pending++;
      }

      // إحصائيات الموظفين
      for (let empName in empStats) {
        if (assignee.includes(empName)) {
          empStats[empName].total++;
          if (status.includes("تم الاعتماد") || status.includes("منتهي")) {
            empStats[empName].completed++;
          } else if (status.includes("متأخر")) {
            empStats[empName].overdue++;
            empStats[empName].pending++;
          } else if (status.includes("جاري")) {
            empStats[empName].inProgress++;
            empStats[empName].pending++;
          } else {
            empStats[empName].pending++;
          }
        }
      }

      // إحصائيات الجهات
      if (entity) {
        if (!entityStats[entity]) {
          entityStats[entity] = { name: entity, total: 0, overdue: 0, pending: 0 };
        }
        entityStats[entity].total++;
        if (status.includes("متأخر")) entityStats[entity].overdue++;
        if (!status.includes("تم الاعتماد") && !status.includes("منتهي")) {
          entityStats[entity].pending++;
        }
      }
    }

    // معالجة التقارير
    for (let i = 1; i < reportsData.length; i++) {
      const row = reportsData[i];
      const reportAuthor = String(row[3]).trim(); // D: القائم_بالمرور
      
      if (role === 'مدير' || reportAuthor.includes(userName)) {
        const inspectionDate = row[4]; // E: تاريخ_المرور
        if (!inspectionDate) continue;

        allReports.push({
          date: formatDate(new Date(inspectionDate)),
          type: String(row[1]).trim(), // B: نوع_التقرير
          entity: String(row[2]).trim(), // C: رقم_القيد_أو_الجهة
          title: String(row[5]).trim(), // F: اسم_الملف
          docLink: String(row[6]).trim() || null, // G: رابط_Google_Doc
          pdfLink: String(row[7]).trim() || null // H: رابط_PDF_Drive
        });
      }
    }

    // تحويل الإحصائيات لـ Arrays
    const employeesArray = Object.values(empStats).sort((a, b) => b.completed - a.completed);
    const entitiesArray = Object.values(entityStats).sort((a, b) => b.overdue - a.overdue);

    return {
      success: true,
      tasks: allTasks.sort((a, b) => parseDate(b.date) - parseDate(a.date)),
      reports: allReports.sort((a, b) => parseDate(b.date) - parseDate(a.date)),
      stats: {
        totals: totals,
        employees: employeesArray,
        entities: entitiesArray
      }
    };

  } catch (e) {
    return { success: false, error: "خطأ في جلب البيانات: " + e.message };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 🛠️ ADMIN OPERATIONS
// ═══════════════════════════════════════════════════════════════════════════

function reassignTask(taskId, newEmployee, adminUser) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName("الصادر_والوارد");
    const data = sheet.getDataRange().getValues();
    
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][1]).trim() === String(taskId).trim()) {
        const oldEmp = sheet.getRange(i + 1, 10).getValue(); // J: الموظف_المكلف
        sheet.getRange(i + 1, 10).setValue(newEmployee);
        logChange(adminUser, "REASSIGN", `إعادة تكليف ${taskId}`, oldEmp, newEmployee);
        return { success: true };
      }
    }
    return { success: false, error: 'المهمة غير موجودة' };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function updateTaskStatus(taskId, newStatus, adminUser) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName("الصادر_والوارد");
    const data = sheet.getDataRange().getValues();
    
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][1]).trim() === String(taskId).trim()) {
        const oldStatus = sheet.getRange(i + 1, 11).getValue(); // K: الحالة
        sheet.getRange(i + 1, 11).setValue(newStatus);
        logChange(adminUser, "UPDATE_STATUS", `تحديث حالة ${taskId}`, oldStatus, newStatus);
        return { success: true };
      }
    }
    return { success: false, error: 'المهمة غير موجودة' };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function addTaskManual(taskData, adminUser) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName("الصادر_والوارد");
    const year = new Date().getFullYear().toString().slice(-2);
    const lastRow = sheet.getLastRow();
    const newId = year + "-" + lastRow;

    sheet.appendRow([
      lastRow, // A: المسلسل
      newId, // B: رقم_القيد
      '', // C: نوع_المستند
      new Date(taskData.date), // D: التاريخ
      taskData.source, // E: الجهة
      taskData.entity, // F: الجهة_محل_التنفيذ
      taskData.subject, // G: الموضوع
      '', // H: نوع_المعاملة
      '', // I: الأهمية
      taskData.employee, // J: الموظف_المكلف
      'جديد', // K: الحالة
      new Date(), // L: تاريخ_التخصيص
      taskData.deadline ? new Date(taskData.deadline) : '', // M: الموعد_النهائي
      '', // N: الأيام_المتبقية
      '', // O: تاريخ_الإنجاز
      taskData.attachment || '' // P: رابط_المرفقات
    ]);
    
    logChange(adminUser, "ADD_TASK", `إضافة مهمة ${newId}`, "-", "جديد");
    return { success: true, id: newId };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 📝 UTILITIES
// ═══════════════════════════════════════════════════════════════════════════

function logChange(user, action, details, oldVal, newVal) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName("سجل_الرقابة");
    
    if (!sheet) {
      sheet = ss.insertSheet("سجل_الرقابة");
      sheet.appendRow(["التوقيت", "المستخدم", "نوع_الحركة", "التفاصيل", "قيمة_قديمة", "قيمة_جديدة"]);
    }
    
    sheet.appendRow([new Date(), user, action, details, oldVal, newVal]);
  } catch (e) {
    console.error("Log failed: " + e.message);
  }
}

function formatDate(d) {
  if (!d || !(d instanceof Date) || isNaN(d.getTime())) return "";
  return d.getDate() + '/' + (d.getMonth() + 1) + '/' + d.getFullYear();
}

function parseDate(dateStr) {
  if (!dateStr) return 0;
  const parts = dateStr.split('/');
  if (parts.length !== 3) return 0;
  return new Date(parts[2], parts[1] - 1, parts[0]).getTime();
}
