/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🔐 IAG System - نظام المصادقة
 * Authentication & API Handler
 * ═══════════════════════════════════════════════════════════════════════════
 */

class AuthManager {
  constructor() {
    this.currentUser = null;
    this.loadSession();
  }

  // 1. دالة الاتصال العامة (الجديدة - ضرورية لجلب البيانات)
  async apiCall(action, payload = {}) {
    try {
      // إظهار التحميل فقط إذا لم يكن مخفياً صراحة
      if (!payload.hideLoading) showLoading(true);
      
      const body = {
        action: action,
        user: this.currentUser ? this.currentUser.name : 'Guest',
        ...payload
      };

      const response = await fetch(CONFIG.apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' }, // text/plain لتجنب مشاكل CORS
        body: JSON.stringify(body)
      });

      const result = await response.json();
      
      if (!payload.hideLoading) showLoading(false);
      return result;

    } catch (error) {
      showLoading(false);
      console.error('API Error:', error);
      showMessage('خطأ في الاتصال بالسيرفر', 'error');
      return { success: false, error: error.message };
    }
  }

  // 2. تسجيل الدخول
  async login(pin) {
    // نستخدم apiCall لتبسيط الكود
    const result = await this.apiCall('login', { pin: pin });

    if (result.success) {
      this.currentUser = {
        name: result.name,
        role: result.role,
        email: result.email,
        pin: result.pin, // نحتفظ به للجلسة
        loginTime: new Date().toISOString()
      };
      
      this.saveSession();
      this.redirectToDashboard();
      return { success: true };
    } else {
      return { success: false, error: result.error || 'فشل تسجيل الدخول' };
    }
  }

  // حفظ الجلسة
  saveSession() {
    if (this.currentUser) {
      sessionStorage.setItem(STORAGE_KEYS.user, JSON.stringify(this.currentUser));
    }
  }

  // تحميل الجلسة
  loadSession() {
    try {
      const userData = sessionStorage.getItem(STORAGE_KEYS.user);
      if (userData) {
        this.currentUser = JSON.parse(userData);
        return this.currentUser;
      }
    } catch (e) {
      console.error('Session load error:', e);
    }
    return null;
  }

  // تسجيل الخروج
  logout() {
    this.currentUser = null;
    sessionStorage.clear();
    window.location.href = 'index.html';
  }

  // التحقق من الجلسة في الصفحات الداخلية
  checkSession() {
    if (!this.loadSession()) {
      window.location.href = 'index.html';
      return null;
    }
    return this.currentUser;
  }

  // التوجيه
  redirectToDashboard() {
    const role = this.currentUser.role;
    if (role === 'مدير' || role === 'Admin') {
      window.location.href = 'admin.html';
    } else if (role === 'منسق') {
        window.location.href = 'coordinator.html';
    } else {
      window.location.href = 'employee.html';
    }
  }
}

// إنشاء الكائن العام
const auth = new AuthManager();

// دوال مساعدة للواجهة
function showLoading(show) {
  const loader = document.getElementById('loading-overlay');
  if (loader) loader.style.display = show ? 'flex' : 'none';
}

function showMessage(message, type = 'error') {
  const msgDiv = document.getElementById('message-box');
  if (msgDiv) {
    msgDiv.textContent = message;
    // دعم فئات Tailwind أو CSS العادي
    msgDiv.className = type === 'error' 
      ? 'fixed top-4 left-1/2 transform -translate-x-1/2 px-6 py-3 rounded-lg bg-red-500 text-white font-bold z-50 shadow-xl' 
      : 'fixed top-4 left-1/2 transform -translate-x-1/2 px-6 py-3 rounded-lg bg-emerald-500 text-white font-bold z-50 shadow-xl';
    
    msgDiv.style.display = 'block';
    setTimeout(() => { msgDiv.style.display = 'none'; }, 3000);
  } else {
    alert(message);
  }
}

// تفعيل النموذج في صفحة الدخول
document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('login-form');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const pin = document.getElementById('pin-input').value;
      if (pin) auth.login(pin);
    });
  }
});
