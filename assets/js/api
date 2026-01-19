/**
 * API Controller - نظام الحوكمة
 */
const API_URL = "https://script.google.com/macros/s/AKfycbzi68xXxFmLlTd-w0ADsf_A7S1100sYjfusWeZNGTyOf7_PlRhsPYTO6iCrTyj7mz996w/exec";

async function login(pin) {
  try {
    showLoader();
    const response = await fetch(API_URL, {
      method: 'POST',
      body: JSON.stringify({ action: 'login', pin })
    });
    const data = await response.json();
    hideLoader();
    return data;
  } catch (error) {
    hideLoader();
    console.error('Login Error:', error);
    return { success: false, error: 'فشل الاتصال' };
  }
}

async function getDashboard(start, end) {
  try {
    showLoader();
    const response = await fetch(API_URL, {
      method: 'POST',
      body: JSON.stringify({ action: 'getDashboard', start, end })
    });
    const data = await response.json();
    hideLoader();
    return data;
  } catch (error) {
    hideLoader();
    console.error('Dashboard Error:', error);
    return { totals: {}, employees: [], entities: [] };
  }
}

async function searchArchive(filters) {
  try {
    showLoader();
    const response = await fetch(API_URL, {
      method: 'POST',
      body: JSON.stringify({ action: 'searchArchive', filters: JSON.stringify(filters) })
    });
    const data = await response.json();
    hideLoader();
    return data;
  } catch (error) {
    hideLoader();
    console.error('Archive Error:', error);
    return { success: false, results: [] };
  }
}

function showLoader() {
  const loader = document.getElementById('loader');
  if (loader) loader.classList.remove('hidden-section');
}

function hideLoader() {
  const loader = document.getElementById('loader');
  if (loader) loader.classList.add('hidden-section');
}

function logout() {
  localStorage.clear();
  location.href = 'index.html';
}

console.log('✅ API Ready');
