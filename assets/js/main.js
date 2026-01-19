/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🏛️ نظام الحوكمة - المحرك الرئيسي (Master Controller)
 * الحالة: شامل (API + UI + Logic)
 * ═══════════════════════════════════════════════════════════════════════════
 */

// ✅ 1. إعدادات الاتصال (الرابط المحدث)
const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbzi68xXxFmLlTd-w0ADsf_A7S1100sYjfusWeZNGTyOf7_PlRhsPYTO6iCrTyj7mz996w/exec";

// 📦 2. متغيرات النظام
let allTasks = [];
let allReports = [];
let currentEmployee = null;

// ═══════════════════════════════════════════════════════════════════════════
// 🔌 3. دالة الاتصال (API Engine)
// ═══════════════════════════════════════════════════════════════════════════

async function apiCall(action, payload = {}) {
    toggleLoader(true);

    // نرسل البيانات كـ نص عادي لتجاوز حظر المتصفح (CORS Bypass)
    const formData = JSON.stringify({ action: action, ...payload });

    try {
        const response = await fetch(WEB_APP_URL, {
            method: "POST",
            redirect: "follow",
            headers: {
                "Content-Type": "text/plain;charset=utf-8", 
            },
            body: formData
        });

        if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);

        const text = await response.text();
        if (text.trim().startsWith("<")) throw new Error("خطأ في الرابط: تأكد من نشر السكريبت بصلاحية Anyone");
        
        const result = JSON.parse(text);
        toggleLoader(false);
        return result;

    } catch (error) {
        toggleLoader(false);
        console.error("🔥 Connection Failed:", error);
        alert(`⚠️ تعذر الاتصال بالسيرفر.\n${error.message}`);
        return { success: false, error: error.message };
    }
}

function toggleLoader(show) {
    const loader = document.getElementById('loader') || document.getElementById('admin-loader');
    if (loader) {
        if (show) loader.classList.remove('hidden-section');
        else loader.classList.add('hidden-section');
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// 🧭 4. التوجيه والتنقل (NAVIGATION)
// ═══════════════════════════════════════════════════════════════════════════

function exitSystem() {
    window.location.href = 'index.html';
}

function switchTab(tabName) {
    const tabs = ['dashboard', 'services', 'employees'];
    tabs.forEach(t => {
        const contentEl = document.getElementById('tab-' + t);
        const navBtn = document.getElementById('nav-' + t);
        const bottomBtn = document.getElementById('bottom-nav-' + t);
        
        if (contentEl) contentEl.classList.add('hidden-section');
        
        if (navBtn) {
            if (t === tabName) {
                navBtn.classList.add('sidebar-active');
                navBtn.classList.remove('sidebar-item');
            } else {
                navBtn.classList.remove('sidebar-active');
                navBtn.classList.add('sidebar-item');
            }
        }
        
        if (bottomBtn) {
            if (t === tabName) {
                bottomBtn.classList.add('active');
            } else {
                bottomBtn.classList.remove('active');
            }
        }
    });
    
    const targetEl = document.getElementById('tab-' + tabName);
    if (targetEl) {
        targetEl.classList.remove('hidden-section');
        // إذا كان التبويب هو الداشبورد (للمدير)، قم بتحديث البيانات
        if (tabName === 'dashboard' && typeof loadAdminDashboard === 'function') {
            loadAdminDashboard();
        }
    }
    
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

// ═══════════════════════════════════════════════════════════════════════════
// 🔐 5. تسجيل الدخول (AUTH)
// ═══════════════════════════════════════════════════════════════════════════

async function handleLogin() {
    const pinInput = document.getElementById('emp-pin-input');
    const errorMsg = document.getElementById('emp-error');
    if (!pinInput) return;

    const pin = pinInput.value.trim();
    if (pin.length < 4) {
        errorMsg.innerText = "أدخل الرمز كاملاً (4 أرقام)";
        errorMsg.classList.remove('hidden-section');
        return;
    }

    // طلب المصادقة
    const res = await apiCall('auth', { pin: pin });

    if (res.success) {
        currentEmployee = res.name;
        
        // تخزين البيانات
        if(res.tasks) allTasks = res.tasks;
        if(res.reports) allReports = res.reports;

        // تبديل الواجهة
        document.getElementById('emp-login-form').classList.add('hidden-section');
        document.getElementById('emp-profile-view').classList.remove('hidden-section');
        
        document.getElementById('profile-name').innerText = res.name;
        document.getElementById('profile-role').innerText = res.role;
        
        updateStats();
        switchMainTab('new');
    } else {
        errorMsg.innerText = `❌ ${res.error || "رمز غير صحيح"}`;
        errorMsg.classList.remove('hidden-section');
    }
}

function logout() {
    location.reload();
}

// ═══════════════════════════════════════════════════════════════════════════
// 👤 6. منطق واجهة الموظف (EMPLOYEE UI Logic)
// ═══════════════════════════════════════════════════════════════════════════

function updateStats() {
    const countNew = allTasks.filter(t => !t.status || t.status === 'جديد').length;
    const countProgress = allTasks.filter(t => t.status && (t.status.includes('جاري') || t.status.includes('قيد'))).length;
    const countLate = allTasks.filter(t => t.status && t.status.includes('متأخر')).length;
    const countDone = allTasks.filter(t => t.status && (t.status.includes('تم') || t.status.includes('منتهي'))).length;
  
    if(document.getElementById('stat-new')) document.getElementById('stat-new').innerText = countNew;
    if(document.getElementById('stat-progress')) document.getElementById('stat-progress').innerText = countProgress;
    if(document.getElementById('stat-late')) document.getElementById('stat-late').innerText = countLate;
    if(document.getElementById('stat-done')) document.getElementById('stat-done').innerText = countDone;
}

function switchMainTab(tabName) {
    ['new', 'progress', 'late', 'history'].forEach(t => {
        const btn = document.getElementById('main-tab-' + t); // تم التعديل ليطابق employee.html
        const content = document.getElementById('content-' + t); // حاويات المحتوى (اختياري حسب تصميمك)
        const container = document.getElementById('tasks-container');
        const archive = document.getElementById('archive-container');
        
        // تحديث الأزرار
        if(btn) {
             if (t === tabName) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        }

        // منطق التبديل الأساسي
        if (tabName === 'history') {
            if(container) container.classList.add('hidden-section');
            if(archive) archive.classList.remove('hidden-section');
            applyHistoryFilter(); 
        } else {
            if(container) container.classList.remove('hidden-section');
            if(archive) archive.classList.add('hidden-section');
            
            if (t === 'new') renderTaskCards('new');
            else if (t === 'progress') renderTaskCards('progress');
            else if (t === 'late') renderOverdueTable();
        }
    });
    
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

function renderTaskCards(category) {
    const container = document.getElementById('tasks-container');
    if(!container) return; // حماية
    container.innerHTML = '';
    
    let filtered = [];
    if (category === 'new') {
        filtered = allTasks.filter(t => !t.status || t.status === 'جديد' || t.status === '');
    } else if (category === 'progress') {
        filtered = allTasks.filter(t => t.status && (t.status.includes('جاري') || t.status.includes('قيد')));
    }

    if (filtered.length === 0) {
        container.innerHTML = `<div class="text-center p-8 text-slate-400 border border-dashed rounded-xl m-4">📭 لا توجد مهام في هذه القائمة</div>`;
        return;
    }

    filtered.forEach(t => {
        let statusClass = category === 'new' ? 'task-new' : 'task-progress';
        let statusIcon = category === 'new' ? 'sparkles' : 'loader';
        let statusText = category === 'new' ? 'جديد' : 'جاري العمل';

        let attachBtn = t.attachment 
            ? `<a href="${t.attachment}" target="_blank" class="text-xs bg-indigo-50 text-indigo-600 px-3 py-2 rounded-lg font-bold flex items-center gap-1 mt-3 w-fit"><i data-lucide="paperclip" class="w-3 h-3"></i> مرفق</a>` 
            : '';

        container.innerHTML += `
        <div class="task-card ${statusClass} mb-4">
            <div>
                <div class="flex justify-between items-start mb-2">
                    <span class="text-[10px] font-bold text-slate-400">#${t.id}</span>
                    <span class="text-[10px] font-bold px-2 py-1 rounded bg-slate-100 text-slate-600 flex items-center gap-1"><i data-lucide="${statusIcon}" class="w-3 h-3"></i> ${statusText}</span>
                </div>
                <h4 class="font-bold text-slate-800 mb-2 leading-snug text-sm">${t.subject}</h4>
                <div class="space-y-1 text-xs text-slate-500">
                    <div class="flex items-center gap-2"><i data-lucide="building" class="w-3 h-3"></i> ${t.source}</div>
                    ${t.entity ? `<div class="flex items-center gap-2"><i data-lucide="map-pin" class="w-3 h-3"></i> ${t.entity}</div>` : ''}
                    <div class="flex items-center gap-2"><i data-lucide="calendar" class="w-3 h-3"></i> ${t.date}</div>
                </div>
            </div>
            ${attachBtn}
        </div>`;
    });
    lucide.createIcons();
}

function renderOverdueTable() {
    const container = document.getElementById('tasks-container');
    if(!container) return;
    
    // إنشاء جدول للمتأخرات بدلاً من الكروت
    const overdueTasks = allTasks.filter(t => t.status && t.status.includes('متأخر'));
    
    if (overdueTasks.length === 0) {
        container.innerHTML = `<div class="text-center p-8 text-green-600 bg-green-50 rounded-xl m-4 font-bold">✅ ممتاز! لا توجد متأخرات.</div>`;
        return;
    }

    let html = `
    <div class="overflow-x-auto rounded-xl border border-red-100 mx-4">
        <table class="w-full text-right bg-white">
            <thead class="bg-red-50 text-red-800 text-[10px]">
                <tr>
                    <th class="p-3">الموضوع</th>
                    <th class="p-3">التأخير</th>
                    <th class="p-3">إجراء</th>
                </tr>
            </thead>
            <tbody class="text-xs">`;

    overdueTasks.forEach(t => {
        let delay = t.delay ? `${t.delay} يوم` : 'غير محدد';
        html += `
        <tr class="border-b border-red-50 hover:bg-red-50/50">
            <td class="p-3 font-bold text-slate-700">${t.subject}</td>
            <td class="p-3 font-bold text-red-600">${delay}</td>
            <td class="p-3">
                ${t.attachment ? `<a href="${t.attachment}" target="_blank" class="text-blue-500">📎</a>` : '-'}
            </td>
        </tr>`;
    });

    html += `</tbody></table></div>`;
    container.innerHTML = html;
}

function applyHistoryFilter() {
    const year = document.getElementById('history-year').value;
    const month = document.getElementById('history-month').value;
    const doneList = document.getElementById('done-tasks-list');
    const reportRows = document.getElementById('reports-rows');

    if(!doneList || !reportRows) return;

    // 1. المهام المنجزة
    let doneTasks = allTasks.filter(t => t.status && (t.status.includes('تم') || t.status.includes('منتهي')));
    doneTasks = doneTasks.filter(t => {
        if (!t.date) return false;
        let parts = t.date.split('/');
        let matchYear = parts[2] === year;
        let matchMonth = month === "" || parseInt(parts[1]) === parseInt(month);
        return matchYear && matchMonth;
    });

    doneList.innerHTML = '';
    if (doneTasks.length === 0) {
        doneList.innerHTML = `<div class="col-span-2 text-center text-slate-400 text-xs py-4">لا توجد مهام منجزة</div>`;
    } else {
        doneTasks.slice(0, 4).forEach(t => { 
            doneList.innerHTML += `
            <div class="bg-white p-3 rounded-lg border border-emerald-100 task-done shadow-sm">
                <h5 class="font-bold text-xs text-slate-800 mb-1 line-clamp-1">${t.subject}</h5>
                <div class="flex justify-between text-[10px] text-slate-500">
                    <span>${t.date}</span>
                    <span class="text-emerald-600 font-bold">منجز</span>
                </div>
            </div>`;
        });
    }

    // 2. التقارير
    let reports = allReports.filter(r => {
        if (!r.date) return false;
        let parts = r.date.split('/');
        let matchYear = parts[2] === year;
        let matchMonth = month === "" || parseInt(parts[1]) === parseInt(month);
        return matchYear && matchMonth;
    });

    reportRows.innerHTML = '';
    if (reports.length === 0) {
        reportRows.innerHTML = `<tr><td colspan="4" class="p-4 text-center text-slate-400 text-xs">لا توجد تقارير</td></tr>`;
    } else {
        reports.forEach(r => {
            let links = '';
            if(r.docLink) links += `<a href="${r.docLink}" target="_blank" class="text-blue-500 mx-1">📄</a>`;
            if(r.pdfLink) links += `<a href="${r.pdfLink}" target="_blank" class="text-red-500 mx-1">📕</a>`;
            if(r.fieldAttachments && r.fieldAttachments.length > 0) {
                links += `<button onclick="showGallery('${encodeURIComponent(JSON.stringify(r.fieldAttachments))}')" class="text-violet-500 mx-1">📷</button>`;
            }
            
            reportRows.innerHTML += `
            <tr class="hover:bg-slate-50 border-b border-slate-100">
                <td class="p-3 text-[10px] font-bold text-slate-500">${r.date}</td>
                <td class="p-3 text-[10px]">${r.type}</td>
                <td class="p-3 text-[10px] font-bold text-slate-700">${r.entity}</td>
                <td class="p-3 text-center flex justify-center">${links || '-'}</td>
            </tr>`;
        });
    }
}

function showGallery(encodedData) {
    const images = JSON.parse(decodeURIComponent(encodedData));
    let html = `<div class="fixed inset-0 z-[60] bg-black/90 flex items-center justify-center p-4" onclick="this.remove()">
        <div class="grid grid-cols-2 md:grid-cols-3 gap-4 max-w-4xl w-full max-h-[80vh] overflow-y-auto" onclick="event.stopPropagation()">`;
    images.forEach(img => {
        html += `<a href="${img}" target="_blank" class="block aspect-square bg-slate-800 rounded-lg overflow-hidden border-2 border-slate-700 bg-cover bg-center" style="background-image:url('${img}')"></a>`;
    });
    html += `</div><button class="absolute top-4 right-4 text-white text-4xl">&times;</button></div>`;
    document.body.insertAdjacentHTML('beforeend', html);
}

// ═══════════════════════════════════════════════════════════════════════════
// ⚙️ 7. منطق الإدارة (ADMIN LOGIC)
// ═══════════════════════════════════════════════════════════════════════════

async function handleAdminLogin() {
    const pin = document.getElementById('admin-pin-input').value;
    const errorMsg = document.getElementById('login-error');
    
    const res = await apiCall('auth', { pin: pin });

    if (res.success && res.role.includes("مدير")) {
        document.getElementById('admin-login-view').classList.add('hidden-section');
        document.getElementById('admin-dashboard-view').classList.remove('hidden-section');
        loadAdminDashboard();
        loadEmployeesList();
    } else {
        errorMsg.classList.remove('hidden-section');
    }
}

function logoutAdmin() {
    location.reload();
}

function switchAdminTab(tabName) {
    document.querySelectorAll('.admin-tab').forEach(t => t.classList.add('hidden-section'));
    document.getElementById('tab-' + tabName).classList.remove('hidden-section');
    
    document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
    const btn = document.getElementById('btn-' + tabName);
    if(btn) btn.classList.add('active');
}

async function loadAdminDashboard() {
    const data = await apiCall('getDashboard', { start: '2025-01-01', end: '2025-12-31' });
    if (data.totals) {
        updateText('adm-stat-total', data.totals.periodTotal);
        updateText('adm-stat-done', data.totals.periodCompleted);
        updateText('adm-stat-prog', data.totals.periodInProgress);
        updateText('adm-stat-late', data.totals.absoluteOverdue);
        
        const tbody = document.getElementById('adm-employees-table');
        if(tbody) {
            tbody.innerHTML = '';
            data.employees.forEach(emp => {
                tbody.innerHTML += `
                <tr class="hover:bg-slate-50 border-b border-slate-100">
                    <td class="p-3 font-bold text-slate-800">${emp.name}</td>
                    <td class="p-3 text-center">${emp.periodTotal}</td>
                    <td class="p-3 text-center text-emerald-600 font-bold">${emp.periodCompleted}</td>
                    <td class="p-3 text-center text-orange-600">${emp.periodRemaining}</td>
                </tr>`;
            });
        }
    }
}

async function loadEmployeesList() {
    const data = await apiCall('getDashboard', { start: '2025-01-01', end: '2025-01-01' });
    if(data.employees) {
        const options = '<option value="">-- اختر الموظف --</option>' + 
            data.employees.map(e => `<option value="${e.name}">${e.name}</option>`).join('');
        
        const select1 = document.getElementById('reassign-new-emp');
        const select2 = document.getElementById('add-employee');
        if(select1) select1.innerHTML = options;
        if(select2) select2.innerHTML = options;
    }
}

function updateText(id, val) {
    const el = document.getElementById(id);
    if(el) el.innerText = val || 0;
}

// ═══════════════════════════════════════════════════════════════════════════
// 🚀 8. تهيئة النظام (INITIALIZATION)
// ═══════════════════════════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', () => {
    if (typeof lucide !== 'undefined') lucide.createIcons();
    const currentYear = new Date().getFullYear();
    const yearSelect = document.getElementById('history-year');
    if(yearSelect) yearSelect.value = currentYear;
});
