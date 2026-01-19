/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🎯 Main Logic - Portal Main
 * النسخة النهائية - تم المراجعة ✅
 * ═══════════════════════════════════════════════════════════════════════════
 */

let allTasks = [];
let allReports = [];
let currentEmployee = null;

// ═══════════════════════════════════════════════════════════════════════════
// 🧭 NAVIGATION
// ═══════════════════════════════════════════════════════════════════════════

function exitSystem() {
  window.location.href = 'index.html';
}

function switchTab(tabName) {
  const tabs = ['dashboard', 'services', 'employees'];
  tabs.forEach(t => {
    const contentEl = document.getElementById('tab-' + t);
    const navBtn = document.getElementById('nav-' + t);
    const bottomBtn = document.getElementById('bottom-nav-' + t);
    
    if (contentEl) contentEl.classList.add('hidden-section');
    
    if (navBtn) {
      if (t === tabName) {
        navBtn.classList.add('sidebar-active');
        navBtn.classList.remove('sidebar-item');
      } else {
        navBtn.classList.remove('sidebar-active');
        navBtn.classList.add('sidebar-item');
      }
    }
    
    if (bottomBtn) {
      if (t === tabName) {
        bottomBtn.classList.add('active');
      } else {
        bottomBtn.classList.remove('active');
      }
    }
  });
  
  const targetEl = document.getElementById('tab-' + tabName);
  if (targetEl) {
    targetEl.classList.remove('hidden-section');
    if (tabName === 'dashboard') {
      setTimeout(() => { if (typeof applyFilter === 'function') applyFilter(); }, 10);
    }
  }
  
  if (typeof lucide !== 'undefined') lucide.createIcons();
}

function toggleInputs() {
  const type = document.getElementById('filter-type').value;
  document.getElementById('month-input').classList.add('hidden-section');
  document.getElementById('date-range').classList.add('hidden-section');
  if (type === 'month') document.getElementById('month-input').classList.remove('hidden-section');
  if (type === 'custom') document.getElementById('date-range').classList.remove('hidden-section');
}

// ═══════════════════════════════════════════════════════════════════════════
// 🔐 EMPLOYEE LOGIN
// ═══════════════════════════════════════════════════════════════════════════

async function handleLogin() {
  const pin = document.getElementById('emp-pin-input').value;
  const errorMsg = document.getElementById('emp-error');
  
  if (!pin || pin.length < 4) {
    errorMsg.innerText = "أدخل الرمز كاملاً (4 أرقام)";
    errorMsg.classList.remove('hidden-section');
    return;
  }
  
  const res = await login(pin);
  
  if (res.success) {
    errorMsg.classList.add('hidden-section');
    document.getElementById('emp-login-form').classList.add('hidden-section');
    document.getElementById('emp-profile-view').classList.remove('hidden-section');
    document.getElementById('profile-name').innerText = res.name;
    document.getElementById('profile-role').innerText = res.role;
    
    currentEmployee = res.name;
    allTasks = res.tasks || [];
    allReports = res.reports || [];
    
    updateStats();
    switchMainTab('new');
  } else {
    errorMsg.innerText = "❌ رمز غير صحيح";
    errorMsg.classList.remove('hidden-section');
  }
}

function logout() {
  document.getElementById('emp-login-form').classList.remove('hidden-section');
  document.getElementById('emp-profile-view').classList.add('hidden-section');
  document.getElementById('emp-pin-input').value = '';
  currentEmployee = null;
  allTasks = [];
  allReports = [];
}

// ═══════════════════════════════════════════════════════════════════════════
// 📊 EMPLOYEE STATS
// ═══════════════════════════════════════════════════════════════════════════

function updateStats() {
  const countNew = allTasks.filter(t => !t.status || t.status === '' || t.status.includes('جديد')).length;
  const countProgress = allTasks.filter(t => t.status && (t.status.includes('جاري') || t.status.includes('قيد') || t.status.includes('لم يتم البدء'))).length;
  const countLate = allTasks.filter(t => t.status && t.status.includes('متأخر')).length;
  const countDone = allTasks.filter(t => t.status && (t.status.includes('تم الاعتماد') || t.status.includes('منتهي'))).length;
  
  document.getElementById('stat-new').innerText = countNew;
  document.getElementById('stat-progress').innerText = countProgress;
  document.getElementById('stat-late').innerText = countLate;
  document.getElementById('stat-done').innerText = countDone;
}

// ═══════════════════════════════════════════════════════════════════════════
// 🆕 EMPLOYEE TABS
// ═══════════════════════════════════════════════════════════════════════════

function switchMainTab(tabName) {
  ['new', 'progress', 'late', 'history'].forEach(t => {
    const btn = document.getElementById('main-tab-' + t);
    const content = document.getElementById('content-' + t);
    if (t === tabName) {
      btn.classList.add('active');
      content.classList.remove('hidden-section');
    } else {
      btn.classList.remove('active');
      content.classList.add('hidden-section');
    }
  });
  
  if (tabName === 'new') renderTaskCards('new');
  else if (tabName === 'progress') renderTaskCards('progress');
  else if (tabName === 'late') renderOverdueTable();
  else if (tabName === 'history') applyHistoryFilter();
  
  lucide.createIcons();
}

function renderTaskCards(category) {
  let filtered = [];
  let containerId = '';

  if (category === 'new') {
    filtered = allTasks.filter(t => !t.status || t.status === '' || t.status.includes('جديد'));
    containerId = 'cards-new';
  } else if (category === 'progress') {
    filtered = allTasks.filter(t => t.status && (t.status.includes('جاري') || t.status.includes('قيد') || t.status.includes('لم يتم البدء')));
    containerId = 'cards-progress';
  }

  const container = document.getElementById(containerId);
  container.innerHTML = '';
  
  if (filtered.length === 0) {
    container.innerHTML = `<div class="col-span-3 text-center p-8 text-slate-400 bg-slate-50 rounded-xl">لا توجد مهام في هذا القسم</div>`;
    return;
  }

  filtered.forEach(t => {
    let statusClass = category === 'new' ? 'task-new' : 'task-progress';
    let statusIcon = category === 'new' ? 'sparkles' : 'loader';
    let statusText = category === 'new' ? 'جديد' : 'جاري العمل';

    let attachmentBtn = t.attachment ? 
      `<a href="${t.attachment}" target="_blank" class="text-xs bg-violet-50 text-violet-600 px-3 py-2 rounded-lg font-bold hover:bg-violet-100 flex items-center gap-2 w-fit mt-3 border border-violet-100 transition-colors"><i data-lucide="paperclip" class="w-3 h-3"></i> مرفق التكليف</a>` : '';
    
    let reportBtn = t.report ? 
      `<a href="${t.report}" target="_blank" class="text-xs bg-emerald-50 text-emerald-600 px-3 py-2 rounded-lg font-bold hover:bg-emerald-100 flex items-center gap-2 w-fit mt-3 border border-emerald-100 transition-colors"><i data-lucide="file-check" class="w-3 h-3"></i> التقرير المرفوع</a>` : '';

    container.innerHTML += `
      <div class="task-card ${statusClass}">
        <div>
          <div class="flex justify-between items-start mb-2">
            <span class="text-[10px] font-bold text-slate-400">#${t.id}</span>
            <span class="text-[10px] font-bold px-2 py-1 rounded bg-slate-100 text-slate-600 flex items-center gap-1"><i data-lucide="${statusIcon}" class="w-3 h-3"></i> ${statusText}</span>
          </div>
          <h4 class="font-bold text-slate-800 mb-2 leading-snug text-sm">${t.subject}</h4>
          <div class="space-y-1 text-xs text-slate-500">
            <div class="flex items-center gap-2"><i data-lucide="building" class="w-3 h-3"></i> ${t.source}</div>
            ${t.entity ? `<div class="flex items-center gap-2"><i data-lucide="map-pin" class="w-3 h-3"></i> ${t.entity}</div>` : ''}
            <div class="flex items-center gap-2"><i data-lucide="calendar" class="w-3 h-3"></i> ${t.date}</div>
          </div>
        </div>
        <div class="flex gap-2 flex-wrap">
           ${attachmentBtn} ${reportBtn}
        </div>
      </div>
    `;
  });
  lucide.createIcons();
}

function renderOverdueTable() {
  const tbody = document.getElementById('table-late');
  tbody.innerHTML = '';
  const overdueTasks = allTasks.filter(t => t.status && t.status.includes('متأخر'));
  
  if (overdueTasks.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="p-4 text-center text-green-700 font-bold">✅ ممتاز! لا توجد متأخرات.</td></tr>`;
    return;
  }
  
  overdueTasks.forEach(t => {
    const delay = t.delay || '-';
    let delayColor = typeof delay === 'number' && delay > 30 ? 'text-red-900 font-black' : 'text-red-700';
    let attachmentBtn = t.attachment ? `<a href="${t.attachment}" target="_blank" class="text-blue-600 hover:underline text-xs flex items-center gap-1"><i data-lucide="paperclip" class="w-3 h-3"></i> عرض</a>` : '-';
    
    tbody.innerHTML += `
      <tr class="hover:bg-red-50">
        <td class="p-4 font-bold text-red-900">${t.subject}</td>
        <td class="p-4 text-red-800">${t.source}</td>
        <td class="p-4 text-red-800">${t.entity || '-'}</td>
        <td class="p-4 text-center text-red-700">${t.date}</td>
        <td class="p-4 text-center ${delayColor}">${delay} ${typeof delay === 'number' ? 'يوم' : ''}</td>
        <td class="p-4 text-center">${attachmentBtn}</td>
      </tr>
    `;
  });
  lucide.createIcons();
}

function applyHistoryFilter() {
  const year = document.getElementById('history-year').value;
  const month = document.getElementById('history-month').value;

  let doneTasks = allTasks.filter(t => t.status && (t.status.includes('تم الاعتماد') || t.status.includes('منتهي')));
  
  if (month) {
    doneTasks = doneTasks.filter(t => {
      if (!t.date) return false;
      let parts = t.date.split('/');
      if (parts.length !== 3) return false;
      return parts[2] === year && parts[1].padStart(2, '0') === month.padStart(2, '0');
    });
  } else {
    doneTasks = doneTasks.filter(t => {
      if (!t.date) return false;
      let parts = t.date.split('/');
      return parts.length === 3 && parts[2] === year;
    });
  }

  const doneContainer = document.getElementById('cards-done');
  doneContainer.innerHTML = '';
  
  if (doneTasks.length === 0) {
    doneContainer.innerHTML = `<div class="col-span-3 text-center p-8 text-slate-400 bg-slate-50 rounded-xl">لا توجد مهام منجزة في هذه الفترة</div>`;
  } else {
    doneTasks.forEach(t => {
      let attachmentBtn = t.attachment ? 
        `<a href="${t.attachment}" target="_blank" class="text-xs bg-slate-100 text-slate-600 px-3 py-2 rounded-lg font-bold hover:bg-slate-200 flex items-center gap-2 w-fit transition-colors"><i data-lucide="paperclip" class="w-3 h-3"></i> التكليف</a>` : '';
      
      let reportBtn = t.report ? 
        `<a href="${t.report}" target="_blank" class="text-xs bg-emerald-100 text-emerald-700 px-3 py-2 rounded-lg font-bold hover:bg-emerald-200 flex items-center gap-2 w-fit transition-colors"><i data-lucide="check-circle" class="w-3 h-3"></i> التقرير النهائي</a>` : '';

      doneContainer.innerHTML += `
        <div class="task-card task-done">
          <div>
            <div class="flex justify-between items-start mb-2">
              <span class="text-[10px] font-bold text-slate-400">#${t.id}</span>
              <span class="text-[10px] font-bold px-2 py-1 rounded bg-emerald-100 text-emerald-700 flex items-center gap-1"><i data-lucide="check-circle" class="w-3 h-3"></i> منجز</span>
            </div>
            <h4 class="font-bold text-slate-800 mb-2 leading-snug text-sm">${t.subject}</h4>
            <div class="space-y-1 text-xs text-slate-500">
              <div class="flex items-center gap-2"><i data-lucide="building" class="w-3 h-3"></i> ${t.source}</div>
              ${t.entity ? `<div class="flex items-center gap-2"><i data-lucide="map-pin" class="w-3 h-3"></i> ${t.entity}</div>` : ''}
              <div class="flex items-center gap-2"><i data-lucide="calendar" class="w-3 h-3"></i> ${t.date}</div>
            </div>
          </div>
          <div class="flex gap-2 flex-wrap mt-3 border-t border-slate-100 pt-3">
            ${attachmentBtn} ${reportBtn}
          </div>
        </div>
      `;
    });
  }

  let reports = allReports;
  if (month) {
    reports = reports.filter(r => {
      if (!r.date) return false;
      let parts = r.date.split('/');
      return parts.length === 3 && parts[2] === year && parts[1].padStart(2, '0') === month.padStart(2, '0');
    });
  } else {
    reports = reports.filter(r => {
      if (!r.date) return false;
      let parts = r.date.split('/');
      return parts.length === 3 && parts[2] === year;
    });
  }
  
  renderReports(reports);
  lucide.createIcons();
}

function renderReports(reports) {
  const tbody = document.getElementById('reports-rows');
  tbody.innerHTML = '';
  
  if (!reports || reports.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" class="p-4 text-center text-slate-400">لا توجد تقارير مؤرشفة في هذه الفترة</td></tr>`;
    return;
  }
  
  reports.forEach(r => {
    let typeIcon = r.type && r.type.includes('شكوى') ? 'file-warning' : 'building-2';
    let docBtn = r.docLink ? `<a href="${r.docLink}" target="_blank" class="text-blue-500 hover:bg-blue-50 p-2 rounded-lg" title="Google Doc"><i data-lucide="file-edit" class="w-4 h-4"></i></a>` : '';
    let pdfBtn = r.pdfLink ? `<a href="${r.pdfLink}" target="_blank" class="text-red-500 hover:bg-red-50 p-2 rounded-lg" title="PDF"><i data-lucide="file-text" class="w-4 h-4"></i></a>` : '';
    let fieldAttachmentsBtn = '';
    
    if (r.fieldAttachments && r.fieldAttachments.length > 0) {
      fieldAttachmentsBtn = `<button onclick="showFieldAttachments(${JSON.stringify(r.fieldAttachments).replace(/"/g, '&quot;')})" class="text-violet-500 hover:bg-violet-50 p-2 rounded-lg" title="المرفقات الميدانية (${r.fieldAttachments.length})"><i data-lucide="camera" class="w-4 h-4"></i><span class="text-xs font-bold">${r.fieldAttachments.length}</span></button>`;
    }
    
    tbody.innerHTML += `
      <tr class="hover:bg-slate-50 border-b border-slate-100 last:border-0">
         <td class="p-4 text-slate-500 font-medium">${r.date}</td>
         <td class="p-4"><span class="flex items-center gap-1 font-bold text-slate-700 text-xs"><i data-lucide="${typeIcon}" class="w-4 h-4 text-slate-400"></i> ${r.type}</span></td>
         <td class="p-4 font-bold text-slate-800 text-sm">${r.title}<br><span class="text-[10px] text-slate-400 font-normal">${r.entity || ''}</span></td>
         <td class="p-4"><div class="flex justify-center gap-2">${docBtn}${pdfBtn}${fieldAttachmentsBtn}</div></td>
      </tr>
    `;
  });
  lucide.createIcons();
}

function showFieldAttachments(attachments) {
  let html = '<div style="position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.7);z-index:9999;display:flex;align-items:center;justify-content:center;" onclick="this.remove()">';
  html += '<div style="background:white;border-radius:16px;padding:24px;max-width:600px;max-height:80vh;overflow-y:auto;" onclick="event.stopPropagation()">';
  html += '<h3 style="font-size:1.25rem;font-weight:bold;margin-bottom:16px;color:#0f766e;">المرفقات الميدانية</h3>';
  html += '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:12px;">';
  attachments.forEach((link, i) => {
    html += `<a href="${link}" target="_blank" style="display:block;padding:12px;background:#f0fdfa;border-radius:8px;text-align:center;text-decoration:none;color:#0f766e;font-weight:bold;border:2px solid #ccfbf1;"><div style="font-size:2rem;margin-bottom:8px;">📷</div><div style="font-size:0.75rem;">مرفق ${i + 1}</div></a>`;
  });
  html += '</div>';
  html += '<button onclick="this.closest(\'div[style*=fixed]\').remove()" style="margin-top:16px;width:100%;padding:12px;background:#0f766e;color:white;border:none;border-radius:8px;font-weight:bold;cursor:pointer;">إغلاق</button>';
  html += '</div></div>';
  document.body.insertAdjacentHTML('beforeend', html);
}

// ═══════════════════════════════════════════════════════════════════════════
// 📊 DASHBOARD FILTERING
// ═══════════════════════════════════════════════════════════════════════════

async function applyFilter() {
  const year = document.getElementById('year-select').value;
  const type = document.getElementById('filter-type').value;
  let startStr, endStr, descText;
  
  if (type === 'current') {
    const now = new Date();
    const curY = now.getFullYear();
    document.getElementById('year-select').value = curY;
    const m = now.getMonth();
    let qS, qE, qN;
    if (m < 3) { qS = '01-01'; qE = '03-31'; qN = 'Q1'; }
    else if (m < 6) { qS = '04-01'; qE = '06-30'; qN = 'Q2'; }
    else if (m < 9) { qS = '07-01'; qE = '09-30'; qN = 'Q3'; }
    else { qS = '10-01'; qE = '12-31'; qN = 'Q4'; }
    startStr = `${curY}-${qS}`; endStr = `${curY}-${qE}`; descText = `عرض الربع الحالي (${qN}) لسنة ${curY}`;
  } else if (type === 'all') {
    startStr = `${year}-01-01`; endStr = `${year}-12-31`; descText = `عرض شامل لسنة ${year}`;
  } else if (type.startsWith('Q')) {
    let qS, qE;
    if (type === 'Q1') { qS = '01-01'; qE = '03-31'; }
    else if (type === 'Q2') { qS = '04-01'; qE = '06-30'; }
    else if (type === 'Q3') { qS = '07-01'; qE = '09-30'; }
    else { qS = '10-01'; qE = '12-31'; }
    startStr = `${year}-${qS}`; endStr = `${year}-${qE}`; descText = `عرض ${type} لسنة ${year}`;
  } else if (type === 'month') {
    const m = parseInt(document.getElementById('month-select').value) + 1;
    const mm = m < 10 ? '0' + m : m;
    const lastDay = new Date(year, m, 0).getDate();
    startStr = `${year}-${mm}-01`; endStr = `${year}-${mm}-${lastDay}`; descText = `عرض شهر ${mm}/${year}`;
  } else {
    startStr = document.getElementById('d-start').value;
    endStr = document.getElementById('d-end').value;
    if (!startStr || !endStr) { alert('⚠️ حدد التاريخ من وإلى'); return; }
    descText = `فترة مخصصة: ${startStr} → ${endStr}`;
  }
  
  document.getElementById('filter-status').innerText = descText;
  
  const data = await getDashboard(startStr, endStr);
  renderDashboard(data);
}

function renderDashboard(data) {
  if (data.error) { 
    alert('❌ خطأ: ' + data.error); 
    return; 
  }
  
  data.employees.sort((a, b) => { 
    let rateA = a.periodTotal > 0 ? (a.periodCompleted / a.periodTotal) : 0; 
    let rateB = b.periodTotal > 0 ? (b.periodCompleted / b.periodTotal) : 0; 
    return rateB - rateA; 
  });
  
  document.getElementById('v-total').innerText = data.totals.periodTotal || 0;
  document.getElementById('v-done').innerText = data.totals.periodCompleted || 0;
  document.getElementById('v-prog').innerText = data.totals.periodInProgress || 0;
  document.getElementById('v-late').innerText = data.totals.absoluteOverdue || 0;
  
  const tbody = document.getElementById('table-rows');
  tbody.innerHTML = '';
  
  if (data.employees.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="p-8 text-center text-slate-400">📭 لا توجد بيانات لهذه الفترة</td></tr>`;
  } else {
    data.employees.forEach(e => {
      const p = e.periodTotal > 0 ? Math.round((e.periodCompleted / e.periodTotal) * 100) : 0;
      let c = p >= 80 ? 'bg-emerald-500' : (p < 50 ? 'bg-red-500' : 'bg-teal-600');
      let sourcesHtml = e.topSources.map(s => `<span class="inline-block bg-slate-100 text-slate-600 text-[10px] px-2 py-1 rounded-full mr-1 mb-1">${s}</span>`).join('');
      
      tbody.innerHTML += `
        <tr class="hover:bg-slate-50 transition-colors group">
          <td class="p-5">
            <div class="font-bold text-slate-700">${e.name}</div>
            <div class="text-xs text-slate-400 font-normal">${e.role}</div>
            ${e.absoluteOverdue > 0 ? `<div class="mt-1 inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-red-100 text-red-700"><i data-lucide="alert-circle" class="w-3 h-3 ml-1"></i> ${e.absoluteOverdue} متأخر (كلي)</div>` : ''}
          </td>
          <td class="p-5">${sourcesHtml || '<span class="text-slate-400">-</span>'}</td>
          <td class="p-5 text-center text-xs font-bold text-slate-500">${e.avgSpeed > 0 ? e.avgSpeed + ' يوم' : '-'}</td>
          <td class="p-5 text-center font-bold text-slate-600">${e.periodTotal}</td>
          <td class="p-5 text-center font-bold text-emerald-600">${e.periodCompleted}</td>
          <td class="p-5 text-center font-bold text-amber-600">${e.periodRemaining}</td>
          <td class="p-5">
            <div class="flex items-center gap-2">
              <div class="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                <div class="${c} h-3 rounded-full transition-all duration-1000" style="width: ${p}%"></div>
              </div>
              <span class="text-xs font-bold text-slate-500 w-8 text-left">${p}%</span>
            </div>
          </td>
        </tr>
      `;
    });
  }
  
  const entityBody = document.getElementById('entity-rows');
  entityBody.innerHTML = '';
  
  if (data.entities.length === 0) {
    entityBody.innerHTML = `<tr><td colspan="5" class="p-4 text-center text-slate-400">📭 لا توجد بيانات</td></tr>`;
  } else {
    data.entities.forEach(ent => {
      let percentColor = ent.overduePercent >= 50 ? 'text-red-600 font-black' : (ent.overduePercent >= 25 ? 'text-orange-600 font-bold' : 'text-slate-600');
      entityBody.innerHTML += `
        <tr class="hover:bg-slate-50 border-b border-slate-100 last:border-0">
          <td class="p-4 font-bold text-slate-700">${ent.name}</td>
          <td class="p-4 text-center text-blue-600 font-bold">${ent.total}</td>
          <td class="p-4 text-center text-amber-600">${ent.pending}</td>
          <td class="p-4 text-center ${ent.overdue > 0 ? 'text-red-600 font-black' : 'text-slate-400'}">${ent.overdue}</td>
          <td class="p-4 text-center ${percentColor}">${ent.overduePercent}%</td>
        </tr>
      `;
    });
  }
  
  lucide.createIcons();
}

// ═══════════════════════════════════════════════════════════════════════════
// 🚀 INITIALIZATION
// ═══════════════════════════════════════════════════════════════════════════

window.onload = function() {
  lucide.createIcons();
  const currentYear = new Date().getFullYear();
  document.getElementById('history-year').value = currentYear;
}

console.log('✅ Main Logic Ready');
