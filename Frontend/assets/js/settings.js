// settings.js — إجراءات / IAG System

lucide.createIcons();

document.addEventListener('DOMContentLoaded', () => {
    const userStr = localStorage.getItem('iag_user');
    if (!userStr) { window.location.href = 'index.html'; return; }

    const user = JSON.parse(userStr);
    document.getElementById('menu-user').textContent = user.name;
    document.getElementById('menu-role').textContent = user.role;

    // Security Check
    if (user.role !== 'مدير' && user.role !== 'Admin' && user.role !== 'منسق') {
        alert('عفواً، هذه الصفحة للمدراء والمنسقين فقط');
        window.location.href = 'index.html';
        return;
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

function logout() { localStorage.clear(); window.location.href = 'index.html'; }

// --- Real API Actions ---

async function handleReassign() {
    const taskId = document.getElementById('reassign-id').value;
    const newEmp = document.getElementById('reassign-name').value;
    const btn = document.getElementById('btn-reassign');

    if (!taskId || !newEmp) { alert('يرجى ملء جميع الحقول'); return; }

    const originalHTML = btn.innerHTML;
    btn.innerHTML = '<span class="loading-text">جاري التنفيذ...</span>';
    btn.disabled = true;

    try {
        const user = JSON.parse(localStorage.getItem('iag_user'));
        const res = await fetch(CONFIG.API_URL, {
            method: 'POST',
            body: JSON.stringify({
                action: 'reassignTask',
                taskId: taskId,
                newEmployee: newEmp,
                updatedBy: user.name
            })
        });
        const data = await res.json();

        if (data.success) {
            alert('✅ تم نقل المهمة بنجاح');
            document.getElementById('reassign-id').value = '';
            document.getElementById('reassign-name').value = '';
        } else {
            alert('❌ خطأ: ' + (data.error || 'لم يتم التعديل'));
        }
    } catch (e) {
        alert('❌ خطأ في الاتصال');
    } finally {
        btn.innerHTML = originalHTML;
        btn.disabled = false;
    }
}

async function handleStatus() {
    const taskId = document.getElementById('status-id').value;
    const newStatus = document.getElementById('status-val').value;
    const btn = document.getElementById('btn-status');

    if (!taskId) { alert('يرجى إدخال رقم المهمة'); return; }

    const originalHTML = btn.innerHTML;
    btn.innerHTML = '<span class="loading-text">جاري الحفظ...</span>';
    btn.disabled = true;

    try {
        const user = JSON.parse(localStorage.getItem('iag_user'));
        const res = await fetch(CONFIG.API_URL, {
            method: 'POST',
            body: JSON.stringify({
                action: 'updateStatus',
                taskId: taskId,
                newStatus: newStatus,
                updatedBy: user.name
            })
        });
        const data = await res.json();

        if (data.success) {
            alert('✅ تم تحديث الحالة بنجاح');
            document.getElementById('status-id').value = '';
        } else {
            alert('❌ خطأ: ' + (data.error || 'لم يتم التعديل'));
        }
    } catch (e) {
        alert('❌ خطأ في الاتصال');
    } finally {
        btn.innerHTML = originalHTML;
        btn.disabled = false;
    }
}
