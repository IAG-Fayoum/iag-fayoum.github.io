# IAG System — خريطة سير العمل الكاملة
## مديرية الشؤون الصحية بالفيوم | Internal Audit & Governance System

---

## نظرة عامة على النظام

النظام مقسم إلى **طبقتين**:

| الطبقة | التقنية | الدور |
|--------|---------|-------|
| **Backend** | Google Apps Script (GAS) | معالجة البيانات، الـ Triggers، الإيميلات |
| **Frontend** | GitHub Pages (HTML ثابت) | واجهة المستخدم — موبايل + ديسكتوب |

---

## المستخدمون والصلاحيات

| الدور | الوصف | الصفحة الرئيسية |
|-------|-------|-----------------|
| **مدير** / Admin | مدير النظام | `admin.html` |
| **منسق** | منسق المراجعة الداخلية | `coordinator.html` |
| **مراجع فني** (default) | المراجع الميداني | `employee.html` |
| **مدير إدارة صحية** | خارجي — بدون حساب داخلي | `portal.html` (بكود + PIN) |

---

## أولاً: المسار الرئيسي — دورة حياة المعاملة

```
[1] إدخال البيانات
    ↓
    Google Form (خارج النظام)
    ↳ IN_INOUT / IN_COMPLAINTS / IN_TECH_HOSP / IN_TECH_UNITS / IN_FIN

[2] Trigger تلقائي (GAS)
    ↓
    03_CentralTrigger.js → trgV8_onFormSubmit()
    ↳ يحدد الشيت المصدر → يوجه للـ Engine المناسب

[3] المعالجة (حسب نوع الفورم)
    ↓
    IN_INOUT       → engine_processLastInbound() + outbound_processLastOutbound()
    IN_COMPLAINTS  → complaints_processLastComplaint() + rptComplaint_onSubmit()
    IN_TECH_HOSP   → rptTechHosp_onSubmit()
    IN_TECH_UNITS  → rptTechUnits_onSubmit() + findingsEngine_processLastRow()
    IN_FIN         → rptFin_onSubmit()

[4] النواتج
    ↓
    OP_INOUT_MASTER   ← بيانات المعاملة المعالجة
    OP_FINDINGS       ← المخالفات/الملاحظات المستخرجة (من التقارير الفنية)
    OP_REPORTS_LOG    ← سجل التقارير
    OP_NOTIFICATIONS  ← إشعارات للموظفين
    ↓
    04_EmailEngine.js ← إيميل + PDF للمعني بالمعاملة

[5] مشاهدة النتائج (Frontend)
    ↓
    coordinator.html  ← المنسق يرى كل المعاملات
    employee.html     ← الموظف يرى مهامه فقط
    distribution.html ← المؤشرات والإحصائيات (للجميع)
```

---

## ثانياً: مسار CAR (الإجراءات التصحيحية)

```
[1] اكتشاف الملاحظات
    ↓
    التقارير الفنية (IN_TECH_UNITS / IN_TECH_HOSP)
    ↓
    08_FindingsEngine.js → findingsEngine_processLastRow()
    ↳ يستخرج المخالفات → OP_FINDINGS (في Governance_Master_DB)

[2] توليد خطابات CAR
    ↓
    10_CAREngine.js → يقرأ OP_FINDINGS
    ↳ يجمع المخالفات بالوحدة والإدارة الصحية
    ↳ ينشئ CAR_REGISTER (رقم CAR + الجهة + الموعد النهائي)
    ↳ ينشئ CAR_SECTIONS (قسم × ملاحظاته)
    ↳ يرسل إيميل لـ مدير الإدارة الصحية بـ link للبوابة
       (carEngine_notifyAdminPortal_)

[3] متابعة + تصعيد
    ↓
    11_FollowUpEngine.js  ← يضيف مواعيد متابعة في CAR_FOLLOWUP
    12_VerificationEngine.js ← يتحقق من الإجراءات التصحيحية
    13_EscalationEngine.js   ← يصعّد للمدير/الوزارة إذا تأخر الرد

[4] الواجهة الداخلية — للمراجع الفني
    ↓
    car.html
    ↳ getCARSections → يعرض الأقسام + الملاحظات
    ↳ updateSectionStatus → يحدث الحالة (مفتوح/جاري/مغلق/معلق)
    ↳ staff_note → ملاحظات الموظف

[5] بوابة الإدارة الصحية — خارجية
    ↓
    portal.html
    ↳ portalLogin → دخول بـ admin_code + PIN
    ↳ portalGetSections → يعرض أقسام الجهة فقط
    ↳ portalSubmitResponse → مدير الإدارة يرد على كل قسم

[6] لوحة إدارة CAR — للمنسق/المدير
    ↓
    car-dashboard.html
    ↳ getCARs → إحصائيات ونظرة عامة
    ↳ (قراءة فقط — read-only)
```

---

## ثالثاً: خريطة الصفحات (Frontend)

```
iag-fayoum.github.io/
│
├── index.html          ← تسجيل الدخول (login + PIN)
│
├── admin.html          ← لوحة المدير (مدير فقط)
├── coordinator.html    ← كل المعاملات (منسق + مدير)
├── employee.html       ← مهامي (مراجع فني)
│
├── findings.html       ← الملاحظات المرصودة (مراجع فني)
├── car.html            ← CAR — الأقسام والملاحظات (مراجع فني)
├── car-dashboard.html  ← إحصائيات CAR (منسق + مدير)
│
├── distribution.html   ← المؤشرات والإحصائيات (للجميع)
├── notifications.html  ← الإشعارات (للجميع)
├── forms.html          ← النماذج الإلكترونية (للجميع)
├── settings.html       ← الإجراءات الإدارية (منسق + مدير)
│
├── portal.html         ← [قيد البناء] بوابة مدير الإدارة الصحية
├── portal_car.html     ← نسخة قديمة (سيُستبدل بـ portal.html)
│
└── assets/js/
    ├── config.js       ← API_URL
    ├── auth.js         ← auth.checkAuth() + login
    └── nav.js          ← بناء bottom nav + side menu من الدور
```

---

## رابعاً: الـ Backend Actions (API)

### Auth
| Action | الوصف |
|--------|-------|
| `login` | تسجيل دخول بموبايل + PIN |
| `portalLogin` | دخول البوابة الخارجية بـ admin_code + PIN |

### المعاملات (Inbound/Outbound)
| Action | الوصف |
|--------|-------|
| `getAllData` | كل المعاملات (للمنسق) |
| `getTasks` | مهام موظف بعينه |
| `updateStatus` / `updateTaskStatus` | تحديث حالة معاملة |
| `updateTaskField` | تحديث حقل معين |
| `reassignTask` | نقل مهمة لموظف آخر |
| `uploadArchiveFile` | رفع ملف أرشيف |

### الإشعارات
| Action | الوصف |
|--------|-------|
| `getNotifications` | جلب الإشعارات |
| `markAsRead` | تعليم كمقروء |
| `markAllRead` | تعليم الكل كمقروء |
| `deleteNotification` | حذف إشعار |
| `deleteAllNotifications` | حذف الكل |

### CAR System
| Action | الوصف |
|--------|-------|
| `getFindings` | جلب الملاحظات من OP_FINDINGS |
| `getCARs` | جلب خطابات CAR من CAR_REGISTER |
| `getCARSections` | جلب الأقسام من CAR_SECTIONS |
| `getFollowUps` | جلب جدول المتابعة |
| `getEscalations` | جلب التصعيدات |
| `updateSectionStatus` | تحديث حالة قسم (مراجع فني) |
| `closeCAR` | إغلاق خطاب CAR |
| `portalGetSections` | جلب أقسام الإدارة الصحية (بوابة) |
| `portalSubmitResponse` | رد مدير الإدارة على قسم |

### قيد التطوير
| Action | الوصف |
|--------|-------|
| `getQuarterlyReport` | التقرير الربعي |
| `downloadReportLink` | رابط تحميل التقرير |

---

## خامساً: قواعد البيانات

### Governance_Master_DB
```
REF_EMPLOYEES       ← بيانات الموظفين (اسم، إيميل، PIN، دور)
REF_SYSTEM_CONFIG   ← إعدادات النظام (IDs، مفاتيح API)
REF_DIST_RULES      ← قواعد التوزيع التلقائي
REF_FINDING_CODES   ← أكواد المخالفات/الملاحظات
REF_HEALTH_ADMINS   ← بيانات مدراء الإدارات الصحية (كود، PIN، إيميل)
REF_AI_GLOSSARY     ← مسرد AI للتلخيص

IN_INOUT            ← ردود فورم الصادر والوارد
IN_COMPLAINTS       ← ردود فورم الشكاوى
IN_TECH_HOSP        ← ردود فورم المرور الفني مستشفيات
IN_TECH_UNITS       ← ردود فورم المرور الفني وحدات
IN_FIN              ← ردود فورم المرور المالي

OP_INOUT_MASTER     ← المعاملات المعالجة (master list)
OP_NOTIFICATIONS    ← الإشعارات للموظفين
OP_REPORTS_LOG      ← سجل التقارير
OP_FINDINGS         ← الملاحظات/المخالفات المستخرجة
OP_AUDIT_LOG        ← سجل كل العمليات
OP_ERRORS_LOG       ← سجل الأخطاء
```

### Governance_CAR_DB
```
CAR_REGISTER    ← خطابات CAR (car_id، الجهة، الموعد، الحالة)
CAR_SECTIONS    ← الأقسام (قسم × ملاحظاته × رد البوابة × حالة الموظف)
CAR_FOLLOWUP    ← مواعيد المتابعة
CAR_VERIFICATION← التحقق من الإجراءات التصحيحية
CAR_ESCALATIONS ← التصعيدات الإدارية
CAR_LEGAL       ← [مخطط مستقبلاً] الملفات القانونية
```

---

## سادساً: ما تبقى من التطوير

### Phase 2 — جارٍ
- [x] findings.html — عرض الملاحظات للمراجع الفني
- [x] car.html — الأقسام والملاحظات للمراجع الفني
- [x] car-dashboard.html — إحصائيات CAR للمنسق/المدير
- [ ] **portal.html** — بوابة مدير الإدارة الصحية (التالي)

### Phase 3 — Backend
- [ ] getQuarterlyReport — تقرير ربعي
- [ ] downloadReportLink — رابط تحميل

### Phase 5 — مستقبلاً
- [ ] CAR_LEGAL — ملفات قانونية
- [ ] Analytics — تحليلات متقدمة

---

*آخر تحديث: أبريل 2026*
