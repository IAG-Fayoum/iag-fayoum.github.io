// Coordinator Enhancements Script
// Adds Reassign & Status Change Functionality without modifying original HTML structure excessively.

document.addEventListener('DOMContentLoaded', () => {
    injectModals();
});

// 1. Inject Modals HTML into the DOM
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
                <button onclick="confirmReassign()" class="px-4 py-2 bg-teal-600 text-white rounded-lg font-bold hover:bg-teal-700">تأكيد التغيير</button>
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
                    <option value="جديد">جديدة</option>
                    <option value="مكلف بها">مكلف بها</option>
                    <option value="متابعة">قيد التنفيذ / متابعة</option>
                    <option value="بانتظار">معلقة / بانتظار</option>
                    <option value="تم">منتهية / تم الاعتماد</option>
                </select>
            </div>
            <div class="modal-footer flex gap-2 justify-end p-4 bg-gray-50 border-t">
                <button onclick="confirmStatusChange()" class="px-4 py-2 bg-teal-600 text-white rounded-lg font-bold hover:bg-teal-700">حفظ الحالة</button>
                <button onclick="closeEnhancementModal('modal-status')" class="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-bold hover:bg-gray-300">إلغاء</button>
            </div>
        </div>
    </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    lucide.createIcons();
}

// 2. Open Functions (To be called from buttons)
function openReassignModal(taskId) {
    document.getElementById('reassign-task-id').value = taskId;
    const select = document.getElementById('reassign-select');
    select.innerHTML = '<option value="">-- تحميل القائمة... --</option>';
    
    // Simulate loading employees (Use 'allEmployees' from coordinator.html scope if available, else mock)
    // Assuming 'allEmployees' is global in coordinator.html
    if (typeof allEmployees !== 'undefined' && allEmployees.length > 0) {
        select.innerHTML = '<option value="">-- اختر من القائمة --</option>';
        allEmployees.forEach(emp => {
            const opt = document.createElement('option');
            opt.value = emp.name;
            opt.textContent = emp.name;
            select.appendChild(opt);
        });
    } else {
        // Fallback or fetch again
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

// 3. Confirm Logic
function confirmReassign() {
    const taskId = document.getElementById('reassign-task-id').value;
    const newEmp = document.getElementById('reassign-select').value;

    if (!newEmp) { alert('يرجى اختيار موظف'); return; }

    if (confirm(`هل أنت متأكد من تغيير المكلف إلى ${newEmp}؟`)) {
        // Mock API Call
        const btn = document.querySelector('#modal-reassign button.bg-teal-600');
        const originalText = btn.textContent;
        btn.textContent = 'جاري الحفظ...';
        btn.disabled = true;

        setTimeout(() => {
            alert('تم تغيير المكلف بنجاح ✓');
            btn.textContent = originalText;
            btn.disabled = false;
            closeEnhancementModal('modal-reassign');
            // Refresh data if possible
            if(typeof applyFilters === 'function') applyFilters();
        }, 1000);
    }
}

function confirmStatusChange() {
    const taskId = document.getElementById('status-task-id').value;
    const newStatus = document.getElementById('status-select').value;

    if (confirm(`هل أنت متأكد من تغيير الحالة إلى "${newStatus}"؟`)) {
        // Mock API Call
        const btn = document.querySelector('#modal-status button.bg-teal-600');
        const originalText = btn.textContent;
        btn.textContent = 'جاري الحفظ...';
        btn.disabled = true;

        setTimeout(() => {
            alert('تم تغيير الحالة بنجاح ✓');
            btn.textContent = originalText;
            btn.disabled = false;
            closeEnhancementModal('modal-status');
            // Refresh data if possible
            if(typeof applyFilters === 'function') applyFilters();
        }, 1000);
    }
}
