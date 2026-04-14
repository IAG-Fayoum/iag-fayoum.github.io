/* ══════════════════════════════════════════════
   distribution.js — Performance Distribution Logic
   IAG System 2026 — منطق مؤشرات الأداء
   ══════════════════════════════════════════════ */

lucide.createIcons();

let allData = [];
let currentTab = 'employees';
let activeStatFilter = null;
let currentSourceFilter = null;

document.addEventListener('DOMContentLoaded', async () => {
    // Session guard via core/session.js
    const user = IAGSession.requireAuth();
    document.getElementById('menu-user').textContent = user.name;
    document.getElementById('menu-role').textContent = user.role;

    // Default: current year + current quarter
    const now = new Date();
    const month = now.getMonth() + 1;
    const quarter = month <= 3 ? 'Q1' : month <= 6 ? 'Q2' : month <= 9 ? 'Q3' : 'Q4';
    document.getElementById('f-year').value   = now.getFullYear().toString();
    document.getElementById('f-period').value = quarter;

    await loadData();
});

/* ── MENU / NAV ── */
function toggleMenu() {
    document.getElementById('side-menu').classList.toggle('open');
    document.getElementById('menu-overlay').classList.toggle('open');
}
function closeMenu() {
    document.getElementById('side-menu').classList.remove('open');
    document.getElementById('menu-overlay').classList.remove('open');
}
function logout() { IAGSession.logout(); }
function closeModal() { document.getElementById('detail-modal').classList.remove('open'); }

/* ── DATA LOAD ── */
async function loadData() {
    activeStatFilter = null;
    const year   = document.getElementById('f-year').value;
    const period = document.getElementById('f-period').value;

    IAGFeedback.showLoading('جاري تحميل البيانات...');
    const result = await IAGApi.getDashboardData(year, period);
    IAGFeedback.hideLoading();

    if (result.ok) {
        allData = result.data?.employees || [];
        switchTab();
    } else {
        IAGFeedback.showError(result.error || 'فشل تحميل البيانات');
    }
}

/* ── TABS ── */
function setTab(tab) {
    currentTab = tab;
    document.getElementById('tab-emp').classList.toggle('active', tab === 'employees');
    document.getElementById('tab-src').classList.toggle('active', tab === 'sources');
    document.getElementById('view-employees').classList.toggle('hidden', tab !== 'employees');
    document.getElementById('view-sources').classList.toggle('hidden',   tab !== 'sources');
    if (tab === 'sources')   renderSourceAnalysis();
    if (tab === 'employees') renderEmployeeAnalysis();
}
function switchTab() { setTab(currentTab); }

function setStatFilter(filter) {
    activeStatFilter = (activeStatFilter === filter) ? null : filter;
    renderEmployeeAnalysis();
}

/* ── HELPERS: FILTER ── */
function getBaseEmployees() {
    const group = document.getElementById('f-group').value;
    return allData.filter(e => {
        const title = (e.dept || e.jobTitle || '').trim();
        if (title !== 'مراجع فني' && title !== 'مراجع مالي وإداري') return false;
        if (group === 'tech')  return title === 'مراجع فني';
        if (group === 'admin') return title === 'مراجع مالي وإداري';
        return true;
    });
}

function getFilteredEmployees() {
    const group = document.getElementById('f-group').value;
    let emps = allData.filter(e => {
        const title = (e.dept || e.jobTitle || '').trim();
        if (title !== 'مراجع فني' && title !== 'مراجع مالي وإداري') return false;
        if (group === 'tech')  return title === 'مراجع فني';
        if (group === 'admin') return title === 'مراجع مالي وإداري';
        return true;
    });

    if (!activeStatFilter) return emps;

    return emps.filter(e => {
        if (activeStatFilter === 'late') return (e.overdue || 0) > 0;
        if (!e.tasks) return false;
        return e.tasks.some(t => {
            const st = (t.status || '');
            if (activeStatFilter === 'new')      return st.includes('جديد');
            if (activeStatFilter === 'pending')   return st.includes('بانتظار');
            if (activeStatFilter === 'approved')  return st.includes('تم') || st.includes('منتهي');
            if (activeStatFilter === 'followup')  return st.includes('متابعة');
            return false;
        });
    });
}

/* ── ARABIC NORMALIZATION ── */
function normalizeArabic(text) {
    if (!text) return '';
    return text.toString().trim()
        .replace(/[أإآ]/g, 'ا')
        .replace(/ة/g, 'ه')
        .replace(/ى/g, 'ي');
}

/* ── TAB 1: EMPLOYEES ── */
function renderEmployeeAnalysis() {
    const allEmps  = getBaseEmployees();
    const employees = getFilteredEmployees();

    let s = { total: 0, late: 0, new: 0, pending: 0, approved: 0, followup: 0 };
    allEmps.forEach(e => {
        s.total += e.total || 0;
        s.late  += e.overdue || 0;
        if (e.tasks) e.tasks.forEach(t => {
            const st = (t.status || '');
            if (st.includes('جديد'))                             s.new++;
            else if (st.includes('بانتظار'))                     s.pending++;
            else if (st.includes('تم') || st.includes('منتهي')) s.approved++;
            else if (st.includes('متابعة'))                      s.followup++;
        });
    });

    document.getElementById('stats-emp').innerHTML = `
        <div class="stat-card ${activeStatFilter === null ? 'active' : ''}" onclick="setStatFilter(null)">
            <div class="stat-num c-total">${s.total}</div><div class="stat-lbl">الإجمالي</div>
        </div>
        <div class="stat-card ${activeStatFilter === 'late' ? 'active' : ''}" onclick="setStatFilter('late')">
            <div class="stat-num c-late">${s.late}</div><div class="stat-lbl">متأخر</div>
        </div>
        <div class="stat-card ${activeStatFilter === 'new' ? 'active' : ''}" onclick="setStatFilter('new')">
            <div class="stat-num c-new">${s.new}</div><div class="stat-lbl">جديد</div>
        </div>
        <div class="stat-card ${activeStatFilter === 'pending' ? 'active' : ''}" onclick="setStatFilter('pending')">
            <div class="stat-num c-pending">${s.pending}</div><div class="stat-lbl">بانتظار</div>
        </div>
        <div class="stat-card ${activeStatFilter === 'approved' ? 'active' : ''}" onclick="setStatFilter('approved')">
            <div class="stat-num c-approved">${s.approved}</div><div class="stat-lbl">معتمد</div>
        </div>
        <div class="stat-card ${activeStatFilter === 'followup' ? 'active' : ''}" onclick="setStatFilter('followup')">
            <div class="stat-num c-followup">${s.followup}</div><div class="stat-lbl">متابعة</div>
        </div>`;

    const list = document.getElementById('list-emp');
    if (!employees.length) {
        list.innerHTML = '<div class="empty-state">لا توجد بيانات</div>'; return;
    }

    list.innerHTML = employees.sort((a, b) => b.rate - a.rate).map((emp, i) => {
        const rankCls = i === 0 ? 'rank-1' : i === 1 ? 'rank-2' : i === 2 ? 'rank-3' : 'rank-other';
        let sub = { new: 0, pending: 0, app: 0, foll: 0 };
        if (emp.tasks) emp.tasks.forEach(t => {
            const st = (t.status || '');
            if (st.includes('جديد'))                             sub.new++;
            else if (st.includes('بانتظار'))                     sub.pending++;
            else if (st.includes('تم') || st.includes('منتهي')) sub.app++;
            else if (st.includes('متابعة'))                      sub.foll++;
        });

        const cr = emp.total > 0 ? Math.round((emp.completed / emp.total) * 100) : 0;
        const barCls = cr >= 90 ? 'high' : cr >= 70 ? 'medium' : 'low';

        const empId = emp.name.replace(/\s+/g, '_');

        return `
        <div class="emp-card">
            <div class="rank-badge ${rankCls}">${i + 1}</div>
            <div class="emp-header">
                <div class="emp-avatar">${emp.name.slice(0, 2)}</div>
                <div class="emp-name">${emp.name}</div>
                <div class="emp-dept">${emp.dept}</div>
                <div class="progress-wrapper">
                    <div class="progress-labels">
                        <span>معدل الإنجاز</span><span>${cr}%</span>
                    </div>
                    <div class="progress-track">
                        <div class="progress-fill ${barCls}" style="width:${cr}%"></div>
                    </div>
                </div>
            </div>
            <div class="emp-stats-grid">
                <div class="es-row-lg">
                    <div class="es-box-lg"><div class="es-val-lg c-total">${emp.total}</div><div class="es-lbl-lg">الكل</div></div>
                    <div class="es-box-lg"><div class="es-val-lg c-late">${emp.overdue}</div><div class="es-lbl-lg">متأخر</div></div>
                </div>
                <div class="es-row-sm">
                    <div class="es-box-sm"><div class="es-val-sm c-new">${sub.new}</div><div class="es-lbl-sm">جديد</div></div>
                    <div class="es-box-sm"><div class="es-val-sm c-pending">${sub.pending}</div><div class="es-lbl-sm">انتظار</div></div>
                    <div class="es-box-sm"><div class="es-val-sm c-approved">${sub.app}</div><div class="es-lbl-sm">معتمد</div></div>
                    <div class="es-box-sm"><div class="es-val-sm c-followup">${sub.foll}</div><div class="es-lbl-sm">متابعة</div></div>
                </div>
            </div>
            <div class="emp-footer">
                <div class="emp-footer-actions">
                    <button onclick="toggleEmpTasks(this, '${emp.name}')" class="btn-details">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M6 9l6 6 6-6"/></svg>
                        المهام (${emp.total})
                    </button>
                    <button onclick="printEmpTasks('${emp.name}')" class="btn-action-print" title="طباعة PDF">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
                        PDF
                    </button>
                    <button onclick="remindEmp('${emp.name}')" class="btn-action-remind" title="إرسال تذكير">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
                        تذكير
                    </button>
                </div>
            </div>
            <div class="emp-tasks-section" id="tasks-${empId}">
                <div class="tasks-filter-bar">
                    <button class="tf-btn active" onclick="filterEmpTasks(this,'${empId}','all')">الكل (${emp.total})</button>
                    ${(emp.overdue || 0) > 0 ? `<button class="tf-btn" onclick="filterEmpTasks(this,'${empId}','late')">⚠️ متأخر (${emp.overdue})</button>` : ''}
                    ${sub.new > 0      ? `<button class="tf-btn" onclick="filterEmpTasks(this,'${empId}','new')">🔵 جديد (${sub.new})</button>` : ''}
                    ${sub.pending > 0  ? `<button class="tf-btn" onclick="filterEmpTasks(this,'${empId}','pending')">⏳ بانتظار (${sub.pending})</button>` : ''}
                    ${sub.app > 0      ? `<button class="tf-btn" onclick="filterEmpTasks(this,'${empId}','done')">✅ معتمد (${sub.app})</button>` : ''}
                    ${sub.foll > 0     ? `<button class="tf-btn" onclick="filterEmpTasks(this,'${empId}','followup')">👁 متابعة (${sub.foll})</button>` : ''}
                </div>
                <div class="tasks-table-wrap">
                    <table class="tasks-table">
                        <thead><tr>
                            <th>رقم المعاملة</th><th>الموضوع</th>
                            <th>الجهة / القضية</th><th>الحالة</th><th>الموعد</th>
                        </tr></thead>
                        <tbody id="tbody-${empId}">${buildTaskRows(emp.tasks, 'all')}</tbody>
                    </table>
                </div>
            </div>
        </div>`;
    }).join('');
}

/* ── SOURCE DEFINITIONS ── */
const SOURCE_DEFS = [
    { key: 'مبادرات',  label: 'وكيل الوزارة (فحص مبادرات)',      match: ['فحص مبادرات', 'مبادرات'] },
    { key: 'قانونية',  label: 'وكيل الوزارة (الشؤون القانونية)', match: ['شؤون القانونية', 'شئون القانونية', 'الشؤون القانون', 'قانونية'] },
    { key: 'نيابة',    label: 'النيابة الإدارية',                 match: ['نيابة الادارية', 'نيابة الإدارية', 'نيابة'] },
    { key: 'رقابة',    label: 'هيئة الرقابة الإدارية',           match: ['رقابة الادارية', 'رقابة الإدارية', 'هيئة الرقابة', 'رقابة'] },
    { key: 'ديوان_مح', label: 'ديوان المحافظة',                   match: ['ديوان المحافظة'] },
    { key: 'ديوان_وز', label: 'ديوان الوزارة',                    match: ['ديوان الوزارة'] },
    { key: 'جهاز',     label: 'الجهاز المركزي',                   match: ['جهاز المركزي', 'جهاز مركزي', 'الجهاز المركزي'] },
    { key: 'تنظيم',    label: 'التنظيم والإدارة',                 match: ['تنظيم والادارة', 'تنظيم والإدارة', 'التنظيم والإدارة', 'التنظيم'] },
    { key: 'مالية',    label: 'المديرية المالية',                 match: ['مديرية المالية', 'المديرية المالية'] },
    { key: 'محليات',   label: 'محليات اخري',                      match: ['محليات'] },
    { key: 'وكيل',     label: 'وكيل الوزارة',                     match: ['وكيل الوزارة', 'وكيل'] },
    { key: 'أخرى',     label: 'جهات أخرى',                        match: [] }
];

function matchSourceKey(src) {
    if (!src || !src.trim()) return 'أخرى';
    const n = normalizeArabic(src);
    for (const def of SOURCE_DEFS) {
        if (def.key === 'أخرى') continue;
        for (const m of def.match) {
            if (n.includes(normalizeArabic(m))) return def.key;
        }
    }
    return 'أخرى';
}

/* ── TAB 2: SOURCE ANALYSIS ── */
function renderSourceAnalysis() {
    const employees = getFilteredEmployees();
    const counts = {};
    SOURCE_DEFS.forEach(d => counts[d.key] = 0);
    let total = 0;

    employees.forEach(e => {
        if (e.tasks) e.tasks.forEach(t => {
            total++;
            const raw = t['الجهة (الوارد) منها'] || t['الجهة'] || t.source || t.entity || '';
            counts[matchSourceKey(raw)]++;
        });
    });

    let html = `<div class="stat-card"><div class="stat-num" style="color:var(--color-text-1)">${total}</div><div class="stat-lbl">إجمالي الوارد</div></div>`;

    SOURCE_DEFS.forEach(def => {
        if (def.key === 'أخرى' && counts[def.key] === 0) return;
        if (counts[def.key] === 0 && def.key !== 'أخرى') return;
        const activeClass = currentSourceFilter === def.key ? 'active' : '';
        html += `<div class="stat-card ${activeClass}" onclick="filterBySource('${def.key}')">
            <div class="stat-num" style="color:var(--brand-primary-teal)">${counts[def.key]}</div>
            <div class="stat-lbl">${def.label}</div>
        </div>`;
    });

    document.getElementById('stats-src').innerHTML = html;
    renderSourceList();
}

function filterBySource(key) {
    currentSourceFilter = key;
    renderSourceAnalysis();
}

function renderSourceList() {
    const labelEl = document.getElementById('src-filter-label');
    if (!currentSourceFilter) {
        document.getElementById('list-src').innerHTML = '';
        labelEl.textContent = 'اضغط على جهة لعرض توزيعها على الموظفين';
        return;
    }

    const def = SOURCE_DEFS.find(d => d.key === currentSourceFilter);
    labelEl.textContent = 'توزيع ملفات: ' + (def ? def.label : currentSourceFilter);

    const employees = getFilteredEmployees();
    let totalForSource = 0;
    employees.forEach(emp => {
        if (emp.tasks) emp.tasks.forEach(t => {
            const raw = t['الجهة (الوارد) منها'] || t['الجهة'] || t.source || t.entity || '';
            if (matchSourceKey(raw) === currentSourceFilter) totalForSource++;
        });
    });

    let listHtml = '';
    employees.forEach(emp => {
        let count = 0;
        if (emp.tasks) emp.tasks.forEach(t => {
            const raw = t['الجهة (الوارد) منها'] || t['الجهة'] || t.source || t.entity || '';
            if (matchSourceKey(raw) === currentSourceFilter) count++;
        });
        if (count > 0) {
            const pct = totalForSource > 0 ? Math.round((count / totalForSource) * 100) : 0;
            listHtml += `
            <div class="source-item">
                <div class="si-info">
                    <div class="si-avatar">${emp.name.slice(0, 2)}</div>
                    <div class="si-name">${emp.name}</div>
                </div>
                <div class="si-count-box">
                    <div class="si-num">${count}</div>
                    <div class="si-pct">${pct}%</div>
                </div>
            </div>`;
        }
    });

    document.getElementById('list-src').innerHTML = listHtml || '<div class="empty-state">لا يوجد موظفون لديهم ملفات من هذه الجهة</div>';
}

/* ── MODAL ── */
function openModal(empName) {
    const emp = allData.find(e => e.name === empName);
    if (!emp) return;

    document.getElementById('m-title').textContent = emp.name;
    document.getElementById('m-subtitle').textContent = emp.dept;

    let sub = { new: 0, pending: 0, app: 0, foll: 0 };

    const statusRowStyle = (st) => {
        if (st.includes('تم الاعتماد')) return 'background:#f0fdf4;border-right:3px solid #16a34a';
        if (st.includes('بانتظار'))     return 'background:#fffbeb;border-right:3px solid #d97706';
        if (st.includes('متأخر'))       return 'background:#fff5f5;border-right:3px solid #dc2626';
        if (st.includes('جديد'))        return 'background:#eff6ff;border-right:3px solid #2563eb';
        if (st.includes('متابعة'))      return 'background:#f5f3ff;border-right:3px solid #7c3aed';
        return 'background:white';
    };

    const statusDot = (st) => {
        if (st.includes('تم الاعتماد')) return '<span style="color:#16a34a;font-size:0.7rem;font-weight:700">✅ معتمد</span>';
        if (st.includes('بانتظار'))     return '<span style="color:#d97706;font-size:0.7rem;font-weight:700">⏳ بانتظار</span>';
        if (st.includes('متأخر'))       return '<span style="color:#dc2626;font-size:0.7rem;font-weight:700">⚠️ متأخر</span>';
        if (st.includes('جديد'))        return '<span style="color:#2563eb;font-size:0.7rem;font-weight:700">🔵 جديد</span>';
        if (st.includes('متابعة'))      return '<span style="color:#7c3aed;font-size:0.7rem;font-weight:700">👁 متابعة</span>';
        return '';
    };

    let tasksHtml = '';
    if (emp.tasks && emp.tasks.length > 0) {
        const rows = emp.tasks.map((t, idx) => {
            const st = (t.status || '');
            if (st.includes('جديد'))                             sub.new++;
            else if (st.includes('بانتظار'))                     sub.pending++;
            else if (st.includes('تم') || st.includes('منتهي')) sub.app++;
            else if (st.includes('متابعة'))                      sub.foll++;

            const srcDisplay = t['الجهة (الوارد) منها'] || t['الجهة'] || t.source || '-';
            const taskId = t.id || '';

            return `<tr style="${statusRowStyle(st)};cursor:pointer;transition:opacity 0.15s"
                        onclick="openTaskDetail(${idx}, '${empName}')"
                        onmouseover="this.style.opacity='0.8'"
                        onmouseout="this.style.opacity='1'">
                <td style="padding:9px 10px;font-size:0.72rem;font-weight:800;color:#475569;white-space:nowrap">${taskId ? '#' + taskId : '-'}</td>
                <td style="padding:9px 8px;font-size:0.72rem;font-weight:700;color:#334155;max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${t.subject || ''}">${t.subject || '-'}</td>
                <td style="padding:9px 8px;font-size:0.7rem;color:#64748b">${srcDisplay}</td>
                <td style="padding:9px 8px;text-align:center">${statusDot(st)}</td>
            </tr>`;
        }).join('');

        tasksHtml = `
        <div style="margin-top:12px;font-size:0.72rem;color:#94a3b8;font-weight:700;margin-bottom:4px">اضغط على أي معاملة للتفاصيل الكاملة</div>
        <div style="border:1px solid #e2e8f0;border-radius:10px;overflow:hidden;max-height:55vh;overflow-y:auto">
            <table style="width:100%;border-collapse:collapse;text-align:right">
                <thead style="background:#f8fafc;position:sticky;top:0;z-index:1">
                    <tr>
                        <th style="padding:8px 10px;font-size:0.7rem;color:#64748b;font-weight:700;border-bottom:1px solid #e2e8f0">رقم</th>
                        <th style="padding:8px 8px;font-size:0.7rem;color:#64748b;font-weight:700;border-bottom:1px solid #e2e8f0">الموضوع</th>
                        <th style="padding:8px 8px;font-size:0.7rem;color:#64748b;font-weight:700;border-bottom:1px solid #e2e8f0">الجهة</th>
                        <th style="padding:8px 8px;font-size:0.7rem;color:#64748b;font-weight:700;border-bottom:1px solid #e2e8f0;text-align:center">الحالة</th>
                    </tr>
                </thead>
                <tbody>${rows}</tbody>
            </table>
        </div>`;
    } else {
        tasksHtml = '<p style="text-align:center;padding:2rem;color:#94a3b8">لا توجد مهام</p>';
    }

    document.getElementById('m-content').innerHTML = `
        <div style="display:flex;flex-direction:column;gap:8px;margin-bottom:12px">
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
                <div style="background:#f8fafc;padding:12px;border-radius:10px;border:1px solid #e2e8f0;text-align:center">
                    <div style="font-size:1.6rem;font-weight:800;color:#334155">${emp.total}</div>
                    <div style="font-size:0.7rem;color:#64748b;font-weight:700">الإجمالي</div>
                </div>
                <div style="background:#fef2f2;padding:12px;border-radius:10px;border:1px solid #fecaca;text-align:center">
                    <div style="font-size:1.6rem;font-weight:800;color:#dc2626">${emp.overdue}</div>
                    <div style="font-size:0.7rem;color:#dc2626;font-weight:700">متأخر</div>
                </div>
            </div>
            <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px">
                <div style="background:#eff6ff;padding:8px;border-radius:8px;text-align:center"><div style="font-weight:800;color:#3b82f6">${sub.new}</div><div style="font-size:0.65rem;color:#3b82f6">جديد</div></div>
                <div style="background:#f0fdf4;padding:8px;border-radius:8px;text-align:center"><div style="font-weight:800;color:#16a34a">${sub.pending}</div><div style="font-size:0.65rem;color:#16a34a">انتظار</div></div>
                <div style="background:#f0fdf4;padding:8px;border-radius:8px;text-align:center"><div style="font-weight:800;color:#047857">${sub.app}</div><div style="font-size:0.65rem;color:#047857">معتمد</div></div>
                <div style="background:#f9fafb;padding:8px;border-radius:8px;text-align:center"><div style="font-weight:800;color:#6b7280">${sub.foll}</div><div style="font-size:0.65rem;color:#6b7280">متابعة</div></div>
            </div>
        </div>
        ${tasksHtml}`;

    window._currentEmpTasks = emp.tasks;
    document.getElementById('detail-modal').classList.add('open');
}

/* ── TASK DETAIL ── */
function openTaskDetail(idx, empName) {
    const t = (window._currentEmpTasks || [])[idx];
    if (!t) return;

    const srcDisplay = t['الجهة (الوارد) منها'] || t['الجهة'] || t.source || '-';
    const taskId = t.id ? '#' + t.id : '-';

    const ro = (label, val) => val ? `
        <div style="border-bottom:1px solid #f1f5f9;padding:8px 0">
            <div style="font-size:0.7rem;color:#64748b;font-weight:700">${label}</div>
            <div style="font-size:0.9rem;color:#0f172a;font-weight:600;margin-top:2px">${val}</div>
        </div>` : '';

    const st = (t.status || '');
    let statusBg = '#f8fafc', statusColor = '#475569';
    if (st.includes('تم'))      { statusBg = '#f0fdf4'; statusColor = '#047857'; }
    if (st.includes('متأخر'))   { statusBg = '#fef2f2'; statusColor = '#dc2626'; }
    if (st.includes('جديد'))    { statusBg = '#eff6ff'; statusColor = '#3b82f6'; }
    if (st.includes('بانتظار')) { statusBg = '#f0fdf4'; statusColor = '#16a34a'; }

    const html = `
        <div style="background:${statusBg};border-radius:10px;padding:10px 14px;margin-bottom:12px">
            <div style="font-size:0.72rem;color:#94a3b8;font-weight:700">الحالة</div>
            <div style="font-size:1rem;font-weight:800;color:${statusColor}">${st || '-'}</div>
        </div>
        ${ro('رقم المعاملة', taskId)}
        ${ro('الموضوع', t.subject)}
        ${ro('الجهة الواردة', srcDisplay)}
        ${ro('محل التنفيذ', t.entity)}
        ${ro('تاريخ الوارد', t.date)}
        ${ro('الموظف المكلف', empName)}`;

    let overlay = document.getElementById('task-detail-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'task-detail-overlay';
        overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:400;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(2px)';
        overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };
        document.body.appendChild(overlay);
    }

    overlay.innerHTML = `
        <div style="background:white;width:92%;max-width:480px;max-height:80vh;border-radius:16px;overflow-y:auto;display:flex;flex-direction:column">
            <div style="padding:1rem 1.25rem;border-bottom:1px solid #e5e7eb;display:flex;justify-content:space-between;align-items:center;background:#f8fafc;flex-shrink:0">
                <div>
                    <h3 style="font-weight:800;font-size:1rem;color:#0f172a;margin:0">تفاصيل المعاملة</h3>
                    <p style="font-size:0.75rem;color:#64748b;font-weight:600;margin:0">${taskId} — للاطلاع فقط</p>
                </div>
                <button onclick="document.getElementById('task-detail-overlay').remove()"
                        style="padding:8px;background:#f1f5f9;border-radius:50%;border:none;cursor:pointer;font-size:1rem">✕</button>
            </div>
            <div style="padding:1rem 1.25rem;display:flex;flex-direction:column;gap:0">${html}</div>
        </div>`;
    overlay.style.display = 'flex';
}

/* ── PRINT ── */
function buildPrintHtml(emps, filterLabel) {
    const dateStr = new Date().toLocaleDateString('ar-EG');
    const today   = new Date(); today.setHours(0, 0, 0, 0);

    let html = `<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8">
    <style>
    body{font-family:Arial,sans-serif;margin:0;direction:rtl;font-size:12px}
    .pg{padding:20px 24px;page-break-after:always}.pg:last-child{page-break-after:avoid}
    .hdr{border-bottom:2px solid #0f766e;padding-bottom:8px;margin-bottom:12px}
    .org{font-size:0.72rem;color:#64748b;margin-bottom:3px}
    h3{color:#0f766e;margin:0 0 2px;font-size:1rem}
    .sub{color:#64748b;font-size:0.72rem;margin-bottom:12px}
    table{width:100%;border-collapse:collapse}
    th{background:#f0fdfa;color:#0f766e;padding:6px 8px;text-align:right;border:1px solid #ccfbf1;font-size:11px}
    td{padding:6px 8px;border:1px solid #e2e8f0;font-size:11px}
    tr:nth-child(even){background:#f8fafc}
    .late{color:#dc2626;font-weight:800}.done{color:#16a34a}
    .pend{color:#d97706}.new2{color:#2563eb}.foll{color:#7c3aed}
    @media print{@page{margin:10mm}}
    </style></head><body>`;

    emps.forEach(emp => {
        const tasks = emp.tasks || [];
        html += `<div class="pg"><div class="hdr">
            <div class="org">وزارة الصحة — مديرية الشئون الصحية بالفيوم — إدارة المراجعة الداخلية والحوكمة</div>
            <h3>تقرير متابعة مهام — ${emp.name}</h3>
            <div class="sub">${emp.dept} | التاريخ: ${dateStr} | إجمالي: ${tasks.length} معاملة | ${filterLabel}</div>
        </div>
        <table><thead><tr><th>#</th><th>رقم المعاملة</th><th>الموضوع</th><th>الجهة</th><th>رقم القضية</th><th>الحالة</th><th>الموعد</th></tr></thead><tbody>`;

        tasks.forEach((t, i) => {
            const st   = t.status || '';
            const done = st.includes('تم') || st.includes('مكتمل');
            let lbl = st, cls = '';
            if (!done && t.dueDate) {
                const p = t.dueDate.split('/');
                const due = new Date(+p[2], +p[1] - 1, +p[0]);
                if (!isNaN(due) && due < today) { lbl = '⚠️ متأخر'; cls = 'late'; }
            }
            if (!cls) {
                if (done)                     { lbl = '✅ معتمد';   cls = 'done'; }
                else if (st.includes('بانتظار')) { lbl = '⏳ بانتظار'; cls = 'pend'; }
                else if (st.includes('جديد'))    { lbl = '🔵 جديد';   cls = 'new2'; }
                else if (st.includes('متابعة'))  { lbl = '👁 متابعة'; cls = 'foll'; }
            }
            const caseNum = t.caseNumber ? t.caseNumber + '/' + (t.caseYear || '') : '-';
            html += `<tr><td>${i + 1}</td><td>${t.id || '-'}</td><td>${t.subject || '-'}</td><td>${t.source || '-'}</td><td>${caseNum}</td><td class="${cls}">${lbl}</td><td class="${cls.includes('late') ? 'late' : ''}">${t.dueDate || '-'}</td></tr>`;
        });
        html += `</tbody></table></div>`;
    });

    html += `</body></html>`;
    return html;
}

function printEmpTasks(empName) {
    const emp = allData.find(e => e.name === empName);
    if (!emp) return;
    const empId  = 'tasks-' + empName.replace(/\s+/g, '_');
    const sec    = document.getElementById(empId);
    let tasks    = emp.tasks || [];
    let filterLabel = 'الكل';

    if (sec && sec.classList.contains('open')) {
        const activeBtn = sec.querySelector('.tf-btn.active');
        if (activeBtn) filterLabel = activeBtn.textContent.replace(/\(\d+\)/, '').trim();
        const onclickVal   = activeBtn ? activeBtn.getAttribute('onclick') : null;
        const filterMatch  = onclickVal ? onclickVal.match(/'([^']+)'\)$/) : null;
        const filter       = filterMatch ? filterMatch[1] : 'all';
        if (filter && filter !== 'all') {
            const tod = new Date(); tod.setHours(0, 0, 0, 0);
            tasks = tasks.filter(t => {
                const st = (t.status || '');
                const done = st.includes('تم') || st.includes('مكتمل');
                if (filter === 'late')     { if (done) return false; const p = t.dueDate ? t.dueDate.split('/') : null; if (!p) return false; const due = new Date(+p[2], +p[1] - 1, +p[0]); return !isNaN(due) && due < tod; }
                if (filter === 'new')      return st.includes('جديد');
                if (filter === 'pending')  return st.includes('بانتظار');
                if (filter === 'done')     return st.includes('تم') || st.includes('مكتمل');
                if (filter === 'followup') return st.includes('متابعة');
                return true;
            });
        }
    }

    const w = window.open('', '_blank');
    w.document.write(buildPrintHtml([{ ...emp, tasks }], filterLabel));
    w.document.close();
    setTimeout(() => w.print(), 500);
}

async function remindEmp(empName) {
    const emp = allData.find(e => e.name === empName);
    if (!emp) return;
    const pending = (emp.tasks || []).filter(t => {
        const st = t.status || '';
        return !st.includes('تم') && !st.includes('مكتمل');
    });
    if (!pending.length) { IAGFeedback.showToast('لا توجد مهام معلقة لـ ' + empName, 'info'); return; }
    if (!confirm('إرسال تذكير لـ ' + empName + ' (' + pending.length + ' معاملة)؟')) return;

    const user   = IAGSession.getUser();
    const result = await IAGApi.sendReminderNotification(
        empName,
        user?.name || 'المنسق',
        pending.map(t => ({ id: t.id, subject: t.subject, status: t.status, dueDate: t.dueDate }))
    );
    IAGFeedback.showToast(
        result.ok ? '✅ تم إرسال التذكير لـ ' + empName : '❌ فشل الإرسال',
        result.ok ? 'success' : 'error'
    );
}

function printAllEmps() {
    const emps = allData;
    if (!emps.length) { IAGFeedback.showToast('لا توجد بيانات', 'info'); return; }
    const period = document.getElementById('f-period').value;
    const group  = document.getElementById('f-group').value;
    const periodNames = { Q1: 'الربع الأول', Q2: 'الربع الثاني', Q3: 'الربع الثالث', Q4: 'الربع الرابع' };
    const groupNames  = { admin: 'مالي وإداري', tech: 'فني وطبي' };
    const statNames   = { late: 'متأخر', new: 'جديد', pending: 'بانتظار الاعتماد', approved: 'معتمد', followup: 'بحاجة متابعة' };
    const label = [groupNames[group] || 'الكل', periodNames[period] || period || 'كل الفترات', statNames[activeStatFilter] || ''].filter(Boolean).join(' | ');

    const today = new Date(); today.setHours(0, 0, 0, 0);
    const filteredEmps = emps.map(emp => {
        let tasks = emp.tasks || [];
        if (activeStatFilter) {
            tasks = tasks.filter(t => {
                const st = (t.status || '');
                const done = st.includes('تم') || st.includes('مكتمل');
                if (activeStatFilter === 'late')     { if (done) return false; const p = t.dueDate?.split('/'); if (!p) return false; const due = new Date(+p[2], +p[1] - 1, +p[0]); return !isNaN(due) && due < today; }
                if (activeStatFilter === 'new')      return st.includes('جديد');
                if (activeStatFilter === 'pending')   return st.includes('بانتظار');
                if (activeStatFilter === 'approved')  return st.includes('تم') || st.includes('مكتمل');
                if (activeStatFilter === 'followup')  return st.includes('متابعة');
                return true;
            });
        }
        return { ...emp, tasks };
    }).filter(e => e.tasks.length > 0);

    if (!filteredEmps.length) { IAGFeedback.showToast('لا توجد معاملات للطباعة', 'info'); return; }
    const w = window.open('', '_blank');
    w.document.write(buildPrintHtml(filteredEmps, label));
    w.document.close();
    setTimeout(() => w.print(), 500);
}

async function remindAllEmps() {
    const emps = allData;
    if (!emps.length) { IAGFeedback.showToast('لا توجد بيانات', 'info'); return; }

    const today = new Date(); today.setHours(0, 0, 0, 0);
    const toSend = emps.map(emp => {
        let tasks = (emp.tasks || []).filter(t => {
            const st = t.status || '';
            return !st.includes('تم') && !st.includes('مكتمل');
        });
        if (activeStatFilter) {
            tasks = tasks.filter(t => {
                const st = (t.status || '');
                if (activeStatFilter === 'late')     { const p = t.dueDate?.split('/'); if (!p) return false; const due = new Date(+p[2], +p[1] - 1, +p[0]); return !isNaN(due) && due < today; }
                if (activeStatFilter === 'new')      return st.includes('جديد');
                if (activeStatFilter === 'pending')   return st.includes('بانتظار');
                if (activeStatFilter === 'followup')  return st.includes('متابعة');
                return true;
            });
        }
        return { ...emp, tasks };
    }).filter(e => e.tasks.length > 0);

    if (!toSend.length) { IAGFeedback.showToast('لا توجد معاملات للإرسال', 'info'); return; }
    if (!confirm('إرسال إيميل لـ ' + toSend.length + ' موظف؟')) return;

    const user = IAGSession.getUser();
    let sent = 0, failed = 0;

    IAGFeedback.showLoading('جاري إرسال التذكيرات...');
    for (const emp of toSend) {
        const result = await IAGApi.sendReminderNotification(
            emp.name,
            user?.name || 'المنسق',
            emp.tasks.map(t => ({ id: t.id, subject: t.subject, status: t.status, dueDate: t.dueDate }))
        );
        if (result.ok) sent++; else failed++;
    }
    IAGFeedback.hideLoading();
    IAGFeedback.showToast(
        'تم الإرسال لـ ' + sent + ' موظف' + (failed ? ' | فشل ' + failed : ''),
        sent > 0 ? 'success' : 'error'
    );
}

/* ── TASK TABLE (INLINE) ── */
function toggleEmpTasks(btn, empName) {
    const id  = 'tasks-' + empName.replace(/\s+/g, '_');
    const sec = document.getElementById(id);
    if (!sec) return;
    const open = sec.classList.toggle('open');
    btn.querySelector('svg').style.transform = open ? 'rotate(180deg)' : '';
    btn.style.color = open ? 'var(--brand-primary-teal)' : '';
}

function filterEmpTasks(btn, empId, filter) {
    btn.closest('.tasks-filter-bar').querySelectorAll('.tf-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const emp = allData.find(e => e.name.replace(/\s+/g, '_') === empId);
    if (!emp) return;
    document.getElementById('tbody-' + empId).innerHTML = buildTaskRows(emp.tasks, filter);
}

function buildTaskRows(tasks, filter) {
    if (!tasks || !tasks.length) return '<tr><td colspan="5" style="text-align:center;padding:16px;color:#94a3b8">لا توجد مهام</td></tr>';
    const today = new Date(); today.setHours(0, 0, 0, 0);

    function resolveStatus(t) {
        const st   = t.status || '';
        const done = st.includes('تم') || st.includes('مكتمل');
        if (!done && t.dueDate) {
            const p   = t.dueDate.split('/');
            const due = new Date(+p[2], +p[1] - 1, +p[0]);
            if (!isNaN(due) && due < today) return 'late';
        }
        if (st.includes('جديد'))                             return 'new';
        if (st.includes('بانتظار'))                          return 'pending';
        if (st.includes('تم') || st.includes('مكتمل'))      return 'done';
        if (st.includes('متابعة'))                           return 'followup';
        return 'other';
    }

    function stBadge(t) {
        const r = resolveStatus(t);
        const map = {
            late:     ['⚠️ متأخر',  'st-late'],
            new:      ['🔵 جديد',    'st-new'],
            pending:  ['⏳ بانتظار', 'st-pending'],
            done:     ['✅ معتمد',   'st-done'],
            followup: ['👁 متابعة', 'st-followup'],
            other:    [t.status || '-', 'st-new'],
        };
        return map[r] || map.other;
    }

    function daysLate(dueDate) {
        if (!dueDate) return 0;
        const p   = dueDate.split('/');
        const due = new Date(+p[2], +p[1] - 1, +p[0]);
        if (isNaN(due)) return 0;
        return Math.max(0, Math.floor((today - due) / (1000 * 60 * 60 * 24)));
    }

    const filtered = filter === 'all' ? tasks : tasks.filter(t => resolveStatus(t) === filter);
    if (!filtered.length) return '<tr><td colspan="5" style="text-align:center;padding:16px;color:#94a3b8">لا توجد معاملات</td></tr>';

    return filtered.map(t => {
        const [label, cls] = stBadge(t);
        const late    = daysLate(t.dueDate);
        const caseInfo = t.caseNumber ? `<span class="case-badge">ق ${t.caseNumber} / ${t.caseYear || '—'}</span>` : '';
        return `<tr>
            <td style="font-weight:700;color:var(--brand-primary-teal);white-space:nowrap">${t.id || '-'}</td>
            <td style="max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${(t.subject || '').replace(/"/g, "'")}">${t.subject || '-'}</td>
            <td>${t.source || '-'}<br>${caseInfo}</td>
            <td>
                <span class="st-badge ${cls}">${label}</span>
                ${late > 0 ? `<div class="days-late">منذ ${late} يوم</div>` : ''}
            </td>
            <td style="white-space:nowrap;color:${late > 0 ? 'var(--color-danger)' : 'var(--color-text-3)'};font-weight:${late > 0 ? 800 : 400}">${t.dueDate || '-'}</td>
        </tr>`;
    }).join('');
}
