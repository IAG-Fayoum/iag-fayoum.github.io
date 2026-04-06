# IAG Frontend — خطة التطوير

## Phase 1 — Backend Fixes ✅ مكتمل
- [x] Fix VerificationEngine (verification_required = نعم للخطورة العالية)
- [x] Fix closeCAR → updates CAR_SECTIONS
- [x] Add portal email to admin (carEngine_notifyAdminPortal_)

## Phase 2 — صفحات جديدة (الحالية)

### مكتملة
- [x] findings.html — عرض الملاحظات للمراجع الفني
- [x] car-dashboard.html — إحصائيات CAR للمنسق/المدير (قراءة فقط)

### قيد التنفيذ
- [x] car.html — REBUILD للمراجع الفني (getCARSections + updateSectionStatus)
- [x] portal.html — بوابة مدير الإدارة الصحية (standalone, portalLogin + portalGetSections + portalSubmitResponse)

### ملاحظة: portal_car.html موجود بالفعل كنسخة قديمة — سيُعاد بناء portal.html كصفحة جديدة نظيفة

## Phase 3 — Backend Handlers
- [ ] getQuarterlyReport — تنفيذ في Backend.js
- [ ] downloadReportLink — تنفيذ في Backend.js

## Phase 4 — Style ✅ مكتمل
- [x] توحيد الهيدر
- [x] توحيد الـ nav (nav.js)
- [x] الإشعارات في الهيدر فقط

## Phase 5 — لاحقاً
- [ ] CAR_LEGAL
- [ ] Analytics
- [ ] car.html القديم → أرشيف بعد الـ rebuild

---

## ملاحظات تقنية
- API_URL: من CONFIG.API_URL (config.js) — بدون Content-Type header
- Auth: localStorage iag_user → name/role
- Role guards: مراجع فني = default role
- nav.js يبني الـ nav تلقائياً — لا تعدل nav.js أو findings.html
