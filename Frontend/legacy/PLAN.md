# IAG Frontend — خطة التطوير

## معمارية النظام (مُتفق عليها)

| الدور | الصفحات |
|-------|---------|
| مراجع فني | employee.html + findings.html + forms.html |
| منسق | coordinator.html + forms.html |
| مدير | admin.html + findings.html (full access) + forms.html |
| خارجي | portal.html فقط |

---

## Phase 1 — Backend Fixes ✅ مكتمل
- [x] Fix VerificationEngine (verification_required = نعم للخطورة العالية)
- [x] Fix closeCAR → updates CAR_SECTIONS
- [x] Add portal email to admin (carEngine_notifyAdminPortal_)
- [x] handleUpdateFindingStatus — Backend.js (v8.6)

## Phase 2 — صفحات جديدة

### مكتملة ✅
- [x] findings.html — rebuild كامل (4 tabs: نشط/معلق/قانوني/مغلق)
  - KPI strip: وحدات مفتوحة / متأخر / معلق / قانوني
  - Unit cards collapsed by default → expand → grouped by section
  - Bulk action bar (قفل الكل)
  - Filter: مستشفيات mode (hospital → section) vs وحدات/الكل mode (admin_area → unit)
  - Role guard: مراجع فني + مدير allowed
- [x] car-dashboard.html — إحصائيات CAR
- [x] portal.html — بوابة مدير الإدارة الصحية
- [x] car.html → redirect إلى findings.html

### قيد التنفيذ
- [ ] admin.html — إضافة 3 tabs (نظرة عامة / المعاملات / التصعيد)

### مؤجل
- [x] Mobile-first unification (style unification — Issue 3 complete)

## Phase 3 — Backend Handlers
- [ ] getQuarterlyReport
- [ ] downloadReportLink

## Phase 4 — Style ✅ مكتمل
- [x] توحيد الهيدر / nav.js / الإشعارات
- [x] إنشاء assets/css/theme.css — CSS variables + shared components (header, nav, cards, buttons)
- [x] ربط theme.css بكل الصفحات الـ 14
- [x] إصلاح nav.js — readyState guard بدلاً من DOMContentLoaded فقط (يضمن lucide.createIcons بعد inject الـ nav)
- [x] توحيد الألوان: --primary #0f766e، body bg #f1f5f9، bottom-nav height 64px، cards border-radius 16px
- [x] إصلاح padding-bottom من 90px إلى 80px في car.html و car-dashboard.html

## Phase 5 — لاحقاً
- [ ] CAR_LEGAL
- [ ] Analytics

---

## المواعيد النهائية
- كل المخالفات: 14 يوم من visit_date
- المخالفات القانونية: 90 يوم من legal_date (تحذير عند 80، تنبيه عند 90)

---

## ملاحظات تقنية
- API_URL: من CONFIG.API_URL — Content-Type: text/plain;charset=utf-8
- Auth: localStorage iag_user → name/role
- nav.js: default role = مراجع فني (4 items: employee / distribution / findings / forms)
- OP_FINDINGS columns: finding_id, unit_name, admin_area, visit_date, section, violation_text, finding_code, severity, status, responsible_party, legal_date, comments, uuid
- getFindings يرجع كل الأعمدة ديناميكياً — لا تعديل للقراءة
- updateFindingStatus: finding_id, status, responsible_party?, comment?, updated_by
