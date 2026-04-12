// findings.js — الملاحظات المرصودة / IAG System

lucide.createIcons();

// ── STATE ──
let allFindings      = [];
let portalMap        = {};
let activeType       = '';
let pendingSuspendId = null;
let currentUser      = null;
let selectedFindings = new Set();
let toastTimer;

// ── INIT ──
document.addEventListener('DOMContentLoaded', async () => {
    const user = auth.checkAuth();
    if (!user) { location.href = 'index.html'; return; }

    const role = (user.role || '').trim();
    if (role.includes('منسق') && !role.includes('مدير')) {
        location.href = 'coordinator.html'; return;
    }

    currentUser = user;
    document.getElementById('menu-user').textContent = user.name || '';
    document.getElementById('menu-role').textContent = user.jobTitle || user.role || '';
    document.getElementById('hdr-sub').textContent   = (user.name || '') + ' — ' + (user.jobTitle || user.role || '');

    await Promise.all([loadFindings(), loadPortalData()]);
    lucide.createIcons();
});

// ── API ──
async function post(body) {
    const res = await fetch(CONFIG.API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(body)
    });
    return res.json();
}

// ── LOAD FINDINGS ──
async function loadFindings() {
    try {
        const res = await post({ action: 'getFindings' });
        console.log('[findings] getFindings response:', res);

        if (!res.success) {
            showPanelError('panel-active', 'تعذر تحميل البيانات: ' + (res.error || ''));
            return;
        }

        allFindings = (res.findings || []).map(f => ({
            ...f,
            status: (String(f.status || '').trim()) || 'مفتوح'
        }));

        console.log('[findings] total loaded:', allFindings.length,
            '| statuses:', allFindings.reduce((acc, f) => { acc[f.status] = (acc[f.status]||0)+1; return acc; }, {}));

        populateDropdowns();
        render();
    } catch (e) {
        console.error('[findings] load error:', e);
        showPanelError('panel-active', 'خطأ في الاتصال بالخادم');
    }
}

// ── PORTAL DATA (badge) ──
async function loadPortalData() {
    try {
        const res = await post({ action: 'getCARSections' });
        if (!res.success) return;
        portalMap = {};
        (res.sections || []).forEach(s => {
            const unit = (s.unit_name || s.facility_name || '').trim();
            if (unit && (s.portal_status === 'تم الرد' || s.portal_reply)) {
                portalMap[unit] = (portalMap[unit] || 0) + 1;
            }
        });
    } catch (e) { /* optional */ }
}

// ─────────────────────────────────────────
// FILTER LOGIC
// ─────────────────────────────────────────

function populateDropdowns() {
    if (activeType === 'مستشفى') {
        document.getElementById('f-label-1').textContent = 'اسم المستشفى';
        document.getElementById('f-label-2').textContent = 'القسم';
        const hospitals = unique(allFindings
            .filter(f => isHospital(f.unit_name))
            .map(f => f.unit_name));
        fillSelect('f-admin', hospitals, 'كل المستشفيات');
        fillSelect('f-unit', [], 'كل الأقسام');
    } else {
        document.getElementById('f-label-1').textContent = 'الإدارة الصحية';
        document.getElementById('f-label-2').textContent = 'اختر الوحدة';
        const baseFindings = activeType === 'وحدة'
            ? allFindings.filter(f => !isHospital(f.unit_name))
            : allFindings;
        const areas = unique(baseFindings.map(f => f.admin_area).filter(Boolean));
        fillSelect('f-admin', areas, 'كل الإدارات');
        fillSelect('f-unit', [], 'كل الوحدات');
    }
}

function onAdminChange() {
    const sel1 = document.getElementById('f-admin').value;
    if (activeType === 'مستشفى') {
        const sections = unique(allFindings
            .filter(f => isHospital(f.unit_name) && (!sel1 || f.unit_name === sel1))
            .map(f => f.section).filter(Boolean));
        fillSelect('f-unit', sections, 'كل الأقسام');
    } else {
        const baseFindings = activeType === 'وحدة'
            ? allFindings.filter(f => !isHospital(f.unit_name))
            : allFindings;
        const units = unique(baseFindings
            .filter(f => !sel1 || f.admin_area === sel1)
            .map(f => f.unit_name).filter(Boolean));
        fillSelect('f-unit', units, 'كل الوحدات');
    }
    render();
}

function onFilterChange() { render(); }

function setType(t) {
    activeType = t;
    ['tb-all','tb-hosp','tb-unit'].forEach(id => document.getElementById(id).classList.remove('active'));
    document.getElementById(t === 'مستشفى' ? 'tb-hosp' : t === 'وحدة' ? 'tb-unit' : 'tb-all').classList.add('active');
    document.getElementById('f-admin').value = '';
    document.getElementById('f-unit').value  = '';
    populateDropdowns();
    render();
}

function getFiltered() {
    const sel1     = document.getElementById('f-admin').value;
    const sel2     = document.getElementById('f-unit').value;
    const startVal = document.getElementById('f-start').value;
    const endVal   = document.getElementById('f-end').value;
    const start    = startVal ? new Date(startVal) : null;
    const end      = endVal   ? new Date(endVal + 'T23:59:59') : null;

    return allFindings.filter(f => {
        const uname = (f.unit_name || '').trim();

        if (activeType === 'مستشفى') {
            if (!isHospital(uname)) return false;
            if (sel1 && f.unit_name !== sel1) return false;
            if (sel2 && f.section   !== sel2) return false;
        } else if (activeType === 'وحدة') {
            if (isHospital(uname)) return false;
            if (sel1 && f.admin_area !== sel1) return false;
            if (sel2 && f.unit_name  !== sel2) return false;
        } else {
            if (sel1 && f.admin_area !== sel1) return false;
            if (sel2 && f.unit_name  !== sel2) return false;
        }

        if (start || end) {
            const vd = f.visit_date ? new Date(f.visit_date) : null;
            if (!vd || isNaN(vd.getTime())) return false;
            if (start && vd < start) return false;
            if (end   && vd > end)   return false;
        }
        return true;
    });
}

// ─────────────────────────────────────────
// RENDER
// ─────────────────────────────────────────

function render() {
    const filtered  = getFiltered();
    const active    = filtered.filter(f => f.status === 'مفتوح');
    const suspended = filtered.filter(f => f.status === 'معلق');
    const legal     = filtered.filter(f => f.status === 'قانوني');
    const closed    = filtered.filter(f => f.status === 'مغلق');

    updateKPIs(active, suspended, legal);
    updateTabCounts(active, suspended, legal, closed);
    renderActive(active, filtered);
    renderSuspended(suspended);
    renderLegal(legal);
    renderClosed(closed);
    lucide.createIcons();
}

function updateKPIs(active, suspended, legal) {
    const openUnits = new Set(active.map(f => f.unit_name).filter(Boolean));
    document.getElementById('k-open-units').textContent = openUnits.size;
    document.getElementById('k-late').textContent       = active.filter(f => daysSince(f.visit_date) > 14).length;
    document.getElementById('k-suspended').textContent  = suspended.length;
    document.getElementById('k-legal').textContent      = legal.length;
}

function updateTabCounts(active, suspended, legal, closed) {
    document.getElementById('tc-active').textContent    = active.length;
    document.getElementById('tc-suspended').textContent = suspended.length;
    document.getElementById('tc-legal').textContent     = legal.length;
    document.getElementById('tc-closed').textContent    = closed.length;
}

function switchTab(key) {
    ['active','suspended','legal','closed'].forEach(k => {
        document.getElementById('tab-btn-' + k).classList.toggle('active', k === key);
        document.getElementById('panel-'  + k).classList.toggle('active', k === key);
    });
}

// ── Tab: نشط ──
function renderActive(activeFindings, allFiltered) {
    const panel = document.getElementById('panel-active');
    if (!activeFindings.length) {
        panel.innerHTML = '<div class="empty-box">✅ لا توجد ملاحظات مفتوحة</div>';
        return;
    }

    const unitMap = {};
    activeFindings.forEach(f => {
        const u = f.unit_name || 'غير محدد';
        if (!unitMap[u]) unitMap[u] = [];
        unitMap[u].push(f);
    });

    const closedByUnit = {};
    allFiltered.filter(f => f.status === 'مغلق').forEach(f => {
        const u = f.unit_name || 'غير محدد';
        if (!closedByUnit[u]) closedByUnit[u] = [];
        closedByUnit[u].push(f);
    });

    const unitNames = Object.keys(unitMap).sort();
    panel.innerHTML = `<div class="units-grid">${
        unitNames.map(u => buildUnitCard(u, unitMap[u], closedByUnit[u] || [])).join('')
    }</div>`;
}

function buildUnitCard(unitName, openFindings, closedFindings) {
    const uid         = 'uc-' + unitName.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 30);
    const visitDate   = (openFindings[0] || {}).visit_date || '';
    const sinceVisit  = daysSince(visitDate);
    const daysLeft    = sinceVisit !== null ? (14 - sinceVisit) : null;
    const adminArea   = (openFindings[0] || {}).admin_area || '';
    const portalCount = portalMap[unitName] || 0;
    const openCount   = openFindings.length;
    const closedCount = closedFindings.length;

    const daysHtml = (daysLeft !== null)
        ? (daysLeft > 0
            ? `<span class="uc-days-ok">${daysLeft} أيام متبقية</span>`
            : `<span class="uc-days-late">🔴 متأخر ${Math.abs(daysLeft)} يوم</span>`)
        : '';

    const portalHtml = portalCount
        ? `<span class="uc-portal-badge">💬 ${portalCount} ردود من المدير</span>`
        : '';

    const secMap = {};
    openFindings.forEach(f => {
        const s = f.section || 'عام';
        if (!secMap[s]) secMap[s] = [];
        secMap[s].push(f);
    });

    const secHtml = Object.keys(secMap).map(secName => {
        const rows = secMap[secName].map(f => buildFindingRow(f, false)).join('');
        return `<div class="sec-group-hdr">
            <i data-lucide="layers" style="width:12px;height:12px"></i>
            ${esc(secName)}
            <span style="font-size:.65rem;color:#94a3b8;margin-right:auto">${secMap[secName].length} مخالفة</span>
        </div>${rows}`;
    }).join('');

    const closedHtml = closedFindings.length
        ? closedFindings.map(f => buildFindingRow(f, true)).join('')
        : '';

    return `<div class="unit-card" id="${uid}">
        <div class="uc-header" onclick="toggleCard('${uid}')">
            <div class="uc-header-content">
                <div class="uc-name">🏥 ${esc(unitName)}</div>
                <div class="uc-meta-row">
                    ${adminArea ? `<span class="uc-area">${esc(adminArea)}</span>` : ''}
                    <span class="uc-count">⚠ ${openCount} مخالفة مفتوحة</span>
                    ${closedCount ? `<span style="font-size:.68rem;font-weight:700;color:#059669;background:#d1fae5;padding:2px 8px;border-radius:20px;border:1px solid #a7f3d0">✅ ${closedCount} مغلقة</span>` : ''}
                    ${daysHtml}
                    ${portalHtml}
                </div>
            </div>
            <i data-lucide="chevron-left" class="uc-chevron" style="width:20px;height:20px"></i>
        </div>
        <div class="uc-body">
            ${secHtml}${closedHtml}
        </div>
    </div>`;
}

function toggleCard(uid) {
    const card = document.getElementById(uid);
    if (!card) return;
    card.classList.toggle('expanded');
    lucide.createIcons();
}

function buildFindingRow(f, isClosed) {
    const fid     = esc(f.finding_id || f.uuid || '');
    const rowCls  = isClosed ? 'finding-row closed-row' : 'finding-row';
    const textCls = isClosed ? 'finding-text strikethrough' : 'finding-text';
    const actions = isClosed ? '' : `
        <div class="finding-actions">
            <button class="act-btn act-btn-lock"
                    onclick="handleAction(this,'${fid}','مغلق')"
                    title="قفل المخالفة">قفل</button>
            <button class="act-btn act-btn-suspend"
                    onclick="openSuspendModal('${fid}')"
                    title="تعليق">تعليق</button>
            <button class="act-btn act-btn-legal"
                    onclick="handleAction(this,'${fid}','قانوني')"
                    title="إحالة قانونية">قانوني</button>
        </div>`;
    const chkAttr = isClosed
        ? 'checked disabled'
        : `onchange="onCheckboxChange(this,'${fid}')"`;
    return `<div class="${rowCls}" data-fid="${fid}">
        <input type="checkbox" class="finding-checkbox" ${chkAttr}>
        <span class="${textCls}">${esc(f.violation_text)}</span>
        ${actions}
    </div>`;
}

// ── Tab: معلق ──
function renderSuspended(findings) {
    const panel = document.getElementById('panel-suspended');
    if (!findings.length) {
        panel.innerHTML = '<div class="empty-box">لا توجد ملاحظات معلقة</div>';
        return;
    }
    panel.innerHTML = findings.map(f => {
        const fid = esc(f.finding_id || f.uuid || '');
        return `<div class="susp-item">
            <div class="susp-unit">🏥 ${esc(f.unit_name || '')}${f.admin_area ? ' · ' + esc(f.admin_area) : ''}</div>
            <div class="susp-text">🔁 ${esc(f.violation_text)}</div>
            <div class="susp-footer">
                ${f.responsible_party
                    ? `<span class="susp-party">مسؤول: ${esc(f.responsible_party)}</span>`
                    : '<span style="font-size:.72rem;color:#94a3b8">لم يحدد المسؤول</span>'}
                <button class="act-btn act-btn-reopen"
                        onclick="handleAction(this,'${fid}','مفتوح')">رفع التعليق</button>
            </div>
        </div>`;
    }).join('');
}

// ── Tab: قانوني ──
function renderLegal(findings) {
    const panel = document.getElementById('panel-legal');
    if (!findings.length) {
        panel.innerHTML = '<div class="empty-box">لا توجد ملاحظات قانونية</div>';
        return;
    }
    panel.innerHTML = findings.map(f => {
        const lDays = f.legal_date ? daysSince(f.legal_date) : null;
        let cardCls = 'legal-item', daysHtml = '', warnHtml = '';

        if (lDays !== null) {
            if (lDays >= 90) {
                cardCls += ' alert';
                daysHtml = `<span class="legal-days-alert">يوم ${lDays} من 90</span>`;
                warnHtml = `<span class="legal-alert-msg">🔴 انتهت المهلة القانونية</span>`;
            } else if (lDays >= 80) {
                cardCls += ' warn';
                daysHtml = `<span class="legal-days-warn">يوم ${lDays} من 90</span>`;
                warnHtml = `<span class="legal-warn-msg">⚠ تحذير: ${90 - lDays} يوم متبقي للمهلة</span>`;
            } else {
                daysHtml = `<span class="legal-days-normal">${lDays} يوم منذ الإحالة</span>`;
            }
        }

        return `<div class="${cardCls}">
            <div class="legal-unit">🏥 ${esc(f.unit_name || '')}${f.admin_area ? ' · ' + esc(f.admin_area) : ''}</div>
            <div class="legal-text">⚖️ ${esc(f.violation_text)}</div>
            <div class="legal-footer">${daysHtml}${warnHtml}</div>
        </div>`;
    }).join('');
}

// ── Tab: مغلق ──
function renderClosed(findings) {
    const panel = document.getElementById('panel-closed');
    if (!findings.length) {
        panel.innerHTML = '<div class="empty-box">لا توجد ملاحظات مغلقة</div>';
        return;
    }
    panel.innerHTML = findings.map(f => `
        <div class="closed-item">
            <div class="closed-unit">🏥 ${esc(f.unit_name || '')}${f.admin_area ? ' · ' + esc(f.admin_area) : ''}</div>
            <div class="closed-text">${esc(f.violation_text)}</div>
        </div>
    `).join('');
}

// ─────────────────────────────────────────
// ACTIONS
// ─────────────────────────────────────────

async function handleAction(btn, findingId, newStatus) {
    if (!findingId) { showToast('معرف المخالفة مفقود', 'error'); return; }

    const msgs = {
        'مغلق':  'هل تريد قفل هذه المخالفة؟',
        'قانوني':'هل تريد إحالة هذه المخالفة للجهة القانونية؟',
        'مفتوح': 'هل تريد رفع التعليق وإعادة فتح المخالفة؟'
    };
    if (!confirm(msgs[newStatus] || 'تأكيد')) return;

    const origLabel = btn.textContent;
    btn.disabled = true;
    btn.textContent = '...';

    try {
        const res = await post({
            action:     'updateFindingStatus',
            finding_id: findingId,
            status:     newStatus,
            updated_by: (currentUser && currentUser.name) || 'مستخدم'
        });

        if (!res.success) {
            showToast('خطأ: ' + (res.error || 'فشل التحديث'), 'error');
            btn.disabled = false; btn.textContent = origLabel;
            return;
        }

        updateLocalStatus(findingId, newStatus);
        const msgs2 = { 'مغلق': '✅ تم قفل المخالفة', 'قانوني': '⚖️ تمت الإحالة للقانون', 'مفتوح': '🔓 تمت إعادة فتح المخالفة' };
        showToast(msgs2[newStatus] || 'تم التحديث', 'success');
        render(); lucide.createIcons();
    } catch (e) {
        showToast('خطأ في الاتصال', 'error');
        btn.disabled = false; btn.textContent = origLabel;
    }
}

// ── BULK ACTIONS ──
function onCheckboxChange(cb, findingId) {
    if (cb.checked) selectedFindings.add(findingId);
    else selectedFindings.delete(findingId);
    updateBulkBar();
}

function updateBulkBar() {
    const bar = document.getElementById('bulk-bar');
    document.getElementById('bulk-count').textContent = selectedFindings.size;
    bar.classList.toggle('visible', selectedFindings.size > 0);
}

function clearSelection() {
    selectedFindings.clear();
    updateBulkBar();
    document.querySelectorAll('.finding-checkbox:not(:disabled)').forEach(cb => { cb.checked = false; });
}

async function bulkClose() {
    if (!selectedFindings.size) return;
    const count = selectedFindings.size;
    if (!confirm(`قفل ${count} مخالفة؟`)) return;

    const ids = [...selectedFindings];
    selectedFindings.clear();
    updateBulkBar();

    let done = 0;
    for (const fid of ids) {
        try {
            const res = await post({
                action:     'updateFindingStatus',
                finding_id: fid,
                status:     'مغلق',
                updated_by: (currentUser && currentUser.name) || 'مستخدم'
            });
            if (res.success) { updateLocalStatus(fid, 'مغلق'); done++; }
        } catch (e) { /* continue */ }
    }

    showToast(`✅ تم قفل ${done} من ${count} مخالفة`, 'success');
    render(); lucide.createIcons();
}

// ── SUSPEND MODAL ──
function openSuspendModal(findingId) {
    pendingSuspendId = findingId;
    document.getElementById('modal-party').value   = '';
    document.getElementById('modal-comment').value = '';
    document.getElementById('modal-party').style.borderColor = '';
    document.getElementById('suspend-modal').classList.add('open');
    setTimeout(() => document.getElementById('modal-party').focus(), 100);
}

function closeSuspendModal() {
    pendingSuspendId = null;
    document.getElementById('suspend-modal').classList.remove('open');
}

async function submitSuspend() {
    const party   = document.getElementById('modal-party').value.trim();
    const comment = document.getElementById('modal-comment').value.trim();
    if (!party) {
        document.getElementById('modal-party').style.borderColor = '#dc2626';
        document.getElementById('modal-party').focus();
        return;
    }
    document.getElementById('modal-party').style.borderColor = '';

    const btn = document.getElementById('modal-submit-btn');
    btn.disabled = true; btn.textContent = '...';

    try {
        const res = await post({
            action:            'updateFindingStatus',
            finding_id:        pendingSuspendId,
            status:            'معلق',
            responsible_party: party,
            comment:           comment,
            updated_by:        (currentUser && currentUser.name) || 'مستخدم'
        });

        if (!res.success) {
            showToast('خطأ: ' + (res.error || 'فشل التحديث'), 'error');
        } else {
            const idx = allFindings.findIndex(f => (f.finding_id || f.uuid) === pendingSuspendId);
            if (idx > -1) { allFindings[idx].status = 'معلق'; allFindings[idx].responsible_party = party; }
            showToast('⏸ تم تعليق المخالفة', 'success');
            closeSuspendModal();
            render(); lucide.createIcons();
        }
    } catch (e) { showToast('خطأ في الاتصال', 'error'); }

    btn.disabled = false; btn.textContent = 'تعليق';
}

// ─────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────

function updateLocalStatus(findingId, newStatus) {
    const idx = allFindings.findIndex(f => (f.finding_id || f.uuid) === findingId);
    if (idx > -1) allFindings[idx].status = newStatus;
}

function isHospital(name) {
    const n = (name || '').trim();
    return n.includes('مستشفى') || n.includes('مستشفيات');
}

function unique(arr) { return [...new Set(arr)].sort(); }

function fillSelect(id, options, placeholder) {
    const sel = document.getElementById(id);
    sel.innerHTML = `<option value="">${placeholder}</option>`;
    options.forEach(v => {
        const o = document.createElement('option');
        o.value = v; o.textContent = v;
        sel.appendChild(o);
    });
}

function daysSince(dateStr) {
    if (!dateStr) return null;
    try {
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return null;
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        d.setHours(0, 0, 0, 0);
        return Math.floor((now - d) / 86400000);
    } catch (e) { return null; }
}

function showPanelError(panelId, msg) {
    document.getElementById(panelId).innerHTML =
        `<div class="empty-box" style="border-color:#fecaca;color:#dc2626">${esc(msg)}</div>`;
}

function showToast(msg, type) {
    const el = document.getElementById('toast');
    el.textContent = msg;
    el.className = 'toast' + (type ? ' ' + type : '');
    void el.offsetWidth;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 3000);
}

function toggleMenu() {
    document.getElementById('side-menu').classList.toggle('open');
    document.getElementById('menu-overlay').classList.toggle('open');
}

function closeMenu() {
    document.getElementById('side-menu').classList.remove('open');
    document.getElementById('menu-overlay').classList.remove('open');
}

function esc(s) {
    return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
