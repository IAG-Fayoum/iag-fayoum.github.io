/**
 * 🔐 IAG System - Authentication & Logic (v8.0 Final)
 * - يدعم المرور لصفحة forms.html بدون تسجيل دخول
 * - يعتمد على config.js
 */

const auth = {
    
    // بيانات المستخدم الحالي
    currentUser: null,

    /**
     * 1. الاتصال بالسيرفر (API Call)
     */
    async callAPI(action, data = {}) {
        // التأكد إن ملف الإعدادات موجود
        if (typeof CONFIG === 'undefined') {
            alert("خطأ جسيم: ملف config.js غير موجود!");
            return { success: false, error: "Config Missing" };
        }

        // تجهيز البيانات
        const payload = { action, ...data };

        try {
            const response = await fetch(CONFIG.API_URL, {
                method: "POST",
                mode: "cors", // مهم عشان الكروس دومين
                headers: { "Content-Type": "text/plain;charset=utf-8" },
                body: JSON.stringify(payload),
            });
            return await response.json();
        } catch (error) {
            console.error("API Error:", error);
            return { success: false, error: "فشل الاتصال بالسيرفر، تأكد من الإنترنت" };
        }
    },

    /**
     * 2. تسجيل الدخول
     */
    async login(mobile, pin) {
        // نبعت للباك إند يتحقق
        const result = await this.callAPI("login", { mobile: mobile.trim(), pin: pin.trim() });

        if (result.success) {
            // لو تمام، نحفظ البيانات في المتصفح
            this.currentUser = {
                name: result.name,
                role: result.role,
                jobTitle: result.jobTitle,
                mobile: result.mobile,
                email: result.email
            };
            localStorage.setItem("user", JSON.stringify(this.currentUser));
            
            // نوجهه للصفحة بتاعته
            this.redirectUser(result.role);
        }
        return result;
    },

    /**
     * 3. التوجيه الذكي حسب الوظيفة
     */
    redirectUser(role) {
        const r = (role || '').toLowerCase().trim();
        
        if (r === 'admin' || r === 'مدير' || r === 'مدير النظام') {
            window.location.href = 'admin.html';
        } 
        else if (r === 'coordinator' || r === 'منسق') {
            window.location.href = 'coordinator.html';
        } 
        else {
            // أي حد تاني يروح صفحة الموظف
            window.location.href = 'employee.html';
        }
    },

    /**
     * 4. التحقق من الجلسة (هل مسجل دخول؟)
     */
    checkAuth() {
        const stored = localStorage.getItem("user");
        if (!stored) return null;
        
        this.currentUser = JSON.parse(stored);
        return this.currentUser;
    },

    /**
     * 5. تسجيل الخروج
     */
    logout() {
        localStorage.removeItem("user");
        window.location.href = "index.html";
    }
};

/* 🛡️ نظام الحماية والتوجيه التلقائي
   -----------------------------------
   الكود ده بيشتغل أول ما أي صفحة تفتح عشان يتأكد:
   1. هل الصفحة دي محتاجة دخول؟
   2. لو محتاجة، هل المستخدم مسجل؟
*/
(function protectRoute() {
    const path = window.location.pathname;
    
    // الصفحات المسموح بزيارتها بدون تسجيل دخول (Public Pages)
    // ضفنا forms.html هنا عشان تفتح عادي
    const publicPages = [
        "index.html", 
        "forms.html", 
        "/" // الصفحة الرئيسية
    ];

    // هل الصفحة الحالية واحدة من الصفحات العامة؟
    const isPublic = publicPages.some(page => path.endsWith(page));

    if (!isPublic) {
        // لو دي صفحة "محمية" (زي admin او employee)
        const user = auth.checkAuth();
        
        if (!user) {
            // لو مش مسجل دخول، اطرده لصفحة الدخول فوراً
            window.location.href = "index.html";
        }
    }
})();
