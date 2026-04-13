/**
 * 01_Config.gs  (IAG V0.09)
 * Source of Truth — CONFIG + SHEETS + BUSINESS + FOLDERS + compat layer
 *
 * التغييرات في V0.09:
 *   - إضافة CAR_SECTIONS في cfg00V8_SHEETS
 *
 * Prefix: cfg00V8_
 */

/* ============================================================
   1. Canonical Sheet Names
   ============================================================ */
const cfg00V8_SHEETS = Object.freeze({

  /* ── Reference ─────────────────────────────────────── */
  SYSTEM_CONFIG:         "REF_SYSTEM_CONFIG",
  EMPLOYEES:             "REF_EMPLOYEES",
  DISTRIBUTION_RULES:    "REF_DIST_RULES",
  AI_GLOSSARY:           "REF_AI_GLOSSARY",
  FINDING_CODES:         "REF_FINDING_CODES",
  HEALTH_ADMINS:         "REF_HEALTH_ADMINS",

  /* ── Input (Read-Only) ──────────────────────────────── */
  INOUT_RESPONSES:       "IN_INOUT",
  COMPLAINTS_RESPONSES:  "IN_COMPLAINTS",
  TECH_HOSP_RESPONSES:   "IN_TECH_HOSP",
  TECH_UNITS_RESPONSES:  "IN_TECH_UNITS",
  FIN_RESPONSES:         "IN_FIN",

  /* ── Operations ─────────────────────────────────────── */
  INOUT_MASTER:          "OP_INOUT_MASTER",
  NOTIFICATIONS:         "OP_NOTIFICATIONS",
  PENDING_LINKS:         "OP_PENDING_LINKS",
  REPORTS_LOG:           "OP_REPORTS_LOG",
  AUDIT_LOG:             "OP_AUDIT_LOG",
  ERRORS_LOG:            "OP_ERRORS_LOG",
  SYSTEM_MONITOR:        "OP_SYSTEM_MONITOR",
  STATISTICS:            "OP_STATISTICS",
  PERMISSIONS_MATRIX:    "OP_PERMISSIONS_MATRIX",
  DIAGNOSTICS:           "OP_DIAGNOSTICS",

  /* ── Findings ───────────────────────────────── */
  FINDINGS:              "OP_FINDINGS",

  /* ── Hospital Sessions ──────────────────────── */
  HOSP_SESSIONS:         "OP_HOSP_SESSIONS",

  /* ── CAR ────────────────────────────────────── */
  CAR:                   "CAR_REGISTER",
  CAR_SECTIONS:          "CAR_SECTIONS",
  CAR_FOLLOWUP:          "CAR_FOLLOWUP",
  CAR_VERIFICATION:      "CAR_VERIFICATION",
  CAR_ESCALATIONS:       "CAR_ESCALATIONS",
  CAR_LEGAL:             "CAR_LEGAL"
});

/* ============================================================
   2. SYSTEM_CONFIG Keys
   ============================================================ */
const cfg00V8_CFG_KEYS = Object.freeze({
  WORK_SHARED_ID:                      "WORK_SHARED_ID",
  ARCHIVE_PRIVATE_ID:                  "ARCHIVE_PRIVATE_ID",

  TEMPLATE_ID_COMPLAINT_PROSECUTION:   "TEMPLATE_ID_COMPLAINT_PROSECUTION",
  TEMPLATE_ID_COMPLAINT_UNDERSECRETARY:"TEMPLATE_ID_COMPLAINT_UNDERSECRETARY",

  TEMPLATE_ID_TECH_HOSP:               "TEMPLATE_ID_TECH_HOSP",
  TEMPLATE_ID_TECH_UNITS:              "TEMPLATE_ID_TECH_UNITS",
  TEMPLATE_ID_FIN_ADMIN:               "TEMPLATE_ID_FIN_ADMIN",

  USE_GOVERNANCE:                      "USE_GOVERNANCE",

  GEMINI_API_KEY:                      "GEMINI_KEY",
  AI_ENABLED:                          "AI_ENABLED",
  AI_STRICT_MODE:                      "AI_STRICT_MODE",
  AI_MAX_REDUCTION_RATIO:              "AI_MAX_REDUCTION_RATIO",

  ADMIN_EMAIL:                         "ADMIN_EMAIL",
  MANAGER_EMAIL:                       "MANAGER_EMAIL"
});

/* ============================================================
   3. CONFIG — Public API
   ============================================================ */
const CONFIG = {
  VERSION: "V0.09",

  SPREADSHEET_ID:     "1GgDP5wOGIaynlbVX0UfSsnJXUfwBvFSgh7xJ3u0fI6Y",
  CAR_SPREADSHEET_ID: "1RQcTBG0m4mfyidXOi0creV-v44U3Qw-1VnAHrICXYQ0",

  SHEETS:      cfg00V8_SHEETS,
  CFG_KEYS:    cfg00V8_CFG_KEYS,
  SHEET_NAMES: cfg00V8_SHEETS,   // compat alias
  SHEETNAME:   cfg00V8_SHEETS,   // compat alias

  /** قراءة قيمة من REF_SYSTEM_CONFIG */
  get: function (key, defaultValue) {
    return cfg00V8_getConfigValue_(key, defaultValue);
  },

  /** IDs حرجة */
  getWorkSharedRootId: function () {
    var v = cfg00V8_getConfigValue_(cfg00V8_CFG_KEYS.WORK_SHARED_ID, "");
    if (v && v !== "PUT_FOLDER_ID_HERE") return v;
    var arch = cfg00V8_getConfigValue_(cfg00V8_CFG_KEYS.ARCHIVE_PRIVATE_ID, "");
    if (arch && arch !== "PUT_FOLDER_ID_HERE") return arch;
    throw new Error("Missing SYSTEM_CONFIG: WORK_SHARED_ID and ARCHIVE_PRIVATE_ID both empty");
  },
  getArchivePrivateRootId: function () {
    return cfg00V8_requireConfigValue_(cfg00V8_CFG_KEYS.ARCHIVE_PRIVATE_ID);
  },

  /** Templates */
  getTemplateComplaintProsecution: function () {
    var v = cfg00V8_getConfigValue_(cfg00V8_CFG_KEYS.TEMPLATE_ID_COMPLAINT_PROSECUTION, "");
    return v || "1lhY9A8xgWGgXcnpLNGiKD3CxEkDEwTS_XlxpY9iNL2w";
  },
  getTemplateComplaintUndersecretary: function () {
    var v = cfg00V8_getConfigValue_(cfg00V8_CFG_KEYS.TEMPLATE_ID_COMPLAINT_UNDERSECRETARY, "");
    return v || "1f0AAOQDcQd0P1-r-q9SlpD72B6hL7Ot_qLYw1NXtFiw";
  },
  getTemplateTechHosp: function () {
    var v = cfg00V8_getConfigValue_(cfg00V8_CFG_KEYS.TEMPLATE_ID_TECH_HOSP, "");
    return v || "1tBC5XQhWQGEaw7q2P5OAlMUEDPl9sDo9qSpJsdQbt1o";
  },
  getTemplateTechUnits: function () {
    var v = cfg00V8_getConfigValue_(cfg00V8_CFG_KEYS.TEMPLATE_ID_TECH_UNITS, "");
    return v || "14XeHVhGspf2SAQiyVovOXeDM8F-iHuG336aHx43DPhA";
  },
  getTemplateFinAdmin: function () {
    var v = cfg00V8_getConfigValue_(cfg00V8_CFG_KEYS.TEMPLATE_ID_FIN_ADMIN, "");
    if (!v || v === "PUT_TEMPLATE_ID_HERE") throw new Error("Missing SYSTEM_CONFIG key: TEMPLATE_ID_FIN_ADMIN");
    return v;
  },

  /** AI Settings */
  isAIEnabled: function () {
    var v = String(cfg00V8_getConfigValue_(cfg00V8_CFG_KEYS.AI_ENABLED, "FALSE")).toUpperCase();
    return v === "TRUE" || v === "1" || v === "YES";
  },
  isAIStrictMode: function () {
    var v = String(cfg00V8_getConfigValue_(cfg00V8_CFG_KEYS.AI_STRICT_MODE, "TRUE")).toUpperCase();
    return v === "TRUE" || v === "1" || v === "YES";
  },
  getAIMaxReductionRatio: function () {
    var raw = cfg00V8_getConfigValue_(cfg00V8_CFG_KEYS.AI_MAX_REDUCTION_RATIO, "0.90");
    var n = Number(raw);
    if (isNaN(n) || n <= 0 || n > 1) return 0.90;
    return n;
  },
  getGeminiKey: function () {
    var k = cfg00V8_getConfigValue_(cfg00V8_CFG_KEYS.GEMINI_API_KEY, "");
    if (k) return k;
    return PropertiesService.getScriptProperties().getProperty("GEMINI_API_KEY") || "";
  },

  /** Emails */
  getAdminEmail: function () {
    var v = cfg00V8_getConfigValue_(cfg00V8_CFG_KEYS.ADMIN_EMAIL, "");
    return v || "fhealth.governance@gmail.com";
  },
  getManagerEmail: function () {
    var v = cfg00V8_getConfigValue_(cfg00V8_CFG_KEYS.MANAGER_EMAIL, "");
    return v || "Ommm8765@gmail.com";
  },

  /** Health Check */
  healthCheckCriticalConfig: function () {
    var missing = [];
    var must = [
      cfg00V8_CFG_KEYS.WORK_SHARED_ID,
      cfg00V8_CFG_KEYS.ARCHIVE_PRIVATE_ID,
      cfg00V8_CFG_KEYS.TEMPLATE_ID_COMPLAINT_PROSECUTION,
      cfg00V8_CFG_KEYS.TEMPLATE_ID_COMPLAINT_UNDERSECRETARY,
      cfg00V8_CFG_KEYS.TEMPLATE_ID_TECH_HOSP,
      cfg00V8_CFG_KEYS.TEMPLATE_ID_TECH_UNITS,
      cfg00V8_CFG_KEYS.TEMPLATE_ID_FIN_ADMIN
    ];
    must.forEach(function (k) {
      var v = String(cfg00V8_getConfigValue_(k, "")).trim();
      if (!v || v === "PUT_FOLDER_ID_HERE" || v === "PUT_TEMPLATE_ID_HERE") missing.push(k);
    });
    return { ok: missing.length === 0, missing: missing };
  }
};

/* ============================================================
   4. Compat Globals
   ============================================================ */
const SHEETS = CONFIG.SHEETS;

function cfg_isEnabled(key, defaultValue) {
  var v = String(CONFIG.get(String(key || "").trim(),
    defaultValue == null ? "FALSE" : defaultValue)).toUpperCase();
  return v === "TRUE" || v === "1" || v === "YES";
}

const BUSINESS = Object.freeze({
  DOC_TYPE_INBOUND:  "وارد",
  DOC_TYPE_OUTBOUND: "صادر",

  STATUS: Object.freeze({
    NEW:               "جديد",
    PENDING_APPROVAL:  "بانتظار الاعتماد",
    APPROVED_ARCHIVED: "تم الاعتماد والأرشفة",
    NEED_FOLLOWUP:     "بحاجة الي متابعة",
    LATE:              "متأخر",
    NA:                "N/A"
  }),

  MAX_SLA_WORKDAYS: 10
});

/* ============================================================
   4.5 — HEADERS & ENUMS
   ============================================================ */

const SHEET_HEADERS = Object.freeze({
  INOUT_MASTER: Object.freeze([
    "رقم_القيد","نوع_المستند","التاريخ","الجهة (الوارد) منها",
    "الجهة_محل_التنفيذ","الموضوع","رقم_القضية","سنة_القضية",
    "نوع_المعاملة","الأهمية","الاستعجال","الموظف_المكلف",
    "الحالة","تاريخ_التخصيص","الموعد_النهائي","الأيام_المتبقية",
    "تاريخ_الإنجاز","رابط_المرفقات","رابط_الأرشيف","ملاحظات",
    "آخر_تعديل_بواسطة","تاريخ_آخر_تعديل","UUID","PARENT_ID"
  ]),
  EMPLOYEES: Object.freeze([
    "م","الاسم","الايميل","المسمى الوظيفي","التخصص",
    "نشط","عدد_المهام_الحالية","تاريخ_آخر_تكليف",
    "ملاحظات","PIN","الصلاحية","الموبايل"
  ]),
  REPORTS_LOG: Object.freeze([
    "التاريخ_والوقت","نوع_التقرير","رقم_القيد_أو_الجهة",
    "القائم_بالمرور","تاريخ_المرور","اسم_الملف",
    "رابط_Google_Doc","رابط_PDF_Drive","حالة_الإرسال",
    "المخاطب","ملاحظات"
  ]),
  FINDING_CODES: Object.freeze([
    "finding_code","القسم","التصنيف","نوع_التحقق",
    "نموذج_النص","مهلة_الأيام","تصعيد_فوري","نوع_التصعيد","ملاحظات"
  ]),
  HEALTH_ADMINS: Object.freeze([
    "admin_code","admin_name","manager_name","manager_email",
    "manager_mobile","PIN","failed_count","last_failed_at","locked_until","ملاحظات"
  ]),
  CAR_SECTIONS: Object.freeze([
    "car_id","report_id","facility_name","section_name","findings_count",
    "findings_text","portal_response","portal_replied_at",
    "staff_status","staff_note","staff_updated_by","staff_updated_at"
  ]),

  HOSP_SESSIONS: Object.freeze([
    "session_id","hospital_name","visit_date","period","officer",
    "doc_id","doc_url","status","sections_submitted","created_at","finalized_at"
  ]),

  STATISTICS: Object.freeze([
    "snapshot_date",
    "total_visits",
    "total_findings",
    "closed_findings",
    "open_findings",
    "closure_rate",
    "avg_closure_days",
    "total_escalations",
    "ministerial_escalations",
    "total_complaints",
    "total_inout",
    "sla_compliance_rate"
  ])
});

const ENUMS = Object.freeze({

  INOUT_STATUS: Object.freeze({
    NEW:               "جديد",
    PENDING_APPROVAL:  "بانتظار الاعتماد",
    APPROVED_ARCHIVED: "تم الاعتماد والأرشفة",
    NEED_FOLLOWUP:     "بحاجة الي متابعة",
    LATE:              "متأخر"
  }),

  FINDING_STATUS: Object.freeze({
    OPEN:          "مفتوح",
    RESPONDED:     "تم الرد",
    UNDER_REVIEW:  "قيد المراجعة",
    NEEDS_VERIFY:  "يحتاج تحقق",
    ON_HOLD:       "معلق",
    CLOSED:        "مغلق",
    ESCALATED:     "مصعَّد"
  }),

  /** حالات CAR_SECTIONS — staff_status */
  SECTION_STATUS: Object.freeze({
    OPEN:       "مفتوح",
    IN_PROGRESS:"جاري",
    CLOSED:     "مغلق"
  }),

  CLASSIFICATION: Object.freeze({
    VIOLATION:   "🔴 مخالفة صريحة",
    LATENT_RISK: "🟠 خطر كامن",
    DEFICIENCY:  "🔵 قصور إداري",
    INDICATOR:   "🟢 مؤشر"
  }),

  ESCALATION_TYPE: Object.freeze({
    ADMINISTRATIVE: "إداري",
    MINISTRY:       "وزاري",
    LEGAL:          "قانوني"
  }),

  VERIFICATION_TYPE: Object.freeze({
    FIELD:       "ميداني فقط",
    DOCUMENTARY: "وثائقي",
    BOTH:        "كلاهما"
  }),

  HOLD_FIELDS: Object.freeze([
    "hold_reason","hold_by","hold_at","next_review_date"
  ]),

  CAR_DEADLINES: Object.freeze({
    IMMEDIATE_MINISTERIAL : 0,
    CRITICAL_24H          : 1,
    CRITICAL_48H          : 2,
    LATENT_RISK_DAYS      : 7,
    DEFICIENCY_DAYS       : 14,
    INDICATOR_DAYS        : 30
  }),

  IMMEDIATE_ESCALATION_CODES: Object.freeze([
    "PHC-HR-001","PHC-ADM-REC"
  ]),

  INTERNAL_DEADLINES: Object.freeze({
    REVIEW_RESPONSE_DAYS    : 3,
    DOCUMENTARY_VERIFY_DAYS : 5,
    FIELD_VERIFY_DAYS       : 14,
    CLOSURE_LETTER_DAYS     : 3,
    HOLD_MAX_DAYS           : 30
  }),

  DOC_TYPE: Object.freeze({
    INBOUND:  "وارد",
    OUTBOUND: "صادر"
  }),

  HOSP_PERIODS: Object.freeze(["صباحي", "مسائي", "سهر"]),

  HOSP_SECTIONS: Object.freeze([
    "إدارة المستشفى",
    "الاستقبال والطوارئ",
    "العناية المركزة",
    "القسم الداخلي",
    "العمليات",
    "الحضانات",
    "وحدة غسيل الكلى",
    "بنك الدم",
    "الصيدلية",
    "المعمل",
    "الأشعة",
    "التعقيم المركزي",
    "المستودعات والخدمات"
  ])
});

/* ============================================================
   5. FOLDERS
   ============================================================ */
const FOLDERS = (function () {
  var work = "";
  var arch = "";
  try { work = CONFIG.getWorkSharedRootId(); arch = CONFIG.getArchivePrivateRootId(); } catch (e) {}
  return Object.freeze({
    WORK_SHARED:     Object.freeze({ ROOT_ID: work, ID: work }),
    ARCHIVE_PRIVATE: Object.freeze({ ROOT_ID: arch, ID: arch })
  });
})();

(function cfg00V8_applyLegacySheetAliases_() {
  if (!SHEETS.RULES)     SHEETS.RULES     = SHEETS.DISTRIBUTION_RULES;
  if (!SHEETS.ERROR_LOG) SHEETS.ERROR_LOG = SHEETS.ERRORS_LOG;
})();

/* ============================================================
   6. Cache + Reader Internals
   ============================================================ */
function cfg00V8_getConfigValue_(key, defaultValue) {
  key = String(key || "").trim();
  if (!key) return defaultValue;

  var cache = CacheService.getScriptCache();
  var cacheKey = "SYS_CFG|" + key;
  var cached = cache.get(cacheKey);
  if (cached !== null && cached !== undefined) {
    if (cached === "__NULL__") return defaultValue;
    return cached;
  }

  var value = cfg00V8_readFromSystemConfig_(key);
  if (value === null || value === undefined || String(value).trim() === "") {
    cache.put(cacheKey, "__NULL__", 30);
    return defaultValue;
  }

  var out = String(value).trim();
  cache.put(cacheKey, out, 300);
  return out;
}

function cfg00V8_requireConfigValue_(key) {
  var k = String(key || "").trim();
  if (!k) throw new Error("Missing config key");
  var v = cfg00V8_getConfigValue_(k, "");
  if (!v || v === "__NULL__" || v === "PUT_FOLDER_ID_HERE" || v === "PUT_TEMPLATE_ID_HERE") {
    try {
      var direct = cfg00V8_readFromSystemConfig_(k);
      if (direct && String(direct).trim()) {
        v = String(direct).trim();
        try { CacheService.getScriptCache().put("SYS_CFG|" + k, v, 300); } catch (_) {}
      }
    } catch (_) {}
  }
  v = String(v == null ? "" : v).trim();
  if (!v || v === "__NULL__" || v === "PUT_FOLDER_ID_HERE" || v === "PUT_TEMPLATE_ID_HERE") {
    throw new Error("Missing/placeholder SYSTEM_CONFIG key: " + k);
  }
  return v;
}

function cfg00V8_readFromSystemConfig_(key) {
  try {
    var ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    var sh = ss.getSheetByName("REF_SYSTEM_CONFIG");
    if (!sh) sh = ss.getSheetByName("SYSTEM_CONFIG");
    if (!sh) return null;
    var lastRow = sh.getLastRow();
    if (lastRow < 2) return null;
    var values = sh.getRange(2, 1, lastRow - 1, 2).getValues();
    for (var i = 0; i < values.length; i++) {
      if (String(values[i][0] || "").trim() === key) return values[i][1];
    }
    return null;
  } catch (e) { return null; }
}

/* ============================================================
   7. Cache Clear Utility
   ============================================================ */
function cfg00V8_clearConfigCache() {
  var keys = Object.keys(cfg00V8_CFG_KEYS).map(function (k) {
    return "SYS_CFG|" + cfg00V8_CFG_KEYS[k];
  });
  CacheService.getScriptCache().removeAll(keys);
  return "OK";
}