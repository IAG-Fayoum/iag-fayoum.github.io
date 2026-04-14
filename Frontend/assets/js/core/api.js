/**
 * IAG System — Core API Layer (Sprint 1A)
 *
 * Single entry point for all backend communication.
 * Contract: every call returns { ok, data, error }.
 *
 * Normalization rule:
 *   - Backend may return `success` or `ok` — both map to `ok`.
 *   - All other fields land in `data`.
 *   - Network/parse failures produce { ok: false, data: null, error: string }.
 */

const IAGApi = (() => {

    const TIMEOUT_MS = 25000;

    // ── Core Request ─────────────────────────────────────────────────────────

    /**
     * @param {string} action  - Backend action name.
     * @param {object} payload - Request payload (merged with action).
     * @param {object} options - { timeout: number }
     * @returns {Promise<{ ok: boolean, data: object|null, error: string|null }>}
     */
    async function request(action, payload = {}, options = {}) {
        if (typeof CONFIG === 'undefined' || !CONFIG.API_URL) {
            return { ok: false, data: null, error: 'CONFIG.API_URL غير معرّف' };
        }

        const timeout = options.timeout ?? TIMEOUT_MS;
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeout);

        try {
            const response = await fetch(CONFIG.API_URL, {
                method: 'POST',
                mode: 'cors',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify({ action, ...payload }),
                signal: controller.signal,
            });

            clearTimeout(timer);

            let raw;
            try {
                raw = await response.json();
            } catch {
                return { ok: false, data: null, error: 'الخادم أرسل استجابة غير صالحة' };
            }

            return _normalize(raw);

        } catch (err) {
            clearTimeout(timer);
            if (err.name === 'AbortError') {
                return { ok: false, data: null, error: 'انتهت مهلة الاتصال بالخادم' };
            }
            return { ok: false, data: null, error: 'فشل الاتصال بالسيرفر، تأكد من الإنترنت' };
        }
    }

    // ── Response Normalization ────────────────────────────────────────────────

    function _normalize(raw) {
        if (!raw || typeof raw !== 'object') {
            return { ok: false, data: null, error: 'استجابة فارغة من الخادم' };
        }

        // Determine ok: honour `ok` if present, else fall back to `success`.
        let ok;
        if (typeof raw.ok === 'boolean') {
            ok = raw.ok;
        } else if (typeof raw.success === 'boolean') {
            ok = raw.success;
        } else {
            ok = false;
        }

        // error message: prefer explicit error field, else generic.
        const error = ok ? null : (raw.error || raw.message || 'حدث خطأ غير متوقع');

        // data: everything except the envelope fields.
        const { ok: _o, success: _s, error: _e, message: _m, ...rest } = raw;
        const data = ok ? (Object.keys(rest).length ? rest : null) : null;

        return { ok, data, error };
    }

    // ── Endpoint Helpers ─────────────────────────────────────────────────────
    // Only the actions actively used across the current frontend surface.

    /** Login */
    function login(mobile, pin) {
        return request('login', { mobile: mobile.trim(), pin: pin.trim() });
    }

    /**
     * Load all task data for a coordinator/manager view.
     * @param {string} username
     */
    function getAllData(username) {
        return request('getAllData', { role: 'مدير', name: username });
    }

    /** Update a single field on a task */
    function updateTaskField(taskId, fieldName, fieldValue, updatedBy) {
        return request('updateTaskField', { taskId, fieldName, fieldValue, updatedBy });
    }

    /** Update task status */
    function updateStatus(taskId, newStatus, updatedBy) {
        return request('updateStatus', { taskId, newStatus, updatedBy });
    }

    /** Reassign a task to a new employee */
    function reassignTask(taskId, newEmployee, updatedBy) {
        return request('reassignTask', { taskId, newEmployee, updatedBy });
    }

    /** Upload archive file (base64) */
    function uploadArchiveFile(taskId, fileName, fileBase64, mimeType, updatedBy) {
        return request('uploadArchiveFile', { taskId, fileName, fileBase64, mimeType, updatedBy });
    }

    /** Get notifications for a user */
    function getNotifications(username) {
        return request('getNotifications', { name: username });
    }

    /** Mark notification as read */
    function markNotifRead(notifId, username) {
        return request('markNotifRead', { notifId, name: username });
    }

    /** Mark a single notification as read (legacy action name used by backend) */
    function markAsRead(notifId) {
        return request('markAsRead', { notifId });
    }

    /** Delete a single notification */
    function deleteNotification(notifId) {
        return request('deleteNotification', { notifId });
    }

    /** Mark all notifications as read for a user */
    function markAllRead(username) {
        return request('markAllRead', { name: username });
    }

    /** Delete all notifications for a user */
    function deleteAllNotifications(username) {
        return request('deleteAllNotifications', { name: username });
    }

    /** Admin: update task status with optional notes */
    function adminUpdateStatus(taskId, newStatus, notes, updatedBy) {
        return request('adminUpdateStatus', { taskId, newStatus, notes, updatedBy });
    }

    /** Admin: send a custom email to an employee */
    function sendCustomEmail(toEmployee, subject, body) {
        return request('sendCustomEmail', { toEmployee, subject, body });
    }

    /** Admin: broadcast a notification to one or all employees */
    function broadcastNotification(target, message) {
        return request('broadcastNotification', { target, message });
    }

    // ── Block B Endpoint Helpers (Sprint 3) ──────────────────────────────────

    /** Employee: get Drive files for an employee */
    function getEmployeeFiles(username) {
        return request('getEmployeeFiles', { name: username });
    }

    /** Findings: load all findings */
    function getFindings() {
        return request('getFindings');
    }

    /** Findings: update a finding's status */
    function updateFindingStatus(findingId, status, updatedBy, extra = {}) {
        return request('updateFindingStatus', { finding_id: findingId, status, updated_by: updatedBy, ...extra });
    }

    /** Findings: load CAR sections (for portal badge in findings page) */
    function getCARSections() {
        return request('getCARSections');
    }

    /** Portal: login for health-area managers */
    function portalLogin(adminCode, pin) {
        return request('portalLogin', { admin_code: adminCode, pin });
    }

    /** Portal: load sections for a health-area manager */
    function portalGetSections(adminCode) {
        return request('portalGetSections', { admin_code: adminCode });
    }

    /** Portal: submit a response for a CAR section */
    function portalSubmitResponse(adminCode, carId, sectionName, response) {
        return request('portalSubmitResponse', { admin_code: adminCode, car_id: carId, section_name: sectionName, response });
    }

    // ── Block C Endpoint Helpers (Sprint 4) ──────────────────────────────────

    /** Dashboard: load statistics with optional filters (dateFrom, dateTo, adminArea, employee) */
    function getDashboardStats(filters = {}) {
        return request('getDashboardStats', filters);
    }

    /** Distribution: load employee performance data */
    function getDashboardData(year, period) {
        return request('getDashboardData', { year, period });
    }

    /** Distribution: send reminder notification to a single employee */
    function sendReminderNotification(empName, sentBy, tasks) {
        return request('sendReminderNotification', { empName, sentBy, tasks });
    }

    // ── Public API ────────────────────────────────────────────────────────────

    return {
        request,
        login,
        getAllData,
        updateTaskField,
        updateStatus,
        reassignTask,
        uploadArchiveFile,
        getNotifications,
        markNotifRead,
        markAsRead,
        deleteNotification,
        markAllRead,
        deleteAllNotifications,
        adminUpdateStatus,
        sendCustomEmail,
        broadcastNotification,
        // Block B (Sprint 3)
        getEmployeeFiles,
        getFindings,
        updateFindingStatus,
        getCARSections,
        portalLogin,
        portalGetSections,
        portalSubmitResponse,
        // Block C (Sprint 4)
        getDashboardStats,
        getDashboardData,
        sendReminderNotification,
    };

})();
