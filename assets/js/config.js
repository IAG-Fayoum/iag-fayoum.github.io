/**
 * ⚙️ IAG System Configuration (v2.0)
 * ملف الإعدادات المركزي - ممنوع التعديل عليه إلا لتحديث الروابط
 */

const CONFIG = {
  // 1. رابط الاتصال بالسيرفر (Google Apps Script Web App URL)
  // تم التحديث بتاريخ: اليوم
  API_URL: "https://script.google.com/macros/s/AKfycbzB0a7A7Dq4j5-l_-4YkBH1c-cOmgi7kIFP6Da8ZjM1CLfz9xZIncim13cJfc2LPyru3A/exec",

  // 2. روابط النماذج الإلكترونية (Google Forms)
  FORMS: {
    INBOX: "https://docs.google.com/forms/d/e/1FAIpQLSeJhAdpfoQAs6wqMDUD12N_H4YnL0Xv9KITCj2pHGCaKSyhJA/viewform",
    COMPLAINTS: "https://docs.google.com/forms/d/e/1FAIpQLSeLbdP8tzEyNFaVI53h0jfHMp3j9uJL-mLors14rIjuUQaGIg/viewform",
    FINANCIAL: "https://docs.google.com/forms/d/e/1FAIpQLSfe94k6Im0Y4IODqw3UCLAczVQYdKivnyZ2s8SiCAU4uTwwpA/viewform",
    PRIMARY_CARE: "https://docs.google.com/forms/d/e/1FAIpQLSePbkn17cO2EFDUm4-7A4Le560ep6Zce9-QlyTdP7MEG_eAew/viewform",
    HOSPITALS: "https://docs.google.com/forms/d/e/1FAIpQLSedsoD3zW51Lwd7VanPQ1hVMB3OTmmaorOATiMieTXjaOBbRw/viewform"
  },

  // 3. إعدادات النظام
  APP_VERSION: "2.0.0",
  ORG_NAME: "إدارة المراجعة الداخلية والحوكمة"
};

// حماية الملف من التعديل الخطأ
Object.freeze(CONFIG);
