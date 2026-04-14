/* ═══════════════════════════════════════════════════════
   IAG SYSTEM — card render (employee page)
   ═══════════════════════════════════════════════════════ */

/* ── ثوابت الجهات القانونية ── */
const CARD_CASE_ENTITIES = [
    '\u0627\u0644\u0646\u064A\u0627\u0628\u0629 \u0627\u0644\u0625\u062F\u0627\u0631\u064A\u0629',
    '\u0646\u064A\u0627\u0628\u0629',
    '\u0627\u0644\u0634\u0624\u0648\u0646 \u0627\u0644\u0642\u0627\u0646\u0648\u0646\u064A\u0629',
    '\u0634\u0626\u0648\u0646 \u0642\u0627\u0646\u0648\u0646\u064A\u0629',
    '\u0634.\u0642',
    '\u0634 \u0642',
    '\u062F\u064A\u0648\u0627\u0646 \u0627\u0644\u0648\u0632\u0627\u0631\u0629',
    '\u0647\u064A\u0626\u0629 \u0627\u0644\u0631\u0642\u0627\u0628\u0629 \u0627\u0644\u0625\u062F\u0627\u0631\u064A\u0629',
    '\u062F\u064A\u0648\u0627\u0646 \u0627\u0644\u0645\u062D\u0627\u0641\u0638\u0629',
    '\u0627\u0644\u062C\u0647\u0627\u0632 \u0627\u0644\u0645\u0631\u0643\u0632\u064A',
    '\u0627\u0644\u062A\u0646\u0638\u064A\u0645 \u0648\u0627\u0644\u0625\u062F\u0627\u0631\u0629',
    '\u0627\u0644\u0645\u062F\u064A\u0631\u064A\u0629 \u0627\u0644\u0645\u0627\u0644\u064A\u0629',
    '\u0645\u062D\u0644\u064A\u0627\u062A',
    '\u0645\u0643\u062A\u0628 \u0648\u0643\u064A\u0644 \u0627\u0644\u0648\u0632\u0627\u0631\u0629'
];

function renderCard(t, role) {
    const isCoord   = (role === 'مدير' || role === 'منسق');
    const isEmployee= (role === 'موظف');

    const status    = t.status || '';
    const docType   = (t.transactionType || t.docType || '');
    const isOut     = docType.includes('صادر');
    const isCmp     = docType.includes('شكو') || docType.includes('شكا');
    const isMro     = docType.toLowerCase().includes('مرور') || docType.includes('فحص');
    const isApproved= status.includes('تم الاعتماد');
    const isPending = status.includes('بانتظار');
    const isLate    = status.includes('متأخر');
    const isCaseEnt = CARD_CASE_ENTITIES.some(ce => (t.source||'').includes(ce));

    const hasAttach = _hasVal(t.attachment);
    const hasReview = _hasVal(t.reviewFile);
    const hasArchive= _hasVal(t.archive);

    let sClass = 's-new';
    if      (isLate)      sClass = 's-late';
    else if (isPending)   sClass = 's-pending';
    else if (isApproved)  sClass = 's-approved';
    else if (status.includes('متابعة')) sClass = 's-followup';

    let spClass = 'sp-new';
    if      (isLate)      spClass = 'sp-late';
    else if (isPending)   spClass = 'sp-pending';
    else if (isApproved)  spClass = 'sp-approved';
    else if (status.includes('متابعة')) spClass = 'sp-followup';

    let typeTxt = '📥 وارد', tpClass = 'tp-in';
    if      (isOut) { typeTxt = '📤 صادر'; tpClass = 'tp-out'; }
    else if (isCmp) { typeTxt = '📣 شكوى'; tpClass = 'tp-cmp'; }
    else if (isMro) { typeTxt = '🔍 مرور'; tpClass = 'tp-mro'; }

    let impHtml = '';
    if (t.importance) {
        const ic = t.importance === 'عاجل جداً' ? 'imp-high'
                 : t.importance === 'عاجل'       ? 'imp-medium' : 'imp-normal';
        const ie = t.importance === 'عاجل جداً' ? '🔴'
                 : t.importance === 'عاجل'       ? '🟠' : '🟢';
        impHtml = `<span class="iag-imp ${ic}">${ie} ${t.importance}</span>`;
    }

    let caseHtml = '';
    if (isCaseEnt && _hasVal(t.caseNumber)) {
        caseHtml = `<span class="iag-case">⚖️ قضية ${t.caseNumber}/${t.caseYear||''}</span>`;
    }

    const missing = isCoord ? _getMissing(t, isOut, isCaseEnt, isApproved) : [];
    let attRow = _buildAttachments(t, isCoord, isEmployee, isOut, isApproved, isPending,
                                   hasAttach, hasReview, hasArchive);
    let footer = '';
    if (isCoord) {
        footer = _coordFooter(t, missing, hasReview, hasArchive, isApproved, isPending);
    } else {
        footer = _empFooter(t, hasReview, isPending, isApproved);
    }

    let editSection = '';
    if (isCoord && missing.length > 0) {
        editSection = _buildEditFields(t, missing, isCaseEnt);
    }

    return `
<div class="iag-card ${sClass}" data-id="${t.id}">
    <div class="iag-card-head">
        <span class="iag-type-pill ${tpClass}">${typeTxt}</span>
        <span class="iag-status-pill ${spClass}">${status}</span>
    </div>
    <div class="iag-card-body">
        <div class="iag-subject">${t.subject}</div>
        <div class="iag-row">
            ${_icon('building-2')}
            <span>${t.source || 'غير محدد'}</span>
        </div>
        ${t.entity && t.entity !== t.source ? `
        <div class="iag-row">
            ${_icon('map-pin')}
            <span>${t.entity}</span>
        </div>` : ''}
        <div class="iag-row">
            ${_icon('calendar')}
            <span>${_fmtDate(t.date)}</span>
            <span class="mono">#${t.id}</span>
        </div>
        <div class="iag-row">
            ${_icon('user')}
            ${isCoord
                ? _assigneeCoord(t)
                : `<span style="color:#0a5c56;font-weight:700">${t.assignee || '-'}</span>`
            }
        </div>
        ${impHtml || caseHtml ? `
        <div class="iag-row" style="flex-wrap:wrap;gap:5px">
            ${impHtml}${caseHtml}
            ${isCoord && missing.includes('case') && isCaseEnt
                ? `<span class="iag-missing-badge">⚠ رقم القضية ناقص</span>` : ''}
        </div>` : ''}
        ${editSection}
    </div>
    ${attRow}
    <div class="iag-card-footer">${footer}</div>
</div>`;
}

function _hasVal(v) {
    return v && v.toString().trim() !== '' && v.toString().trim() !== 'undefined';
}

function _getMissing(t, isOut, isCaseEnt, isApproved) {
    const m = [];
    if (!t.assignee || !t.assignee.trim()) m.push('assignee');
    if (isCaseEnt && !_hasVal(t.caseNumber))  m.push('case');
    if (isApproved && !_hasVal(t.archive))     m.push('archive');
    if (!isOut && !_hasVal(t.attachment))      m.push('attachment');
    return m;
}

function _buildAttachments(t, isCoord, isEmployee, isOut, isApproved, isPending,
                            hasAttach, hasReview, hasArchive) {
    let pills = [];

    if (isEmployee && isApproved) {
        return `<div class="iag-attachments">
            <span class="iag-att" style="background:#f0fdf4;color:#047857;border-color:#a7f3d0;font-weight:700;gap:5px">
                ✅ تم الاعتماد والأرشفة
            </span>
        </div>`;
    }

    if (hasAttach) {
        pills.push(`<a href="${t.attachment}" target="_blank" class="iag-att att-has">📥 مرفق الوارد</a>`);
    } else if (!isOut) {
        if (isCoord) {
            pills.push(`<button onclick="event.stopPropagation();iagOpenModal('${t.id}')" class="iag-att att-warn">⚠ مرفق الوارد ناقص</button>`);
        } else {
            pills.push(`<span class="iag-att att-none">📥 لا يوجد مرفق</span>`);
        }
    }

    if (hasReview) {
        if (isEmployee && isPending) {
            pills.push(`<a href="${t.reviewFile}" target="_blank" class="iag-att att-action">✏️ فتح للتعديل</a>`);
        } else {
            pills.push(`<a href="${t.reviewFile}" target="_blank" class="iag-att att-has">📄 ملف المراجعة</a>`);
        }
    } else if (isPending && isCoord) {
        pills.push(`<span class="iag-att att-warn">⚠ ملف المراجعة ناقص</span>`);
    } else {
        pills.push(`<span class="iag-att att-none">📄 المراجعة</span>`);
    }

    if (hasArchive) {
        pills.push(`<a href="${t.archive}" target="_blank" class="iag-att att-has">📎 الصادر النهائي</a>`);
    } else if (isApproved && isCoord) {
        pills.push(`<button onclick="event.stopPropagation();iagOpenArchiveUpload('${t.id}')" class="iag-att att-warn">⚠ الصادر ناقص</button>`);
    } else {
        pills.push(`<span class="iag-att att-none">📎 الصادر</span>`);
    }

    return `<div class="iag-attachments">${pills.join('')}</div>`;
}

function _coordFooter(t, missing, hasReview, hasArchive, isApproved, isPending) {
    return `
        <button onclick="event.stopPropagation();iagOpenModal('${t.id}')"
            class="iag-btn iag-btn-manage">
            ${_icon('edit')} إدارة ومعالجة
        </button>`;
}

function _empFooter(t, hasReview, isPending, isApproved) {
    if (isApproved) {
        return `
            <button onclick="event.stopPropagation();iagOpenModal('${t.id}')"
                class="iag-btn iag-btn-details">
                ${_icon('eye')} التفاصيل
            </button>
            <span style="font-size:0.72rem;font-weight:700;color:#047857;display:flex;align-items:center;gap:4px;margin-right:auto">
                ${_icon('lock')} مغلق
            </span>`;
    }

    if (hasReview && isPending) {
        return `
            <a href="${t.reviewFile}" target="_blank"
               onclick="event.stopPropagation()"
               class="iag-btn iag-btn-word">
               ${_icon('file-edit')} فتح للتعديل
            </a>
            <button onclick="event.stopPropagation();iagOpenModal('${t.id}')"
                class="iag-btn iag-btn-details">
                ${_icon('eye')} التفاصيل
            </button>`;
    }
    return `
        <button onclick="event.stopPropagation();iagOpenModal('${t.id}')"
            class="iag-btn iag-btn-details">
            ${_icon('eye')} التفاصيل
        </button>`;
}

function _assigneeCoord(t) {
    if (t.assignee && t.assignee.trim()) {
        return `<span style="color:#0a5c56;font-weight:700;display:flex;align-items:center;gap:6px;flex-wrap:wrap">
            ${t.assignee}
            <button onclick="event.stopPropagation();iagOpenReassign('${t.id}')"
                style="font-size:0.65rem;background:#f1f5f9;border:1px solid #e2e8f0;padding:2px 8px;border-radius:6px;cursor:pointer;color:#475569;font-family:'Cairo',sans-serif;font-weight:700">
                تغيير
            </button>
        </span>`;
    }
    return `<span style="color:#dc2626;font-weight:700;display:flex;align-items:center;gap:6px">
        ⚠ غير موزع
        <button onclick="event.stopPropagation();iagOpenReassign('${t.id}')"
            style="font-size:0.65rem;background:#fef2f2;border:1px solid #fecaca;padding:2px 8px;border-radius:6px;cursor:pointer;color:#dc2626;font-family:'Cairo',sans-serif;font-weight:700">
            تعيين
        </button>
    </span>`;
}

function _buildEditFields(t, missing, isCaseEnt) {
    let html = '';
    if (missing.includes('assignee')) {
        html += `
        <div class="iag-row" style="flex-direction:column;align-items:flex-start;gap:4px">
            <span style="font-size:0.7rem;color:#92400e;font-weight:700">⚠ الموظف المكلف ناقص</span>
            <div class="iag-edit-row">
                <input class="iag-edit-input" id="edit-assignee-${t.id}" placeholder="اسم الموظف">
                <button class="iag-edit-save" onclick="event.stopPropagation();iagSaveField('${t.id}','assignee',this)">حفظ</button>
            </div>
        </div>`;
    }
    if (missing.includes('case') && isCaseEnt) {
        html += `
        <div class="iag-row" style="flex-direction:column;align-items:flex-start;gap:4px">
            <span style="font-size:0.7rem;color:#92400e;font-weight:700">⚠ رقم القضية ناقص</span>
            <div class="iag-edit-row">
                <input class="iag-edit-input" id="edit-caseNumber-${t.id}" placeholder="رقم القضية" style="max-width:110px">
                <input class="iag-edit-input" id="edit-caseYear-${t.id}" placeholder="${new Date().getFullYear()}" style="max-width:80px">
                <button class="iag-edit-save" onclick="event.stopPropagation();iagSaveCaseField('${t.id}',this)">حفظ</button>
            </div>
        </div>`;
    }
    return html;
}

function _icon(name) {
    return `<i data-lucide="${name}" style="width:14px;height:14px;flex-shrink:0"></i>`;
}

function _fmtDate(d) {
    if (!d) return '-';
    const p = d.split('/');
    if (p.length !== 3) return d;
    return new Date(p[2], p[1]-1, p[0])
        .toLocaleDateString('ar-EG', { day:'numeric', month:'long', year:'numeric' });
}

/* ═══════════════════════════════════════════════════════
   IAG SYSTEM — employee page logic
   ═══════════════════════════════════════════════════════ */

lucide.createIcons();

let myTasks      = [];
let myFiles      = { inspections: [], complaints: [] };
let filesLoaded  = false;
let currentUser  = null;
let currentStatusFilter = '';
let currentTab   = 'tasks';
let activeFileType = 'all';

document.addEventListener('DOMContentLoaded', async () => {
    currentUser = IAGSession.requireAuth();

    if ((currentUser.role||'').includes('مدير') || (currentUser.role||'').includes('منسق')) {
        window.location.href = 'coordinator.html'; return;
    }

    document.getElementById('menu-user').textContent       = currentUser.name;
    document.getElementById('menu-role').textContent       = currentUser.role || '';
    document.getElementById('header-emp-name').textContent = currentUser.name;

    const now = new Date();
    const y = now.getFullYear(), m = String(now.getMonth()+1).padStart(2,'0');
    const lastDay = new Date(y, now.getMonth()+1, 0).getDate();
    document.getElementById('f-start').value = `${y}-${m}-01`;
    document.getElementById('f-end').value   = `${y}-${m}-${lastDay}`;

    await loadTasks(currentUser.name);
});

async function loadTasks(username) {
    IAGFeedback.showLoading('جاري تحميل مهامك...');
    const result = await IAGApi.request('getAllData', { role: 'موظف', name: username });
    IAGFeedback.hideLoading();

    if (!result.ok) {
        showEmpty('خطأ في الاتصال بالخادم');
        IAGFeedback.showError(result.error || 'فشل تحميل المهام');
        return;
    }

    const all = (result.data && result.data.tasks) || [];
    myTasks = all.filter(t => (t.assignee||'').trim() === username.trim());
    const sources = [...new Set(myTasks.map(t => t.source).filter(Boolean))].sort();
    const sel = document.getElementById('f-source');
    sources.forEach(s => { sel.innerHTML += `<option value="${s}">${s}</option>`; });
    try {
        applyFilters();
    } catch(renderErr) {
        console.error('renderCard error:', renderErr);
        showEmpty('خطأ في عرض البيانات: ' + renderErr.message);
    }
}

async function loadFiles(username) {
    if (filesLoaded) return;
    const container = document.getElementById('files-tree-content');
    container.innerHTML = `
        <div class="empty-files">
            <i data-lucide="loader-2" class="loader-icon animate-spin"></i>
            <p class="loader-lbl">جاري تحميل ملفاتك من Drive...</p>
        </div>`;
    lucide.createIcons();
    const result = await IAGApi.request('getEmployeeFiles', { name: username });
    if (result.ok) {
        myFiles = {
            inspections: (result.data && result.data.inspections) || [],
            complaints:  (result.data && result.data.complaints)  || []
        };
        filesLoaded = true;
        renderFilesTree();
    } else {
        container.innerHTML = `<div class="empty-files"><p class="error-text">خطأ: ${result.error || 'فشل تحميل الملفات'}</p></div>`;
        IAGFeedback.showError(result.error || 'فشل تحميل الملفات');
    }
    lucide.createIcons();
}

function switchTab(tab) {
    currentTab = tab;
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.getElementById('tab-' + tab).classList.add('active');

    const isTask = tab === 'tasks';
    document.getElementById('view-tasks').classList.toggle('hidden', !isTask);
    document.getElementById('view-myfiles').classList.toggle('hidden', isTask);
    document.getElementById('stats-wrapper').classList.toggle('hidden', !isTask);
    document.getElementById('filter-tasks-view').classList.toggle('hidden', !isTask);
    document.getElementById('filter-files-view').classList.toggle('hidden', isTask);

    if (tab === 'myfiles') loadFiles(currentUser.name);
}

function setFileType(type) {
    activeFileType = type;
    document.querySelectorAll('.type-filter-btn').forEach(b => {
        b.className = 'type-filter-btn';
    });
    const cls = type === 'all' ? 'active-all' : type === 'insp' ? 'active-insp' : 'active-comp';
    document.getElementById('ftype-' + type).classList.add(cls);
    renderFilesTree();
}

function renderFilesTree() {
    const container = document.getElementById('files-tree-content');
    const query     = (document.getElementById('files-search').value || '').toLowerCase();

    const showInsp = activeFileType !== 'comp';
    const showComp = activeFileType !== 'insp';

    const filterFiles = (files) => files.filter(f =>
        !query || f.name.toLowerCase().includes(query) ||
        (f.entity||'').toLowerCase().includes(query) ||
        (f.month||'').toLowerCase().includes(query)
    );

    const inspFiles = showInsp ? filterFiles(myFiles.inspections) : [];
    const compFiles = showComp ? filterFiles(myFiles.complaints)  : [];

    if (!inspFiles.length && !compFiles.length) {
        container.innerHTML = `
            <div class="empty-files">
                <i data-lucide="folder-open" class="empty-icon"></i>
                <p class="empty-lbl">${query ? 'لا توجد نتائج مطابقة' : 'لا توجد ملفات بعد'}</p>
            </div>`;
        lucide.createIcons(); return;
    }

    let html = '';
    if (showInsp && inspFiles.length) {
        html += buildSection(inspFiles, 'insp', '🔍 تقارير المرور', true);
    }
    if (showComp && compFiles.length) {
        html += buildSection(compFiles, 'comp', '📣 فحص الشكاوى', false);
    }

    container.innerHTML = html;
    lucide.createIcons();
}

function buildSection(files, sType, title, hasEntity) {
    const grouped = {};
    files.forEach(f => {
        const y = f.year  || 'غير محدد';
        const m = f.month || 'غير محدد';
        const e = f.entity|| '';
        if (!grouped[y]) grouped[y] = {};
        if (!grouped[y][m]) grouped[y][m] = {};
        const key = hasEntity ? (e || 'عام') : '__direct__';
        if (!grouped[y][m][key]) grouped[y][m][key] = [];
        grouped[y][m][key].push(f);
    });

    const totalCount = files.length;
    const uid = sType + '_' + Date.now();

    let html = `
    <div class="tree-section">
        <div class="tree-section-head ${sType}" onclick="toggleBlock('sec-${uid}',this)">
            <div class="tree-section-title ${sType}">${title}</div>
            <div style="display:flex;align-items:center;gap:8px">
                <span class="tree-count ${sType}">${totalCount} ملف</span>
                <i data-lucide="chevron-down" style="width:16px;height:16px" class="chev open"></i>
            </div>
        </div>
        <div id="sec-${uid}">`;

    Object.keys(grouped).sort((a,b) => b-a).forEach(year => {
        const yearData   = grouped[year];
        const yearCount  = Object.values(yearData).reduce((s,m) => s + Object.values(m).reduce((ss,arr) => ss+arr.length, 0), 0);
        const yearUid    = sType + '_y_' + year;

        html += `
            <div class="year-row" onclick="toggleBlock('${yearUid}',this)">
                <div class="year-label">
                    <i data-lucide="calendar" style="width:14px;height:14px;color:#0a5c56"></i>
                    ${year}
                    <span class="year-count-pill">${yearCount} ملف</span>
                </div>
                <i data-lucide="chevron-down" style="width:14px;height:14px;color:#94a3b8" class="chev open"></i>
            </div>
            <div id="${yearUid}">`;

        Object.keys(yearData).sort().forEach(month => {
            const monthData  = yearData[month];
            const monthCount = Object.values(monthData).reduce((s,arr) => s+arr.length, 0);
            const monthUid   = sType + '_m_' + year + '_' + month.replace(/\s/g,'_');

            html += `
                <div class="month-row" onclick="toggleBlock('${monthUid}',this)">
                    <div class="month-label">
                        <i data-lucide="calendar-days" style="width:13px;height:13px;color:#0a5c56"></i>
                        ${month}
                        <span class="month-count-pill">${monthCount} ملف</span>
                    </div>
                    <i data-lucide="chevron-down" style="width:13px;height:13px;color:#94a3b8" class="chev open"></i>
                </div>
                <div id="${monthUid}" class="files-list open">`;

            if (hasEntity) {
                Object.keys(monthData).sort().forEach(entity => {
                    const entityFiles = monthData[entity];
                    const isAtt = entity.includes('مرفقات');
                    const entityUid = sType + '_e_' + year + '_' + month.replace(/\s/g,'_') + '_' + entity.replace(/\s/g,'_');

                    if (isAtt) {
                        html += `
                        <div class="att-folder-row" onclick="toggleBlock('${entityUid}',this)">
                            <div class="att-folder-label">
                                <i data-lucide="paperclip" style="width:13px;height:13px"></i>
                                ${entity}
                                <span style="font-size:0.6rem;background:#fde68a;color:#92400e;padding:1px 7px;border-radius:10px;font-weight:700">${entityFiles.length}</span>
                            </div>
                            <i data-lucide="chevron-down" style="width:13px;height:13px;color:#92400e" class="chev open"></i>
                        </div>
                        <div id="${entityUid}" class="files-list open">
                            ${entityFiles.map(f => buildFileItem(f)).join('')}
                        </div>`;
                    } else {
                        html += `
                        <div class="entity-row" onclick="toggleBlock('${entityUid}',this)">
                            <div class="entity-label">
                                <i data-lucide="building-2" style="width:13px;height:13px;color:#c2410c"></i>
                                ${entity}
                                <span class="entity-count-pill">${entityFiles.length}</span>
                            </div>
                            <i data-lucide="chevron-down" style="width:13px;height:13px;color:#94a3b8" class="chev open"></i>
                        </div>
                        <div id="${entityUid}" class="files-list open">
                            ${entityFiles.map(f => buildFileItem(f)).join('')}
                        </div>`;
                    }
                });
            } else {
                const directFiles = Object.values(monthData).flat();
                html += directFiles.map(f => buildFileItem(f)).join('');
            }

            html += `</div>`;
        });

        html += `</div>`;
    });

    html += `</div></div>`;
    return html;
}

function _parseFileName(name) {
    if (!name) return { title: name, sub: '' };

    const compMatch = name.match(/^COMP-(\S+)\s*-\s*(.+?)\s*-\s*(.+)$/);
    if (compMatch) {
        return {
            title: 'شكوى #' + compMatch[1],
            sub:   compMatch[2].trim() + ' • ' + compMatch[3].trim()
        };
    }

    const mroMatch = name.match(/^(.+?)\s*-\s*(.+?)\s*-\s*(\d.+)$/);
    if (mroMatch) {
        const typeShort = mroMatch[1].replace('تقرير مرور فني ', '').replace('تقرير ', '').trim();
        return {
            title: mroMatch[2].trim(),
            sub:   typeShort + ' • ' + mroMatch[3].trim()
        };
    }

    return { title: name, sub: '' };
}

function buildFileItem(f) {
    const isDoc   = f.isDoc || f.mimeType === 'application/vnd.google-apps.document' ||
                    f.mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    const isSheet = f.mimeType === 'application/vnd.google-apps.spreadsheet';
    const isPdf   = f.mimeType === 'application/pdf';

    const icon  = isDoc ? '📄' : isSheet ? '📊' : isPdf ? '📕' : '📁';
    const fiCls = isDoc ? 'fi-doc' : isSheet ? 'fi-sheet' : isPdf ? 'fi-pdf' : 'fi-other';

    const btnHtml = isDoc
        ? `<a href="${f.url}" target="_blank" class="btn-file-open btn-edit">
               <i data-lucide="file-edit" style="width:12px;height:12px"></i> تعديل
           </a>`
        : `<a href="${f.url}" target="_blank" class="btn-file-open btn-view">
               <i data-lucide="eye" style="width:12px;height:12px"></i> عرض
           </a>`;

    const parsed = _parseFileName(f.name);
    const metaParts = [];
    if (parsed.sub)    metaParts.push(parsed.sub);
    if (f.modified)    metaParts.push(f.modified);

    return `
    <div class="file-item">
        <div class="file-icon ${fiCls}">${icon}</div>
        <div class="file-info">
            <div class="file-name" title="${f.name}">${parsed.title}</div>
            ${metaParts.length ? `<div class="file-meta">${metaParts.join(' • ')}</div>` : ''}
        </div>
        <div class="file-actions">${btnHtml}</div>
    </div>`;
}

function toggleBlock(id, triggerEl) {
    const block = document.getElementById(id);
    if (!block) return;
    const isOpen = block.style.display !== 'none';
    block.style.display = isOpen ? 'none' : 'block';
    const chev = triggerEl.querySelector('.chev');
    if (chev) chev.classList.toggle('open', !isOpen);
}

function filterStatus(status) {
    currentStatusFilter = (currentStatusFilter === status) ? '' : status;
    document.querySelectorAll('.stat-card-big, .stat-card-small').forEach(el => el.classList.remove('active'));
    const map = { '':'st-total','جديد':'st-new','بانتظار':'st-pending','تم':'st-approved','متابعة':'st-followup','متأخر':'st-late' };
    const key = status ? (Object.keys(map).find(k => k && status.includes(k)) || '') : '';
    const el  = document.getElementById(map[key] || 'st-total');
    if (el) el.classList.add('active');
    applyFilters();
}

function applyFilters() {
    const search = document.getElementById('f-search').value.toLowerCase();
    const src    = document.getElementById('f-source').value;
    const start  = document.getElementById('f-start').value;
    const end    = document.getElementById('f-end').value;

    const base = myTasks.filter(t => {
        if (search && !(`${t.subject}${t.id}${t.source}${t.entity||''}`).toLowerCase().includes(search)) return false;
        if (src && t.source !== src) return false;
        if (start && end && t.date) {
            const iso = _parseDateISO(t.date);
            if (iso && (iso < start || iso > end)) return false;
        }
        return true;
    });

    let c = { total:0, new:0, pending:0, approved:0, followup:0, late:0 };
    base.forEach(t => {
        c.total++;
        const s = t.status||'';
        if      (s.includes('متأخر'))   c.late++;
        else if (s.includes('جديد'))    c.new++;
        else if (s.includes('بانتظار')) c.pending++;
        else if (s.includes('تم'))      c.approved++;
        else if (s.includes('متابعة'))  c.followup++;
    });
    document.getElementById('c-total').textContent    = c.total;
    document.getElementById('c-late').textContent     = c.late;
    document.getElementById('c-new').textContent      = c.new;
    document.getElementById('c-pending').textContent  = c.pending;
    document.getElementById('c-approved').textContent = c.approved;
    document.getElementById('c-followup').textContent = c.followup;

    const displayed = base.filter(t =>
        !currentStatusFilter || (t.status||'').includes(currentStatusFilter)
    );

    const container = document.getElementById('tasks-list');
    if (!displayed.length) {
        container.innerHTML = `<div class="empty-box">لا توجد نتائج مطابقة</div>`;
        lucide.createIcons(); return;
    }
    container.innerHTML = displayed.map(t => renderCard(t, 'موظف')).join('');
    lucide.createIcons();
}

function iagOpenModal(id)         { openModal(id); }
function iagOpenReassign(id)      {}
function iagOpenArchiveUpload(id) {}
function iagSaveField(id,f,btn)   {}
function iagSaveCaseField(id,btn) {}

function openModal(id) {
    const t = myTasks.find(x => x.id == id);
    if (!t) return;
    document.getElementById('m-id').textContent = '#' + t.id;

    const ro = (lbl, val) => val
        ? `<div class="data-item"><span class="data-label">${lbl}</span><p class="data-val">${val}</p></div>`
        : '';

    const isApproved = (t.status||'').includes('تم الاعتماد');
    const hasWord    = _hasVal(t.reviewFile);
    const hasArch    = _hasVal(t.archive);
    const hasAtt     = _hasVal(t.attachment);
    const isPending  = (t.status||'').includes('بانتظار');

    let html = '';
    html += ro('الموضوع',       `<span style="font-weight:800;line-height:1.6">${t.subject}</span>`);
    html += ro('الجهة الواردة', t.source);
    html += ro('محل التنفيذ',   t.entity);
    html += ro('نوع المعاملة',  t.transactionType || t.docType);
    html += ro('تاريخ الوارد',  _fmtDate(t.date));
    html += ro('تاريخ التكليف', _fmtDate(t.assignDate));
    html += ro('تاريخ الإنجاز', t.completionDate ? _fmtDate(t.completionDate) : null);
    html += ro('الأهمية',       t.importance);
    html += ro('الحالة',        `<span style="color:#0a5c56;font-weight:800">${t.status}</span>`);
    if (t.caseNumber) html += ro('رقم القضية', `${t.caseNumber} / ${t.caseYear||''}`);
    if (t.notes) html += `
        <div style="background:#fefce8;padding:10px;border-radius:10px;border:1px solid #fde68a;margin-bottom:8px">
            <span class="data-label" style="color:#92400e">ملاحظات</span>
            <p class="data-val" style="color:#1e293b">${t.notes}</p>
        </div>`;

    html += `<div style="margin-top:14px;padding-top:12px;border-top:1px solid #f1f5f9;display:flex;flex-wrap:wrap;gap:8px">`;

    if (isApproved) {
        html += `
        <div style="width:100%;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:12px 16px;display:flex;align-items:center;gap:10px">
            <i data-lucide="lock" style="width:20px;height:20px;color:#15803d;flex-shrink:0"></i>
            <div>
                <p style="font-weight:800;color:#15803d;font-size:0.9rem;margin:0">تم اعتماد وأرشفة هذا الموضوع</p>
                <p style="font-size:0.75rem;color:#4ade80;margin:2px 0 0;font-weight:600">لا يمكن التعديل أو الوصول للملفات</p>
            </div>
        </div>`;
    } else {
        if (hasWord && isPending)
            html += `<a href="${t.reviewFile}" target="_blank" class="iag-btn iag-btn-word" style="flex:unset;padding:8px 16px">
                <i data-lucide="file-edit" style="width:16px;height:16px"></i> فتح للتعديل
            </a>`;
        else if (hasWord)
            html += `<a href="${t.reviewFile}" target="_blank" class="iag-btn iag-btn-details" style="flex:unset;padding:8px 16px">
                <i data-lucide="file-text" style="width:16px;height:16px"></i> ملف المراجعة
            </a>`;
        if (hasAtt)
            html += `<a href="${t.attachment}" target="_blank" class="iag-btn" style="flex:unset;padding:8px 16px;color:#2563eb;border-color:#bfdbfe;background:#eff6ff">
                <i data-lucide="paperclip" style="width:16px;height:16px"></i> مرفق الوارد
            </a>`;
        if (hasArch)
            html += `<a href="${t.archive}" target="_blank" class="iag-btn" style="flex:unset;padding:8px 16px;color:#047857;border-color:#a7f3d0;background:#f0fdf4">
                <i data-lucide="archive" style="width:16px;height:16px"></i> الصادر النهائي
            </a>`;
        if (!hasWord && !hasAtt && !hasArch)
            html += `<span style="font-size:0.8rem;color:#94a3b8;font-weight:600">لا توجد ملفات مرتبطة بعد</span>`;
    }

    html += `</div>`;

    document.getElementById('m-content').innerHTML = html;
    document.getElementById('detail-modal').classList.add('open');
    lucide.createIcons();
}

function closeModal() { document.getElementById('detail-modal').classList.remove('open'); }
function toggleMenu() {
    document.getElementById('side-menu').classList.toggle('open');
    document.getElementById('menu-overlay').classList.toggle('open');
}
function closeMenu() {
    document.getElementById('side-menu').classList.remove('open');
    document.getElementById('menu-overlay').classList.remove('open');
}
function logout() { localStorage.removeItem('iag_user'); localStorage.removeItem('iag_last_page'); window.location.href = 'index.html'; }

function showEmpty(msg) {
    document.getElementById('tasks-list').innerHTML =
        `<div class="empty-box"><i data-lucide="alert-circle" style="width:30px;height:30px;color:#e2e8f0;display:block;margin:0 auto 8px"></i><p style="font-weight:700">${msg}</p></div>`;
    lucide.createIcons();
}

function _hasVal(v) { return v && v.toString().trim() !== '' && v.toString().trim() !== 'undefined'; }

function _parseDateISO(d) {
    if (!d) return null;
    if (/^\d{4}-\d{2}-\d{2}$/.test(d)) return d;
    const p = d.split('/');
    return p.length === 3 ? `${p[2]}-${p[1].padStart(2,'0')}-${p[0].padStart(2,'0')}` : null;
}

function _fmtDate(d) {
    if (!d) return '-';
    const p = d.split('/');
    if (p.length !== 3) return d;
    return new Date(p[2], p[1]-1, p[0]).toLocaleDateString('ar-EG', { day:'numeric', month:'long', year:'numeric' });
}

function _fmtSize(bytes) {
    if (!bytes || bytes === 0) return '';
    if (bytes < 1024)       return bytes + ' B';
    if (bytes < 1024*1024)  return (bytes/1024).toFixed(0) + ' KB';
    return (bytes/1024/1024).toFixed(1) + ' MB';
}
