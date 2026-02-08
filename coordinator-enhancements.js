// Coordinator Enhancements Script
// يتضمن وظائف النوافذ المنبثقة (Modals) والاتصال الفعلي بالخادم (API)

document.addEventListener('DOMContentLoaded', () => {
    injectModals();
});

// 1. حقن كود النوافذ المنبثقة
function injectModals() {
    const modalHTML = `
    <div class="modal-overlay" id="modal-reassign">
        <div class="modal-box">
            <div class="modal-header">
                <h3 class="font-bold text-lg">تغيير الموظف المكلف</h3>
                <button onclick="closeEnhancementModal('modal-reassign')" class="p-2 rounded-full hover:bg-gray-100"><i data-lucide="x" class="w-5 h-5"></i></button>
            </div>
            <div class="modal-body">
                <input type="hidden" id="reassign-task-id">
                <label class="block text-sm font-bold text-gray-700 mb-2">اختر الموظف الجديد:</label>
                <select id="reassign-select" class="w-full p-3 border rounded-lg bg-white mb-4">
                    <option value="">-- اختر من القائمة --</option>
                </select>
                <p class="text-xs text-gray-500 bg-yellow-50 p-2 rounded border border-yellow-200">
                    <i data-lucide="alert-circle" class="w-3 h-3 inline"></i> سيتم إشعار الموظف الجديد تلقائياً.
                </p>
            </div>
            <div class="modal-footer flex gap-2 justify-end p-4 bg-gray-50 border-t">
                <button onclick="confirmReassign()" class="px-4 py-2 bg-teal-600 text-white rounded-lg font-bold hover:bg-teal-700" id="btn-confirm-reassign">تأكيد التغيير</button>
                <button onclick="closeEnhancementModal('modal-reassign')" class="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-bold hover:bg-gray-300">إلغاء</button>
            </div>
        </div>
    </div>

    <div class="modal-overlay" id="modal-status">
        <div class="modal-box">
            <div class="modal-header">
                <h3 class="font-bold text-lg">تغيير حالة المعاملة</h3>
                <button onclick="closeEnhancementModal('modal-status')" class="p-2 rounded-full hover:bg-gray-100"><i data-lucide="x" class="w-5 h-5"></i></button>
            </div>
            <div class="modal-body">
                <input type="hidden" id="status-task-id">
                <label class="block text-sm font-bold text-gray-700 mb-2">اختر الحالة الجديدة:</label>
                <select id="status-select" class="w-full p-3 border rounded-lg bg-white mb-4">
                    <option value="جديد">جديد</option>
                    <option value="بانتظار الاعتماد">بانتظار الاعتماد</option>
                    <option value="تم الاعتماد والأرشفة">تم الاعتماد والأرشفة</option>
                    <option value="بحاجة الي متابعة">بحاجة الي متابعة</option>
                </select>
            </div>
            <div class="modal-footer flex gap-2 justify-end p-4 bg-gray-50 border-t">
                <button onclick="confirmStatusChange()" class="px-4 py-2 bg-teal-600 text-white rounded-lg font-bold hover:bg-teal-700" id="btn-confirm-status">حفظ الحالة</button>
                <button onclick="closeEnhancementModal('modal-status')" class="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-bold hover:bg-gray-300">إلغاء</button>
            </div>
        </div>
    </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    lucide.createIcons();
}

// 2. وظائف الفتح
function openReassignModal(taskId) {
    document.getElementById('reassign-task-id').value = taskId;
    const select = document.getElementById('reassign-select');
    select.innerHTML = '<option value="">-- تحميل القائمة... --</option>';
    
    if (typeof allEmployees !== 'undefined' && allEmployees.length > 0) {
        select.innerHTML = '<option value="">-- اختر من القائمة --</option>';
        allEmployees.forEach(emp => {
            const title = (emp.jobTitle || '').trim();
            if (title === 'مراجع فني' || title === 'مراجع مالي وإداري') {
                const opt = document.createElement('option');
                opt.value = emp.name;
                opt.textContent = emp.name;
                select.appendChild(opt);
            }
        });
        if (select.options.length === 1) select.innerHTML = '<option value="">-- لا يوجد مراجعين --</option>';
    } else {
        select.innerHTML = '<option value="">-- لا يوجد بيانات --</option>';
    }
    document.getElementById('modal-reassign').classList.add('open');
}

function openStatusModal(taskId) {
    document.getElementById('status-task-id').value = taskId;
    document.getElementById('modal-status').classList.add('open');
}

function closeEnhancementModal(id) {
    document.getElementById(id).classList.remove('open');
}

// 3. التنفيذ الفعلي (API Calls)

// أ) تغيير المكلف
async function confirmReassign() {
    const taskId = document.getElementById('reassign-task-id').value;
    const newEmp = document.getElementById('reassign-select').value;
    const btn = document.getElementById('btn-confirm-reassign');

    if (!newEmp) { alert('يرجى اختيار موظف'); return; }

    if (confirm(`هل أنت متأكد من تغيير المكلف إلى ${newEmp}؟`)) {
        // تغيير حالة الزر
        const originalText = btn.textContent;
        btn.textContent = 'جاري الاتصال...';
        btn.disabled = true;

        try {
            // جلب بيانات المستخدم الحالي لتسجيل من قام بالتعديل
            const userStr = localStorage.getItem('iag_user');
            const currentUser = userStr ? JSON.parse(userStr).name : 'المنسق';

            // الاتصال بالباك إند
            const res = await fetch(CONFIG.API_URL, {
                method: 'POST',
                body: JSON.stringify({
                    action: 'reassignTask',      // اسم الدالة في Google Apps Script
                    taskId: taskId,              // رقم المهمة
                    newEmployee: newEmp,         // الموظف الجديد
                    updatedBy: currentUser       // من قام بالتعديل
                })
            });

            const data = await res.json();

            if (data.success) {
                alert('✅ تم تغيير المكلف بنجاح، وتم إرسال الإشعار.');
                closeEnhancementModal('modal-reassign');
                // تحديث البيانات في الصفحة
                if(typeof loadData === 'function') {
                    const u = JSON.parse(localStorage.getItem('iag_user'));
                    loadData(u.name); 
                }
            } else {
                alert('❌ حدث خطأ: ' + (data.error || 'لم يتم التعديل'));
            }

        } catch (error) {
            console.error(error);
            alert('❌ خطأ في الاتصال بالخادم');
        } finally {
            // إعادة الزر لحالته الأصلية
            btn.textContent = originalText;
            btn.disabled = false;
        }
    }
}

// ب) تغيير الحالة
async function confirmStatusChange() {
    const taskId = document.getElementById('status-task-id').value;
    const newStatus = document.getElementById('status-select').value;
    const btn = document.getElementById('btn-confirm-status');

    if (confirm(`هل أنت متأكد من تغيير الحالة إلى "${newStatus}"؟`)) {
        // تغيير حالة الزر
        const originalText = btn.textContent;
        btn.textContent = 'جاري الحفظ...';
        btn.disabled = true;

        try {
            const userStr = localStorage.getItem('iag_user');
            const currentUser = userStr ? JSON.parse(userStr).name : 'المنسق';

            // الاتصال بالباك إند
            const res = await fetch(CONFIG.API_URL, {
                method: 'POST',
                body: JSON.stringify({
                    action: 'updateStatus',      // اسم الدالة في Google Apps Script
                    taskId: taskId,
                    newStatus: newStatus,
                    updatedBy: currentUser
                })
            });

            const data = await res.json();

            if (data.success) {
                alert('✅ تم تحديث الحالة بنجاح.');
                closeEnhancementModal('modal-status');
                // تحديث البيانات
                if(typeof loadData === 'function') {
                    const u = JSON.parse(localStorage.getItem('iag_user'));
                    loadData(u.name);
                }
            } else {
                alert('❌ حدث خطأ: ' + (data.error || 'لم يتم التعديل'));
            }

        } catch (error) {
            console.error(error);
            alert('❌ خطأ في الاتصال بالخادم');
        } finally {
            btn.textContent = originalText;
            btn.disabled = false;
        }
    }
}
