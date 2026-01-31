/**
 * 🔐 IAG System - Core Authentication & Routing (v7.1 Turbo)
 */

const CONFIG = {
    // ⚠️ ضع رابط النشر الجديد هنا
    API_URL: "https://script.google.com/macros/s/AKfycbzB0a7A7Dq4j5-l_-4YkBH1c-cOmgi7kIFP6Da8ZjM1CLfz9xZIncim13cJfc2LPyru3A/exec", 
    
    // روابط النماذج (يمكنك تعديلها لاحقاً)
    FORMS: {
        INBOX: "https://forms.google.com/example1",
        COMPLAINTS: "https://forms.google.com/example2",
        FINANCIAL: "https://forms.google.com/example3",
        PRIMARY_CARE: "https://forms.google.com/example4",
        HOSPITALS: "https://forms.google.com/example5"
    }
};

const auth = {
    currentUser: null,

    async callAPI(action, data = {}) {
        if (!CONFIG.API_URL || CONFIG.API_URL.includes("XXX")) {
            alert("⚠️ تنبيه: يرجى وضع رابط السكريبت في ملف auth.js");
            return { success: false, error: "Config Error" };
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
            return { success: false, error: "خطأ في الاتصال" };
        }
    },

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

    redirectUser(role) {
        const r = role.toLowerCase();
        if (r === 'admin' || r === 'مدير') window.location.href = 'admin.html';
        else if (r === 'coordinator' || r === 'منسق') window.location.href = 'coordinator.html';
        else window.location.href = 'employee.html';
    },

    checkAuth() {
        const stored = localStorage.getItem("user");
        if (!stored) {
            if (!window.location.pathname.endsWith("index.html") && !window.location.pathname.endsWith("/")) {
                window.location.href = "index.html";
            }
            return null;
        }
        this.currentUser = JSON.parse(stored);
        return this.currentUser;
    },

    logout() {
        localStorage.removeItem("user");
        window.location.href = "index.html";
    },

    setupUI() {
        if (!this.currentUser) return;
        
        // إظهار/إخفاء عناصر الأدمن
        const isAdmin = this.currentUser.role === 'admin' || this.currentUser.role === 'مدير';
        document.querySelectorAll('.only-admin').forEach(el => {
            el.style.display = isAdmin ? '' : 'none';
        });

        // تعبئة البيانات
        const els = {
            name: document.getElementById('user-name'),
            role: document.getElementById('user-role'),
            avatar: document.getElementById('user-avatar')
        };
        if (els.name) els.name.textContent = this.currentUser.name;
        if (els.role) els.role.textContent = this.currentUser.jobTitle;
        if (els.avatar) els.avatar.textContent = this.currentUser.name.charAt(0);
    }
};

// تشغيل التحقق تلقائياً (إلا في صفحة الدخول)
if (!window.location.pathname.endsWith("index.html") && !window.location.pathname.endsWith("/")) {
    auth.checkAuth();
}
