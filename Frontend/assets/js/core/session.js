/**
 * IAG System — Core Session Layer (Sprint 1A)
 *
 * Single owner for all auth/session state via localStorage.
 * Keys are canonical here — no page script should hardcode them.
 */

const IAGSession = (() => {

    const KEYS = {
        USER:     'iag_user',
        LAST_PAGE:'iag_last_page',
        SESSION_TS:'iag_session_ts',
    };

    // ── Read ─────────────────────────────────────────────────────────────────

    /**
     * Returns the current user object or null if not logged in / corrupt.
     * @returns {{ name, role, jobTitle, mobile, email }|null}
     */
    function getUser() {
        const raw = localStorage.getItem(KEYS.USER);
        if (!raw) return null;
        try {
            return JSON.parse(raw);
        } catch {
            localStorage.removeItem(KEYS.USER);
            return null;
        }
    }

    // ── Write ─────────────────────────────────────────────────────────────────

    /**
     * Persist user and stamp the session timestamp.
     * @param {{ name, role, jobTitle, mobile, email }} user
     */
    function setUser(user) {
        localStorage.setItem(KEYS.USER, JSON.stringify(user));
        localStorage.setItem(KEYS.SESSION_TS, Date.now().toString());
    }

    // ── Clear ─────────────────────────────────────────────────────────────────

    /** Wipe all session state. */
    function clearSession() {
        localStorage.removeItem(KEYS.USER);
        localStorage.removeItem(KEYS.LAST_PAGE);
        localStorage.removeItem(KEYS.SESSION_TS);
    }

    // ── Guard ─────────────────────────────────────────────────────────────────

    /**
     * Redirect to index.html if no valid session exists.
     * Call at the top of any protected page's DOMContentLoaded.
     * @returns {{ name, role, jobTitle, mobile, email }|never}
     */
    function requireAuth() {
        const user = getUser();
        if (!user) {
            window.location.href = 'index.html';
            throw new Error('Unauthenticated — redirecting');
        }
        return user;
    }

    /** Convenience: logout and go home. */
    function logout() {
        clearSession();
        window.location.href = 'index.html';
    }

    // ── Public API ─────────────────────────────────────────────────────────────

    return { getUser, setUser, clearSession, requireAuth, logout, KEYS };

})();
