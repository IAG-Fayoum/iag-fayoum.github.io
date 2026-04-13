# Frontend Strict Rules (The Constitution)

## 1. CSS & UI Governance
- NO INLINE STYLES: The use of `style="..."` in HTML is strictly forbidden.
- TOKEN ENFORCEMENT: All colors, margins, and sizes must use `var(--iag-...)`. Hardcoded values (e.g., `#0a5c56` or `15px`) are prohibited.
- COMPONENT OWNERSHIP: All UI elements (buttons, tables, cards, modals) must be defined in `components.css`. Pages should only use class names.
- iOS STANDARDS: Minimum tap target is 44px. Safe-areas must be respected in headers/footers.

## 2. API & Data Integrity
- API LOCK: `fetch` or `google.script.run` must NEVER be used directly in pages. All communication must pass through `core/api.js`.
- SESSION CENTRALIZATION: All auth guards and user role checks must be handled exclusively by `core/session.js`.

## 3. Role Definitions (The Source of Truth)
- Define and enforce only these roles: `Admin`, `Coordinator`, and `Employee`.
- Any modification to roles or permissions must be updated in `core/session.js` before UI implementation.

## 4. Change Protocol
- PILOT FIRST: New features or design changes must be tested on `coordinator.html` before wholesale rollout.
- DRY PRINCIPLE: No code duplication. Shared logic belongs in `core/` or `system/`.
