const fs = require('fs');

let coord = fs.readFileSync('preview_coordinator.html', 'utf8');

// 1. REWRITE CSS FOR COORDINATOR
const cssStart = coord.indexOf('<style>');
const cssEnd = coord.indexOf('</style>') + 8;

const newCss = "<style>\n" +
"/* 🔥 WOW EXECUTIVE THEME 🔥 */\n" +
"body { font-family: 'Cairo', sans-serif; background-color: #0f172a; color: #e2e8f0; margin: 0; font-size: 14px; padding-bottom:100px; -webkit-tap-highlight-color: transparent; }\n" +
":root { --primary: #0f766e; }\n" +
"\n" +
"/* ── HEADER ── */\n" +
".page-header {\n" +
"    background: #020617;\n" +
"    background-image: radial-gradient(circle at 100% 0%, rgba(15,118,110,0.5) 0%, transparent 60%), radial-gradient(circle at 0% 100%, rgba(14,165,233,0.2) 0%, transparent 70%);\n" +
"    color: white; padding: 2.5rem 1.5rem 6.5rem;\n" +
"    position: relative; z-index: 10;\n" +
"    box-shadow: 0 10px 40px -10px rgba(0,0,0,0.8);\n" +
"    border-bottom: 1px solid rgba(255,255,255,0.05);\n" +
"}\n" +
".header-badge { display: inline-flex; align-items: center; gap: 6px; background: rgba(255,255,255,0.1); padding: 4px 12px; border-radius: 20px; font-size: 0.8rem; font-weight: 700; border: 1px solid rgba(255,255,255,0.1); backdrop-filter: blur(5px); margin-bottom: 12px; }\n" +
".header-title { font-size: 2rem; font-weight: 900; margin-bottom: 4px; background: linear-gradient(135deg, #fff, #94a3b8); -webkit-background-clip: text; -webkit-text-fill-color: transparent; display: flex; align-items: center; gap: 12px; }\n" +
".header-logo { width: 50px; height: 50px; object-fit: contain; filter: drop-shadow(0 0 10px rgba(255,255,255,0.2)); }\n" +
".header-sub { font-size: 0.85rem; color: #64748b; font-family: sans-serif; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 15px;}\n" +
"\n" +
"/* ── FILTERS ── */\n" +
".filter-container {\n" +
"    margin: -3rem 1rem 2rem; position: relative; z-index: 20;\n" +
"    background: rgba(30,30,40,0.6); backdrop-filter: blur(25px); -webkit-backdrop-filter: blur(25px);\n" +
"    border-radius: 24px; padding: 1.5rem;\n" +
"    box-shadow: 0 20px 50px -10px rgba(0,0,0,0.5), inset 0 1px 1px rgba(255,255,255,0.1);\n" +
"    border: 1px solid rgba(255,255,255,0.1);\n" +
"}\n" +
"@media(min-width: 1024px) { .filter-container { max-width: 1300px; margin: -3rem auto 2rem; } .filter-grid { flex-direction: row; align-items: flex-end; gap: 16px; } .filter-item-search { flex: 2; } .filter-item { flex: 1; } }\n" +
".filter-grid { display: flex; flex-direction: column; gap: 12px; }\n" +
".f-label { font-size: 0.72rem; font-weight: 800; color: #94a3b8; margin-bottom: 8px; display: block; letter-spacing: 0.5px; }\n" +
".f-input { width: 100%; height: 48px; border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; font-size: 0.9rem; font-weight: 700; outline: none; background: rgba(0,0,0,0.3); color: white; transition: 0.3s; padding: 0 14px; font-family: 'Cairo', sans-serif; }\n" +
".f-input:focus { border-color: #14b8a6; background: rgba(0,0,0,0.5); box-shadow: 0 0 0 3px rgba(20,184,166,0.2); }\n" +
".f-input option { background: #1e293b; color: white; }\n" +
".f-input optgroup { background: #0f172a; color: #94a3b8; font-weight: 900;}\n" +
".search-wrapper { position: relative; }\n" +
".search-input { padding-right: 14px; padding-left: 44px; }\n" +
".search-icon { position: absolute; left: 14px; top: 14px; width: 20px; height: 20px; color: #64748b; }\n" +
"\n" +
".btn-print { background: rgba(255,255,255,0.05); color: #cbd5e1; border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; height: 48px; width: 48px; cursor: pointer; transition: 0.3s; display: flex; align-items: center; justify-content: center; }\n" +
".btn-print:hover { background: rgba(255,255,255,0.1); transform: translateY(-2px); }\n" +
".btn-missing { background: rgba(225,29,72,0.1); color: #f43f5e; border: 1px solid rgba(225,29,72,0.2); border-radius: 12px; height: 48px; padding: 0 16px; font-weight: 800; font-size: 0.85rem; cursor: pointer; transition: 0.3s; display: flex; align-items: center; gap: 8px; font-family: 'Cairo', sans-serif; white-space: nowrap; }\n" +
".btn-missing:hover { background: rgba(225,29,72,0.2); transform: translateY(-2px); }\n" +
".btn-missing.active { background: #e11d48; color: white; border-color: #be123c; box-shadow: 0 5px 15px rgba(225,29,72,0.4); }\n" +
"\n" +
"/* ── KPI OLYMPUS STATS ── */\n" +
".stats-wrapper { padding: 0 1rem 1.5rem; max-width: 1300px; margin: 0 auto; display: flex; flex-direction: column; gap: 16px; }\n" +
".stats-row-big { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; }\n" +
".stats-row-small { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }\n" +
"@media (min-width: 768px) { .stats-row-big { grid-template-columns: repeat(6, 1fr); } .stats-row-small { display: contents; } }\n" +
"\n" +
".stat-card-big, .stat-card-small { \n" +
"    background: linear-gradient(145deg, rgba(30,41,59,0.7), rgba(15,23,42,0.9)); \n" +
"    border: 1px solid rgba(255,255,255,0.05); border-radius: 24px; padding: 18px; text-align: center; \n" +
"    cursor: pointer; display: flex; flex-direction: column; justify-content: center; \n" +
"    transition: 0.3s cubic-bezier(0.4, 0, 0.2, 1); position: relative; overflow: hidden; \n" +
"    backdrop-filter: blur(10px); box-shadow: 0 10px 20px rgba(0,0,0,0.3);\n" +
"}\n" +
".stat-card-small { padding: 14px; }\n" +
".stat-card-big::before, .stat-card-small::before { content: ''; position: absolute; inset: 0; background: radial-gradient(circle at top right, rgba(255,255,255,0.05), transparent); pointer-events: none; }\n" +
".stat-card-big:hover, .stat-card-small:hover { transform: translateY(-4px) scale(1.02); box-shadow: 0 20px 30px rgba(0,0,0,0.5); border-color: rgba(255,255,255,0.15); }\n" +
"\n" +
"/* Glowing neon hovers */\n" +
"#st-total:hover { border-color: #cbd5e1; }\n" +
"#st-late:hover { border-color: #f43f5e; box-shadow: 0 10px 30px rgba(244,63,94,0.3); }\n" +
"#st-new:hover { border-color: #3b82f6; box-shadow: 0 10px 30px rgba(59,130,246,0.3); }\n" +
"#st-pending:hover { border-color: #f59e0b; box-shadow: 0 10px 30px rgba(245,158,11,0.3); }\n" +
"#st-approved:hover { border-color: #10b981; box-shadow: 0 10px 30px rgba(16,185,129,0.3); }\n" +
"#st-followup:hover { border-color: #8b5cf6; box-shadow: 0 10px 30px rgba(139,92,246,0.3); }\n" +
"\n" +
".stat-card-big.active, .stat-card-small.active { background: rgba(0,0,0,0.5) !important; border: 2px solid #14b8a6 !important; box-shadow: 0 0 30px rgba(20,184,166,0.2) !important; transform: scale(1.03); }\n" +
"\n" +
".stat-card-big .num, .stat-card-small .num { font-size: 2.5rem; font-weight: 900; line-height: 1; margin-bottom: 6px; letter-spacing: -0.5px; text-shadow: 0 2px 10px rgba(0,0,0,0.5); }\n" +
".stat-card-small .num { font-size: 1.8rem; }\n" +
".stat-card-big .lbl, .stat-card-small .lbl { font-size: 0.8rem; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px; }\n" +
"\n" +
".txt-total { color: #f8fafc; } .txt-late { color: #f43f5e; } .txt-new { color: #60a5fa; }\n" +
".txt-pending { color: #fbbf24; } .txt-approved { color: #34d399; } .txt-followup { color: #c084fc; }\n" +
"\n" +
"\n" +
"/* ── WOW TASK CARDS ── */\n" +
".cards-container { padding: 0 1rem 5rem; display: flex; flex-direction: column; gap: 20px; max-width: 1300px; margin: 0 auto; }\n" +
"@media (min-width: 1280px) { .cards-container { display: grid; grid-template-columns: repeat(2, 1fr); gap: 24px; } }\n" +
"\n" +
".task-card { \n" +
"    background: rgba(30,41,59,0.6); backdrop-filter: blur(15px); border-radius: 28px; \n" +
"    border: 1px solid rgba(255,255,255,0.05); overflow: hidden; display: flex; flex-direction: column; \n" +
"    transition: 0.4s cubic-bezier(0.4, 0, 0.2, 1); box-shadow: 0 15px 35px rgba(0,0,0,0.3); position: relative; \n" +
"}\n" +
"@media (min-width: 768px) { .task-card { flex-direction: row; align-items: stretch; } }\n" +
".task-card:hover { transform: translateY(-5px); box-shadow: 0 30px 50px rgba(0,0,0,0.5); background: rgba(30,41,59,0.9); border-color: rgba(255,255,255,0.15); }\n" +
"\n" +
"/* Left Glow Border */\n" +
".task-card::before { content: ''; position: absolute; right: 0; top: 0; bottom: 0; width: 6px; background: #64748b; }\n" +
".task-card.bg-late::before { background: #e11d48; box-shadow: 0 0 20px #e11d48; }\n" +
".task-card.bg-new::before { background: #3b82f6; box-shadow: 0 0 20px #3b82f6; }\n" +
".task-card.bg-pending::before { background: #f59e0b; box-shadow: 0 0 20px #f59e0b; }\n" +
".task-card.bg-approved::before { background: #10b981; box-shadow: 0 0 20px #10b981; }\n" +
".task-card.bg-followup::before { background: #8b5cf6; box-shadow: 0 0 20px #8b5cf6; }\n" +
"\n" +
".task-card.has-missing { border: 1px dashed rgba(245, 158, 11, 0.3); }\n" +
"\n" +
".card-body { padding: 22px; flex: 2; display: flex; flex-direction: column; gap: 14px; }\n" +
".card-stripe { display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; }\n" +
".card-id { font-size: 0.85rem; font-weight: 900; color: #5eead4; background: rgba(20,184,166,0.1); padding: 4px 14px; border-radius: 20px; border: 1px solid rgba(20,184,166,0.2); letter-spacing: 0.5px; }\n" +
".card-status { font-size: 0.82rem; font-weight: 800; color: #94a3b8; }\n" +
".tc-subject { font-size: 1.25rem; font-weight: 900; color: white; line-height: 1.5; text-shadow: 0 2px 4px rgba(0,0,0,0.5); }\n" +
".tc-row { display: flex; align-items: center; gap: 10px; font-size: 0.85rem; color: #cbd5e1; font-weight: 600; }\n" +
".tc-row i { color: #64748b; }\n" +
"\n" +
".card-assignee { flex: 1; min-width: 0; padding: 22px; background: rgba(15,23,42,0.4); border-top: 1px solid rgba(255,255,255,0.05); display: flex; flex-direction: column; gap: 16px; justify-content: center; }\n" +
"@media (min-width: 768px) { .card-assignee { border-top: none; border-right: 1px solid rgba(255,255,255,0.05); } }\n" +
".assignee-avatar { width: 44px; height: 44px; border-radius: 50%; background: #0f172a; color: white; display: flex; align-items: center; justify-content: center; font-weight: 900; font-size: 0.9rem; flex-shrink: 0; border: 2px solid rgba(255,255,255,0.1); box-shadow: 0 4px 10px rgba(0,0,0,0.3); }\n" +
"\n" +
".tc-footer { flex-shrink: 0; padding: 20px; background: rgba(2,6,23,0.4); border-top: 1px solid rgba(255,255,255,0.05); display: flex; align-items: center; justify-content: center; }\n" +
"@media (min-width: 768px) { .tc-footer { border-top: none; border-right: 1px solid rgba(255,255,255,0.05); width: 140px; padding: 20px; } }\n" +
".btn-card { width: 100%; padding: 14px; background: linear-gradient(135deg, #14b8a6, #0f766e); color: white; border: none; border-radius: 16px; font-weight: 900; font-size: 0.9rem; display: flex; flex-direction: row; align-items: center; justify-content: center; gap: 8px; cursor: pointer; transition: 0.3s; box-shadow: 0 10px 20px -5px rgba(20,184,166,0.4); font-family: 'Cairo', sans-serif;}\n" +
"@media (min-width: 768px) { .btn-card { flex-direction: column; gap: 10px; height: 100%; font-size: 0.95rem; } }\n" +
".btn-card:hover { transform: translateY(-3px) scale(1.02); box-shadow: 0 15px 30px -5px rgba(20,184,166,0.6); background: linear-gradient(135deg, #0d9488, #0f766e); }\n" +
"\n" +
"/* Semantic Attach Pills (DARK NEON EDITION) */\n" +
".attach-pills { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 8px; }\n" +
".attach-pill { font-size: 0.75rem; font-weight: 800; padding: 6px 14px; border-radius: 20px; display: inline-flex; align-items: center; gap: 6px; cursor: pointer; border: 1px solid transparent; white-space: nowrap; transition: 0.3s; font-family: 'Cairo', sans-serif; }\n" +
".attach-green { background: rgba(16,185,129,0.1); color: #34d399; border-color: rgba(16,185,129,0.3); }\n" +
".attach-green:hover { background: rgba(16,185,129,0.2); border-color: rgba(16,185,129,0.6); box-shadow: 0 0 10px rgba(16,185,129,0.2); }\n" +
".attach-warn { background: rgba(245,158,11,0.1); color: #fbbf24; border-color: rgba(245,158,11,0.3); }\n" +
".attach-warn:hover { background: rgba(245,158,11,0.2); border-color: rgba(245,158,11,0.6); box-shadow: 0 0 10px rgba(245,158,11,0.2); }\n" +
".attach-danger { background: rgba(225,29,72,0.1); color: #fb7185; border-color: rgba(225,29,72,0.3); }\n" +
".attach-danger:hover { background: rgba(225,29,72,0.2); border-color: rgba(225,29,72,0.6); box-shadow: 0 0 10px rgba(225,29,72,0.2); }\n" +
".attach-grey { background: rgba(255,255,255,0.05); color: #94a3b8; border-color: rgba(255,255,255,0.1); cursor: default; }\n" +
"\n" +
".badge-missing { display: inline-flex; align-items: center; gap: 6px; background: rgba(245,158,11,0.15); color: #fde68a; font-size: 0.72rem; font-weight: 800; padding: 4px 12px; border-radius: 12px; border: 1px solid rgba(245,158,11,0.4); }\n" +
".badge-case { display: inline-flex; align-items: center; gap: 6px; font-size: 0.75rem; font-weight: 900; padding: 4px 12px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1); }\n" +
".badge-case-na { background: rgba(139,92,246,0.1); color: #c4b5fd; border-color: rgba(139,92,246,0.3); }\n" +
".badge-case-sq { background: rgba(225,29,72,0.1); color: #fda4af; border-color: rgba(225,29,72,0.3); }\n" +
".linked-in { font-size: 0.75rem; color: #93c5fd; background: rgba(59,130,246,0.1); border-radius: 8px; padding: 4px 12px; font-weight: 900; border: 1px solid rgba(59,130,246,0.3); }\n" +
"\n" +
"/* Context Bar */\n" +
".context-bar { max-width: 1300px; margin: 0 1rem 16px; background: rgba(30,41,59,0.7); backdrop-filter: blur(20px); border: 1px solid rgba(255,255,255,0.05); border-radius: 20px; padding: 14px 20px; display: flex; align-items: center; gap: 16px; flex-wrap: wrap; box-shadow: 0 15px 30px rgba(0,0,0,0.3); }\n" +
".ctx-label { font-size: 0.8rem; color: #94a3b8; font-weight: 800; }\n" +
".ctx-total { font-size: 0.95rem; font-weight: 900; color: white; }\n" +
".ctx-divider { width: 1px; height: 24px; background: rgba(255,255,255,0.1); flex-shrink: 0; }\n" +
".ctx-chip { display: inline-flex; align-items: center; gap: 8px; padding: 8px 16px; border-radius: 20px; font-size: 0.85rem; font-weight: 900; cursor: pointer; border: 1px solid rgba(255,255,255,0.1); transition: 0.3s; background: rgba(0,0,0,0.3); color: #cbd5e1; font-family: 'Cairo', sans-serif;}\n" +
".ctx-chip:hover { background: rgba(255,255,255,0.1); color: white; }\n" +
".ctx-chip.active { background: #0f766e; color: white; border-color: #14b8a6; box-shadow: 0 0 20px rgba(20,184,166,0.4); }\n" +
".ctx-count { background: rgba(0,0,0,0.4); border-radius: 12px; padding: 2px 10px; font-size: 0.75rem; font-weight: 900; }\n" +
".ctx-chip.active .ctx-count { background: rgba(255,255,255,0.2); }\n" +
"@media (min-width: 1024px) { .context-bar { margin: 0 auto 16px; } }\n" +
"\n" +
".loader-box { text-align: center; padding: 6rem; color: #94a3b8; }\n" +
".empty-box { text-align: center; padding: 6rem; color: #64748b; border: 2px dashed rgba(255,255,255,0.1); border-radius: 28px; background: rgba(30,41,59,0.3); font-weight: 900;}\n" +
"\n" +
"/* Table and Modals hidden or customized for dark mode */\n" +
".table-wrapper { display: none !important; }\n" +
".hidden { display: none !important; }\n" +
".modal-box { background: #0f172a; color: white; border: 1px solid rgba(255,255,255,0.1); }\n" +
".modal-header { border-bottom: 1px solid rgba(255,255,255,0.1); }\n" +
".modal-footer { border-top: 1px solid rgba(255,255,255,0.1); background: #020617; }\n" +
".modal-header h3 { color: white; }\n" +
".data-label { color: #94a3b8; } .data-val { color: white; }\n" +
".data-item { border-bottom: 1px solid rgba(255,255,255,0.05); }\n" +
".modal-header button { color: white; background: rgba(255,255,255,0.05); }\n" +
".modal-header button:hover { background: rgba(225,29,72,0.2); color: #fb7185; }\n" +
".upload-area { border-color: rgba(255,255,255,0.1); background: rgba(0,0,0,0.3); }\n" +
".edit-input { background: rgba(0,0,0,0.3); color: white; border-color: rgba(255,255,255,0.1); }\n" +
"</style>";

coord = coord.replace(coord.substring(cssStart, cssEnd), newCss);

// 2. INJECT LOGO IN HEADER
if(coord.includes('<h1 class=\"header-title\">إدارة المراجعة الداخلية والحوكمة</h1>')) {
    coord = coord.replace('<h1 class=\"header-title\">إدارة المراجعة الداخلية والحوكمة</h1>', 
        '<h1 class=\"header-title\"><img src=\"assets/icons/icon-512.png\" class=\"header-logo\" alt=\"Logo\"> إدارة المراجعة الداخلية والحوكمة</h1>');
}

// 3. REWRITE RENDER TASKS RETURN STRING USING SIMPLE INDEXING
const retStartRegex = /return `[\s\S]*?<div class="task-card \$\{bgClass\}/;
const matchStart = coord.match(retStartRegex);

if (matchStart) {
    const idxStart = matchStart.index;
    const endStr = '</div>`;\n            }).join(\'\');';
    const idxEnd = coord.indexOf(endStr, idxStart);
    if(idxEnd !== -1) {
        const replacement = "return `<div class=\"task-card ${bgClass} ${hasMissing ? 'has-missing' : ''}\">" +
        " <div class=\"card-body\">" +
        "  <div class=\"card-stripe\">" +
        "   <span class=\"card-id\">#${t.id}</span>" +
        "   <span class=\"card-status\">${t.status}${isFullyDone ? ' ✅' : ''}</span>" +
        "  </div>" +
        "  <h3 class=\"tc-subject\">${t.subject}</h3>" +
        "  <div class=\"tc-row\"><i data-lucide=\"building-2\" class=\"w-4 h-4 flex-shrink-0\"></i><span>${t.source || 'غير محدد'}</span></div>" +
        "  <div class=\"tc-row\"><i data-lucide=\"calendar\" class=\"w-4 h-4 flex-shrink-0\"></i><span>${formatArabicDate(t.date)}</span></div>" +
        "  ${caseBadge ? `<div class=\"tc-row\" style=\"flex-wrap:wrap;gap:6px\">${caseBadge}</div>` : ''}" +
        "  ${linkedParent ? `<div class=\"tc-row\">${linkedParent}</div>` : ''}" +
        " </div>" +
        " <div class=\"card-assignee\">" +
        "  <div style=\"display:flex;align-items:center;gap:12px\">" +
        "   <div class=\"assignee-avatar\">${t.assignee ? t.assignee.slice(0,2) : '؟'}</div>" +
        "   <div>" +
        "    <div style=\"font-size:0.75rem;font-weight:800;color:#94a3b8;line-height:1;margin-bottom:6px\">المكلف</div>" +
        "    <div style=\"font-size:1rem;font-weight:900;color:white;line-height:1.2\">${t.assignee || '<span style=\"color:#fb7185\">⚠ غير موزع</span>'}</div>" +
        "   </div>" +
        "  </div>" +
        "  <div class=\"attach-pills\">${btnAttach}${btnReview}${btnArchive}</div>" +
        " </div>" +
        " <div class=\"tc-footer\">" +
        "  <button onclick=\"openModal('${t.id}')\" class=\"btn-card\">" +
        "   <i data-lucide=\"settings-2\" class=\"w-5 h-5\"></i><span>معالجة الطلب</span>" +
        "  </button>" +
        " </div>" +
        "</div>`;";
        
        coord = coord.substring(0, idxStart) + replacement + coord.substring(idxEnd + 11);
    }
}

fs.writeFileSync('preview_coordinator.html', coord, 'utf8');

// 4. FORMS REWRITE TO MATCH DARK THEME
let formsHtml = fs.readFileSync('preview_forms.html', 'utf8');
const formCssStart = formsHtml.indexOf('<style>');
const formCssEnd = formsHtml.indexOf('</style>') + 8;
const formsNewCss = "<style>\n" +
"/* 🔥 WOW EXECUTIVE THEME 🔥 */\n" +
"body { font-family: 'Cairo', sans-serif; background-color: #0f172a; font-size: 14px; padding-bottom: 80px; -webkit-tap-highlight-color: transparent; margin: 0; color: #cbd5e1; }\n" +
":root { --primary: #0f766e; }\n" +
"\n" +
".page-header {\n" +
"    background: #020617;\n" +
"    background-image: radial-gradient(circle at 100% 0%, rgba(15,118,110,0.5) 0%, transparent 60%), radial-gradient(circle at 0% 100%, rgba(14,165,233,0.2) 0%, transparent 70%);\n" +
"    color: white; padding: 2.5rem 1.5rem 6.5rem;\n" +
"    box-shadow: 0 10px 40px -10px rgba(0,0,0,0.8);\n" +
"    position: relative; z-index: 10; border-bottom: 1px solid rgba(255,255,255,0.05);\n" +
"}\n" +
".header-badge { display: inline-flex; align-items: center; gap: 6px; background: rgba(255,255,255,0.1); padding: 4px 12px; border-radius: 20px; font-size: 0.8rem; font-weight: 700; border: 1px solid rgba(255,255,255,0.1); backdrop-filter: blur(5px); margin-bottom: 12px; color: white;}\n" +
".header-title { font-size: 2rem; font-weight: 900; margin-bottom: 4px; background: linear-gradient(135deg, #fff, #94a3b8); -webkit-background-clip: text; -webkit-text-fill-color: transparent; display: flex; align-items: center; gap: 12px;}\n" +
".header-logo { width: 50px; height: 50px; object-fit: contain; filter: drop-shadow(0 0 10px rgba(255,255,255,0.2)); }\n" +
".header-sub { font-size: 0.85rem; color: #64748b; font-family: sans-serif; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 15px; }\n" +
"\n" +
".forms-container {\n" +
"    padding: 0 1rem; margin: -4rem auto 2rem; position: relative; z-index: 20;\n" +
"    display: grid; gap: 20px; max-width: 1300px;\n" +
"}\n" +
"@media (min-width: 768px) { .forms-container { grid-template-columns: repeat(2, 1fr); gap: 24px; } }\n" +
"@media (min-width: 1024px) { .forms-container { grid-template-columns: repeat(3, 1fr); } }\n" +
"\n" +
".form-card {\n" +
"    background: rgba(30,41,59,0.7); backdrop-filter: blur(20px);\n" +
"    border: 1px solid rgba(255,255,255,0.05); border-radius: 28px; padding: 1.5rem;\n" +
"    display: flex; align-items: center; gap: 1.5rem; text-decoration: none;\n" +
"    transition: 0.4s cubic-bezier(0.4, 0, 0.2, 1); box-shadow: 0 15px 35px rgba(0,0,0,0.3);\n" +
"    position: relative; overflow: hidden;\n" +
"}\n" +
".form-card::after { content: ''; position: absolute; inset: 0; border: 2px solid transparent; border-radius: 28px; transition: 0.4s; pointer-events: none;}\n" +
".form-card:hover { transform: translateY(-5px); box-shadow: 0 30px 60px rgba(0,0,0,0.5); background: rgba(30,41,59,0.9); }\n" +
"\n" +
".form-card.hover-rose:hover::after { border-color: rgba(225,29,72,0.4); box-shadow: inset 0 0 20px rgba(225,29,72,0.1); }\n" +
".form-card.hover-teal:hover::after { border-color: rgba(20,184,166,0.4); box-shadow: inset 0 0 20px rgba(20,184,166,0.1); }\n" +
".form-card.hover-amber:hover::after { border-color: rgba(245,158,11,0.4); box-shadow: inset 0 0 20px rgba(245,158,11,0.1); }\n" +
".form-card.hover-blue:hover::after { border-color: rgba(59,130,246,0.4); box-shadow: inset 0 0 20px rgba(59,130,246,0.1); }\n" +
".form-card.hover-violet:hover::after { border-color: rgba(139,92,246,0.4); box-shadow: inset 0 0 20px rgba(139,92,246,0.1); }\n" +
"\n" +
".icon-box {\n" +
"    width: 64px; height: 64px; border-radius: 20px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;\n" +
"    box-shadow: 0 10px 20px rgba(0,0,0,0.3), inset 0 2px 4px rgba(255,255,255,0.2); position: relative;\n" +
"}\n" +
".form-card:hover .icon-box { transform: scale(1.05); }\n" +
"\n" +
".bg-teal { background: linear-gradient(135deg, #14b8a6, #0f766e); color: white; border: 1px solid rgba(20,184,166,0.3); }\n" +
".bg-rose { background: linear-gradient(135deg, #f43f5e, #be123c); color: white; border: 1px solid rgba(244,63,94,0.3); }\n" +
".bg-amber { background: linear-gradient(135deg, #f59e0b, #b45309); color: white; border: 1px solid rgba(245,158,11,0.3); }\n" +
".bg-blue { background: linear-gradient(135deg, #3b82f6, #1d4ed8); color: white; border: 1px solid rgba(59,130,246,0.3); }\n" +
".bg-violet { background: linear-gradient(135deg, #8b5cf6, #6d28d9); color: white; border: 1px solid rgba(139,92,246,0.3); }\n" +
"\n" +
".form-info { display: flex; flex-direction: column; justify-content: center; flex: 1; }\n" +
".form-info h3 { font-weight: 900; color: white; font-size: 1.15rem; letter-spacing: 0.5px; line-height: 1.2; text-shadow: 0 2px 4px rgba(0,0,0,0.5);}\n" +
".form-info p { font-size: 0.85rem; color: #94a3b8; font-weight: 700; margin-top: 6px; line-height: 1.4; }\n" +
"\n" +
".arrow-icon {\n" +
"    color: #475569; stroke-width: 2.5; transition: 0.4s; margin-right: auto;\n" +
"    background: rgba(0,0,0,0.3); border-radius: 50%; padding: 8px; flex-shrink: 0; width: 22px; height: 22px; box-sizing: content-box;\n" +
"}\n" +
".form-card:hover .arrow-icon { color: white; background: rgba(255,255,255,0.1); transform: translateX(-6px); }\n" +
".hidden { display: none !important; }\n" +
"</style>";

formsHtml = formsHtml.replace(formsHtml.substring(formCssStart, formCssEnd), formsNewCss);
if(formsHtml.includes('<h1 class=\"header-title\">إدارة المراجعة الداخلية والحوكمة</h1>')) {
    formsHtml = formsHtml.replace('<h1 class=\"header-title\">إدارة المراجعة الداخلية والحوكمة</h1>', 
        '<h1 class=\"header-title\"><img src=\"assets/icons/icon-512.png\" class=\"header-logo\" alt=\"Logo\"> إدارة المراجعة الداخلية والحوكمة</h1>');
}
fs.writeFileSync('preview_forms.html', formsHtml, 'utf8');

console.log('REWRITE SUCCESS');
