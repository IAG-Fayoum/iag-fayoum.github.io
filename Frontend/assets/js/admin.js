/**
 * admin.js — لوحة التحكم / IAG System
 *
 * Sprint 2 Block A: fully migrated to core layer.
 * - Session: IAGSession (no direct localStorage)
 * - API:     IAGApi    (no direct fetch)
 * - UI:      IAGFeedback (no alert/confirm)
 */

lucide.createIcons();

let allTasks     = [];
let allEmployees = [];
let currentUser  = null;

// ── Init ──────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', async () => {
    currentUser = IAGSession.requireAuth();

    if (currentUser.role !== 'مدير' && currentUser.role !== 'Admin') {
        IAGFeedback.showError('غير مصرح لك بالدخول لهذه الصفحة');
        setTimeout(() => { window.location.href = 'index.html'; }, 1500);
        return;
    }

    document.getElementById('menu-user').textContent = currentUser.name;

    await loadData();
});

// ── Navigation ────────────────────────────────────────────────────────────────

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

// ── Modal helpers ─────────────────────────────────────────────────────────────

function openModal(id) {
    document.getElementById('modal-' + id).classList.add('open');
}

function closeModal(id) {
    document.getElementById(id).classList.remove('open');
}

// ── Data Loading ──────────────────────────────────────────────────────────────

async function loadData() {
    IAGFeedback.showLoading('جاري تحميل البيانات...');
    const { ok, data, error } = await IAGApi.getAllData(currentUser.name);
    IAGFeedback.hideLoading();

    if (!ok) {
        document.getElementById('tasks-tbody').innerHTML =
            `<tr><td colspan="7" class="loader-box text-error">${error || 'فشل تحميل البيانات'}</td></tr>`;
        IAGFeedback.showError(error || 'فشل تحميل البيانات');
        return;
    }

    allTasks     = data.tasks     || [];
    allEmployees = (data.stats && data.stats.employees) || [];

    updateStats(data.stats && data.stats.totals);
    populateTable(allTasks);
    populateDropdowns();
}

// ── Stats ─────────────────────────────────────────────────────────────────────

function updateStats(s) {
    if (!s) return;
    document.getElementById('s-total').textContent    = s.total    ?? 0;
    document.getElementById('s-late').textContent     = s.overdue  ?? 0;
    document.getElementById('s-new').textContent      = s.new      ?? 0;
    document.getElementById('s-pending').textContent  = s.pending  ?? 0;
    document.getElementById('s-done').textContent     = s.completed ?? 0;
    document.getElementById('s-followup').textContent = s.followup ?? 0;
}

// ── Table ─────────────────────────────────────────────────────────────────────

const STATUS_CLASS = {
    'جديد':                    'badge-info',
    'بانتظار الاعتماد':        'badge-warning',
    'تم الاعتماد والأرشفة':   'badge-success',
    'متأخر':                   'badge-urgent',
    'بحاجة الي متابعة':        'badge-followup',
};

function populateTable(tasks) {
    const tbody = document.getElementById('tasks-tbody');
    if (!tasks.length) {
        tbody.innerHTML = '<tr><td colspan="7" class="loader-box">لا توجد بيانات</td></tr>';
        return;
    }
    tbody.innerHTML = tasks.map(t => {
        const cls = STATUS_CLASS[t.status] || 'badge-info';
        return `
        <tr>
            <td><span class="table-id">#${t.id}</span></td>
            <td><span class="table-subject">${t.subject || '—'}</span></td>
            <td>${t.source || '—'}</td>
            <td><span class="table-assignee">${t.assignee || '—'}</span></td>
            <td><span class="badge ${cls}">${t.status}</span></td>
            <td>${t.date || '—'}</td>
            <td class="text-center">
                <button class="btn-icon-sm" onclick="openEditModal('${t.id}')" title="تعديل">
                    <i data-lucide="edit-3" class="icon-sm"></i>
                </button>
            </td>
        </tr>`;
    }).join('');
    lucide.createIcons();
}

// ── Dropdowns ─────────────────────────────────────────────────────────────────

function populateDropdowns() {
    const emailSel = document.getElementById('email-to');
    const notifSel = document.getElementById('notif-to');

    emailSel.innerHTML = '<option value="">اختر الموظف...</option>';
    notifSel.innerHTML = '<option value="all">الجميع</option>';

    allEmployees.forEach(e => {
        const opt1 = document.createElement('option');
        opt1.value = opt1.textContent = e.name;
        emailSel.appendChild(opt1);

        const opt2 = document.createElement('option');
        opt2.value = opt2.textContent = e.name;
        notifSel.appendChild(opt2);
    });
}

// ── Quick Edit (open updateStatus modal pre-filled) ───────────────────────────

function openEditModal(taskId) {
    document.getElementById('upd-task-id').value = taskId;
    openModal('updateStatus');
}

// ── Actions ───────────────────────────────────────────────────────────────────

async function confirmUpdate() {
    const taskId = document.getElementById('upd-task-id').value.trim();
    const status = document.getElementById('upd-status').value;
    const notes  = document.getElementById('upd-notes').value.trim();
    const btn    = document.getElementById('btn-confirm-update');

    if (!taskId) { IAGFeedback.showError('رقم المعاملة مطلوب'); return; }

    btn.textContent = 'جاري الحفظ...'; btn.disabled = true;
    const { ok, error } = await IAGApi.adminUpdateStatus(taskId, status, notes, currentUser.name);
    btn.textContent = 'حفظ التحديث'; btn.disabled = false;

    if (ok) {
        IAGFeedback.showSuccess('تم تحديث الحالة بنجاح');
        closeModal('modal-updateStatus');
        document.getElementById('upd-task-id').value = '';
        document.getElementById('upd-notes').value   = '';
        await loadData();
    } else {
        IAGFeedback.showError(error || 'فشل تحديث الحالة');
    }
}

async function sendEmail() {
    const to      = document.getElementById('email-to').value;
    const subject = document.getElementById('email-subject').value.trim();
    const body    = document.getElementById('email-body').value.trim();
    const btn     = document.getElementById('btn-send-email');

    if (!to || !subject) { IAGFeedback.showError('يرجى تحديد الموظف والموضوع'); return; }

    btn.textContent = 'جاري الإرسال...'; btn.disabled = true;
    const { ok, error } = await IAGApi.sendCustomEmail(to, subject, body);
    btn.textContent = 'إرسال'; btn.disabled = false;

    if (ok) {
        IAGFeedback.showSuccess('تم إرسال البريد بنجاح');
        closeModal('modal-sendEmail');
        document.getElementById('email-subject').value = '';
        document.getElementById('email-body').value    = '';
    } else {
        IAGFeedback.showError(error || 'فشل إرسال البريد');
    }
}

async function sendNotification() {
    const to  = document.getElementById('notif-to').value;
    const msg = document.getElementById('notif-msg').value.trim();
    const btn = document.getElementById('btn-broadcast');

    if (!msg) { IAGFeedback.showError('يرجى كتابة نص الإشعار'); return; }

    btn.textContent = 'جاري البث...'; btn.disabled = true;
    const { ok, error } = await IAGApi.broadcastNotification(to, msg);
    btn.textContent = 'بث الإشعار'; btn.disabled = false;

    if (ok) {
        IAGFeedback.showSuccess('تم بث الإشعار بنجاح');
        closeModal('modal-sendNotification');
        document.getElementById('notif-msg').value = '';
    } else {
        IAGFeedback.showError(error || 'فشل بث الإشعار');
    }
}

// ── Export CSV ────────────────────────────────────────────────────────────────

function exportData() {
    if (!allTasks.length) { IAGFeedback.showError('لا توجد بيانات للتصدير'); return; }

    const headers = ['#', 'الموضوع', 'الجهة', 'الموظف', 'الحالة', 'التاريخ'];
    const rows = allTasks.map(t =>
        [t.id, t.subject, t.source, t.assignee, t.status, t.date]
            .map(v => `"${(v || '').toString().replace(/"/g, '""')}"`)
            .join(',')
    );

    const csv  = '\uFEFF' + [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = 'tasks_export.csv';
    document.body.appendChild(a); a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    IAGFeedback.showSuccess('تم تصدير البيانات');
}
