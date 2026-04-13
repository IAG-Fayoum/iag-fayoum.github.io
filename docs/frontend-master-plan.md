# Frontend Master Plan — Phase 5 (Pragmatic / High-Speed)

**Project:** IAG System  
**Scope:** Frontend Evolution aligned with Backend refactoring discipline  
**Execution Window:** 3-4 major sprints  
**Architecture Principle:** Unified Core first, then wholesale migration by functional blocks (not file-by-file).

---

## 1) Mission and Execution Philosophy

Phase 5 transforms the current 11-page frontend into one cohesive platform using a **single frontend core**:

- One service layer for backend communication (`api.js`).
- One design system for UI consistency (`IAG-Design-System`).
- One global runtime for loading, errors, auth/session, and navigation behavior.

The plan is optimized for speed and stability:

- **Fast delivery:** migrate by functional block in bulk.
- **Zero downtime:** old pages remain functional while new core is introduced behind compatibility wrappers.
- **No over-engineering:** localStorage-based session/state only in this phase.
- **iOS-first quality:** safe-area + touch ergonomics from sprint 1.

---

## 2) Current Scope (Active Frontend Surface)

Active pages in Phase 5:

1. `index.html`
2. `admin.html`
3. `coordinator.html`
4. `employee.html`
5. `distribution.html`
6. `findings.html`
7. `forms.html`
8. `dashboard.html`
9. `notifications.html`
10. `settings.html`
11. `portal.html`

Core challenge today: API calls, session behavior, and styling are fragmented across page scripts and inline styles.  
Phase 5 resolves this by centralizing these concerns once, then applying them block-by-block.

---

## 3) Target Frontend Architecture (North-Star Runtime)

## 3.1 Unified Core Layer (`Frontend/assets/js/core/`)

- `api.js`: universal request layer with simple request + response normalization.
- `session.js`: role/user/session persistence via localStorage.
- `ui-feedback.js`: global loading overlay and unified error/success messaging.
- `error-handler.js`: safe error parsing + consistent user message mapping.

## 3.2 Unified Design System (`Frontend/assets/css/system/`)

- `tokens.css`: color, spacing, typography, radius, shadow, z-index tokens.
- `base.css`: reset, RTL defaults, typography, body/base app surface.
- `components.css`: buttons, cards, tables, forms, badges, chips, alerts, dialogs.
- `ios.css`: safe-area insets and touch target minimums.
- `iag-design-system.css`: the only global stylesheet entrypoint imported by pages.

## 3.3 Compatibility Strategy (Bridge)

- Add `legacy-api-bridge.js` and `legacy-style-bridge.css` during migration.
- Old page code can continue operating while gradually shifting to Core APIs/classes.
- Remove bridge artifacts only after all blocks complete migration and QA signoff.

---

## 4) Universal Standards (Non-Negotiable)

1. **No direct `fetch` in feature scripts** after migration of each block; all calls must pass through `core/api.js`.
2. **No new inline `<style>` or inline logic**; move to design system + module scripts.
3. **Response normalization contract** in frontend:
   - Accept backend payloads with either `success` or `ok`.
   - Normalize into:
     - `ok` (boolean)
     - `data` (payload object)
     - `error` (message/details)
4. **Session model is pragmatic**:
   - `localStorage.iag_user`
   - `localStorage.iag_last_page`
   - Optional `localStorage.iag_session_ts`
5. **iOS baseline**:
   - safe-area support for header/footer/nav
   - min 44px tap targets
   - predictable scrolling behavior
6. **Security baseline (Phase 5)**:
   - No secrets in frontend code.
   - Session keys are centralized and validated via `session.js`.
   - API errors are sanitized before display (no raw stack traces in UI).

---

## 5) Sprint Plan (3-4 Major Sprints)

## Sprint 1A — Core Logic Foundation (Mandatory / Immediate Start)

### Goal
Build the minimum shared logic needed to start migration immediately, with pragmatic scope and zero over-engineering.

### Scope

### A) `core/api.js` (Simple + Production-Ready)
- Implement `core/api.js` with:
  - `request(action, payload, options)`
  - basic timeout support
  - response normalization (`success` or `ok` -> unified `ok`)
  - unified return shape: `{ ok, data, error }`
- No retry strategy in 1A (deferred intentionally for speed/simplicity).
- Provide lightweight endpoint helpers only for currently used workflows:
  - `api.login`
  - `api.getTasks` / `api.updateTaskStatus`
  - `api.getNotifications` / `api.markNotifRead`

### B) `core/session.js` (Pragmatic Session Owner)
- Centralize:
  - `getUser()`
  - `setUser(user)`
  - `clearSession()`
  - `requireAuth()`
- Standardize keys:
  - `iag_user`
  - `iag_last_page`
  - optional `iag_session_ts`

### C) Global Error/Loading (Minimal Core)
- One lightweight global loading indicator API.
- One unified error presenter for API failures.
- Remove duplicated page-level error formatting where possible.

### D) Zero-Downtime Enablement
- Introduce bridge layer so old scripts can call new API methods progressively.
- No immediate mass deletion of old JS/CSS in 1A.

### Sprint 1A Definition of Done
- `core/api.js` is active with normalized `ok/success` handling and used by pilot implementation.
- `core/session.js` is the canonical session owner for migrated code.
- Global loading/error primitives exist and are reused by pilot page.
- Legacy pages still functional (no production downtime).
- Sprint 1B can start without dependency blockers.

---

## Sprint 1B — Design System Core (Lightweight)

### Goal
Ship a lean, reusable UI foundation to support fast wholesale migration without visual fragmentation.

### Scope

### A) CSS Core Files (Lightweight by Design)
- Build and stabilize:
  - `tokens.css`
  - `base.css`
  - `components.css`
  - `ios.css`
  - `iag-design-system.css` (entrypoint)
- Keep scope intentionally small; defer nonessential utility layers.

### B) iOS Compatibility from Day One
- Safe-area support for top/bottom navigation.
- 44px minimum tap targets for core controls.
- Stable mobile typography and spacing defaults.

### C) Zero-Downtime Styling
- Introduce `legacy-style-bridge.css` for temporary class mapping.
- Apply design system first to pilot page, then block rollout.

### Sprint 1B Definition of Done
- Lightweight design system is in production and imported successfully.
- Pilot page renders with new tokens/components and no critical regressions.
- iOS baseline checks pass on pilot page.
- Legacy pages continue working while migration proceeds.

---

## Sprint 2 — Block A Wholesale Refactor (Management & Coordination)

### Block A Pages
- `admin.html`
- `coordinator.html`
- `settings.html`
- `notifications.html`

### Goal
Convert high-control operational surfaces first (manager/coordinator stack) to maximize governance and stabilize shared workflows.

### Refactor Mode (Wholesale)
For all Block A pages in one sprint:

1. Replace page-level direct API calls with `core/api.js` methods.
2. Unify auth/session guard behavior using `session.js`.
3. Apply `iag-design-system.css` and remove duplicated style rules/internal style blocks.
4. Normalize navigation chrome and role-based menus.
5. Wire all API failures to global error handler + audit pathway.

### Pilot Rule Before Wholesale
- Before Block A wholesale migration starts, run a **Pilot Page** migration on `coordinator.html`.
- Pilot must include:
  - API migration to `core/api.js`
  - session migration to `core/session.js`
  - design system styling integration
  - global loading/error wiring
- Only after pilot acceptance can full Block A migration proceed.

### Sprint 2 Definition of Done
- Block A pages use unified service layer only (no direct fetch in these pages).
- Block A visual style conforms to design tokens (header/color/spacing/components).
- Inline CSS in Block A removed or reduced to zero (except temporary emergency override documented).
- Session/logout behavior is consistent across Block A.
- All Block A core flows pass UAT: login state, task updates, notifications operations, settings actions.

---

## Sprint 3 — Block B Wholesale Refactor (Employee & Field Operations)

### Block B Pages
- `employee.html`
- `forms.html`
- `findings.html`
- `portal.html`

### Goal
Upgrade employee-facing and field/verification workflows in one pass, leveraging stabilized core from sprints 1-2.

### Refactor Mode (Wholesale)
1. Move all data calls to `core/api.js` (tasks, findings, CAR/portal operations).
2. Apply design-system components for lists, cards, action bars, and forms.
3. Remove internal styles and redundant page CSS sections.
4. Ensure role/permission guards are enforced uniformly.
5. Validate Arabic/RTL content rendering and mobile interactions.

### Pilot Rule Before Wholesale
- Before full Block B migration, run one pilot page from the block (recommended: `employee.html`) and validate logic + UI + state behavior.

### Sprint 3 Definition of Done
- Block B pages fully on core API + global error/loading runtime.
- Block B UI aligned to IAG design tokens with iOS-safe spacing/tap targets.
- No duplicated auth/session logic in Block B scripts.
- Portal/findings/employee critical actions are stable and audited.
- Legacy code in Block B marked for removal with explicit cleanup checklist.

---

## Sprint 4 — Block C Wholesale Refactor + Final Consolidation (Analytics & Dashboard)

### Block C Pages
- `dashboard.html`
- `distribution.html`
- `index.html` (entry polish + global handoff)

### Goal
Finish analytics surfaces and then perform platform-wide consolidation and cleanup.

### Refactor Mode (Wholesale)
1. Migrate dashboard/distribution APIs to standardized service layer.
2. Unify KPI/filter components under design system.
3. Finalize nav shell consistency and cross-page transition behavior.
4. Remove bridge dependencies where migration is complete.
5. Execute repository cleanup (obsolete CSS/JS and dead selectors).

### Pilot Rule Before Wholesale
- Before full Block C migration, run one pilot page from the block (recommended: `dashboard.html`) and validate filters, KPIs, and loading/error UX.

### Sprint 4 Definition of Done
- All 11 pages run through unified core runtime and design system.
- Direct `fetch` usage in page scripts is eliminated (or explicitly documented exception list = empty target).
- Legacy style and API bridges removed or minimized to approved residual list.
- Visual and behavior consistency validated across mobile and desktop.
- Phase 5 closeout report completed with KPI results (stability, speed, defect count).

---

## 6) Functional Block Mapping (Execution Matrix)

| Block | Pages | Business Focus | Priority |
|------|-------|----------------|----------|
| A | `admin`, `coordinator`, `settings`, `notifications` | Governance, orchestration, operations control | High |
| B | `employee`, `forms`, `findings`, `portal` | Field execution, reporting intake, verification loop | High |
| C | `dashboard`, `distribution`, `index` | Analytics, executive visibility, entry flow | Medium/Final |

Why this grouping:
- Block A hardens managerial control and shared flows first.
- Block B upgrades heavy daily user operations once core is stable.
- Block C closes with analytics polish and global consistency.

---

## 7) Zero-Downtime Migration Strategy (Pragmatic)

1. **Additive first, destructive later**:
   - Introduce core layer without deleting old logic immediately.
2. **Compatibility wrappers**:
   - Old function signatures proxy into new `api.js`.
3. **Page-level feature flags (lightweight)**:
   - Simple boolean toggles in script to switch old/new behavior if rollback needed.
4. **Block-level cutover**:
   - Each block migrates as one unit, tested, then old block code cleaned.
5. **Rollback-ready per sprint**:
   - If a cutover issue appears, revert that block to bridge mode only (not whole frontend).

---

## 8) Testing and Quality Gates

Per sprint, run the same gate set:

1. **Contract Gate**
   - Validate all used actions against `Flow_ApiGateway.js` responses.
2. **UX Gate**
   - Header/nav/button/form/table consistency under design system.
3. **Role Gate**
   - Employee vs coordinator vs manager permission behavior.
4. **Resilience Gate**
   - Network failure, backend error, malformed payload handling.
5. **iOS Gate**
   - iPhone viewport, safe-area, tap targets, scrolling, fixed nav behavior.

No sprint is accepted as complete without passing all gates.

---

## 9) Risks and Fast Mitigations

- **Risk:** Backend response shape variations (`success` vs `ok`).  
  **Mitigation:** normalize once inside `api.js`, never in page scripts.

- **Risk:** CSS regressions during wholesale migration.  
  **Mitigation:** token-first design system + `legacy-style-bridge.css` during transition.

- **Risk:** hidden page-specific business rules in old scripts.  
  **Mitigation:** block-level smoke tests + compatibility wrappers before deletion.

- **Risk:** session inconsistencies across pages.  
  **Mitigation:** single `session.js` owner and removal of ad hoc logout/auth code.

---

## 10) Future / Post-Launch (Deferred Features)

The following items are explicitly deferred and are **not part of Phase 5 implementation scope**:

1. **Frontend Audit Client (advanced telemetry layer)**
   - Deferred to post-launch hardening.
   - Phase 5 keeps only pragmatic runtime error handling.

2. **Complex SPA State Management**
   - Deferred to post-launch optimization.
   - Phase 5 uses simple localStorage + page-level state only.

3. **Advanced retry/circuit-breaker network patterns**
   - Deferred until after stabilization metrics are collected.

---

## 11) Final Phase 5 Definition of Done (Program-Level)

Phase 5 is considered complete only when:

1. All 11 active pages run on shared core runtime (`api/session/error/loading`).
2. IAG-Design-System is the global visual source of truth.
3. Inline styling and fragmented theme conflicts are removed from active pages.
4. Session behavior is consistent via localStorage strategy across all routes.
5. iOS compatibility baseline is verified in all blocks.
6. Zero-downtime objective is met during rollout (no critical production outage).
7. Documentation is updated and aligned with backend-grade engineering rigor.

---

## 12) Sprint 1A Immediate Implementation Kickoff (AI-Ready)

Start here in a fresh session with no extra context:

1. Create `Frontend/assets/js/core/api.js`:
   - Implement `request(action, payload = {}, options = {})`.
   - POST to `CONFIG.API_URL`.
   - Parse JSON safely.
   - Normalize:
     - if response has `ok`, use it.
     - if response has `success`, map to `ok`.
   - Return `{ ok, data, error }`.
   - No retry logic in this sprint.

2. Create `Frontend/assets/js/core/session.js`:
   - Implement `getUser`, `setUser`, `clearSession`, `requireAuth`.
   - Use `localStorage` keys defined in this plan.

3. Create minimal global feedback helpers:
   - show/hide loading.
   - show error message.

4. Pilot `coordinator.html`:
   - switch key API calls to `core/api.js`.
   - use `session.js` for auth/session behavior.
   - validate successful login/session continuity/error display.

5. Keep legacy behavior intact:
   - if any critical issue appears, fallback to bridge mode without breaking production.

---

## 13) Execution Note

This plan intentionally favors **speed with control**:

- Build foundation in two steps (Sprint 1A then 1B).
- Migrate in three wholesale functional blocks (Sprints 2-4).
- Keep system functional throughout.
- Close with cleanup and hard standardization.

This is the frontend equivalent of the successful backend refactor discipline: **prefix-like clarity, centralized contracts, and controlled high-velocity execution**.

