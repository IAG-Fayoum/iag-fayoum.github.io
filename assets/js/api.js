/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🔌 API Handler - GitHub Pages → Apps Script
 * ═══════════════════════════════════════════════════════════════════════════
 */

const API_URL = "https://script.google.com/macros/s/AKfycby4emzeDBnK2R7zMsxAsDc1ARe5rgcnMz7VEUu67bwzXwofFd53fJn-LGCoRsZXMgW4Og/exec";

/**
 * دالة موحدة للاتصال بالباك إند
 * @param {string} action - اسم العملية (login, getDashboard, etc)
 * @param {object} data - البيانات المرسلة
 * @returns {Promise<object>}
 */
async function apiCall(action, data = {}) {
  showLoader();
  
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      body: JSON.stringify({
        action: action,
        ...data
      })
    });

    if (!response.ok) {
      throw new Error('Network response failed');
    }

    const result = await response.json();
    hideLoader();
    return result;

  } catch (error) {
    console.error('API Error:', error);
    hideLoader();
    alert('❌ خطأ في الاتصال بالنظام');
    return { success: false, error: error.message };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 🎯 API FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

async function login(pin) {
  return await apiCall('login', { pin: pin });
}

async function getDashboard(startDate, endDate) {
  return await apiCall('getDashboard', { start: startDate, end: endDate });
}

async function getEmployeeData(name) {
  return await apiCall('getEmployeeData', { name: name });
}

async function reassignTask(taskId, newEmployee) {
  return await apiCall('reassign', { taskId: taskId, emp: newEmployee });
}

async function updateStatus(taskId, newStatus) {
  return await apiCall('updateStatus', { taskId: taskId, status: newStatus });
}

async function addTask(taskData) {
  return await apiCall('addTask', { taskData: taskData });
}

async function searchArchive(filters) {
  return await apiCall('searchArchive', { filters: filters });
}

// ═══════════════════════════════════════════════════════════════════════════
// 🔄 LOADER HELPERS
// ═══════════════════════════════════════════════════════════════════════════

function showLoader() {
  const loader = document.getElementById('loader');
  if (loader) loader.classList.remove('hidden-section');
}

function hideLoader() {
  const loader = document.getElementById('loader');
  if (loader) loader.classList.add('hidden-section');
}
