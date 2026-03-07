/**
 * 🔐 IAG System - Authentication & Logic (v8.1)
 * - يدعم المرور لصفحة forms.html بدون تسجيل دخول
 * - يعتمد على config.js
 */

const auth = {

    currentUser: null,

    // 1. API Call
    async callAPI(action, data = {}) {
        if (typeof CONFIG === 'undefined') {
            return { success: false, error: "Config Missing" };
        }
        try {
            const response = await fetch(CONFIG.API_URL, {
                method: "POST",
                mode: "cors",
                headers: { "Content-Type": "text/plain;charset=utf-8" },
                body: JSON.stringify({ action, ...data }),
            });
            return await response.json();
        } catch (error) {
            console.error("API Error:", error);
            return { success: false, error: "فشل الاتصال بالسيرفر، تأكد من الإنترنت" };
        }
    },

    // 2. تسجيل الدخول — يحفظ فقط، التوجيه في index.html
    async login(mobile, pin) {
        const result = await this.callAPI("login", { mobile: mobile.trim(), pin: pin.trim() });
        if (result.success) {
            this.currentUser = {
                name: result.name,
                role: result.role,
                jobTitle: result.jobTitle,
                mobile: result.mobile,
                email: result.email
            };
            localStorage.setItem("iag_user", JSON.stringify(this.currentUser));
        }
        return result;
    },

    // 3. التحقق من الجلسة
    checkAuth() {
        const stored = localStorage.getItem("iag_user");
        if (!stored) return null;
        try {
            this.currentUser = JSON.parse(stored);
            return this.currentUser;
        } catch (e) {
            localStorage.removeItem("iag_user");
            return null;
        }
    },

    // 4. تسجيل الخروج — موحد في كل الصفحات
    logout() {
        localStorage.removeItem("iag_user");
        localStorage.removeItem("iag_last_page");
        window.location.href = "index.html";
    }
};

// 🛡️ حماية الصفحات المقيدة
(function protectRoute() {
    const path = window.location.pathname;
    const publicPages = ["index.html", "forms.html", "/"];
    const isPublic = publicPages.some(page => path.endsWith(page));
    if (!isPublic) {
        if (!auth.checkAuth()) {
            window.location.href = "index.html";
        }
    }
})();
