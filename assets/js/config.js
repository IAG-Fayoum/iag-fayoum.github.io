/**
 * ⚙️ IAG System - Configuration File
 * هذا الملف يحتوي على الروابط والإعدادات فقط
 */

const CONFIG = {
    // 🔗 رابط السكريبت (Web App URL) - تأكد إنه ينتهي بـ /exec
    // هذا الرابط هو الرابط الجديد (Turbo) الذي قمت بنشره
    API_URL: "https://script.google.com/macros/s/AKfycbzB0a7A7Dq4j5-l_-4YkBH1c-cOmgi7kIFP6Da8ZjM1CLfz9xZIncim13cJfc2LPyru3A/exec",

    // 📝 روابط نماذج جوجل (Google Forms)
    // استبدل الروابط الوهمية (#) بالروابط الحقيقية الخاصة بك
    FORMS: {
        INBOX: "https://docs.google.com/forms/d/e/YOUR_FORM_ID/viewform",      // نموذج الصادر والوارد
        COMPLAINTS: "https://docs.google.com/forms/d/e/YOUR_FORM_ID/viewform", // نموذج الشكاوى
        FINANCIAL: "https://docs.google.com/forms/d/e/YOUR_FORM_ID/viewform",  // المرور المالي
        PRIMARY_CARE: "https://docs.google.com/forms/d/e/YOUR_FORM_ID/viewform", // الرعاية الأولية
        HOSPITALS: "https://docs.google.com/forms/d/e/YOUR_FORM_ID/viewform"    // المستشفيات
    }
};
