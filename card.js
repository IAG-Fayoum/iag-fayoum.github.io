/* ═══════════════════════════════════════════════════════
IAG SYSTEM — card.js
الدالة الموحدة لتوليد الكارت
الاستخدام:  container.innerHTML = tasks.map(t => renderCard(t, currentRole)).join(’’);
الأدوار:    ‘مدير’ | ‘منسق’ | ‘موظف’
═══════════════════════════════════════════════════════ */

/* ── ثوابت الجهات القانونية ── */
const CARD_CASE_ENTITIES = [‘النيابة الإدارية’,‘نيابة’,‘الشؤون القانونية’,‘شئون قانونية’,‘ش.ق’,‘ش ق’];

/* ════════════════════════════════════════
renderCard — الدالة الرئيسية
════════════════════════════════════════ */
function renderCard(t, role) {
const isCoord   = (role === ‘مدير’ || role === ‘منسق’);
const isEmployee= (role === ‘موظف’);

```
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

/* ── CSS class الحالة ── */
let sClass = 's-new';
if      (isLate)      sClass = 's-late';
else if (isPending)   sClass = 's-pending';
else if (isApproved)  sClass = 's-approved';
else if (status.includes('متابعة')) sClass = 's-followup';

/* ── status pill ── */
let spClass = 'sp-new';
if      (isLate)      spClass = 'sp-late';
else if (isPending)   spClass = 'sp-pending';
else if (isApproved)  spClass = 'sp-approved';
else if (status.includes('متابعة')) spClass = 'sp-followup';

/* ── type pill ── */
let typeTxt = '📥 وارد', tpClass = 'tp-in';
if      (isOut) { typeTxt = '📤 صادر'; tpClass = 'tp-out'; }
else if (isCmp) { typeTxt = '📣 شكوى'; tpClass = 'tp-cmp'; }
else if (isMro) { typeTxt = '🔍 مرور'; tpClass = 'tp-mro'; }

/* ── الأهمية ── */
let impHtml = '';
if (t.importance) {
    const ic = t.importance === 'عاجل جداً' ? 'imp-high'
             : t.importance === 'عاجل'       ? 'imp-medium' : 'imp-normal';
    const ie = t.importance === 'عاجل جداً' ? '🔴'
             : t.importance === 'عاجل'       ? '🟠' : '🟢';
    impHtml = `<span class="iag-imp ${ic}">${ie} ${t.importance}</span>`;
}

/* ── القضية ── */
let caseHtml = '';
if (isCaseEnt && _hasVal(t.caseNumber)) {
    caseHtml = `<span class="iag-case">⚖️ قضية ${t.caseNumber}/${t.caseYear||''}</span>`;
}

/* ── المنسق: النواقص ── */
const missing = isCoord ? _getMissing(t, isOut, isCaseEnt, isApproved) : [];

/* ══ المرفقات ══ */
let attRow = _buildAttachments(t, isCoord, isEmployee, isOut, isApproved, isPending,
                               hasAttach, hasReview, hasArchive);

/* ══ الـ Footer ══ */
let footer = '';
if (isCoord) {
    footer = _coordFooter(t, missing, hasReview, hasArchive, isApproved, isPending);
} else {
    footer = _empFooter(t, hasReview, isPending, isApproved);
}

/* ══ الحقل القابل للتعديل للمنسق ══ */
let editSection = '';
if (isCoord && missing.length > 0) {
    editSection = _buildEditFields(t, missing, isCaseEnt);
}

return `
```

<div class="iag-card ${sClass}" data-id="${t.id}">

```
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
            : `<span style="color:#0f766e;font-weight:700">${t.assignee || '-'}</span>`
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
```

</div>`;
}

/* ════════════════════════════════════════
دوال مساعدة داخلية
════════════════════════════════════════ */

function _hasVal(v) {
return v && v.toString().trim() !== ‘’ && v.toString().trim() !== ‘undefined’;
}

function _getMissing(t, isOut, isCaseEnt, isApproved) {
const m = [];
if (!t.assignee || !t.assignee.trim()) m.push(‘assignee’);
if (isCaseEnt && !_hasVal(t.caseNumber))  m.push(‘case’);
if (isApproved && !_hasVal(t.archive))     m.push(‘archive’);
if (!isOut && !_hasVal(t.attachment))      m.push(‘attachment’);
return m;
}

function _buildAttachments(t, isCoord, isEmployee, isOut, isApproved, isPending,
hasAttach, hasReview, hasArchive) {
let pills = [];

```
/* الموظف + معتمد → لا روابط، الموضوع مغلق */
if (isEmployee && isApproved) {
    return `<div class="iag-attachments">
        <span class="iag-att" style="background:#f0fdf4;color:#047857;border-color:#a7f3d0;font-weight:700;gap:5px">
            ✅ تم الاعتماد والأرشفة
        </span>
    </div>`;
}

/* 📥 مرفق الوارد */
if (hasAttach) {
    pills.push(`<a href="${t.attachment}" target="_blank" class="iag-att att-has">📥 مرفق الوارد</a>`);
} else if (!isOut) {
    if (isCoord) {
        pills.push(`<button onclick="event.stopPropagation();iagOpenModal('${t.id}')" class="iag-att att-warn">⚠ مرفق الوارد ناقص</button>`);
    } else {
        pills.push(`<span class="iag-att att-none">📥 لا يوجد مرفق</span>`);
    }
}

/* 📄 ملف المراجعة */
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

/* 📎 الصادر النهائي */
if (hasArchive) {
    pills.push(`<a href="${t.archive}" target="_blank" class="iag-att att-has">📎 الصادر النهائي</a>`);
} else if (isApproved && isCoord) {
    pills.push(`<button onclick="event.stopPropagation();iagOpenArchiveUpload('${t.id}')" class="iag-att att-warn">⚠ الصادر ناقص</button>`);
} else {
    pills.push(`<span class="iag-att att-none">📎 الصادر</span>`);
}

return `<div class="iag-attachments">${pills.join('')}</div>`;
```

}

function _coordFooter(t, missing, hasReview, hasArchive, isApproved, isPending) {
return ` <button onclick="event.stopPropagation();iagOpenModal('${t.id}')" class="iag-btn iag-btn-manage"> ${_icon('edit')} إدارة ومعالجة </button>`;
}

function _empFooter(t, hasReview, isPending, isApproved) {
/* معتمد ومؤرشف → الموضوع مغلق، فقط زر التفاصيل */
if (isApproved) {
return ` <button onclick="event.stopPropagation();iagOpenModal('${t.id}')" class="iag-btn iag-btn-details"> ${_icon('eye')} التفاصيل </button> <span style="font-size:0.72rem;font-weight:700;color:#047857;display:flex;align-items:center;gap:4px;margin-right:auto"> ${_icon('lock')} مغلق </span>`;
}

```
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
```

}

function _assigneeCoord(t) {
if (t.assignee && t.assignee.trim()) {
return `<span style="color:#0f766e;font-weight:700;display:flex;align-items:center;gap:6px;flex-wrap:wrap"> ${t.assignee} <button onclick="event.stopPropagation();iagOpenReassign('${t.id}')" style="font-size:0.65rem;background:#f1f5f9;border:1px solid #e2e8f0;padding:2px 8px;border-radius:6px;cursor:pointer;color:#475569;font-family:'Cairo',sans-serif;font-weight:700"> تغيير </button> </span>`;
}
return `<span style="color:#dc2626;font-weight:700;display:flex;align-items:center;gap:6px"> ⚠ غير موزع <button onclick="event.stopPropagation();iagOpenReassign('${t.id}')" style="font-size:0.65rem;background:#fef2f2;border:1px solid #fecaca;padding:2px 8px;border-radius:6px;cursor:pointer;color:#dc2626;font-family:'Cairo',sans-serif;font-weight:700"> تعيين </button> </span>`;
}

function _buildEditFields(t, missing, isCaseEnt) {
let html = ‘’;
if (missing.includes(‘assignee’)) {
html += ` <div class="iag-row" style="flex-direction:column;align-items:flex-start;gap:4px"> <span style="font-size:0.7rem;color:#92400e;font-weight:700">⚠ الموظف المكلف ناقص</span> <div class="iag-edit-row"> <input class="iag-edit-input" id="edit-assignee-${t.id}" placeholder="اسم الموظف"> <button class="iag-edit-save" onclick="event.stopPropagation();iagSaveField('${t.id}','assignee',this)">حفظ</button> </div> </div>`;
}
if (missing.includes(‘case’) && isCaseEnt) {
html += ` <div class="iag-row" style="flex-direction:column;align-items:flex-start;gap:4px"> <span style="font-size:0.7rem;color:#92400e;font-weight:700">⚠ رقم القضية ناقص</span> <div class="iag-edit-row"> <input class="iag-edit-input" id="edit-caseNumber-${t.id}" placeholder="رقم القضية" style="max-width:110px"> <input class="iag-edit-input" id="edit-caseYear-${t.id}" placeholder="${new Date().getFullYear()}" style="max-width:80px"> <button class="iag-edit-save" onclick="event.stopPropagation();iagSaveCaseField('${t.id}',this)">حفظ</button> </div> </div>`;
}
return html;
}

function _icon(name) {
return `<i data-lucide="${name}" style="width:14px;height:14px;flex-shrink:0"></i>`;
}

function _fmtDate(d) {
if (!d) return ‘-’;
const p = d.split(’/’);
if (p.length !== 3) return d;
return new Date(p[2], p[1]-1, p[0])
.toLocaleDateString(‘ar-EG’, { day:‘numeric’, month:‘long’, year:‘numeric’ });
}

/* ════════════════════════════════════════
Hooks — يجب تعريفها في كل صفحة
تُستدعى من داخل الكارت
════════════════════════════════════════
iagOpenModal(id)          ← فتح modal التفاصيل
iagOpenReassign(id)       ← modal إعادة التكليف (منسق فقط)
iagOpenArchiveUpload(id)  ← رفع الصادر (منسق فقط)
iagSaveField(id, field, btn)     ← حفظ حقل ناقص
iagSaveCaseField(id, btn)        ← حفظ رقم القضية
════════════════════════════════════════ */