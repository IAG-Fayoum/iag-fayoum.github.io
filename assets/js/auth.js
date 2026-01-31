/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🔐 IAG System - Authentication & Core Logic (v3.0)
 * ═══════════════════════════════════════════════════════════════════════════
 */

const CONFIG = {
    // ⚠️ هام جداً: استبدل الرابط أدناه برابط النشر الخاص بك (Deployment URL)
    // الذي ينتهي بـ /exec
    API_URL: "https://script.google.com/macros/s/AKfycbyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX/exec",
};

const auth = {
    
    // 1. حالة المستخدم الحالية
    currentUser: null,

    // 2. دالة الاتصال بالسيرفر (API Call)
    async callAPI(action, data = {}) {
        if (!CONFIG.API_URL || CONFIG.API_URL.includes("XXX")) {
            alert("⚠️ تنبيه: يرجى وضع رابط السكريبت (Deployment URL) في ملف auth.js");
            return { success: false, error: "Configuration Error" };
        }

        const payload = {
            action: action,
            ...data
        };

        try {
            const response = await fetch(CONFIG.API_URL, {
                method: "POST",
                mode: "cors", // مهم جداً للتعامل مع جوجل
                headers: {
                    "Content-Type": "text/plain;charset=utf-8", // text/plain لتجنب مشاكل CORS Preflight
                },
                body: JSON.stringify(payload),
            });

            const result = await response.json();
            return result;

        } catch (error) {
            console.error("API Error:", error);
            return { success: false, error: "فشل الاتصال بالسيرفر. تأكد من الإنترنت." };
        }
    },

    // 3. تسجيل الدخول (مع التوجيه الذكي)
    async login(mobile, pin) {
        // تنظيف المدخلات
        mobile = mobile.trim();
        pin = pin.trim();

        const result = await this.callAPI("login", { mobile, pin });

        if (result.success) {
            // حفظ بيانات المستخدم في المتصفح
            this.currentUser = {
                name: result.name,
                role: result.role,
                jobTitle: result.jobTitle,
                mobile: result.mobile,
                loginTime: new Date().getTime()
            };
            localStorage.setItem("user", JSON.stringify(this.currentUser));

            // 🚀 التوجيه الذكي (Routing Logic)
            this.redirectUser(result.role);
        }

        return result;
    },

    // 4. دالة التوجيه بناءً على الصلاحية
    redirectUser(role) {
        // توحيد المسميات (عربي/إنجليزي)
        const r = role.toLowerCase();

        if (r === 'admin' || r === 'مدير' || r.includes('إدارة')) {
            window.location.href = 'admin.html';
        } 
        else if (r === 'coordinator' || r === 'منسق') {
            window.location.href = 'coordinator.html';
        } 
        else {
            // الموظف العادي
            window.location.href = 'employee.html';
        }
    },

    // 5. التحقق من الجلسة (يعمل عند تحميل أي صفحة)
    checkAuth() {
        const storedUser = localStorage.getItem("user");
        
        if (!storedUser) {
            // لو مش مسجل دخول وهو مش في صفحة الدخول، ارجعه للدخول
            if (!window.location.pathname.endsWith("index.html") && !window.location.pathname.endsWith("/")) {
                window.location.href = "index.html";
            }
            return null;
        }

        this.currentUser = JSON.parse(storedUser);
        
        // (اختياري) التحقق من انتهاء صلاحية الجلسة (مثلاً 24 ساعة)
        const now = new Date().getTime();
        if (now - this.currentUser.loginTime > 24 * 60 * 60 * 1000) {
            this.logout();
            return null;
        }

        return this.currentUser;
    },

    // 6. تسجيل الخروج
    logout() {
        localStorage.removeItem("user");
        this.currentUser = null;
        window.location.href = "index.html";
    },

    // 7. تهيئة الواجهة (إخفاء عناصر الإدارة عن الموظفين)
    setupUI() {
        if (!this.currentUser) return;

        const role = this.currentUser.role.toLowerCase();
        const isAdmin = role === 'admin' || role === 'مدير';
        const isCoord = role === 'coordinator' || role === 'منسق';

        // عناصر تظهر للمدير فقط
        const adminElements = document.querySelectorAll('.only-admin');
        adminElements.forEach(el => {
            if (!isAdmin) {
                el.classList.add('hidden'); // إخفاء تام
                el.style.display = 'none';  // زيادة تأكيد
            } else {
                el.classList.remove('hidden');
                el.style.display = ''; 
            }
        });

        // تحديث اسم المستخدم والصورة
        const nameEl = document.getElementById('user-name');
        const roleEl = document.getElementById('user-role');
        const avatarEl = document.getElementById('user-avatar');

        if (nameEl) nameEl.textContent = this.currentUser.name;
        if (roleEl) roleEl.textContent = this.currentUser.jobTitle || role;
        if (avatarEl) avatarEl.textContent = this.currentUser.name.charAt(0);
    }
};

// تشغيل التحقق تلقائياً عند تحميل الملف
// (إلا إذا كنا في صفحة الدخول، ننتظر المستخدم يضغط زر الدخول)
if (!window.location.pathname.endsWith("index.html") && !window.location.pathname.endsWith("/")) {
    auth.checkAuth();
}
