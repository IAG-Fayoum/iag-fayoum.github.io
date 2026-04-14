/**
 * portal.js — بوابة الإدارة الصحية / IAG System
 *
 * Sprint 3 Block B: extracted from portal.html inline script.
 * - API: IAGApi (no direct fetch)
 * - UI:  IAGFeedback (unified toast)
 *
 * NOTE: Portal uses its own sessionStorage session (iag_portal_session)
 * because portal users are external health-area managers, not IAG employees.
 * This is a documented exception to the IAGSession rule (different user type).
 */

lucide.createIcons();

const PORTAL_SESSION_KEY = 'iag_portal_session';

let session     = null;
let allSections = [];

// ── INIT ──────────────────────────────────────────────────

(function init() {
    const saved = sessionStorage.getItem(PORTAL_SESSION_KEY);
    if (saved) {
        try {
            session = JSON.parse(saved);
            showApp();
            return;
        } catch(e) { /* corrupt session — fall through to login */ }
    }
    document.getElementById('login-screen').style.display = 'flex';
})();

// ── LOGIN ─────────────────────────────────────────────────

async function doLogin() {
    const code  = document.getElementById('inp-code').value.trim();
    const pin   = document.getElementById('inp-pin').value.trim();
    const errEl = document.getElementById('login-error');
    const btn   = document.getElementById('btn-login');

    errEl.classList.remove('show');
    if (!code || !pin) {
        errEl.textContent = 'يرجى إدخال كود الإدارة ورمز الدخول';
        errEl.classList.add('show');
        return;
    }

    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span>';

    const result = await IAGApi.request('portalLogin', { admin_code: code, pin: pin });

    if (result.ok) {
        session = {
            admin_code  : code,
            admin_name  : (result.data && result.data.admin_name)   || code,
            manager_name: (result.data && result.data.manager_name) || 'مدير الإدارة'
        };
        sessionStorage.setItem(PORTAL_SESSION_KEY, JSON.stringify(session));
        showApp();
        IAGFeedback.showSuccess('مرحباً ' + session.manager_name);
    } else {
        errEl.textContent = result.error || 'بيانات غير صحيحة';
        errEl.classList.add('show');
    }

    btn.disabled = false;
    btn.innerHTML = '<i data-lucide="log-in" class="icon-md"></i> تسجيل الدخول';
    lucide.createIcons();
}

function doLogout() {
    sessionStorage.removeItem(PORTAL_SESSION_KEY);
    session = null;
    allSections = [];
    document.getElementById('main-app').style.display   = 'none';
    document.getElementById('login-screen').style.display = 'flex';
    document.getElementById('inp-code').value = '';
    document.getElementById('inp-pin').value  = '';
    document.getElementById('login-error').classList.remove('show');
}

// ── SHOW APP ──────────────────────────────────────────────

function showApp() {
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('main-app').style.display     = 'block';
    document.getElementById('hdr-manager').textContent    = session.manager_name;
    document.getElementById('hdr-admin').textContent      = 'إدارة: ' + session.admin_name;
    loadSections();
}

// ── LOAD SECTIONS ─────────────────────────────────────────

async function loadSections() {
    const wrap = document.getElementById('content-wrap');
    wrap.innerHTML = `
        <div class="loader-wrap">
            <div class="spinner-lg"></div>
            <p class="loader-text">جاري تحميل البيانات...</p>
        </div>`;

    const result = await IAGApi.request('portalGetSections', { admin_code: session.admin_code });

    if (!result.ok) {
        wrap.innerHTML = `<div class="empty-wrap"><p class="error-text">${escHtml(result.error || 'فشل تحميل البيانات')}</p></div>`;
        return;
    }

    const raw       = (result.data && result.data.sections) || [];
    const adminName = session.admin_name || '';
    allSections = adminName
        ? raw.filter(s => (s.admin_area || s.facility_name || '').indexOf(adminName) !== -1)
        : raw;

    updateStats();
    renderSections();
}

function updateStats() {
    const total   = allSections.length;
    const replied = allSections.filter(s => s.portal_response && s.portal_response.trim()).length;
    const pending = total - replied;
    document.getElementById('st-total').textContent   = total;
    document.getElementById('st-pending').textContent = pending;
    document.getElementById('st-done').textContent    = replied;
}

function renderSections() {
    const wrap = document.getElementById('content-wrap');
    if (!allSections.length) {
        wrap.innerHTML = `
            <div class="empty-wrap">
                <i data-lucide="check-circle-2" class="empty-check-icon"></i>
                <p class="empty-title">لا توجد ملاحظات</p>
                <p class="empty-sub">جميع الملاحظات تم التعامل معها</p>
            </div>`;
        lucide.createIcons();
        return;
    }
    wrap.innerHTML = allSections.map((s, idx) => buildCard(s, idx)).join('');
    lucide.createIcons();
}

function buildCard(s, idx) {
    const hasReply = s.portal_response && s.portal_response.trim();

    const statusBadge = hasReply
        ? `<span class="badge-replied"><i data-lucide="check-circle" class="icon-xs"></i> تم الرد</span>`
        : `<span class="badge-pending"><i data-lucide="clock" class="icon-xs"></i> بانتظار الرد</span>`;

    const prevBlock = hasReply ? `
        <div class="prev-response-block">
            <div class="prev-label">
                <i data-lucide="message-square-check" class="icon-sm" style="color:#059669"></i>
                ردك السابق
            </div>
            <p class="prev-text">${escHtml(s.portal_response)}</p>
            ${s.portal_replied_at ? `<p class="prev-date">${escHtml(s.portal_replied_at)}</p>` : ''}
        </div>` : '';

    const btnLabel = hasReply ? 'تعديل الرد' : 'إرسال الرد';
    const btnClass = hasReply ? 'btn-submit btn-submitted' : 'btn-submit';

    return `
    <div class="section-card ${hasReply ? 'replied' : ''}" id="card-${idx}">
        <div class="sc-header">
            <div>
                <div class="facility-name">${escHtml(s.facility_name || s.unit_name || '—')}</div>
                <div class="section-name-txt">${escHtml(s.section_name || '—')}</div>
            </div>
            <div class="sc-header-end">
                <span class="car-badge">${escHtml(s.car_id || '—')}</span>
                ${statusBadge}
            </div>
        </div>
        <div class="sc-body">
            <div class="findings-block">
                <div class="block-label">
                    <i data-lucide="alert-triangle" class="icon-xs"></i>
                    الملاحظات المرصودة
                </div>
                <p class="findings-text">${escHtml(s.findings_text || 'لا توجد تفاصيل')}</p>
            </div>

            ${prevBlock}

            <div>
                <label class="response-label" for="resp-${idx}">
                    ${hasReply ? 'تعديل الرد' : 'الرد على الملاحظات'}
                </label>
                <textarea id="resp-${idx}" class="response-textarea"
                    placeholder="اكتب رد الإدارة الصحية هنا — وصف الإجراءات التصحيحية المتخذة...">${escHtml(s.portal_response || '')}</textarea>
            </div>
        </div>
        <div class="sc-footer">
            <button class="${btnClass}" id="btn-${idx}" onclick="submitResponse(${idx})">
                <i data-lucide="${hasReply ? 'edit-2' : 'send'}" class="icon-sm"></i>
                ${btnLabel}
            </button>
        </div>
    </div>`;
}

// ── SUBMIT ────────────────────────────────────────────────

async function submitResponse(idx) {
    const s        = allSections[idx];
    const response = document.getElementById('resp-' + idx).value.trim();
    const btn      = document.getElementById('btn-' + idx);

    if (!response) {
        IAGFeedback.showError('يرجى كتابة الرد أولاً');
        document.getElementById('resp-' + idx).focus();
        return;
    }

    const origHtml = btn.innerHTML;
    btn.disabled   = true;
    btn.innerHTML  = '<span class="spinner"></span>';

    const result = await IAGApi.request('portalSubmitResponse', {
        admin_code  : session.admin_code,
        car_id      : s.car_id,
        section_name: s.section_name,
        response    : response
    });

    if (result.ok) {
        allSections[idx].portal_response   = response;
        allSections[idx].portal_replied_at = new Date().toLocaleDateString('ar-EG');
        IAGFeedback.showSuccess('تم إرسال الرد بنجاح');
        updateStats();

        const card = document.getElementById('card-' + idx);
        card.outerHTML = buildCard(allSections[idx], idx);
        lucide.createIcons();
    } else {
        IAGFeedback.showError(result.error || 'فشل الإرسال');
        btn.disabled  = false;
        btn.innerHTML = origHtml;
        lucide.createIcons();
    }
}

// ── HELPERS ───────────────────────────────────────────────

function escHtml(s) {
    return String(s || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}
