/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🔐 IAG System - نظام المصادقة
 * Authentication Module
 * ═══════════════════════════════════════════════════════════════════════════
 */

class AuthManager {
  constructor() {
    this.currentUser = null;
    this.loadSession();
  }

  // تسجيل الدخول
  async login(pin) {
    try {
      showLoading(true);
      
      const response = await fetch(CONFIG.apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'login',
          pin: pin.trim()
        })
      });

      const result = await response.json();

      if (result.success) {
        this.currentUser = {
          name: result.name,
          role: result.role,
          pin: result.pin,
          loginTime: new Date().toISOString()
        };
        
        this.saveSession();
        this.redirectToDashboard();
        return { success: true };
      } else {
        return { success: false, error: result.error || 'فشل تسجيل الدخول' };
      }

    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: 'خطأ في الاتصال بالسيرفر' };
    } finally {
      showLoading(false);
    }
  }

  // حفظ الجلسة
  saveSession() {
    if (this.currentUser) {
      sessionStorage.setItem(STORAGE_KEYS.user, JSON.stringify(this.currentUser));
      sessionStorage.setItem(STORAGE_KEYS.token, btoa(this.currentUser.pin));
    }
  }

  // تحميل الجلسة
  loadSession() {
    try {
      const userData = sessionStorage.getItem(STORAGE_KEYS.user);
      if (userData) {
        this.currentUser = JSON.parse(userData);
        
        // فحص انتهاء الجلسة
        const loginTime = new Date(this.currentUser.loginTime);
        const elapsed = Date.now() - loginTime.getTime();
        
        if (elapsed > CONFIG.settings.sessionTimeout) {
          this.logout();
          return null;
        }
        
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

  // فحص الصلاحية
  hasRole(requiredRole) {
    if (!this.currentUser) return false;
    if (this.currentUser.role === CONFIG.roles.admin) return true;
    return this.currentUser.role === requiredRole;
  }

  // التوجيه للصفحة المناسبة
  redirectToDashboard() {
    const role = this.currentUser.role;
    
    if (role === CONFIG.roles.admin) {
      window.location.href = 'admin.html';
    } else {
      window.location.href = 'employee.html';
    }
  }

  // فحص الجلسة على الصفحات المحمية
  requireAuth() {
    if (!this.loadSession()) {
      window.location.href = 'index.html';
      return false;
    }
    return true;
  }
}

// إنشاء instance عام
const auth = new AuthManager();

// دوال مساعدة
function showLoading(show) {
  const loader = document.getElementById('loading-overlay');
  if (loader) {
    loader.style.display = show ? 'flex' : 'none';
  }
}

function showMessage(message, type = 'error') {
  const msgDiv = document.getElementById('message-box');
  if (msgDiv) {
    msgDiv.textContent = message;
    msgDiv.className = `message-box ${type} show`;
    
    setTimeout(() => {
      msgDiv.classList.remove('show');
    }, 4000);
  }
}

// معالج نموذج تسجيل الدخول
function handleLoginForm() {
  const form = document.getElementById('login-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const pinInput = document.getElementById('pin-input');
    const pin = pinInput.value.trim();
    
    if (!pin) {
      showMessage('الرجاء إدخال رمز الدخول', 'error');
      return;
    }

    const result = await auth.login(pin);
    
    if (!result.success) {
      showMessage(result.error, 'error');
      pinInput.value = '';
      pinInput.focus();
    }
  });
}

// تحميل تلقائي
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', handleLoginForm);
} else {
  handleLoginForm();
}
