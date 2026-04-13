/**
 * 14_AnalyticsEngine.js  (IAG V0.09)
 *
 * Live analytics engine — يحسب مؤشرات الأداء مباشرة من الشيتات
 * بدون snapshot دوري — البيانات محدثة في كل طلب.
 *
 * Public API:
 *   analytics_computeLive_(monthOffset)  → كائن بالأرقام (0=الشهر الحالي، -1=السابق)
 *   analytics_writeSnapshot_()           → يكتب snapshot في OP_STATISTICS (للأرشيف)
 */

/* ============================================================
   SECTION 1 — Core Computation
   ============================================================ */

/**
 * يحسب مؤشرات الأداء live من الشيتات.
 * @param {number} [monthOffset=0]  0=الشهر الحالي, -1=الشهر السابق, إلخ
 * @returns {Object} كائن بـ 12 مؤشر
 */
function analytics_computeLive_(monthOffset) {
  try {
  var offset = (typeof monthOffset === "number") ? monthOffset : 0;
  var now    = new Date();
  var y      = now.getFullYear();
  var m      = now.getMonth() + offset;   // يمكن يكون سالب — Date constructor يعالجها
  var rangeStart = new Date(y, m,     1,  0,  0,  0);
  var rangeEnd   = new Date(y, m + 1, 0, 23, 59, 59);

  var masterSS = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  var carSS    = SpreadsheetApp.openById(CONFIG.CAR_SPREADSHEET_ID);

  // ── OP_FINDINGS ──────────────────────────────────────────────
  var findingsSh   = carSS.getSheetByName(SHEETS.FINDINGS);
  var findingsData = analytics_getRows_(findingsSh);
  var fHeaders     = findingsData.headers;
  var fRows        = findingsData.rows;

  var fStatusIdx   = fHeaders.indexOf("status");
  var fVisitIdx    = fHeaders.indexOf("visit_date");
  var fCreatedIdx  = fHeaders.indexOf("created_at");
  var fClosedIdx   = fHeaders.indexOf("closed_date");

  var totalFindings = 0, closedFindings = 0, openFindings = 0;
  var closureDaysSum = 0, closureDaysCount = 0;

  for (var i = 0; i < fRows.length; i++) {
    var fr = fRows[i];
    if (!fr[0]) continue;

    // فلترة بتاريخ الزيارة ضمن الشهر المطلوب
    var fDate = fr[fVisitIdx >= 0 ? fVisitIdx : fCreatedIdx >= 0 ? fCreatedIdx : 0];
    if (!analytics_inRange_(fDate, rangeStart, rangeEnd)) continue;

    totalFindings++;
    var st = fStatusIdx >= 0 ? String(fr[fStatusIdx] || "").trim() : "";
    if (st === "مغلق") {
      closedFindings++;
      // متوسط أيام الإغلاق
      if (fCreatedIdx >= 0 && fClosedIdx >= 0) {
        var d1 = fr[fCreatedIdx], d2 = fr[fClosedIdx];
        if (d1 instanceof Date && d2 instanceof Date) {
          var diff = Math.round((d2 - d1) / 86400000);
          if (diff >= 0) { closureDaysSum += diff; closureDaysCount++; }
        }
      }
    } else {
      openFindings++;
    }
  }

  var closureRate    = totalFindings > 0
                       ? Math.round((closedFindings / totalFindings) * 1000) / 10 : 0;
  var avgClosureDays = closureDaysCount > 0
                       ? Math.round(closureDaysSum / closureDaysCount) : 0;

  // ── CAR_ESCALATIONS ───────────────────────────────────────────
  var escalSh   = carSS.getSheetByName(SHEETS.CAR_ESCALATIONS);
  var escalData = analytics_getRows_(escalSh);
  var eHeaders  = escalData.headers;
  var eRows     = escalData.rows;

  var eTypeIdx  = eHeaders.indexOf("escalation_type");
  var eDateIdx  = eHeaders.indexOf("escalated_at");
  if (eDateIdx < 0) eDateIdx = eHeaders.indexOf("created_at");

  var totalEscalations = 0, ministerialEscalations = 0;
  for (var j = 0; j < eRows.length; j++) {
    if (!eRows[j][0]) continue;
    var eDate = eDateIdx >= 0 ? eRows[j][eDateIdx] : null;
    if (!analytics_inRange_(eDate, rangeStart, rangeEnd)) continue;
    totalEscalations++;
    var eType = eTypeIdx >= 0 ? String(eRows[j][eTypeIdx] || "").trim() : "";
    if (eType.indexOf("وزاري") >= 0) ministerialEscalations++;
  }

  // ── IN_COMPLAINTS ─────────────────────────────────────────────
  var complSh   = masterSS.getSheetByName(SHEETS.COMPLAINTS_RESPONSES);
  var complData = analytics_getRows_(complSh);
  var cDateIdx  = complData.headers.indexOf("Timestamp");
  if (cDateIdx < 0) cDateIdx = 0;
  var totalComplaints = 0;
  for (var c = 0; c < complData.rows.length; c++) {
    if (!complData.rows[c][0]) continue;
    var cDate = complData.rows[c][cDateIdx];
    if (!analytics_inRange_(cDate, rangeStart, rangeEnd)) continue;
    totalComplaints++;
  }

  // ── OP_INOUT_MASTER ───────────────────────────────────────────
  var inoutSh   = masterSS.getSheetByName(SHEETS.INOUT_MASTER);
  var inoutData = analytics_getRows_(inoutSh);
  var iHeaders  = inoutData.headers;
  var iRows     = inoutData.rows;

  var iDateIdx    = iHeaders.indexOf("التاريخ");
  var iStatusIdx  = iHeaders.indexOf("الحالة");
  var iDueIdx     = iHeaders.indexOf("الموعد_النهائي");
  var iDoneIdx    = iHeaders.indexOf("تاريخ_الإنجاز");
  var iParentIdx  = iHeaders.indexOf("PARENT_ID");

  var totalInout = 0, slaTotal = 0, slaCompliant = 0;
  for (var k = 0; k < iRows.length; k++) {
    var ir = iRows[k];
    if (!ir[0]) continue;
    var pid = iParentIdx >= 0 ? String(ir[iParentIdx] || "").trim() : "";
    if (pid) continue; // تجاهل الصادرات المرتبطة
    var iDate = iDateIdx >= 0 ? ir[iDateIdx] : null;
    if (!analytics_inRange_(iDate, rangeStart, rangeEnd)) continue;
    totalInout++;
    // SLA
    var iStatus = iStatusIdx >= 0 ? String(ir[iStatusIdx] || "").trim() : "";
    var iDue    = iDueIdx  >= 0 ? ir[iDueIdx]  : null;
    var iDone   = iDoneIdx >= 0 ? ir[iDoneIdx] : null;
    if (iStatus === "تم الاعتماد والأرشفة" && iDue instanceof Date && iDone instanceof Date) {
      slaTotal++;
      if (iDone <= iDue) slaCompliant++;
    }
  }
  var slaComplianceRate = slaTotal > 0
                          ? Math.round((slaCompliant / slaTotal) * 1000) / 10 : 0;

  // ── Visits: IN_TECH_UNITS + IN_TECH_HOSP ─────────────────────
  var totalVisits = 0;
  var unitsSh  = masterSS.getSheetByName(SHEETS.TECH_UNITS_RESPONSES);
  var hospSh   = masterSS.getSheetByName(SHEETS.TECH_HOSP_RESPONSES);
  totalVisits += analytics_countInRange_(unitsSh, rangeStart, rangeEnd);
  totalVisits += analytics_countInRange_(hospSh,  rangeStart, rangeEnd);

  return {
    snapshot_date:            Utilities.formatDate(now, Session.getScriptTimeZone(), "yyyy-MM-dd"),
    total_visits:             totalVisits,
    total_findings:           totalFindings,
    closed_findings:          closedFindings,
    open_findings:            openFindings,
    closure_rate:             closureRate,
    avg_closure_days:         avgClosureDays,
    total_escalations:        totalEscalations,
    ministerial_escalations:  ministerialEscalations,
    total_complaints:         totalComplaints,
    total_inout:              totalInout,
    sla_compliance_rate:      slaComplianceRate
  };
  } catch (e) {
    auditEngine_logError("analytics_computeLive_", e, { monthOffset: monthOffset });
    throw e;
  }
}

/* ============================================================
   SECTION 2 — Archive Snapshot
   ============================================================ */

/**
 * يكتب snapshot في OP_STATISTICS للأرشيف التاريخي.
 * يُستدعى من weeklyAnalyticsRefresh أو يدوياً.
 */
function analytics_writeSnapshot_() {
  try {
  var stats    = analytics_computeLive_(0);
  var masterSS = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  var statsSh  = masterSS.getSheetByName(SHEETS.STATISTICS);
  if (!statsSh) {
    statsSh = masterSS.insertSheet(SHEETS.STATISTICS);
  }
  if (statsSh.getLastRow() === 0) {
    statsSh.appendRow(SHEET_HEADERS.STATISTICS);
  }
  statsSh.appendRow([
    stats.snapshot_date,
    stats.total_visits,
    stats.total_findings,
    stats.closed_findings,
    stats.open_findings,
    stats.closure_rate,
    stats.avg_closure_days,
    stats.total_escalations,
    stats.ministerial_escalations,
    stats.total_complaints,
    stats.total_inout,
    stats.sla_compliance_rate
  ]);
  auditEngine_logEvent("SYSTEM", "ANALYTICS_SNAPSHOT",
    stats.snapshot_date, "", { visits: stats.total_visits }, "SUCCESS");
  } catch (e) {
    auditEngine_logError("analytics_writeSnapshot_", e, "");
    throw e;
  }
}

/* ============================================================
   SECTION 3 — Helpers
   ============================================================ */

/** يجلب header row + data rows من شيت */
function analytics_getRows_(sheet) {
  if (!sheet || sheet.getLastRow() < 2) return { headers: [], rows: [] };
  var vals    = sheet.getDataRange().getValues();
  var headers = vals[0].map(function(h) { return String(h || "").trim(); });
  var rows    = vals.slice(1);
  return { headers: headers, rows: rows };
}

/** يتحقق إذا كانت القيمة Date وتقع في النطاق المحدد */
function analytics_inRange_(val, start, end) {
  if (!val) return false;
  var d = val instanceof Date ? val : new Date(val);
  if (isNaN(d.getTime())) return false;
  return d >= start && d <= end;
}

/** يحسب عدد صفوف شيت ضمن نطاق تاريخي (العمود الأول Date) */
function analytics_countInRange_(sheet, start, end) {
  if (!sheet || sheet.getLastRow() < 2) return 0;
  var vals  = sheet.getDataRange().getValues();
  var count = 0;
  for (var i = 1; i < vals.length; i++) {
    if (analytics_inRange_(vals[i][0], start, end)) count++;
  }
  return count;
}

/* ============================================================
   SECTION 4 — Filtered Computation (Dashboard Use)
   ============================================================ */

/**
 * يحسب مؤشرات مفصّلة بفلاتر مرنة.
 * @param {Object} p - { dateFrom, dateTo, adminArea, employee }
 * @returns {Object} { summary, byAdminArea, byInoutType, byReportType,
 *                     classifyBreakdown, findingsList, escalList,
 *                     adminAreaList, employeeList }
 */
function analytics_computeFiltered_(p) {
  try {
  var now      = new Date();
  var dateFrom = (p.dateFrom instanceof Date) ? p.dateFrom
               : (p.dateFrom ? new Date(p.dateFrom)
               : new Date(now.getFullYear(), now.getMonth(), 1));
  var dateTo   = (p.dateTo instanceof Date) ? p.dateTo
               : (p.dateTo ? new Date(p.dateTo)
               : new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59));
  dateTo.setHours(23, 59, 59, 999);
  var areaFilter = String(p.adminArea || p.unit || "").trim();
  var empFilter  = String(p.employee  || "").trim();

  var masterSS = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  var carSS    = SpreadsheetApp.openById(CONFIG.CAR_SPREADSHEET_ID);

  /* ── REF_EMPLOYEES → قائمة الموظفين ─────────────────────── */
  var employeeList = [];
  try {
    var empSh = masterSS.getSheetByName(SHEETS.EMPLOYEES);
    if (empSh && empSh.getLastRow() > 1) {
      var eVals    = empSh.getDataRange().getValues();
      var eHdr     = eVals[0].map(function(h) { return String(h || "").trim(); });
      var eNameIdx = eHdr.indexOf("الاسم");
      var eActIdx  = eHdr.indexOf("نشط");
      for (var ei = 1; ei < eVals.length; ei++) {
        var eName = eNameIdx >= 0 ? String(eVals[ei][eNameIdx] || "").trim() : "";
        if (!eName) continue;
        var isAct = eActIdx >= 0 ? String(eVals[ei][eActIdx] || "").trim() : "نعم";
        if (isAct === "لا" || isAct === "false" || isAct === "0") continue;
        employeeList.push(eName);
      }
    }
  } catch (ex) { /* silent */ }

  /* ── OP_FINDINGS ─────────────────────────────────────────── */
  var fd   = analytics_getRows_(carSS.getSheetByName(SHEETS.FINDINGS));
  var fH   = fd.headers;
  var fIdx = {
    status:   fH.indexOf("status"),
    visitDate:fH.indexOf("visit_date"),
    created:  fH.indexOf("created_at"),
    closed:   fH.indexOf("closed_date"),
    unit:     fH.indexOf("unit_name"),
    adminArea:fH.indexOf("admin_area"),
    source:   fH.indexOf("source_form"),
    officer:  fH.indexOf("officer"),
    section:  fH.indexOf("section"),
    code:     fH.indexOf("finding_code"),
    severity: fH.indexOf("severity"),
    classify: fH.indexOf("classification")
  };

  var totF = 0, totClosed = 0, totOpen = 0, daySum = 0, dayCnt = 0;
  var areaFindMap  = {};  // groupKey → { total, closed, open, isHosp }
  var areaListSet  = {};  // for dropdown
  var classifyMap  = {};  // classification → count
  var findingsList = [];

  for (var i = 0; i < fd.rows.length; i++) {
    var fr      = fd.rows[i];
    if (!fr[0]) continue;
    var fUnit   = fIdx.unit      >= 0 ? String(fr[fIdx.unit]      || "").trim() : "";
    var fAdmin  = fIdx.adminArea >= 0 ? String(fr[fIdx.adminArea] || "").trim() : "";
    var fSource = fIdx.source    >= 0 ? String(fr[fIdx.source]    || "").trim() : "";
    var fEmp    = fIdx.officer   >= 0 ? String(fr[fIdx.officer]   || "").trim() : "";

    // مستشفيات → اسم الوحدة (اسم المستشفى) | وحدات → اسم الإدارة الصحية
    var isHosp   = fSource.toUpperCase().indexOf("HOSP") >= 0;
    var groupKey = isHosp ? fUnit : fAdmin;
    if (groupKey) areaListSet[groupKey] = true;

    var dateCol = fIdx.visitDate >= 0 ? fIdx.visitDate : (fIdx.created >= 0 ? fIdx.created : 0);
    if (!analytics_inRange_(fr[dateCol], dateFrom, dateTo)) continue;
    if (areaFilter && groupKey !== areaFilter) continue;
    if (empFilter  && fEmp     !== empFilter)  continue;

    totF++;
    if (!areaFindMap[groupKey]) areaFindMap[groupKey] = { total:0, closed:0, open:0, isHosp:isHosp };
    areaFindMap[groupKey].total++;

    var st = fIdx.status >= 0 ? String(fr[fIdx.status] || "").trim() : "";
    if (st === "مغلق") {
      totClosed++; areaFindMap[groupKey].closed++;
      if (fIdx.created >= 0 && fIdx.closed >= 0) {
        var d1 = fr[fIdx.created], d2 = fr[fIdx.closed];
        if (d1 instanceof Date && d2 instanceof Date) {
          var df = Math.round((d2 - d1) / 86400000);
          if (df >= 0) { daySum += df; dayCnt++; }
        }
      }
    } else {
      totOpen++; areaFindMap[groupKey].open++;
    }

    var cls = fIdx.classify >= 0 ? String(fr[fIdx.classify] || "").trim() : "";
    if (cls) classifyMap[cls] = (classifyMap[cls] || 0) + 1;

    if (findingsList.length < 100) {
      var vd = fr[fIdx.visitDate >= 0 ? fIdx.visitDate : 0];
      findingsList.push({
        area:     groupKey,
        isHosp:   isHosp,
        date:     vd instanceof Date
                    ? Utilities.formatDate(vd, Session.getScriptTimeZone(), "yyyy-MM-dd")
                    : String(vd || "").substring(0, 10),
        status:   st,
        section:  fIdx.section  >= 0 ? String(fr[fIdx.section]  || "") : "",
        code:     fIdx.code     >= 0 ? String(fr[fIdx.code]     || "") : "",
        severity: fIdx.severity >= 0 ? String(fr[fIdx.severity] || "") : "",
        classify: cls,
        officer:  fEmp
      });
    }
  }

  var closureRate    = totF   > 0 ? Math.round((totClosed / totF)   * 1000) / 10 : 0;
  var avgClosureDays = dayCnt > 0 ? Math.round(daySum     / dayCnt)              : 0;

  /* ── Visits: وحدات ومستشفيات منفصلين ────────────────────── */
  var visitsUnits = analytics_countInRange_(masterSS.getSheetByName(SHEETS.TECH_UNITS_RESPONSES), dateFrom, dateTo);
  var visitsHosp  = analytics_countInRange_(masterSS.getSheetByName(SHEETS.TECH_HOSP_RESPONSES),  dateFrom, dateTo);

  /* ── CAR_ESCALATIONS ─────────────────────────────────────── */
  var ed   = analytics_getRows_(carSS.getSheetByName(SHEETS.CAR_ESCALATIONS));
  var eH   = ed.headers;
  var eIdx = {
    type:  eH.indexOf("escalation_type"),
    date:  eH.indexOf("escalated_at") >= 0 ? eH.indexOf("escalated_at") : eH.indexOf("created_at"),
    unit:  eH.indexOf("unit_name")    >= 0 ? eH.indexOf("unit_name")    : eH.indexOf("facility_name"),
    carId: eH.indexOf("car_id")
  };

  var totEscal = 0, totMin = 0, escalList = [];
  for (var j = 0; j < ed.rows.length; j++) {
    if (!ed.rows[j][0]) continue;
    var eDate = eIdx.date >= 0 ? ed.rows[j][eIdx.date] : null;
    if (!analytics_inRange_(eDate, dateFrom, dateTo)) continue;
    var eUnit = eIdx.unit >= 0 ? String(ed.rows[j][eIdx.unit] || "").trim() : "";
    if (areaFilter && eUnit !== areaFilter) continue;
    totEscal++;
    var eType = eIdx.type >= 0 ? String(ed.rows[j][eIdx.type] || "").trim() : "";
    if (eType.indexOf("وزاري") >= 0) totMin++;
    if (escalList.length < 50) {
      escalList.push({
        car_id: eIdx.carId >= 0 ? String(ed.rows[j][eIdx.carId] || "") : "",
        unit:   eUnit, type: eType,
        date:   eDate instanceof Date
                  ? Utilities.formatDate(eDate, Session.getScriptTimeZone(), "yyyy-MM-dd")
                  : String(eDate || "").substring(0, 10)
      });
    }
  }

  /* ── IN_COMPLAINTS ───────────────────────────────────────── */
  var cd  = analytics_getRows_(masterSS.getSheetByName(SHEETS.COMPLAINTS_RESPONSES));
  var cDI = cd.headers.indexOf("Timestamp"); if (cDI < 0) cDI = 0;
  var totComp = 0;
  for (var c = 0; c < cd.rows.length; c++) {
    if (!cd.rows[c][0]) continue;
    if (analytics_inRange_(cd.rows[c][cDI], dateFrom, dateTo)) totComp++;
  }

  /* ── OP_INOUT_MASTER: إجمالي + تجميع بـ نوع_المعاملة ─────── */
  var id   = analytics_getRows_(masterSS.getSheetByName(SHEETS.INOUT_MASTER));
  var iH   = id.headers;
  var iIdx = {
    date:   iH.indexOf("التاريخ"),
    status: iH.indexOf("الحالة"),
    due:    iH.indexOf("الموعد_النهائي"),
    done:   iH.indexOf("تاريخ_الإنجاز"),
    parent: iH.indexOf("PARENT_ID"),
    unit:   iH.indexOf("الجهة_محل_التنفيذ"),
    emp:    iH.indexOf("الموظف_المكلف"),
    type:   iH.indexOf("نوع_المعاملة")
  };

  var totInout = 0, slaTotal = 0, slaOK = 0;
  var inoutByType = {};  // نوع_المعاملة → { total, done, pending, sla, sla_ok }

  for (var k = 0; k < id.rows.length; k++) {
    var ir = id.rows[k];
    if (!ir[0]) continue;
    if (iIdx.parent >= 0 && String(ir[iIdx.parent] || "").trim()) continue;
    var iDate = iIdx.date >= 0 ? ir[iIdx.date] : null;
    if (!analytics_inRange_(iDate, dateFrom, dateTo)) continue;
    var iUnit = iIdx.unit >= 0 ? String(ir[iIdx.unit] || "").trim() : "";
    var iEmp  = iIdx.emp  >= 0 ? String(ir[iIdx.emp]  || "").trim() : "";
    if (areaFilter && iUnit !== areaFilter) continue;
    if (empFilter  && iEmp  !== empFilter)  continue;

    totInout++;
    var iType = iIdx.type >= 0 ? String(ir[iIdx.type] || "").trim() : "";
    if (!iType) iType = "غير محدد";
    if (!inoutByType[iType]) inoutByType[iType] = { total:0, done:0, pending:0, sla:0, sla_ok:0 };
    inoutByType[iType].total++;

    var iSt  = iIdx.status >= 0 ? String(ir[iIdx.status] || "").trim() : "";
    var iDue = iIdx.due  >= 0 ? ir[iIdx.due]  : null;
    var iDon = iIdx.done >= 0 ? ir[iIdx.done] : null;
    if (iSt === "تم الاعتماد والأرشفة") {
      inoutByType[iType].done++;
      if (iDue instanceof Date && iDon instanceof Date) {
        slaTotal++; inoutByType[iType].sla++;
        if (iDon <= iDue) { slaOK++; inoutByType[iType].sla_ok++; }
      }
    } else {
      inoutByType[iType].pending++;
    }
  }
  var slaRate = slaTotal > 0 ? Math.round((slaOK / slaTotal) * 1000) / 10 : 0;

  /* ── CAR_LEGAL: المخالفات القانونية ─────────────────────── */
  var legalCnt = 0;
  try {
    var lSh = carSS.getSheetByName(SHEETS.CAR_LEGAL);
    if (lSh && lSh.getLastRow() > 1) {
      var lVals = lSh.getDataRange().getValues();
      var lHdr  = lVals[0].map(function(h) { return String(h || "").trim(); });
      var lDI   = lHdr.indexOf("created_at");
      if (lDI < 0) lDI = lHdr.indexOf("التاريخ");
      if (lDI < 0) lDI = 0;
      for (var li = 1; li < lVals.length; li++) {
        if (!lVals[li][0]) continue;
        if (analytics_inRange_(lVals[li][lDI], dateFrom, dateTo)) legalCnt++;
      }
    }
  } catch (ex2) { /* silent */ }

  /* ── OP_REPORTS_LOG: التقارير حسب النوع ─────────────────── */
  var totRep = 0, repByType = {};
  try {
    var rSh = masterSS.getSheetByName(SHEETS.REPORTS_LOG);
    if (rSh && rSh.getLastRow() > 1) {
      var rVals = rSh.getDataRange().getValues();
      var rHdr  = rVals[0].map(function(h) { return String(h || "").trim(); });
      var rDI   = rHdr.indexOf("التاريخ_والوقت"); if (rDI < 0) rDI = 0;
      var rTI   = rHdr.indexOf("نوع_التقرير");
      for (var ri = 1; ri < rVals.length; ri++) {
        if (!rVals[ri][0]) continue;
        if (!analytics_inRange_(rVals[ri][rDI], dateFrom, dateTo)) continue;
        totRep++;
        var rType = rTI >= 0 ? String(rVals[ri][rTI] || "").trim() : "غير محدد";
        if (!rType) rType = "غير محدد";
        repByType[rType] = (repByType[rType] || 0) + 1;
      }
    }
  } catch (ex3) { /* silent */ }

  /* ── byAdminArea: إدارات + مستشفيات ─────────────────────── */
  var byAdminArea = Object.keys(areaFindMap).map(function(a) {
    var f  = areaFindMap[a];
    var cr = f.total > 0 ? Math.round((f.closed / f.total) * 1000) / 10 : 0;
    return {
      area_name:       a,
      is_hospital:     f.isHosp,
      total_findings:  f.total,
      closed_findings: f.closed,
      open_findings:   f.open,
      closure_rate:    cr
    };
  }).sort(function(a, b) { return b.total_findings - a.total_findings; });

  /* ── byInoutType array ───────────────────────────────────── */
  var byInoutType = Object.keys(inoutByType).map(function(t) {
    var io = inoutByType[t];
    var sr = io.sla > 0 ? Math.round((io.sla_ok / io.sla) * 1000) / 10 : 0;
    return { type:t, total:io.total, done:io.done, pending:io.pending, sla_rate:sr };
  }).sort(function(a, b) { return b.total - a.total; });

  /* ── byReportType array ──────────────────────────────────── */
  var byReportType = Object.keys(repByType).map(function(t) {
    return { type:t, total:repByType[t] };
  }).sort(function(a, b) { return b.total - a.total; });

  /* ── classifyBreakdown array ─────────────────────────────── */
  var classifyBreakdown = Object.keys(classifyMap).map(function(c) {
    return { classify:c, count:classifyMap[c] };
  }).sort(function(a, b) { return b.count - a.count; });

  return {
    summary: {
      total_visits:            visitsUnits + visitsHosp,
      visits_units:            visitsUnits,
      visits_hospitals:        visitsHosp,
      total_findings:          totF,
      closed_findings:         totClosed,
      open_findings:           totOpen,
      closure_rate:            closureRate,
      avg_closure_days:        avgClosureDays,
      total_escalations:       totEscal,
      ministerial_escalations: totMin,
      total_complaints:        totComp,
      total_inout:             totInout,
      sla_compliance_rate:     slaRate,
      legal_violations:        legalCnt,
      total_reports:           totRep
    },
    byAdminArea:       byAdminArea,
    byInoutType:       byInoutType,
    byReportType:      byReportType,
    classifyBreakdown: classifyBreakdown,
    findingsList:      findingsList,
    escalList:         escalList,
    adminAreaList:     Object.keys(areaListSet).filter(Boolean).sort(),
    employeeList:      employeeList
  };
  } catch (e) {
    auditEngine_logError("analytics_computeFiltered_", e, p);
    throw e;
  }
}
