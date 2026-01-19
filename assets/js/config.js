/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🏛️ IAG System - التكوين المركزي (Config)
 * تم التحديث ليتوافق مع auth.js الجديد
 * ═══════════════════════════════════════════════════════════════════════════
 */

const CONFIG = {
  // 1. رابط السيرفر (Google Apps Script Web App URL)
  // هام جداً: يجب أن يكون الاسم API_URL بحروف كبيرة
  API_URL: 'https://script.google.com/macros/s/AKfycbzB0a7A7Dq4j5-l_-4YkBH1c-cOmgi7kIFP6Da8ZjM1CLfz9xZIncim13cJfc2LPyru3A/exec',
  
  // 2. معلومات الإصدار
  VERSION: '6.1.0',
  
  // 3. تعريف الصلاحيات (للمطابقة مع شيت الإكسل)
  ROLES: {
    ADMIN: 'مدير',
    COORDINATOR: 'منسق',
    EMPLOYEE: 'موظف'
  },

  // 4. إعدادات النظام العامة
  SETTINGS: {
    APP_NAME: 'IAG Governance Hub',
    ORG_NAME: 'مديرية الشؤون الصحية بالفيوم',
    TIMEOUT_MS: 30000 // 30 ثانية حد أقصى للانتظار
  }
};
