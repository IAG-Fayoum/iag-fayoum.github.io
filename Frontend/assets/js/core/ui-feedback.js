/**
 * IAG System — Global UI Feedback (Sprint 1A)
 *
 * Lightweight loading overlay + error/success toast.
 * Zero external dependencies — injects its own DOM on first use.
 */

const IAGFeedback = (() => {

    // ── Loading Overlay ───────────────────────────────────────────────────────

    let _overlay = null;

    function _ensureOverlay() {
        if (_overlay) return;
        _overlay = document.createElement('div');
        _overlay.id = 'iag-loading-overlay';
        _overlay.setAttribute('aria-live', 'polite');
        _overlay.setAttribute('aria-busy', 'true');
        _overlay.innerHTML = `
            <div class="iag-loading-box">
                <svg class="iag-spinner" viewBox="0 0 50 50" aria-hidden="true">
                    <circle cx="25" cy="25" r="20" fill="none" stroke-width="4"></circle>
                </svg>
                <span class="iag-loading-text">جاري التحميل...</span>
            </div>`;
        _overlay.style.cssText = `
            display:none;position:fixed;inset:0;z-index:9999;
            background:rgba(10,92,86,0.18);backdrop-filter:blur(2px);
            align-items:center;justify-content:center;`;

        const box = _overlay.querySelector('.iag-loading-box');
        box.style.cssText = `
            background:#fff;border-radius:14px;padding:28px 36px;
            display:flex;flex-direction:column;align-items:center;gap:14px;
            box-shadow:0 8px 32px rgba(0,0,0,0.18);`;

        const spinner = _overlay.querySelector('.iag-spinner');
        spinner.style.cssText = `width:40px;height:40px;animation:iag-spin 0.9s linear infinite;`;
        spinner.querySelector('circle').style.cssText =
            `stroke:#0a5c56;stroke-linecap:round;stroke-dasharray:100;stroke-dashoffset:30;`;

        const txt = _overlay.querySelector('.iag-loading-text');
        txt.style.cssText = `font-family:Cairo,sans-serif;font-size:0.95rem;font-weight:700;color:#0a5c56;`;

        // Inject keyframe once
        if (!document.getElementById('iag-feedback-style')) {
            const style = document.createElement('style');
            style.id = 'iag-feedback-style';
            style.textContent = `
                @keyframes iag-spin { to { transform: rotate(360deg); } }
                @keyframes iag-toast-in {
                    from { opacity:0; transform:translateX(40px); }
                    to   { opacity:1; transform:translateX(0); }
                }`;
            document.head.appendChild(style);
        }

        document.body.appendChild(_overlay);
    }

    /**
     * Show the global loading overlay.
     * @param {string} [message]
     */
    function showLoading(message = 'جاري التحميل...') {
        _ensureOverlay();
        _overlay.querySelector('.iag-loading-text').textContent = message;
        _overlay.style.display = 'flex';
    }

    /** Hide the global loading overlay. */
    function hideLoading() {
        if (_overlay) _overlay.style.display = 'none';
    }

    // ── Toast Messages ────────────────────────────────────────────────────────

    let _toastContainer = null;

    function _ensureToastContainer() {
        if (_toastContainer) return;
        _toastContainer = document.createElement('div');
        _toastContainer.id = 'iag-toast-container';
        _toastContainer.style.cssText = `
            position:fixed;bottom:calc(env(safe-area-inset-bottom, 0px) + 16px);
            left:50%;transform:translateX(-50%);
            display:flex;flex-direction:column;gap:8px;align-items:center;
            z-index:10000;pointer-events:none;min-width:260px;max-width:90vw;`;
        document.body.appendChild(_toastContainer);
    }

    /**
     * Show a toast notification.
     * @param {string} message
     * @param {'error'|'success'|'info'} type
     * @param {number} [duration=3500]
     */
    function showToast(message, type = 'info', duration = 3500) {
        _ensureToastContainer();

        const colors = {
            error:   { bg: '#fef2f2', border: '#fecaca', text: '#dc2626', icon: '✕' },
            success: { bg: '#f0fdf4', border: '#bbf7d0', text: '#16a34a', icon: '✓' },
            info:    { bg: '#f0fdfa', border: '#99f6e4', text: '#0f766e', icon: 'ℹ' },
        };
        const c = colors[type] || colors.info;

        const toast = document.createElement('div');
        toast.style.cssText = `
            background:${c.bg};border:1.5px solid ${c.border};color:${c.text};
            border-radius:10px;padding:10px 18px;font-family:Cairo,sans-serif;
            font-size:0.9rem;font-weight:700;pointer-events:auto;
            display:flex;align-items:center;gap:8px;
            animation:iag-toast-in 0.25s ease;
            box-shadow:0 4px 16px rgba(0,0,0,0.1);`;
        toast.innerHTML = `<span style="font-size:1rem">${c.icon}</span><span>${message}</span>`;

        _toastContainer.appendChild(toast);
        setTimeout(() => toast.remove(), duration);
    }

    /** Shorthand helpers */
    function showError(message)   { showToast(message, 'error');   }
    function showSuccess(message) { showToast(message, 'success'); }

    // ── Public API ────────────────────────────────────────────────────────────

    return { showLoading, hideLoading, showToast, showError, showSuccess };

})();
