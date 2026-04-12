/* ══════════════════════════════════════════════
   index.js — Login Page Logic
   IAG System 2026 — منطق تسجيل الدخول
   ══════════════════════════════════════════════ */

lucide.createIcons();

// التحقق التلقائي عند التحميل: إذا مسجل دخول وجهه فوراً
window.addEventListener('load', () => {
  const userStr = localStorage.getItem('iag_user');
  if (userStr) {
    try {
      const user = JSON.parse(userStr);
      redirectUser(user);
    } catch(e) {
      localStorage.removeItem('iag_user');
    }
  } else {
    const mobileInput = document.getElementById('mobile-input');
    if (mobileInput) setTimeout(() => mobileInput.focus(), 100);
  }
});

const loginForm = document.getElementById('login-form');
const loginBtn  = document.getElementById('login-btn');
const errorMsg  = document.getElementById('error-msg');
const errorText = document.getElementById('error-text');

if (loginForm) {
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (typeof auth === 'undefined') {
      errorText.textContent = 'خطأ في النظام: ملف المصادقة مفقود';
      errorMsg.classList.remove('hidden');
      return;
    }

    const mobile = document.getElementById('mobile-input').value.trim();
    const pin    = document.getElementById('pin-input').value.trim();

    errorMsg.classList.add('hidden');

    if (mobile.length !== 11 || !/^01[0-2,5]\d{8}$/.test(mobile)) {
      errorText.textContent = 'رقم الموبايل غير صحيح';
      errorMsg.classList.remove('hidden');
      return;
    }

    if (pin.length < 4) {
      errorText.textContent = 'تأكد من رمز الدخول';
      errorMsg.classList.remove('hidden');
      return;
    }

    const originalBtn = loginBtn.innerHTML;
    loginBtn.innerHTML = '<span class="loading-text">جاري التحقق...</span>';
    loginBtn.disabled = true;

    try {
      const result = await auth.login(mobile, pin);

      if (!result.success) {
        throw new Error(result.error || 'بيانات غير صحيحة');
      }

      redirectUser(auth.currentUser);

    } catch (error) {
      errorText.textContent = error.message === 'Failed to fetch'
        ? 'خطأ في الاتصال بالخادم'
        : error.message;
      errorMsg.classList.remove('hidden');

      loginBtn.innerHTML = originalBtn;
      loginBtn.disabled = false;
      lucide.createIcons();
    }
  });
}

function redirectUser(user) {
  const r = (user.role || '').toLowerCase().trim();
  if (r === 'admin' || r === 'مدير' || r === 'مدير النظام') {
    window.location.href = 'admin.html';
  } else if (r === 'coordinator' || r === 'منسق') {
    window.location.href = 'coordinator.html';
  } else {
    window.location.href = 'employee.html';
  }
}
