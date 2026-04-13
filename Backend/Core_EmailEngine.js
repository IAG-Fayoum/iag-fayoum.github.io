/* ==========================================================================
   04_EmailEngine.gs  (IAG System V8.1.3)
   ✅ MailApp is used ONLY here
   ✅ Table-based RTL HTML (Outlook-safe)
   ✅ Supports:
      - Task assignment (employee) — صياغة قانونية رسمية
      - Manager separate notification — إشعار مستقل للمتابعة والمساءلة
      - Report email (financial / tech hosp / tech units) + manager FYI
      - Complaint report email (employee + recipients) + manager FYI
      - legalDocUrl: رابط ملف الشؤون القانونية في إيميل التقرير
      - Multi-email: يدعم أكثر من إيميل للموظف مفصولين بفاصلة
   Prefix: emailV81_
   ========================================================================== */

const emailV81_LOGO_URL = "";
const emailV81_PRIMARY  = "#044d47";
const emailV81_BG       = "#f1f5f9";
const emailV81_DARK     = "#022c29";

/* =============================================================================
   ========== Recipients Resolution ============================================
   ============================================================================= */

function emailV8_resolveRecipients(reportType) {
  const ss      = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const rulesSh = ss.getSheetByName(SHEETS.DISTRIBUTION_RULES);
  const empSh   = ss.getSheetByName(SHEETS.EMPLOYEES);
  if (!rulesSh) throw new Error("Missing sheet: " + SHEETS.DISTRIBUTION_RULES);
  if (!empSh)   throw new Error("Missing sheet: " + SHEETS.EMPLOYEES);

  const rulesMap = schemaV8_buildHeaderMap(rulesSh);
  const empMap   = schemaV8_buildHeaderMap(empSh);

  const idxTask   = rulesMap["نوع_المهمة"];
  const idxTitles = rulesMap["المسميات_المستلمة"];
  if (idxTask === undefined) throw new Error("DISTRIBUTION_RULES missing required headers.");
  if (idxTitles === undefined) return [];

  const idxEmpName   = empMap["الاسم"];
  const idxEmpEmail  = empMap["الايميل"] !== undefined ? empMap["الايميل"] : empMap["الإيميل"];
  const idxEmpTitle  = empMap["المسمى_الوظيفي"];
  const idxEmpActive = empMap["نشط"];
  if (idxEmpName === undefined || idxEmpEmail === undefined ||
      idxEmpTitle === undefined || idxEmpActive === undefined) {
    throw new Error("EMPLOYEES missing required headers.");
  }

  const rules = rulesSh.getRange(2, 1, Math.max(0, rulesSh.getLastRow() - 1), rulesSh.getLastColumn()).getValues();
  let titlesCsv = "";
  for (let i = 0; i < rules.length; i++) {
    const t = String(rules[i][idxTask] || "").trim();
    if (t === String(reportType || "").trim()) {
      titlesCsv = String(rules[i][idxTitles] || "").trim();
      break;
    }
  }
  if (!titlesCsv) return [];

  const wantedTitles = titlesCsv.split(/[,،]/).map(s => String(s || "").trim()).filter(Boolean);
  if (!wantedTitles.length) return [];

  const emps = empSh.getRange(2, 1, Math.max(0, empSh.getLastRow() - 1), empSh.getLastColumn()).getValues();
  const out = [], seen = {};
  for (let i = 0; i < emps.length; i++) {
    const active = emps[i][idxEmpActive];
    if (String(active).toLowerCase() !== "true" && active !== true) continue;
    const title = String(emps[i][idxEmpTitle] || "").trim();
    if (wantedTitles.indexOf(title) === -1) continue;
    const emailRaw = String(emps[i][idxEmpEmail] || "").trim();
    if (!emailRaw) continue;
    // دعم أكثر من إيميل مفصولين بفاصلة أو مسافة
    emailRaw.split(/[,;،\s]+/).forEach(function(em) {
      em = em.trim();
      if (!em || em.indexOf("@") === -1) return;
      if (seen[em.toLowerCase()]) return;
      seen[em.toLowerCase()] = true;
      out.push({
        name:  String(emps[i][idxEmpName] || "").trim() || em.split("@")[0],
        email: em
      });
    });
  }
  return out;
}

/* =============================================================================
   ========== Public Senders ====================================================
   ============================================================================= */

function emailV8_sendTaskAssignment(params) {
  try {
  params = params || {};
  const toEmail = String(params.toEmail || "").trim();
  if (!toEmail) throw new Error("emailV8_sendTaskAssignment: missing toEmail");

  const assigneeName  = String(params.assigneeName || "").trim() || "الموظف المختص";
  const inboundId     = String(params.inboundId    || "").trim();
  const subj          = String(params.subject      || "").trim() || "تكليف جديد";
  const fromEntity    = String(params.fromEntity   || params.entity || "").trim();
  const docType       = String(params.docType      || "وارد").trim();
  const importance    = String(params.importance   || "").trim();
  const caseNo        = String(params.caseNo       || "").trim();
  const attachmentUrl = String(params.attachmentUrl || "").trim();

  const deadline = String(params.deadlineStr || "").trim() ||
    (params.deadline instanceof Date ? fmtV8_dateArabic(params.deadline) :
     (params.deadline ? String(params.deadline) : "غير محدد"));

  const taskDate = String(params.taskDateStr || "").trim() ||
    (params.taskDate instanceof Date ? fmtV8_dateArabic(params.taskDate) :
     (params.taskDate ? String(params.taskDate) : fmtV8_dateArabic(new Date())));

  const htmlEmployee = emailV81_tplAssignmentEmployee_({
    assigneeName:  assigneeName,
    inboundId:     inboundId,
    subject:       subj,
    fromEntity:    fromEntity,
    docType:       docType,
    importance:    importance,
    deadline:      deadline,
    taskDate:      taskDate,
    caseNo:        caseNo,
    attachmentUrl: attachmentUrl
  });

  const fullSubject = "📋 تكليف رسمي - " + (inboundId ? ("رقم " + inboundId + " - ") : "") + subj;
  MailApp.sendEmail({ to: toEmail, subject: fullSubject, htmlBody: htmlEmployee });

  var managerEmail = "";
  try { managerEmail = String(CONFIG.get("MANAGER_EMAIL", "") || "").trim(); } catch (_e) {}
  if (!managerEmail) try { managerEmail = String(CONFIG.getManagerEmail() || "").trim(); } catch (_e) {}

  try {
    if (managerEmail && managerEmail.indexOf("@") !== -1) {
      var managerHtml = emailV81_tplAssignmentManager_({
        assigneeName:  assigneeName,
        inboundId:     inboundId,
        subject:       subj,
        fromEntity:    fromEntity,
        importance:    importance,
        deadline:      deadline,
        taskDate:      taskDate,
        attachmentUrl: attachmentUrl
      });
      MailApp.sendEmail({
        to:       managerEmail,
        subject:  "📋 إشعار تكليف رسمي - " + (inboundId ? ("رقم " + inboundId + " - ") : "") + subj,
        htmlBody: managerHtml
      });
    }
  } catch (_me) {
    try { if (typeof auditEngine_logError === "function") auditEngine_logError("04_EmailEngine", "emailV8_sendTaskAssignment_managerEmail", _me); } catch (_) {}
  }

  return { ok: true, sent: true, to: toEmail, managerNotified: !!managerEmail };
  } catch (err) {
    if (typeof auditEngine_logError === "function") auditEngine_logError("04_EmailEngine", "emailV8_sendTaskAssignment", err);
    return { ok: false, sent: false, error: String(err.message || err) };
  }
}

/**
 * Report email + attach PDF (if provided).
 * ✅ يدعم أكثر من موظف مفصولين بفاصلة في authorName
 * ✅ يدعم أكثر من إيميل للموظف مفصولين بفاصلة في الشيت
 * ✅ يدعم extraPdfBlobs: مرفقات PDF إضافية
 * ✅ يدعم legalDocUrl: رابط ملف الشؤون القانونية
 */
function emailV8_sendReportEmail(params) {
  try {
  params = params || {};

  const reportType  = String(params.reportType || "").trim();
  const entity      = String(params.entity || params.entityOrId || params.entityName || "").trim();
  const addressee   = String(params.addressee || params.addresseeName || "").trim();
  const docUrl      = String(params.docUrl || params.url || params.docURL || "").trim();
  const legalDocUrl = String(params.legalDocUrl || "").trim();

  let visitDateStr = "";
  if (params.dateStr) {
    visitDateStr = String(params.dateStr).trim();
  } else {
    const vd = params.visitDate instanceof Date ? params.visitDate :
               (params.visitDate ? new Date(params.visitDate) : null);
    visitDateStr = (vd && !isNaN(vd.getTime())) ? fmtV8_dateArabic(vd) : "";
  }

  let authorEmail = String(params.authorEmail || params.email || params.officerEmail || "").trim();
  let authorName  = String(params.authorName  || params.author || params.officerName || "").trim();

  // ── جلب إيميلات كل الموظفين (يدعم أكثر من اسم + أكثر من إيميل) ──
  const resolvedOfficerEmails = [];
  if (authorName) {
    try {
      const _ss   = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
      const _sh   = _ss.getSheetByName(SHEETS.EMPLOYEES);
      if (_sh && _sh.getLastRow() > 1) {
        const _map  = schemaV8_buildHeaderMap(_sh);
        const _data = _sh.getRange(2, 1, _sh.getLastRow()-1, _sh.getLastColumn()).getValues();
        const ni = _map["الاسم"], ei = _map["الايميل"] !== undefined ? _map["الايميل"] : _map["الإيميل"];
        if (ni !== undefined && ei !== undefined) {
          const names = authorName.split(/[,،]/).map(function(n){ return n.trim(); }).filter(Boolean);
          names.forEach(function(name) {
            for (let r = 0; r < _data.length; r++) {
              if (String(_data[r][ni]||"").trim() === name) {
                const rawEm = String(_data[r][ei]||"").trim();
                // دعم أكثر من إيميل مفصولين بفاصلة أو مسافة
                rawEm.split(/[,;،\s]+/).forEach(function(em) {
                  em = em.trim();
                  if (em && em.indexOf("@") !== -1) resolvedOfficerEmails.push(em);
                });
                break;
              }
            }
          });
        }
      }
    } catch (_e) {}
  }

  if (!authorEmail && resolvedOfficerEmails.length) {
    authorEmail = resolvedOfficerEmails[0];
  }

  if (!authorEmail || authorEmail.indexOf("@") === -1) {
    try { authorEmail = String(Session.getActiveUser().getEmail() || "").trim(); } catch (_e) {}
  }
  if (!authorEmail || authorEmail.indexOf("@") === -1) {
    try { authorEmail = String(CONFIG.get("ADMIN_EMAIL", "") || "").trim(); } catch (_e) {}
  }
  if (!authorName) authorName = authorEmail ? authorEmail.split("@")[0] : "المستخدم";

  let recipients = [];
  try { recipients = emailV8_resolveRecipients(reportType); } catch (_e) {}

  const toList = [], ccList = [], seen = {};

  resolvedOfficerEmails.forEach(function(em) {
    if (!em || em.indexOf("@") === -1) return;
    const k = em.toLowerCase();
    if (seen[k]) return;
    seen[k] = true;
    toList.push(em);
  });

  if (!toList.length && authorEmail && authorEmail.indexOf("@") !== -1) {
    toList.push(authorEmail);
    seen[authorEmail.toLowerCase()] = true;
  }

  for (let i = 0; i < recipients.length; i++) {
    const em = String(recipients[i].email || "").trim();
    if (!em || em.indexOf("@") === -1) continue;
    const k = em.toLowerCase();
    if (seen[k]) continue;
    seen[k] = true;
    ccList.push(em);
  }

  const subject = emailV81_subjectForReport_(reportType, entity, visitDateStr);
  const html = (reportType === "COMPLAINT")
    ? emailV81_tplComplaintReport_({ recipientName: authorName, entity: entity, dateStr: visitDateStr, docUrl: docUrl, addressee: addressee })
    : emailV81_tplVisitReport_({ reportType: reportType, recipientName: authorName, entity: entity, dateStr: visitDateStr, docUrl: docUrl, legalDocUrl: legalDocUrl });

  let primarySent = false, primaryError = "";
  if (toList.length) {
    const mail = { to: toList.join(","), subject: subject, htmlBody: html };
    if (ccList.length) mail.cc = ccList.join(",");
    var attachList = [];
    if (params.pdfBlob) attachList.push(params.pdfBlob);
    if (params.extraPdfBlobs && params.extraPdfBlobs.length) {
      params.extraPdfBlobs.forEach(function(b) { if (b) attachList.push(b); });
    }
    if (attachList.length) mail.attachments = attachList;
    try {
      MailApp.sendEmail(mail);
      primarySent = true;
      try { if (typeof auditEngine_logEvent === "function") auditEngine_logEvent("Email_Sent", "إيميل تقرير", "Report sent to " + toList.join(", ")); } catch (_e) {}
    } catch (mailErr) {
      primaryError = String(mailErr.message || mailErr);
      try { if (typeof auditEngine_logError === "function") auditEngine_logError("04_EmailEngine", "emailV8_sendReportEmail_primary", mailErr); } catch (_e) {}
    }
  } else {
    auditEngine_logError("emailV8_sendReportEmail", new Error("لم يُعثر على أي إيميل للإرسال — authorName=" + authorName), {});
  }

  let managerSent = false;
  try {
    var managerHtml = emailV81_tplReportManager_({
      reportType:  reportType,
      entity:      entity,
      dateStr:     visitDateStr,
      authorName:  authorName,
      addressee:   String(params.addressee || "").trim(),
      docUrl:      docUrl,
      legalDocUrl: legalDocUrl
    });
    var mgrAttach = [];
    if (params.pdfBlob) mgrAttach.push(params.pdfBlob);
    if (params.extraPdfBlobs) params.extraPdfBlobs.forEach(function(b) { if (b) mgrAttach.push(b); });
    emailV81_sendManagerFYI_("REPORT", subject, managerHtml, mgrAttach.length ? mgrAttach : null);
    managerSent = true;
  } catch (_e) {
    try { if (typeof auditEngine_logError === "function") auditEngine_logError("04_EmailEngine", "emailV8_sendReportEmail_managerFYI", _e); } catch (_) {}
  }

  return {
    ok:         primarySent || managerSent,
    sent:       primarySent,
    managerFYI: managerSent,
    to:         toList.join(","),
    cc:         ccList.join(","),
    error:      primaryError
  };
  } catch (err) {
    if (typeof auditEngine_logError === "function") auditEngine_logError("04_EmailEngine", "emailV8_sendReportEmail", err);
    return { ok: false, sent: false, error: String(err.message || err) };
  }
}

/* =============================================================================
   ========== Template: Report Manager FYI =====================================
   ============================================================================= */

function emailV81_tplReportManager_(m) {
  m = m || {};
  var P   = "#044d47";
  var rt  = String(m.reportType || "");
  var icon, typeLabel;

  if (rt === "COMPLAINT") {
    icon = "⚖️"; typeLabel = "فحص الشكوى";
  } else if (rt === "FIN_ADMIN") {
    icon = "💼"; typeLabel = "المرور المالي والإداري";
  } else if (rt === "TECH_HOSP") {
    icon = "🔬"; typeLabel = "المرور الفني (مستشفيات)";
  } else if (rt === "TECH_UNITS") {
    icon = "🔬"; typeLabel = "المرور الفني (وحدات)";
  } else {
    icon = "📄"; typeLabel = "تقرير";
  }

  var badge = emailV81_badge_(icon + " إشعار تقرير · للعلم والمتابعة",
    "linear-gradient(135deg,#f0fdf4,#dcfce7)", "#15803d", "#bbf7d0");

  var rows = ''
    + '<tr><td style="padding:28px 32px 0;">'
    + '<div style="margin-bottom:20px;">' + badge + '</div>'
    + '<h2 style="font-size:20px;font-weight:800;color:#0f172a;margin:0 0 12px;">📌 للعلم والمتابعة — مدير الإدارة</h2>'
    + '<p style="font-size:15px;color:#475569;line-height:2;margin:0 0 16px;">تم إنشاء <strong style="color:' + P + ';">' + emailV81_e_(typeLabel) + '</strong> بواسطة <strong>' + emailV81_e_(m.authorName || "") + '</strong> وإرساله إلى الجهة المعنية.</p>'
    + '<div style="background:#f0fdf4;border-right:4px solid #16a34a;border-radius:8px;padding:14px 18px;margin-bottom:16px;">'
    + '<p style="font-size:13px;color:#14532d;font-weight:700;margin:0 0 4px;">✅ تم التوثيق الرسمي</p>'
    + '<p style="font-size:13px;color:#166534;line-height:1.9;margin:0;">تم إنشاء التقرير وحفظه في الأرشيف ومجلد الموظف تلقائياً.</p>'
    + '</div>'
    + '</td></tr>'
    + '<tr><td style="padding:0 32px;">'
    + '<table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border-radius:16px;border:1px solid #e2e8f0;overflow:hidden;"><tbody>'
    + emailV81_infoRowSimple_(icon,  "نوع التقرير",   typeLabel,           "#2563eb", false)
    + emailV81_infoRowSimple_("👤", "القائم بالفحص", m.authorName || "",  P,         true)
    + emailV81_infoRowSimple_("🏥", "الجهة",         m.entity     || "",  null,      false)
    + emailV81_infoRowSimple_("📅", "تاريخ التقرير", m.dateStr    || "",  null,      false)
    + (m.addressee ? emailV81_infoRowSimple_("📬", "وُجِّه إلى", m.addressee, P, false) : "")
    + '</tbody></table></td></tr>'
    + '<tr><td style="padding:24px 32px 8px;text-align:center;">'
    + '<table cellpadding="0" cellspacing="0" style="margin:0 auto;"><tbody><tr>'
    + '<td style="padding-left:8px;">' + emailV81_btn_(m.docUrl || "#", "📝 فتح التقرير", true) + '</td>'
    + (m.legalDocUrl ? '<td style="padding-right:8px;">' + emailV81_btn_(m.legalDocUrl, "⚖️ ملف الشؤون القانونية", false) + '</td>' : '')
    + '</tr></tbody></table>'
    + '</td></tr>'
    + emailV81_divider_()
    + '<tr><td style="padding:16px 32px 28px;text-align:center;">'
    + '<p style="font-size:11px;color:#94a3b8;line-height:1.9;margin:0;">هذا الإشعار صادر تلقائياً من نظام الحوكمة · محفوظ كمستند رسمي للمتابعة</p>'
    + '</td></tr>';

  return emailV81_wrap_(rows);
}

/* =============================================================================
   ========== Compat Layer ======================================================
   ============================================================================= */

const EmailManager = {
  sendReportEmails: function(officer, entity, date, reportType, docUrl, pdfBlob, addressee) {
    officer = officer || {};
    return emailV8_sendReportEmail({
      reportType:  reportType,
      authorEmail: officer.email || "",
      authorName:  officer.name  || "",
      entity:      entity        || "",
      visitDate:   date          || null,
      docUrl:      docUrl        || "",
      pdfBlob:     pdfBlob       || null,
      addressee:   addressee     || ""
    });
  }
};

function commV8_sendAssignmentEmail_(toEmail, assigneeName, inboundId, subject, fromEntity) {
  return emailV8_sendTaskAssignment({
    toEmail:      toEmail,
    assigneeName: assigneeName,
    inboundId:    inboundId,
    subject:      subject,
    fromEntity:   fromEntity,
    docType:      BUSINESS.DOC_TYPE_INBOUND
  });
}

function commV8_sendAdminEmail_(subject, body) {
  const adminEmail = String(CONFIG.get("ADMIN_EMAIL", "") || "").trim() ||
                     (typeof ADMIN_EMAIL !== "undefined" ? ADMIN_EMAIL : "");
  if (!adminEmail) throw new Error("Missing ADMIN_EMAIL");
  MailApp.sendEmail({ to: adminEmail, subject: String(subject || "IAG Admin").trim(), htmlBody: String(body || "").trim() });
}

/* =============================================================================
   ========== Manager FYI =======================================================
   ============================================================================= */

function emailV81_sendManagerFYI_(type, subject, htmlBody, attachments) {
  const managerEmail = String(CONFIG.get("MANAGER_EMAIL", "") || "").trim() ||
                       (typeof MANAGER_EMAIL !== "undefined" ? MANAGER_EMAIL : "");
  if (!managerEmail) return;

  const tag  = (type === "ASSIGNMENT") ? "📋 للعلم والمتابعة" : "📌 للعلم";
  const subj = tag + " - " + String(subject || "").trim();
  const mail = { to: managerEmail, subject: subj, htmlBody: htmlBody };
  if (attachments && attachments.length) mail.attachments = attachments;

  try { MailApp.sendEmail(mail); }
  catch (e) { try { if (typeof auditEngine_logError === "function") auditEngine_logError("04_EmailEngine", "emailV81_sendManagerFYI_", e); } catch (_) {} }
}

/* =============================================================================
   ========== Subject Builder ===================================================
   ============================================================================= */

function emailV81_subjectForReport_(reportType, entity, dateStr) {
  const rt  = String(reportType || "").trim();
  const ent = String(entity     || "").trim();
  const ds  = String(dateStr    || "").trim();

  if (rt === "COMPLAINT")  return "🧾 تقرير فحص شكوى"                + (ent ? " - " + ent : "") + (ds ? " - " + ds : "");
  if (rt === "FIN_ADMIN")  return "💼 تقرير المرور المالي والإداري"   + (ent ? " - " + ent : "") + (ds ? " - " + ds : "");
  if (rt === "TECH_HOSP")  return "🔬 تقرير المرور الفني (مستشفيات)" + (ent ? " - " + ent : "") + (ds ? " - " + ds : "");
  if (rt === "TECH_UNITS") return "🔬 تقرير المرور الفني (وحدات)"    + (ent ? " - " + ent : "") + (ds ? " - " + ds : "");
  return "📄 تقرير" + (ent ? " - " + ent : "") + (ds ? " - " + ds : "");
}

/* =============================================================================
   ========== Shared HTML Builders =============================================
   ============================================================================= */

function emailV81_e_(s) { return emailV81_escape_(String(s == null ? "" : s)); }

function emailV81_header_() {
  const P = "#044d47", S = "#0a3d38";
  return ''
    + '<tr><td style="background:linear-gradient(160deg,' + P + ' 0%,' + S + ' 50%,#065f58 100%);padding:40px 32px 36px;text-align:center;">'
    + '<div style="font-size:48px;line-height:1;margin-bottom:14px;">🏛️</div>'
    + '<h1 style="color:#ffffff;font-size:21px;font-weight:800;margin:0 0 8px;letter-spacing:0.3px;">إدارة المراجعة الداخلية والحوكمة</h1>'
    + '<div style="width:50px;height:3px;background:rgba(255,255,255,0.3);border-radius:2px;margin:0 auto 10px;"></div>'
    + '<p style="color:#a7f3d0;font-size:13px;margin:0;font-weight:600;">وزارة الصحة والسكان · محافظة الفيوم</p>'
    + '</td></tr>';
}

function emailV81_footer_() {
  return ''
    + '<tr><td style="background:#022c29;padding:28px 32px;text-align:center;">'
    + '<div style="font-size:26px;margin-bottom:10px;">🏛️</div>'
    + '<p style="color:#a7f3d0;font-size:13px;font-weight:700;margin:0 0 4px;">© 2026 إدارة المراجعة الداخلية والحوكمة</p>'
    + '<p style="color:#6ee7b7;font-size:11px;margin:0 0 10px;font-weight:600;">وزارة الصحة والسكان · محافظة الفيوم · جمهورية مصر العربية</p>'
    + '<div style="width:40px;height:2px;background:rgba(255,255,255,0.15);border-radius:1px;margin:0 auto 10px;"></div>'
    + '<p style="color:#34d399;font-size:10px;margin:0;opacity:0.8;">هذا البريد الإلكتروني تم إرساله تلقائياً من نظام الحوكمة · لا ترد على هذا البريد</p>'
    + '</td></tr>';
}

function emailV81_wrap_(rowsHtml) {
  return ''
    + '<table width="100%" cellpadding="0" cellspacing="0" style="background:#eef2f7;font-family:\'Cairo\',\'Segoe UI\',Tahoma,Arial,sans-serif;direction:rtl;">'
    + '<tbody><tr><td align="center" style="padding:32px 16px;">'
    + '<table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,0.08);">'
    + '<tbody>'
    + emailV81_header_()
    + rowsHtml
    + emailV81_footer_()
    + '</tbody></table>'
    + '</td></tr></tbody></table>';
}

function emailV81_infoRowSimple_(icon, label, value, accent, bold) {
  var c  = accent || "#1e293b";
  var fs = bold ? "15px" : "14px";
  var fw = bold ? "800"  : "700";
  return ''
    + '<tr><td style="padding:14px 18px;border-bottom:1px solid #e2e8f0;">'
    + '<table cellpadding="0" cellspacing="0"><tbody><tr>'
    + (icon ? '<td style="padding-left:10px;vertical-align:top;font-size:16px;padding-top:2px;">' + icon + '</td>' : '')
    + '<td><span style="font-size:11px;color:#94a3b8;font-weight:700;display:block;margin-bottom:3px;">' + emailV81_e_(label) + '</span>'
    + '<span style="font-size:' + fs + ';font-weight:' + fw + ';color:' + c + ';display:block;line-height:1.6;">' + emailV81_e_(value) + '</span></td>'
    + '</tr></tbody></table></td></tr>';
}

function emailV81_badge_(text, bg, color, border) {
  return '<span style="display:inline-block;background:' + bg + ';color:' + color + ';font-size:13px;font-weight:800;padding:7px 18px;border-radius:25px;border:1px solid ' + border + ';box-shadow:0 2px 4px rgba(0,0,0,0.04);">' + emailV81_e_(text) + '</span>';
}

function emailV81_divider_() {
  return '<tr><td style="padding:0 32px;"><div style="height:1px;background:linear-gradient(to left,transparent,#e2e8f0,transparent);"></div></td></tr>';
}

/* =============================================================================
   ========== Template: Assignment Employee =====================================
   ============================================================================= */

function emailV81_tplAssignmentEmployee_(m) {
  m = m || {};
  var P          = "#044d47";
  var badge      = emailV81_badge_("📋 قرار تكليف رسمي", "linear-gradient(135deg,#eff6ff,#dbeafe)", "#2563eb", "#bfdbfe");
  var deadline   = String(m.deadline    || "غير محدد");
  var taskDate   = String(m.taskDate    || "غير محدد");
  var importance = String(m.importance  || "عاجل");
  var attachUrl  = String(m.attachmentUrl || "#");

  var rows = ''
    + '<tr><td style="padding:28px 32px 0;">'
    + '<div style="margin-bottom:20px;">' + badge + '</div>'
    + '<h2 style="font-size:20px;font-weight:800;color:#0f172a;margin:0 0 12px;">تحية طيبة، أ. ' + emailV81_e_(m.assigneeName || "") + '</h2>'
    + '<p style="font-size:15px;color:#475569;line-height:2;margin:0 0 12px;">نفيدكم بأنه قد <strong>صدر قرار تكليفكم رسمياً</strong> بمراجعة الوارد المُحال إلى إدارة المراجعة الداخلية والحوكمة بوزارة الصحة والسكان بمحافظة الفيوم.</p>'
    + '<div style="background:#fef9ec;border-right:4px solid #f59e0b;border-radius:8px;padding:14px 18px;margin-bottom:16px;">'
    + '<p style="font-size:13px;color:#92400e;font-weight:700;margin:0 0 6px;">⚖️ إشعار قانوني هام</p>'
    + '<p style="font-size:13px;color:#78350f;line-height:1.9;margin:0;">يُعدّ استلامكم لهذا البريد الإلكتروني <strong>إقراراً رسمياً بالتكليف والاطلاع على الموعد النهائي</strong>. يُسجَّل أي تأخير في ملف الأداء الوظيفي ويُحال للمساءلة الإدارية وفقاً للوائح المعمول بها.</p>'
    + '</div>'
    + '<p style="font-size:15px;color:#475569;line-height:2;margin:0 0 24px;">يُرجى التفضل بالبدء في المراجعة وإنهاء المهمة في موعد أقصاه <strong style="color:#dc2626;">' + emailV81_e_(deadline) + '</strong>.</p>'
    + '</td></tr>'
    + '<tr><td style="padding:0 32px;">'
    + '<table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border-radius:16px;border:1px solid #e2e8f0;overflow:hidden;"><tbody>'
    + emailV81_infoRowSimple_("📄", "رقم القيد",     m.inboundId  || "", P,    false)
    + emailV81_infoRowSimple_("📋", "نوع المستند",   m.docType    || "وارد", null, false)
    + emailV81_infoRowSimple_("📝", "الموضوع",       m.subject    || "", null, true)
    + emailV81_infoRowSimple_("🏢", "الجهة الواردة", m.fromEntity || "", null, false)
    + '<tr><td style="border-bottom:1px solid #e2e8f0;">'
    + '<table width="100%" cellpadding="0" cellspacing="0"><tbody><tr>'
    + '<td width="50%" style="padding:14px 18px;vertical-align:top;">'
    + '<span style="font-size:11px;color:#94a3b8;font-weight:700;display:block;margin-bottom:5px;">الأهمية</span>'
    + '<span style="display:inline-block;background:#fff7ed;color:#ea580c;font-size:13px;font-weight:800;padding:5px 14px;border-radius:22px;border:1px solid #fed7aa;">🟠 ' + emailV81_e_(importance) + '</span>'
    + '</td>'
    + '<td width="50%" style="padding:14px 18px;vertical-align:top;">'
    + '<span style="font-size:11px;color:#94a3b8;font-weight:700;display:block;margin-bottom:5px;">رقم القضية</span>'
    + '<span style="font-size:15px;font-weight:700;color:#1e293b;">' + emailV81_e_(m.caseNo || "-") + '</span>'
    + '</td></tr></tbody></table></td></tr>'
    + '<tr><td>'
    + '<table width="100%" cellpadding="0" cellspacing="0"><tbody><tr>'
    + '<td width="50%" style="padding:14px 18px;vertical-align:top;">'
    + '<span style="font-size:11px;color:#94a3b8;font-weight:700;display:block;margin-bottom:5px;">تاريخ التكليف</span>'
    + '<span style="font-size:15px;font-weight:700;color:#1e293b;">📅 ' + emailV81_e_(taskDate) + '</span>'
    + '</td>'
    + '<td width="50%" style="padding:14px 18px;vertical-align:top;">'
    + '<span style="font-size:11px;color:#94a3b8;font-weight:700;display:block;margin-bottom:5px;">الموعد النهائي</span>'
    + '<span style="font-size:15px;font-weight:800;color:#dc2626;">⏰ ' + emailV81_e_(deadline) + '</span>'
    + '</td></tr></tbody></table></td></tr>'
    + '</tbody></table></td></tr>'
    + '<tr><td style="padding:24px 32px 8px;text-align:center;">'
    + emailV81_btn_(attachUrl, "📎 عرض مرفق الوارد", true)
    + '<p style="font-size:12px;color:#94a3b8;margin-top:10px;">اضغط للاطلاع على المستند المرفق مع هذا الوارد</p>'
    + '</td></tr>'
    + emailV81_divider_()
    + '<tr><td style="padding:16px 32px 28px;text-align:center;">'
    + '<p style="font-size:12px;color:#94a3b8;line-height:1.9;margin:0 0 8px;">يُرجى إنهاء المهمة والرد عبر نظام الحوكمة أو التواصل المباشر مع الإدارة في الموعد المحدد.</p>'
    + '<p style="font-size:11px;color:#ef4444;font-weight:700;margin:0;">⚠️ تم توثيق هذا التكليف رسمياً بتاريخ ' + emailV81_e_(taskDate) + ' · الموعد النهائي: ' + emailV81_e_(deadline) + ' · يُحتج بهذا الإشعار أمام الجهات الرقابية عند الاقتضاء.</p>'
    + '</td></tr>';

  return emailV81_wrap_(rows);
}

/* =============================================================================
   ========== Template: Assignment Manager =====================================
   ============================================================================= */

function emailV81_tplAssignmentManager_(m) {
  m = m || {};
  var P    = "#044d47";
  var badge = emailV81_badge_("📋 إشعار تكليف رسمي · للمتابعة", "linear-gradient(135deg,#f0fdf4,#dcfce7)", "#15803d", "#bbf7d0");

  var rows = ''
    + '<tr><td style="padding:28px 32px 0;">'
    + '<div style="margin-bottom:20px;">' + badge + '</div>'
    + '<h2 style="font-size:20px;font-weight:800;color:#0f172a;margin:0 0 12px;">إشعار متابعة — مدير الإدارة</h2>'
    + '<p style="font-size:15px;color:#475569;line-height:2;margin:0 0 16px;">نفيدكم بأنه تم إصدار تكليف رسمي لـ <strong style="color:' + P + ';">' + emailV81_e_(m.assigneeName || "") + '</strong> وإشعاره عبر البريد الإلكتروني الرسمي في تاريخ <strong>' + emailV81_e_(m.taskDate || "") + '</strong>.</p>'
    + '<div style="background:#f0fdf4;border-right:4px solid #16a34a;border-radius:8px;padding:14px 18px;margin-bottom:16px;">'
    + '<p style="font-size:13px;color:#14532d;font-weight:700;margin:0 0 4px;">✅ تم التوثيق الرسمي</p>'
    + '<p style="font-size:13px;color:#166534;line-height:1.9;margin:0;">تم إشعار الموظف بالتكليف والموعد النهائي. يُعتمد هذا الإشعار مستنداً رسمياً للمساءلة الإدارية عند الاقتضاء.</p>'
    + '</div>'
    + '</td></tr>'
    + '<tr><td style="padding:0 32px;">'
    + '<table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border-radius:16px;border:1px solid #e2e8f0;overflow:hidden;"><tbody>'
    + emailV81_infoRowSimple_("👤", "الموظف المكلف",  m.assigneeName || "", P,         true)
    + emailV81_infoRowSimple_("📄", "رقم القيد",      m.inboundId    || "", P,         false)
    + emailV81_infoRowSimple_("📝", "الموضوع",        m.subject      || "", null,      true)
    + emailV81_infoRowSimple_("🏢", "الجهة الواردة",  m.fromEntity   || "", null,      false)
    + emailV81_infoRowSimple_("🟠", "الأهمية",        m.importance   || "", "#ea580c", false)
    + emailV81_infoRowSimple_("📅", "تاريخ التكليف",  m.taskDate     || "", null,      false)
    + emailV81_infoRowSimple_("⏰", "الموعد النهائي", m.deadline     || "", "#dc2626", true)
    + '</tbody></table></td></tr>'
    + (m.attachmentUrl ? (
        '<tr><td style="padding:20px 32px 8px;text-align:center;">'
      + emailV81_btn_(m.attachmentUrl, "📎 عرض مرفق الوارد", true)
      + '</td></tr>'
      ) : '')
    + emailV81_divider_()
    + '<tr><td style="padding:16px 32px 28px;text-align:center;">'
    + '<p style="font-size:11px;color:#94a3b8;line-height:1.9;margin:0;">هذا الإشعار صادر تلقائياً من نظام الحوكمة · محفوظ كمستند رسمي للمتابعة والمساءلة</p>'
    + '</td></tr>';

  return emailV81_wrap_(rows);
}

/* =============================================================================
   ========== Template: Visit Report ============================================
   ============================================================================= */

function emailV81_tplVisitReport_(m) {
  m = m || {};
  var P         = "#044d47";
  var rt        = String(m.reportType || "");
  var icon      = (rt === "TECH_HOSP" || rt === "TECH_UNITS") ? "🔬" : "💼";
  var typeLabel = rt === "FIN_ADMIN"   ? "تقرير المرور المالي والإداري"
                : rt === "TECH_HOSP"  ? "تقرير المرور الفني (مستشفيات)"
                : rt === "TECH_UNITS" ? "تقرير المرور الفني (وحدات)"
                : "تقرير";
  var badge    = emailV81_badge_(icon + " " + typeLabel, "linear-gradient(135deg,#eff6ff,#dbeafe)", "#2563eb", "#bfdbfe");
  var hasLegal = m.legalDocUrl && m.legalDocUrl.length > 0;

  var rows = ''
    + '<tr><td style="padding:28px 32px 0;">'
    + '<div style="margin-bottom:20px;">' + badge + '</div>'
    + '<h2 style="font-size:20px;font-weight:800;color:#0f172a;margin:0 0 12px;">تحية طيبة، أ. ' + emailV81_e_(m.recipientName || "") + '</h2>'
    + '<p style="font-size:15px;color:#475569;line-height:2;margin:0 0 24px;">نفيدكم بأنه تم إنشاء <strong style="color:#2563eb;">' + emailV81_e_(typeLabel) + '</strong> الخاص بـ <strong style="color:' + P + ';">' + emailV81_e_(m.entity || "") + '</strong> بنجاح.</p>'
    + '</td></tr>'
    + '<tr><td style="padding:0 32px;">'
    + '<table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border-radius:16px;border:1px solid #e2e8f0;overflow:hidden;"><tbody>'
    + emailV81_infoRowSimple_(icon, "نوع التقرير",      typeLabel,             "#2563eb", false)
    + emailV81_infoRowSimple_("🏥", "الجهة المستهدفة", m.entity        || "", null,      false)
    + emailV81_infoRowSimple_("📅", "تاريخ التقرير",   m.dateStr       || "", null,      false)
    + emailV81_infoRowSimple_("👤", "القائم بالمرور",  m.recipientName || "", P,         false)
    + '</tbody></table></td></tr>'
    + '<tr><td style="padding:24px 32px 8px;text-align:center;">'
    + '<table cellpadding="0" cellspacing="0" style="margin:0 auto;"><tbody><tr>'
    + '<td style="padding-left:8px;">' + emailV81_btn_(m.docUrl || "#", "📝 فتح التقرير", true) + '</td>'
    + (hasLegal ? '<td style="padding-right:8px;">' + emailV81_btn_(m.legalDocUrl, "⚖️ ملف الشؤون القانونية", false) + '</td>' : '')
    + '</tr></tbody></table>'
    + '<p style="font-size:12px;color:#94a3b8;margin-top:12px;">📎 ' + (hasLegal ? "نسخة PDF من التقريرين مرفقة مع هذا البريد" : "نسخة PDF من التقرير مرفقة مع هذا البريد") + '</p>'
    + '</td></tr>'
    + emailV81_divider_()
    + '<tr><td style="padding:16px 32px 28px;text-align:center;">'
    + '<p style="font-size:12px;color:#94a3b8;line-height:1.9;margin:0;">تم حفظ نسخة من التقرير في الأرشيف المركزي ومجلد الموظف تلقائياً.</p>'
    + '</td></tr>';

  return emailV81_wrap_(rows);
}

/* =============================================================================
   ========== Template: Complaint Report ========================================
   ============================================================================= */

function emailV81_tplComplaintReport_(m) {
  m = m || {};
  var P    = "#044d47";
  var badge = emailV81_badge_("⚖️ تقرير فحص الشكوى", "linear-gradient(135deg,#f5f3ff,#ede9fe)", "#7c3aed", "#c4b5fd");

  var rows = ''
    + '<tr><td style="padding:28px 32px 0;">'
    + '<div style="margin-bottom:20px;">' + badge + '</div>'
    + '<h2 style="font-size:20px;font-weight:800;color:#0f172a;margin:0 0 12px;">تحية طيبة، أ. ' + emailV81_e_(m.recipientName || "") + '</h2>'
    + '<p style="font-size:15px;color:#475569;line-height:2;margin:0 0 24px;">نفيدكم بأنه تم إنشاء <strong style="color:#7c3aed;">تقرير فحص الشكوى</strong>'
    + (m.entity ? ' الخاص بـ <strong style="color:' + P + ';">' + emailV81_e_(m.entity) + '</strong>' : '') + ' بنجاح.</p>'
    + '</td></tr>'
    + '<tr><td style="padding:0 32px;">'
    + '<table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border-radius:16px;border:1px solid #e2e8f0;overflow:hidden;"><tbody>'
    + emailV81_infoRowSimple_("⚖️", "نوع التقرير",  "فحص الشكوى",          "#7c3aed", false)
    + (m.entity    ? emailV81_infoRowSimple_("🏥", "الجهة",         m.entity,    null, false) : "")
    + (m.dateStr   ? emailV81_infoRowSimple_("📅", "تاريخ التقرير", m.dateStr,   null, false) : "")
    + (m.addressee ? emailV81_infoRowSimple_("📬", "المخاطب",       m.addressee, P,    false) : "")
    + emailV81_infoRowSimple_("👤", "القائم بالفحص", m.recipientName || "", P, false)
    + '</tbody></table></td></tr>'
    + '<tr><td style="padding:24px 32px 8px;text-align:center;">'
    + '<table cellpadding="0" cellspacing="0" style="margin:0 auto;"><tbody><tr>'
    + '<td style="padding-left:8px;">' + emailV81_btn_(m.docUrl || "#", "⚖️ فتح تقرير الفحص", true) + '</td>'
    + (m.docUrl ? '<td style="padding-right:8px;">' + emailV81_btn_(m.docUrl, "📥 تحميل PDF", false) + '</td>' : '')
    + '</tr></tbody></table>'
    + '<p style="font-size:12px;color:#94a3b8;margin-top:12px;">📎 نسخة PDF من التقرير مرفقة مع هذا البريد</p>'
    + '</td></tr>'
    + emailV81_divider_()
    + '<tr><td style="padding:16px 32px 28px;text-align:center;">'
    + '<p style="font-size:12px;color:#94a3b8;line-height:1.9;margin:0;">تم حفظ نسخة من التقرير في الأرشيف المركزي ومجلد الموظف تلقائياً.</p>'
    + '</td></tr>';

  return emailV81_wrap_(rows);
}

/* Compat shells */
function emailV81_tplShell_(titleBadgeHtml, headline, bodyHtml, footerNoteHtml) {
  return emailV81_wrap_('<tr><td style="padding:28px;">' + (titleBadgeHtml||'') + '<h2 style="font-size:18px;font-weight:800;color:#0f172a;margin:16px 0 8px;">' + headline + '</h2>' + (bodyHtml||'') + '</td></tr>');
}
function emailV81_tplShellRawRows_(titleBadgeHtml, headline, bodyRowsHtml, footerNoteHtml) {
  return emailV81_wrap_('<tr><td style="padding:28px 28px 0;">' + (titleBadgeHtml||'') + '<h2 style="font-size:18px;font-weight:800;color:#0f172a;margin:16px 0 8px;">' + headline + '</h2></td></tr>' + (bodyRowsHtml||''));
}
function emailV81_infoCard_(rowsHtml) {
  return '<tr><td style="padding:0 32px;"><table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border-radius:16px;border:1px solid #e2e8f0;overflow:hidden;"><tbody>' + rowsHtml + '</tbody></table></td></tr>';
}
function emailV81_infoRow_(label, value, accent, isSubject) {
  return emailV81_infoRowSimple_(null, label, value, accent, isSubject);
}
function emailV81_btn_(href, text, styleKind) {
  if (styleKind === "primary" || styleKind === true) {
    return '<a href="' + emailV81_escapeAttr_(href||"#") + '" style="display:inline-block;background:linear-gradient(135deg,#044d47,#065f58);color:#ffffff;text-decoration:none;padding:15px 36px;border-radius:14px;font-weight:800;font-size:15px;box-shadow:0 6px 20px rgba(4,77,71,0.25);">' + emailV81_e_(text) + '</a>';
  }
  if (styleKind === "danger") {
    return '<a href="' + emailV81_escapeAttr_(href||"#") + '" style="display:inline-block;background:#fef2f2;color:#dc2626;text-decoration:none;padding:15px 36px;border-radius:14px;font-weight:800;font-size:15px;border:1px solid #fecaca;">' + emailV81_e_(text) + '</a>';
  }
  return '<a href="' + emailV81_escapeAttr_(href||"#") + '" style="display:inline-block;background:#334155;color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:12px;font-weight:800;font-size:13px;">' + emailV81_e_(text) + '</a>';
}

/* =============================================================================
   ========== Escape Helpers ====================================================
   ============================================================================= */

function emailV81_escape_(s) {
  const t = String(s == null ? "" : s);
  return t
    .replace(/&/g,  "&amp;")
    .replace(/</g,  "&lt;")
    .replace(/>/g,  "&gt;")
    .replace(/"/g,  "&quot;")
    .replace(/'/g,  "&#39;");
}

function emailV81_escapeAttr_(s) {
  return emailV81_escape_(s).replace(/"/g, "%22");
}

/* =============================================================================
   ========== email_sendForMasterRow_ ==========================================
   ============================================================================= */

function email_sendForMasterRow_(masterSh, masterMap, rowIndex, overrides) {
  try {
  var row = masterSh.getRange(rowIndex, 1, 1, masterSh.getLastColumn()).getValues()[0];
  overrides = overrides || {};

  var g = function(col) {
    var idx = masterMap[col];
    return (idx !== undefined) ? row[idx] : "";
  };

  var assigneeName = (overrides.overrideAssigneeName)
    ? String(overrides.overrideAssigneeName).trim()
    : String(g("الموظف_المكلف") || "").split(/[،,]/)[0].trim();
  var inboundId  = String(g("رقم_القيد")           || "").trim();
  var subject    = String(g("الموضوع")             || "").trim();
  var fromEntity = String(g("الجهة (الوارد) منها") || "").trim();
  var importance = String(g("الأهمية")             || "عاجل").trim();

  var attachUrl = (overrides.attachmentUrl !== undefined)
    ? String(overrides.attachmentUrl).trim()
    : String(g("رابط_المرفقات") || "").trim();

  if (!assigneeName) return;

  var deadlineIdx = masterMap["الموعد_النهائي"];
  var deadlineRaw = overrides.deadline || ((deadlineIdx !== undefined) ? row[deadlineIdx] : null);
  var deadlineStr;
  try {
    var dlDate = (deadlineRaw instanceof Date) ? deadlineRaw :
                 (deadlineRaw ? new Date(deadlineRaw) : null);
    deadlineStr = (dlDate && !isNaN(dlDate.getTime())) ? fmtV8_dateArabic(dlDate) : "";
  } catch (_) { deadlineStr = ""; }
  if (!deadlineStr) {
    try { deadlineStr = fmtV8_dateArabic(slaV8_addWorkdays(new Date(), BUSINESS.MAX_SLA_WORKDAYS)); }
    catch (_) { deadlineStr = "غير محدد"; }
  }

  var taskDateIdx = masterMap["تاريخ_التخصيص"];
  var taskDateRaw = overrides.taskDate || ((taskDateIdx !== undefined) ? row[taskDateIdx] : null);
  var taskDateStr;
  try {
    var tdDate = (taskDateRaw instanceof Date) ? taskDateRaw :
                 (taskDateRaw ? new Date(taskDateRaw) : null);
    taskDateStr = (tdDate && !isNaN(tdDate.getTime())) ? fmtV8_dateArabic(tdDate) : fmtV8_dateArabic(new Date());
  } catch (_) { taskDateStr = fmtV8_dateArabic(new Date()); }

  var subjectShort = subject.length > 100 ? subject.substring(0, 97) + "..." : subject;

  var ss    = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  var empSh = ss.getSheetByName(SHEETS.EMPLOYEES);
  if (!empSh) return;

  var empMap  = schemaV8_buildHeaderMap(empSh);
  var empData = empSh.getLastRow() < 2 ? [] :
    empSh.getRange(2, 1, empSh.getLastRow()-1, empSh.getLastColumn()).getValues();

  var assigneeEmail     = "";
  var allAssigneeEmails = [];
  var ni = empMap["الاسم"], ei = empMap["الايميل"] !== undefined ? empMap["الايميل"] : empMap["الإيميل"];
  if (ni !== undefined && ei !== undefined) {
    for (var i = 0; i < empData.length; i++) {
      if (String(empData[i][ni] || "").trim() === assigneeName) {
        var rawEmails = String(empData[i][ei] || "").trim();
        allAssigneeEmails = rawEmails.split(/[,;،\s]+/)
          .map(function(e) { return e.trim(); })
          .filter(function(e) { return e && e.indexOf("@") !== -1; });
        if (allAssigneeEmails.length) assigneeEmail = allAssigneeEmails[0];
        break;
      }
    }
  }

  if (!assigneeEmail || assigneeEmail.indexOf("@") === -1) {
    if (typeof auditEngine_logError === "function") auditEngine_logError("04_EmailEngine", "email_sendForMasterRow_", new Error("لم يُعثر على إيميل الموظف: " + assigneeName));
    return;
  }

  // ── ضبط صلاحية ملف المرفق: View للجميع عبر الرابط ──
  if (attachUrl) {
    try {
      var attachIdMatch = attachUrl.match(/[-\w]{25,}/);
      if (attachIdMatch) {
        DriveApp.getFileById(attachIdMatch[0])
          .setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      }
    } catch (permErr) {
      auditEngine_logError("email_sendForMasterRow_setSharing", permErr, {});
    }
  }

  // ── إرسال لكل الإيميلات المسجلة ──
  var targets = allAssigneeEmails.length ? allAssigneeEmails : [assigneeEmail];
  targets.forEach(function(toEmail) {
    try {
      emailV8_sendTaskAssignment({
        toEmail:       toEmail,
        assigneeName:  assigneeName,
        inboundId:     inboundId,
        subject:       subjectShort,
        fromEntity:    fromEntity,
        docType:       BUSINESS.DOC_TYPE_INBOUND,
        importance:    importance,
        deadlineStr:   deadlineStr,
        taskDateStr:   taskDateStr,
        attachmentUrl: attachUrl
      });
    } catch (e) {
      if (typeof auditEngine_logError === "function") auditEngine_logError("04_EmailEngine", "email_sendForMasterRow_sendTo_" + toEmail, e);
    }
  });
  } catch (err) {
    if (typeof auditEngine_logError === "function") auditEngine_logError("04_EmailEngine", "email_sendForMasterRow_", err);
  }
}