/**
 * 03_CentralTrigger.gs  (IAG V0.07)
 *
 * التغييرات في V0.07:
 *   - استبدال switch/case بأسماء الشيتات القديمة الـ hardcoded
 *     بـ if/else مع SHEETS.* من 01_Config.gs
 *   - لا تغيير في أي logic آخر
 *
 * التغييرات في V8.1.5 (السابق):
 *   - engine_processLastInbound: قراءة PARENT_NUM + PARENT_YEAR من الفورم
 *     وبناء PARENT_ID وكتابته في INOUT_MASTER
 *   - outbound_processLastOutbound: graceful skip بدل throw لو linkedInNo أو outDate فاضيين
 *   - outbound_processLastOutbound: يقرأ رقم القيد بدفتر الصادر الفعلي (OUTBOUND_NO)
 *   - outbound_applyUpdate_: يستقبل outId كـ parameter منفصل عن inboundId
 */

/* ============================================================
   SECTION 1 — Central Dispatcher
   ============================================================ */

function trgV8_onFormSubmit(e) {
  if (!e) return;
  auditEngine_logEvent("SYSTEM", "TRIGGER_FIRED", (e.range ? e.range.getSheet().getName() : "?"), "", { row: e.range ? e.range.getRow() : "?" }, "INFO");

  var sheetName = e.range ? e.range.getSheet().getName() : "";
  var rowNum    = e.range ? e.range.getRow() : 0;
  var sh        = e.range ? e.range.getSheet() : null;
  var eventTs   = trgV81_getEventTimestamp_(e, sh, rowNum);
  var eventKey  = "TRG_" + sheetName + "_" + rowNum + "_" + eventTs;

  if (govV8_isDuplicate(eventKey)) return;

  try {

    if (sheetName === SHEETS.INOUT_RESPONSES) {
      engine_processLastInbound();
      outbound_processLastOutbound();

    } else if (sheetName === SHEETS.COMPLAINTS_RESPONSES) {
      complaints_processLastComplaint();
      try { rptComplaint_onSubmit(e); } catch (er) {
        auditEngine_logError("trgV8 → rptComplaint_onSubmit", er, "");
      }

    } else if (sheetName === SHEETS.TECH_HOSP_RESPONSES) {
      try { rptTechHosp_onSubmit(e); } catch (er) {
        auditEngine_logError("trgV8 → rptTechHosp_onSubmit", er, "");
      }

    } else if (sheetName === SHEETS.TECH_UNITS_RESPONSES) {
      try { rptTechUnits_onSubmit(e); } catch (er) {
        auditEngine_logError("trgV8 → rptTechUnits_onSubmit", er, "");
      }
      try { findingsEngine_processLastRow(); } catch (er) {
        auditEngine_logError("trgV8 → findingsEngine_processLastRow", er, "");
      }

    } else if (sheetName === SHEETS.FIN_RESPONSES) {
      try { rptFin_onSubmit(e); } catch (er) {
        auditEngine_logError("trgV8 → rptFin_onSubmit", er, "");
      }

    } else {
      auditEngine_logError("trgV8_onFormSubmit", new Error("unrecognized sheet → " + sheetName), { sheetName: sheetName });
    }

  } catch (err) {
    auditEngine_logError("trgV8_onFormSubmit", err, "");
  }
}

/* ============================================================
   SECTION 2 — Inbound Processing
   ============================================================ */

function engine_processLastInbound() {
  return govV8_run(
    "engine_processLastInbound",
    { actionType: "ENGINE_INBOUND", details: "Process last inbound" },
    function () {
      var ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
      var respSh   = ss.getSheetByName(SHEETS.INOUT_RESPONSES);
      var masterSh = ss.getSheetByName(SHEETS.INOUT_MASTER);
      if (!respSh)   throw new Error("Missing: " + SHEETS.INOUT_RESPONSES);
      if (!masterSh) throw new Error("Missing: " + SHEETS.INOUT_MASTER);

      var lastRow = respSh.getLastRow();
      if (lastRow < 2) throw new Error("No rows in responses.");

      var respMap = schemaV8_buildHeaderMap(respSh);
      var respRow = respSh.getRange(lastRow, 1, 1, respSh.getLastColumn()).getValues()[0];

      var rawDocType = schemaV8_pick(respRow, respMap, SCHEMA_ALIASES.INOUT.DOC_TYPE);
      var docNorm    = schemaV8_normalizeDocType(rawDocType);

      if (docNorm !== "INBOUND") {
        return { skipped: true, reason: "last row not inbound", lastRow: lastRow, rawDocType: rawDocType };
      }

      var inboundNo   = schemaV8_pick(respRow, respMap, SCHEMA_ALIASES.INOUT.INBOUND_NO);
      var inboundDate = schemaV8_pick(respRow, respMap, SCHEMA_ALIASES.INOUT.INBOUND_DATE);
      if (!inboundNo)   throw new Error("Missing: رقم القيد بدفتر الوارد");
      if (!inboundDate) throw new Error("Missing: تاريخ الوارد");

      var dt = (inboundDate instanceof Date) ? inboundDate : new Date(inboundDate);
      if (isNaN(dt.getTime())) throw new Error("Invalid inbound date: " + inboundDate);
      var year = dt.getFullYear();

      var fromEntity = schemaV8_pick(respRow, respMap, SCHEMA_ALIASES.INOUT.INBOUND_FROM) || "";
      var execEntity = schemaV8_pick(respRow, respMap, SCHEMA_ALIASES.INOUT.ENTITY_EXEC)  || "";
      var subjectIn  = schemaV8_pick(respRow, respMap, SCHEMA_ALIASES.INOUT.SUBJECT_IN)   || "";
      var caseNo     = schemaV8_pick(respRow, respMap, SCHEMA_ALIASES.INOUT.CASE_NO)      || "";
      var caseYear   = schemaV8_pick(respRow, respMap, SCHEMA_ALIASES.INOUT.CASE_YEAR)    || "";
      var txType     = schemaV8_pick(respRow, respMap, SCHEMA_ALIASES.INOUT.TX_TYPE)      || "";
      var importance = schemaV8_pick(respRow, respMap, SCHEMA_ALIASES.INOUT.IMPORTANCE)   || "";
      var urgency    = schemaV8_pick(respRow, respMap, SCHEMA_ALIASES.INOUT.URGENCY)      || "";
      var notes      = schemaV8_pick(respRow, respMap, SCHEMA_ALIASES.INOUT.IN_NOTES)     || "";

      // ── PARENT_ID — ربط المعاملات المرتبطة ──
      var parentNum  = String(schemaV8_pick(respRow, respMap, SCHEMA_ALIASES.INOUT.PARENT_NUM)  || "").trim();
      var parentYear = String(schemaV8_pick(respRow, respMap, SCHEMA_ALIASES.INOUT.PARENT_YEAR) || "").trim();
      var parentId   = (parentNum && parentYear)
                       ? "IN-" + parentNum + "-" + parentYear
                       : "";

      var inferredStatus = engine_inferStatusFromOutbound_(respSh, respMap, inboundNo, year);

      var masterMap = schemaV8_buildHeaderMap(masterSh);
      if (masterMap["UUID"] === undefined) throw new Error("Master missing UUID column.");

      var found    = engine_findInboundMasterRow_(masterSh, masterMap, inboundNo, year);
      var rowIndex = found.found ? found.rowIndex : masterSh.getLastRow() + 1;
      var oldRow   = found.found
        ? masterSh.getRange(rowIndex, 1, 1, masterSh.getLastColumn()).getValues()[0]
        : new Array(masterSh.getLastColumn()).fill("");

      var finalRecordNo = record_generateId_(rawDocType, inboundNo, dt);
      var uuid          = oldRow[masterMap["UUID"]] || Utilities.getUuid();
      var deadline      = slaV8_addWorkdays(dt, BUSINESS.MAX_SLA_WORKDAYS);
      var daysLeft      = slaV8_workdaysBetween(new Date(), deadline);
      var assigned      = assignV8_pickAssignee(fromEntity, dt);
      var assigneeList  = Array.isArray(assigned) ? assigned : (assigned ? [assigned] : []);
      var assigneeName  = assigneeList.map(function(a){ return a.name; }).filter(Boolean).join("،");

      var updates = {
        "رقم_القيد":             finalRecordNo,
        "نوع_المستند":           rawDocType || "الوارد",
        "التاريخ":                dt,
        "الجهة (الوارد) منها":  fromEntity,
        "الجهة_محل_التنفيذ":    execEntity,
        "الموضوع":               subjectIn,
        "رقم_القضية":            caseNo,
        "سنة_القضية":            caseYear,
        "نوع_المعاملة":          txType,
        "الأهمية":               importance,
        "الاستعجال":             urgency,
        "ملاحظات":               notes,
        "الحالة":                inferredStatus || BUSINESS.STATUS.NEW,
        "الموعد_النهائي":        deadline,
        "الأيام_المتبقية":       daysLeft,
        "UUID":                  uuid,
        "PARENT_ID":             parentId,
        "آخر_تعديل_بواسطة":     gov_getUser_(),
        "تاريخ_آخر_تعديل":      new Date()
      };

      if (!found.found || !oldRow[masterMap["الموظف_المكلف"]]) {
        if (assigneeName) {
          updates["الموظف_المكلف"]  = assigneeName;
          updates["تاريخ_التخصيص"] = new Date();
        }
      }

      var newRow = oldRow.slice();
      Object.keys(updates).forEach(function (h) {
        var idx = masterMap[h];
        if (idx !== undefined) newRow[idx] = updates[h];
      });
      masterSh.getRange(rowIndex, 1, 1, masterSh.getLastColumn()).setValues([newRow]);
      auditEngine_logEvent("SYSTEM", "MASTER_WRITTEN", assigneeName, "", { row: rowIndex, parentId: parentId || "", deadline: deadline instanceof Date ? deadline.toISOString() : String(deadline) }, "SUCCESS");

      // ── 1. أرشفة ملف الوارد ──
      try {
        var rawAttach = schemaV8_pick(respRow, respMap, SCHEMA_ALIASES.INOUT.IN_ATTACH);
        if (rawAttach) {
          var fileIds = driveV8_extractFileIds_(rawAttach);
          if (fileIds.length) {
            var archFolders  = workflowV8_prepareInboundFolders(finalRecordNo, dt, "IN");
            var archFolderId = archFolders.archiveFolderId || "";
            if (archFolderId) {
              var archFileName = finalRecordNo + " - " + fmtV8_dateArabic(dt);
              var copiedUrl    = driveV8_copyFileToFolder_(fileIds[0], archFolderId, archFileName);
              if (copiedUrl) {
                var idxAttach = masterMap["رابط_المرفقات"];
                if (idxAttach !== undefined) {
                  var attachRow = masterSh.getRange(rowIndex, 1, 1, masterSh.getLastColumn()).getValues()[0];
                  attachRow[idxAttach] = copiedUrl;
                  masterSh.getRange(rowIndex, 1, 1, masterSh.getLastColumn()).setValues([attachRow]);
                }
              }
            }
          }
        }
      } catch (ae) {
        auditEngine_logError("engine_processLastInbound → captureAttachment", ae, "");
      }

      // ── 2. إرسال إيميل التكليف ──
      try {
        if (typeof email_sendForMasterRow_ === "function" && assigneeList.length) {
          var _freshRow = masterSh.getRange(rowIndex, 1, 1, masterSh.getLastColumn()).getValues()[0];
          var _attIdx   = masterMap["رابط_المرفقات"];
          var _attUrl   = (_attIdx !== undefined) ? String(_freshRow[_attIdx] || "").trim() : "";
          var _dlDate   = updates["الموعد_النهائي"];
          assigneeList.forEach(function(assignee) {
            try {
              email_sendForMasterRow_(masterSh, masterMap, rowIndex, {
                deadline:             _dlDate,
                taskDate:             updates["تاريخ_التخصيص"] || new Date(),
                attachmentUrl:        _attUrl,
                overrideAssigneeName: assignee.name
              });
            } catch (_ee) {
              auditEngine_logError("engine_processLastInbound → email [" + assignee.name + "]", _ee, "");
            }
          });
        }
      } catch (ee) {
        auditEngine_logError("engine_processLastInbound → email_sendForMasterRow_", ee, "");
      }

      govV8_notify("INBOUND", "تم معالجة وارد رقم " + inboundNo + " سنة " + year,
                   "IN-" + inboundNo + "-" + year);

      auditEngine_logEvent(
        gov_getUser_(),
        found.found ? "INBOUND_UPSERT_UPDATE" : "INBOUND_UPSERT_CREATE",
        "وارد رقم " + inboundNo + " سنة " + year + " → masterRow=" + rowIndex,
        found.found ? "update" : "create",
        { inboundNo: inboundNo, year: year, uuid: uuid,
          status: updates["الحالة"], assignee: assigneeName, parentId: parentId || "—" }
      );

      // ── 3. حل أي صادر أو شكوى كانت منتظرة هذا الوارد ──
      try { pendingV8_resolveAll(); } catch (_pe) {
        auditEngine_logError("engine_processLastInbound → pendingV8_resolveAll", _pe, "");
      }

      return {
        found:     found.found,
        masterRow: rowIndex,
        inboundNo: String(inboundNo).trim(),
        year:      year,
        uuid:      uuid,
        status:    updates["الحالة"],
        assignee:  assigneeName,
        parentId:  parentId || null
      };
    }
  );
}

/* ─── helpers ─── */

function engine_findInboundMasterRow_(masterSh, masterMap, inboundNo, year) {
  var lastRow = masterSh.getLastRow();
  if (lastRow < 2) return { found: false };

  var data      = masterSh.getRange(2, 1, lastRow - 1, masterSh.getLastColumn()).getValues();
  var targetNo  = String(inboundNo).trim();
  var y2        = String(year).slice(-2);
  var inboundId = "IN-" + targetNo + "-" + year;

  var idxNo   = masterMap["رقم_القيد"];
  var idxDate = masterMap["التاريخ"];
  var idxDoc  = masterMap["نوع_المستند"];

  for (var i = 0; i < data.length; i++) {
    var r     = data[i];
    var noStr = String(r[idxNo] || "").trim();

    var matchNo = noStr === inboundId ||
                  noStr === targetNo  ||
                  noStr === (y2 + "-" + targetNo) ||
                  noStr === (targetNo + "-" + y2);
    if (!matchNo) continue;

    var dt    = r[idxDate];
    var dtObj = (dt instanceof Date) ? dt : new Date(dt);
    if (isNaN(dtObj.getTime()) || dtObj.getFullYear() !== year) continue;

    var docStr = String(r[idxDoc] || "").trim();
    if (docStr && docStr !== "وارد" && docStr !== "الوارد" &&
        schemaV8_normalizeDocType(docStr) !== "INBOUND") continue;

    return { found: true, rowIndex: i + 2 };
  }
  return { found: false };
}

function engine_inferStatusFromOutbound_(respSh, respMap, inboundNo, inboundYear) {
  var lastRow = respSh.getLastRow();
  if (lastRow < 2) return null;

  var data   = respSh.getRange(2, 1, lastRow - 1, respSh.getLastColumn()).getValues();
  var target = String(inboundNo).trim();

  for (var i = data.length - 1; i >= 0; i--) {
    var r       = data[i];
    var docNorm = schemaV8_normalizeDocType(schemaV8_pick(r, respMap, SCHEMA_ALIASES.INOUT.DOC_TYPE));
    if (docNorm !== "OUTBOUND") continue;

    var linked = schemaV8_pick(r, respMap, SCHEMA_ALIASES.INOUT.LINKED_IN_NO);
    if (!linked || String(linked).trim() !== target) continue;

    var outDate = schemaV8_pick(r, respMap, SCHEMA_ALIASES.INOUT.OUT_DATE);
    var outObj  = (outDate instanceof Date) ? outDate : new Date(outDate);
    if (isNaN(outObj.getTime()) || outObj.getFullYear() !== inboundYear) continue;

    var finished = String(schemaV8_pick(r, respMap, SCHEMA_ALIASES.INOUT.FINISHED_FLAG) || "").trim();
    if (finished.includes("بحاجة")) return BUSINESS.STATUS.NEED_FOLLOWUP;
    return BUSINESS.STATUS.APPROVED_ARCHIVED;
  }
  return null;
}

/* ============================================================
   SECTION 3 — Outbound Processing
   ============================================================ */

function outbound_processLastOutbound() {
  return govV8_run(
    "outbound_processLastOutbound",
    { actionType: "OUTBOUND_PROCESS", details: "Process latest OUTBOUND response" },
    function () {
      var ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
      var respSh   = ss.getSheetByName(SHEETS.INOUT_RESPONSES);
      var masterSh = ss.getSheetByName(SHEETS.INOUT_MASTER);
      if (!respSh)   throw new Error("Missing: " + SHEETS.INOUT_RESPONSES);
      if (!masterSh) throw new Error("Missing: " + SHEETS.INOUT_MASTER);

      var respMap = schemaV8_buildHeaderMap(respSh);
      var lastRow = respSh.getLastRow();
      if (lastRow < 2) return { skipped: true, reason: "no rows" };

      var foundRowIndex = lastRow;
      var foundRow      = respSh.getRange(lastRow, 1, 1, respSh.getLastColumn()).getValues()[0];
      var norm          = schemaV8_normalizeDocType(schemaV8_pick(foundRow, respMap, SCHEMA_ALIASES.INOUT.DOC_TYPE));
      if (norm !== "OUTBOUND") return { skipped: true, reason: "last row is not outbound" };

      var linkedInNo = schemaV8_pick(foundRow, respMap, SCHEMA_ALIASES.INOUT.LINKED_IN_NO);
      var outDate    = schemaV8_pick(foundRow, respMap, SCHEMA_ALIASES.INOUT.OUT_DATE);
      var finished   = schemaV8_pick(foundRow, respMap, SCHEMA_ALIASES.INOUT.FINISHED_FLAG);

      if (!linkedInNo) {
          auditEngine_logError("outbound_processLastOutbound",
          new Error("صادر بدون رقم قيد الوارد المرتبط — صف " + lastRow), "");
        return { skipped: true, reason: "missing linkedInNo", responseRow: lastRow };
      }
      if (!outDate) {
          auditEngine_logError("outbound_processLastOutbound",
          new Error("صادر بدون تاريخ الصادر — صف " + lastRow), "");
        return { skipped: true, reason: "missing outDate", responseRow: lastRow };
      }

      var outDt = (outDate instanceof Date) ? outDate : new Date(outDate);
      if (isNaN(outDt.getTime())) throw new Error("Invalid outbound date: " + outDate);
      var year = outDt.getFullYear();

      var f         = String(finished || "").trim();
      var newStatus = f.includes("بحاجة") ? BUSINESS.STATUS.NEED_FOLLOWUP : BUSINESS.STATUS.APPROVED_ARCHIVED;

      var masterMap = schemaV8_buildHeaderMap(masterSh);
      var inboundId = "IN-" + String(linkedInNo).trim() + "-" + year;

      var outboundNo = schemaV8_pick(foundRow, respMap, SCHEMA_ALIASES.INOUT.OUTBOUND_NO);
      var outId = outboundNo
        ? "OUT-" + String(outboundNo).trim() + "-" + year
        : "OUT-" + String(linkedInNo).trim() + "-" + year;

      var outAttachRaw = schemaV8_pick(foundRow, respMap, SCHEMA_ALIASES.INOUT.OUT_ATTACH);
      var outFileIds   = outAttachRaw ? driveV8_extractFileIds_(outAttachRaw) : [];

      var found = outbound_findInboundById_(masterSh, masterMap, inboundId);
      if (found.found) {
        var res = outbound_applyUpdate_(masterSh, masterMap, found.rowIndex, inboundId, outId, newStatus, outFileIds, outDt);
        res.responseRow = foundRowIndex;
        return res;
      }

      var found2 = outbound_findInboundLegacy_(masterSh, masterMap, String(linkedInNo).trim(), year);
      if (found2.found) {
        var res2 = outbound_applyUpdate_(masterSh, masterMap, found2.rowIndex, inboundId, outId, newStatus, outFileIds, outDt);
        res2.responseRow = foundRowIndex;
        return res2;
      }

      var pending = pendingV8_add("OUTBOUND", inboundId, foundRowIndex, newStatus,
                                  "Outbound responseRow=" + foundRowIndex + ", linkedInNo=" + linkedInNo + ", outId=" + outId);
      govV8_notify("OUTBOUND_PENDING", "صادر مرتبط بوارد غير موجود بعد: " + inboundId, inboundId);
      auditEngine_logEvent(gov_getUser_(), "OUTBOUND_PENDING", "Queued pending outbound link for " + inboundId, "", pending);

      return { ok: true, linkedInboundFound: false, inboundId: inboundId, outId: outId,
               status: newStatus, responseRow: foundRowIndex, pendingQueued: true };
    }
  );
}

function outbound_applyUpdate_(masterSh, masterMap, rowIndex, inboundId, outId, newStatus, outFileIds, outDt) {
  if (!rowIndex || rowIndex < 2) throw new Error("outbound_applyUpdate_: invalid rowIndex=" + rowIndex);
  if (masterMap["رقم_القيد"] === undefined) throw new Error("Master missing رقم_القيد");
  if (masterMap["الحالة"]    === undefined) throw new Error("Master missing الحالة");

  if (!outId) outId = inboundId.replace(/^IN-/, "OUT-");

  var oldRow = masterSh.getRange(rowIndex, 1, 1, masterSh.getLastColumn()).getValues()[0] || [];

  var archFileUrl = "";
  if (outFileIds && outFileIds.length) {
    try {
      var dt           = (outDt instanceof Date) ? outDt : new Date();
      var archFolders  = workflowV8_prepareInboundFolders(inboundId, dt, "OUT");
      var archFolderId = archFolders.archiveFolderId || "";
      if (archFolderId) {
        var archFileName = outId + " - " + fmtV8_dateArabic(dt);
        var url          = driveV8_copyFileToFolder_(outFileIds[0], archFolderId, archFileName);
        if (url) archFileUrl = url;
      }
    } catch (ae) {
      auditEngine_logError("outbound_applyUpdate_ → archiveFile", ae, "");
    }
  }

  var updates = {
    "الحالة":            newStatus,
    "آخر_تعديل_بواسطة": gov_getUser_(),
    "تاريخ_آخر_تعديل":  new Date()
  };
  if (newStatus === BUSINESS.STATUS.APPROVED_ARCHIVED && masterMap["تاريخ_الإنجاز"] !== undefined) {
    updates["تاريخ_الإنجاز"] = new Date();
  }
  if (archFileUrl && masterMap["رابط_الأرشيف"] !== undefined) {
    updates["رابط_الأرشيف"] = archFileUrl;
  }

  var newRow = oldRow.slice();
  Object.keys(updates).forEach(function (h) {
    var idx = masterMap[h];
    if (idx !== undefined) newRow[idx] = updates[h];
  });
  masterSh.getRange(rowIndex, 1, 1, masterSh.getLastColumn()).setValues([newRow]);

  var oldStatus = masterMap["الحالة"] !== undefined ? (oldRow[masterMap["الحالة"]] || "") : "";
  govV8_notify("OUTBOUND", "تم تحديث حالة الوارد " + inboundId + " إلى: " + newStatus, inboundId);
  auditEngine_logEvent(gov_getUser_(), "OUTBOUND_APPLY", "Update inbound " + inboundId + " row=" + rowIndex + " → outId=" + outId, oldStatus, newStatus);

  try {
    var alreadyOut = outbound_findInboundById_(masterSh, masterMap, outId);
    if (!alreadyOut.found) {
      var outDtF  = (outDt instanceof Date) ? outDt : new Date();
      var outRowA = new Array(masterSh.getLastColumn()).fill("");
      var os = function(col, val) {
        var idx = masterMap[col];
        if (idx !== undefined) outRowA[idx] = val;
      };
      os("رقم_القيد",           outId);
      os("نوع_المستند",         "الصادر");
      os("التاريخ",              outDtF);
      os("الجهة (الوارد) منها", oldRow[masterMap["الجهة (الوارد) منها"]] || "");
      os("الموضوع",             oldRow[masterMap["الموضوع"]] || "");
      os("الحالة",              newStatus);
      os("رابط_الأرشيف",        archFileUrl || "");
      os("UUID",                 Utilities.getUuid());
      os("آخر_تعديل_بواسطة",   gov_getUser_());
      os("تاريخ_آخر_تعديل",    new Date());
      masterSh.appendRow(outRowA);
      auditEngine_logEvent(gov_getUser_(), "OUTBOUND_NEW_ROW", "سطر صادر جديد: " + outId + " ← " + inboundId, "", outId);
    }
  } catch (_oe) {
    auditEngine_logError("outbound_applyUpdate_ → insertOutboundRow", _oe, "");
  }

  return { linkedInboundFound: true, masterRow: rowIndex, inboundId: inboundId,
           outId: outId, status: newStatus, archFileUrl: archFileUrl };
}

function outbound_findInboundById_(masterSh, masterMap, inboundId) {
  var idxNo = masterMap["رقم_القيد"];
  if (idxNo === undefined) throw new Error("Master missing رقم_القيد");
  var lastRow = masterSh.getLastRow();
  if (lastRow < 2) return { found: false };
  var data = masterSh.getRange(2, 1, lastRow - 1, masterSh.getLastColumn()).getValues();
  for (var i = 0; i < data.length; i++) {
    if (String(data[i][idxNo] || "").trim() === inboundId) return { found: true, rowIndex: i + 2 };
  }
  return { found: false };
}

function outbound_findInboundLegacy_(masterSh, masterMap, inboundNo, year) {
  var lastRow = masterSh.getLastRow();
  if (lastRow < 2) return { found: false };

  var idxNo   = masterMap["رقم_القيد"];
  var idxDate = masterMap["التاريخ"];
  var idxDoc  = masterMap["نوع_المستند"];
  if (idxNo === undefined || idxDate === undefined || idxDoc === undefined) return { found: false };

  var y2     = String(year).slice(-2);
  var target = String(inboundNo).trim();
  var data   = masterSh.getRange(2, 1, lastRow - 1, masterSh.getLastColumn()).getValues();

  for (var i = 0; i < data.length; i++) {
    var r     = data[i];
    var noStr = String(r[idxNo] || "").trim();
    var matchNo = noStr === target ||
                  noStr === (y2 + "-" + target) ||
                  noStr === (target + "-" + y2) ||
                  noStr === ("IN-" + target + "-" + year);
    if (!matchNo) continue;

    var dt    = r[idxDate];
    var dtObj = (dt instanceof Date) ? dt : new Date(dt);
    if (isNaN(dtObj.getTime()) || dtObj.getFullYear() !== year) continue;

    var docStr = String(r[idxDoc] || "").trim();
    if (docStr && schemaV8_normalizeDocType(docStr) !== "INBOUND" &&
        docStr !== "وارد" && docStr !== "الوارد") continue;

    return { found: true, rowIndex: i + 2 };
  }
  return { found: false };
}

/* ============================================================
   SECTION 4 — Complaints Processing
   ============================================================ */

function complaints_processLastComplaint() {
  return govV8_run(
    "complaints_processLastComplaint",
    { actionType: "COMPLAINT_PROCESS", details: "Process last complaint response" },
    function () {
      var ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
      var sh       = ss.getSheetByName(SHEETS.COMPLAINTS_RESPONSES);
      var masterSh = ss.getSheetByName(SHEETS.INOUT_MASTER);
      if (!sh)       throw new Error("Missing: " + SHEETS.COMPLAINTS_RESPONSES);
      if (!masterSh) throw new Error("Missing: " + SHEETS.INOUT_MASTER);

      var lastRow = sh.getLastRow();
      if (lastRow < 2) throw new Error("No complaint rows.");

      var map = schemaV8_buildHeaderMap(sh);
      var row = sh.getRange(lastRow, 1, 1, sh.getLastColumn()).getValues()[0];

      var inboundNo = schemaV8_pick(row, map, ["رقم القيد بسجل الوارد"]);
      var yearRaw   = schemaV8_pick(row, map, ["العام"]);
      var tsRaw     = schemaV8_pick(row, map, ["Timestamp"]);

      if (!inboundNo) {
        govV8_notify("COMPLAINT", "تم تسجيل شكوى بدون رقم وارد", "COMPLAINT");
        auditEngine_logEvent(gov_getUser_(), "COMPLAINT_MISSING_INBOUND", "Complaint row=" + lastRow + " missing inbound number", "", "");
        return { ok: true, skipped: true, reason: "missing inbound number", row: lastRow };
      }

      var year = null;
      if (yearRaw !== null && yearRaw !== "" && yearRaw !== undefined) {
        var y = Number(String(yearRaw).trim());
        if (!isNaN(y) && y >= 2000 && y <= 2100) year = y;
      }
      if (!year) {
        var ts = (tsRaw instanceof Date) ? tsRaw : new Date(tsRaw || new Date());
        year = isNaN(ts.getTime()) ? new Date().getFullYear() : ts.getFullYear();
      }

      var inboundId = "IN-" + String(inboundNo).trim() + "-" + year;
      var masterMap = schemaV8_buildHeaderMap(masterSh);
      var found     = outbound_findInboundById_(masterSh, masterMap, inboundId);

      if (!found.found) {
        var pending = pendingV8_add("COMPLAINT", inboundId, lastRow,
                                    BUSINESS.STATUS.PENDING_APPROVAL,
                                    "Complaint row=" + lastRow);
        govV8_notify("COMPLAINT_PENDING", "شكوى مرتبطة بوارد غير موجود بعد: " + inboundId, inboundId);
        auditEngine_logEvent(gov_getUser_(), "COMPLAINT_PENDING", "Pending link for " + inboundId, "", pending);
        return { ok: true, pending: true, inboundId: inboundId, pendingRow: pending.pendingRow };
      }

      var rowIndex  = found.rowIndex;
      var oldRow    = masterSh.getRange(rowIndex, 1, 1, masterSh.getLastColumn()).getValues()[0];
      var idxStatus = masterMap["الحالة"];
      var oldStatus = idxStatus !== undefined ? oldRow[idxStatus] : "";

      var updates = {
        "الحالة":            BUSINESS.STATUS.PENDING_APPROVAL,
        "آخر_تعديل_بواسطة": gov_getUser_(),
        "تاريخ_آخر_تعديل":  new Date()
      };
      var newRow = oldRow.slice();
      Object.keys(updates).forEach(function (h) {
        var idx = masterMap[h];
        if (idx !== undefined) newRow[idx] = updates[h];
      });
      masterSh.getRange(rowIndex, 1, 1, masterSh.getLastColumn()).setValues([newRow]);

      govV8_notify("COMPLAINT", "تم تحويل حالة الوارد " + inboundId + " إلى: بانتظار الاعتماد", inboundId);
      auditEngine_logEvent(gov_getUser_(), "COMPLAINT_LINK", "Complaint linked to " + inboundId + " row=" + rowIndex,
                  oldStatus, BUSINESS.STATUS.PENDING_APPROVAL);

      return { ok: true, inboundId: inboundId, masterRow: rowIndex,
               status: BUSINESS.STATUS.PENDING_APPROVAL };
    }
  );
}

/* ============================================================
   SECTION 5 — Timestamp Helper
   ============================================================ */

function trgV81_getEventTimestamp_(e, sh, rowNum) {
  try {
    if (e) {
      if (e.namedValues) {
        var nv   = e.namedValues;
        var cand = nv["Timestamp"] || nv["التوقيت"] || nv["وقت التسجيل"] || nv["تاريخ"] || nv["التاريخ"];
        if (cand && cand.length) {
          var v  = cand[0];
          var d1 = (v instanceof Date) ? v : new Date(v);
          if (!isNaN(d1.getTime())) return d1.toISOString();
          if (String(v || "").trim()) return String(v).trim();
        }
      }
      if (e.values && e.values.length) {
        var v2 = e.values[0];
        var d2 = (v2 instanceof Date) ? v2 : new Date(v2);
        if (!isNaN(d2.getTime())) return d2.toISOString();
        if (String(v2 || "").trim()) return String(v2).trim();
      }
    }
    if (sh && rowNum && rowNum > 1) {
      var v3 = sh.getRange(rowNum, 1).getValue();
      var d3 = (v3 instanceof Date) ? v3 : new Date(v3);
      if (!isNaN(d3.getTime())) return d3.toISOString();
      if (String(v3 || "").trim()) return String(v3).trim();
    }
  } catch (err) {}
  return new Date().toISOString();
}

/* ============================================================
   SECTION 6 — Test Functions
   ============================================================ */

function iagTest_processLastInbound() {
  try {
    var result = engine_processLastInbound();
    var msg = JSON.stringify(result, null, 2);
    Logger.log("✅ iagTest_processLastInbound:\n" + msg);
    SpreadsheetApp.getUi().alert("✅ تم معالجة الوارد\n\n" + msg);
  } catch (e) {
    Logger.log("❌ iagTest_processLastInbound: " + e.message);
    SpreadsheetApp.getUi().alert("❌ خطأ\n\n" + e.message);
  }
}

function iagTest_processLastOutbound() {
  try {
    var result = outbound_processLastOutbound();
    var msg = JSON.stringify(result, null, 2);
    Logger.log("✅ iagTest_processLastOutbound:\n" + msg);
    SpreadsheetApp.getUi().alert("✅ تم معالجة الصادر\n\n" + msg);
  } catch (e) {
    Logger.log("❌ iagTest_processLastOutbound: " + e.message);
    SpreadsheetApp.getUi().alert("❌ خطأ\n\n" + e.message);
  }
}

function iagTest_simulateTrigger() {
  try {
    var ss     = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    var respSh = ss.getSheetByName(SHEETS.INOUT_RESPONSES);
    if (!respSh) throw new Error("INOUT_RESPONSES غير موجود");

    var lastRow = respSh.getLastRow();
    if (lastRow < 2) throw new Error("لا يوجد صفوف في INOUT_RESPONSES");

    var fakeRange  = respSh.getRange(lastRow, 1, 1, respSh.getLastColumn());
    var fakeValues = fakeRange.getValues()[0];
    var fakeE = {
      range: {
        getRow:    function() { return lastRow; },
        getSheet:  function() { return respSh; },
        getValues: function() { return [fakeValues]; }
      },
      values: fakeValues.map(function(v) { return String(v || ""); }),
      namedValues: (function() {
        var headers = respSh.getRange(1, 1, 1, respSh.getLastColumn()).getValues()[0];
        var nv = {};
        headers.forEach(function(h, i) { if (h) nv[String(h)] = [fakeValues[i]]; });
        return nv;
      })()
    };

    Logger.log("🧪 محاكاة Trigger على صف " + lastRow + " في INOUT_RESPONSES");
    trgV8_onFormSubmit(fakeE);

    SpreadsheetApp.getUi().alert(
      "✅ تم تشغيل المحاكاة على صف " + lastRow + "\n\n" +
      "راجع OP_INOUT_MASTER و OP_ERRORS_LOG و OP_AUDIT_LOG للنتيجة."
    );
  } catch (e) {
    Logger.log("❌ iagTest_simulateTrigger: " + e.message);
    SpreadsheetApp.getUi().alert("❌ خطأ في المحاكاة\n\n" + e.message);
  }
}

function iagTest_showErrorsReport() {
  try {
    var ss    = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    var errSh = ss.getSheetByName(SHEETS.ERRORS_LOG);

    if (!errSh || errSh.getLastRow() < 2) {
      SpreadsheetApp.getUi().alert("✅ لا توجد أخطاء مسجلة في " + SHEETS.ERRORS_LOG);
      return;
    }

    var lastRow  = errSh.getLastRow();
    var startRow = Math.max(2, lastRow - 29);
    var count    = lastRow - startRow + 1;
    var data     = errSh.getRange(startRow, 1, count, errSh.getLastColumn()).getValues();
    var headers  = errSh.getRange(1, 1, 1, errSh.getLastColumn()).getValues()[0];

    var repName = "ERRORS_REPORT";
    var oldRep  = ss.getSheetByName(repName);
    if (oldRep) ss.deleteSheet(oldRep);
    Utilities.sleep(200);
    var repSh = ss.insertSheet(repName);

    repSh.getRange(1, 1, 1, headers.length).setValues([headers]);
    repSh.getRange(1, 1, 1, headers.length)
      .setBackground("#c0392b").setFontColor("#ffffff")
      .setFontWeight("bold").setFontSize(12);

    var reversed = data.slice().reverse();
    repSh.getRange(2, 1, reversed.length, headers.length).setValues(reversed);

    repSh.setColumnWidth(1, 160);
    repSh.setColumnWidth(2, 200);
    repSh.setColumnWidth(3, 350);
    repSh.setColumnWidth(4, 200);
    repSh.setFrozenRows(1);
    repSh.setRightToLeft(true);

    for (var i = 0; i < reversed.length; i++) {
      repSh.getRange(i + 2, 1, 1, headers.length)
        .setBackground(i % 2 === 0 ? "#fde8e8" : "#fff5f5");
    }

    ss.setActiveSheet(repSh);
    SpreadsheetApp.getUi().alert(
      "📋 تقرير الأخطاء\n\n" +
      "إجمالي الأخطاء: " + (lastRow - 1) + "\n" +
      "معروض: آخر " + count + " خطأ\n\n" +
      "راجع شيت ERRORS_REPORT"
    );
  } catch (e) {
    SpreadsheetApp.getUi().alert("❌ خطأ\n\n" + e.message);
  }
}
/* ============================================================
   SECTION 7 — Triggers Setup
   ============================================================ */

/**
 * iagV81_setupAllTriggers
 * ─────────────────────────────────────────────────────────────
 * شغّلها مرة واحدة من القائمة: نظام IAG → الإعداد → إعداد التريجرز
 *
 * تُنشئ:
 *   • 5 onFormSubmit triggers — واحد لكل فورم (INOUT/COMPLAINTS/TECH_HOSP/TECH_UNITS/FIN)
 *     كلها تستدعي trgV8_onFormSubmit — الـ dedup يمنع التنفيذ المزدوج
 *   • dailyEscalationCheck — يومي 8 صباحاً
 *   • weeklyAnalyticsRefresh — كل أحد 7 صباحاً
 *
 * آمن للتشغيل أكثر من مرة — تحذف القديم قبل الإنشاء.
 */
function iagV81_setupAllTriggers() {
  var ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);

  // ── 1. احذف كل triggers موجودة للـ handler الرئيسي والـ scheduled ──
  var toDelete = ["trgV8_onFormSubmit", "dailyEscalationCheck", "weeklyAnalyticsRefresh"];
  ScriptApp.getProjectTriggers().forEach(function(t) {
    if (toDelete.indexOf(t.getHandlerFunction()) !== -1) {
      ScriptApp.deleteTrigger(t);
    }
  });

  // ── 2. أنشئ 5 onFormSubmit triggers (واحد لكل فورم) ──
  // كل الفورمز مربوطة بنفس الـ Spreadsheet — الـ dedup في trgV8_onFormSubmit يمنع التكرار
  var created = 0;
  for (var i = 0; i < 5; i++) {
    ScriptApp.newTrigger("trgV8_onFormSubmit")
      .forSpreadsheet(ss)
      .onFormSubmit()
      .create();
    created++;
  }

  // ── 3. أنشئ الـ time-based triggers ──
  ScriptApp.newTrigger("dailyEscalationCheck")
    .timeBased()
    .everyDays(1)
    .atHour(8)
    .create();

  ScriptApp.newTrigger("weeklyAnalyticsRefresh")
    .timeBased()
    .onWeekDay(ScriptApp.WeekDay.SUNDAY)
    .atHour(7)
    .create();

  var total = created + 2;
  auditEngine_logEvent("SYSTEM", "TRIGGERS_SETUP", "iagV81_setupAllTriggers", "", { total: total, created: created }, "SUCCESS");

  SpreadsheetApp.getUi().alert(
    "✅ تم إعداد التريجرز بنجاح\n\n" +
    "• " + created + " Form Triggers (trgV8_onFormSubmit)\n" +
    "• dailyEscalationCheck — يومي 8 صباحاً\n" +
    "• weeklyAnalyticsRefresh — كل أحد 7 صباحاً\n\n" +
    "الإجمالي: " + total + " trigger"
  );
}

/**
 * شغّلها مرة واحدة يدوياً لإنشاء الـ time-based triggers فقط
 * من Apps Script Editor → اختر setupScheduledTriggers → Run
 */
function setupScheduledTriggers() {
  // احذف القديم لو موجود
  ScriptApp.getProjectTriggers().forEach(function(t) {
    var fn = t.getHandlerFunction();
    if (fn === "dailyEscalationCheck" || fn === "weeklyAnalyticsRefresh") {
      ScriptApp.deleteTrigger(t);
    }
  });

  // 0.19 — يومي للتصعيد (كل يوم 8 صباحاً)
  ScriptApp.newTrigger("dailyEscalationCheck")
    .timeBased()
    .everyDays(1)
    .atHour(8)
    .create();

  // 0.20 — أسبوعي للـ analytics (كل أحد 7 صباحاً)
  ScriptApp.newTrigger("weeklyAnalyticsRefresh")
    .timeBased()
    .onWeekDay(ScriptApp.WeekDay.SUNDAY)
    .atHour(7)
    .create();

  auditEngine_logEvent("SYSTEM", "TRIGGERS_SETUP", "setupScheduledTriggers", "", {}, "SUCCESS");
}

/** 0.19 — يجري يومياً — stub جاهز للـ EscalationEngine لاحقاً */
function dailyEscalationCheck() {
  try {
    auditEngine_logEvent("SYSTEM", "DAILY_ESCALATION_CHECK", new Date().toISOString(), "", {}, "INFO");
    escalationEngine_runDailyCheck();
  } catch (e) {
    auditEngine_logError("dailyEscalationCheck", e, "");
  }
}

/** 0.20 — يجري أسبوعياً — stub جاهز للـ Analytics لاحقاً */
function weeklyAnalyticsRefresh() {
  try {
    auditEngine_logEvent("SYSTEM", "WEEKLY_ANALYTICS_REFRESH", new Date().toISOString(), "", {}, "INFO");
    analytics_writeSnapshot_();
  } catch (e) {
    auditEngine_logError("weeklyAnalyticsRefresh", e, "");
  }
}

/* ============================================================
   Hospital Finalize — Menu-triggered (not form-triggered)
   ============================================================ */

/**
 * يطلب session_id من المستخدم ثم يستدعي rptTechHosp_finalizeReport
 * تُشغَّل من القائمة → لا تمر بـ govV8_run (ليست trigger)
 */
function trgV8_finalizeHospReport() {
  var ui = SpreadsheetApp.getUi();
  var response = ui.prompt(
    "إنهاء تقرير مستشفى",
    "أدخل Session ID\n(مثال: مستشفى الفيوم العام|20260415|صباحي)",
    ui.ButtonSet.OK_CANCEL
  );
  if (response.getSelectedButton() !== ui.Button.OK) return;
  var sessionId = String(response.getResponseText() || "").trim();
  if (!sessionId) { ui.alert("تم الإلغاء — لم يتم إدخال ID"); return; }
  try {
    var result = rptTechHosp_finalizeReport(sessionId);
    ui.alert("✅ تم إنهاء التقرير بنجاح\n\nرابط الملف:\n" + result.docUrl);
  } catch (e) {
    ui.alert("❌ خطأ:\n" + e.message);
    auditEngine_logError("trgV8_finalizeHospReport", e, "");
  }
}