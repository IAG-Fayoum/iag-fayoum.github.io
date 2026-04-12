// notifications.js — الإشعارات / IAG System

lucide.createIcons();

let allNotifications = [];
let currentFilter = 'all';
let currentUser = null;

document.addEventListener('DOMContentLoaded', async () => {
    const userStr = localStorage.getItem('iag_user');
    if (!userStr) { window.location.href = 'index.html'; return; }

    currentUser = JSON.parse(userStr);
    document.getElementById('menu-user').textContent = currentUser.name;
    document.getElementById('menu-role').textContent = currentUser.role;

    await loadNotifications();
});

function toggleMenu() {
    document.getElementById('side-menu').classList.toggle('open');
    document.getElementById('menu-overlay').classList.toggle('open');
}

function closeMenu() {
    document.getElementById('side-menu').classList.remove('open');
    document.getElementById('menu-overlay').classList.remove('open');
}

function logout() { localStorage.clear(); window.location.href = 'index.html'; }

function goBack() {
    if (history.length > 1) { history.back(); }
    else {
        const u = JSON.parse(localStorage.getItem('iag_user') || '{}');
        if (u.role === 'مدير' || u.role === 'Admin') window.location.href = 'admin.html';
        else if (u.role === 'منسق') window.location.href = 'coordinator.html';
        else window.location.href = 'employee.html';
    }
}

// --- Real API Actions ---

async function loadNotifications() {
    const container = document.getElementById('notifs-list');
    try {
        const res = await fetch(CONFIG.API_URL, {
            method: 'POST',
            body: JSON.stringify({
                action: 'getNotifications',
                name: currentUser.name,
                role: currentUser.role
            })
        });

        const data = await res.json();

        if (data.success) {
            allNotifications = data.notifications || [];
            updateStats();
            renderNotifications();
        } else {
            container.innerHTML = '<div class="loader-box">فشل تحميل الإشعارات</div>';
        }

    } catch (e) {
        container.innerHTML = '<div class="loader-box text-error">خطأ في الاتصال</div>';
    }
}

function updateStats() {
    const total  = allNotifications.length;
    const unread = allNotifications.filter(n => !n.read).length;

    document.getElementById('total-notifs').textContent  = total;
    document.getElementById('unread-notifs').textContent = unread;

    document.getElementById('count-all').textContent    = total;
    document.getElementById('count-unread').textContent = unread;
    document.getElementById('count-read').textContent   = total - unread;
}

function filterNotifs(filter) {
    currentFilter = filter;
    document.querySelectorAll('.filter-tab').forEach(el => el.classList.remove('active'));
    document.querySelector(`[data-filter="${filter}"]`).classList.add('active');
    renderNotifications();
}

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
    container.innerHTML = filtered.map(n => createCard(n)).join('');
    lucide.createIcons();
}

function createCard(n) {
    const type = n.type || 'info';
    const style = {
        info:    { bg: 'icon-bg-blue',   icon: 'info',           text: 'icon-clr-blue',   badge: 'badge-info' },
        warning: { bg: 'icon-bg-orange', icon: 'alert-triangle', text: 'icon-clr-orange', badge: 'badge-warning' },
        urgent:  { bg: 'icon-bg-red',    icon: 'alert-circle',   text: 'icon-clr-red',    badge: 'badge-urgent' },
        success: { bg: 'icon-bg-green',  icon: 'check-circle',   text: 'icon-clr-green',  badge: 'badge-success' }
    }[type] || { bg: 'icon-bg-gray', icon: 'bell', text: 'icon-clr-gray', badge: '' };

    return `
    <div class="notif-card ${!n.read ? 'unread' : ''}" onclick="openNotification('${n.id}')">
        <div class="notif-indicator"></div>
        <div class="notif-icon-wrapper ${style.bg}"><i data-lucide="${style.icon}" style="width:24px;height:24px" class="${style.text}"></i></div>
        <div class="notif-content">
            <div class="notif-header">
                <h4 class="notif-title">${n.title || 'إشعار جديد'}</h4>
                <span class="notif-badge ${style.badge}">${(n.type || 'عام').toUpperCase()}</span>
            </div>
            <p class="notif-message">${n.message}</p>
            <div class="notif-footer">
                <span class="notif-time"><i data-lucide="clock" style="width:12px;height:12px"></i> ${n.date || '-'}</span>
            </div>
        </div>
        <button onclick="deleteNotification(event, '${n.id}')" class="notif-delete"><i data-lucide="x" style="width:16px;height:16px"></i></button>
    </div>`;
}

function openNotification(id) {
    const n = allNotifications.find(x => x.id == id);
    if (!n) return;

    if (!n.read) {
        fetch(CONFIG.API_URL, {
            method: 'POST',
            body: JSON.stringify({ action: 'markAsRead', notifId: id })
        });
        n.read = true;
        updateStats();
        renderNotifications();
    }

    document.getElementById('modal-content').innerHTML = `
        <div class="modal-notif-header">
            <h3 class="modal-notif-title">${n.title}</h3>
            <p class="modal-notif-date">${n.date}</p>
        </div>
        <div class="modal-notif-body">${n.message}</div>
    `;
    document.getElementById('notif-modal').classList.add('open');
}

function closeNotifModal() { document.getElementById('notif-modal').classList.remove('open'); }

async function deleteNotification(e, id) {
    e.stopPropagation();
    if (confirm('حذف الإشعار؟')) {
        try {
            await fetch(CONFIG.API_URL, {
                method: 'POST',
                body: JSON.stringify({ action: 'deleteNotification', notifId: id })
            });
            allNotifications = allNotifications.filter(n => n.id != id);
            updateStats();
            renderNotifications();
        } catch (err) { alert('فشل الحذف'); }
    }
}

async function markAllAsRead() {
    try {
        await fetch(CONFIG.API_URL, {
            method: 'POST',
            body: JSON.stringify({ action: 'markAllRead', name: currentUser.name })
        });
        allNotifications.forEach(n => n.read = true);
        updateStats();
        renderNotifications();
    } catch (err) { alert('حدث خطأ'); }
}

async function clearAllNotifications() {
    if (confirm('هل أنت متأكد من حذف جميع الإشعارات؟')) {
        try {
            await fetch(CONFIG.API_URL, {
                method: 'POST',
                body: JSON.stringify({ action: 'deleteAllNotifications', name: currentUser.name })
            });
            allNotifications = [];
            updateStats();
            renderNotifications();
        } catch (err) { alert('حدث خطأ أثناء الحذف'); }
    }
}
