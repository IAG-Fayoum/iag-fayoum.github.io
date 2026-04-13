/**
 * settings.js — إجراءات / IAG System
 *
 * Sprint 2 Block A: fully migrated to core layer.
 * - Session: IAGSession (no direct localStorage)
 * - API:     IAGApi    (no direct fetch)
 * - UI:      IAGFeedback (no alert/confirm)
 */

lucide.createIcons();

let currentUser = null;

document.addEventListener('DOMContentLoaded', () => {
    currentUser = IAGSession.requireAuth();

    if (currentUser.role !== 'مدير' && currentUser.role !== 'Admin' && currentUser.role !== 'منسق') {
        IAGFeedback.showError('عفواً، هذه الصفحة للمدراء والمنسقين فقط');
        setTimeout(() => { window.location.href = 'index.html'; }, 1500);
        return;
    }

    document.getElementById('menu-user').textContent = currentUser.name;
    document.getElementById('menu-role').textContent = currentUser.role;
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

// ── Actions ───────────────────────────────────────────────────────────────────

async function handleReassign() {
    const taskId = document.getElementById('reassign-id').value.trim();
    const newEmp = document.getElementById('reassign-name').value.trim();
    const btn    = document.getElementById('btn-reassign');

    if (!taskId || !newEmp) { IAGFeedback.showError('يرجى ملء جميع الحقول'); return; }

    const originalHTML = btn.innerHTML;
    btn.innerHTML = '<span>جاري التنفيذ...</span>';
    btn.disabled = true;

    const { ok, error } = await IAGApi.reassignTask(taskId, newEmp, currentUser.name);

    btn.innerHTML = originalHTML;
    btn.disabled = false;
    lucide.createIcons();

    if (ok) {
        IAGFeedback.showSuccess('تم نقل المهمة بنجاح');
        document.getElementById('reassign-id').value   = '';
        document.getElementById('reassign-name').value = '';
    } else {
        IAGFeedback.showError(error || 'لم يتم التعديل');
    }
}

async function handleStatus() {
    const taskId    = document.getElementById('status-id').value.trim();
    const newStatus = document.getElementById('status-val').value;
    const btn       = document.getElementById('btn-status');

    if (!taskId) { IAGFeedback.showError('يرجى إدخال رقم المهمة'); return; }

    const originalHTML = btn.innerHTML;
    btn.innerHTML = '<span>جاري الحفظ...</span>';
    btn.disabled = true;

    const { ok, error } = await IAGApi.updateStatus(taskId, newStatus, currentUser.name);

    btn.innerHTML = originalHTML;
    btn.disabled = false;
    lucide.createIcons();

    if (ok) {
        IAGFeedback.showSuccess('تم تحديث الحالة بنجاح');
        document.getElementById('status-id').value = '';
    } else {
        IAGFeedback.showError(error || 'لم يتم التعديل');
    }
}
