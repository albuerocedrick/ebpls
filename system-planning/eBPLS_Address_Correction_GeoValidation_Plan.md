# Post-Approval Data Correction & Address Geo-Validation

Two new features to address gaps in the eBPLS system: (1) allowing applicants to request corrections on approved/completed permits, and (2) validating that a business's map pin falls within the declared barangay using OpenStreetMap boundary data.

## 1. Planning Basis

- **Architecture Source**: [eBPLS_System_Architecture.md](file:///c:/projects/eBPLS/system-planning/eBPLS_System_Architecture.md), [eBPLS_SDD_v3.md](file:///c:/projects/eBPLS/system-planning/eBPLS_SDD_v3.md)
- **Application Flows Source**: [eBPLS_Application_Flows.md](file:///c:/projects/eBPLS/system-planning/eBPLS_Application_Flows.md)
- **Existing Codebase**: Express.js backend (Supabase/PostgreSQL, Zod, `pdf-lib`, Nodemailer, JWT+RBAC), React frontend (Zustand, Leaflet/react-leaflet)
- **External Data**: User-provided BetterGov GeoJSON file containing Philippine barangay boundaries

### Assumptions

- The correction request feature is scoped to **non-financial fields only** (address, contact info, name typos). Changes to business activities, capitalization, or gross sales that would affect fee assessments are explicitly **out of scope** — those require a new application.
- The BetterGov GeoJSON file contains polygon features with a property that can be matched to the 33 official Liliw barangay names in the [`barangays`](file:///c:/projects/eBPLS/ebpls-server/supabase/migrations/030_barangays_lookup.sql) lookup table.
- The geo-validation is a **soft warning**, not a hard block. Applicants can still submit even if their pin mismatches the selected barangay.

---

## 2. Dependency / Execution Strategy

The two phases are **independent** — neither depends on the other and they can be built in any order. However, the recommended sequence is:

1. **Phase 1 (Correction Request)** first — it solves an immediate operational gap (applicants currently have no way to fix errors on issued permits).
2. **Phase 2 (Geo-Boundary Validation)** second — it is a preventive measure that reduces the likelihood of address errors occurring in the first place.

Within each phase, the order is: **database migration → backend service/controller/routes → frontend screens → notifications & PDF re-generation → testing**.

---

## 3. Phase Overview

| Phase | Name | Objective | Dependencies | Deliverable |
|---|---|---|---|---|
| 1 | Applicant-Initiated Correction Request | Allow applicants to request data corrections on completed permits; BPLO reviews and approves/rejects; system updates records, re-generates permit PDF, and notifies applicant | Existing `audit_logs`, `notifications`, `email.service`, `pdf.service`, RBAC middleware | New `correction_requests` table, correction API endpoints, applicant correction form, BPLO correction queue, permit re-generation on approval |
| 2 | Barangay Geo-Boundary Validation | Validate that an applicant's map pin falls within the selected barangay using OpenStreetMap/BetterGov GeoJSON data; warn on mismatch; flag for BPLO review | Existing `InteractiveLocationPin.jsx`, `Step2_Location.jsx`, `DataReviewPanel.jsx`, `validators.js`, BetterGov GeoJSON file | Liliw barangay GeoJSON data file, mandatory map pin, frontend pin-in-polygon check with Turf.js, backend mismatch flag, BPLO mismatch alert |

---

## 4. Detailed Phases

### Phase 1 — Applicant-Initiated Correction Request

**Objective**

Enable a formal, auditable workflow where an applicant can request a correction to non-financial data (address, contact number, name typo) on an already-completed permit. BPLO reviews and approves/rejects the request. On approval, the system updates the record, re-generates the Business Permit PDF, and notifies the applicant.

**Scope**

- Applicant can submit a correction request from the StatusTracker when their application is in a locked post-review status: `Verified`, `For Assessment`, `Assessed`, `For Payment`, `PaymentProcessing`, `Paid`, or `Completed`.
- Correction is limited to non-financial fields: address (`address_line1`, `barangay`, `city`, `province`, `latitude`, `longitude`), contact number, and name corrections (business name, trade name, owner name spelling).
- Applicant provides: the field to correct, the new value, and optionally uploads proof (e.g., lease contract, billing statement, valid ID).
- BPLO sees a new "Correction Requests" queue/tab, reviews the request with old vs. new values and uploaded proof, and approves or rejects with remarks.
- On approval: system updates the `businesses` and/or `taxpayers` table, logs the change in `audit_logs` with old/new values, re-generates the Business Permit PDF (if already issued), and triggers a `CORRECTION_APPROVED` email + in-app notification to the applicant.
- On rejection: system triggers a `CORRECTION_REJECTED` email + in-app notification with BPLO remarks. Applicant can re-submit a new correction request.
- On submission: system triggers an in-app notification to BPLO officers that a new request is pending.

**Architecture Components**

- **Database**: New `correction_requests` table (migration `042_correction_requests.sql`), new `correction_request_documents` table for proof uploads
- **Backend**: New `correction.routes.js`, `correction.controller.js`, `correction.service.js`
- **Frontend (Applicant)**: Correction request modal/form in [StatusTracker.jsx](file:///c:/projects/eBPLS/ebpls-frontend/src/screens/applicant/StatusTracker.jsx)
- **Frontend (BPLO)**: New `CorrectionQueue.jsx` screen, new tab/link in BPLO navigation
- **Existing Services**: [audit.service.js](file:///c:/projects/eBPLS/ebpls-server/src/services/audit.service.js), [email.service.js](file:///c:/projects/eBPLS/ebpls-server/src/services/email.service.js), [pdf.service.js](file:///c:/projects/eBPLS/ebpls-server/src/services/pdf.service.js), [document.controller.js](file:///c:/projects/eBPLS/ebpls-server/src/controllers/document.controller.js)
- **Auth/RBAC**: Existing `authenticate` and `authorize` middleware

**Dependencies**

- Existing `audit_logs` table and `audit.service.js` (for logging old/new values)
- Existing `notifications` table and notification system (for in-app alerts)
- Existing `email.service.js` (for email dispatch)
- Existing `pdf.service.js` → `generatePermitPDF()` (for permit re-generation)
- Existing Supabase Storage private buckets + pre-signed URL pattern (for proof document uploads)
- Existing `permits` table (to update/invalidate old permit record)

**Major Deliverables**

1. **Database Migration** (`042_correction_requests.sql`):
   - `correction_requests` table:
     - `id` UUID PK
     - `application_no` VARCHAR(20) FK → `applications`
     - `requested_by` UUID FK → `users`
     - `field_name` VARCHAR(100) NOT NULL (e.g., `'address'`, `'contact_number'`, `'business_name'`)
     - `old_value` TEXT NOT NULL
     - `new_value` TEXT NOT NULL
     - `proof_file_path` TEXT (optional uploaded proof)
     - `status` VARCHAR(20) DEFAULT `'Pending'` CHECK IN (`'Pending'`, `'Approved'`, `'Rejected'`)
     - `reviewed_by` UUID FK → `users` (BPLO officer)
     - `remarks` TEXT (BPLO remarks, mandatory on rejection)
     - `reviewed_at` TIMESTAMPTZ
     - `created_at`, `updated_at` TIMESTAMPTZ
   - RLS policies: Applicant can SELECT/INSERT their own; BPLO/Admin can SELECT/UPDATE all.

2. **Backend API Endpoints**:
   - `POST /api/corrections` — Applicant submits a correction request (auth: `Applicant`)
   - `POST /api/corrections/upload` — Applicant requests a pre-signed upload URL for proof document (auth: `Applicant`)
   - `GET /api/corrections/my` — Applicant lists their correction requests (auth: `Applicant`)
   - `GET /api/bplo/corrections/pending` — BPLO lists pending correction requests (auth: `BPLO_Officer`, `Admin`)
   - `GET /api/bplo/corrections/:id` — BPLO views correction request details with old/new values and proof (auth: `BPLO_Officer`, `Admin`)
   - `PUT /api/bplo/corrections/:id/approve` — BPLO approves correction; triggers data update, audit log, permit re-gen, notification (auth: `BPLO_Officer`, `Admin`)
   - `PUT /api/bplo/corrections/:id/reject` — BPLO rejects with mandatory remarks; triggers notification (auth: `BPLO_Officer`, `Admin`)

3. **Zod Validation Schemas** (in [validators.js](file:///c:/projects/eBPLS/ebpls-server/src/utils/validators.js)):
   - `CorrectionRequestSchema`: validates `field_name` (enum of allowed fields), `new_value` (non-empty string), `proof_file_path` (optional string)
   - `CorrectionRejectSchema`: validates `remarks` (non-empty string)

4. **Constants Updates** (in [constants.js](file:///c:/projects/eBPLS/ebpls-server/src/utils/constants.js)):
   - New `CORRECTION_STATUS` enum: `PENDING`, `APPROVED`, `REJECTED`
   - New `CORRECTABLE_FIELDS` allowlist: `['address_line1', 'barangay', 'latitude', 'longitude', 'contact_no', 'business_name', 'trade_name', 'first_name', 'middle_name', 'last_name']`
   - New `AUDIT_ACTIONS`: `CORRECTION_REQUESTED`, `CORRECTION_APPROVED`, `CORRECTION_REJECTED`
   - New `EMAIL_TRIGGERS`: `CORRECTION_APPROVED`, `CORRECTION_REJECTED`

5. **Frontend — Applicant Correction Form**:
   - In [StatusTracker.jsx](file:///c:/projects/eBPLS/ebpls-frontend/src/screens/applicant/StatusTracker.jsx): When status is `Completed`, render a "Request Data Correction" button.
   - Clicking opens a modal with:
     - Dropdown: "What do you need to correct?" (Address, Contact Number, Business Name, Owner Name)
     - Text input: "What is the correct information?"
     - File upload: "Upload Proof (Optional)" using existing pre-signed URL pattern
     - Submit button
   - Below the button, list previous correction requests with their statuses (Pending/Approved/Rejected) and any BPLO remarks.

6. **Frontend — BPLO Correction Queue**:
   - New screen `CorrectionQueue.jsx` in `ebpls-frontend/src/screens/bplo/`
   - Displays pending correction requests in a table: Business Name, Application No, Field to Correct, Requested Date, Status
   - Clicking a request opens a detail view showing:
     - **Old Value** vs **New Value** side-by-side
     - Uploaded proof document (viewable/zoomable, reusing existing document viewer pattern)
     - "Approve" and "Reject" buttons (reject requires remarks textarea)
   - Add navigation link/tab to BPLO layout for "Correction Requests" with a pending count badge

7. **Permit Re-Generation on Approval**:
   - When a correction is approved and the corrected field is address-related or name-related, invalidate the cached permit and re-generate via existing `pdf.service.generatePermitPDF()` with updated data.
   - The existing `GET /api/documents/permit/:app_no` endpoint in [document.controller.js](file:///c:/projects/eBPLS/ebpls-server/src/controllers/document.controller.js) already dynamically generates PDFs from current database state, so the key action is updating the underlying `businesses`/`taxpayers` record.

8. **Notifications**:
   - On correction submission: in-app notification to BPLO officers
   - On approval: `CORRECTION_APPROVED` email + in-app notification to applicant ("Your correction has been approved. Your updated permit is ready for download.")
   - On rejection: `CORRECTION_REJECTED` email + in-app notification to applicant with BPLO remarks

**Acceptance Criteria**

1. An applicant with an application in `Verified`, `For Assessment`, `Assessed`, `For Payment`, `PaymentProcessing`, `Paid`, or `Completed` status can submit a correction request specifying the field, new value, and optional proof document.
2. A BPLO officer can view pending correction requests in a dedicated queue.
3. A BPLO officer can approve a correction, which updates the database record and is logged in `audit_logs` with old/new values.
4. A BPLO officer can reject a correction with mandatory remarks.
5. On approval of an address or name correction, the Business Permit PDF reflects the updated data when re-downloaded by the applicant.
6. The applicant receives email and in-app notification on both approval and rejection.
7. Only non-financial fields (from `CORRECTABLE_FIELDS`) can be corrected through this workflow.
8. All correction actions are fully audited.

**Risks / Notes**

> [!IMPORTANT]
> The permit PDF is generated dynamically from current DB state in `document.controller.js` via `getOrCreatePermit()`. After a correction updates the `businesses` table, the **existing permit record** in the `permits` table must be deleted or marked stale so that `getOrCreatePermit()` re-generates it with the new data on next download. Otherwise, the cached permit with the old address will continue to be served.

> [!NOTE]
> The correction workflow is intentionally scoped to non-financial fields. If an applicant needs to change business activities, capitalization, or gross sales (which affect fee assessment), they must file a new application (e.g., "Additional Line of Business") or contact the municipality directly.

---

### Phase 2 — Barangay Geo-Boundary Validation (OpenStreetMap)

**Objective**

Validate that an applicant's map pin (latitude/longitude) falls within the geographic boundary of their selected barangay using polygon data from the BetterGov GeoJSON file. Show a soft warning to the applicant on mismatch, persist the mismatch flag, and alert BPLO/Barangay officers during review.

**Scope**

- Extract Liliw barangay polygons from the existing BetterGov Philippine barangays GeoJSON file and store as a static data file in the frontend.
- Make the map pin (`latitude`, `longitude`) **mandatory** in the UAF Step 2 form (currently optional).
- On pin drop or barangay selection change, run a client-side point-in-polygon check using Turf.js. If the pin falls outside the selected barangay, display a yellow warning (does NOT block submission).
- On backend submission, validate pin-in-polygon server-side and persist a `location_mismatch` boolean flag on the application.
- In the BPLO `DataReviewPanel.jsx`, display a visual alert if `location_mismatch` is true.
- In the Barangay `ClearanceQueue.jsx`, display the same mismatch alert.

**Architecture Components**

- **Static Data**: New `liliw-barangays.geojson` file extracted/filtered from BetterGov source
- **Frontend**: Modified [InteractiveLocationPin.jsx](file:///c:/projects/eBPLS/ebpls-frontend/src/components/shared/InteractiveLocationPin.jsx), modified [Step2_Location.jsx](file:///c:/projects/eBPLS/ebpls-frontend/src/screens/applicant/uaf-steps/Step2_Location.jsx), modified [UAFWizardScreen.jsx](file:///c:/projects/eBPLS/ebpls-frontend/src/screens/applicant/UAFWizardScreen.jsx), new `@turf/boolean-point-in-polygon` + `@turf/helpers` dependencies
- **Backend**: Modified [validators.js](file:///c:/projects/eBPLS/ebpls-server/src/utils/validators.js), modified [application.service.js](file:///c:/projects/eBPLS/ebpls-server/src/services/application.service.js), new `@turf/boolean-point-in-polygon` + `@turf/helpers` server-side dependencies, new `liliw-barangays.geojson` data file in server
- **Database**: New migration adding `location_mismatch` column to `applications` table
- **BPLO/Barangay Frontend**: Modified [DataReviewPanel.jsx](file:///c:/projects/eBPLS/ebpls-frontend/src/components/bplo/DataReviewPanel.jsx), modified [ClearanceQueue.jsx](file:///c:/projects/eBPLS/ebpls-frontend/src/screens/barangay/ClearanceQueue.jsx)

**Dependencies**

- User-provided BetterGov GeoJSON file with Philippine barangay boundaries
- Existing `InteractiveLocationPin.jsx` (Leaflet map component)
- Existing `Step2_Location.jsx` (address form)
- Existing `DataReviewPanel.jsx` (BPLO review panel with "location" section)
- Existing `ClearanceQueue.jsx` (Barangay officer queue)
- Existing `validators.js` (Zod schemas for UAF submission)

**Major Deliverables**

1. **GeoJSON Data Extraction**:
   - The source file [`barangays.geojson`](file:///c:/projects/eBPLS/barangays.geojson) is already in the project root (66MB, 42,026 PH barangay features, BetterGov/NAMRIA 2023).
   - The file structure: each feature has properties `ADM4_EN` (barangay name), `ADM3_EN` (municipality), `ADM2_EN` (province), and a `geometry` of type `Polygon` or `MultiPolygon`.
   - Write a one-time Node.js extraction script (`scripts/extract-liliw-barangays.js`) that:
     1. Reads `barangays.geojson` from the project root.
     2. Filters features where `ADM3_EN === "Liliw"` AND `ADM2_EN === "Laguna"` (yields the 33 Liliw barangays).
     3. Applies a **name-mapping step** to normalize `ADM4_EN` values to match the exact names in the `barangays` lookup table (e.g., `"Bagong Anyo (Pob.)"` → `"Bagong Anyo (Poblacion)"`, `"Masikap (Pob.)"` → `"Masikap (Poblacion)"`, etc.).
     4. Outputs a lean FeatureCollection with only `name` and `geometry` properties per feature.
   - Store one copy in `ebpls-frontend/src/data/liliw-barangays.geojson` (client-side validation).
   - Store one copy in `ebpls-server/src/data/liliw-barangays.geojson` (server-side validation).
   - The source `barangays.geojson` in the project root is **not** bundled into frontend/server — only the filtered Liliw-only file (~33 features, small KB) is used.

2. **Database Migration** (`043_location_mismatch.sql`):
   - Add `location_mismatch BOOLEAN NOT NULL DEFAULT FALSE` to `applications` table.

3. **Frontend — Make Map Pin Mandatory**:
   - In [UAFWizardScreen.jsx](file:///c:/projects/eBPLS/ebpls-frontend/src/screens/applicant/UAFWizardScreen.jsx) → `validateStep(2)`: Add validation requiring `latitude` and `longitude` to be set. Error message: *"Please pin your business location on the map."*
   - In [Step2_Location.jsx](file:///c:/projects/eBPLS/ebpls-frontend/src/screens/applicant/uaf-steps/Step2_Location.jsx): Add a visual required indicator to the map section header.

4. **Frontend — Client-Side Pin-in-Polygon Check** (Turf.js):
   - Install `@turf/boolean-point-in-polygon` and `@turf/helpers` as frontend dependencies.
   - Create a new utility `ebpls-frontend/src/utils/geoValidation.js`:
     - `checkBarangayMatch(lat, lng, selectedBarangayName)`: Loads `liliw-barangays.geojson`, finds the feature matching `selectedBarangayName`, runs `booleanPointInPolygon(point(lng, lat), feature.geometry)`, returns `{ isMatch: boolean, detectedBarangay: string | null }`.
   - In [Step2_Location.jsx](file:///c:/projects/eBPLS/ebpls-frontend/src/screens/applicant/uaf-steps/Step2_Location.jsx):
     - On pin drop (`handleLocationChange`) or barangay dropdown change: call `checkBarangayMatch()`.
     - If mismatch: display an amber/yellow `AlertTriangle` warning box below the map: *"⚠️ Warning: Your map pin appears to be outside {selectedBarangay}. The system detected it in {detectedBarangay}. Please verify your pin or selected barangay."*
     - If no polygon found for the selected barangay (data gap): show no warning (graceful fallback).
     - Store `location_mismatch` boolean in `formData.step2` Zustand state.
   - The "Next" button is **NOT** blocked by the mismatch warning — applicant can proceed.

5. **Backend — Server-Side Validation & Flag Persistence**:
   - Install `@turf/boolean-point-in-polygon` and `@turf/helpers` as server dependencies.
   - Create `ebpls-server/src/utils/geoValidation.js` mirroring the frontend utility.
   - In [validators.js](file:///c:/projects/eBPLS/ebpls-server/src/utils/validators.js): Change `latitude` and `longitude` from `.optional().nullable()` to required: `z.coerce.number().min(-90).max(90)` and `z.coerce.number().min(-180).max(180)`.
   - In [application.service.js](file:///c:/projects/eBPLS/ebpls-server/src/services/application.service.js) → `submitApplication()`: After validating the payload, call `checkBarangayMatch(latitude, longitude, barangay)` and set `location_mismatch` on the `applications` upsert.

6. **Frontend — BPLO Mismatch Alert in DataReviewPanel**:
   - In [DataReviewPanel.jsx](file:///c:/projects/eBPLS/ebpls-frontend/src/components/bplo/DataReviewPanel.jsx): In the `location` section, if `application.location_mismatch === true`, display a red flag alert:
     > 🚩 **System Alert**: Map pin mismatch detected. The applicant selected **{barangay}** but their pin coordinates appear to fall outside this barangay. Please verify the physical location.

7. **Frontend — Barangay Officer Mismatch Alert in ClearanceQueue**:
   - In [ClearanceQueue.jsx](file:///c:/projects/eBPLS/ebpls-frontend/src/screens/barangay/ClearanceQueue.jsx): In each clearance request row/detail, if `location_mismatch === true`, show the same red flag alert icon and tooltip.

8. **Backend — Return `location_mismatch` in API Responses**:
   - Ensure `GET /api/bplo/applications/:app_no` includes `location_mismatch` in the response payload.
   - Ensure `GET /api/barangay/clearances/pending` includes `location_mismatch` for each clearance item.

**Acceptance Criteria**

1. The BetterGov GeoJSON file is filtered down to a `liliw-barangays.geojson` containing polygon boundaries for all 33 Liliw barangays.
2. The map pin (`latitude`, `longitude`) is mandatory — the applicant cannot proceed past Step 2 without dropping a pin.
3. When an applicant drops a pin outside their selected barangay, a yellow warning appears below the map indicating the mismatch and the detected barangay. The applicant can still proceed.
4. On submission, the backend independently validates the pin-in-polygon match and persists `location_mismatch` on the application record.
5. BPLO officers see a red flag alert in the DataReviewPanel's location section when `location_mismatch` is true.
6. Barangay officers see a mismatch alert in the ClearanceQueue when `location_mismatch` is true.
7. If the GeoJSON data does not contain a polygon for a given barangay name, the system gracefully skips validation (no false warnings, no errors).

**Risks / Notes**

> [!WARNING]
> **Barangay name matching**: The BetterGov GeoJSON likely uses slightly different naming conventions than the 33 names seeded in `030_barangays_lookup.sql` (e.g., `"Bagong Anyo (Poblacion)"` vs `"Bagong Anyo"`). A name-mapping step will be required during data extraction to ensure each GeoJSON feature correctly maps to the system's barangay names.

> [!NOTE]
> **Boundary accuracy**: OpenStreetMap/BetterGov boundaries are approximate, not cadastral-survey-grade. The "soft warning" design intentionally accounts for this — borderline cases are deferred to human judgment by BPLO/Barangay officers.

> [!IMPORTANT]
> **GeoJSON file size**: The full Philippines-wide BetterGov file may be very large. The filtered Liliw-only file should be small (33 polygons), but care should be taken during the extraction script to output a minimal file. The frontend file should be lazy-loaded or imported only in Step2_Location to avoid bloating the initial bundle.

---

## 5. Cross-Phase Concerns

### Security
- All new API endpoints must be protected by existing `authenticate` and `authorize` middleware with appropriate role checks.
- Correction requests must validate that the requesting user owns the application (`taxpayer_id` match).
- The `CORRECTABLE_FIELDS` allowlist must be enforced server-side to prevent unauthorized modifications to financial fields.
- File uploads for correction proofs must use the existing Supabase pre-signed URL pattern (private bucket, 15-minute expiry).

### Data Integrity
- All corrections must be logged in `audit_logs` with `old_value` and `new_value` JSONB snapshots.
- The `location_mismatch` flag must be re-evaluated on every resubmission (not just the initial submission).
- Permit records in the `permits` table must be invalidated/deleted when a correction affecting permit data is approved, forcing re-generation.

### Testing
- Phase 1: Test the full correction lifecycle (submit → review → approve/reject → verify DB update → verify PDF → verify notifications).
- Phase 2: Test pin-in-polygon with pins clearly inside, clearly outside, and on the border of barangay boundaries. Test with barangay names that have parenthetical suffixes (Poblacion variants). Test graceful fallback when a barangay has no polygon data.

### Deployment
- Both phases require database migrations (`042`, `043`) to be run before deploying the corresponding code.
- Phase 2 requires the BetterGov GeoJSON file to be present and the extraction script to be run before deployment.
- Phase 2 requires `npm install` for new Turf.js dependencies in both frontend and backend.

---

## 6. Traceability

| Architecture Component / Requirement | Phase |
|---|---|
| `businesses` table (address fields) | Phase 1, Phase 2 |
| `taxpayers` table (name fields) | Phase 1 |
| `applications` table (status, flags) | Phase 1, Phase 2 |
| `audit_logs` table + `audit.service.js` | Phase 1 |
| `notifications` table + notification system | Phase 1 |
| `email.service.js` (Nodemailer dispatch) | Phase 1 |
| `pdf.service.js` → `generatePermitPDF()` | Phase 1 |
| `document.controller.js` → `getPermitPDF()` | Phase 1 |
| `permits` table (permit invalidation) | Phase 1 |
| `InteractiveLocationPin.jsx` (Leaflet map) | Phase 2 |
| `Step2_Location.jsx` (address form) | Phase 2 |
| `UAFWizardScreen.jsx` → `validateStep()` | Phase 2 |
| `validators.js` → `UAFSubmissionPayloadSchema` | Phase 2 |
| `application.service.js` → `submitApplication()` | Phase 2 |
| `DataReviewPanel.jsx` (BPLO location review) | Phase 2 |
| `ClearanceQueue.jsx` (Barangay officer queue) | Phase 2 |
| `barangays` lookup table (name matching) | Phase 2 |
| RBAC middleware (`authenticate`, `authorize`) | Phase 1, Phase 2 |
| Supabase Storage (pre-signed URLs) | Phase 1 |
