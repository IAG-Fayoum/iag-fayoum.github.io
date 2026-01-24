/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🔐 IAG System - نظام المصادقة والاتصال (v2.0 - Mobile + PIN)
 * الإصدار: يدعم الكاش الذكي + حماية الذاكرة + وضع المدير
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
    this.CACHE_DURATION = 5 * 60 * 1000; // 5 دقائق
  }

  // ═══════════════════════════════════════════════════════════════════════
  // 2. API CALLS
  // ═══════════════════════════════════════════════════════════════════════

  // 2.1 دالة الاتصال الرئيسية
  async apiCall(action, payload = {}, options = { useCache: true }) {
    const cacheKey = `api_${action}_${JSON.stringify(payload)}`;
    
    // 2.1.1 محاولة القراءة من الكاش
    if (options.useCache && action.startsWith('get')) {
      try {
        const cachedItem = sessionStorage.getItem(cacheKey);
        if (cachedItem) {
          const { data, timestamp } = JSON.parse(cachedItem);
          if (Date.now() - timestamp < this.CACHE_DURATION) {
            console.log('🚀 Serving from Cache (Fast Mode):', action);
            return data;
          }
        }
      } catch (e) {
        console.warn('⚠️ Cache read error (Skipping):', e);
      }
    }

    // 2.1.2 الاتصال بالسيرفر
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

      // 2.1.3 حفظ النتيجة في الكاش
      if (result.success && action.startsWith('get') && options.useCache) {
        try {
          sessionStorage.setItem(cacheKey, JSON.stringify({
            data: result,
            timestamp: Date.now()
          }));
        } catch (e) {
          console.warn('⚠️ Cache quota exceeded - Data returned live without saving.');
          this.clearOldCache();
        }
      }

      return result;

    } catch (error) {
      showLoading(false);
      console.error('❌ API Error:', error);
      showMessage('خطأ في الاتصال بالسيرفر', 'error');
      
      // 2.1.4 محاولة الإنقاذ من الكاش
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

  // 2.2 تنظيف الكاش
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

  // 2.3 تنظيف الكاش القديم
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

  // ═══════════════════════════════════════════════════════════════════════
  // 3. AUTHENTICATION
  // ═══════════════════════════════════════════════════════════════════════

  // 3.1 تسجيل الدخول (Mobile + PIN)
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
      
      // 3.1.2 جلب الإشعارات
      try {
        const notifResult = await this.apiCall('getNotifications', {
          employeeName: result.name,
          filterType: 'unread'
        }, { useCache: false, hideLoading: true });
        
        if (notifResult.success) {
          sessionStorage.setItem('unreadNotifications', notifResult.unreadCount || 0);
        }
      } catch (e) {
        console.warn('⚠️ فشل جلب الإشعارات:', e);
      }
      
      // 3.1.3 التوجيه للصفحة المناسبة
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
    } catch (e) { console.error(e); }
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

    msgDiv.className = `fixed top-4 left-1/2 transform -translate-x-1/2 px-6 py-3 rounded-lg ${bgClass} text-white font-bold z-50 shadow-xl fade-in`;
    
    msgDiv.style.display = 'block';
    setTimeout(() => { msgDiv.style.display = 'none'; }, 3000);
  } else {
    console.log(`[${type}] ${message}`);
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
