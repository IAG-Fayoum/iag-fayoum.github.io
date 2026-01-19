/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🏛️ IAG System - التكوين المركزي
 * Governance Hub Configuration
 * ═══════════════════════════════════════════════════════════════════════════
 */

const CONFIG = {
  // معلومات النظام
  systemName: 'Governance Hub',
  systemNameAr: 'منصة إدارة المراجعة الداخلية والحوكمة',
  organization: 'وزارة الصحة والسكان - محافظة الفيوم',
  organizationEn: 'Ministry of Health - Fayoum Governorate',
  version: '6.0',
  
  // API Endpoint
  apiUrl: 'https://script.google.com/macros/s/AKfycbxvVFWza61a404wH_pFwpC-ykul9z6qI7HcX2LcrMsZUM3nU60z315_L0QaRnN83jZXag/exec',
  
  // الألوان الرئيسية
  colors: {
    primary: '#0f766e',
    primaryDark: '#115e59',
    secondary: '#0f172a',
    success: '#10b981',
    warning: '#f59e0b',
    danger: '#ef4444',
    info: '#3b82f6'
  },
  
  // الإعدادات
  settings: {
    sessionTimeout: 3600000, // 1 ساعة
    maxRetries: 3,
    requestTimeout: 30000, // 30 ثانية
    cacheExpiry: 300000 // 5 دقائق
  },
  
  // الصلاحيات
  roles: {
    admin: 'مدير',
    technical: 'مراجع فني',
    financial: 'مراجع مالي وإداري',
    staff: 'موظف'
  },
  
  // حالات المهام
  taskStatuses: {
    new: 'جديد',
    inProgress: 'جاري العمل',
    pending: 'قيد المراجعة',
    overdue: 'متأخر',
    completed: 'تم الاعتماد',
    archived: 'أرشيف'
  }
};

// Session Storage Keys
const STORAGE_KEYS = {
  user: 'iag_user',
  token: 'iag_token',
  lastSync: 'iag_last_sync',
  cachedData: 'iag_cache'
};

// تصدير للاستخدام
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { CONFIG, STORAGE_KEYS };
}
