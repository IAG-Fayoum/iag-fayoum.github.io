# IAG System — System Blueprint
**المشروع:** منصة المراجعة الداخلية والحوكمة — صحة الفيوم  
**الإصدار:** V0.09 (Backend) · 2026  
**الغرض:** مرجع دائم لأي مطوّر أو ذكاء اصطناعي يعمل على هذا النظام

---

## 1. Project Structure — هيكل الملفات

```
IAG-System/
├── Backend/                        ← Google Apps Script (GAS)
│   │
│   ├── ─── Core_ (Foundation Layer) ──────────────────────────
│   ├── Core_Config.js              ← CONFIG · SHEETS · ENUMS · FOLDERS (مصدر الحقيقة الوحيد)
│   ├── Core_SharedHelpers.js       ← Schema · SLA · Folder · Format · Shortcuts · Governance utils
│   ├── Core_EmailEngine.js         ← إرسال الإيميلات وقوالب HTML
│   ├── Core_AIEngine.js            ← تصحيح النصوص عبر Gemini API
│   └── Core_AuditEngine.js         ← تسجيل الأحداث والأخطاء مركزياً (OP_AUDIT_LOG · OP_ERRORS_LOG)
│   │
│   ├── ─── Flow_ (Business Pipeline) ─────────────────────────
│   ├── Flow_CentralTrigger.js      ← نقطة دخول كل نموذج Google Form (trgV8_onFormSubmit)
│   ├── Flow_ApiGateway.js          ← doGet · doPost — Web App يخدم الـ Frontend
│   ├── Flow_FindingsEngine.js      ← استخراج الملاحظات من تقارير المرور
│   ├── Flow_CAREngine.js           ← إنشاء وإدارة سجلات الإجراءات التصحيحية (CAR)
│   ├── Flow_FollowUpEngine.js      ← متابعة CARs المفتوحة وإشعار المسؤولين
│   ├── Flow_VerificationEngine.js  ← التحقق الميداني/الوثائقي من إغلاق الملاحظات
│   ├── Flow_EscalationEngine.js    ← تصعيد الملاحظات المتأخرة (إداري · وزاري · قانوني)
│   └── Flow_AnalyticsEngine.js     ← حساب وحفظ اللقطات الإحصائية (OP_STATISTICS)
│   │
│   ├── ─── Report_ (Report Generators) ───────────────────────
│   ├── Report_Complaint.js         ← تقرير فحص الشكوى (Doc + PDF + Email)
│   ├── Report_Financial.js         ← تقرير المرور المالي
│   ├── Report_TechHosp.js          ← تقرير المرور الفني للمستشفيات (متعدد الأقسام + Session)
│   ├── Report_TechUnits.js         ← تقرير المرور الفني للوحدات الصحية
│   └── Report_Quarterly.js         ← التقرير الربعي الشامل
│   │
│   ├── ─── Tool_ (Manual / Diagnostic) ───────────────────────
│   ├── Tool_Menu.js                ← قوائم Apps Script اليدوية
│   ├── Tool_Diagnostics.js         ← أدوات الفحص والتشخيص
│   └── Tool_TestRunner.js          ← اختبارات تكاملية بآخر بيانات حقيقية من الشيتات
│   │
│   └── appsscript.json             ← إعدادات GAS (لا يُعاد تسميته)
│
├── Frontend/                       ← صفحات HTML + assets/
│   ├── assets/css/                 ← ملفات CSS منفصلة لكل صفحة
│   ├── assets/js/                  ← ملفات JS منفصلة لكل صفحة
│   └── *.html                      ← صفحات التطبيق
│
└── docs/                           ← التوثيق فقط (لا كود)
    ├── progress.md                 ← خارطة الطريق وسجل التغييرات
    ├── system_blueprint.md         ← هذا الملف
    ├── architecture.md             ← نتائج الفحص الفني الأولي
    └── backend-plan.md / frontend-plan.md
```

---

## 2. Logic Flow — تدفق المنطق

### 2.1 طبقات النظام (Layer Architecture)

```
┌─────────────────────────────────────────────────────┐
│              Frontend (HTML + JS)                   │
│  google.script.run.*  ←→  google.script.run.*       │
└───────────────────┬─────────────────────────────────┘
                    │ HTTP (doGet / doPost)
┌───────────────────▼─────────────────────────────────┐
│         Flow_ApiGateway.js  (Web App)               │
│  doGet → serves JSON data                           │
│  doPost → routes action to correct engine/function  │
└───────────────────┬─────────────────────────────────┘
                    │
┌───────────────────▼─────────────────────────────────┐
│       Flow_CentralTrigger.js  (Form Trigger)        │
│  trgV8_onFormSubmit(e) — dispatches by sheet name:  │
│  IN_COMPLAINTS     → Report_Complaint               │
│  IN_TECH_HOSP      → Report_TechHosp                │
│  IN_TECH_UNITS     → Report_TechUnits + Findings    │
│  IN_FIN            → Report_Financial               │
│  IN_INOUT          → Inbound/Outbound processing    │
└──────┬────────────────────────────────┬─────────────┘
       │                                │
┌──────▼──────────┐          ┌──────────▼──────────────┐
│  Report_*.js    │          │  Flow_*.js (Pipelines)  │
│  إنشاء الوثيقة  │          │  FindingsEngine         │
│  PDF + Archive  │          │  CAREngine              │
│  Email notify   │          │  FollowUpEngine         │
│  Shortcuts dist │          │  VerificationEngine     │
└──────┬──────────┘          │  EscalationEngine       │
       │                     │  AnalyticsEngine        │
       └──────────┬──────────┘
                  │  (كل طبقة تستدعي)
┌─────────────────▼───────────────────────────────────┐
│                  Core_ Layer                        │
│  Core_Config.js        — CONFIG · SHEETS · ENUMS    │
│  Core_SharedHelpers.js — Schema · SLA · Shortcuts   │
│  Core_EmailEngine.js   — emailV8_sendReportEmail    │
│  Core_AIEngine.js      — aiV8_correctText           │
│  Core_AuditEngine.js   — auditEngine_logEvent/Error │
└─────────────────────────────────────────────────────┘
```

### 2.2 دورة حياة التقرير (Report Lifecycle)

```
Google Form Submit
      ↓
trgV8_onFormSubmit(e)           [Flow_CentralTrigger]
      ↓
rptXxx_onSubmit(e)              [Report_*.js]
      ↓
rptXxx_create_(data)
  ├── aiV8_correctText(...)     [Core_AIEngine]   ← تصحيح النص
  ├── Doc template copy → fill  [DriveApp / DocApp]
  ├── PDF export → Archive      [Core_SharedHelpers: folderV8_archiveFile]
  ├── emailV8_sendReportEmail   [Core_EmailEngine] ← إيميل للموظف
  ├── iag_distributeShortcuts   [Core_SharedHelpers] ← Shortcut في فولدر كل موظف
  ├── auditEngine_logEvent      [Core_AuditEngine] ← تسجيل النجاح
  └── return { ok, docUrl, ... }
      ↓
findingsEngine_processLastRow() [Flow_FindingsEngine] ← (لتقارير الوحدات فقط)
      ↓
carEngine_processNewFindings_direct_() [Flow_CAREngine]
      ↓
followUpEngine / verificationEngine / escalationEngine  [Flow_*]
```

---

## 3. Single Source of Truth — الدوال المشتركة الأساسية

### 3.1 Core_Config.js — الثوابت والإعدادات

| الرمز | النوع | الوصف |
|-------|-------|-------|
| `CONFIG` | Object | مصدر الحقيقة الوحيد لكل إعداد. يُقرأ من `REF_SYSTEM_CONFIG` مع Cache |
| `CONFIG.SPREADSHEET_ID` | string | ID الـ Spreadsheet الرئيسي |
| `CONFIG.CAR_SPREADSHEET_ID` | string | ID الـ Spreadsheet الخاص بالـ CAR |
| `CONFIG.get(key, default)` | function | قراءة قيمة من `REF_SYSTEM_CONFIG` |
| `CONFIG.getWorkSharedRootId()` | function | ID فولدر العمل المشترك (Drive) |
| `CONFIG.getArchivePrivateRootId()` | function | ID فولدر الأرشيف الخاص |
| `CONFIG.isAIEnabled()` | function | هل الـ AI مفعَّل؟ |
| `CONFIG.getGeminiKey()` | function | مفتاح Gemini API |
| `SHEETS` | const | جميع أسماء الشيتات (alias لـ `CONFIG.SHEETS`) |
| `ENUMS` | const | كل قيم الحالة والتصنيف في النظام |
| `BUSINESS` | const | ثوابت العمل (SLA، أنواع المستندات) |

### 3.2 Core_SharedHelpers.js — الخدمات المشتركة

#### Schema (قراءة الشيتات)
| الدالة | الوصف |
|--------|-------|
| `schemaV8_buildHeaderMap(sheet)` | بناء خريطة `{headerName → columnIndex}` من صف الرؤوس |
| `schemaV8_pick(rowArr, headerMap, aliasList)` | استخراج قيمة من صف بالاسم مع دعم الأسماء البديلة |
| `schemaV8_normalizeDocType(raw)` | توحيد نوع المستند (وارد/صادر) |

#### Format (تنسيق البيانات)
| الدالة | الوصف |
|--------|-------|
| `fmtV8_dateArabic(d)` | تاريخ بالعربي: `الأحد ١٣ أبريل ٢٠٢٦` |
| `fmtV8_dateFileName(d)` | تاريخ لاسم الملف: `2026-04-13` |
| `fmtV8_monthFolderName_(d)` | اسم مجلد الشهر: `أبريل 2026` |
| `fmtV8_reportFolderName_(entity, prefix, d)` | اسم مجلد التقرير المركّب |
| `fmtV8_compositeId(number, dateOrYear)` | بناء رقم قيد مركّب |

#### SLA (أيام العمل)
| الدالة | الوصف |
|--------|-------|
| `slaV8_isWorkDay(d)` | هل اليوم يوم عمل؟ (الخميس-السبت إجازة) |
| `slaV8_addWorkdays(startDate, days)` | إضافة N يوم عمل |
| `slaV8_workdaysBetween(fromDate, toDate)` | حساب أيام العمل بين تاريخين |

#### Governance (قفل · إشعار · تشغيل آمن)
| الدالة | الوصف |
|--------|-------|
| `govV8_withLock(fn, timeoutMs)` | تشغيل دالة داخل Lock منع التكرار المتزامن |
| `govV8_isDuplicate(eventKey)` | كشف التكرار عبر ScriptProperties |
| `govV8_run(contextName, options, fn)` | تغليف آمن: Lock + Audit + Error handling |
| `govV8_notify(type, message, ref)` | كتابة إشعار في `OP_NOTIFICATIONS` |

#### Drive & Folders
| الدالة | الوصف |
|--------|-------|
| `folderV8_getOrCreate(parent, name)` | الحصول على مجلد أو إنشاؤه |
| `folderV8_getMonthFolder(parentFolder, date)` | مجلد الشهر `أبريل 2026` |
| `folderV8_archiveFile(file, fileName, reportType, date)` | أرشفة الملف في المسار الصحيح |

#### Shortcuts Distribution (التوزيع على فولدرات الموظفين)
| الدالة | الوصف |
|--------|-------|
| `iag_distributeShortcuts(file, reportType, entityOrId, dateObj, officersText)` | **الدالة الوحيدة** — توزيع Shortcut على فولدر كل موظف مذكور في النص |
| `_sh_getRegisteredEmployees()` | جلب أسماء الموظفين النشطين من `REF_EMPLOYEES` |
| `_sh_matchOfficers(officersText, registeredNames)` | مطابقة ذكية (جزئية، ثلاثية، ثنائية) للأسماء |
| `_sh_resolveCategory(reportType)` | تحديد التصنيف: `تقارير المرور` أو `فحص الشكوى` |
| `initEmployeeFolders()` | إعداد أولي لفولدرات الموظفين (تُشغَّل يدوياً مرة واحدة) |

> **القاعدة:** جميع ملفات `Report_*` تستدعي `iag_distributeShortcuts(...)` مباشرة — لا يوجد تعريف آخر في أي ملف آخر.

### 3.3 Core_AuditEngine.js — التسجيل المركزي

| الدالة | الوصف |
|--------|-------|
| `auditEngine_logEvent(module, actor, action, entity, details, level)` | تسجيل حدث ناجح في `OP_AUDIT_LOG` |
| `auditEngine_logError(context, err, details)` | تسجيل خطأ في `OP_ERRORS_LOG` |

> **القاعدة:** لا يُسمح بـ `console.log/warn/error` في ملفات الإنتاج. جميع التتبع يمر عبر `auditEngine_*`.  
> الاستثناء الوحيد: `Core_AuditEngine.js` نفسه (fallback مقصود) و`Tool_TestRunner.js` (مخرجات اختبار).

### 3.4 Core_EmailEngine.js — الإيميلات

| الدالة | الوصف |
|--------|-------|
| `emailV8_sendReportEmail(options)` | إرسال إيميل تقرير مع PDF مرفق وقالب HTML |

الـ `options` المطلوبة:
```js
{
  reportType:  "COMPLAINT" | "FINANCIAL" | "TECH_HOSP" | "TECH_UNITS",
  authorName:  "اسم الموظف",
  authorEmail: "email@example.com",
  entityOrId:  "اسم الجهة أو رقم القيد",
  dateStr:     "الأحد ١٣ أبريل ٢٠٢٦",
  docUrl:      "https://docs.google.com/...",
  pdfBlob:     Blob | null,
  addressee:   "وكيل الوزارة"
}
```

### 3.5 Core_AIEngine.js — تصحيح النصوص

| الدالة | الوصف |
|--------|-------|
| `aiV8_correctText(text, options)` | تصحيح لغوي وإملائي عبر Gemini API |

```js
// options:
{ mode: "fix_only" | "enhance", context: "complaint" | "technical" }
```

---

## 4. Connectivity — كيف يتصل Frontend بالـ Backend

### 4.1 نموذج الاستدعاء عبر `google.script.run`

الـ Frontend (HTML pages داخل GAS أو HtmlService) يستدعي دوال الـ Backend مباشرة:

```javascript
// ── قراءة بيانات (الدوال المُعادة من doGet/doPost) ──────────────────
google.script.run
  .withSuccessHandler(function(result) {
    // result = كائن JSON
    renderData(result);
  })
  .withFailureHandler(function(error) {
    console.error("خطأ:", error.message);
  })
  .functionNameInBackend(param1, param2);
```

### 4.2 نموذج HTTP (Web App) — للصفحات المستقلة عن GAS

الـ Frontend المستقل (GitHub Pages أو خادم خارجي) يتصل عبر `fetch`:

```javascript
// POST — تنفيذ إجراء
const BASE_URL = "https://script.google.com/macros/s/DEPLOYMENT_ID/exec";

fetch(BASE_URL, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    action: "getEmployees",   // اسم الإجراء
    pin:    "1234"            // بيانات التحقق
  })
})
.then(r => r.json())
.then(data => {
  if (data.ok) renderEmployees(data.employees);
  else         showError(data.error);
});
```

### 4.3 الـ Actions المتاحة في Flow_ApiGateway.js (doPost)

| action | الوصف | الـ Output |
|--------|-------|-----------|
| `getEmployees` | قائمة الموظفين النشطين | `{ ok, employees: [...] }` |
| `getInout` | سجلات الوارد/الصادر | `{ ok, records: [...] }` |
| `getNotifications` | إشعارات الموظف | `{ ok, notifications: [...] }` |
| `markNotifRead` | تحديد إشعار كمقروء | `{ ok }` |
| `getFindings` | ملاحظات الجودة | `{ ok, findings: [...] }` |
| `getCarRegister` | سجل CARs | `{ ok, cars: [...] }` |
| `updateCarSection` | تحديث قسم CAR (Portal) | `{ ok }` |
| `getStatistics` | لقطة إحصائية | `{ ok, stats: {...} }` |
| `getAuditLog` | سجل الأحداث | `{ ok, log: [...] }` |
| `getErrorLog` | سجل الأخطاء | `{ ok, errors: [...] }` |
| `runAnalytics` | إعادة حساب الإحصاءات | `{ ok }` |

### 4.4 مسار التكامل المستقبلي (Phase 5)

```
Frontend Page (GitHub Pages)
        │
        │  fetch(BASE_URL, { action, ... })
        ▼
Flow_ApiGateway.js → doPost(e)
        │
        ├── validateRequest(pin / adminPin)
        ├── route to correct Core_/Flow_ function
        └── return JSON { ok: true/false, data, error? }
```

**قواعد الأمان:**
- جميع الـ actions التي تُغيّر بيانات تتطلب `pin` أو `adminPin`
- التحقق يتم عبر `REF_EMPLOYEES` (PIN) أو `REF_HEALTH_ADMINS` (Admin PIN)
- كل طلب يُسجَّل في `OP_AUDIT_LOG` عبر `auditEngine_logEvent`
- كل خطأ يُسجَّل في `OP_ERRORS_LOG` عبر `auditEngine_logError`

---

## 5. Sheet Registry — الشيتات الرئيسية

| المعرّف في الكود | اسم الشيت الفعلي | الغرض |
|-----------------|-----------------|-------|
| `SHEETS.SYSTEM_CONFIG` | `REF_SYSTEM_CONFIG` | إعدادات النظام (مصدر الحقيقة) |
| `SHEETS.EMPLOYEES` | `REF_EMPLOYEES` | بيانات الموظفين والـ PIN |
| `SHEETS.HEALTH_ADMINS` | `REF_HEALTH_ADMINS` | مديرو الإدارات الصحية |
| `SHEETS.COMPLAINTS_RESPONSES` | `IN_COMPLAINTS` | استجابات نموذج الشكاوى |
| `SHEETS.TECH_HOSP_RESPONSES` | `IN_TECH_HOSP` | استجابات مرور المستشفيات |
| `SHEETS.TECH_UNITS_RESPONSES` | `IN_TECH_UNITS` | استجابات مرور الوحدات |
| `SHEETS.FIN_RESPONSES` | `IN_FIN` | استجابات المرور المالي |
| `SHEETS.INOUT_MASTER` | `OP_INOUT_MASTER` | سجل الوارد والصادر |
| `SHEETS.FINDINGS` | `OP_FINDINGS` | ملاحظات الجودة |
| `SHEETS.CAR` | `CAR_REGISTER` | سجل الإجراءات التصحيحية |
| `SHEETS.CAR_SECTIONS` | `CAR_SECTIONS` | أقسام كل CAR |
| `SHEETS.AUDIT_LOG` | `OP_AUDIT_LOG` | سجل الأحداث |
| `SHEETS.ERRORS_LOG` | `OP_ERRORS_LOG` | سجل الأخطاء |
| `SHEETS.STATISTICS` | `OP_STATISTICS` | اللقطات الإحصائية |

---

## 6. Naming & Code Conventions — قواعد الكتابة

| القاعدة | التفصيل |
|---------|---------|
| **File Prefix** | `Core_` · `Flow_` · `Report_` · `Tool_` — إلزامي لكل ملف جديد |
| **Private functions** | تنتهي بـ `_` مثل `rptComplaint_create_()` — لا تُستدعى من الخارج |
| **Public API** | بدون `_` في النهاية — قابلة للاستدعاء من أي ملف |
| **No console.*** | يُحظر في ملفات الإنتاج — استخدم `auditEngine_logEvent/Error` |
| **No Tailwind** | لون الهيدر الموحد `#0a5c56` — CSS محلي فقط |
| **Single iag_distributeShortcuts** | دالة واحدة فقط في `Core_SharedHelpers.js` |
| **CONFIG as oracle** | كل قيمة ثابتة تُقرأ من `CONFIG.*` — لا hardcoding |

---

## 7. Tool_ — أدوات التطوير والاختبار

### Tool_TestRunner.js
```js
testAll()                  // شغّل كل الاختبارات دفعة واحدة
testComplaintReport()      // آخر شكوى من IN_COMPLAINTS
testFinancialReport()      // آخر مرور مالي من IN_FIN
testTechHospReport()       // آخر مرور فني مستشفيات
testTechUnitsReport()      // آخر مرور فني وحدات
testEmailEngine()          // إيميل حقيقي لآخر موظف نشط
testAIEngine()             // تصحيح AI لآخر شكوى
testLogo()                 // تحقق من URL الشعار في قالب الإيميل
```

### Tool_Diagnostics.js
أدوات فحص صحة النظام: التحقق من الـ config، حالة الـ triggers، والـ Drive folders.

### Tool_Menu.js
قوائم Apps Script اليدوية للتشغيل من واجهة المحرر.

---

*آخر تحديث: 2026-04-13 — تم إنشاء هذا الملف بعد اكتمال مرحلة Housekeeping (إعادة تسمية الملفات وتوحيد منطق Shortcuts).*
