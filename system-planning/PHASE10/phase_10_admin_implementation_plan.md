# Phase 10: Admin Module — Detailed Implementation Plan

**Author:** `@ebpls-architect`
**Contributors:** `@ebpls-frontend`, `@ebpls-backend`, `@ebpls-supabase`

---

## 1. Scope & Architectural Directives (System Architect)

**PLAN BEFORE CODE (Non-Negotiable)**

*   **Exact Scope:**
    *   **System Health Dashboard:** Monitor critical infrastructure metrics including Supabase available storage, DB connections, API read/write operations, and application error rates. 
    *   **Application Explorer:** Read-only master repository allowing the Admin to inspect any application, review submitted forms/documents, and download generated PDFs (with DPA compliance logging).
    *   **User Management:** View all users, toggle `is_active` status, and manage roles.
    *   **Master Data CRUD:** Update lookup tables (e.g., fee types, clearance types) to keep the system adaptable.
    *   **Document Builder:** Upload PDF templates (for permits, E-Resibos) and map data placeholders.
    *   **Audit Logs Viewer:** Filterable, read-only dashboard for DPA 2012 compliance.
*   **Dependencies:** Requires existing `users` table, `audit_logs` table, RBAC middleware, Supabase Storage, and (optionally) Supabase Management API access for advanced metrics.
*   **Edge Cases:**
    *   Hitting rate limits on Supabase Management APIs when fetching health metrics (Mitigation: Cache health results on the Node server for ~60 seconds).
    *   An Admin deactivating their own account (Prevent this via backend validation).
    *   Updating master data (e.g., fee amounts) while applications are mid-process. *Simplicity Rule: Master data updates apply only to new assessments moving forward. Previous assessments keep their snapshot values.*
*   **Minimal Change:** Do not over-engineer a drag-and-drop PDF builder. Simply accept an uploaded PDF and a JSON mapping of fields for the `pdf-lib` service to use.
*   **Role Segregation:** The Admin role must be strictly isolated. Admins cannot process UAF submissions, assess fees, or record payments.

---

## 2. Supabase Console & DB Configuration (Supabase Expert)

*All changes must be formalized in an SQL migration file, not just manual console clicks.*

### A. Row Level Security (RLS)
ALL tables touched by the admin module must have explicit RLS policies checking for the `Admin` role.
```sql
-- Example Policy: Admin full access to users
CREATE POLICY "Admin full access to users" ON public.users
  FOR ALL
  USING (
    (SELECT role FROM public.users WHERE user_id = auth.uid()) = 'Admin'
  );

-- Example Policy: Admin read-only access to audit logs
CREATE POLICY "Admin read access to audit_logs" ON public.audit_logs
  FOR SELECT
  USING (
    (SELECT role FROM public.users WHERE user_id = auth.uid()) = 'Admin'
  );
```

### B. Storage Security
*   **Bucket:** Create a new bucket named `document-templates`.
*   **Public Access:** **NO.**
*   **RLS on Bucket:** Only users with the `Admin` role can `INSERT` or `UPDATE` templates. The backend server (using service role) will read these templates to generate the final PDFs.

### C. Audit Logging Enforcement
Ensure the existing database triggers for `audit_logs` are attached to the `users` table and all master data tables. Any mutation performed by the Admin must capture the `old_value` and `new_value` as JSONB.

---

## 3. Backend API Implementation (Backend Developer)

**POLICY: Secure By Default & Distrust All Client Data**

### A. Routing & Middleware
All admin endpoints must be isolated in `src/routes/admin.routes.js` and mounted with explicit RBAC:
```javascript
// app.js
app.use('/api/admin', verifyToken, requireRole('Admin'), adminRoutes);
```
*Fail Closed:* If a user without the `Admin` role attempts access, the `requireRole` middleware must immediately abort the request and return a `403 Forbidden`.

### B. Endpoints & Zod Validation
1.  **`GET /health` (System Dashboard)**
    *   Fetch active Postgres connections via system tables (`pg_stat_activity`).
    *   Fetch total storage size used in buckets via `storage.objects` table.
    *   **Performance Policy:** Cache this endpoint's output in-memory for 1 minute to prevent overwhelming the DB with constant dashboard polling.
2.  **`GET /applications`**
    *   Retrieve a complete list of applications with full search and filtering capabilities.
3.  **`GET /users` & `PATCH /users/:id/status`**
    *   Body schema: `z.object({ is_active: z.boolean() })`. Reject any other fields.
    *   Guard: Check if `req.user.id === req.params.id`. Prevent self-deactivation.
4.  **`GET /master-data/:table` & `PUT /master-data/:table/:id`**
    *   *Injection Prevention:* The `:table` parameter MUST be validated against a strict allowlist (e.g., `['fee_types', 'clearance_types']`). Never interpolate user input directly into SQL/Supabase table names.
5.  **`GET /audit-logs`**
    *   Query parameters must be validated: `z.object({ userId: z.string().uuid().optional(), action: z.string().optional(), page: z.number().int() })`.
6.  **`POST /templates`**
    *   Use `multer` (memory storage) to receive the PDF, then upload to Supabase Storage via `storage.service.js`.

---

## 4. Frontend UI/UX Implementation (Frontend Developer)

**POLICY: Performance-First & Anti-Generic UI**

### A. Layout & Sidebar Navigation Structure (`AdminLayout.jsx`)
The admin panel should be data-dense but highly readable. The sidebar will be organized into distinct functional groups:

#### Group 1: 🖥️ Monitor
*   **System Health Dashboard**
    *   *Path:* `/admin/dashboard`
    *   *Icon:* `Activity`
    *   *Description:* Primary admin landing page showing Supabase storage capacity, DB connection count, real-time read/write volumes, and active application sessions.

#### Group 2: 🔍 Operations
*   **Application Explorer**
    *   *Path:* `/admin/applications`
    *   *Icon:* `FolderSearch`
    *   *Description:* Read-only master registry to search and inspect UAF forms, checklists, and uploaded documents across all tax-paying entities.

#### Group 3: ⚙️ Configuration
*   **User Management**
    *   *Path:* `/admin/users`
    *   *Icon:* `Users`
    *   *Description:* Centralized screen to designate roles (BPLO, Treasury, Barangay) and activate/deactivate user profiles.
*   **Master Data**
    *   *Path:* `/admin/master-data`
    *   *Icon:* `Database`
    *   *Description:* CRUD panel to manage static lookup metadata such as municipal fee types, organizational categories, and clearance terms.
*   **Document Builder**
    *   *Path:* `/admin/document-builder`
    *   *Icon:* `FileText`
    *   *Description:* Document template uploader and token-mapping interface used to feed variable system inputs into `pdf-lib` generated layouts.

#### Group 4: ⚖️ Compliance
*   **Audit Logs**
    *   *Path:* `/admin/audit-logs`
    *   *Icon:* `ScrollText`
    *   *Description:* DPA 2012 compliant ledger displaying user mutation history along with before-and-after JSONB snapshots.
*   **Email Logs**
    *   *Path:* `/admin/email-logs`
    *   *Icon:* `Mail`
    *   *Description:* Visual database log of outbound transactional notices to track successful deliverability and handle failures.

---

## 5. Atomic Execution Steps (Decomposed)

1.  **Database:** Write and execute the migration file for `document_templates` and Admin RLS policies.
2.  **Backend (Health):** Implement `/admin/health` endpoint with caching logic to aggregate system/Supabase metrics safely.
3.  **Frontend (Health):** Build `AdminLayout.jsx` and the `AdminDashboard.jsx` landing page with stat cards and charts.
4.  **Backend (Explorer):** Build `/admin/applications` query endpoint.
5.  **Frontend (Explorer):** Create read-only `ApplicationExplorer.jsx` screen with DPA logging guards.
6.  **Backend (Users):** Implement `admin.controller.js` for user management with Zod schemas.
7.  **Frontend (Users):** Build user management table UI.
8.  **Backend (Master Data):** Implement lookup table CRUD with strict allowlisting.
9.  **Frontend (Master Data):** Build `MasterData.jsx` UI with inline editing.
10. **Backend (Audit):** Implement paginated `GET /audit-logs`.
11. **Frontend (Audit):** Build `AuditLogs.jsx` with filters.
12. **Backend/Frontend (Templates):** Implement DocumentBuilder flows and storage integration.
