/* ==========================================================================
   🏛️ CORE FRONTEND CONTROLLER v3.0
   Internal Audit & Governance – Fayoum
   ========================================================================== */

const Core = (() => {

  const CONFIG = {
    VERSION: "3.0.0",
    GAS_ENDPOINT: "https://script.google.com/macros/s/AKfycbzi68xXxFmLlTd-w0ADsf_A7S1100sYjfusWeZNGTyOf7_PlRhsPYTO6iCrTyj7mz996w/exec"
  };

  const PAGES = {
    index: true,
    dashboard: true,
    services: false,
    employee: false,
    coordinator: false,
    admin: false,
    settings: false
  };

  const State = {
    page: null
  };

  const UI = {
    redirect(page) {
      window.location.href = page;
    },
    message(msg) {
      alert(msg);
    }
  };

  const API = {
    async call(action, payload = {}) {
      const res = await fetch(CONFIG.GAS_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...payload })
      });
      return await res.json();
    }
  };

  function guard(page) {
    if (!PAGES[page]) {
      UI.message("هذه الصفحة غير مفعلة حالياً");
      UI.redirect("index.html");
    }
  }

  async function init(page) {
    State.page = page;
    guard(page);
    console.log("Core Ready:", page);
  }

  return {
    init,
    api: API
  };

})();
