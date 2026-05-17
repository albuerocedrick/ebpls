# Phase 10: Admin Module — Chronological Task List

This execution plan breaks down the development of the Admin Module into atomic, sequential tasks. To optimize context windows and token usage, **strictly read only the specified `Files to Read`** for each step before making changes.

---

## 🛠️ Step 1: Database & RLS Initialization
**Goal:** Set up storage buckets, required tables (like `document_templates`), and explicit Row Level Security (RLS) policies for the Admin role.
*   **Files to Read:**
    *   `ebpls-server/supabase/migrations/` (List directory only, to determine the next sequential migration number).
*   **Action:** Create a new migration file (e.g., `xxx_admin_module_setup.sql`) containing RLS policies for `users`, `audit_logs`, and the setup for the `document-templates` storage bucket.

## 🛠️ Step 2: Backend Admin Routing Foundation
**Goal:** Establish the isolated, RBAC-protected API route space for the admin module.
*   **Files to Read:**
    *   `ebpls-server/src/app.js` (To see where to mount routes).
    *   `ebpls-server/src/middlewares/rbac.middleware.js` (To verify how the `requireRole` check is implemented).
    *   `ebpls-server/src/utils/constants.js` (To verify the exact string for the `Admin` role).
*   **Action:** Create `ebpls-server/src/routes/admin.routes.js` and `ebpls-server/src/controllers/admin.controller.js`. Mount the route in `app.js` wrapped in `verifyToken` and `requireRole('Admin')`.

## 🛠️ Step 3: Backend System Health Endpoint
**Goal:** Create the `/api/admin/health` endpoint to serve the dashboard.
*   **Files to Read:**
    *   `ebpls-server/src/controllers/admin.controller.js` (Created in Step 2).
*   **Action:** Implement queries to `pg_stat_activity` and `storage.objects` inside the controller. Implement a 60-second in-memory cache to prevent DB spam.

## 🛠️ Step 4: Frontend Admin Layout & Dashboard UI
**Goal:** Update the sidebar navigation and build the landing dashboard.
*   **Files to Read:**
    *   `ebpls-frontend/src/utils/constants.js` (Check `ROUTES` and `API_ENDPOINTS` configurations).
    *   `ebpls-frontend/src/layouts/AdminLayout.jsx` (To inspect current sidebar items).
    *   `ebpls-frontend/src/App.jsx` (To see current React Router implementation).
*   **Action:** Update `AdminLayout.jsx` with the 7 defined sidebar groups. Create `ebpls-frontend/src/screens/admin/AdminDashboard.jsx` featuring stat cards for the `/health` endpoint data. Update `App.jsx` router.

## 🛠️ Step 5: Backend Application Explorer Endpoint
**Goal:** Create a secure, paginated endpoint to pull all applications for the master queue.
*   **Files to Read:**
    *   `ebpls-server/src/controllers/admin.controller.js`.
*   **Action:** Implement `GET /api/admin/applications` ensuring it pulls related taxpayers and statuses without violating other RLS rules. (Logging this action in `audit_logs` will be handled in the frontend or middleware).

## 🛠️ Step 6: Frontend Application Explorer UI
**Goal:** Build the master queue screen.
*   **Files to Read:**
    *   None (Standard Tailwind/Lucide table UI).
*   **Action:** Create `ebpls-frontend/src/screens/admin/ApplicationExplorer.jsx` and hook it up to the API. Update `App.jsx`.

## 🛠️ Step 7: Backend User Management Endpoints
**Goal:** Implement CRUD for user roles and activation statuses.
*   **Files to Read:**
    *   `ebpls-server/src/controllers/admin.controller.js`.
*   **Action:** Implement `GET /api/admin/users`, `PATCH /api/admin/users/:id/status`, and `PATCH /api/admin/users/:id/role` utilizing strict Zod validation.

## 🛠️ Step 8: Frontend User Management UI
**Goal:** Build the interface to promote staff and deactivate accounts.
*   **Files to Read:**
    *   None.
*   **Action:** Create `ebpls-frontend/src/screens/admin/UsersManagement.jsx`. Update `App.jsx`.

## 🛠️ Step 9: Backend & Frontend Master Data
**Goal:** Allow editing of system lookup tables (fees, clearances).
*   **Files to Read:**
    *   `ebpls-server/src/controllers/admin.controller.js`.
    *   `ebpls-frontend/src/screens/admin/MasterData.jsx` (If it exists, read it to see the placeholder).
*   **Action:** Implement `GET` and `PUT` endpoints with a strict table allowlist on the backend. Implement the inline-editing table in the frontend.

## 🛠️ Step 10: Backend & Frontend Compliance Logs
**Goal:** View DPA Audit logs and Email logs.
*   **Files to Read:**
    *   `ebpls-server/src/controllers/admin.controller.js`.
    *   `ebpls-frontend/src/screens/admin/AuditLogs.jsx`.
    *   `ebpls-frontend/src/screens/admin/EmailLogs.jsx`.
*   **Action:** Connect paginated API logic on the backend for both tables. Fetch and display the data in the existing frontend placeholder components.

## 🛠️ Step 11: Document Builder Workflow
**Goal:** Finalize the PDF template uploader.
*   **Files to Read:**
    *   `ebpls-server/src/services/storage.service.js` (To see how files are currently uploaded to Supabase Storage).
    *   `ebpls-frontend/src/screens/admin/DocumentBuilder.jsx`.
*   **Action:** Implement a `multer` route in the backend to pipe PDF uploads into the new `document-templates` bucket. Implement the left/right pane mapping UI in the frontend.
