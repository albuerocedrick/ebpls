# System Design Document

**eBPLS (Electronic Business Permits and Licensing System)**
BOSS & E-Resibo — Municipality of Liliw

**Version 4.0** | Updated to align with current codebase (Migrations 019-033)

> **What changed in v4.0**
> 1. Payment modes (Annually, Bi-Annually, Quarterly) have been completely removed.
> 2. Added "Owner's Valid ID" (Back-to-back) to requirement types.
> 3. Added `fixed_amount` to `fee_types`.
> 4. Added Admin module setup, health check RPCs, and system settings lookup.
> 5. Added logic to reset clearance status on application resubmission.
>
> **What changed in v3.0**
> PayMongo online payment has been added as an optional payment channel alongside the existing OTC flow. The `transactions` table has been extended, a new `payment_gateway_logs` audit table has been added, and the application state machine now includes a `PaymentProcessing` intermediate state for the online path. All OTC logic is unchanged.

---

## 1. Project Overview

**Project Name:** eBPLS (Electronic Business Permits and Licensing System) — BOSS & E-Resibo Liliw

**Objective:** To modernize and automate the workflows for local business permit processing, integrating Barangay Clearance issuance, and digitalizing transactional documentation — including online payment via PayMongo — to improve financial transparency and citizen convenience within the Municipality of Liliw.

**Target Audience:**
- Business owners and applicants
- Local Government Unit (LGU) officers
- BPLO (Business Permits and Licensing Office) staff
- Treasury personnel (Assessors and Cashiers)
- System Administrator / IT Department

### 1.1 Core Features

**Apply**
- Unified Application Form (UAF) — multi-step digital wizard
- Integrated Barangay Clearance processing via checkbox
- Interactive business location pinning via Leaflet.js + OpenStreetMap
- Secure document uploading to Supabase Storage
- Draft/Autosave to prevent data loss mid-application

**Pay**
- Automated fee assessment with manual override capability
- Tax Order of Payment (TOP) generation and email delivery
- **Over-The-Counter (OTC) payment** recording by LGU cashier (Cash / Manager Check)
- **Online payment via PayMongo** — optional channel for GCash, Card, and Payment Links
- Both payment channels produce the same outcome: Permit + E-Resibo generation

**Claim**
- Official Receipt (E-Resibo) generation
- Business Permit generation — including per-line-of-business printing
- Barangay Business Clearance document generation
- Customizable permit layout via DocumentBuilder

### 1.2 Features Added in v2.0

- Integrated processing and issuance of Barangay Clearance
- Business Retirement / Cessation processing
- Printing of Business Permits per line of business
- Draft/autosave for UAF wizard
- Email notification system with defined triggers
- Application status state machine with defined transitions
- System audit logging for Data Privacy Act compliance

### 1.3 Features Added in v3.0

- **PayMongo online payment** — optional channel alongside OTC
- `PaymentProcessing` intermediate application state (online path only)
- `payment_gateway_logs` table for webhook audit and idempotency
- Extended `transactions` table (`GCash`, `Card`, `Online` tendered types; PayMongo reference columns)
- Webhook endpoint with HMAC-SHA256 signature verification
- Polling UI in Applicant Status Tracker for async payment confirmation

---

## 2. High-Level Architecture

**Architecture Pattern:** Web-Based Client-Server Architecture with Role-Based Access Control (RBAC)

**Data Synchronization:** Real-time communication via REST APIs; secure cloud storage using Pre-Signed URLs; asynchronous webhook callbacks for online payment confirmation.

### 2.1 System Flow

1. Applicant registers, creates a business profile, and submits the UAF via the applicant portal.
2. The system saves a draft at each step; submission moves the application to `Pending` status.
3. BPLO reviews uploaded documents using the split-screen verification panel and approves or returns the application.
4. Upon full verification, the application is routed to Treasury for fee assessment.
5. Treasury reviews the auto-calculated fees, overrides if needed, and generates the Tax Order of Payment (TOP).
6. The system emails the TOP to the applicant and sets the status to `ForPayment`.
7. **Payment — two paths (applicant chooses):**
   - **OTC Path:** Applicant visits the municipal hall and pays at the cashier's window. Cashier logs payment via the POS interface with OR number. Status transitions directly to `Paid`.
   - **Online Path:** Applicant clicks "Pay Online via PayMongo" in the Status Tracker. System creates a Payment Intent, transitions status to `PaymentProcessing`, and redirects applicant to PayMongo checkout. PayMongo fires a `payment.paid` webhook upon success. Webhook handler verifies signature, checks idempotency, records payment, and transitions status to `Paid`.
8. The system generates the E-Resibo, Business Permit(s), and Barangay Clearance for download.
9. The applicant receives an email notification that documents are ready.

### 2.2 Payment Channels

| Channel | Initiated By | Path | OR Number Format |
|---|---|---|---|
| Cash (OTC) | Treasury Cashier | ForPayment → Paid | Cashier-issued (manual entry) |
| Manager Check (OTC) | Treasury Cashier | ForPayment → Paid | Cashier-issued (manual entry) |
| GCash (Online) | Applicant | ForPayment → PaymentProcessing → Paid | `PM-{YYYYMMDD}-{6-digit-seq}` |
| Card (Online) | Applicant | ForPayment → PaymentProcessing → Paid | `PM-{YYYYMMDD}-{6-digit-seq}` |
| PayMongo Link (Online) | Applicant | ForPayment → PaymentProcessing → Paid | `PM-{YYYYMMDD}-{6-digit-seq}` |

> **Note:** The Retirement flow (Module E) uses OTC only. Online payment is not available for retirement settlements.

---

## 3. Technology Stack

| Layer | Technology | Purpose |
|---|---|---|
| Frontend | React.js + Tailwind CSS | Web application UI |
| Backend / API | Node.js + Express.js | Controller / middleware layer |
| Database | PostgreSQL via Supabase | Primary cloud database |
| File Storage | Supabase Storage | Private document buckets with RLS |
| State Management | Zustand | Client-side global state |
| Auth Tokens | Browser LocalStorage / SessionStorage | JWT token persistence |
| Location | Leaflet.js + OpenStreetMap | Business location pinning (no API key required) |
| Email | Nodemailer (Gmail SMTP) or Brevo | Transactional email notifications |
| PDF Generation | pdf-lib | Permit, E-Resibo, TOP document rendering |
| **Payment Gateway** | **PayMongo** | **Online GCash / Card / Payment Link processing** |

---

## 4. Master Database Schema (Normalized 3NF)

All UUIDs are generated server-side. Timestamps default to NOW(). Enums are enforced at the database level.

> **This section reflects the authoritative schema including all migrations through `033_remove_payment_modes.sql`.**

### 4.1 Authentication & Authorization

**Table: roles**

| Column | Type | Constraint | Description |
|---|---|---|---|
| role_id | INT | PK | Unique role identifier |
| role_name | VARCHAR | NOT NULL | Applicant, BPLO_Officer, Treasury_Officer, Barangay_Officer, Admin |

**Table: users**

| Column | Type | Constraint | Description |
|---|---|---|---|
| user_id | UUID | PK | Supabase Auth UID |
| email | VARCHAR | UNIQUE, NOT NULL | Login credential |
| role_id | INT | FK → roles | Default: 1 (Applicant) |
| is_active | BOOLEAN | DEFAULT true | For account deactivation by Admin |
| created_at | TIMESTAMP | DEFAULT NOW() | |

### 4.2 Taxpayer & Business Profiles

**Table: taxpayers**

| Column | Type | Constraint | Description |
|---|---|---|---|
| taxpayer_id | UUID | PK | gen_random_uuid() |
| user_id | UUID | FK → users | 1:1 with users |
| tin_no | VARCHAR | | Optional TIN |
| first_name | VARCHAR | NOT NULL | |
| middle_name | VARCHAR | | |
| last_name | VARCHAR | NOT NULL | |
| suffix | VARCHAR | | |
| contact_no | VARCHAR | | |
| address_line1 | VARCHAR | | |
| barangay | VARCHAR | | |
| city | VARCHAR | DEFAULT 'Liliw' | |
| province | VARCHAR | DEFAULT 'Laguna' | |
| created_at | TIMESTAMP | DEFAULT NOW() | |
| updated_at | TIMESTAMP | DEFAULT NOW() | Auto-updated via trigger |

**Table: businesses**

| Column | Type | Constraint | Description |
|---|---|---|---|
| business_id | UUID | PK | gen_random_uuid() |
| taxpayer_id | UUID | FK → taxpayers | |
| business_name | VARCHAR | NOT NULL | |
| trade_name | VARCHAR | | |
| org_type_id | INT | FK → organization_types | |
| dti_sec_cda_reg_no | VARCHAR | | |
| is_franchise | BOOLEAN | DEFAULT false | |
| franchisor_name | VARCHAR | | |
| address_line1 | VARCHAR | | |
| barangay | VARCHAR | | |
| city | VARCHAR | DEFAULT 'Liliw' | |
| province | VARCHAR | DEFAULT 'Laguna' | |
| latitude | NUMERIC | | |
| longitude | NUMERIC | | |
| is_retired | BOOLEAN | DEFAULT false | |
| retired_at | TIMESTAMP | | |
| created_at | TIMESTAMP | DEFAULT NOW() | |
| updated_at | TIMESTAMP | DEFAULT NOW() | Auto-updated via trigger |

**Table: organization_types**

| Column | Type | Description |
|---|---|---|
| id | INT | PK |
| name | VARCHAR | Sole Proprietorship, Partnership, Corporation, Cooperative, NGO, GOCC |

### 4.3 Applications

**Table: applications**

| Column | Type | Constraint | Description |
|---|---|---|---|
| application_no | VARCHAR | PK | System-generated |
| business_id | UUID | FK → businesses | |
| type_id | INT | FK → application_types | New / Renewal / Additional LOB |
| status | ENUM (application_status) | NOT NULL | See state machine |
| last_updated_by | UUID | FK → users | |
| return_remarks | TEXT | | BPLO return remarks |
| submitted_at | TIMESTAMP | | |
| created_at | TIMESTAMP | DEFAULT NOW() | |
| updated_at | TIMESTAMP | DEFAULT NOW() | Auto-updated via trigger |

**Application status ENUM values (updated in v3.0):**
`Draft`, `Pending`, `UnderReview`, `Returned`, `Verified`, `ForAssessment`, `Assessed`, `ForPayment`, **`PaymentProcessing`**, `Paid`, `Completed`

**Table: application_drafts**

| Column | Type | Description |
|---|---|---|
| draft_id | UUID | PK |
| taxpayer_id | UUID | FK → taxpayers |
| current_step | INT | Default: 1 |
| form_data | JSONB | Serialized wizard state |
| created_at | TIMESTAMP | |
| updated_at | TIMESTAMP | Auto-updated via trigger |

**Table: application_activities**

| Column | Type | Description |
|---|---|---|
| id | UUID | PK |
| application_no | VARCHAR | FK → applications |
| activity_id | INT | FK → business_activities |
| capitalization | NUMERIC | Default: 0.00 |
| gross_sales_prev_year | NUMERIC | Default: 0.00 |

**Table: application_data_reviews**

| Column | Type | Description |
|---|---|---|
| review_id | UUID | PK |
| application_no | VARCHAR | FK → applications |
| section | VARCHAR | Business Details, Location, Business Activities, Financial Declaration |
| status | VARCHAR | 'Verified' (default) or 'Discrepancy' |
| remarks | TEXT | Required on Discrepancy |
| reviewed_by_user_id | UUID | FK → users |
| reviewed_at | TIMESTAMP | Default: NOW() |

### 4.4 Verification

**Table: doc_verifications**

| Column | Type | Description |
|---|---|---|
| id | UUID | PK |
| application_no | VARCHAR | FK → applications |
| requirement_id | INT | FK → requirement_types |
| status | VARCHAR | Pending / Yes / No / Not Needed / Awaiting Issuance |
| remarks | TEXT | |
| verified_by | UUID | FK → users |
| updated_at | TIMESTAMP | Auto-updated via trigger |

**Table: requirement_types**

| Column | Type | Description |
|---|---|---|
| id | INT | PK |
| name | VARCHAR | DTI/SEC/CDA Reg., Barangay Clearance, Fire Safety, Sanitary Permit, Zoning, Lease/TCT, CTC, Prior Year Permit, Owner's Valid ID |
| description | TEXT | |
| is_active | BOOLEAN | Default: true |
| fixed_amount | NUMERIC | Flat rate amount charged when computation_basis = Fixed |

**Table: barangay_clearances**

| Column | Type | Description |
|---|---|---|
| id | UUID | PK |
| application_no | VARCHAR | FK → applications |
| clearance_type_id | INT | FK → clearance_types |
| status | VARCHAR | Pending / Issued / Rejected |
| clearance_no | VARCHAR | |
| remarks | TEXT | |
| processed_by | UUID | FK → users |
| issued_at | TIMESTAMP | |
| expires_at | TIMESTAMP | |
| created_at | TIMESTAMP | |
| updated_at | TIMESTAMP | Auto-updated via trigger |

### 4.5 Treasury & Payment

**Table: assessments**

| Column | Type | Description |
|---|---|---|
| id | UUID | PK |
| application_no | VARCHAR | FK → applications |
| total_amount | NUMERIC | Default: 0.00 |
| assessed_by | UUID | FK → users |
| created_at | TIMESTAMP | |
| updated_at | TIMESTAMP | Auto-updated via trigger |

**Table: assessment_line_items**

| Column | Type | Description |
|---|---|---|
| id | UUID | PK |
| assessment_id | UUID | FK → assessments |
| fee_type_id | INT | FK → fee_types |
| amount | NUMERIC | Computed or overridden value |
| is_override | BOOLEAN | Default: false |
| override_reason | TEXT | Required when overriding |

**Table: fee_types**

| Column | Type | Description |
|---|---|---|
| id | INT | PK |
| name | VARCHAR | Mayor's Permit, Business Tax, Sanitary, Zoning, Garbage, Environmental, Weight & Measures, Fire Safety |
| computation_basis | VARCHAR | Fixed / Gross_Sales / Percentage |
| percentage_of_id | INT | Self-FK (for Fire Safety → 10% of Mayor's Permit) |
| percentage_value | NUMERIC | |
| is_active | BOOLEAN | Default: true |

**Table: transactions** *(Updated in v3.0)*

| Column | Type | Description |
|---|---|---|
| transaction_id | UUID | PK |
| assessment_id | UUID | FK → assessments |
| or_number | VARCHAR | Cashier OR or `PM-{YYYYMMDD}-{seq}` for online |
| amount_due | NUMERIC | |
| amount_tendered | NUMERIC | |
| change_amount | NUMERIC | Default: 0.00 |
| tendered_type | ENUM | **Cash, Manager Check, GCash, Card, Online** |
| check_number | VARCHAR | Manager Check only |
| bank_name | VARCHAR | Manager Check only |
| **paymongo_payment_intent_id** | **VARCHAR** | **UNIQUE — PayMongo Payment Intent reference** |
| **paymongo_payment_id** | **VARCHAR** | **UNIQUE — PayMongo confirmed Payment ID** |
| **payment_channel** | **VARCHAR** | **gcash / card / paymongo_link / etc.** |
| cashier_id | UUID | FK → users (null for online-initiated payments) |
| paid_at | TIMESTAMP | Default: NOW() |


### 4.6 Payment Gateway Audit *(New in v3.0)*

**Table: payment_gateway_logs**

| Column | Type | Description |
|---|---|---|
| log_id | UUID | PK |
| gateway | VARCHAR | Default: 'paymongo' |
| event_type | VARCHAR | e.g. payment.paid, payment.failed |
| paymongo_event_id | VARCHAR | UNIQUE — idempotency key |
| application_no | VARCHAR | FK → applications |
| transaction_id | UUID | FK → transactions |
| raw_payload | JSONB | Full inbound webhook body |
| processed | BOOLEAN | Default: false |
| processed_at | TIMESTAMP | |
| created_at | TIMESTAMP | Default: NOW() |

> **Append-only.** No DELETE RLS policy is granted. This table is a permanent audit record.

### 4.7 Permits & Documents

**Table: permits**

| Column | Type | Description |
|---|---|---|
| id | UUID | PK |
| application_no | VARCHAR | FK → applications |
| permit_no | VARCHAR | System-generated |
| issued_at | TIMESTAMP | |
| expires_at | TIMESTAMP | |
| issued_by | UUID | FK → users |
| created_at | TIMESTAMP | |

**Table: permit_line_items**

| Column | Type | Description |
|---|---|---|
| id | UUID | PK |
| permit_id | UUID | FK → permits |
| activity_id | INT | FK → business_activities |

**Table: business_activities** (18 pre-seeded Lines of Business)

| Column | Type | Description |
|---|---|---|
| id | INT | PK |
| name | VARCHAR | |
| description | TEXT | |
| is_active | BOOLEAN | Default: true |

### 4.8 Retirement

**Table: retirement_applications**

| Column | Type | Description |
|---|---|---|
| id | UUID | PK |
| business_id | UUID | FK → businesses |
| submitted_by | UUID | FK → users |
| reason | TEXT | |
| cessation_date | DATE | |
| final_gross_sales | NUMERIC | Default: 0.00 |
| status | ENUM (retirement_status) | Pending / Assessed / Paid / Completed |
| assessment_id | UUID | FK → assessments |
| acknowledged_by | UUID | FK → users |
| acknowledged_at | TIMESTAMP | |
| completed_by | UUID | FK → users |
| completed_at | TIMESTAMP | |
| created_at | TIMESTAMP | |
| updated_at | TIMESTAMP | Auto-updated via trigger |

### 4.9 System Tables

**Table: email_notifications**

| Column | Type | Description |
|---|---|---|
| id | UUID | PK |
| application_no | VARCHAR | FK → applications |
| trigger_event | ENUM | See Section 7 |
| recipient_email | VARCHAR | |
| recipient_name | VARCHAR | |
| subject | VARCHAR | |
| status | VARCHAR | Pending / Sent / Failed |
| error_message | TEXT | |
| retry_count | INT | Default: 0 |
| sent_at | TIMESTAMP | |
| created_at | TIMESTAMP | |

**Table: audit_logs**

| Column | Type | Description |
|---|---|---|
| log_id | UUID | PK |
| user_id | UUID | FK → users |
| action | VARCHAR | e.g. ONLINE_PAYMENT_INITIATED |
| entity_type | VARCHAR | Table name |
| entity_id | VARCHAR | PK of affected record |
| old_value | JSONB | Snapshot before change |
| new_value | JSONB | Snapshot after change |
| ip_address | INET | Client IP |
| created_at | TIMESTAMP | |

---

## 5. Application State Machine

> The backend **MUST reject** any status transition not listed below. All violations are logged in `audit_logs`.

```
[*] → Draft (Autosave)
Draft → Pending (Applicant submits UAF)
Pending → UnderReview (BPLO opens)
Pending → Returned (BPLO returns)
UnderReview → Verified (All guards pass)
UnderReview → Returned (Docs/data incorrect)
Returned → Pending (Applicant resubmits)
Verified → ForAssessment (System auto-route)
ForAssessment → Assessed (TOP generated)
Assessed → ForPayment (System auto-set)

-- OTC Path (unchanged) --
ForPayment → Paid (Cashier records OTC payment)

-- Online Path (new in v3.0) --
ForPayment → PaymentProcessing (Applicant initiates PayMongo checkout)
PaymentProcessing → Paid (PayMongo webhook: payment.paid confirmed)
PaymentProcessing → ForPayment (PayMongo webhook: payment.failed — allow retry)

Paid → Completed (Permit + E-Resibo generated)
Completed → [*]
```

### Transition Rules

| From | To | Actor | Guard Condition |
|---|---|---|---|
| Draft | Pending | Applicant | All required UAF fields completed |
| Pending | UnderReview | BPLO Officer | Officer opens application |
| Pending | Returned | BPLO Officer | Missing / incorrect documents or data |
| UnderReview | Verified | BPLO Officer | All `doc_verifications` = 'Yes' or 'Not Needed' AND all `application_data_reviews` = 'Verified' AND (if exists) `barangay_clearances.status` = 'Issued' |
| UnderReview | Returned | BPLO Officer | Discrepancy found; remarks required |
| Returned | Pending | Applicant | Resubmission with corrections (resets clearance status to Pending) |
| Verified | ForAssessment | System | Auto on Verified transition |
| ForAssessment | Assessed | Treasury Officer | TOP generated and finalized |
| Assessed | ForPayment | System | Auto on TOP generation |
| **ForPayment** | **PaymentProcessing** | **System** | **Applicant initiates PayMongo checkout; Payment Intent created** |
| **ForPayment** | **Paid** | **Treasury Cashier** | **OTC payment with valid OR number (unchanged)** |
| **PaymentProcessing** | **Paid** | **System (webhook)** | **PayMongo fires payment.paid; signature verified; idempotency check passes** |
| **PaymentProcessing** | **ForPayment** | **System (webhook)** | **PayMongo fires payment.failed or link expires — allow retry** |
| Paid | Completed | System | Permit + E-Resibo generated |

---

## 6. API Reference

### Module A — Applicant (Apply)

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/api/applications/drafts` | Create/update draft (autosave) |
| GET | `/api/applications/drafts/:taxpayer_id` | Retrieve saved draft |
| DELETE | `/api/applications/drafts/:draft_id` | Delete draft on submission |
| POST | `/api/applications/uaf` | Final UAF submission |
| POST | `/api/applications/upload` | Secure upload via pre-signed URL |
| GET | `/api/applications/:app_no/status` | Poll current status |

### Module B — BPLO (Verify & Process)

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/bplo/applications/pending` | Queue of applications awaiting review |
| GET | `/api/bplo/applications/:app_no` | Full detail with pre-signed doc URLs |
| PUT | `/api/bplo/applications/review/:app_no` | Upsert `application_data_reviews` sections |
| PUT | `/api/bplo/applications/verify/:app_no` | Update verification checklist |
| PUT | `/api/bplo/applications/return/:app_no` | Return with mandatory remarks |

### Module C — Treasury (Assess & Pay)

| Method | Endpoint | Purpose | Auth |
|---|---|---|---|
| POST | `/api/treasury/assess` | Calculate fees, generate assessment + TOP | Treasury_Officer |
| PUT | `/api/treasury/assess/:id/override` | Override line item (audit-logged) | Treasury_Officer |
| GET | `/api/documents/top/:app_no` | Generate TOP PDF | Treasury_Officer |
| POST | `/api/treasury/payments/otc` | Record OTC payment (Cash / Manager Check) | Treasury_Officer |
| **POST** | **`/api/treasury/payments/online`** | **Initiate PayMongo Payment Intent; transition to PaymentProcessing** | **Applicant or Treasury_Officer** |

### Module D — Barangay Clearance

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/barangay/clearances/pending` | Clearance requests queue |
| PUT | `/api/barangay/clearances/:id/issue` | Mark clearance as issued; auto-updates `doc_verifications` |
| PUT | `/api/barangay/clearances/:id/reject` | Reject with remarks; auto-updates `doc_verifications`; sends email |
| GET | `/api/documents/barangay-clearance/:id` | Generate clearance PDF |

### Module E — Business Retirement

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/api/retirements/submit` | Submit retirement request |
| GET | `/api/retirements/pending` | Pending retirement queue |
| POST | `/api/retirements/:id/assess` | Compute final taxes |
| PUT | `/api/retirements/:id/complete` | Mark business as retired |

### Module F — Admin Health & Settings

| Method | Endpoint | Purpose |
|---|---|---|
| RPC | `admin_health_check()` | Database health check |
| RPC | `get_max_connections()` | Database connection limit |
| RPC | `get_system_settings()` | Retrieve system settings |

### Module G — Reporting & Documents

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/documents/permit/:app_no` | Generate Business Permit PDF(s) |
| GET | `/api/documents/permit/:app_no?lob=:id` | Per-line-of-business permit |
| GET | `/api/documents/eresibo/:transaction_id` | Official Receipt (E-Resibo) PDF |

### Webhooks *(New in v3.0)*

| Method | Endpoint | Purpose | Auth |
|---|---|---|---|
| **POST** | **`/api/webhooks/paymongo`** | **Receive PayMongo payment events; raw body; HMAC-SHA256 verified** | **None (PayMongo server-to-server)** |

> **Implementation note:** The webhook route must use `express.raw({ type: 'application/json' })` and be mounted **before** the global `express.json()` middleware. If the body is pre-parsed, HMAC signature verification will always fail.

---

## 7. Email Notification System

All notifications use Nodemailer via Gmail SMTP or Brevo. The `PAYMENT_RECORDED` trigger fires for both OTC and online payment paths using the same template; the OR number format distinguishes the channel.

| Trigger Event | Recipient | Subject / Content |
|---|---|---|
| `APPLICATION_SUBMITTED` | Applicant | Confirmation with application number |
| `BARANGAY_CLEARANCE_REJECTED` | Applicant | Rejection remarks + instructions to re-apply at barangay hall |
| `APPLICATION_RETURNED` | Applicant | BPLO remarks + resubmission link |
| `APPLICATION_VERIFIED` | Applicant | Application passed BPLO review; awaiting assessment |
| `TOP_GENERATED` | Applicant | TOP PDF attached; OTC instructions + online payment link |
| `PAYMENT_RECORDED` | Applicant | Payment confirmed; OR number (cashier or PM-prefixed); E-Resibo download link |
| `PERMIT_READY` | Applicant | Business Permit + documents ready for download or physical claiming |
| `RETIREMENT_COMPLETE` | Applicant | Retirement processed; final receipt attached |
| `ACCOUNT_CREATED` | New User | Welcome email with activation link |
| `PASSWORD_RESET` | Any User | Password reset link (expires 1 hour) |

---

## 8. Roles and Access Control (RBAC)

| Role | Module Access | Key Permissions | Restrictions |
|---|---|---|---|
| Applicant | A, F (own only) | Submit UAF, upload docs, view own status, download own documents, **initiate PayMongo online payment** | Cannot view other applicants' data; cannot verify or assess |
| BPLO Officer | B (Read A) | Verify documents, review data sections, approve/return applications | Cannot modify profiles; cannot assess fees or record payments |
| Treasury Officer | C (Read A, B) | Assess fees, override line items, generate TOP, record OTC payment, **initiate online payment on behalf of applicant**, issue E-Resibo | Cannot approve/deny regulatory clearances |
| Barangay Officer | D | Issue or reject Barangay Clearance, view clearance queue | Cannot access other modules |
| System Admin | All | Manage users/roles, update lookup tables, customize document layouts, view audit logs | Should not process live applications or payments directly |

### Permission Matrix

| Capability | Applicant | BPLO | Treasury | Barangay | Admin |
|---|:---:|:---:|:---:|:---:|:---:|
| Submit UAF | ✅ | — | — | — | — |
| Upload Documents | ✅ | — | — | — | — |
| View Own Status | ✅ | — | — | — | ✅ |
| Verify Documents | — | ✅ | — | — | — |
| Approve/Return App | — | ✅ | — | — | — |
| Assess Fees | — | — | ✅ | — | — |
| Override Fee Items | — | — | ✅ | — | — |
| Record OTC Payment | — | — | ✅ | — | — |
| **Initiate Online Payment** | **✅** | **—** | **✅** | **—** | **—** |
| Issue Brgy Clearance | — | — | — | ✅ | — |
| Process Retirement | — | ✅ | ✅ | — | ✅ |
| Download Documents | ✅ (own) | ✅ | ✅ | — | ✅ |
| Manage Users/Roles | — | — | — | — | ✅ |
| View Audit Logs | — | — | — | — | ✅ |
| Configure Templates | — | — | — | — | ✅ |

---

## 9. User Interface Guidelines

### 9.1 Applicant Interface — Mobile-First

- **Dashboard:** Welcoming screen with Quick Action buttons and application list with status badges. `PaymentProcessing` badge = Purple / Animated.
- **UAF Wizard:** Progress bar pinned to top; autosave indicator.
- **Draft Resume Prompt:** Modal on login if draft exists.
- **Document Upload:** Large clickable areas for camera/gallery access; instant thumbnail on success.
- **Payment & Claiming Screen (updated):**
  - When status = `ForPayment`: displays total due, a "Download TOP" button, OTC instructions, **and a "Pay Online via PayMongo" button**.
  - When status = `PaymentProcessing`: shows a pending state — *"Your online payment is being confirmed. This page will update automatically."* Polls `GET /api/applications/:app_no/status` every 5 seconds.
  - When status = `Paid` / `Completed`: shows Permit and E-Resibo download buttons.

### 9.2 BPLO Officer Interface — Desktop-First

- **Dashboard:** Sortable data table with SLA urgency indicators.
- **Split-Screen Verifier:** Left pane — document viewer with zoom. Top-right — checklist (Yes / No / Not Needed / Awaiting Issuance). Bottom-right — Data Review Panel.
- **Approve/Return Footer Guard:** Approve button is disabled until all guard conditions pass.

### 9.3 Treasury Officer Interface — Desktop POS-Like

- **Assessment Grid:** Spreadsheet-style view with overridable fields highlighted in yellow. Grand Total updates in real-time.
- **Cashier POS Panel:** High-contrast, large-typography interface. Cash/Manager Check selector, OR number input, change computation. Giant "Confirm Payment" button.
- **Online Payment Initiation:** If applicant prefers online, Treasury can also trigger `POST /api/treasury/payments/online` from the POS screen and copy the checkout URL to the applicant.

### 9.4 System Administrator Interface — Utilitarian

- Admin Dashboard: System health metrics, active users, error rate.
- Master Data Configuration: CRUD for fee types, clearance types, org types.
- Document Builder: Visual workspace for template upload and `{{placeholder}}` mapping.
- Audit Log Viewer: Filterable by user, action type (now includes `ONLINE_PAYMENT_INITIATED`, `ONLINE_PAYMENT_CONFIRMED`, `ONLINE_PAYMENT_FAILED`), date range, and entity type.

---

## 10. Non-Functional Requirements

| Requirement | Specification |
|---|---|
| Performance | < 2s API response under normal load; handle January renewal spikes |
| Security — Auth | Passwords hashed with bcrypt (cost ≥ 12); JWT 24-hour expiry |
| Security — Data | Supabase RLS on all tables; pre-signed URLs (15-min expiry) |
| **Security — Webhooks** | **HMAC-SHA256 signature verification on every inbound PayMongo webhook; reject with 400 on failure** |
| **Webhook Idempotency** | **Duplicate `payment.paid` events must not create duplicate transactions, PDFs, or emails** |
| Privacy Compliance | DPA 2012; all PII access logged in `audit_logs`; admin access reports |
| Payment | OTC (Cash / Manager Check) + Online via PayMongo (GCash / Card / Link). Retirement flow: OTC only. |
| **Credentials** | **PAYMONGO_SECRET_KEY and PAYMONGO_WEBHOOK_SECRET stored in env vars only. Never logged or persisted in DB.** |
| Usability | Applicant portal fully mobile-responsive; UAF completable on smartphone |
| Availability | 99.5% uptime; Supabase managed PostgreSQL handles backups |
| Audit Trail | Every data mutation logged in `audit_logs`; webhook events in `payment_gateway_logs` |

---

## 11. Development Environment & Tooling

| Tool | Purpose |
|---|---|
| VS Code | Primary IDE |
| Prettier (.prettierrc) | Code formatting |
| ESLint | Code linting |
| GitHub (Git Flow) | Version control and branching strategy |
| Supabase CLI | Local DB development and migrations |
| **ngrok** | **Expose local webhook endpoint to PayMongo during development** |

### 11.1 Environment Variables (updated)

```env
# Existing
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
JWT_SECRET=
SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASS=

# New in v3.0
PAYMONGO_SECRET_KEY=sk_test_...
PAYMONGO_WEBHOOK_SECRET=whsec_...
PAYMONGO_SUCCESS_URL=https://your-domain.com/payment/success
PAYMONGO_CANCEL_URL=https://your-domain.com/payment/cancel
```

### 11.2 Frontend Project Structure

| Path | Contents |
|---|---|
| `/src/components` | Reusable UI — Buttons, Inputs, Map, Badges |
| `/src/screens` | Main views per module (UAFWizard, BPLODashboard, CashierPOS, etc.) |
| `/src/store` | Zustand state slices (auth, application, notifications) |
| `/src/utils` | Tax calculation helpers, date formatters, PDF builders |
| `/src/hooks` | Custom hooks (useAutosave, useApplicationStatus, useNotifications) |

---

## 12. Project Scope

### 12.1 In Scope

- OTC payment recording (Cash and Manager Check)
- **Online payment via PayMongo (GCash, Card, Payment Link) — optional channel**
- UAF submission with integrated Barangay Clearance processing
- BPLO document and data verification workflow
- Treasury fee assessment and TOP generation
- Business Retirement / Cessation module (OTC payment only)
- E-Resibo (Official Receipt) generation
- Business Permit generation including per-line-of-business printing
- Email notification system (transactional events)
- System audit logging and webhook event logging
- Admin document layout customization (DocumentBuilder)

### 12.2 Explicitly Out of Scope

> **Excluded Features — Do Not Implement**
>
> 1. ~~Online payment gateways~~ — **PayMongo is now in scope. All other gateways remain excluded** (Landbank ePay, DBP PayConnect, PayMaya, GCash Direct — only via PayMongo aggregation)
> 2. Legacy system data migration from paper or legacy digital records
> 3. Integration with national-level databases (BIR, DTI, SEC national portals)
> 4. SMS notification system
> 5. Mobile native app (iOS/Android) — web-only
> 6. Multi-LGU or federated deployment
> 7. **Online payment for the Retirement Module — OTC only**

---

*eBPLS SDD v4.0 — Municipality of Liliw*
*Previous version: SDD v3.0 (PayMongo). This version adds PayMongo as an optional online payment channel.*