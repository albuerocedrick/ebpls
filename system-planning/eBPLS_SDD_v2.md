# System Design Document

**eBPLS (Electronic Business Permits and Licensing System)**  
BOSS & E-Resibo — Municipality of Liliw

**Version 2.0 — Improved** | May 2025

> ⚠ **Payment Scope Notice**
>
> This system implements Over-The-Counter (OTC) cash and manager's check payments ONLY. Online or electronic payment channels (e-wallets, Landbank ePay, DBP PayConnect, debit/credit cards) are explicitly excluded from this project scope.

**1. Project Overview**

**Project Name: eBPLS (Electronic Business Permits and Licensing System)
— BOSS & E-Resibo Liliw**

Objective: To modernize and automate the workflows for local business
permit processing, integrating Barangay Clearance issuance, and
digitalizing transactional documentation to improve financial
transparency within the Municipality of Liliw.

**Target Audience:**

- Business owners and applicants

- Local Government Unit (LGU) officers

- BPLO (Business Permits and Licensing Office) staff

- Treasury personnel (Assessors and Cashiers)

- System Administrator / IT Department

**1.1 Core Features**

**Apply**

- Unified Application Form (UAF) — multi-step digital wizard

- Integrated Barangay Clearance processing via checkbox

- Interactive business location pinning via Leaflet.js + OpenStreetMap

- Secure document uploading to Supabase Storage

- Draft/Autosave to prevent data loss mid-application

**Pay**

- Automated fee assessment with manual override capability

- Tax Order of Payment (TOP) generation and email delivery

- Over-The-Counter (OTC) payment recording by LGU cashier

*Note: Online/electronic payment channels are out of scope.*

**Claim**

- Official Receipt (E-Resibo) generation

- Business Permit generation — including per-line-of-business printing

- Barangay Business Clearance document generation

- Customizable permit layout via DocumentBuilder

**1.2 Newly Added Features (v2.0)**

- Integrated processing and issuance of Barangay Clearance

- Business Retirement / Cessation processing

- Printing of Business Permits per line of business

- Draft/autosave for UAF wizard

- Email notification system with defined triggers

- Application status state machine with defined transitions

- System audit logging for Data Privacy Act compliance

**2. High-Level Architecture**

Architecture Pattern: Web-Based Client-Server Architecture with
Role-Based Access Control (RBAC).

Data Synchronization: Real-time communication via REST APIs; secure
cloud storage using Pre-Signed URLs.

**2.1 System Flow**

1.  Applicant registers, creates a business profile, and submits the UAF
    via the applicant portal.

2.  The system saves a draft at each step; submission moves the
    application to 'Pending' status.

3.  BPLO reviews uploaded documents using the split-screen verification
    panel and approves or returns the application.

4.  Upon full verification, the application is routed to Treasury for
    fee assessment.

5.  Treasury reviews the auto-calculated fees, overrides if needed, and
    generates the Tax Order of Payment (TOP).

6.  The system emails the TOP to the applicant and sets the status to
    'For Payment'.

7.  The applicant visits the municipal hall and pays Over-The-Counter at
    the cashier's window.

8.  The cashier logs the payment via the POS interface, inputs the O.R.
    number, and confirms.

9.  The system generates the E-Resibo, Business Permit(s), and Barangay
    Clearance for download.

10. The applicant receives an email notification that documents are
    ready for download or physical claiming.

**2.2 Payment Scope Boundary**

> 🏦 **OTC-Only Payment Policy**
>
> The system supports only Over-The-Counter payment. The cashier logs payments manually via the POS interface. The transactions table records Cash or Manager Check only. No payment gateway integration (Landbank, DBP, GCash, credit/debit cards) is included in this project.

**3. Technology Stack**

| **Layer**        | **Technology**                        | **Purpose**                                        |
|------------------|---------------------------------------|----------------------------------------------------|
| Frontend         | React.js + Tailwind CSS               | Web application UI                                 |
| Backend / API    | Node.js + Express.js                  | Controller / middleware layer                      |
| Database         | PostgreSQL via Supabase               | Primary cloud database                             |
| File Storage     | Supabase Storage                      | Private document buckets with RLS                  |
| State Management | Zustand                               | Client-side global state                           |
| Auth Tokens      | Browser LocalStorage / SessionStorage | JWT token persistence                              |
| Location         | Leaflet.js + OpenStreetMap            | Business location pin on map (no API key required) |
| Email            | Nodemailer (Gmail SMTP) or Brevo      | Transactional email notifications                  |
| PDF Generation   | pdf-lib                               | Permit, E-Resibo, TOP document rendering           |

**4. Master Database Schema (Normalized 3NF)**

All UUIDs are generated server-side. Timestamps default to NOW(). Enums
are enforced at the database level.

**4.1 Authentication & Authorization**

| **Column** | **Type** | **Constraint** | **Description**                                            |
|------------|----------|----------------|------------------------------------------------------------|
| role_id    | INT      | PK             | Unique role identifier                                     |
| role_name  | VARCHAR  | NOT NULL       | Applicant, BPLO_Officer, Treasury, Barangay_Officer, Admin |

**Table: users**

| **Column**    | **Type**  | **Constraint**   | **Description**                   |
|---------------|-----------|------------------|-----------------------------------|
| user_id       | UUID      | PK               |                                   |
| email         | VARCHAR   | UNIQUE, NOT NULL | Login credential                  |
| password_hash | VARCHAR   | NOT NULL         | bcrypt hashed                     |
| role_id       | INT       | FK → roles       |                                   |
| is_active     | BOOLEAN   | DEFAULT true     | For account deactivation by Admin |
| created_at    | TIMESTAMP | DEFAULT NOW()    |                                   |

**4.2 Taxpayer & Business Profiles**

**Table: taxpayers**

| **Column**                            | **Type**        | **Description** |
|---------------------------------------|-----------------|-----------------|
| taxpayer_id                           | UUID PK         |                 |
| user_id                               | UUID FK → users | UNIQUE          |
| tin_no                                | VARCHAR         | UNIQUE          |
| first_name / middle_name / last_name  | VARCHAR         |                 |
| house_no_street / barangay / zip_code | VARCHAR         |                 |
| mobile_no / tel_no / email_address    | VARCHAR         |                 |

**Table: businesses**

| **Column**                            | **Type**                    | **Description**                           |
|---------------------------------------|-----------------------------|-------------------------------------------|
| business_id                           | UUID PK                     |                                           |
| taxpayer_id                           | UUID FK → taxpayers         |                                           |
| org_type_id                           | INT FK → organization_types |                                           |
| business_name / trade_name_franchise  | VARCHAR                     |                                           |
| dti_sec_cda_reg_no                    | VARCHAR                     | UNIQUE                                    |
| date_of_registration                  | DATE                        |                                           |
| property_pin / area_sqm               | VARCHAR / DECIMAL           |                                           |
| house_no_street / barangay / zip_code | VARCHAR                     |                                           |
| is_retired                            | BOOLEAN                     | DEFAULT false — used by Retirement module |
| retirement_date                       | DATE                        | NULL until retired                        |

**4.3 Applications, Drafts & Operations**

**Table: application_drafts (NEW)**

Saves multi-step UAF progress so applicants do not lose data if the
browser is closed.

| **Column**    | **Type**            | **Description**               |
|---------------|---------------------|-------------------------------|
| draft_id      | UUID PK             |                               |
| taxpayer_id   | UUID FK → taxpayers |                               |
| current_step  | INT                 | 1–5 tracking wizard progress  |
| form_data     | JSONB               | Serialized partial form state |
| last_saved_at | TIMESTAMP           | Auto-updated on each save     |

**Table: applications**

| **Column**              | **Type**                   | **Description**                                 |
|-------------------------|----------------------------|-------------------------------------------------|
| application_no          | VARCHAR PK                 | System-generated reference number               |
| business_id             | UUID FK → businesses       |                                                 |
| app_type_id             | INT FK → application_types | New / Renewal / Retirement                      |
| payment_mode_id         | INT FK → payment_modes     | Annual / Quarterly                              |
| previous_application_no | VARCHAR FK → applications  | NULL for New; links to prior record for Renewal |
| application_date        | TIMESTAMP                  |                                                 |
| status                  | VARCHAR                    | See Section 5 — Application State Machine       |
| remarks                 | TEXT                       | BPLO/Treasury officer notes                     |

**4.4 Barangay Clearance Module (NEW)**

*The system now supports integrated issuance of the Barangay Business
Clearance.*

| **Column**        | **Type**                  | **Description**                  |
|-------------------|---------------------------|----------------------------------|
| brgy_clearance_id | UUID PK                   |                                  |
| application_no    | VARCHAR FK → applications | UNIQUE per application           |
| barangay_name     | VARCHAR                   | Issuing barangay                 |
| issued_by_user_id | UUID FK → users           | Barangay Officer role            |
| issue_date        | DATE                      |                                  |
| expiration_date   | DATE                      | Typically 1 year from issue      |
| clearance_number  | VARCHAR                   | UNIQUE official clearance number |
| status            | ENUM                      | 'Pending', 'Issued', 'Rejected'  |

**4.5 Verifications & Clearances**

**Table: doc_verifications**

| **Column**          | **Type**                  | **Description**                                  |
|---------------------|---------------------------|--------------------------------------------------|
| verification_id     | UUID PK                   |                                                  |
| application_no      | VARCHAR FK → applications |                                                  |
| clearance_type_id   | INT FK → clearance_types  | Brgy, Sanitary, Fire, Zoning, etc.               |
| status              | ENUM                      | 'Yes', 'No', 'Not Needed', 'Awaiting Issuance'   |
| verified_by_user_id | UUID FK → users           |                                                  |
| verified_at         | TIMESTAMP                 |                                                  |
| remarks             | TEXT                      | Required when status = 'No'                      |

**Table: application_data_reviews (NEW)**

| **Column**          | **Type**                  | **Description**                                                       |
|---------------------|---------------------------|-----------------------------------------------------------------------|
| review_id           | UUID PK                   |                                                                       |
| application_no      | VARCHAR FK → applications |                                                                       |
| section             | VARCHAR                   | e.g., business_details, location, activities, financials              |
| status              | ENUM                      | 'Verified', 'Discrepancy'                                             |
| remarks             | TEXT                      | Required if Discrepancy                                               |
| reviewed_by_user_id | UUID FK → users           |                                                                       |
| reviewed_at         | TIMESTAMP                 |                                                                       |

**4.6 Treasury & Billing**

**Table: transactions (OTC Only)**

| **Column**          | **Type**              | **Description**                    |
|---------------------|-----------------------|------------------------------------|
| transaction_id      | UUID PK               |                                    |
| assessment_id       | UUID FK → assessments |                                    |
| or_number           | VARCHAR               | UNIQUE — official receipt number   |
| tendered_type       | ENUM                  | 'Cash', 'Manager Check' — OTC only |
| amount_tendered     | DECIMAL               | Total amount physically received   |
| amount_paid         | DECIMAL               | Matched to assessment total        |
| change_given        | DECIMAL               | amount_tendered minus amount_paid  |
| payment_date        | TIMESTAMP             |                                    |
| recorded_by_user_id | UUID FK → users       | Cashier who logged the payment     |
| status              | ENUM                  | 'Pending', 'Success'               |

**4.7 Business Retirement Module (NEW)**

**Table: retirement_applications**

| **Column**           | **Type**                  | **Description**                            |
|----------------------|---------------------------|--------------------------------------------|
| retirement_id        | UUID PK                   |                                            |
| application_no       | VARCHAR FK → applications | app_type = 'Retirement'                    |
| retirement_reason    | TEXT                      | Applicant-provided reason                  |
| cessation_date       | DATE                      | Actual date business operations stopped    |
| final_gross_sales    | DECIMAL                   | Used for final tax computation             |
| status               | ENUM                      | 'Pending', 'Assessed', 'Paid', 'Completed' |
| processed_by_user_id | UUID FK → users           |                                            |
| completed_at         | TIMESTAMP                 |                                            |

**4.8 Audit Logging (NEW)**

*Required for Data Privacy Act of 2012 compliance. Records every
significant system action.*

| **Column**  | **Type**        | **Description**                                                 |
|-------------|-----------------|-----------------------------------------------------------------|
| log_id      | UUID PK         |                                                                 |
| user_id     | UUID FK → users | Actor who performed the action                                  |
| action      | VARCHAR         | e.g., APPLICATION_SUBMITTED, PAYMENT_RECORDED, PERMIT_GENERATED |
| entity_type | VARCHAR         | e.g., application, transaction, user                            |
| entity_id   | VARCHAR         | The affected record's primary key                               |
| old_value   | JSONB           | Snapshot before change (NULL for inserts)                       |
| new_value   | JSONB           | Snapshot after change (NULL for deletes)                        |
| ip_address  | VARCHAR         | Client IP at time of action                                     |
| created_at  | TIMESTAMP       | DEFAULT NOW()                                                   |

**4.9 Email Notifications (NEW)**

**Table: email_notifications**

| **Column**      | **Type**                  | **Description**                        |
|-----------------|---------------------------|----------------------------------------|
| notification_id | UUID PK                   |                                        |
| user_id         | UUID FK → users           | Recipient                              |
| application_no  | VARCHAR FK → applications | Context reference                      |
| trigger_event   | VARCHAR                   | See Email Trigger Table in Section 7.5 |
| subject         | VARCHAR                   |                                        |
| body_html       | TEXT                      |                                        |
| sent_at         | TIMESTAMP                 | NULL if not yet sent                   |
| status          | ENUM                      | 'Queued', 'Sent', 'Failed'             |

**5. Application Status State Machine**

The following table defines every valid status transition. No module may
skip a step.

| **Status**     | **Set By Role**  | **Trigger Condition**                         | **Next Allowed Status**      |
|----------------|------------------|-----------------------------------------------|------------------------------|
| Draft          | Applicant        | UAF wizard autosave                           | Pending                      |
| Pending        | Applicant        | Final UAF submission                          | Under Review / Returned      |
| Under Review   | BPLO Officer     | BPLO opens the application                    | Verified / Returned          |
| Returned       | BPLO Officer     | Mandatory document missing or incorrect       | Pending (after resubmission) |
| Verified       | BPLO Officer     | All doc_verifications = 'Yes' or 'Not Needed' AND all application_data_reviews = 'Verified'. If brgy_clearances exists, must be 'Issued' | For Assessment               |
| For Assessment | System (auto)    | Set on Verified transition                    | Assessed                     |
| Assessed       | Treasury Officer | TOP generated and finalized                   | For Payment                  |
| For Payment    | System (auto)    | Set on TOP generation                         | Paid                         |
| Paid           | Treasury Cashier | OTC payment recorded with valid OR number     | Completed                    |
| Completed      | System (auto)    | Permit and E-Resibo generated                 | —                            |
| Retired        | BPLO / Admin     | Retirement application completed              | — (terminal)                 |

> 🔒 **Enforcement Rule**
>
> The backend MUST reject any status update that does not follow the transitions above. For example, a Treasury Officer cannot set a status from 'Pending' directly to 'Assessed' without passing through 'Verified'. All violations are logged in the audit_logs table.

**6. Module Breakdown**

**Module A: Applicant Module (Apply)**

Replaces the physical UAF with a digital multi-step wizard with
autosave.

*Rule: If the applicant ticks the Barangay Clearance checkbox, the system creates a brgy_clearances record with status 'Pending' AND creates a corresponding doc_verifications record for the Barangay clearance type with status 'Awaiting Issuance'.*

**Database Tables:**

- applications, application_drafts, application_types, payment_modes,
  business_operations, business_activities

**API Endpoints:**

| **Method** | **Endpoint**                          | **Description**                                     |
|------------|---------------------------------------|-----------------------------------------------------|
| POST       | /api/applications/drafts              | Create or update a draft (autosave)                 |
| GET        | /api/applications/drafts/:taxpayer_id | Retrieve saved draft for resume                     |
| DELETE     | /api/applications/drafts/:draft_id    | Delete draft on successful submission               |
| POST       | /api/applications/uaf                 | Final submission of UAF; creates application record |
| POST       | /api/applications/upload              | Secure upload to Supabase Storage                   |
| GET        | /api/applications/:app_no/status      | Applicant polls current status                      |

**Frontend Components:**

- UAFWizardScreen — 5-step form with progress bar; autosaves on every
  step transition

- DraftResumePrompt — Modal on login that detects a saved draft and
  offers to resume

- InteractiveLocationPin — Leaflet.js + OpenStreetMap component for
  business location (free, no API key)

- DocumentUploadPanel — Large tap-targets with thumbnail preview
  (mobile-first)

**Module B: BPLO Module (Verify & Process)**

Handles document verification and cross-checks business details (declared business name vs. DTI/SEC registration, declared capitalization/gross sales vs. submitted financials, business location vs. municipal jurisdiction and zoning, business activities vs. BIR COR or DTI permit). Routes applications to Treasury upon full approval.

**API Endpoints:**

| **Method** | **Endpoint**                          | **Description**                                       |
|------------|---------------------------------------|-------------------------------------------------------|
| GET        | /api/bplo/applications/pending        | Queue of applications awaiting review                 |
| GET        | /api/bplo/applications/:app_no        | Full application detail with pre-signed document URLs |
| PUT        | /api/bplo/applications/verify/:app_no | Update verification checklist; triggers status change |
| PUT        | /api/bplo/applications/review/:app_no | Flag data discrepancies per section with remarks      |
| PUT        | /api/bplo/applications/return/:app_no | Return application with mandatory remarks             |

**Enforcement Logic:**

- An application CANNOT transition to 'Verified' if any clearance_type
  marked as required has status 'No'.

- Returning an application REQUIRES a non-empty remarks field.

- A 'Returned' notification email is automatically triggered.

**Module C: Treasury Module (Assess & Pay — OTC Only)**

Automates fee calculation, generates the TOP, and provides a POS
interface for OTC payment logging.

**API Endpoints:**

| **Method** | **Endpoint**                      | **Description**                                           |
|------------|-----------------------------------|-----------------------------------------------------------|
| POST       | /api/treasury/assess              | Calculate fees; generate assessment and TOP               |
| PUT        | /api/treasury/assess/:id/override | Allow Treasury officer to override a line item            |
| GET        | /api/documents/top/:app_no        | Generate downloadable TOP PDF                             |
| POST       | /api/treasury/payments/otc        | Record OTC payment with OR number (Cash or Manager Check) |

**Fee Calculation Rules:**

- Mayor's Permit Fee and other LGU fees: computed from gross sales or
  capitalization per the local revenue code.

- Fire Safety Inspection Fee: automatically set to 10% of all applicable
  LGU fees.

- Quarterly payment mode: computed as 25% of the annual total per
  quarter.

- All overrides by the Treasury officer are logged in audit_logs.

**Module D: Barangay Clearance Module (NEW)**

*Handles the integrated processing and issuance of the Barangay Business
Clearance when the applicant ticks the checkbox on the UAF.*

*Rule: When a Barangay Officer calls PUT /api/barangay/clearances/:id/issue, the system automatically updates the corresponding doc_verifications record for that application's Barangay clearance type to 'Yes'. When they call PUT /api/barangay/clearances/:id/reject, it updates to 'No'.*

**API Endpoints:**

| **Method** | **Endpoint**                          | **Description**                                     |
|------------|---------------------------------------|-----------------------------------------------------|
| GET        | /api/barangay/clearances/pending      | Clearance requests awaiting Barangay Officer review |
| PUT        | /api/barangay/clearances/:id/issue    | Barangay Officer marks clearance as issued          |
| PUT        | /api/barangay/clearances/:id/reject   | Barangay Officer rejects with remarks               |
| GET        | /api/documents/barangay-clearance/:id | Generate downloadable Barangay Clearance PDF        |

**Module E: Business Retirement Module (NEW)**

Processes the formal cessation/retirement of a registered business.

**API Endpoints:**

| **Method** | **Endpoint**                  | **Description**                                              |
|------------|-------------------------------|--------------------------------------------------------------|
| POST       | /api/retirements/submit       | Applicant submits retirement request with cessation date     |
| GET        | /api/retirements/pending      | BPLO/Treasury queue of pending retirements                   |
| POST       | /api/retirements/:id/assess   | Treasury computes final taxes based on final gross sales     |
| POST       | /api/treasury/payments/otc    | Reuses OTC payment endpoint for retirement settlement        |
| PUT        | /api/retirements/:id/complete | Marks business as retired; sets businesses.is_retired = true |

**Module F: Reporting & Customization (Claim)**

Generates and distributes finalized digital documents to applicants.

**API Endpoints:**

| **Method** | **Endpoint**                                   | **Description**                                 |
|------------|------------------------------------------------|-------------------------------------------------|
| GET        | /api/documents/permit/:app_no                  | Generate Business Permit PDF(s)                 |
| GET        | /api/documents/permit/:app_no?lob=:activity_id | Generate permit for a specific line of business |
| GET        | /api/documents/eresibo/:transaction_id         | Generate Official Receipt (E-Resibo) PDF        |
| GET        | /api/documents/top/:app_no                     | Generate Tax Order of Payment PDF               |
| GET        | /api/documents/barangay-clearance/:id          | Generate Barangay Business Clearance PDF        |

**Per-Line-of-Business Permit Logic:**

- Each row in business_activities can generate a separate permit
  certificate.

- The permits table stores one master permit record; permit_line_items
  links to each business_activity row.

- The DocumentBuilder admin tool supports both unified and per-LOB
  layout templates.

**7. Email Notification System**

All notifications use Nodemailer via Gmail SMTP or Brevo. The following
events trigger automated emails:

| **Trigger Event**             | **Recipient** | **Subject / Content**                                                 |
|-------------------------------|---------------|-----------------------------------------------------------------------|
| APPLICATION_SUBMITTED         | Applicant     | Confirmation that UAF was received; includes application number       |
| BARANGAY_CLEARANCE_REJECTED   | Applicant     | Barangay Officer rejected the clearance; includes rejection remarks   |
| APPLICATION_RETURNED  | Applicant     | BPLO returned the application; includes remarks and resubmission link |
| APPLICATION_VERIFIED  | Applicant     | Application passed BPLO review; awaiting fee assessment               |
| TOP_GENERATED         | Applicant     | Tax Order of Payment ready; PDF attached; OTC payment instructions    |
| PAYMENT_RECORDED      | Applicant     | Payment confirmed; E-Resibo number; document download link            |
| PERMIT_READY          | Applicant     | Business Permit and documents ready for download or physical claiming |
| RETIREMENT_COMPLETE   | Applicant     | Business retirement processed; final receipt attached                 |
| ACCOUNT_CREATED       | New User      | Welcome email with account activation link                            |
| PASSWORD_RESET        | Any User      | Password reset link (expires 1 hour)                                  |

**8. Roles and Access Control (RBAC)**

| **Role**         | **Module Access** | **Key Permissions**                                                                   | **Restrictions**                                              |
|------------------|-------------------|---------------------------------------------------------------------------------------|---------------------------------------------------------------|
| Applicant        | A, F (Partial C)  | Submit UAF, upload docs, view status, download own documents                          | Cannot view other applicants' data; cannot verify or assess   |
| BPLO Officer     | B (Read A)        | Verify documents, approve/return applications, add remarks                            | Cannot modify profiles; cannot assess fees or record payments |
| Treasury Officer | C (Read A, B)     | Assess fees, override line items, generate TOP, record OTC payment, issue E-Resibo    | Cannot approve/deny regulatory clearances                     |
| Barangay Officer | D                 | Issue or reject Barangay Clearance, view clearance queue                              | Cannot access other modules                                   |
| System Admin     | All               | Manage users/roles, update lookup tables, customize document layouts, view audit logs | Should not process live applications or payments directly     |

**9. User Interface (UI) & User Experience (UX) Guidelines**

**9.1 Applicant Interface — Mobile-First**

- Applicant Dashboard: Welcoming screen with 'Quick Action' buttons and
  an application list with status badges (Yellow = Pending, Blue = Under
  Review, Orange = Returned, Green = Completed).

- UAF Wizard: Progress bar pinned to top; fields in card containers;
  autosave indicator showing 'Saved just now'.

- Draft Resume Prompt: On login, if a saved draft exists, display a
  modal offering to 'Continue Application' or 'Start New'.

- Document Upload: Large clickable areas for camera/gallery access;
  instant thumbnail on success.

- Payment & Claiming Screen: Displays the total due, a 'Download TOP'
  button, and OTC payment instructions. Transitions to show permit and
  E-Resibo download buttons after payment is recorded.

**9.2 BPLO Officer Interface — Desktop-First**

- BPLO Dashboard: Sortable data table with SLA urgency indicators (days
  since submission).

- Split-Screen Verification Panel: Left pane shows the uploaded document
  with zoom; right pane has the checklist (Yes/No/Not Needed) with a
  sticky footer for final Approve/Return action.

- Returned Applications: Remarks field is mandatory; character count
  shown. Cannot submit without remarks.

**9.3 Treasury Officer Interface — Desktop POS-Like**

- Assessment Grid: Spreadsheet-style view of Base Rates, Multipliers,
  and Calculated Totals. Overridable fields highlighted in yellow.
  Floating bar shows the Grand Total updating in real-time.

- Cashier POS Panel: High-contrast, large-typography interface. Inputs
  for Amount Tendered, Cash/Check selector, and O.R. Number. Giant
  'Confirm Payment' button. Displays change amount automatically.

**9.4 System Administrator Interface — Utilitarian**

- Admin Dashboard: System health metrics, active users, and error rate
  indicators.

- Master Data Configuration: List-and-form interfaces for fee types,
  clearance types, and organization types.

- Document Builder: Visual workspace to upload blank PDF templates and
  map {{placeholder}} tags to database fields.

- Audit Log Viewer: Filterable by user, action type, date range, and
  entity type.

**10. Non-Functional Requirements**

| **Requirement**    | **Specification**                                                                                                                   |
|--------------------|-------------------------------------------------------------------------------------------------------------------------------------|
| Performance        | Must handle concurrent renewal traffic spikes in January without latency degradation. Target: \< 2s API response under normal load. |
| Security — Auth    | All passwords hashed with bcrypt (min cost factor 12). JWT tokens for API authentication with 24-hour expiry.                       |
| Security — Data    | Supabase Row Level Security (RLS) enforced on all tables. Pre-signed URLs for document access (15-minute expiry).                   |
| Privacy Compliance | Adherence to Data Privacy Act of 2012. All PII access logged in audit_logs. Admin can generate access reports.                      |
| Payment            | OTC ONLY. No payment gateway. tendered_type is restricted to 'Cash' and 'Manager Check' at the database level.                      |
| Usability          | Applicant portal must be fully mobile-responsive. UAF must be completable on a smartphone including document camera upload.         |
| Availability       | Target 99.5% uptime. Supabase managed PostgreSQL handles backups. Graceful error messages on downtime.                              |
| Audit Trail        | Every data mutation logged in audit_logs with user_id, timestamp, old value, and new value.                                         |

**11. Development Environment & Tooling**

| **Tool**               | **Purpose**                            |
|------------------------|----------------------------------------|
| VS Code                | Primary IDE                            |
| Prettier (.prettierrc) | Code formatting                        |
| ESLint                 | Code linting                           |
| GitHub (Git Flow)      | Version control and branching strategy |
| Supabase CLI           | Local DB development and migrations    |

**11.1 Frontend Project Structure**

| **Path**        | **Contents**                                                       |
|-----------------|--------------------------------------------------------------------|
| /src/components | Reusable UI — Buttons, Inputs, Map, Badges                         |
| /src/screens    | Main views per module (UAFWizard, BPLODashboard, CashierPOS, etc.) |
| /src/store      | Zustand state slices (auth, application, notifications)            |
| /src/utils      | Tax calculation helpers, date formatters, PDF builders             |
| /src/hooks      | Custom hooks (useAutosave, useApplicationStatus, useNotifications) |

**12. Project Scope & Explicit Exclusions**

**12.1 In Scope**

- OTC payment recording only (Cash and Manager Check)

- UAF submission with integrated Barangay Clearance processing

- BPLO document verification workflow

- Treasury fee assessment and TOP generation

- Business Retirement / Cessation module

- E-Resibo (Official Receipt) generation

- Business Permit generation including per-line-of-business printing

- Email notification system (transactional events only)

- System audit logging

- Admin document layout customization (DocumentBuilder)

**12.2 Explicitly Out of Scope**

> 🚫 **Excluded Features — Do Not Implement**
>
> 1. Online payment gateways (Landbank ePay, DBP PayConnect, GCash, PayMaya, credit/debit cards, e-wallets)
> 2. Legacy system data migration from existing paper or legacy digital records
> 3. Integration with national-level databases (BIR, DTI, SEC national portals)
> 4. SMS notification system
> 5. Mobile native app (iOS/Android) — web-only
> 6. Multi-LGU or federated deployment

***End of Document***

*eBPLS SDD v2.0 — Municipality of Liliw*