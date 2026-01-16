/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🏛️ نظام الحوكمة - المحرك الرئيسي (Unified Engine)
 * يربط واجهات الموظف والمدير بـ Google Apps Script
 * ═══════════════════════════════════════════════════════════════════════════
 */

// ⚠️ هام: ضع رابط الـ Web App الخاص بك هنا بدلاً من الرابط الوهمي
const WEB_APP_URL = "https://script.google.com/macros/s/AKfycby......../exec";

// 📦 تخزين البيانات محلياً (State Management)
let currentUser = null;
let allEmployees = [];
let allTasks = []; // لتخزين المهام الحالية
let dashboardData = null;

// ═══════════════════════════════════════════════════════════════════════════
// 🔌 API HANDLER (مدير الاتصال)
// ═══════════════════════════════════════════════════════════════════════════

async function apiCall(action, payload = {}) {
    toggleLoader(true);
    try {
        // إرسال طلب POST (لأن GAS Web App يعمل بـ doPost)
        const response = await fetch(WEB_APP_URL, {
            method: "POST",
            body: JSON.stringify({ action, ...payload }) // إرسال البيانات كـ نص
        });
        
        const result = await response.json();
        toggleLoader(false);
        return result;

    } catch (error) {
        toggleLoader(false);
        console.error("API Error:", error);
        alert("❌ حدث خطأ في الاتصال بالخادم. يرجى التأكد من الإنترنت.");
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
// 🔐 AUTHENTICATION (تسجيل الدخول)
// ═══════════════════════════════════════════════════════════════════════════

// تسجيل دخول الموظف (main.html)
async function handleLogin() {
    const pinInput = document.getElementById('emp-pin-input');
    const errorMsg = document.getElementById('emp-error');
    const pin = pinInput.value.trim();

    if (pin.length < 4) {
        errorMsg.innerText = "⚠️ يرجى إدخال 4 أرقام على الأقل";
        errorMsg.classList.remove('hidden-section');
        return;
    }

    const res = await apiCall('login', { pin });

    if (res.success) {
        // تخزين البيانات
        currentUser = res;
        
        // إخفاء تسجيل الدخول وإظهار البروفايل
        document.getElementById('emp-login-form').classList.add('hidden-section');
        document.getElementById('emp-profile-view').classList.remove('hidden-section');
        
        // تحديث واجهة البروفايل
        document.getElementById('profile-name').innerText = res.name;
        document.getElementById('profile-role').innerText = res.role;
        
        // معالجة المهام والتقارير
        processEmployeeData(res.tasks || [], res.reports || []);
        
    } else {
        errorMsg.innerText = "❌ كود المرور غير صحيح";
        errorMsg.classList.remove('hidden-section');
    }
}

// تسجيل دخول المدير (admin.html)
async function handleAdminLogin() {
    const pinInput = document.getElementById('admin-pin-input');
    const errorMsg = document.getElementById('login-error');
    const pin = pinInput.value.trim();

    if (pin.length < 4) {
        alert("أدخل الرمز كاملاً");
        return;
    }

    const res = await apiCall('login', { pin });

    if (res.success && res.role.includes("مدير")) {
        document.getElementById('admin-login-view').classList.add('hidden-section');
        document.getElementById('admin-dashboard-view').classList.remove('hidden-section');
        
        // تحميل بيانات الداشبورد فوراً
        loadAdminDashboard();
        // تحميل قائمة الموظفين للقوائم المنسدلة
        loadEmployeesList();
    } else {
        errorMsg.classList.remove('hidden-section');
        if(res.success && !res.role.includes("مدير")) {
            alert("⚠️ هذا الحساب ليس له صلاحيات مدير");
        }
    }
}

function logout() {
    location.reload(); // أبسط طريقة لتسجيل الخروج وتصفير البيانات
}
function logoutAdmin() {
    location.href = 'index.html';
}

// ═══════════════════════════════════════════════════════════════════════════
// 📊 DASHBOARD & PUBLIC STATS (Main & Admin)
// ═══════════════════════════════════════════════════════════════════════════

// تحميل الفلتر (main.html)
async function applyFilter() {
    const year = document.getElementById('year-select').value;
    const type = document.getElementById('filter-type').value;
    
    // حساب التواريخ
    let start, end;
    
    if (type === 'current') {
        // الربع الحالي (تبسيط)
        start = `${year}-01-01`; end = `${year}-12-31`; // يمكن تحسين منطق الربع هنا
    } else if (type === 'all') {
        start = `${year}-01-01`; end = `${year}-12-31`;
    } else if (type === 'month') {
        const m = parseInt(document.getElementById('month-select').value) + 1;
        const mm = m < 10 ? '0'+m : m;
        start = `${year}-${mm}-01`;
        end = `${year}-${mm}-31`; // GAS يتعامل بذكاء مع الأيام الزائدة
    } else {
        start = document.getElementById('d-start').value;
        end = document.getElementById('d-end').value;
    }

    if(!start || !end) return;

    document.getElementById('filter-status').innerText = `جاري جلب البيانات من ${start} إلى ${end}...`;
    
    const data = await apiCall('getDashboard', { start, end });
    
    if (data.totals) {
        renderDashboard(data);
        document.getElementById('filter-status').innerText = `تم التحديث: ${new Date().toLocaleTimeString('ar-EG')}`;
    }
}

function renderDashboard(data) {
    dashboardData = data;
    
    // 1. تحديث الأرقام
    updateText('v-total', data.totals.periodTotal);
    updateText('v-done', data.totals.periodCompleted);
    updateText('v-prog', data.totals.periodInProgress);
    updateText('v-late', data.totals.absoluteOverdue);

    // 2. جدول الموظفين
    const tbody = document.getElementById('table-rows');
    tbody.innerHTML = '';
    
    data.employees.forEach(emp => {
        // نسبة الإنجاز
        const percent = emp.periodTotal > 0 ? Math.round((emp.periodCompleted / emp.periodTotal) * 100) : 0;
        let barColor = percent >= 80 ? 'bg-emerald-500' : (percent < 50 ? 'bg-red-500' : 'bg-amber-500');

        tbody.innerHTML += `
        <tr class="hover:bg-slate-50 transition-colors">
            <td class="p-4 font-bold text-slate-800">${emp.name}</td>
            <td class="p-4 text-center text-slate-600">${emp.periodTotal}</td>
            <td class="p-4 text-center font-bold text-emerald-600">${emp.periodCompleted}</td>
            <td class="p-4">
                <div class="flex items-center gap-2">
                    <div class="w-full bg-slate-200 rounded-full h-2.5">
                        <div class="${barColor} h-2.5 rounded-full" style="width: ${percent}%"></div>
                    </div>
                    <span class="text-xs font-bold text-slate-500">${percent}%</span>
                </div>
            </td>
        </tr>`;
    });

    // 3. جدول الجهات
    const entBody = document.getElementById('entity-rows');
    entBody.innerHTML = '';
    
    data.entities.slice(0, 10).forEach(ent => { // عرض أعلى 10 فقط
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

function updateText(id, val) {
    const el = document.getElementById(id);
    if(el) el.innerText = val || 0;
}

// ═══════════════════════════════════════════════════════════════════════════
// 👤 EMPLOYEE PORTAL LOGIC
// ═══════════════════════════════════════════════════════════════════════════

function processEmployeeData(tasks, reports) {
    allTasks = tasks; // حفظ المهام في المتغير العام
    
    // 1. حساب الإحصائيات الشخصية
    const stats = {
        new: tasks.filter(t => !t.status || t.status === 'جديد').length,
        progress: tasks.filter(t => t.status && (t.status.includes('جاري') || t.status.includes('قيد') || t.status.includes('لم يتم'))).length,
        late: tasks.filter(t => t.status && t.status.includes('متأخر')).length,
        done: tasks.filter(t => t.status && (t.status.includes('تم') || t.status.includes('منتهي'))).length
    };
    
    updateText('stat-new', stats.new);
    updateText('stat-progress', stats.progress);
    updateText('stat-late', stats.late);
    updateText('stat-done', stats.done);
    
    // 2. عرض تبويب "الوارد" افتراضياً
    switchTaskTab('new');

    // 3. تخزين التقارير للعرض عند الطلب
    window.employeeReports = reports;
}

function switchTaskTab(tab) {
    // تحديث الأزرار
    ['new', 'progress', 'late', 'history'].forEach(t => {
        const btn = document.getElementById(`tab-btn-${t}`);
        if(t === tab) {
            btn.classList.remove('bg-slate-100', 'text-slate-500');
            btn.classList.add('bg-slate-800', 'text-white');
        } else {
            btn.classList.add('bg-slate-100', 'text-slate-500');
            btn.classList.remove('bg-slate-800', 'text-white');
        }
    });

    const container = document.getElementById('tasks-container');
    const archiveContainer = document.getElementById('archive-container');
    container.innerHTML = '';
    
    if (tab === 'history') {
        container.classList.add('hidden-section');
        archiveContainer.classList.remove('hidden-section');
        renderHistory(); // دالة خاصة للأرشيف
        return;
    } else {
        container.classList.remove('hidden-section');
        archiveContainer.classList.add('hidden-section');
    }

    // فلترة المهام
    let filtered = [];
    if (tab === 'new') filtered = allTasks.filter(t => !t.status || t.status === 'جديد');
    else if (tab === 'progress') filtered = allTasks.filter(t => t.status && (t.status.includes('جاري') || t.status.includes('قيد') || t.status.includes('لم يتم')));
    else if (tab === 'late') filtered = allTasks.filter(t => t.status && t.status.includes('متأخر'));

    if (filtered.length === 0) {
        container.innerHTML = `<div class="text-center py-12 text-slate-400 bg-white rounded-xl border border-dashed border-slate-300">📭 لا توجد مهام في هذه القائمة</div>`;
        return;
    }

    // رسم الكروت
    filtered.forEach(t => {
        let borderClass = tab === 'new' ? 'task-new' : (tab === 'late' ? 'task-late' : 'task-progress');
        let delayBadge = t.delay ? `<span class="bg-red-100 text-red-700 text-[10px] px-2 py-1 rounded font-bold">متأخر ${t.delay} يوم</span>` : '';
        let attachmentBtn = t.attachment ? `<a href="${t.attachment}" target="_blank" class="text-indigo-600 hover:bg-indigo-50 p-2 rounded-lg text-xs font-bold flex items-center gap-1"><i data-lucide="paperclip" class="w-3 h-3"></i> مرفق</a>` : '';

        container.innerHTML += `
        <div class="stat-card ${borderClass} flex flex-col justify-between h-full">
            <div>
                <div class="flex justify-between items-start mb-2">
                    <span class="text-[10px] font-black text-slate-400">#${t.id}</span>
                    <span class="text-[10px] bg-slate-100 px-2 py-1 rounded text-slate-600 font-bold">${t.status}</span>
                </div>
                <h4 class="font-bold text-slate-800 mb-2 text-sm leading-relaxed">${t.subject}</h4>
                <div class="text-xs text-slate-500 space-y-1">
                    <p class="flex items-center gap-1"><i data-lucide="building" class="w-3 h-3"></i> ${t.source}</p>
                    <p class="flex items-center gap-1"><i data-lucide="map-pin" class="w-3 h-3"></i> ${t.entity}</p>
                    <p class="flex items-center gap-1"><i data-lucide="calendar" class="w-3 h-3"></i> ${t.date}</p>
                </div>
            </div>
            <div class="mt-4 flex justify-between items-center border-t border-slate-100 pt-2">
                ${delayBadge}
                ${attachmentBtn}
            </div>
        </div>`;
    });
    
    lucide.createIcons();
}

function renderHistory() {
    // 1. المهام المنجزة
    const doneTasks = allTasks.filter(t => t.status && (t.status.includes('تم') || t.status.includes('منتهي')));
    const doneList = document.getElementById('done-tasks-list');
    doneList.innerHTML = '';
    
    if(doneTasks.length === 0) doneList.innerHTML = '<p class="text-slate-400 text-sm">لا توجد مهام منجزة بعد</p>';
    
    doneTasks.slice(0, 6).forEach(t => { // عرض آخر 6
        doneList.innerHTML += `
        <div class="bg-white p-3 rounded-lg border border-slate-200 task-done">
            <h5 class="font-bold text-xs text-slate-800 mb-1 line-clamp-1">${t.subject}</h5>
            <div class="flex justify-between text-[10px] text-slate-500">
                <span>${t.date}</span>
                <span class="text-emerald-600 font-bold">منجز</span>
            </div>
        </div>`;
    });

    // 2. التقارير (الجدول) - يتم استدعاء applyHistoryFilter لتعبئتها
    applyHistoryFilter();
}

function applyHistoryFilter() {
    const year = document.getElementById('history-year').value;
    const month = document.getElementById('history-month').value;
    const tbody = document.getElementById('reports-rows');
    tbody.innerHTML = '';

    const reports = window.employeeReports || [];
    
    // الفلترة
    const filtered = reports.filter(r => {
        if (!r.date) return false;
        const parts = r.date.split('/'); // DD/MM/YYYY
        if (parts.length !== 3) return false;
        
        const rYear = parts[2];
        const rMonth = parseInt(parts[1]); // رقم الشهر
        
        let matchYear = rYear === year;
        let matchMonth = month === "" || rMonth === parseInt(month);
        
        return matchYear && matchMonth;
    });

    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" class="p-6 text-center text-slate-400">لا توجد تقارير في هذه الفترة</td></tr>`;
        return;
    }

    filtered.forEach(r => {
        let links = '';
        if(r.docLink) links += `<a href="${r.docLink}" target="_blank" class="text-blue-500 hover:bg-blue-50 p-1 rounded"><i data-lucide="file-edit" class="w-4 h-4"></i></a>`;
        if(r.pdfLink) links += `<a href="${r.pdfLink}" target="_blank" class="text-red-500 hover:bg-red-50 p-1 rounded"><i data-lucide="file-text" class="w-4 h-4"></i></a>`;
        
        // المرفقات الميدانية
        if(r.fieldAttachments && r.fieldAttachments.length > 0) {
            links += `<button onclick="showGallery('${encodeURIComponent(JSON.stringify(r.fieldAttachments))}')" class="text-violet-500 hover:bg-violet-50 p-1 rounded flex items-center gap-1 font-bold text-xs">
                <i data-lucide="image" class="w-4 h-4"></i> ${r.fieldAttachments.length}
            </button>`;
        }

        tbody.innerHTML += `
        <tr class="hover:bg-slate-50 border-b border-slate-100">
            <td class="p-4 text-slate-500 text-xs font-bold">${r.date}</td>
            <td class="p-4 text-xs bg-slate-50 rounded-lg">${r.type}</td>
            <td class="p-4 font-bold text-slate-700 text-sm">${r.title}<br><span class="text-[10px] text-slate-400 font-normal">${r.entity}</span></td>
            <td class="p-4"><div class="flex justify-center gap-2">${links || '-'}</div></td>
        </tr>`;
    });
    
    lucide.createIcons();
}

function showGallery(encodedData) {
    const images = JSON.parse(decodeURIComponent(encodedData));
    let html = `<div class="fixed inset-0 z-[60] bg-black/90 flex items-center justify-center p-4" onclick="this.remove()">
        <div class="grid grid-cols-2 md:grid-cols-3 gap-4 max-w-4xl w-full max-h-[80vh] overflow-y-auto" onclick="event.stopPropagation()">`;
    
    images.forEach(img => {
        html += `<a href="${img}" target="_blank" class="block aspect-square bg-slate-800 rounded-lg overflow-hidden hover:opacity-80 border-2 border-slate-700">
            <div class="w-full h-full flex items-center justify-center text-white font-bold text-xs">عرض الصورة ↗️</div>
        </a>`;
    });
    
    html += `</div><button class="absolute top-4 right-4 text-white text-4xl font-bold">&times;</button></div>`;
    document.body.insertAdjacentHTML('beforeend', html);
}

// ═══════════════════════════════════════════════════════════════════════════
// 🛡️ ADMIN LOGIC
// ═══════════════════════════════════════════════════════════════════════════

async function loadAdminDashboard() {
    // تحميل بيانات سنة كاملة بشكل افتراضي
    const data = await apiCall('getDashboard', { start: '2024-01-01', end: '2027-12-31' });
    
    if (data.totals) {
        updateText('adm-stat-total', data.totals.periodTotal);
        updateText('adm-stat-done', data.totals.periodCompleted);
        updateText('adm-stat-prog', data.totals.periodInProgress);
        updateText('adm-stat-late', data.totals.absoluteOverdue);

        const tbody = document.getElementById('adm-employees-table');
        tbody.innerHTML = '';
        data.employees.forEach(emp => {
            tbody.innerHTML += `
            <tr class="hover:bg-slate-50 border-b border-slate-100">
                <td class="p-4 font-bold text-slate-800">${emp.name}</td>
                <td class="p-4 text-center">${emp.periodTotal}</td>
                <td class="p-4 text-center text-emerald-600 font-bold">${emp.periodCompleted}</td>
                <td class="p-4 text-center text-orange-600 font-bold">${emp.periodRemaining}</td>
            </tr>`;
        });
    }
}

async function loadEmployeesList() {
    // نستخدم بيانات الداشبورد لجلب أسماء الموظفين فقط
    // (يتم استدعاء loadAdminDashboard أولاً لتعبئة البيانات في الذاكرة أو نطلبها مجدداً)
    // هنا سنعتمد على أن الموظفين يأتون مع الداشبورد
    // لكن للأمان سنطلبهم مرة واحدة
    const select1 = document.getElementById('reassign-new-emp');
    const select2 = document.getElementById('add-employee');
    
    // إذا لم تكن القوائم موجودة (أي نحن لسنا في صفحة الأدمن)، نخرج
    if(!select1) return;

    // مسح الخيارات القديمة
    select1.innerHTML = '<option value="">-- اختر الموظف --</option>';
    select2.innerHTML = '<option value="">-- اختر الموظف --</option>';

    // بما أننا حملنا الداشبورد، يمكننا استخدام البيانات من هناك إذا حفظناها
    // سأقوم بطلب سريع لضمان الحصول على القائمة
    const data = await apiCall('getDashboard', { start: '2025-01-01', end: '2025-01-02' }); 
    if(data.employees) {
        data.employees.forEach(emp => {
            const opt = `<option value="${emp.name}">${emp.name}</option>`;
            select1.innerHTML += opt;
            select2.innerHTML += opt;
        });
    }
}

// بحث المهام للمدير (Reassign & Status)
// ملاحظة: بما أننا لا نملك endpoint "searchTask" محدد، سنستخدم البحث في الأرشيف للوصول للمهمة
async function searchTaskForAdmin(type) {
    const inputId = type === 'reassign' ? 'reassign-search-input' : 'status-search-input';
    const query = document.getElementById(inputId).value;
    
    if(query.length < 2) return alert("أدخل حرفين على الأقل");

    const res = await apiCall('searchArchive', { filters: { search: query } });

    if(res.success && res.results.length > 0) {
        // نأخذ أول نتيجة للمعاينة (تبسيط)
        const task = res.results[0];
        
        // عرض المعاينة
        document.getElementById(`${type}-task-preview`).classList.remove('hidden-section');
        document.getElementById(`${type}-id`).innerText = '#' + task.id;
        document.getElementById(`${type}-subject`).innerText = task.subject;
        
        if(type === 'reassign') {
            document.getElementById('reassign-entity').innerText = task.entity;
            // تخزين ID المهمة المحددة في زر التنفيذ
            document.querySelector('#tab-reassign button.btn-active').dataset.taskId = task.id;
        } else {
            document.querySelector('#tab-status button.btn-active').dataset.taskId = task.id;
        }

        if(res.results.length > 1) {
            alert(`⚠️ تم العثور على ${res.results.length} نتائج. تم اختيار الأولى: ${task.subject}`);
        }
    } else {
        alert("❌ لم يتم العثور على مهمة بهذا الرقم أو الاسم");
        document.getElementById(`${type}-task-preview`).classList.add('hidden-section');
    }
}

async function executeReassign() {
    const btn = document.querySelector('#tab-reassign button.btn-active');
    const taskId = btn.dataset.taskId;
    const newEmp = document.getElementById('reassign-new-emp').value;

    if(!taskId) return alert("⚠️ ابحث عن مهمة أولاً");
    if(!newEmp) return alert("⚠️ اختر الموظف الجديد");

    const res = await apiCall('reassign', { taskId, emp: newEmp });
    if(res.success) {
        alert("✅ تمت إعادة التكليف بنجاح");
        location.reload();
    }
}

async function executeStatusUpdate() {
    const btn = document.querySelector('#tab-status button.btn-active');
    const taskId = btn.dataset.taskId;
    const status = document.getElementById('status-new-val').value;

    if(!taskId) return alert("⚠️ ابحث عن مهمة أولاً");
    if(!status) return alert("⚠️ اختر الحالة الجديدة");

    const res = await apiCall('updateStatus', { taskId, status });
    if(res.success) {
        alert("✅ تم تعديل الحالة بنجاح");
        location.reload();
    }
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

    if(!taskData.date || !taskData.source || !taskData.subject) {
        return alert("⚠️ يرجى ملء الحقول المطلوبة (*)");
    }

    const res = await apiCall('addTask', { taskData });
    if(res.success) {
        alert(`✅ تمت إضافة المهمة بنجاح برقم قيد: ${res.id}`);
        // تصفير الحقول
        document.querySelectorAll('#tab-add input, #tab-add textarea').forEach(i => i.value = '');
    }
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
            let files = '';
            if(r.taskAttachment) files += '📎 ';
            if(r.reportDoc) files += '📄 ';
            if(r.reportPdf) files += '📕';
            
            tbody.innerHTML += `
            <tr class="hover:bg-slate-50 border-b border-slate-100">
                <td class="p-4 font-bold text-slate-800 text-xs">#${r.id}</td>
                <td class="p-4 text-xs text-slate-500">${r.date}</td>
                <td class="p-4 text-xs font-bold">${r.entity}</td>
                <td class="p-4 text-sm">${r.subject}</td>
                <td class="p-4 text-center">${files || '-'}</td>
            </tr>`;
        });
    } else {
        tbody.innerHTML = `<tr><td colspan="5" class="p-8 text-center text-slate-400">لا توجد نتائج</td></tr>`;
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// 🚀 INITIALIZATION (التشغيل التلقائي)
// ═══════════════════════════════════════════════════════════════════════════

function toggleInputs() {
    const type = document.getElementById('filter-type').value;
    document.getElementById('month-input').classList.add('hidden-section');
    document.getElementById('date-range').classList.add('hidden-section');
    
    if(type === 'month') document.getElementById('month-input').classList.remove('hidden-section');
    if(type === 'custom') document.getElementById('date-range').classList.remove('hidden-section');
}

// تشغيل الفلتر الافتراضي عند فتح الصفحة الرئيسية
if(document.getElementById('v-total')) {
    applyFilter();
}
