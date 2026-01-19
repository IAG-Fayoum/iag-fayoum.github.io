/* ==========================================================================
   🏛️ CORE FRONTEND CONTROLLER v3.0
   Internal Audit & Governance – Fayoum
   Frontend Master Core (Foundation Edition)
   ========================================================================== */

const Core = (() => {

  /* =========================
     🔧 CONFIGURATION
  ========================= */
  const CONFIG = {
    VERSION: "3.0.0",
    APP_NAME: "Internal Audit & Governance",
    GAS_ENDPOINT: "https://script.google.com/macros/s/AKfycbzi68xXxFmLlTd-w0ADsf_A7S1100sYjfusWeZNGTyOf7_PlRhsPYTO6iCrTyj7mz996w/exec"
  };

  /* =========================
     📄 PAGE REGISTRY
     (Single Source of Truth)
  ========================= */
  const PAGES = {
    index:        { enabled: true,  roles: ["ALL"] },
    dashboard:    { enabled: true,  roles: ["ALL"] },   // مفعلة الآن
    services:     { enabled: false, roles: ["ALL"] },
    employee:     { enabled: false, roles: ["EMP"] },
    coordinator:  { enabled: false, roles: ["COORD"] },
    admin:        { enabled: false, roles: ["ADMIN"] },
    settings:     { enabled: true,  roles: ["ADMIN"] }
  };

  /* =========================
     💾 STATE MANAGER
  ========================= */
  const State = {
    user: null,
    currentPage: null,

    setUser(userData) {
      this.user = userData;
      localStorage.setItem("IAG_USER", JSON.stringify(userData));
    },

    getUser() {
      if (this.user) return this.user;
      const cached = localStorage.getItem("IAG_USER");
      if (cached) {
        this.user = JSON.parse(cached);
        return this.user;
      }
      return null;
    },

    clearUser() {
      this.user = null;
      localStorage.removeItem("IAG_USER");
    }
  };

  /* =========================
     🎨 UI CONTROLLER
  ========================= */
  const UI = {

    showMessage(message, type = "info") {
      alert(message); // مؤقت – سيتم استبداله لاحقًا
    },

    redirect(page) {
      window.location.href = page;
    },

    showLoader() {
      document.body.classList.add("opacity-50", "pointer-events-none");
    },

    hideLoader() {
      document.body.classList.remove("opacity-50", "pointer-events-none");
    }

  };

  /* =========================
     🔌 API MANAGER
  ========================= */
  const API = {

    async call(action, payload = {}) {
      UI.showLoader();

      try {
        const response = await fetch(CONFIG.GAS_ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: action,
            ...payload
          })
        });

        const data = await response.json();
        return data;

      } catch (error) {
        UI.showMessage("تعذر الاتصال بالسيرفر", "error");
        return { success: false, error: error.message };

      } finally {
        UI.hideLoader();
      }
    }

  };

  /* =========================
     🚦 ROUTER / GUARD
  ========================= */
  const Router = {

    guard(pageName) {
      const page = PAGES[pageName];

      if (!page) {
        UI.showMessage("صفحة غير معرفة بالنظام");
        UI.redirect("index.html");
        return;
      }

      if (!page.enabled) {
        UI.showMessage("هذه الصفحة غير مفعلة حاليًا");
        UI.redirect("index.html");
        return;
      }

      // لاحقًا: التحقق من الصلاحيات
    }

  };

  /* =========================
     🧠 CORE INIT
  ========================= */
  const init = (pageName) => {
    State.currentPage = pageName;
    Router.guard(pageName);
    console.log(`✅ Core initialized for page: ${pageName}`);
  };

  /* =========================
     🧪 HEALTH CHECK (اختياري)
  ========================= */
  const healthCheck = async () => {
    try {
      const res = await fetch(CONFIG.GAS_ENDPOINT);
      const data = await res.json();
      console.log("🟢 Backend Status:", data.status, data.serverTime);
      return data;
    } catch (e) {
      console.warn("🔴 Backend unreachable");
      return null;
    }
  };

  /* =========================
     📦 PUBLIC API
  ========================= */
  return {
    init,
    api: API,
    state: State,
    ui: UI,
    healthCheck,
    config: CONFIG
  };

})();
