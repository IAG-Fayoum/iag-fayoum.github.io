/**
 * 🔐 IAG System - Authentication & Logic (v7.1 Clean)
 * يعتمد على config.js
 */

const auth = {
    
    // حالة المستخدم
    currentUser: null,

    // الاتصال بالسيرفر
    async callAPI(action, data = {}) {
        // التحقق من وجود ملف الكونفيج
        if (typeof CONFIG === 'undefined') {
            alert("خطأ: ملف config.js مفقود أو لم يتم تحميله!");
            return { success: false, error: "Missing Config" };
        }

        const payload = { action, ...data };

        try {
            const response = await fetch(CONFIG.API_URL, {
                method: "POST",
                mode: "cors",
                headers: { "Content-Type": "text/plain;charset=utf-8" },
                body: JSON.stringify(payload),
            });
            return await response.json();
        } catch (error) {
            console.error("API Error:", error);
            return { success: false, error: "فشل الاتصال بالسيرفر" };
        }
    },

    // تسجيل الدخول
    async login(mobile, pin) {
        const result = await this.callAPI("login", { mobile: mobile.trim(), pin: pin.trim() });

        if (result.success) {
            this.currentUser = {
                name: result.name,
                role: result.role,
                jobTitle: result.jobTitle,
                mobile: result.mobile,
                loginTime: Date.now()
            };
            localStorage.setItem("user", JSON.stringify(this.currentUser));
            this.redirectUser(result.role);
        }
        return result;
    },

    // التوجيه الذكي
    redirectUser(role) {
        const r = role.toLowerCase();
        if (r === 'admin' || r === 'مدير') window.location.href = 'admin.html';
        else if (r === 'coordinator' || r === 'منسق') window.location.href = 'coordinator.html';
        else window.location.href = 'employee.html';
    },

    // التحقق من الجلسة
    checkAuth() {
        const stored = localStorage.getItem("user");
        if (!stored) {
            // لو مش في صفحة الدخول، ارجع للدخول
            if (!window.location.pathname.endsWith("index.html") && !window.location.pathname.endsWith("/")) {
                window.location.href = "index.html";
            }
            return null;
        }
        this.currentUser = JSON.parse(stored);
        return this.currentUser;
    },

    // الخروج
    logout() {
        localStorage.removeItem("user");
        window.location.href = "index.html";
    },

    // تهيئة الواجهة (للمدير فقط)
    setupUI() {
        if (!this.currentUser) return;
        
        const isAdmin = this.currentUser.role === 'admin' || this.currentUser.role === 'مدير';
        document.querySelectorAll('.only-admin').forEach(el => {
            el.style.display = isAdmin ? '' : 'none';
        });

        // تعبئة البيانات في الهيدر
        const nameEl = document.getElementById('user-name');
        const roleEl = document.getElementById('user-role');
        const avatarEl = document.getElementById('user-avatar');

        if (nameEl) nameEl.textContent = this.currentUser.name;
        if (roleEl) roleEl.textContent = this.currentUser.jobTitle || this.currentUser.role;
        if (avatarEl) avatarEl.textContent = this.currentUser.name.charAt(0);
    }
};

// تشغيل التحقق تلقائياً
if (!window.location.pathname.endsWith("index.html") && !window.location.pathname.endsWith("/")) {
    auth.checkAuth();
}
