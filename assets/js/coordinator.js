lucide.createIcons();

let allTasks      = [];
let allEmployees  = [];
let adminList     = [];
let techList      = [];
let currentStatusFilter = '';
let currentDocFilter    = '';
let showMissingOnly = false;
let isTableView     = false;

const CASE_ENTITIES = ['النيابة الإدارية', 'نيابة', 'الشؤون القانونية', 'شئون قانونية', 'ش.ق', 'ش ق'];

document.addEventListener('DOMContentLoaded', async () => {
    const user = IAGSession.getUser();
    if (!user) { window.location.href = 'index.html'; return; }

    document.getElementById('menu-user').textContent = user.name;
    document.getElementById('menu-role').textContent = user.role;

    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const lastDay = new Date(y, now.getMonth() + 1, 0).getDate();
    document.getElementById('f-start').value = `${y}-${m}-01`;
    document.getElementById('f-end').value = `${y}-${m}-${lastDay}`;

    await loadData(user.name);
});

function toggleMenu() {
    document.getElementById('side-menu').classList.toggle('open');
    document.getElementById('menu-overlay').classList.toggle('open');
}
function closeMenu() {
    document.getElementById('side-menu').classList.remove('open');
    document.getElementById('menu-overlay').classList.remove('open');
}

function logout() {
    IAGSession.logout();
}

function closeModal() { document.getElementById('detail-modal').classList.remove('open'); }
function closeEnhancementModal(id) { document.getElementById(id).classList.remove('open'); }

// ── Toggle View Mode ──
function toggleViewMode() {
    isTableView = !isTableView;
    const iconEl = document.getElementById('icon-view');
    iconEl.setAttribute('data-lucide', isTableView ? 'layout-grid' : 'table');
    lucide.createIcons();
    document.getElementById('tasks-list').classList.toggle('hidden', isTableView);
    document.getElementById('tasks-table-container').classList.toggle('hidden', !isTableView);
}

function toggleMissingData() {
    showMissingOnly = !showMissingOnly;
    document.getElementById('btn-missing').classList.toggle('active', showMissingOnly);
    applyFilters();
}

async function loadData(username) {
    const container = document.getElementById('tasks-list');
    container.innerHTML = `
        <div class="loader-box">
            <i data-lucide="loader-2" class="spin" style="width:40px;height:40px;margin:0 auto 12px;color:#0f766e"></i>
            <p style="font-weight:700;color:#64748b">جاري الاتصال بقاعدة البيانات...</p>
        </div>`;
    lucide.createIcons();

    const { ok, data, error } = await IAGApi.getAllData(username);

    if (ok) {
        allTasks = data.tasks || [];
        if (data.stats && data.stats.employees) allEmployees = data.stats.employees;
        populateDropdowns();
        applyFilters();
    } else {
        container.innerHTML = `<div class="empty-box"><i data-lucide="alert-circle" style="width:32px;height:32px;margin:0 auto 8px;color:#94a3b8"></i><p>${error || 'لا توجد بيانات'}</p></div>`;
        lucide.createIcons();
    }
}

function populateDropdowns() {
    const grpAdmin      = document.getElementById('grp-admin');
    const grpTech       = document.getElementById('grp-tech');
    const reassignSelect = document.getElementById('reassign-select');

    grpAdmin.innerHTML = ''; grpTech.innerHTML = '';
    adminList = []; techList = [];
    if (reassignSelect) reassignSelect.innerHTML = '<option value="">-- اختر من القائمة --</option>';

    allEmployees.sort((a, b) => a.name.localeCompare(b.name)).forEach(e => {
        const title = (e.jobTitle || '').trim();
        if (title === 'مراجع فني') {
            techList.push(e.name);
            grpTech.innerHTML += `<option value="${e.name}">${e.name}</option>`;
            if (reassignSelect) reassignSelect.innerHTML += `<option value="${e.name}">${e.name}</option>`;
        } else if (title === 'مراجع مالي وإداري') {
            adminList.push(e.name);
            grpAdmin.innerHTML += `<option value="${e.name}">${e.name}</option>`;
            if (reassignSelect) reassignSelect.innerHTML += `<option value="${e.name}">${e.name}</option>`;
        }
    });

    const srcSelect = document.getElementById('f-source');
    const sources = new Set(allTasks.map(t => t.source).filter(s => s));
    Array.from(sources).sort().forEach(s => {
        srcSelect.innerHTML += `<option value="${s}">${s}</option>`;
    });
}

        function filterStatus(status) {
    // toggle: ضغط على المربع النشط يرجع للإجمالي
    if (status && currentStatusFilter === status) {
        currentStatusFilter = ''; // إلغاء الفلتر إذا تم الضغط على نفس الكارت
    } else {
        currentStatusFilter = status;
    }

    // تحديث الشكل البصري للكروت فوراً
    updateActiveStatCard();

    // تطبيق الفلاتر
    applyFilters();
}

// دالة جديدة ومستقلة لتحديث الشكل البصري للكروت بناءً على currentStatusFilter
function updateActiveStatCard() {
    // 1. مسح الكلاس active من كل الكروت
    document.querySelectorAll('.stat-card-big, .stat-card-small').forEach(el => el.classList.remove('active'));

    // 2. خريطة مطابقة النصوص لـ IDs الكروت
    const map = {
        '': 'st-total',
        'جديد': 'st-new',
        'بانتظار الاعتماد': 'st-pending',
        'تم الاعتماد والأرشفة': 'st-approved',
        'بحاجة الي متابعة': 'st-followup',
        'متأخر': 'st-late'
    };

    // 3. تحديد الـ ID الذي يجب أن يكون نشطاً
    let activeId = map[currentStatusFilter] || 'st-total';

    // 4. إضافة الكلاس active للكارت الهدف
    const activeCard = document.getElementById(activeId);
    if(activeCard) {
        activeCard.classList.add('active');
    }
}


function getMissingFields(t) {
    const isCaseEntity = CASE_ENTITIES.some(ce => (t.source || '').includes(ce));
    const isFullyDone  = (t.status || '') === 'تم الاعتماد والأرشفة';
    const isOutgoing   = (t.transactionType || t.docType || '').includes('صادر');
    const missing = [];
    if (!t.assignee || t.assignee.trim() === '')
        missing.push('assignee');
    if (isCaseEntity && (!t.caseNumber || t.caseNumber.toString().trim() === ''))
        missing.push('case');
    if (isFullyDone && (!t.archive || t.archive.toString().trim() === '' || t.archive.toString().trim() === 'undefined'))
        missing.push('archive');
    if (!isOutgoing && (!t.attachment || t.attachment.toString().trim() === '' || t.attachment.toString().trim() === 'undefined'))
        missing.push('attachment');
    return missing;
}

// ── DocType helpers ──
function getDocGroup(t) {
    const docType = (t.docType || '').trim();
    if (docType.includes('صادر')) return 'صادر';
    const txType = (t.transactionType || '').trim();
    if (txType.includes('صادر')) return 'صادر';
    return 'وارد';
}

function filterDocType(group) {
    currentDocFilter = (currentDocFilter === group) ? '' : group;
    applyFilters();
}

function applyFilters() {
    const empVal = document.getElementById('f-emp').value;
    const src    = document.getElementById('f-source').value;
    const search = document.getElementById('f-search').value.toLowerCase();
    const start  = document.getElementById('f-start').value;
    const end    = document.getElementById('f-end').value;

    const baseFiltered = allTasks.filter(t => {
        if (getDocGroup(t) === 'صادر') return false;
        if (search && !(t.subject + t.id + t.source).toLowerCase().includes(search)) return false;
        if (src && t.source !== src) return false;
        if (empVal) {
            if (empVal === 'ALL_ADMIN') { if (!adminList.includes(t.assignee)) return false; }
            else if (empVal === 'ALL_TECH') { if (!techList.includes(t.assignee)) return false; }
            else { if (t.assignee !== empVal) return false; }
        }
        if (start && end && t.date) {
            const isoDate = parseDateToISO(t.date);
            if (isoDate && (isoDate < start || isoDate > end)) return false;
        }
        if (showMissingOnly && getMissingFields(t).length === 0) return false;
        return true;
    });

    updateStatsContext(baseFiltered);

    const displayFiltered = baseFiltered.filter(t => {
        if (currentStatusFilter && !(t.status || '').includes(currentStatusFilter)) return false;
        if (currentDocFilter && getDocGroup(t) !== currentDocFilter) return false;
        return true;
    });

    updateContextBar(displayFiltered);
    renderTasks(displayFiltered);
}

function updateStatsContext(tasks) {
    let c = { total: 0, new: 0, pending: 0, approved: 0, followup: 0, late: 0 };
    tasks.forEach(t => {
        c.total++;
        const s = (t.status || '');
        if      (s.includes('جديد'))     c.new++;
        else if (s.includes('بانتظار'))  c.pending++;
        else if (s.includes('تم'))       c.approved++;
        else if (s.includes('متابعة'))   c.followup++;
        else if (s.includes('متأخر'))    c.late++;
    });
    document.getElementById('c-total').textContent    = c.total;
    document.getElementById('c-new').textContent      = c.new;
    document.getElementById('c-pending').textContent  = c.pending;
    document.getElementById('c-approved').textContent = c.approved;
    document.getElementById('c-followup').textContent = c.followup;
    document.getElementById('c-late').textContent     = c.late;
}

function updateContextBar(tasks) {
    const icons  = { 'وارد': '📥' };
    const counts = { 'وارد': 0 };
    tasks.forEach(t => {
        const g = getDocGroup(t);
        if (g === 'وارد') counts[g]++;
    });

    const bar   = document.getElementById('context-bar');
    const chips = document.getElementById('ctx-chips');
    let html = `<span class="ctx-total">${tasks.length} معاملة</span><div class="ctx-divider"></div>`;
    let hasChip = false;
    Object.entries(counts).forEach(([group, count]) => {
        if (!count) return;
        hasChip = true;
        const active = currentDocFilter === group ? 'active' : '';
        html += `<button class="ctx-chip ${active}" onclick="filterDocType('${group}')">${icons[group]} ${group} <span class="ctx-count">${count}</span></button>`;
    });
    chips.innerHTML = html;
    bar.style.display = 'flex';
}

function renderTasks(tasks) {
    const container  = document.getElementById('tasks-list');
    const tableBody  = document.getElementById('tasks-table-body');

    if (tasks.length === 0) {
        const emptyHtml = `<div class="empty-box">لا توجد نتائج مطابقة</div>`;
        container.innerHTML = emptyHtml;
        tableBody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:3rem;color:#64748b">لا توجد نتائج</td></tr>`;
        return;
    }

    // ── Cards ──
    container.innerHTML = tasks.map(t => {
        let bgClass = 'bg-new';
        if (t.status.includes('بانتظار')) bgClass = 'bg-pending';
        else if (t.status.includes('تم'))      bgClass = 'bg-approved';
        else if (t.status.includes('متابعة'))  bgClass = 'bg-followup';
        else if (t.status.includes('متأخر'))   bgClass = 'bg-late';

        const isCaseEntity = CASE_ENTITIES.some(ce => (t.source || '').includes(ce));
        const isPending    = (t.status || '').includes('بانتظار');
        const isFullyDone  = (t.status || '') === 'تم الاعتماد والأرشفة';
        const missing      = getMissingFields(t);
        const hasMissing   = missing.length > 0;
        const hasReview    = t.reviewFile && t.reviewFile.toString().trim() && t.reviewFile !== 'undefined';
        const hasArchive   = t.archive && t.archive.toString().trim() && t.archive !== 'undefined';

        // badge الربط بمعاملة أصل
        const linkedParent = t.parentId && t.parentId.toString().trim()
            ? `<span style="background:#eff6ff;color:#1d4ed8;border:1px solid #bfdbfe;border-radius:20px;padding:2px 10px;font-size:0.72rem;font-weight:700">🔗 مرتبطة بـ ${t.parentId}</span>`
            : '';

        // badge القضية
        let caseBadge = '';
        if (isCaseEntity && t.caseNumber && t.caseNumber.toString().trim()) {
            const isNA = (t.source || '').includes('نيابة');
            caseBadge = `<span class="${isNA ? 'badge-case-na' : 'badge-case-sq'} badge-case">⚖️ ${isNA ? 'ن.إ' : 'ش.ق'}: ${t.caseNumber}/${t.caseYear || ''}</span>`;
        } else if (isCaseEntity && missing.includes('case')) {
            caseBadge = `<span class="badge-missing">⚠ رقم القضية ناقص</span>`;
        }

        // رقم الوارد المرتبط للصادر
        const isOutgoing = (t.transactionType || t.docType || '').includes('صادر');
        const linkedIn   = isOutgoing ? t.id.replace(/^OUT-/, 'IN-') : null;

        // ── الأيقونات الثلاثة ──
        const hasAttach = t.attachment && t.attachment.toString().trim() && t.attachment !== 'undefined';

        // 📥 مرفق الوارد
        let btnAttach;
        if (hasAttach) {
            btnAttach = `<button onclick="event.stopPropagation();window.open('${t.attachment}')" class="attach-pill attach-green">📥 الوارد</button>`;
        } else if (isOutgoing) {
            const linkedId   = t.id.replace(/^OUT-/, 'IN-');
            const linkedTask = allTasks.find(x => x.id === linkedId);
            const linkedUrl  = linkedTask && linkedTask.attachment;
            btnAttach = linkedUrl
                ? `<button onclick="event.stopPropagation();window.open('${linkedUrl}')" class="attach-pill attach-green">📥 الوارد</button>`
                : `<span class="attach-pill attach-grey">📥 الوارد</span>`;
        } else {
            btnAttach = `<button onclick="event.stopPropagation();openModal('${t.id}')" class="attach-pill" style="background:#fef2f2;color:#dc2626;border-color:#fecaca;border:1px solid">⚠ الوارد ناقص</button>`;
        }

        // 📄 ملف المراجعة
        let btnReview;
        if (hasReview) {
            btnReview = `<button onclick="event.stopPropagation();window.open('${t.reviewFile}')" class="attach-pill attach-green">📄 المراجعة</button>`;
        } else if (isPending) {
            btnReview = `<button onclick="event.stopPropagation();openModal('${t.id}')" class="attach-pill attach-warn">⚠ المراجعة ناقصة</button>`;
        } else {
            btnReview = `<span class="attach-pill attach-grey">📄 المراجعة</span>`;
        }

        // 📎 الصادر النهائي
        let btnArchive;
        if (hasArchive) {
            btnArchive = `<button onclick="event.stopPropagation();window.open('${t.archive}')" class="attach-pill attach-green">📎 الصادر</button>`;
        } else if (isFullyDone) {
            btnArchive = `<button onclick="event.stopPropagation();openArchiveUpload('${t.id}')" class="attach-pill attach-danger">⚠ الصادر ناقص</button>`;
        } else {
            btnArchive = `<span class="attach-pill attach-grey">📎 الصادر</span>`;
        }

        return `
        <div class="task-card ${bgClass} ${hasMissing ? 'has-missing' : ''}">
            <div class="card-body">
                <div class="card-stripe">
                    <span class="card-id">#${t.id}</span>
                    <span class="card-status">${t.status}${isFullyDone ? ' ✅' : ''}</span>
                </div>
                <h3 class="tc-subject">${t.subject}</h3>
                <div class="tc-row"><i data-lucide="building-2" style="width:16px;height:16px;flex-shrink:0"></i><span>${t.source || 'غير محدد'}</span></div>
                <div class="tc-row"><i data-lucide="calendar" style="width:16px;height:16px;flex-shrink:0"></i><span>${formatArabicDate(t.date)}</span></div>
                ${caseBadge ? `<div class="tc-row" style="flex-wrap:wrap;gap:6px">${caseBadge}</div>` : ''}
                ${linkedParent ? `<div class="tc-row">${linkedParent}</div>` : ''}
            </div>
            <div class="card-assignee">
                <div style="display:flex;align-items:center;gap:10px">
                    <div class="assignee-avatar">${t.assignee ? t.assignee.slice(0,2) : '؟'}</div>
                    <div style="min-width:0;flex:1">
                        <div class="assignee-name-label">المكلف</div>
                        <div class="assignee-name-val">${t.assignee || '<span style="color:#dc2626;font-size:0.82rem">⚠ غير موزع</span>'}</div>
                        <button onclick="event.stopPropagation();openReassignModal('${t.id}')" style="margin-top:5px;font-size:0.65rem;background:#f0fdfa;border:1px solid #ccfbf1;padding:3px 10px;border-radius:10px;cursor:pointer;color:#0f766e;font-family:Cairo,sans-serif;font-weight:800;transition:0.15s" onmouseover="this.style.background='#ccfbf1'" onmouseout="this.style.background='#f0fdfa'">تغيير المكلف</button>
                    </div>
                </div>
                <div class="attach-pills">${btnAttach}${btnReview}${btnArchive}</div>
            </div>
            <div class="tc-footer">
                <button onclick="openModal('${t.id}')" class="btn-card">
                    <i data-lucide="settings-2" style="width:20px;height:20px"></i><span>معالجة</span>
                </button>
            </div>
        </div>`;
    }).join('');

    // ── Table ──
    tableBody.innerHTML = tasks.map(t => {
        const missing = getMissingFields(t);
        let missingTags = '';
        if (missing.includes('assignee')) missingTags += '<span class="missing-tag missing-tag-assignee">المكلف</span>';
        if (missing.includes('case'))     missingTags += '<span class="missing-tag missing-tag-case">القضية</span>';
        if (missing.includes('archive'))  missingTags += '<span class="missing-tag missing-tag-archive">الصادر</span>';

        return `
        <tr class="${missing.length ? 'row-missing' : ''}">
            <td style="font-family:monospace;color:#64748b;font-weight:700;font-size:0.75rem">#${t.id}</td>
            <td style="font-weight:700;color:#1e293b;max-width:250px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis" title="${t.subject}">${t.subject}</td>
            <td style="color:#4b5563;font-size:0.75rem">${t.source || '-'}</td>
            <td style="font-weight:700;font-size:0.75rem;color:${t.assignee ? '#0f766e' : '#ef4444'}">${t.assignee || 'غير موزع'}</td>
            <td><span style="background:#f1f5f9;color:#374151;padding:2px 8px;border-radius:6px;font-size:0.75rem;font-weight:700">${t.status}</span></td>
            <td>${missingTags || '<span style="color:#d1d5db">—</span>'}</td>
            <td style="text-align:center">
                <button onclick="openModal('${t.id}')" style="background:#f0fdfa;color:#0f766e;padding:8px;border-radius:6px;border:none;cursor:pointer" title="فتح التفاصيل">
                    <i data-lucide="edit" style="width:16px;height:16px"></i>
                </button>
            </td>
        </tr>`;
    }).join('');

    lucide.createIcons();
}

// ── Details Modal ──
function openModal(id) {
    const t = allTasks.find(x => x.id == id);
    if (!t) return;
    document.getElementById('m-id').textContent = '#' + t.id;

    const ro = (label, val) =>
        `<div class="data-item"><span class="data-label">${label}</span><p class="data-val">${val || '-'}</p></div>`;

    const ed = (label, field, val, placeholder) => {
        if (val && val.toString().trim() !== '' && val !== 'undefined') return ro(label, val);
        return `<div class="data-item">
            <span class="data-label">${label} <span class="badge-missing">⚠ ناقص</span></span>
            <div class="edit-field">
                <input type="text" class="edit-input" id="edit-${field}-${t.id}" placeholder="${placeholder || ''}">
                <button class="edit-btn edit-btn-save" onclick="saveFieldUpdate('${t.id}','${field}',this)">حفظ</button>
            </div>
        </div>`;
    };

    const SOURCE_OPTIONS = [
        'النيابة الإدارية',
        'ديوان الوزارة',
        'هيئة الرقابة الإدارية',
        'ديوان المحافظة',
        'الجهاز المركزي',
        'التنظيم والإدارة',
        'المديرية المالية',
        'محليات اخري',
        'وكيل الوزارة',
        'وكيل الوزارة (فحص مبادرات)',
        'وكيل الوزارة (الشؤون القانونية)'
    ];

    const edSource = (currentVal) => {
        const opts = SOURCE_OPTIONS.map(o =>
            `<option value="${o}" ${o === currentVal ? 'selected' : ''}>${o}</option>`
        ).join('');
        return `<div class="data-item">
            <span class="data-label">الجهة الواردة</span>
            <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">
                <span class="data-val" style="flex:1">${currentVal || 'غير محدد'}</span>
                <button onclick="openSourcePicker('${t.id}','${(currentVal||'').replace(/'/g,"\\'")}',this)"
                    style="font-size:0.72rem;background:#f1f5f9;border:1px solid #cbd5e1;padding:4px 10px;border-radius:8px;cursor:pointer;color:#475569;font-family:'Cairo',sans-serif;font-weight:700;display:flex;align-items:center;gap:4px">
                    <i data-lucide="pencil" style="width:12px;height:12px"></i> تعديل
                </button>
            </div>
            <div id="source-picker-${t.id}" style="display:none;margin-top:8px">
                <select id="source-select-${t.id}"
                    style="width:100%;height:40px;border:1px solid #0f766e;border-radius:10px;padding:0 8px;font-family:'Cairo',sans-serif;font-size:0.88rem;outline:none;background:white;color:#1e293b">
                    <option value="">— اختر الجهة —</option>
                    ${opts}
                </select>
                <div style="display:flex;gap:6px;margin-top:8px">
                    <button onclick="confirmSourceUpdate('${t.id}',this)"
                        style="flex:1;height:38px;background:#0f766e;color:white;border:none;border-radius:10px;font-family:'Cairo',sans-serif;font-size:0.85rem;font-weight:700;cursor:pointer">
                        حفظ
                    </button>
                    <button onclick="document.getElementById('source-picker-${t.id}').style.display='none'"
                        style="height:38px;padding:0 14px;background:#f1f5f9;color:#64748b;border:1px solid #e2e8f0;border-radius:10px;font-family:'Cairo',sans-serif;font-size:0.85rem;font-weight:700;cursor:pointer">
                        إلغاء
                    </button>
                </div>
            </div>
        </div>`;
    };

    const isCaseEntity = CASE_ENTITIES.some(ce => (t.source || '').includes(ce));
    const isPending    = (t.status || '').includes('بانتظار');
    const isFullyDone  = (t.status || '') === 'تم الاعتماد والأرشفة';
    const hasReview    = t.reviewFile && t.reviewFile.toString().trim() && t.reviewFile !== 'undefined';
    const hasArchive   = t.archive && t.archive.toString().trim() && t.archive !== 'undefined';

    let html = '';
    html += ro('الموضوع', `<span style="font-weight:800;line-height:1.6">${t.subject}</span>`);
    html += edSource(t.source);

    // ── ١: ربط المعاملة بأصل ──
    const edParent = () => {
        const curParent = t.parentId && t.parentId.toString().trim();
        return `<div class="data-item">
            <span class="data-label">مرتبطة بمعاملة أصل</span>
            <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">
                <span class="data-val" id="parent-val-${t.id}" style="flex:1;color:${curParent ? '#1d4ed8' : '#94a3b8'}">
                    ${curParent ? '🔗 ' + curParent : '— غير مرتبطة'}
                </span>
                <button onclick="openParentPicker('${t.id}',this)"
                    style="font-size:0.72rem;background:#eff6ff;border:1px solid #bfdbfe;padding:4px 10px;border-radius:8px;cursor:pointer;color:#1d4ed8;font-family:'Cairo',sans-serif;font-weight:700">
                    🔗 ${curParent ? 'تعديل' : 'ربط'}
                </button>
                ${curParent ? `<button onclick="clearParentId('${t.id}',this)"
                    style="font-size:0.72rem;background:#fef2f2;border:1px solid #fecaca;padding:4px 8px;border-radius:8px;cursor:pointer;color:#dc2626;font-family:'Cairo',sans-serif;font-weight:700">✕</button>` : ''}
            </div>
            <div id="parent-picker-${t.id}" style="display:none;margin-top:8px">
                <input type="text" id="parent-search-${t.id}" placeholder="ابحث برقم المعاملة أو الموضوع..."
                    oninput="filterParentList('${t.id}')"
                    style="width:100%;height:38px;border:1px solid #0f766e;border-radius:10px;padding:0 10px;font-family:'Cairo',sans-serif;font-size:0.85rem;outline:none;box-sizing:border-box">
                <div id="parent-list-${t.id}"
                    style="max-height:180px;overflow-y:auto;border:1px solid #e2e8f0;border-radius:8px;margin-top:4px;background:white;font-size:0.82rem;font-family:'Cairo',sans-serif"></div>
                <button onclick="document.getElementById('parent-picker-${t.id}').style.display='none'"
                    style="margin-top:6px;height:32px;padding:0 14px;background:#f1f5f9;color:#64748b;border:1px solid #e2e8f0;border-radius:8px;font-family:'Cairo',sans-serif;font-size:0.82rem;cursor:pointer">إلغاء</button>
            </div>
        </div>`;
    };
    html += edParent();

    html += ro('محل التنفيذ', t.entity);
    html += ro('نوع المعاملة', t.transactionType || t.docType || '-');

    html += ro('تاريخ الوارد', formatArabicDate(t.date));
    html += ro('تاريخ التكليف', formatArabicDate(t.assignDate));
    html += ro('تاريخ الإنجاز', t.completionDate ? formatArabicDate(t.completionDate) : '-');
    html += ed('الموظف المكلف', 'assignee', t.assignee, 'اسم الموظف');
    html += ro('الحالة', t.status);

    // ── ٢: رقم الصادر وملفه لو المعاملة مكتملة ──
    if (isFullyDone && t.archive && t.archive.toString().trim() && t.archive !== 'undefined') {
        html += `<div class="data-item" style="background:#f0fdf4;border-radius:8px;padding:8px;border:1px solid #bbf7d0">
            <span class="data-label" style="color:#065f46">✅ تم إغلاق الموضوع — الصادر النهائي</span>
            <p class="data-val">
                <a href="${t.archive}" target="_blank"
                    style="color:#0f766e;text-decoration:underline;font-weight:700;font-size:0.9rem">
                    📎 فتح ملف الصادر
                </a>
            </p>
        </div>`;
    }

    if (isCaseEntity) {
        const isNA = (t.source || '').includes('نيابة');
        html += ed(isNA ? 'رقم قضية النيابة الإدارية' : 'رقم قضية الشؤون القانونية', 'caseNumber', t.caseNumber, 'رقم القضية');
        html += ed('لسنة', 'caseYear', t.caseYear, new Date().getFullYear().toString());
    }

    html += ed('الأهمية', 'importance', t.importance, 'عادي / عاجل / عاجل جداً');

    // ── مرفقات حسب المرحلة ──
    if (isPending) {
        if (hasReview) {
            html += `<div class="data-item">
                <span class="data-label">ملف المراجعة (للاطلاع)</span>
                <p class="data-val"><a href="${t.reviewFile}" target="_blank" style="color:#0f766e;text-decoration:underline;font-weight:700">📄 فتح ملف المراجعة PDF</a></p>
            </div>`;
        } else {
            html += `<div class="data-item">
                <span class="data-label">ملف المراجعة (للاطلاع)</span>
                <p class="data-val" style="color:#94a3b8;font-size:0.85rem">⬜ لم يُولَّد بعد — سيظهر هنا تلقائياً بعد إنشاء التقرير</p>
            </div>`;
        }
    } else if (isFullyDone) {
        if (hasArchive) {
            html += `<div class="data-item"><span class="data-label">الصادر النهائي (الأرشيف) ✅</span>
                <p class="data-val"><a href="${t.archive}" target="_blank" style="color:#0f766e;text-decoration:underline;font-weight:700">📎 فتح الصادر</a></p></div>`;
        } else {
            html += `<div class="data-item">
                <span class="data-label">الصادر النهائي (الأرشيف) <span class="badge-missing">⚠ ناقص</span></span>
                <div class="upload-area" id="upload-area-${t.id}" onclick="document.getElementById('file-${t.id}').click()">
                    <input type="file" id="file-${t.id}" style="display:none" onchange="uploadArchiveFile('${t.id}',this)" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png">
                    <p style="font-size:0.85rem;font-weight:700;color:#92400e;margin:0">📤 اضغط لرفع ملف الصادر</p>
                    <p style="font-size:0.7rem;color:#94a3b8;margin:4px 0 0">PDF, Word, أو صورة</p>
                </div>
                <p id="upload-status-${t.id}" style="font-size:0.75rem;margin-top:4px;display:none"></p>
            </div>`;
        }
    }

    if (t.notes) {
        html += `<div style="background:#fefce8;padding:8px;border-radius:6px;border:1px solid #fde68a">
            <span class="data-label" style="color:#92400e">ملاحظات</span>
            <p class="data-val" style="color:#1e293b">${t.notes}</p></div>`;
    }
    if (t.attachment) {
        html += `<div style="margin-top:8px">
            <a href="${t.attachment}" target="_blank" class="btn-card btn-attach" style="display:inline-flex;width:auto;padding:8px 16px">
                <i data-lucide="paperclip" style="width:16px;height:16px"></i> مرفق الوارد
            </a></div>`;
    }

    document.getElementById('m-content').innerHTML = html;
    document.getElementById('detail-modal').classList.add('open');
    lucide.createIcons();
}

// ── Source Picker ──
function openSourcePicker(taskId, currentVal, btnEl) {
    const picker = document.getElementById('source-picker-' + taskId);
    if (!picker) return;
    picker.style.display = picker.style.display === 'none' ? 'block' : 'none';
}

async function confirmSourceUpdate(taskId, btnEl) {
    const sel   = document.getElementById('source-select-' + taskId);
    const value = sel ? sel.value.trim() : '';
    if (!value) { IAGFeedback.showError('يرجى اختيار الجهة أولاً'); return; }

    const confirmed = confirm('تأكيد تغيير الجهة إلى:\n"' + value + '"');
    if (!confirmed) return;

    const origText = btnEl.textContent;
    btnEl.textContent = 'جاري...'; btnEl.disabled = true;

    const updatedBy = IAGSession.getUser()?.name || 'المنسق';
    const { ok, error } = await IAGApi.updateTaskField(taskId, 'source', value, updatedBy);

    if (ok) {
        const task = allTasks.find(x => x.id == taskId);
        if (task) task.source = value;
        const picker = document.getElementById('source-picker-' + taskId);
        if (picker) {
            const item  = picker.closest('.data-item');
            const valEl = item.querySelector('.data-val');
            if (valEl) valEl.textContent = value;
            picker.style.display = 'none';
        }
        IAGFeedback.showSuccess('تم تحديث الجهة بنجاح');
        applyFilters();
    } else {
        IAGFeedback.showError(error || 'فشل الحفظ');
        btnEl.textContent = origText; btnEl.disabled = false;
    }
}

// ── Parent Task Picker ──
function openParentPicker(taskId, btnEl) {
    const picker = document.getElementById('parent-picker-' + taskId);
    if (!picker) return;
    const isOpen = picker.style.display !== 'none';
    picker.style.display = isOpen ? 'none' : 'block';
    if (!isOpen) {
        const input = document.getElementById('parent-search-' + taskId);
        if (input) { input.value = ''; filterParentList(taskId); input.focus(); }
    }
}

function filterParentList(taskId) {
    const input = document.getElementById('parent-search-' + taskId);
    const list  = document.getElementById('parent-list-' + taskId);
    if (!input || !list) return;
    const q = input.value.trim().toLowerCase();
    const filtered = allTasks.filter(t =>
        t.id != taskId &&
        getDocGroup(t) !== 'صادر' &&
        (!q || t.id.toString().toLowerCase().includes(q) ||
               (t.subject || '').toLowerCase().includes(q) ||
               (t.source  || '').toLowerCase().includes(q))
    ).slice(0, 30);
    if (!filtered.length) {
        list.innerHTML = '<div style="padding:10px 12px;color:#94a3b8;text-align:center">لا توجد نتائج</div>';
        return;
    }
    list.innerHTML = filtered.map(t => `
        <div onclick="selectParentTask('${taskId}','${t.id}')"
            style="padding:8px 12px;cursor:pointer;border-bottom:1px solid #f1f5f9;display:flex;gap:8px;align-items:center"
            onmouseover="this.style.background='#f0fdfa'" onmouseout="this.style.background='white'">
            <span style="font-weight:800;color:#0f766e;min-width:60px">#${t.id}</span>
            <span style="color:#1e293b;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${t.subject || '-'}</span>
            <span style="color:#64748b;font-size:0.75rem;white-space:nowrap">${t.assignee || ''}</span>
        </div>`).join('');
}

async function selectParentTask(taskId, parentTaskId) {
    const parentTask = allTasks.find(x => x.id == parentTaskId);
    if (!parentTask) return;
    const parentIdVal = parentTaskId.toString().startsWith('IN-') ? parentTaskId : 'IN-' + parentTaskId;
    const confirmed = confirm('تأكيد الربط بالمعاملة:\n#' + parentTaskId + ' — ' + (parentTask.subject || ''));
    if (!confirmed) return;
    const updatedBy = IAGSession.getUser()?.name || 'المنسق';
    const { ok, error } = await IAGApi.updateTaskField(taskId, 'parentId', parentIdVal, updatedBy);
    if (ok) {
        const task = allTasks.find(x => x.id == taskId);
        if (task) task.parentId = parentIdVal;
        const valEl = document.getElementById('parent-val-' + taskId);
        if (valEl) { valEl.textContent = '🔗 ' + parentIdVal; valEl.style.color = '#1d4ed8'; }
        document.getElementById('parent-picker-' + taskId).style.display = 'none';
        applyFilters();
    } else { IAGFeedback.showError(error || 'فشل الحفظ'); }
}

async function clearParentId(taskId, btnEl) {
    if (!confirm('هل تريد إزالة الربط بالمعاملة الأصلية؟')) return;
    const updatedBy = IAGSession.getUser()?.name || 'المنسق';
    const { ok, error } = await IAGApi.updateTaskField(taskId, 'parentId', ' ', updatedBy);
    if (ok) {
        const task = allTasks.find(x => x.id == taskId);
        if (task) task.parentId = '';
        const valEl = document.getElementById('parent-val-' + taskId);
        if (valEl) { valEl.textContent = '— غير مرتبطة'; valEl.style.color = '#94a3b8'; }
        applyFilters();
    } else { IAGFeedback.showError(error || 'فشل الحذف'); }
}

// ── Save Field Update ──
async function saveFieldUpdate(taskId, fieldName, btnEl) {
    const input = document.getElementById(`edit-${fieldName}-${taskId}`);
    if (!input) return;
    const value = input.value.trim();
    if (!value) { IAGFeedback.showError('يرجى إدخال القيمة أولاً'); return; }

    const origText = btnEl.textContent;
    btnEl.textContent = 'جاري...'; btnEl.disabled = true;

    const updatedBy = IAGSession.getUser()?.name || 'المنسق';
    const { ok, error } = await IAGApi.updateTaskField(taskId, fieldName, value, updatedBy);

    if (ok) {
        const task = allTasks.find(x => x.id == taskId);
        if (task) task[fieldName] = value;
        const parent = input.closest('.data-item');
        const label  = parent.querySelector('.data-label').textContent.replace('⚠ ناقص', '').trim();
        parent.innerHTML = `<span class="data-label">${label} ✅</span><p class="data-val">${value}</p>`;
        applyFilters();
    } else {
        IAGFeedback.showError(error || 'فشل الحفظ');
        btnEl.textContent = origText; btnEl.disabled = false;
    }
}

// ── Upload Archive File ──
async function uploadArchiveFile(taskId, inputEl) {
    const file = inputEl.files[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { IAGFeedback.showError('حجم الملف أكبر من 10 ميجا'); return; }

    const area   = document.getElementById(`upload-area-${taskId}`);
    const status = document.getElementById(`upload-status-${taskId}`);
    area.classList.add('uploading');
    area.innerHTML = '<p style="font-size:0.85rem;font-weight:700;color:#0f766e">⏳ جاري الرفع...</p>';
    status.style.display = 'block';
    status.textContent = `📁 ${file.name} (${(file.size / 1024).toFixed(0)} KB)`;
    status.style.color = '#64748b';

    const base64    = await fileToBase64(file);
    const updatedBy = IAGSession.getUser()?.name || 'المنسق';
    const { ok, data, error } = await IAGApi.uploadArchiveFile(
        taskId, `صادر_${taskId}_${file.name}`, base64, file.type, updatedBy
    );

    if (ok) {
        const task = allTasks.find(x => x.id == taskId);
        if (task) task.archive = data.fileUrl;
        const parent = area.closest('.data-item');
        parent.innerHTML = `<span class="data-label">الصادر النهائي (الأرشيف) ✅</span>
            <p class="data-val"><a href="${data.fileUrl}" target="_blank" style="color:#0f766e;text-decoration:underline;font-weight:700">📎 فتح الصادر</a></p>`;
        applyFilters();
    } else {
        IAGFeedback.showError(error || 'فشل الرفع');
        area.classList.remove('uploading');
        area.innerHTML = '<p style="font-size:0.85rem;font-weight:700;color:#dc2626">❌ فشل الرفع — اضغط للمحاولة مرة أخرى</p>';
    }
}

function openArchiveUpload(taskId) { openModal(taskId); }

/* ── iag hooks (card.js) ── */
function iagOpenModal(id)          { openModal(id); }
function iagOpenReassign(id)       { openReassignModal(id); }
function iagOpenArchiveUpload(id)  { openArchiveUpload(id); }
function iagEditSource(id)         { openModal(id); }
function iagSaveField(id, f, btn)  { saveFieldUpdate(id, f, btn); }
function iagSaveCaseField(id, btn) {
    const num  = document.getElementById('edit-caseNumber-' + id);
    const year = document.getElementById('edit-caseYear-'   + id);
    if (num  && num.value.trim())  saveFieldUpdate(id, 'caseNumber', btn);
    if (year && year.value.trim()) saveFieldUpdate(id, 'caseYear',   btn);
}

function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload  = () => resolve(reader.result.split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

function openReassignModal(taskId) {
    document.getElementById('reassign-task-id').value = taskId;
    document.getElementById('modal-reassign').classList.add('open');
}

function openStatusModal(taskId) {
    document.getElementById('status-task-id').value = taskId;
    document.getElementById('modal-status').classList.add('open');
}

async function confirmReassign() {
    const taskId = document.getElementById('reassign-task-id').value;
    const newEmp = document.getElementById('reassign-select').value;
    const btn    = document.getElementById('btn-confirm-reassign');
    if (!newEmp) { IAGFeedback.showError('يرجى اختيار موظف'); return; }

    if (confirm(`هل أنت متأكد من تغيير المكلف إلى ${newEmp}؟`)) {
        btn.textContent = 'جاري الاتصال...'; btn.disabled = true;
        const currentUser = IAGSession.getUser()?.name || 'المنسق';
        const { ok, error } = await IAGApi.reassignTask(taskId, newEmp, currentUser);
        btn.textContent = 'تأكيد التغيير'; btn.disabled = false;
        if (ok) {
            IAGFeedback.showSuccess('تم تغيير المكلف بنجاح');
            closeEnhancementModal('modal-reassign');
            loadData(currentUser);
        } else { IAGFeedback.showError(error || 'لم يتم التعديل'); }
    }
}

async function confirmStatusChange() {
    const taskId    = document.getElementById('status-task-id').value;
    const newStatus = document.getElementById('status-select').value;
    const btn       = document.getElementById('btn-confirm-status');

    if (confirm(`هل أنت متأكد من تغيير الحالة إلى "${newStatus}"؟`)) {
        btn.textContent = 'جاري الحفظ...'; btn.disabled = true;
        const currentUser = IAGSession.getUser()?.name || 'المنسق';
        const { ok, error } = await IAGApi.updateStatus(taskId, newStatus, currentUser);
        btn.textContent = 'حفظ الحالة'; btn.disabled = false;
        if (ok) {
            IAGFeedback.showSuccess('تم تحديث الحالة بنجاح');
            closeEnhancementModal('modal-status');
            loadData(currentUser);
        } else { IAGFeedback.showError(error || 'لم يتم التعديل'); }
    }
}

function parseDateToISO(dateStr) {
    if (!dateStr) return null;
    if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) return dateStr;
    const parts = dateStr.split('/');
    if (parts.length === 3) return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
    return null;
}

function formatArabicDate(dateStr) {
    if (!dateStr) return '-';
    const parts = dateStr.split('/');
    if (parts.length !== 3) return dateStr;
    const d = new Date(parts[2], parts[1] - 1, parts[0]);
    return d.toLocaleDateString('ar-EG', { day: 'numeric', month: 'long', year: 'numeric' });
}
