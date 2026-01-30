/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🔐 IAG System - نظام المصادقة والاتصال (v3.0 - Performance Optimized)
 * الإصدار: محسّن للسرعة + Cache ذكي + تقليل API calls
 * ═══════════════════════════════════════════════════════════════════════════
 */

// ═══════════════════════════════════════════════════════════════════════════
// 1. CLASS: AuthManager
// ═══════════════════════════════════════════════════════════════════════════

class AuthManager {
  // 1.1 Constructor
  constructor() {
    this.currentUser = null;
    this.loadSession();
    this.CACHE_DURATION = 3 * 60 * 1000; // 3 دقائق (كان 5)
  }

  // ═══════════════════════════════════════════════════════════════════════
  // 2. API CALLS (محسّن)
  // ═══════════════════════════════════════════════════════════════════════

  // 2.1 دالة الاتصال الرئيسية (محسّنة)
  async apiCall(action, payload = {}, options = { useCache: true }) {
    const cacheKey = `api_${action}_${JSON.stringify(payload)}`;
    
    // 2.1.1 محاولة القراءة من الكاش (محسّن)
    if (options.useCache && action.startsWith('get')) {
      try {
        const cachedItem = sessionStorage.getItem(cacheKey);
        if (cachedItem) {
          const { data, timestamp } = JSON.parse(cachedItem);
          if (Date.now() - timestamp < this.CACHE_DURATION) {
            return data;
          }
        }
      } catch (e) {
        // تجاهل الأخطاء
      }
    }

    // 2.1.2 الاتصال بالسيرفر (محسّن)
    try {
      if (!payload.hideLoading) showLoading(true);
      
      const body = {
        action: action,
        user: this.currentUser ? this.currentUser.name : 'Guest',
        ...payload
      };

      // تقليل timeout من 10 ثانية إلى 8 ثوانٍ
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const response = await fetch(CONFIG.API_URL, {
        method: 'POST',
        body: JSON.stringify(body),
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      const result = await response.json();
      
      if (!payload.hideLoading) showLoading(false);

      // 2.1.3 حفظ النتيجة في الكاش (محسّن)
      if (result.success && action.startsWith('get') && options.useCache) {
        try {
          sessionStorage.setItem(cacheKey, JSON.stringify({
            data: result,
            timestamp: Date.now()
          }));
        } catch (e) {
          // تنظيف تلقائي
          this.clearOldCache();
        }
      }

      return result;

    } catch (error) {
      showLoading(false);
      
      // 2.1.4 محاولة الإنقاذ من الكاش
      if (options.useCache && action.startsWith('get')) {
        const cachedItem = sessionStorage.getItem(cacheKey);
        if (cachedItem) {
          showMessage('يتم عرض بيانات محفوظة', 'warning');
          return JSON.parse(cachedItem).data;
        }
      }
      
      return { success: false, error: error.message };
    }
  }

  // 2.2 تنظيف الكاش (محسّن)
  clearCache() {
    try {
      Object.keys(sessionStorage).forEach(key => {
        if (key.startsWith('api_')) {
          sessionStorage.removeItem(key);
        }
      });
    } catch (e) { }
  }

  // 2.3 تنظيف الكاش القديم (محسّن)
  clearOldCache() {
    try {
      const now = Date.now();
      Object.keys(sessionStorage).forEach(key => {
        if (key.startsWith('api_')) {
          try {
            const item = JSON.parse(sessionStorage.getItem(key));
            if (now - item.timestamp > this.CACHE_DURATION) {
              sessionStorage.removeItem(key);
            }
          } catch (e) {
            sessionStorage.removeItem(key);
          }
        }
      });
    } catch (e) { }
  }

  // ═══════════════════════════════════════════════════════════════════════
  // 3. AUTHENTICATION (محسّن للسرعة)
  // ═══════════════════════════════════════════════════════════════════════

  // 3.1 تسجيل الدخول (محسّن - بدون جلب الإشعارات)
  async login(mobile, pin) {
    const result = await this.apiCall('login', { 
      mobile: mobile, 
      pin: pin 
    }, { useCache: false });

    if (result.success) {
      // 3.1.1 حفظ بيانات المستخدم
      this.currentUser = {
        name: result.name,
        email: result.email,
        jobTitle: result.jobTitle,
        role: result.role,
        mobile: result.mobile,
        pin: result.pin,
        loginTime: new Date().toISOString()
      };
      
      this.saveSession();
      this.clearCache();
      
      // 3.1.2 التوجيه للصفحة المناسبة (فوراً بدون تأخير)
      this.redirectToDashboard();
      return { success: true };
    } else {
      return { success: false, error: result.error || 'فشل تسجيل الدخول' };
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  // 4. SESSION MANAGEMENT
  // ═══════════════════════════════════════════════════════════════════════

  // 4.1 حفظ الجلسة
  saveSession() {
    if (this.currentUser) {
      sessionStorage.setItem('iag_user', JSON.stringify(this.currentUser));
    }
  }

  // 4.2 تحميل الجلسة
  loadSession() {
    try {
      const userData = sessionStorage.getItem('iag_user');
      if (userData) {
        this.currentUser = JSON.parse(userData);
        return this.currentUser;
      }
    } catch (e) { }
    return null;
  }

  // 4.3 تسجيل الخروج
  logout() {
    this.currentUser = null;
    sessionStorage.clear();
    window.location.href = 'index.html';
  }

  // 4.4 التحقق من الجلسة
  checkSession() {
    if (!this.loadSession()) {
      window.location.href = 'index.html';
      return null;
    }
    return this.currentUser;
  }
  
  // 4.5 جلب عدد الإشعارات غير المقروءة
  getUnreadNotifications() {
    return parseInt(sessionStorage.getItem('unreadNotifications') || '0');
  }

  // ═══════════════════════════════════════════════════════════════════════
  // 5. ROUTING
  // ═══════════════════════════════════════════════════════════════════════

  // 5.1 التوجيه حسب الصلاحية
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

// ═══════════════════════════════════════════════════════════════════════════
// 6. GLOBAL INSTANCE
// ═══════════════════════════════════════════════════════════════════════════

const auth = new AuthManager();

// ═══════════════════════════════════════════════════════════════════════════
// 7. UI HELPERS
// ═══════════════════════════════════════════════════════════════════════════

// 7.1 عرض/إخفاء Loading
function showLoading(show) {
  const loader = document.getElementById('loading-overlay');
  if (loader) loader.style.display = show ? 'flex' : 'none';
}

// 7.2 عرض رسالة
function showMessage(message, type = 'error') {
  const msgDiv = document.getElementById('message-box');
  if (msgDiv) {
    msgDiv.textContent = message;
    
    let bgClass = 'bg-red-500';
    if (type === 'success') bgClass = 'bg-emerald-500';
    if (type === 'warning') bgClass = 'bg-amber-500';

    msgDiv.className = `fixed top-4 left-1/2 transform -translate-x-1/2 px-6 py-3 rounded-lg ${bgClass} text-white font-bold z-50 shadow-xl`;
    
    msgDiv.style.display = 'block';
    setTimeout(() => { msgDiv.style.display = 'none'; }, 3000);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 8. EVENT LISTENERS
// ═══════════════════════════════════════════════════════════════════════════

// 8.1 تفعيل زر الدخول
document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('login-form');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const mobile = document.getElementById('mobile-input').value;
      const pin = document.getElementById('pin-input').value;
      if (mobile && pin) auth.login(mobile, pin);
    });
  }
});
