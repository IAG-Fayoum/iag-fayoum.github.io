/**
 * 🔐 Auth Manager (v2.0)
 * مسؤول عن: تسجيل الدخول، الحماية، وتوجيه المستخدمين حسب الصلاحية
 */

class AuthManager {
  constructor() {
    this.currentUser = this.loadUser();
  }

  // 1. تحميل المستخدم من الذاكرة
  loadUser() {
    const userStr = sessionStorage.getItem('iag_user');
    return userStr ? JSON.parse(userStr) : null;
  }

  // 2. عملية تسجيل الدخول
  async login(mobile, pin) {
    try {
      // إظهار التحميل (إذا وجد عنصر loading)
      this.toggleLoading(true);

      const response = await fetch(CONFIG.API_URL, {
        method: 'POST',
        mode: 'no-cors', // هام جداً لتجنب مشاكل CORS مع Google
        cache: 'no-cache',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'login', mobile, pin })
      });

      // ملاحظة: مع no-cors لا يمكننا قراءة الرد مباشرة في بعض المتصفحات
      // لذلك نستخدم تقنية text/plain في Apps Script والآن نستخدم fetch عادي
      // لكن للتوافق الأفضل سنستخدم الطريقة التي نجحت معك سابقاً (POST مع redirect) 
      // أو الطريقة الحالية إذا كان الـ Backend يدعم CORS.
      
      // *تعديل هام:* بما أننا استخدمنا ContentService في Apps Script، 
      // سنستخدم fetch مع redirect: 'follow' للحصول على النتيجة.
      
      const result = await this.callAPI('login', { mobile, pin });

      if (result.success) {
        this.saveSession(result);
        return { success: true, role: result.role };
      } else {
        return { success: false, error: result.error };
      }

    } catch (error) {
      console.error('Login Error:', error);
      return { success: false, error: 'فشل الاتصال بالخادم' };
    } finally {
      this.toggleLoading(false);
    }
  }

  // 3. دالة الاتصال الموحدة (Core API Call)
  async callAPI(action, data = {}) {
    const payload = { action, ...data };
    
    // إرسال الطلب
    const response = await fetch(CONFIG.API_URL, {
      method: "POST",
      body: JSON.stringify(payload)
    });
    
    return await response.json();
  }

  // 4. حفظ الجلسة وتوجيه المستخدم
  saveSession(userData) {
    const sessionData = {
      name: userData.name,
      role: userData.role, // 'admin', 'coordinator', 'employee'
      jobTitle: userData.jobTitle,
      mobile: userData.mobile,
      loginTime: new Date().getTime()
    };
    
    sessionStorage.setItem('iag_user', JSON.stringify(sessionData));
    this.currentUser = sessionData;
    
    // التوجيه التلقائي
    this.redirectBasedOnRole();
  }

  // 5. التوجيه حسب الصلاحية
  redirectBasedOnRole() {
    if (!this.currentUser) return;

    // الكل يذهب للداشبورد (الرئيسية) كبداية، وهي تختلف حسب الدور
    window.location.href = 'distribution.html';
  }

  // 6. التحقق من الصلاحية (يوضع في بداية كل صفحة)
  checkAuth() {
    if (!this.currentUser) {
      window.location.href = 'index.html';
      return null;
    }
    return this.currentUser;
  }

  // 7. تسجيل الخروج
  logout() {
    sessionStorage.removeItem('iag_user');
    window.location.href = 'index.html';
  }

  // 8. إعداد الواجهة (إخفاء زر الإدارة للموظفين)
  setupUI() {
    const user = this.currentUser;
    if (!user) return;

    // التعامل مع عناصر القائمة "للإدارة فقط"
    const adminElements = document.querySelectorAll('.only-admin');
    
    if (user.role === 'employee') {
      // إخفاء عناصر الإدارة للموظف العادي
      adminElements.forEach(el => el.style.display = 'none');
    } else {
      // إظهارها للمدير والمنسق
      adminElements.forEach(el => {
        if (el.tagName === 'LI' || el.tagName === 'DIV') {
            el.style.display = 'flex'; // أو block حسب التصميم
        } else {
            el.style.display = 'block';
        }
      });
    }
  }

  toggleLoading(show) {
    const loader = document.getElementById('loading-overlay');
    if (loader) loader.style.display = show ? 'flex' : 'none';
  }
}

// تهيئة الكائن ليكون متاحاً في كل الصفحات
const auth = new AuthManager();
