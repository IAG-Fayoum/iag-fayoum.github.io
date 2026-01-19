/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🔐 IAG System - نظام المصادقة والاتصال (Optimized & Safe)
 * الإصدار النهائي: يدعم الكاش الذكي + حماية الذاكرة + وضع المدير
 * ═══════════════════════════════════════════════════════════════════════════
 */

class AuthManager {
  constructor() {
    this.currentUser = null;
    this.loadSession();
    // مدة الاحتفاظ بالبيانات في الكاش: 5 دقائق (300000 مللي ثانية)
    this.CACHE_DURATION = 5 * 60 * 1000; 
  }

  // 1. دالة الاتصال الرئيسية (API Call)
  // options: { useCache: true/false } -> للتحكم في استخدام الذاكرة
  async apiCall(action, payload = {}, options = { useCache: true }) {
    const cacheKey = `api_${action}_${JSON.stringify(payload)}`;
    
    // 🅰️ محاولة القراءة من الكاش (فقط لطلبات الجلب 'get' وإذا كان الكاش مفعلاً)
    if (options.useCache && action.startsWith('get')) {
      try {
        const cachedItem = sessionStorage.getItem(cacheKey);
        if (cachedItem) {
          const { data, timestamp } = JSON.parse(cachedItem);
          // إذا كانت البيانات حديثة (لم يمر عليها 5 دقائق)
          if (Date.now() - timestamp < this.CACHE_DURATION) {
            console.log('🚀 Serving from Cache (Fast Mode):', action);
            return data;
          }
        }
      } catch (e) {
        console.warn('⚠️ Cache read error (Skipping):', e);
      }
    }

    // 🅱️ الاتصال بالسيرفر (Network Request)
    try {
      if (!payload.hideLoading) showLoading(true);
      
      const body = {
        action: action,
        user: this.currentUser ? this.currentUser.name : 'Guest',
        ...payload
      };

      // استخدام text/plain لتجنب مشاكل CORS المعقدة في Apps Script
      const response = await fetch(CONFIG.API_URL, {
        method: 'POST',
        body: JSON.stringify(body)
      });

      const result = await response.json();
      
      if (!payload.hideLoading) showLoading(false);

      // ©️ حفظ النتيجة في الكاش (مع حماية ضد امتلاء الذاكرة)
      // نحفظ فقط إذا كانت العملية ناجحة، ومن نوع get، والكاش مفعل
      if (result.success && action.startsWith('get') && options.useCache) {
        try {
          sessionStorage.setItem(cacheKey, JSON.stringify({
            data: result,
            timestamp: Date.now()
          }));
        } catch (e) {
          // هنا الحماية: إذا امتلأت الذاكرة، نتجاهل الحفظ ونكمل العمل طبيعي
          console.warn('⚠️ Cache quota exceeded - Data returned live without saving.');
          // تنظيف جزئي للكاش القديم لمحاولة توفير مساحة للمرة القادمة
          this.clearOldCache();
        }
      }

      return result;

    } catch (error) {
      showLoading(false);
      console.error('❌ API Error:', error);
      showMessage('خطأ في الاتصال بالسيرفر', 'error');
      
      // 🆘 محاولة إنقاذ الموقف: استرجاع نسخة قديمة من الكاش حتى لو منتهية الصلاحية
      if (options.useCache && action.startsWith('get')) {
        const cachedItem = sessionStorage.getItem(cacheKey);
        if (cachedItem) {
          showMessage('تنبيه: يتم عرض بيانات محفوظة (وضع غير متصل)', 'warning');
          return JSON.parse(cachedItem).data;
        }
      }
      
      return { success: false, error: error.message };
    }
  }

  // 2. تنظيف الكاش (تستخدم عند الخروج أو تحديث البيانات)
  clearCache() {
    try {
      Object.keys(sessionStorage).forEach(key => {
        if (key.startsWith('api_')) {
          sessionStorage.removeItem(key);
        }
      });
      console.log('🧹 Cache cleared.');
    } catch (e) { console.error(e); }
  }

  // تنظيف الكاش القديم فقط (لتحرير مساحة)
  clearOldCache() {
    try {
      const now = Date.now();
      Object.keys(sessionStorage).forEach(key => {
        if (key.startsWith('api_')) {
          const item = JSON.parse(sessionStorage.getItem(key));
          if (now - item.timestamp > this.CACHE_DURATION) {
            sessionStorage.removeItem(key);
          }
        }
      });
    } catch (e) { }
  }

  // 3. تسجيل الدخول
  async login(pin) {
    // اللوجن دائماً "مباشر" بدون كاش
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
      this.clearCache(); // مسح كاش المستخدم السابق
      this.redirectToDashboard();
      return { success: true };
    } else {
      return { success: false, error: result.error || 'فشل تسجيل الدخول' };
    }
  }

  // إدارة الجلسة (Session Management)
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
    sessionStorage.clear(); // مسح شامل
    window.location.href = 'index.html';
  }

  checkSession() {
    if (!this.loadSession()) {
      window.location.href = 'index.html';
      return null;
    }
    return this.currentUser;
  }

  // التوجيه (Routing)
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

// --- أدوات الواجهة (UI Helpers) ---

function showLoading(show) {
  const loader = document.getElementById('loading-overlay');
  if (loader) loader.style.display = show ? 'flex' : 'none';
}

function showMessage(message, type = 'error') {
  const msgDiv = document.getElementById('message-box');
  if (msgDiv) {
    msgDiv.textContent = message;
    
    // تنسيق الألوان حسب نوع الرسالة
    let bgClass = 'bg-red-500'; // error default
    if (type === 'success') bgClass = 'bg-emerald-500';
    if (type === 'warning') bgClass = 'bg-amber-500';

    msgDiv.className = `fixed top-4 left-1/2 transform -translate-x-1/2 px-6 py-3 rounded-lg ${bgClass} text-white font-bold z-50 shadow-xl fade-in`;
    
    msgDiv.style.display = 'block';
    setTimeout(() => { msgDiv.style.display = 'none'; }, 3000);
  } else {
    // Fallback if UI element missing
    console.log(`[${type}] ${message}`);
  }
}

// تفعيل زر الدخول في صفحة index.html
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
