# progress.md — تتبع خارطة الطريق

**المشروع:** IAG-System-2026  
**الغرض:** متابعة المراحل الرئيسية وربطها بخطط العمل في `docs/`.

**آخر تحديث:** 2026-04-13 — المرحلة 2 قيد التنفيذ: أُنجز 7 صفحات (index، dashboard، settings، notifications، findings، forms، employee) — إزالة Tailwind CDN وفصل CSS/JS وتوحيد `#0a5c56` على جميعها.

---

## المراحل

| # | المرحلة | الحالة | ملاحظات |
|---|---------|--------|----------|
| 0 | حماية البيانات (نسخ احتياطي للشيتات / تثبيت الوضع الحالي) | ⬜ لم تبدأ | تبقى وفق سياسة المؤسسة قبل تغييرات إنتاجية كبيرة. |
| 1 | **المرحلة الأولى: التأسيس والفحص** (CLAUDE.md، هيكل `docs/`، تقرير التدقيق الفني) | ✅ **مكتملة (Done)** | تم إعداد/مراجعة التوثيق الأساسي وإكمال فحص شامل لـ `Frontend/` و`Backend/` ومخرجاته في `docs/architecture.md` (قراءة فقط للكود؛ لا تعديل على المجلدين ضمن مهمة التدقيق). |
| 2 | **المرحلة الثانية: تنظيف وتوحيد الفرونت إند** (HTML / CSS / فصل JS، توحيد `#0a5c56`، إزالة Tailwind CDN حيث ينطبق) | 🔄 **قيد التنفيذ (In Progress)** | المرجع التنفيذي: `frontend-plan.md`. — [x] `theme.css` — [x] `index.html` — [x] `dashboard.html` — [x] `settings.html` — [x] `notifications.html` — [x] `findings.html` — [x] `forms.html` — [x] `employee.html` — [ ] `coordinator.html` — [ ] `distribution.html` — [ ] `admin.html` — [ ] `car-dashboard.html` — [ ] `portal.html` — [ ] `portal_car.html` — [ ] `phc_form.html` |
| 3 | Backend: أمان Web App + إزالة ازدواجية الدوال + Router/`doPost` | ⬜ لم تبدأ | `backend-plan.md` (أولوية الأمان ثم التعارضات مثل `handleGetEmployeeFiles`). |
| 4 | Audit Logs + إعداد Clasp | ⬜ لم تبدأ | يتبع استقرار مسارات الـ API والصلاحيات. |
| 5 | ربط Frontend بالـ Backend بعد استقرار العقود والأمان | ⬜ لم تبدأ | يشمل إصلاحات التكامل (مثل `closeCAR` / `closedBy`) عند التنفيذ. |
| 6 | تحسينات اختيارية | ⬜ لم تبدأ | أداء، UX، توثيق تشغيلي إضافي. |

---

## الوضع الحالي للمشروع (ملخص)

- **التوثيق:** `CLAUDE.md` يحدد قواعد الهوية (`#0a5c56`، بدون Tailwind) وهيكل المجلدات؛ `docs/architecture.md` يوثّق نتائج الفحص الفني الأخيرة.
- **الفرونت إند:** صفحات متعددة بـ CSS/JS مضمّن، تعارض ألوان الهيدر مع `theme.css`/`iag-theme.css`، واعتماد Tailwind عبر CDN في معظم الصفحات — العمل المخطط له في المرحلة 2.
- **الباك إند:** Web App علني (`ANYONE_ANONYMOUS`) مع ثغرات ثقة موثقة (حقول عميل، مسارات بوابة، رفع ملفات، …) وتعارض تعريف `handleGetEmployeeFiles` — العمل المخطط له في المرحلة 3 و`backend-plan.md`.

---

## آخر تحديث (سجل مختصر)

- **2026-04-12:** إكمال المرحلة 1 (التأسيس والفحص)؛ اعتماد `architecture.md` كمرجع للتدقيق؛ بدء المرحلة 2 كمرحلة حالية على مستوى التخطيط والتنفيذ القادم.
- **2026-04-12:** [المرحلة 2 — الخطوة 2] تصحيح `assets/css/theme.css`: استبدال `#0f172a` بـ `#0a5c56` في `.page-header`، `.side-menu-header`، `.notif-dot`؛ تحديث التدرجات لتتوافق مع `iag-theme.css`؛ التعارض بين الملفين محلول.
- **2026-04-12:** [المرحلة 2 — الخطوة 3+4+5 / index.html] إزالة Tailwind CDN؛ فصل CSS (147 سطر) → `assets/css/index.css`؛ فصل JS (90 سطر) → `assets/js/index.js`؛ توحيد لون الهيدر إلى `#0a5c56`؛ استبدال جميع utility classes بكلاسات دلالية.
- **2026-04-12:** [المرحلة 2 — الخطوة 3+4+5 / dashboard.html] إزالة Tailwind CDN؛ تصحيح `meta theme-color` من `#0f766e` إلى `#0a5c56`؛ فصل CSS (207 سطر) → `assets/css/dashboard.css`؛ فصل JS (420 سطر) → `assets/js/dashboard.js`؛ إصلاح خطأ syntax في attribute الـ style.
- **2026-04-12:** [المرحلة 2 — الخطوة 3+4+5 / settings.html] إزالة Tailwind CDN؛ تصحيح `meta theme-color` من `#0f766e` إلى `#0a5c56`؛ إصلاح `--primary` من `#0f766e` إلى `#0a5c56`؛ فصل CSS → `assets/css/settings.css`؛ فصل JS → `assets/js/settings.js`؛ استبدال Tailwind classes (`space-y-3`, `text-teal-600`, `text-blue-600`, `bg-blue-600`, `animate-pulse`, `w-4 h-4`, `lg:hidden`) بكلاسات دلالية محلية؛ إصلاح syntax خطأ في attribute الـ style.
- **2026-04-12:** [المرحلة 2 — الخطوة 3+4+5 / notifications.html] إزالة Tailwind CDN؛ تصحيح `meta theme-color` و`--primary` إلى `#0a5c56`؛ فصل CSS → `assets/css/notifications.css`؛ فصل JS → `assets/js/notifications.js`؛ استبدال جميع Tailwind classes في HTML وفي template strings داخل JS (`bg-*-100`, `text-*-600`, `w-* h-*`, `animate-spin`, `font-bold`, `text-lg`, `lg:hidden`) بكلاسات دلالية ومعاملات inline style؛ إصلاح syntax خطأ في attribute الـ style.
- **2026-04-12:** [المرحلة 2 — الخطوة 3+4+5 / forms.html] إزالة Tailwind CDN؛ تصحيح `meta theme-color` إلى `#0a5c56`؛ فصل CSS → `assets/css/forms.css`؛ فصل JS → `assets/js/forms.js`؛ استبدال `w-6 h-6` / `w-5 h-5` → inline style؛ استبدال `bg-teal`/`bg-rose`/`bg-amber`/`bg-blue`/`bg-violet` → كلاسات دلالية لا تتعارض مع theme؛ إزالة جميع Tailwind classes من `float-login-btn` وإنشاء `.btn-float-login`؛ إزالة `lg:hidden` من bottom-nav.
- **2026-04-13:** [المرحلة 2 — الخطوة 3+4+5 / employee.html] إزالة Tailwind CDN؛ تصحيح `meta theme-color` و`--primary` وجميع `#0f766e` في CSS إلى `#0a5c56`؛ فصل CSS (154 سطر) → `assets/css/employee.css`؛ فصل JS (card render + page logic، ~860 سطر) → `assets/js/employee.js`؛ استبدال `px-2` على select/inputs بـ `.f-input` المدمج؛ `flex gap-2 items-end` → `.filter-actions`؛ `w-5 h-5` / `w-4 h-4` / `w-10 h-10` → inline style؛ `animate-spin text-teal-600 font-bold text-gray-500` → inline style؛ `font-bold text-lg text-gray-900` / `text-xs text-gray-500 font-mono` على modal → inline style؛ `p-2 bg-gray-100 rounded-full hover:*` → `.modal-close-btn`؛ `lg:hidden` محذوف من bottom-nav؛ `font-bold text-red-500` في JS template strings → inline style.
- **2026-04-12:** [المرحلة 2 — الخطوة 3+4+5 / findings.html] إزالة Tailwind CDN؛ تصحيح `meta theme-color` و`--primary` وجميع `#0f766e` في CSS إلى `#0a5c56`؛ فصل CSS → `assets/css/findings.css`؛ فصل JS → `assets/js/findings.js`؛ استبدال `grid grid-cols-2 gap-3 mb-3` → `.filter-grid`؛ `animate-spin` → `.spin`؛ `w-5 h-5` → inline style؛ `font-bold text-gray-400` → `.loader-lbl`؛ `lg:hidden` محذوف.
