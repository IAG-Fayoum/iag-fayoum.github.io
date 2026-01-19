/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🔐 IAG System - نظام المصادقة والاتصال السريع (Cached)
 * ═══════════════════════════════════════════════════════════════════════════
 */

class AuthManager {
  constructor() {
    this.currentUser = null;
    this.loadSession();
    // مدة الكاش: 5 دقائق (بالمللي ثانية)
    this.CACHE_DURATION = 5 * 60 * 1000; 
  }

  // 1. دالة الاتصال الذكية (مع التخزين المؤقت)
  async apiCall(action, payload = {}, options = { useCache: true }) {
    const cacheKey = `api_${action}_${JSON.stringify(payload)}`;
    
    // أ- محاولة القراءة من الكاش أولاً (لطلبات الجلب فقط)
    if (options.useCache && action.startsWith('get')) {
      const cachedItem = sessionStorage.getItem(cacheKey);
      if (cachedItem) {
        const { data, timestamp } = JSON.parse(cachedItem);
        // إذا كانت البيانات حديثة (أقل من 5 دقائق) نرجعها فوراً
        if (Date.now() - timestamp < this.CACHE_DURATION) {
          console.log('🚀 Serving from Cache:', action);
          return data;
        }
      }
    }

    // ب- إذا لم يوجد كاش أو انتهت مدته، نطلب من السيرفر
    try {
      if (!payload.hideLoading) showLoading(true);
      
      const body = {
        action: action,
        user: this.currentUser ? this.currentUser.name : 'Guest',
        ...payload
      };

      const response = await fetch(CONFIG.API_URL, {
        method: 'POST',
        body: JSON.stringify(body)
      });

      const result = await response.json();
      
      if (!payload.hideLoading) showLoading(false);

      // ج- حفظ النتيجة في الكاش (إذا كانت عملية ناجحة ومن نوع get)
      if (result.success && action.startsWith('get')) {
        sessionStorage.setItem(cacheKey, JSON.stringify({
          data: result,
          timestamp: Date.now()
        }));
      }

      return result;

    } catch (error) {
      showLoading(false);
      console.error('API Error:', error);
      showMessage('خطأ في الاتصال بالسيرفر', 'error');
      
      // في حالة الخطأ، نحاول استرجاع نسخة قديمة من الكاش "لإنقاذ الموقف"
      if (options.useCache && action.startsWith('get')) {
        const cachedItem = sessionStorage.getItem(cacheKey);
        if (cachedItem) {
          showMessage('جاري عرض بيانات محفوظة (وضع الأوفلاين)', 'warning');
          return JSON.parse(cachedItem).data;
        }
      }
      
      return { success: false, error: error.message };
    }
  }

  // 2. دالة لمسح الكاش (عند التحديث اليدوي أو تسجيل الخروج)
  clearCache() {
    Object.keys(sessionStorage).forEach(key => {
      if (key.startsWith('api_')) {
        sessionStorage.removeItem(key);
      }
    });
  }

  // 3. تسجيل الدخول
  async login(pin) {
    // اللوجن لا يستخدم الكاش أبداً
    const result = await this.apiCall('login', { pin: pin }, { useCache: false });

    if (result.success) {
      this.currentUser = {
        name: result.name,
        role: result.role,
        email: result.email,
        pin: result.pin,
        loginTime: new Date().toISOString()
      };
      
      this.saveSession();
      this.clearCache(); // مسح أي كاش قديم عند دخول جديد
      this.redirectToDashboard();
      return { success: true };
    } else {
      return { success: false, error: result.error || 'فشل تسجيل الدخول' };
    }
  }

  saveSession() {
    if (this.currentUser) {
      sessionStorage.setItem('iag_user', JSON.stringify(this.currentUser));
    }
  }

  loadSession() {
    try {
      const userData = sessionStorage.getItem('iag_user');
      if (userData) {
        this.currentUser = JSON.parse(userData);
        return this.currentUser;
      }
    } catch (e) { console.error(e); }
    return null;
  }

  logout() {
    this.currentUser = null;
    sessionStorage.clear(); // مسح كل شيء (جلسة + كاش)
    window.location.href = 'index.html';
  }

  checkSession() {
    if (!this.loadSession()) {
      window.location.href = 'index.html';
      return null;
    }
    return this.currentUser;
  }

  redirectToDashboard() {
    const role = this.currentUser.role;
    if (role === 'مدير' || role === 'Admin') window.location.href = 'admin.html';
    else if (role === 'منسق') window.location.href = 'coordinator.html';
    else window.location.href = 'employee.html';
  }
}

const auth = new AuthManager();

// UI Helpers
function showLoading(show) {
  const loader = document.getElementById('loading-overlay');
  if (loader) loader.style.display = show ? 'flex' : 'none';
}

function showMessage(message, type = 'error') {
  const msgDiv = document.getElementById('message-box');
  if (msgDiv) {
    msgDiv.textContent = message;
    msgDiv.className = type === 'error' 
      ? 'fixed top-4 left-1/2 transform -translate-x-1/2 px-6 py-3 rounded-lg bg-red-500 text-white font-bold z-50 shadow-xl' 
      : (type === 'warning' 
          ? 'fixed top-4 left-1/2 transform -translate-x-1/2 px-6 py-3 rounded-lg bg-amber-500 text-white font-bold z-50 shadow-xl'
          : 'fixed top-4 left-1/2 transform -translate-x-1/2 px-6 py-3 rounded-lg bg-emerald-500 text-white font-bold z-50 shadow-xl');
    
    msgDiv.style.display = 'block';
    setTimeout(() => { msgDiv.style.display = 'none'; }, 3000);
  } else { alert(message); }
}

// Login Handler
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
