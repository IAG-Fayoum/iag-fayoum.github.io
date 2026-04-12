/* ══════════════════════════════════════════════
   dashboard.js — Statistics Dashboard Logic
   IAG System 2026 — منطق لوحة الإحصائيات
   ══════════════════════════════════════════════ */

lucide.createIcons();

let gData    = null;
let gLoading = false;

/* ── INIT ── */
document.addEventListener('DOMContentLoaded', () => {
  const u = localStorage.getItem('iag_user');
  if (!u) { location.href = 'index.html'; return; }
  const user = JSON.parse(u);
  if (user.role !== 'مدير' && user.role !== 'Admin') { location.href = 'index.html'; return; }
  document.getElementById('header-name').textContent = user.name || '';
  initYear();
  setDefaultPeriod();
  applyFilters();
});

function initYear() {
  const sel = document.getElementById('f-year');
  const y   = new Date().getFullYear();
  for (let i = y + 1; i >= 2023; i--) {
    const o = document.createElement('option');
    o.value = i; o.textContent = i;
    if (i === y) o.selected = true;
    sel.appendChild(o);
  }
}
function setDefaultPeriod() {
  const n = new Date();
  document.getElementById('f-month').value = n.getMonth() + 1;
  syncDates();
}
function syncDates() {
  const y = +document.getElementById('f-year').value;
  const m = +document.getElementById('f-month').value;
  if (!y || !m) return;
  document.getElementById('f-from').value = d2s(new Date(y, m-1, 1));
  document.getElementById('f-to').value   = d2s(new Date(y, m,   0));
}
document.getElementById('f-year').addEventListener('change',  syncDates);
document.getElementById('f-month').addEventListener('change', syncDates);

function d2s(d) {
  return d.getFullYear() + '-' +
    String(d.getMonth()+1).padStart(2,'0') + '-' +
    String(d.getDate()).padStart(2,'0');
}
function getF() {
  return {
    dateFrom:  document.getElementById('f-from').value,
    dateTo:    document.getElementById('f-to').value,
    adminArea: document.getElementById('f-area').value,
    employee:  document.getElementById('f-emp').value
  };
}
function resetFilters() {
  document.getElementById('f-year').value  = new Date().getFullYear();
  document.getElementById('f-month').value = new Date().getMonth() + 1;
  document.getElementById('f-area').value  = '';
  document.getElementById('f-emp').value   = '';
  syncDates();
  applyFilters();
}
function renderTags() {
  const f = getF(); const tags = [];
  if (f.dateFrom && f.dateTo) tags.push(f.dateFrom + ' ← ' + f.dateTo);
  if (f.adminArea) tags.push(f.adminArea);
  if (f.employee)  tags.push(f.employee);
  document.getElementById('active-tags').innerHTML = tags.map(t =>
    `<span class="atag"><i data-lucide="filter" style="width:9px;height:9px"></i>${t}</span>`
  ).join('');
  lucide.createIcons();
}

/* ── LOAD ── */
async function applyFilters() {
  if (gLoading) return;
  gLoading = true;
  renderTags();
  document.getElementById('kpi-grid').innerHTML =
    `<div class="loader-box" style="grid-column:1/-1">
       <i data-lucide="loader-2" style="width:28px;height:28px;display:block;margin:0 auto 10px;opacity:.3" class="spin"></i>
       جاري تحميل البيانات...
     </div>`;
  document.getElementById('tabs-wrap').style.display = 'none';
  lucide.createIcons();

  try {
    const f   = getF();
    const req = { action: 'getDashboardStats' };
    if (f.dateFrom && f.dateTo) { req.dateFrom = f.dateFrom; req.dateTo = f.dateTo; }
    if (f.adminArea) req.adminArea = f.adminArea;
    if (f.employee)  req.employee  = f.employee;

    const res  = await fetch(CONFIG.API_URL, { method:'POST', body:JSON.stringify(req) });
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'فشل التحميل');
    gData = json.data;
    renderAll(gData);
    fillDropdowns(gData.adminAreaList || [], gData.employeeList || []);
  } catch(e) {
    document.getElementById('kpi-grid').innerHTML =
      `<div class="loader-box" style="grid-column:1/-1;color:var(--danger)">
         <i data-lucide="alert-circle" style="width:28px;height:28px;display:block;margin:0 auto 10px"></i>
         ⚠️ ${e.message}
       </div>`;
    lucide.createIcons();
  } finally { gLoading = false; }
}

function fillDropdowns(areas, emps) {
  const fa = document.getElementById('f-area');
  const fe = document.getElementById('f-emp');
  const ca = fa.value, ce = fe.value;
  fa.innerHTML = '<option value="">الكل</option>';
  areas.forEach(a => { const o=document.createElement('option'); o.value=a; o.textContent=a; if(a===ca)o.selected=true; fa.appendChild(o); });
  fe.innerHTML = '<option value="">الكل</option>';
  emps.forEach(e  => { const o=document.createElement('option'); o.value=e; o.textContent=e; if(e===ce)o.selected=true; fe.appendChild(o); });
}

/* ── RENDER ALL ── */
function renderAll(d) {
  const s = d.summary;
  renderKPIs(s);
  renderOverview(d);
  renderFindings(d);
  renderInout(d);
  renderReports(d);
  renderEscal(d);
  document.getElementById('tb-findings').textContent = s.total_findings;
  document.getElementById('tb-inout').textContent    = s.total_inout;
  document.getElementById('tb-reports').textContent  = s.total_reports;
  document.getElementById('tb-escal').textContent    = s.total_escalations;
  document.getElementById('tabs-wrap').style.display = '';
  lucide.createIcons();
}

/* ── KPI CARDS ── */
function renderKPIs(s) {
  const cards = [
    { cls:'kc-blue',   bg:'#dbeafe', ic:'building',        c:'#1d4ed8', v:s.visits_units,            l:'زيارات وحدات'          },
    { cls:'kc-sky',    bg:'#e0f2fe', ic:'hospital',        c:'#0369a1', v:s.visits_hospitals,         l:'زيارات مستشفيات'       },
    { cls:'kc-red',    bg:'#fee2e2', ic:'eye',             c:'#991b1b', v:s.total_findings,           l:'إجمالي الملاحظات'      },
    { cls:'kc-green',  bg:'#d1fae5', ic:'check-circle-2',  c:'#065f46', v:s.closed_findings,          l:'ملاحظات مغلقة'         },
    { cls:'kc-orange', bg:'#ffedd5', ic:'alert-circle',    c:'#c2410c', v:s.open_findings,            l:'ملاحظات مفتوحة'        },
    { cls:'kc-teal',   bg:'#ccfbf1', ic:'inbox',           c:'#0f766e', v:s.total_inout,              l:'المعاملات الواردة'     },
    { cls:'kc-amber',  bg:'#fef3c7', ic:'trending-up',     c:'#92400e', v:s.total_escalations,        l:'التصعيدات'             },
    { cls:'kc-rose',   bg:'#ffe4e6', ic:'gavel',           c:'#9f1239', v:s.legal_violations,         l:'محالة للقانونية'       },
  ];
  document.getElementById('kpi-grid').innerHTML = cards.map(c => `
    <div class="kc ${c.cls}">
      <div class="kc-icon" style="background:${c.bg}">
        <i data-lucide="${c.ic}" style="width:17px;height:17px;color:${c.c}"></i>
      </div>
      <div class="kc-val">${c.v !== undefined ? c.v : '—'}</div>
      <div class="kc-lbl">${c.l}</div>
    </div>`).join('');
  lucide.createIcons();
}

/* ── OVERVIEW TAB ── */
function renderOverview(d) {
  const s  = d.summary;
  const by = d.byAdminArea || [];
  const f  = getF();
  document.getElementById('ov-period').textContent = (f.dateFrom && f.dateTo) ? f.dateFrom + ' → ' + f.dateTo : '';

  const top = by.slice(0, 15);
  const mx  = Math.max(...top.map(u => u.total_findings), 1);
  document.getElementById('ov-bar-chart').innerHTML = top.length
    ? top.map(u => {
        const pct   = Math.max((u.total_findings / mx) * 100, u.total_findings > 0 ? 4 : 0).toFixed(1);
        const color = u.is_hospital ? '#7c3aed' : '#3b82f6';
        return `<div class="bar-row">
          <div class="bar-lbl" title="${u.area_name}">${u.area_name || '—'}</div>
          <div class="bar-track">
            <div class="bar-fill" style="width:${pct}%;background:${color}">
              ${u.total_findings > 0 ? '<span>' + u.total_findings + '</span>' : ''}
            </div>
          </div>
          <div class="bar-num">${u.total_findings}</div>
          <span class="bar-tag ${u.is_hospital ? 'bar-hosp' : 'bar-admin'}">${u.is_hospital ? 'مستشفى' : 'إدارة'}</span>
        </div>`;
      }).join('')
    : '<div class="empty-row">لا توجد بيانات</div>';

  document.getElementById('ov-summary').innerHTML = [
    { l:'زيارات وحدات',              v: s.visits_units },
    { l:'زيارات مستشفيات',           v: s.visits_hospitals },
    { l:'إجمالي الملاحظات',          v: s.total_findings },
    { l:'ملاحظات مغلقة',             v: s.closed_findings },
    { l:'ملاحظات مفتوحة/جارية',      v: s.open_findings },
    { l:'نسبة الإغلاق',              v: s.closure_rate + '%' },
    { l:'متوسط أيام الإغلاق',        v: s.avg_closure_days + ' يوم' },
    { l:'المعاملات الواردة',         v: s.total_inout },
    { l:'التزام SLA',                v: s.sla_compliance_rate + '%' },
    { l:'الشكاوى',                   v: s.total_complaints },
    { l:'التصعيدات الإجمالية',       v: s.total_escalations },
    { l:'التصعيدات الوزارية',        v: s.ministerial_escalations },
    { l:'محالة للشؤون القانونية',    v: s.legal_violations },
    { l:'التقارير الصادرة',          v: s.total_reports },
  ].map(r => `<div class="srow"><span class="slbl">${r.l}</span><span class="sval">${r.v}</span></div>`).join('');

  document.getElementById('ov-tbody').innerHTML = by.length
    ? by.map(u => {
        const rc = u.closure_rate >= 70 ? '' : 'low';
        return `<tr>
          <td style="font-weight:800">${u.area_name || '—'}</td>
          <td><span class="badge ${u.is_hospital ? 'b-hosp' : 'b-admin'}">${u.is_hospital ? 'مستشفى' : 'إدارة صحية'}</span></td>
          <td class="tn">${u.total_findings}</td>
          <td class="tn" style="color:#059669">${u.closed_findings}</td>
          <td class="tn" style="color:#dc2626">${u.open_findings}</td>
          <td>
            <div class="rbar">
              <div class="rtrack"><div class="rfill ${rc}" style="width:${u.closure_rate}%"></div></div>
              <span style="font-size:.72rem;font-weight:800">${u.closure_rate}%</span>
            </div>
          </td>
        </tr>`;
      }).join('')
    : '<tr><td colspan="6" class="empty-row">لا توجد بيانات</td></tr>';
}

/* ── FINDINGS TAB ── */
function renderFindings(d) {
  const s    = d.summary;
  const list = d.findingsList || [];
  const cls  = d.classifyBreakdown || [];
  const by   = d.byAdminArea || [];

  document.getElementById('f-mkrow').innerHTML = [
    { bg:'#fee2e2', c:'#991b1b', ic:'eye',          v:s.total_findings,  l:'إجمالي الملاحظات' },
    { bg:'#d1fae5', c:'#065f46', ic:'check-circle', v:s.closed_findings, l:'مغلقة'            },
    { bg:'#ffedd5', c:'#c2410c', ic:'clock',         v:s.open_findings,   l:'مفتوحة'           },
    { bg:'#fef3c7', c:'#92400e', ic:'clock-4',       v:s.avg_closure_days + 'd', l:'متوسط الإغلاق' },
  ].map(c => `
    <div class="mkcell">
      <div class="mki" style="background:${c.bg}">
        <i data-lucide="${c.ic}" style="width:16px;height:16px;color:${c.c}"></i>
      </div>
      <div><div class="mkv">${c.v}</div><div class="mkl">${c.l}</div></div>
    </div>`).join('');

  const clsTotal = cls.reduce((a, c) => a + c.count, 0);
  document.getElementById('f-classify-list').innerHTML = cls.length
    ? cls.map(c => {
        const pct = clsTotal > 0 ? Math.round((c.count / clsTotal) * 100) : 0;
        return `<div style="display:flex;align-items:center;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--border);font-size:.76rem">
          <span style="font-weight:700;color:var(--text-1)">${c.classify}</span>
          <span style="font-weight:800;color:var(--text-2)">${c.count} <span style="color:var(--text-3);font-size:.65rem">(${pct}%)</span></span>
        </div>`;
      }).join('')
    : '<div class="empty-row">—</div>';

  const hospTotal  = by.filter(u => u.is_hospital).reduce((a, u) => a + u.total_findings, 0);
  const adminTotal = by.filter(u => !u.is_hospital).reduce((a, u) => a + u.total_findings, 0);
  const grandTotal = hospTotal + adminTotal || 1;
  document.getElementById('f-type-split').innerHTML = `
    <div class="srow"><span class="slbl">🏥 مستشفيات</span><span class="sval">${hospTotal} <span style="font-size:.68rem;color:var(--text-3)">(${Math.round(hospTotal/grandTotal*100)}%)</span></span></div>
    <div class="srow"><span class="slbl">🏢 إدارات صحية</span><span class="sval">${adminTotal} <span style="font-size:.68rem;color:var(--text-3)">(${Math.round(adminTotal/grandTotal*100)}%)</span></span></div>
  `;

  document.getElementById('f-count-lbl').textContent =
    list.length < 100 ? list.length + ' ملاحظة' : 'أول 100 من ' + s.total_findings;

  document.getElementById('f-tbody').innerHTML = list.length
    ? list.map((r, i) => {
        const stCls = r.status === 'مغلق'  ? 'b-closed'
                    : r.status === 'مفتوح' ? 'b-open' : 'b-progress';
        const svCls = /عالي|high/i.test(r.severity) ? 'color:#dc2626;font-weight:800'
                    : /متوسط|med/i.test(r.severity)  ? 'color:#d97706;font-weight:800'
                    : 'color:#059669';
        return `<tr>
          <td style="color:var(--text-3)">${i+1}</td>
          <td style="max-width:110px;overflow:hidden;text-overflow:ellipsis;font-weight:700" title="${r.area}">${r.area || '—'}</td>
          <td><span class="badge ${r.isHosp ? 'b-hosp' : 'b-admin'}">${r.isHosp ? 'مستشفى' : 'إدارة'}</span></td>
          <td>${r.date}</td>
          <td style="max-width:90px;overflow:hidden;text-overflow:ellipsis" title="${r.section}">${r.section || '—'}</td>
          <td style="font-family:monospace;font-size:.68rem">${r.code || '—'}</td>
          <td style="max-width:110px;overflow:hidden;text-overflow:ellipsis;font-size:.68rem" title="${r.classify}">${r.classify || '—'}</td>
          <td style="${svCls}">${r.severity || '—'}</td>
          <td><span class="badge ${stCls}">${r.status || '—'}</span></td>
          <td style="max-width:90px;overflow:hidden;text-overflow:ellipsis" title="${r.officer}">${r.officer || '—'}</td>
        </tr>`;
      }).join('')
    : '<tr><td colspan="10" class="empty-row">لا توجد ملاحظات في هذا النطاق</td></tr>';
}

/* ── INOUT TAB ── */
function renderInout(d) {
  const s   = d.summary;
  const byT = d.byInoutType || [];

  document.getElementById('io-mkrow').innerHTML = [
    { bg:'#e0e7ff', c:'#4338ca', ic:'inbox',          v:s.total_inout,             l:'إجمالي المعاملات' },
    { bg:'#d1fae5', c:'#065f46', ic:'check',           v:s.sla_compliance_rate+'%', l:'التزام SLA'       },
    { bg:'#fef3c7', c:'#92400e', ic:'message-circle',  v:s.total_complaints,        l:'الشكاوى'          },
  ].map(c => `
    <div class="mkcell">
      <div class="mki" style="background:${c.bg}">
        <i data-lucide="${c.ic}" style="width:16px;height:16px;color:${c.c}"></i>
      </div>
      <div><div class="mkv">${c.v}</div><div class="mkl">${c.l}</div></div>
    </div>`).join('');

  document.getElementById('io-type-tbody').innerHTML = byT.length
    ? byT.map(t => {
        const rc = t.sla_rate > 0 && t.sla_rate < 80 ? 'low' : '';
        return `<tr>
          <td style="font-weight:800">${t.type}</td>
          <td class="tn">${t.total}</td>
          <td class="tn" style="color:#059669">${t.done}</td>
          <td class="tn" style="color:#d97706">${t.pending}</td>
          <td>${t.sla_rate > 0
            ? `<div class="rbar"><div class="rtrack"><div class="rfill ${rc}" style="width:${t.sla_rate}%"></div></div><span style="font-size:.72rem;font-weight:800">${t.sla_rate}%</span></div>`
            : '<span style="color:var(--text-3);font-size:.72rem">—</span>'
          }</td>
        </tr>`;
      }).join('')
    : '<tr><td colspan="5" class="empty-row">لا توجد معاملات في هذا النطاق</td></tr>';
}

/* ── REPORTS TAB ── */
function renderReports(d) {
  const s   = d.summary;
  const byR = d.byReportType || [];
  const tot = s.total_reports;

  document.getElementById('rp-mkrow').innerHTML = [
    { bg:'#dbeafe', c:'#1d4ed8', ic:'file-text', v: tot,               l:'إجمالي التقارير الصادرة' },
    { bg:'#ffe4e6', c:'#9f1239', ic:'gavel',     v: s.legal_violations, l:'محالة للشؤون القانونية' },
  ].map(c => `
    <div class="mkcell">
      <div class="mki" style="background:${c.bg}">
        <i data-lucide="${c.ic}" style="width:16px;height:16px;color:${c.c}"></i>
      </div>
      <div><div class="mkv">${c.v}</div><div class="mkl">${c.l}</div></div>
    </div>`).join('');

  document.getElementById('rp-tbody').innerHTML = byR.length
    ? byR.map(r => {
        const pct = tot > 0 ? Math.round((r.total / tot) * 100) : 0;
        return `<tr>
          <td style="font-weight:800">${r.type}</td>
          <td class="tn">${r.total}</td>
          <td>
            <div class="rbar">
              <div class="rtrack"><div class="rfill" style="width:${pct}%"></div></div>
              <span style="font-size:.72rem;font-weight:800">${pct}%</span>
            </div>
          </td>
        </tr>`;
      }).join('')
    : '<tr><td colspan="3" class="empty-row">لا توجد تقارير في هذا النطاق</td></tr>';

  document.getElementById('sv-complaints').textContent    = s.total_complaints;
  document.getElementById('sv-legal').textContent         = s.legal_violations;
  document.getElementById('sv-ministerial').textContent   = s.ministerial_escalations;
  document.getElementById('sv-escal-total').textContent   = s.total_escalations;
}

/* ── ESCAL TAB ── */
function renderEscal(d) {
  const s    = d.summary;
  const list = d.escalList || [];

  document.getElementById('e-mkrow').innerHTML = [
    { bg:'#ffedd5', c:'#c2410c', ic:'trending-up', v:s.total_escalations,       l:'إجمالي التصعيدات' },
    { bg:'#ede9fe', c:'#5b21b6', ic:'landmark',    v:s.ministerial_escalations, l:'تصعيدات وزارية'   },
  ].map(c => `
    <div class="mkcell">
      <div class="mki" style="background:${c.bg}">
        <i data-lucide="${c.ic}" style="width:16px;height:16px;color:${c.c}"></i>
      </div>
      <div><div class="mkv">${c.v}</div><div class="mkl">${c.l}</div></div>
    </div>`).join('');

  document.getElementById('e-tbody').innerHTML = list.length
    ? list.map(e => {
        const isMin = e.type && e.type.indexOf('وزاري') >= 0;
        const isLeg = e.type && e.type.indexOf('قانوني') >= 0;
        const bc    = isMin ? 'b-min' : isLeg ? 'b-legal' : 'b-progress';
        return `<tr>
          <td style="font-family:monospace;font-size:.7rem">${e.car_id || '—'}</td>
          <td style="font-weight:800">${e.unit || '—'}</td>
          <td><span class="badge ${bc}">${e.type || '—'}</span></td>
          <td>${e.date}</td>
        </tr>`;
      }).join('')
    : '<tr><td colspan="4" class="empty-row">لا توجد تصعيدات في هذا النطاق</td></tr>';
}

/* ── TABS / MENU ── */
function switchTab(id, btn) {
  document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('tab-' + id).classList.add('active');
  btn.classList.add('active');
  lucide.createIcons();
}
function toggleMenu() {
  document.getElementById('side-menu').classList.toggle('open');
  document.getElementById('menu-overlay').classList.toggle('open');
}
function closeMenu() {
  document.getElementById('side-menu').classList.remove('open');
  document.getElementById('menu-overlay').classList.remove('open');
}
function logout() { localStorage.clear(); location.href = 'index.html'; }
