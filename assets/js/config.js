/**
 * IAG System Configuration
 * ------------------------
 * مركز التحكم في الروابط والإعدادات
 */

const CONFIG = {
  // 1. رابط الـ Backend (Google Apps Script Web App URL)
  // ⚠️ هام: استبدل هذا الرابط برابط السكربت الخاص بك بعد النشر
  API_URL: 'YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL_HERE',

  // 2. روابط النماذج الإلكترونية (Google Forms)
  // يمكنك تحديث الروابط هنا فقط وسيتغير في الموقع بالكامل
  FORMS: {
    INBOX: "https://docs.google.com/forms/d/e/1FAIpQLSeJhAdpfoQAs6wqMDUD12N_H4YnL0Xv9KITCj2pHGCaKSyhJA/viewform",
    COMPLAINTS: "https://docs.google.com/forms/d/e/1FAIpQLSeLbdP8tzEyNFaVI53h0jfHMp3j9uJL-mLors14rIjuUQaGIg/viewform",
    FINANCIAL: "https://docs.google.com/forms/d/e/1FAIpQLSfe94k6Im0Y4IODqw3UCLAczVQYdKivnyZ2s8SiCAU4uTwwpA/viewform",
    PRIMARY_CARE: "https://docs.google.com/forms/d/e/1FAIpQLSePbkn17cO2EFDUm4-7A4Le560ep6Zce9-QlyTdP7MEG_eAew/viewform",
    HOSPITALS: "https://docs.google.com/forms/d/e/1FAIpQLSedsoD3zW51Lwd7VanPQ1hVMB3OTmmaorOATiMieTXjaOBbRw/viewform"
  },

  // 3. إعدادات النظام العامة
  APP_VERSION: "1.2.0",
  ORG_NAME: "مديرية الشؤون الصحية بالفيوم"
};

// تجميد الكائن لمنع التعديل عليه بالخطأ أثناء التشغيل
Object.freeze(CONFIG);
