lucide.createIcons();

document.addEventListener('DOMContentLoaded', () => {
    const userStr = localStorage.getItem('iag_user');

    if (userStr) {
        // --- مستخدم مسجل ---
        const user = JSON.parse(userStr);

        // 1. تحديث بيانات القائمة الجانبية
        document.getElementById('menu-user').textContent = user.name;
        document.getElementById('menu-role').textContent = user.role;

        // 2. إظهار زر الإشعارات
        document.getElementById('header-notif-btn').classList.remove('hidden');

        // 3. ضبط زر الخروج
        const authBtn = document.getElementById('auth-btn');
        authBtn.innerHTML = '<i data-lucide="log-out" style="width:16px;height:16px"></i> تسجيل خروج';
        authBtn.style.color = 'var(--danger)';
        authBtn.onclick = logout;

        lucide.createIcons();

    } else {
        // --- زائر (Guest) ---
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

function logout() {
    localStorage.removeItem('iag_user');
    localStorage.removeItem('iag_last_page');
    window.location.href = 'index.html';
}

function goBack() {
    const userStr = localStorage.getItem('iag_user');
    if (userStr) {
        const user = JSON.parse(userStr);
        if (user.role === 'مدير' || user.role === 'Admin') window.location.href = 'admin.html';
        else if (user.role === 'منسق') window.location.href = 'coordinator.html';
        else window.location.href = 'employee.html';
    } else {
        window.location.href = 'index.html';
    }
}
