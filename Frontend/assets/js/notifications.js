/**
 * notifications.js — الإشعارات / IAG System
 *
 * Sprint 2 Mini-Pilot: fully migrated to core layer.
 * - Session: IAGSession (no direct localStorage)
 * - API:     IAGApi    (no direct fetch)
 * - UI:      IAGFeedback (no alert/confirm)
 */

lucide.createIcons();

let allNotifications = [];
let currentFilter    = 'all';
let currentUser      = null;

document.addEventListener('DOMContentLoaded', async () => {
    currentUser = IAGSession.requireAuth();

    await loadNotifications();
});

// ── Navigation helpers ────────────────────────────────────────────────────────

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

function goBack() {
    if (history.length > 1) {
        history.back();
        return;
    }
    const role = currentUser ? currentUser.role : '';
    if (role === 'مدير' || role === 'Admin') window.location.href = 'admin.html';
    else if (role === 'منسق')               window.location.href = 'coordinator.html';
    else                                     window.location.href = 'employee.html';
}

// ── Data Loading ──────────────────────────────────────────────────────────────

async function loadNotifications() {
    IAGFeedback.showLoading('جاري تحميل الإشعارات...');
    const { ok, data, error } = await IAGApi.getNotifications(currentUser.name);
    IAGFeedback.hideLoading();

    if (!ok) {
        document.getElementById('notifs-list').innerHTML =
            '<div class="loader-box text-error">فشل تحميل الإشعارات</div>';
        IAGFeedback.showError(error || 'فشل تحميل الإشعارات');
        return;
    }

    allNotifications = (data && data.notifications) || [];
    updateStats();
    renderNotifications();
}

// ── Stats & Filters ───────────────────────────────────────────────────────────

function updateStats() {
    const total  = allNotifications.length;
    const unread = allNotifications.filter(n => !n.read).length;

    document.getElementById('total-notifs').textContent  = total;
    document.getElementById('unread-notifs').textContent = unread;
    document.getElementById('count-all').textContent     = total;
    document.getElementById('count-unread').textContent  = unread;
    document.getElementById('count-read').textContent    = total - unread;
}

function filterNotifs(filter) {
    currentFilter = filter;
    document.querySelectorAll('.filter-tab').forEach(el => el.classList.remove('active'));
    document.querySelector(`[data-filter="${filter}"]`).classList.add('active');
    renderNotifications();
}

// ── Rendering ─────────────────────────────────────────────────────────────────

function renderNotifications() {
    const container = document.getElementById('notifs-list');
    let filtered = allNotifications;

    if (currentFilter === 'unread') filtered = filtered.filter(n => !n.read);
    else if (currentFilter === 'read') filtered = filtered.filter(n => n.read);

    if (filtered.length === 0) {
        container.innerHTML = '';
        document.getElementById('empty-state').classList.remove('hidden');
        return;
    }

    document.getElementById('empty-state').classList.add('hidden');
    container.innerHTML = filtered.map(createCard).join('');
    lucide.createIcons();
}

function createCard(n) {
    const type  = n.type || 'info';
    const style = {
        info:    { bg: 'icon-bg-blue',   icon: 'info',           clr: 'icon-clr-blue',   badge: 'badge-info' },
        warning: { bg: 'icon-bg-orange', icon: 'alert-triangle', clr: 'icon-clr-orange', badge: 'badge-warning' },
        urgent:  { bg: 'icon-bg-red',    icon: 'alert-circle',   clr: 'icon-clr-red',    badge: 'badge-urgent' },
        success: { bg: 'icon-bg-green',  icon: 'check-circle',   clr: 'icon-clr-green',  badge: 'badge-success' },
    }[type] || { bg: 'icon-bg-gray', icon: 'bell', clr: 'icon-clr-gray', badge: '' };

    return `
    <div class="notif-card ${!n.read ? 'unread' : ''}" onclick="openNotification('${n.id}')">
        <div class="notif-indicator"></div>
        <div class="notif-icon-wrapper ${style.bg}">
            <i data-lucide="${style.icon}" class="icon-md ${style.clr}"></i>
        </div>
        <div class="notif-content">
            <div class="notif-header">
                <h4 class="notif-title">${n.title || 'إشعار جديد'}</h4>
                <span class="notif-badge ${style.badge}">${(n.type || 'عام').toUpperCase()}</span>
            </div>
            <p class="notif-message">${n.message}</p>
            <div class="notif-footer">
                <span class="notif-time">
                    <i data-lucide="clock" class="icon-xs"></i>
                    ${n.date || '-'}
                </span>
            </div>
        </div>
        <button onclick="deleteNotification(event, '${n.id}')" class="notif-delete" aria-label="حذف الإشعار">
            <i data-lucide="x" class="icon-sm"></i>
        </button>
    </div>`;
}

// ── Notification Actions ──────────────────────────────────────────────────────

function openNotification(id) {
    const n = allNotifications.find(x => x.id == id);
    if (!n) return;

    if (!n.read) {
        IAGApi.markAsRead(id); // fire-and-forget — optimistic update
        n.read = true;
        updateStats();
        renderNotifications();
    }

    document.getElementById('modal-content').innerHTML = `
        <div class="modal-notif-header">
            <h3 class="modal-notif-title">${n.title}</h3>
            <p class="modal-notif-date">${n.date}</p>
        </div>
        <div class="modal-notif-body">${n.message}</div>`;
    document.getElementById('notif-modal').classList.add('open');
}

function closeNotifModal() {
    document.getElementById('notif-modal').classList.remove('open');
}

async function deleteNotification(e, id) {
    e.stopPropagation();
    const { ok, error } = await IAGApi.deleteNotification(id);
    if (!ok) {
        IAGFeedback.showError(error || 'فشل حذف الإشعار');
        return;
    }
    allNotifications = allNotifications.filter(n => n.id != id);
    updateStats();
    renderNotifications();
    IAGFeedback.showSuccess('تم حذف الإشعار');
}

async function markAllAsRead() {
    IAGFeedback.showLoading('جاري التحديث...');
    const { ok, error } = await IAGApi.markAllRead(currentUser.name);
    IAGFeedback.hideLoading();
    if (!ok) { IAGFeedback.showError(error || 'حدث خطأ'); return; }
    allNotifications.forEach(n => n.read = true);
    updateStats();
    renderNotifications();
    IAGFeedback.showSuccess('تم تحديد الكل كمقروء');
}

async function clearAllNotifications() {
    IAGFeedback.showLoading('جاري الحذف...');
    const { ok, error } = await IAGApi.deleteAllNotifications(currentUser.name);
    IAGFeedback.hideLoading();
    if (!ok) { IAGFeedback.showError(error || 'حدث خطأ أثناء الحذف'); return; }
    allNotifications = [];
    updateStats();
    renderNotifications();
    IAGFeedback.showSuccess('تم حذف جميع الإشعارات');
}
