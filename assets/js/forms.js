/**
 * forms.js — النماذج / IAG System
 *
 * Sprint 3 Block B: migrated to core layer.
 * - Session: IAGSession (no direct localStorage)
 * - forms.html is public (no requireAuth); guests may view forms.
 */

lucide.createIcons();

document.addEventListener('DOMContentLoaded', () => {
    const user = IAGSession.getUser();

    if (user) {
        // مستخدم مسجل
        document.getElementById('menu-user').textContent = user.name;
        document.getElementById('menu-role').textContent = user.role;
        document.getElementById('header-notif-btn').classList.remove('hidden');

        const authBtn = document.getElementById('auth-btn');
        authBtn.innerHTML = '<i data-lucide="log-out" class="icon-sm"></i> تسجيل خروج';
        authBtn.classList.add('btn-logout-danger');
        authBtn.onclick = () => IAGSession.logout();

        lucide.createIcons();
    } else {
        // زائر (Guest)
        document.getElementById('float-login-btn').classList.remove('hidden');
    }
});

function toggleMenu() {
    document.getElementById('side-menu').classList.toggle('open');
    document.getElementById('menu-overlay').classList.toggle('open');
}

function closeMenu() {
    document.getElementById('side-menu').classList.remove('open');
    document.getElementById('menu-overlay').classList.remove('open');
}

function handleAuthAction() {
    window.location.href = 'index.html';
}
