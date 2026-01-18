/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🧠 CORE DATA CONTROLLER - العقل المدبر
 * يجيب الداتا مرة واحدة ويوزعها على كل الصفحات
 * ═══════════════════════════════════════════════════════════════════════════
 */

const API_URL = "https://script.google.com/macros/s/AKfycbzi68xXxFmLlTd-w0ADsf_A7S1100sYjfusWeZNGTyOf7_PlRhsPYTO6iCrTyj7mz996w/exec";

// 📦 GLOBAL STATE (الذاكرة المركزية)
const AppState = {
    user: null,
    allData: null,
    lastUpdate: null
};

// ═══════════════════════════════════════════════════════════════════════════
// 🔌 API CALLER (الاتصال الموحد)
// ═══════════════════════════════════════════════════════════════════════════

async function callAPI(action, params = {}) {
    showLoader();
    try {
        const url = new URL(API_URL);
        url.searchParams.append('action', action);
        Object.keys(params).forEach(key => {
            url.searchParams.append(key, params[key]);
        });

        const response = await fetch(url, { method: 'GET' });
        
        if (!response.ok) throw new Error('Network error');
        
        const data = await response.json();
        hideLoader();
        return data;

    } catch (error) {
        hideLoader();
        console.error('API Error:', error);
        showError('فشل الاتصال بالخادم');
        return { success: false, error: error.message };
    }
}

async function postAPI(action, payload = {}) {
    showLoader();
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            body: JSON.stringify({ action, ...payload })
        });
        
        if (!response.ok) throw new Error('Network error');
        
        const data = await response.json();
        hideLoader();
        return data;

    } catch (error) {
        hideLoader();
        console.error('API Error:', error);
        showError('فشل الاتصال بالخادم');
        return { success: false, error: error.message };
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// 🔐 AUTHENTICATION (المصادقة المركزية)
// ═══════════════════════════════════════════════════════════════════════════

async function login(pin) {
    const result = await callAPI('auth', { pin });
    
    if (result.success) {
        AppState.user = result;
        saveToStorage('user', result);
        return result;
    }
    
    return { success: false, error: result.error };
}

function logout() {
    AppState.user = null;
    AppState.allData = null;
    clearStorage();
    window.location.href = 'index.html';
}

function getCurrentUser() {
    if (!AppState.user) {
        const stored = getFromStorage('user');
        if (stored) AppState.user = stored;
    }
    return AppState.user;
}

// ═══════════════════════════════════════════════════════════════════════════
// 📊 DATA FETCHING (جلب البيانات المركزي)
// ═══════════════════════════════════════════════════════════════════════════

async function fetchDashboardData(startDate, endDate) {
    const data = await callAPI('getDashboard', { 
        start: startDate, 
        end: endDate 
    });
    
    if (data.totals) {
        AppState.allData = data;
        AppState.lastUpdate = new Date();
        return data;
    }
    
    return null;
}

async function fetchEmployeeData(employeeName) {
    const data = await callAPI('getAllData', { name: employeeName });
    return data;
}

async function searchArchive(filters) {
    const result = await callAPI('searchArchive', { 
        filters: JSON.stringify(filters) 
    });
    return result;
}

// ═══════════════════════════════════════════════════════════════════════════
// 💾 LOCAL STORAGE (التخزين المحلي)
// ═══════════════════════════════════════════════════════════════════════════

function saveToStorage(key, value) {
    try {
        localStorage.setItem(`gov_${key}`, JSON.stringify(value));
    } catch (e) {
        console.error('Storage error:', e);
    }
}

function getFromStorage(key) {
    try {
        const item = localStorage.getItem(`gov_${key}`);
        return item ? JSON.parse(item) : null;
    } catch (e) {
        return null;
    }
}

function clearStorage() {
    try {
        Object.keys(localStorage).forEach(key => {
            if (key.startsWith('gov_')) {
                localStorage.removeItem(key);
            }
        });
    } catch (e) {
        console.error('Clear storage error:', e);
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// 🎨 UI HELPERS (المساعدات المشتركة)
// ═══════════════════════════════════════════════════════════════════════════

function showLoader() {
    const loader = document.getElementById('loader');
    if (loader) loader.classList.remove('hidden');
}

function hideLoader() {
    const loader = document.getElementById('loader');
    if (loader) loader.classList.add('hidden');
}

function showError(message) {
    // يمكن استبداله بـ Toast notification
    alert('⚠️ ' + message);
}

function showSuccess(message) {
    alert('✅ ' + message);
}

function formatDate(dateStr) {
    if (!dateStr) return '-';
    const parts = dateStr.split('/');
    if (parts.length === 3) {
        return `${parts[0]}/${parts[1]}/${parts[2]}`;
    }
    return dateStr;
}

function getYearOptions() {
    const currentYear = new Date().getFullYear();
    let html = '';
    for (let y = 2024; y <= currentYear + 1; y++) {
        html += `<option value="${y}" ${y === currentYear ? 'selected' : ''}>${y}</option>`;
    }
    return html;
}

function getMonthOptions() {
    const months = [
        'يناير', 'فبراير', 'مارس', 'إبريل', 'مايو', 'يونيو',
        'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
    ];
    let html = '<option value="">-- كل الشهور --</option>';
    months.forEach((m, i) => {
        html += `<option value="${i + 1}">${m}</option>`;
    });
    return html;
}

// ═══════════════════════════════════════════════════════════════════════════
// 🔄 ROUTER (التوجيه البسيط)
// ═══════════════════════════════════════════════════════════════════════════

function checkAuth() {
    const user = getCurrentUser();
    if (!user) {
        window.location.href = 'index.html';
        return false;
    }
    return true;
}

function routeByRole(role) {
    if (role.includes('مدير')) {
        return 'admin.html';
    } else if (role.includes('منسق')) {
        return 'coordinator.html';
    } else {
        return 'employee.html';
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// 🚀 INITIALIZATION
// ═══════════════════════════════════════════════════════════════════════════

console.log('✅ Core Controller Loaded');
