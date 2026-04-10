/**
 * IAG Turbo Drive — Drop-in SPA Navigation
 * ─────────────────────────────────────────
 * يتحمل في <head> مرة واحدة ويستمر عبر كل التنقلات
 * لا يتطلب تعديل أي كود موجود
 */
(function () {
  if (window.__iagTurboBoot) return;
  window.__iagTurboBoot = true;

  /* ── 1. SHIM: DOMContentLoaded → يشتغل فوراً لو الصفحة محملة ── */
  // Turbo بيستبدل الـ body فالـ DOMContentLoaded مش بيطلع تاني
  // الحل: لو readyState مش 'loading' → ننادي الـ handler فوراً
  var _origAddEvent = Document.prototype.addEventListener;
  Document.prototype.addEventListener = function (type, fn, opts) {
    _origAddEvent.call(this, type, fn, opts);
    if (type === 'DOMContentLoaded' && document.readyState !== 'loading') {
      setTimeout(fn, 0);
    }
  };

  /* ── 2. Re-init Lucide بعد كل navigation ── */
  document.addEventListener('turbo:render', function () {
    if (typeof lucide !== 'undefined') lucide.createIcons();
  });

  /* ── 3. Scroll to top بعد الانتقال ── */
  document.addEventListener('turbo:load', function () {
    window.scrollTo(0, 0);
  });

  /* ── 4. Progress bar style (اختياري — يظهر شريط تحميل خفيف) ── */
  document.addEventListener('turbo:before-fetch-request', function () {
    document.documentElement.setAttribute('data-turbo-loading', '');
  });
  document.addEventListener('turbo:load', function () {
    document.documentElement.removeAttribute('data-turbo-loading');
  });
})();
