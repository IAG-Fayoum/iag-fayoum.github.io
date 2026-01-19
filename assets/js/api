/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🏛️ نظام الحوكمة - API Controller
 * النسخة النهائية - تم المراجعة ✅
 * ═══════════════════════════════════════════════════════════════════════════
 */

const API_URL = "https://script.google.com/macros/s/AKfycbzi68xXxFmLlTd-w0ADsf_A7S1100sYjfusWeZNGTyOf7_PlRhsPYTO6iCrTyj7mz996w/exec";

// ═══════════════════════════════════════════════════════════════════════════
// 🔌 API CALLS
// ═══════════════════════════════════════════════════════════════════════════

async function callAPI(action, params = {}) {
    showLoader();
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            body: JSON.stringify({ action, ...params })
        });
        
        if (!response.ok) throw new Error('فشل الاتصال بالخادم');
        
        const data = await response.json();
        hideLoader();
        return data;

    } catch (error) {
        hideLoader();
        console.error('API Error:', error);
        alert('⚠️ خطأ في الاتصال: تأكد من الإنترنت');
        return { success: false, error: error.message };
    }
}

// Compatibility functions
async function login(pin) {
    return await callAPI('login', { pin });
}

async function getDashboard(start, end) {
    return await callAPI('getDashboard', { start, end });
}

async function searchArchive(filters) {
    return await callAPI('searchArchive', { filters: JSON.stringify(filters) });
}

// ═══════════════════════════════════════════════════════════════════════════
// 🎨 UI HELPERS
// ═══════════════════════════════════════════════════════════════════════════

function showLoader() {
    const loader = document.getElementById('loader');
    if (loader) loader.classList.remove('hidden-section');
}

function hideLoader() {
    const loader = document.getElementById('loader');
    if (loader) loader.classList.add('hidden-section');
}

function logout() {
    localStorage.clear();
    window.location.href = 'index.html';
}

console.log('✅ API Controller Ready');
