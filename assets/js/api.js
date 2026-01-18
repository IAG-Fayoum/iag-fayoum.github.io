/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🏛️ نظام الحوكمة - المحرك الرئيسي (API & Logic Controller)
 * الحالة: جاهز للعمل (Production Ready)
 * ═══════════════════════════════════════════════════════════════════════════
 */

// ✅ رابط النشر الخاص بك (Deploy URL)
const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbzi68xXxFmLlTd-w0ADsf_A7S1100sYjfusWeZNGTyOf7_PlRhsPYTO6iCrTyj7mz996w/exec";

// 📦 متغيرات النظام (State Management)
let currentUser = null;
let allTasks = []; 
let dashboardData = null;

// ═══════════════════════════════════════════════════════════════════════════
// 🔌 1. API HANDLER (إدارة الاتصال)
// ═══════════════════════════════════════════════════════════════════════════

async function apiCall(action, payload = {}) {
    toggleLoader(true);
    try {
        const response = await fetch(WEB_APP_URL, {
            method: "POST",
            body: JSON.stringify({ action, ...payload }) 
        });
        
        if (!response.ok) throw new Error("فشل الاتصال بالخادم");

        const result = await response.json();
        toggleLoader(false);
        return result;

    } catch (error) {
        toggleLoader(false);
        console.error("API Error:", error);
        alert("⚠️ خطأ في الاتصال: تأكد من الإنترنت أو صلاحيات السكربت.");
        return { success: false, error: error.message };
    }
}

function toggleLoader(show) {
    // يعمل على الصفحتين (Main & Admin)
    const loader = document.getElementById('loader') || document.getElementById('admin-loader');
    if (loader) {
        if (show) loader.classList.remove('hidden-section');
        else loader.classList.add('hidden-section');
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// 🔐 2. AUTHENTICATION (تسجيل الدخول)
// ═══════════════════════════════════════════════════════════════════════════

// دخول الموظف
async function handleLogin() {
    const pinInput = document.getElementById('emp-pin-input');
    const errorMsg = document.getElementById('emp-error');
    if(!pinInput) return; 

    const pin = pinInput.value.trim();
    if (pin.length < 4) {
        errorMsg.innerText = "⚠️ يرجى إدخال 4 أرقام";
        errorMsg.classList.remove('hidden-section');
        return;
    }

    const res = await apiCall('login', { pin });

    if (res.success) {
        currentUser = res;
        document.getElementById('emp-login-form').classList.add('hidden-section');
        document.getElementById('emp-profile-view').classList.remove('hidden-section');
        
        // تعبئة البيانات الشخصية
        document.getElementById('profile-name').innerText = res.name;
        document.getElementById('profile-role').innerText = res.role;
        
        // معالجة المهام
        processEmployeeData(res.tasks || [], res.reports || []);
    } else {
        errorMsg.innerText = "❌ كود المرور غير صحيح";
        errorMsg.classList.remove('hidden-section');
    }
}

// دخول المدير
async function handleAdminLogin() {
    const pinInput = document.getElementById('admin-pin-input');
    const errorMsg = document.getElementById('login-error');
    if(!pinInput) return;

    const pin = pinInput.value.trim();
    if (pin.length < 4) return;

    const res = await apiCall('login', { pin });

    if (res.success && res.role.includes("مدير")) {
        document.getElementById('admin-login-view').classList.add('hidden-section');
        document.getElementById('admin-dashboard-view').classList.remove('hidden-section');
        
        // تحميل البيانات الأولية للمدير
        loadAdminDashboard();
        loadEmployeesList();
    } else {
        errorMsg.classList.remove('hidden-section');
    }
}

function logout() { location.reload(); }
function logoutAdmin() { location.href = 'index.html'; }

// ═══════════════════════════════════════════════════════════════════════════
// 📊 3. DASHBOARD LOGIC (الداشبورد)
// ═══════════════════════════════════════════════════════════════════════════

async function applyFilter() {
    if(!document.getElementById('v-total')) return; // حماية لعدم التنفيذ في صفحة الخطأ

    const year = document.getElementById('year-select').value;
    const type = document.getElementById('filter-type').value;
    let start, end;
    
    if (type === 'current') { start = `${year}-01-01`; end = `${year}-12-31`; }
    else if (type === 'all') { start = `${year}-01-01`; end = `${year}-12-31`; }
    else if (type === 'month') {
        const m = parseInt(document.getElementById('month-select').value) + 1;
        const mm = m < 10 ? '0'+m : m;
        start = `${year}-${mm}-01`; end = `${year}-${mm}-31`;
    } else {
        start = document.getElementById('d-start').value;
        end = document.getElementById('d-end').value;
    }

    document.getElementById('filter-status').innerText = `جاري التحديث...`;
    const data = await apiCall('getDashboard', { start, end });
    
    if (data.totals) {
        renderDashboard(data);
        document.getElementById('filter-status').innerText = `تم التحديث: ${new Date().toLocaleTimeString('ar-EG')}`;
    }
}

function renderDashboard(data) {
    // تحديث الأرقام
    updateText('v-total', data.totals.periodTotal);
    updateText('v-done', data.totals.periodCompleted);
    updateText('v-prog', data.totals.periodInProgress);
    updateText('v-late', data.totals.absoluteOverdue);

    // جدول الموظفين
    const tbody = document.getElementById('table-rows');
    if(tbody) {
        tbody.innerHTML = '';
        data.employees.forEach(emp => {
            const percent = emp.periodTotal > 0 ? Math.round((emp.periodCompleted / emp.periodTotal) * 100) : 0;
            let barColor = percent >= 80 ? 'bg-emerald-500' : (percent < 50 ? 'bg-red-500' : 'bg-amber-500');
            
            tbody.innerHTML += `
            <tr class="hover:bg-slate-50 transition-colors">
                <td class="p-4 font-bold text-slate-800">${emp.name}</td>
                <td class="p-4 text-center text-slate-600">${emp.periodTotal}</td>
                <td class="p-4 text-center font-bold text-emerald-600">${emp.periodCompleted}</td>
                <td class="p-4">
                    <div class="w-full bg-slate-200 rounded-full h-2.5">
                        <div class="${barColor} h-2.5 rounded-full" style="width: ${percent}%"></div>
                    </div>
                </td>
            </tr>`;
        });
    }

    // جدول الجهات
    const entBody = document.getElementById('entity-rows');
    if(entBody) {
        entBody.innerHTML = '';
        data.entities.slice(0, 10).forEach(ent => {
            entBody.innerHTML += `
            <tr class="hover:bg-slate-50 border-b border-slate-100">
                <td class="p-4 font-bold text-slate-700 text-xs">${ent.name}</td>
                <td class="p-4 text-center text-slate-600">${ent.total}</td>
                <td class="p-4 text-center text-amber-600 font-bold">${ent.pending}</td>
                <td class="p-4 text-center text-red-600 font-black">${ent.overdue}</td>
                <td class="p-4 text-center text-xs font-bold">${ent.overduePercent}%</td>
            </tr>`;
        });
    }
}

function updateText(id, val) {
    const el = document.getElementById(id);
    if(el) el.innerText = val || 0;
}

// ═══════════════════════════════════════════════════════════════════════════
// 👤 4. EMPLOYEE PORTAL LOGIC (بوابة الموظف)
// ═══════════════════════════════════════════════════════════════════════════

function processEmployeeData(tasks, reports) {
    allTasks = tasks;
    window.employeeReports = reports;
    
    // إحصائيات علوية
    updateText('stat-new', tasks.filter(t => !t.status || t.status === 'جديد').length);
    updateText('stat-progress', tasks.filter(t => t.status && (t.status.includes('جاري') || t.status.includes('قيد'))).length);
    updateText('stat-late', tasks.filter(t => t.status && t.status.includes('متأخر')).length);
    updateText('stat-done', tasks.filter(t => t.status && (t.status.includes('تم') || t.status.includes('منتهي'))).length);
    
    // فتح أول تبويب
    switchTaskTab('new');
}

function switchTaskTab(tab) {
    // تبديل ستايل الأزرار
    ['new', 'progress', 'late', 'history'].forEach(t => {
        const btn = document.getElementById(`tab-btn-${t}`);
        if(btn) {
            if(t === tab) {
                btn.classList.remove('bg-slate-100', 'text-slate-500');
                btn.classList.add('bg-slate-800', 'text-white');
            } else {
                btn.classList.add('bg-slate-100', 'text-slate-500');
                btn.classList.remove('bg-slate-800', 'text-white');
            }
        }
    });

    const container = document.getElementById('tasks-container');
    const archiveContainer = document.getElementById('archive-container');
    if(!container) return;

    // حالة الأرشيف خاصة
    if (tab === 'history') {
        container.classList.add('hidden-section');
        archiveContainer.classList.remove('hidden-section');
        renderHistory();
        return;
    } else {
        container.classList.remove('hidden-section');
        archiveContainer.classList.add('hidden-section');
    }

    // فلترة وعرض المهام
    container.innerHTML = '';
    let filtered = [];
    if (tab === 'new') filtered = allTasks.filter(t => !t.status || t.status === 'جديد');
    else if (tab === 'progress') filtered = allTasks.filter(t => t.status && (t.status.includes('جاري') || t.status.includes('قيد') || t.status.includes('لم يتم')));
    else if (tab === 'late') filtered = allTasks.filter(t => t.status && t.status.includes('متأخر'));

    if (filtered.length === 0) {
        container.innerHTML = `<div class="text-center py-12 text-slate-400 border border-dashed rounded-xl">📭 لا توجد مهام في هذه القائمة</div>`;
        return;
    }

    filtered.forEach(t => {
        let borderClass = tab === 'new' ? 'task-new' : (tab === 'late' ? 'task-late' : 'task-progress');
        let delayBadge = t.delay ? `<span class="bg-red-100 text-red-700 text-[10px] px-2 py-1 rounded font-bold">متأخر ${t.delay} يوم</span>` : '';
        let attachmentBtn = t.attachment ? `<a href="${t.attachment}" target="_blank" class="text-indigo-600 font-bold text-xs flex items-center gap-1">📎 مرفق</a>` : '';

        container.innerHTML += `
        <div class="stat-card ${borderClass}">
            <div class="flex justify-between items-center mb-2">
                <span class="font-bold text-slate-400 text-xs">#${t.id}</span>
                <span class="bg-slate-100 px-2 py-1 rounded text-[10px] font-bold text-slate-600">${t.status}</span>
            </div>
            <h4 class="font-bold text-slate-800 mb-2 text-sm">${t.subject}</h4>
            <div class="text-xs text-slate-500 mb-3 space-y-1">
                <p>📍 ${t.entity}</p>
                <p>📅 ${t.date}</p>
            </div>
            <div class="flex justify-between items-center border-t border-slate-100 pt-2">
                ${delayBadge}
                ${attachmentBtn}
            </div>
        </div>`;
    });
    
    // تفعيل الأيقونات
    if(typeof lucide !== 'undefined') lucide.createIcons();
}

function renderHistory() {
    // 1. المهام المنجزة (مصغرة)
    const doneTasks = allTasks.filter(t => t.status && (t.status.includes('تم') || t.status.includes('منتهي')));
    const doneList = document.getElementById('done-tasks-list');
    if(doneList) {
        doneList.innerHTML = '';
        doneTasks.slice(0, 6).forEach(t => {
            doneList.innerHTML += `
            <div class="bg-white p-3 rounded-lg border border-slate-200 task-done">
                <h5 class="font-bold text-xs text-slate-800 mb-1 line-clamp-1">${t.subject}</h5>
                <div class="flex justify-between text-[10px] text-slate-500">
                    <span>${t.date}</span>
                    <span class="text-emerald-600 font-bold">منجز</span>
                </div>
            </div>`;
        });
    }

    // 2. جدول التقارير (يعتمد على الفلتر)
    applyHistoryFilter();
}

function applyHistoryFilter() {
    const year = document.getElementById('history-year').value;
    const month = document.getElementById('history-month').value;
    const tbody = document.getElementById('reports-rows');
    if(!tbody) return;

    tbody.innerHTML = '';
    const reports = window.employeeReports || [];
    
    const filtered = reports.filter(r => {
        if (!r.date) return false;
        const parts = r.date.split('/'); 
        if (parts.length !== 3) return false;
        const rYear = parts[2];
        const rMonth = parseInt(parts[1]);
        
        return rYear === year && (month === "" || rMonth === parseInt(month));
    });

    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" class="p-6 text-center text-slate-400">لا توجد تقارير في الفترة المحددة</td></tr>`;
        return;
    }

    filtered.forEach(r => {
        let links = '';
        if(r.docLink) links += `<a href="${r.docLink}" target="_blank" class="text-blue-500 hover:bg-blue-50 p-1 rounded">📄</a>`;
        if(r.pdfLink) links += `<a href="${r.pdfLink}" target="_blank" class="text-red-500 hover:bg-red-50 p-1 rounded">📕</a>`;
        if(r.fieldAttachments && r.fieldAttachments.length > 0) {
            links += `<button onclick="showGallery('${encodeURIComponent(JSON.stringify(r.fieldAttachments))}')" class="text-violet-500 hover:bg-violet-50 p-1 rounded font-bold text-xs">📷 ${r.fieldAttachments.length}</button>`;
        }
        
        tbody.innerHTML += `
        <tr class="hover:bg-slate-50 border-b border-slate-100">
            <td class="p-3 text-xs text-slate-500 font-bold">${r.date}</td>
            <td class="p-3 text-xs">${r.type}</td>
            <td class="p-3 text-xs font-bold text-slate-700">${r.entity}</td>
            <td class="p-3 text-center flex gap-1 justify-center">${links || '-'}</td>
        </tr>`;
    });
    if(typeof lucide !== 'undefined') lucide.createIcons();
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
// 🛡️ 5. ADMIN LOGIC (لوحة الإدارة)
// ═══════════════════════════════════════════════════════════════════════════

async function loadAdminDashboard() {
    const data = await apiCall('getDashboard', { start: '2024-01-01', end: '2027-12-31' });
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
    const select1 = document.getElementById('reassign-new-emp');
    const select2 = document.getElementById('add-employee');
    if(!select1) return; // لسنا في صفحة الأدمن

    // طلب سريع للتأكد من القائمة
    const data = await apiCall('getDashboard', { start: '2025-01-01', end: '2025-01-01' }); 
    if(data.employees) {
        const options = data.employees.map(e => `<option value="${e.name}">${e.name}</option>`).join('');
        select1.innerHTML = '<option value="">-- اختر الموظف --</option>' + options;
        select2.innerHTML = '<option value="">-- اختر الموظف --</option>' + options;
    }
}

async function searchTaskForAdmin(type) {
    const inputId = type === 'reassign' ? 'reassign-search-input' : 'status-search-input';
    const query = document.getElementById(inputId).value;
    if(query.length < 2) return alert("أدخل حرفين على الأقل للبحث");

    const res = await apiCall('searchArchive', { filters: { search: query } });

    if(res.success && res.results.length > 0) {
        const task = res.results[0];
        document.getElementById(`${type}-task-preview`).classList.remove('hidden-section');
        document.getElementById(`${type}-id`).innerText = '#' + task.id;
        document.getElementById(`${type}-subject`).innerText = task.subject;
        
        if(type === 'reassign') {
            document.getElementById('reassign-entity').innerText = task.entity;
            document.querySelector('#tab-reassign button.btn-active').dataset.taskId = task.id;
        } else {
            document.querySelector('#tab-status button.btn-active').dataset.taskId = task.id;
        }
    } else {
        alert("❌ لم يتم العثور على مهمة بهذا الرقم");
    }
}

async function executeReassign() {
    const btn = document.querySelector('#tab-reassign button.btn-active');
    const taskId = btn.dataset.taskId;
    const newEmp = document.getElementById('reassign-new-emp').value;
    
    if(!taskId) return alert("⚠️ ابحث عن مهمة أولاً");
    if(!newEmp) return alert("⚠️ اختر الموظف الجديد");

    const res = await apiCall('reassign', { taskId, emp: newEmp });
    if(res.success) { alert("✅ تمت العملية بنجاح"); location.reload(); }
}

async function executeStatusUpdate() {
    const btn = document.querySelector('#tab-status button.btn-active');
    const taskId = btn.dataset.taskId;
    const status = document.getElementById('status-new-val').value;
    
    if(!taskId) return alert("⚠️ ابحث عن مهمة أولاً");
    if(!status) return alert("⚠️ اختر الحالة الجديدة");

    const res = await apiCall('updateStatus', { taskId, status });
    if(res.success) { alert("✅ تم تعديل الحالة"); location.reload(); }
}

async function executeAddTask() {
    const taskData = {
        date: document.getElementById('add-date').value,
        source: document.getElementById('add-source').value,
        subject: document.getElementById('add-subject').value,
        entity: document.getElementById('add-entity').value,
        employee: document.getElementById('add-employee').value,
        deadline: document.getElementById('add-deadline').value,
        attachment: document.getElementById('add-attachment').value
    };
    
    if(!taskData.subject || !taskData.source) return alert("⚠️ أكمل البيانات الأساسية");
    
    const res = await apiCall('addTask', { taskData });
    if(res.success) { alert(`✅ تمت الإضافة (رقم القيد: ${res.id})`); location.reload(); }
}

async function searchArchiveAdmin() {
    const filters = {
        year: document.getElementById('arch-year').value,
        month: document.getElementById('arch-month').value,
        search: document.getElementById('arch-search').value
    };
    const res = await apiCall('searchArchive', { filters });
    const tbody = document.getElementById('arch-results');
    tbody.innerHTML = '';
    
    if(res.success && res.results.length > 0) {
        res.results.forEach(r => {
            let fileIcon = r.taskAttachment ? '📎' : (r.reportDoc ? '📄' : '-');
            tbody.innerHTML += `
            <tr class="hover:bg-slate-50 border-b border-slate-100">
                <td class="p-4 font-bold text-slate-800 text-xs">#${r.id}</td>
                <td class="p-4 text-xs text-slate-500">${r.date}</td>
                <td class="p-4 text-xs font-bold">${r.entity}</td>
                <td class="p-4 text-sm">${r.subject}</td>
                <td class="p-4 text-center">${fileIcon}</td>
            </tr>`;
        });
    } else {
        tbody.innerHTML = `<tr><td colspan="5" class="p-4 text-center text-slate-400">لا توجد نتائج</td></tr>`;
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// 🚀 6. INITIALIZATION (التشغيل التلقائي)
// ═══════════════════════════════════════════════════════════════════════════

function toggleInputs() {
    const type = document.getElementById('filter-type').value;
    document.getElementById('month-input').classList.add('hidden-section');
    document.getElementById('date-range').classList.add('hidden-section');
    
    if(type === 'month') document.getElementById('month-input').classList.remove('hidden-section');
    if(type === 'custom') document.getElementById('date-range').classList.remove('hidden-section');
}

document.addEventListener('DOMContentLoaded', () => {
    if(typeof lucide !== 'undefined') lucide.createIcons();
    // تشغيل الفلتر الافتراضي إذا كنا في الصفحة الرئيسية
    if(document.getElementById('v-total')) applyFilter();
});
