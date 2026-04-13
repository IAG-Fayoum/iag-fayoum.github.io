# progress.md — تتبع خارطة الطريق

**المشروع:** IAG-System-2026  
**الغرض:** متابعة المراحل الرئيسية وربطها بخطط العمل في `docs/`.

**آخر تحديث:** 2026-04-14 — **Sprint 3 Block B مكتمل — Employee & Field Operations**

---

## أرشفة الملفات القديمة — Frontend/legacy/ (2026-04-13)

تم نقل الملفات التالية إلى `Frontend/legacy/` (لم تُحذف — محفوظة للمرجعية):

| الملف | السبب |
|-------|-------|
| `car.html` | stub إعادة توجيه فقط → `findings.html` |
| `car-dashboard.html` | لوحة قديمة، محلّها `findings.html` |
| `phc_form.html` | نموذج قديم، غير مرتبط بالنافيجيشن |
| `portal_car.html` | نسخة بوابة قديمة، محلّها `portal.html` |
| `card.css` | ملف CSS في مجلد الجذر بلا استخدام |
| `card.js` | ملف JS في مجلد الجذر بلا استخدام |
| `restyle.js` | سكريبت مؤقت، لا وظيفة إنتاجية |
| `PLAN.md` | التوثيق ينتمي لـ `docs/`، لا لـ `Frontend/` |
| `WORKFLOW.md` | نفس السبب — مُدمج في `system_blueprint.md` |

---

**آخر تحديث:** 2026-04-13 — **System Blueprint Created** — إنشاء `docs/system_blueprint.md` كمرجع دائم للنظام (هيكل الملفات · تدفق المنطق · الدوال المشتركة · تكامل الـ Frontend). — إعادة تسمية جميع ملفات Backend/ وفق معيار `Core_/Flow_/Report_/Tool_`؛ دمج منطق Shortcuts في `Core_SharedHelpers.js` وحذف `Core_FolderShortcuts.js`؛ إزالة الـ wrapper المكرر `iag_distributeShortcuts` من `Report_TechUnits.js`؛ تصحيح مراجع قديمة في `Tool_TestRunner.js`.

---

## المراحل (Legacy Roadmap)

| # | المرحلة | الحالة | ملاحظات |
|---|---------|--------|----------|
| 0 | حماية البيانات (نسخ احتياطي للشيتات) | ⬜ لم تبدأ | وفق سياسة المؤسسة قبل تغييرات إنتاجية كبيرة. |
| 1 | التأسيس والفحص (CLAUDE.md، `docs/`، تقرير التدقيق الفني) | ✅ مكتملة | `architecture.md` يوثق نتائج الفحص. |
| 2 | تنظيف وتوحيد الفرونت إند (إزالة Tailwind، توحيد `#0a5c56`) | ✅ مكتملة | جميع الصفحات النشطة تم تنظيفها. |
| 3 | Backend: أمان + إزالة الازدواجية + Router | ✅ مكتملة | `backend-plan.md` |
| 4 | Audit Logs + Housekeeping | ✅ مكتملة | إعادة تسمية الملفات، دمج Shortcuts، إزالة console.* |
| 5 | **Phase 5 Frontend — Core + Design System + Block Migrations** | 🔄 **قيد التنفيذ** | انظر جدول Phase 5 أدناه |
| 6 | ربط Frontend بالـ Backend (تكامل كامل) | ⬜ لم تبدأ | بعد اكتمال Phase 5 |
| 7 | تحسينات اختيارية | ⬜ لم تبدأ | أداء، UX، توثيق تشغيلي إضافي |

---

## Phase 5 — Frontend Evolution (المرحلة النشطة)

المرجع التنفيذي: [`frontend-master-plan.md`](frontend-master-plan.md) · [`frontend-rules.md`](frontend-rules.md)

### Sprints

| Sprint | الوصف | الحالة | الصفحات |
|--------|-------|--------|---------|
| **1A** | Core Logic Foundation (api.js + session.js + ui-feedback.js) | ✅ **مكتمل** | — |
| **1B** | Design System Core (tokens + base + components + ios) | ✅ **مكتمل** | — |
| **2** | Block A — Management & Coordination | ✅ **مكتمل** | `admin` · `coordinator` · `settings` · `notifications` |
| **3** | Block B — Employee & Field Operations | ✅ **مكتمل** | `employee` · `forms` · `findings` · `portal` |
| **4** | Block C — Analytics & Dashboard + Final Consolidation | ⬜ لم تبدأ | `dashboard` · `distribution` · `index` |

### تفاصيل Sprint 1A (2026-04-13)
- إنشاء `core/api.js`: طبقة موحدة لكل الاتصالات، response normalization (`ok/success` → `ok`)، timeout support
- إنشاء `core/session.js`: `getUser / setUser / clearSession / requireAuth / logout`، مفاتيح `iag_user / iag_last_page / iag_session_ts`
- إنشاء `core/ui-feedback.js`: loading overlay + toast (success/error/info)

### تفاصيل Sprint 1B (2026-04-13)
- إنشاء `assets/css/system/tokens.css` — متغيرات اللون والمسافات والنص
- إنشاء `assets/css/system/base.css` — Reset + RTL defaults + typography
- إنشاء `assets/css/system/components.css` — buttons, cards, tables, forms, badges
- إنشاء `assets/css/system/ios.css` — safe-area + 44px tap targets
- إنشاء `assets/css/system/iag-design-system.css` — الـ entrypoint الوحيد

### تفاصيل Sprint 2 — Block A (2026-04-14)
- `admin.html + admin.js` — صفحة جديدة كاملة، IAGSession + IAGApi + IAGFeedback
- `coordinator.js` — Pilot Page: IAGSession + IAGApi (لا fetch مباشر)
- `notifications.html/js` — design system + IAGSession + IAGApi + IAGFeedback
- `settings.html/js` — design system + IAGSession + IAGFeedback
- إزالة جميع `style="..."` inline من Block A
- `auth.js` + `nav.js` محذوفة من script tags Block A

### تفاصيل Sprint 3 — Block B (2026-04-14)
- `employee.html/js` — IAGSession.requireAuth()، IAGApi لـ tasks + files، IAGFeedback للتحميل والأخطاء
- `forms.html/js` — صفحة عامة (بدون requireAuth)، IAGSession.getUser() للضيوف والمسجلين
- `findings.html/js` — IAGSession + IAGApi لكل calls، IAGFeedback يحل محل showToast() المحلية، حذف `<div class="toast">`
- `portal.html` — إعادة بناء كاملة: استخراج 200 سطر `<style>` → `portal.css`، استخراج `<script>` → `portal.js`، كل fetch() → IAGApi
- `core/api.js` — إضافة 7 endpoints: `getEmployeeFiles, getFindings, updateFindingStatus, getCARSections, portalLogin, portalGetSections, portalSubmitResponse`
- ملاحظة: portal يستخدم `sessionStorage` (استثناء موثق — نوع مستخدم مختلف)

---

## الوضع الحالي للمشروع (ملخص — 2026-04-14)

- **Frontend:** 8 من 11 صفحة مهاجرة بالكامل لـ core runtime (IAGApi + IAGSession + IAGFeedback + IAG Design System). المتبقي: Block C (`dashboard`, `distribution`, `index`).
- **Backend:** مكتمل — Audit Engine مطبق، ملفات مُعاد تسميتها، `console.*` محذوفة، الكود نظيف 100%.
- **التوثيق:** `CLAUDE.md` + `frontend-rules.md` + `frontend-master-plan.md` + `system_blueprint.md` محدّثة وتحكم كل عمل.

---

## آخر تحديث (سجل مختصر)

- **2026-04-12:** إكمال المرحلة 1 (التأسيس والفحص)؛ اعتماد `architecture.md` كمرجع للتدقيق؛ بدء المرحلة 2 كمرحلة حالية على مستوى التخطيط والتنفيذ القادم.
- **2026-04-12:** [المرحلة 2 — الخطوة 2] تصحيح `assets/css/theme.css`: استبدال `#0f172a` بـ `#0a5c56` في `.page-header`، `.side-menu-header`، `.notif-dot`؛ تحديث التدرجات لتتوافق مع `iag-theme.css`؛ التعارض بين الملفين محلول.
- **2026-04-12:** [المرحلة 2 — الخطوة 3+4+5 / index.html] إزالة Tailwind CDN؛ فصل CSS (147 سطر) → `assets/css/index.css`؛ فصل JS (90 سطر) → `assets/js/index.js`؛ توحيد لون الهيدر إلى `#0a5c56`؛ استبدال جميع utility classes بكلاسات دلالية.
- **2026-04-12:** [المرحلة 2 — الخطوة 3+4+5 / dashboard.html] إزالة Tailwind CDN؛ تصحيح `meta theme-color` من `#0f766e` إلى `#0a5c56`؛ فصل CSS (207 سطر) → `assets/css/dashboard.css`؛ فصل JS (420 سطر) → `assets/js/dashboard.js`؛ إصلاح خطأ syntax في attribute الـ style.
- **2026-04-12:** [المرحلة 2 — الخطوة 3+4+5 / settings.html] إزالة Tailwind CDN؛ تصحيح `meta theme-color` من `#0f766e` إلى `#0a5c56`؛ إصلاح `--primary` من `#0f766e` إلى `#0a5c56`؛ فصل CSS → `assets/css/settings.css`؛ فصل JS → `assets/js/settings.js`؛ استبدال Tailwind classes (`space-y-3`, `text-teal-600`, `text-blue-600`, `bg-blue-600`, `animate-pulse`, `w-4 h-4`, `lg:hidden`) بكلاسات دلالية محلية؛ إصلاح syntax خطأ في attribute الـ style.
- **2026-04-12:** [المرحلة 2 — الخطوة 3+4+5 / notifications.html] إزالة Tailwind CDN؛ تصحيح `meta theme-color` و`--primary` إلى `#0a5c56`؛ فصل CSS → `assets/css/notifications.css`؛ فصل JS → `assets/js/notifications.js`؛ استبدال جميع Tailwind classes في HTML وفي template strings داخل JS (`bg-*-100`, `text-*-600`, `w-* h-*`, `animate-spin`, `font-bold`, `text-lg`, `lg:hidden`) بكلاسات دلالية ومعاملات inline style؛ إصلاح syntax خطأ في attribute الـ style.
- **2026-04-12:** [المرحلة 2 — الخطوة 3+4+5 / forms.html] إزالة Tailwind CDN؛ تصحيح `meta theme-color` إلى `#0a5c56`؛ فصل CSS → `assets/css/forms.css`؛ فصل JS → `assets/js/forms.js`؛ استبدال `w-6 h-6` / `w-5 h-5` → inline style؛ استبدال `bg-teal`/`bg-rose`/`bg-amber`/`bg-blue`/`bg-violet` → كلاسات دلالية لا تتعارض مع theme؛ إزالة جميع Tailwind classes من `float-login-btn` وإنشاء `.btn-float-login`؛ إزالة `lg:hidden` من bottom-nav.
- **2026-04-13:** [المرحلة 2 — الخطوة 3+4+5 / coordinator.html] إزالة Tailwind CDN؛ تصحيح `meta theme-color` إلى `#0a5c56`؛ فصل CSS (298 سطر + helpers) → `assets/css/coordinator.css`؛ فصل JS (~940 سطر) → `assets/js/coordinator.js`؛ استبدال `px-2` على f-input → محذوف (مدمج بالفعل)؛ `flex gap-2 items-end` → `.filter-actions`؛ `w-4 h-4` / `w-5 h-5` / `w-8 h-8` / `w-10 h-10` على أيقونات → inline style؛ `animate-spin text-teal-600 font-bold text-gray-500` → `.spin` + inline style؛ modal header classes → inline style + `.modal-close-btn`؛ modal body classes → `.modal-label` / `.modal-note` / `.f-input.modal-select`؛ modal footer buttons → `.btn-modal-primary` / `.btn-modal-cancel`؛ `lg:hidden` محذوف من bottom-nav؛ Tailwind في JS template strings (loader، table rows) → inline style.
- **2026-04-13:** [المرحلة 2 — الخطوة 3+4+5 / employee.html] إزالة Tailwind CDN؛ تصحيح `meta theme-color` و`--primary` وجميع `#0f766e` في CSS إلى `#0a5c56`؛ فصل CSS (154 سطر) → `assets/css/employee.css`؛ فصل JS (card render + page logic، ~860 سطر) → `assets/js/employee.js`؛ استبدال `px-2` على select/inputs بـ `.f-input` المدمج؛ `flex gap-2 items-end` → `.filter-actions`؛ `w-5 h-5` / `w-4 h-4` / `w-10 h-10` → inline style؛ `animate-spin text-teal-600 font-bold text-gray-500` → inline style؛ `font-bold text-lg text-gray-900` / `text-xs text-gray-500 font-mono` على modal → inline style؛ `p-2 bg-gray-100 rounded-full hover:*` → `.modal-close-btn`؛ `lg:hidden` محذوف من bottom-nav؛ `font-bold text-red-500` في JS template strings → inline style.
- **2026-04-13:** [المرحلة 2 — الخطوة 3+4+5 / findings.html] إزالة Tailwind CDN؛ تصحيح `meta theme-color` و`--primary` وجميع `#0f766e` في CSS إلى `#0a5c56`؛ فصل CSS → `assets/css/findings.css`؛ فصل JS → `assets/js/findings.js`؛ استبدال `grid grid-cols-2 gap-3 mb-3` → `.filter-grid`؛ `animate-spin` → `.spin`؛ `w-5 h-5` → inline style؛ `font-bold text-gray-400` → `.loader-lbl`؛ `lg:hidden` محذوف.
- **2026-04-13:** [المرحلة 4 / Audit Logs] تطبيق `15_AuditEngine.js` بالكامل على `03_CentralTrigger.js` عبر استبدال `govV8_logError` و `govV8_audit` مركزياً، وتغليف الدوال بـ try/catch لتوجيه الأخطاء إلى `OP_ERRORS_LOG`.
- **2026-04-13:** [المرحلة 4 / Audit Logs] تطبيق `15_AuditEngine.js` بالكامل على `02_SharedHelpers.js` عبر استبدال دوال التسجيل وتغليف الدوال الحساسة بـ try/catch أمنياً للمراقبة المركزية.
- **2026-04-13:** [المرحلة 4 / Audit Logs] تطبيق `15_AuditEngine.js` بالكامل على `04_EmailEngine.js` واستبدال معالجات الأخطاء وتغليف الدوال الحساسة بالإيميل للحماية المركزية.
- **2026-04-13:** [المرحلة 4 / Audit Logs] تطبيق `15_AuditEngine.js` بالكامل على `05_AIEngine.js` والمزيد من التغليف المركزي لدوال الذكاء الاصطناعي مع إتاحة Fallback لضمان استمرارية الخدمة.
- **2026-04-13:** [المرحلة 4 / Audit Logs] تطبيق `15_AuditEngine.js` بالكامل على كل من `06_Report_Complaint.js` و `07_Report_Financial.js` مع توجيه الأخطاء الجزئية للمركز وتأمين الخدمات الخارجية.
- **2026-04-13:** [المرحلة 4 / Audit Logs] تطبيق `15_AuditEngine.js` بالكامل على `08_FindingsEngine.js` واستبدال دوال التسجيل وتغليف الاستخراج والمعالجة بـ try/catch.
- **2026-04-13:** [المرحلة 4 / Audit Logs] تطبيق `15_AuditEngine.js` بالكامل على `08_Report_TechHosp.js` و `09_Report_TechUnits.js` مع تأمين دوال تجميع الأقسام وإنشاء التقرير بالتغليف الشامل.
- **2026-04-13:** [المرحلة 4 / Audit Logs] تطبيق `15_AuditEngine.js` بالكامل على `10_CAREngine.js` و `10_QuarterlyReport.js` — استبدال `govV8_audit`/`govV8_logError` وتغليف `carEngine_processNewFindings_direct_` و `generateQuarterlyReport` بـ try/catch مع إعادة رمي الاستثناء.
- **2026-04-13:** [المرحلة 4 / Audit Logs] تطبيق `15_AuditEngine.js` على `11_FollowUpEngine.js` — تغليف `followUpEngine_processNewCARs_direct_` واستبدال دوال التسجيل. `11_Folderv8_shortcuts.js` كان نظيفاً بالفعل (try/catch + Logger.log بلا govV8_*).
- **2026-04-13:** [المرحلة 4 / Audit Logs] تطبيق `15_AuditEngine.js` على `12_VerificationEngine.js` و `13_EscalationEngine.js` — تغليف الدوال الرئيسية واستبدال جميع `govV8_audit`/`govV8_logError`.
- **2026-04-13:** [المرحلة 4 / Audit Logs] تطبيق `15_AuditEngine.js` على `14_AnalyticsEngine.js` — تغليف `analytics_computeLive_` و `analytics_computeFiltered_` و `analytics_writeSnapshot_` بـ try/catch وإضافة `auditEngine_logEvent` عند كتابة الـ snapshot.
- **2026-04-13:** [System Blueprint] إنشاء `docs/system_blueprint.md` — مرجع دائم يوثّق هيكل الملفات، طبقات المنطق، الدوال المشتركة، Sheet Registry، قواعد الكتابة، ومسار التكامل المستقبلي مع الـ Frontend.
- **2026-04-13:** [المرحلة 4 / Housekeeping] إعادة تسمية جميع ملفات `Backend/` وفق معيار `Core_/Flow_/Report_/Tool_` (22 ملفاً)؛ دمج منطق Shortcuts الكامل من `Core_FolderShortcuts.js` في `Core_SharedHelpers.js` وحذف الملف الأصلي؛ إضافة alias `folderV8_distributeShortcuts_` للتوافق مع الاستدعاءات الموجودة؛ إزالة الـ wrapper المكرر `iag_distributeShortcuts` من `Report_TechUnits.js`؛ تصحيح `Tool_TestRunner.js` — استبدال `rptTechHospV7_createTechnicalReport` بـ `rptTechHosp_onSubmit` و`techUnitsV8_create_` بـ `rptTechUnits_testLastRow`.
- **2026-04-13:** [المرحلة 4 / Final Audit] تدقيق شامل على الـ Backend بالكامل (01-15) — اكتشاف وإزالة ~62 استدعاء `console.log/warn/error` متبقياً عبر 12 ملفاً: `02_SharedHelpers` (9)، `03_CentralTrigger` (11)، `04_EmailEngine` (3)، `05_AIEngine` (11)، `06_Report_Complaint` (1)، `08_Report_TechHosp` (9)، `09_Report_TechUnits` (11)، `10_CAREngine` (1)، `11_FollowUpEngine` (1)، `12_VerificationEngine` (1)، `13_EscalationEngine` (2)، `14_AnalyticsEngine` (1). استُبدلت بـ `auditEngine_logEvent`/`auditEngine_logError` أو حُذفت (traces). جميع ملفات الإنتاج نظيفة 100%. المرحلة 4 مكتملة لوجستياً — الباقي فقط إعداد Clasp.
