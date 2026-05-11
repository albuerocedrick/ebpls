# eBPLS File Structure

**v2.0 — Updated with PayMongo Online Payment Integration**

This document outlines the recommended directory structure for the **eBPLS (Electronic Business Permits and Licensing System)**. The project is split into two distinct codebases: the Node.js/Express Backend and the React.js Frontend, reflecting the Client-Server Architecture.

> **What changed in v2.0**
> Five new backend files added for PayMongo integration. One new Supabase migration. Six existing files updated with targeted changes. Frontend `StatusTracker.jsx` and `applicationStore.js` updated for the `PaymentProcessing` state and online payment UI.

---

## 1. Backend Codebase (`ebpls-backend`)

**Tech Stack:** Node.js, Express.js, Supabase Client (PostgreSQL/Storage), pdf-lib, Nodemailer, PayMongo API.

The backend follows a standard controller-service-route architecture to separate concerns, making it easy to enforce RBAC and maintain business logic.

```text
ebpls-backend/
├── src/
│   ├── config/                        # Configuration files and initializations
│   │   ├── env.js                     # Zod env validation ⚠️ UPDATED — 4 PayMongo vars added
│   │   ├── supabase.js                # Supabase client setup (DB and Storage)
│   │   └── mailer.js                  # Nodemailer / SMTP configuration
│   │
│   ├── controllers/                   # Route handlers organized by architectural module
│   │   ├── application.controller.js  # Module A: UAF submissions, drafts
│   │   ├── bplo.controller.js         # Module B: Document verification
│   │   ├── treasury.controller.js     # Module C: Fees, TOP, OTC payments
│   │   ├── barangay.controller.js     # Module D: Barangay Clearances
│   │   ├── retirement.controller.js   # Module E: Business Retirements
│   │   ├── document.controller.js     # Module F: PDF generation endpoints
│   │   └── webhook.controller.js      # 🆕 NEW — PayMongo webhook handler
│   │                                  #     Verifies HMAC-SHA256 signature
│   │                                  #     Checks idempotency via payment_gateway_logs
│   │                                  #     Handles payment.paid and payment.failed events
│   │                                  #     Triggers document generation + PAYMENT_RECORDED email
│   │
│   ├── middlewares/                   # Express middlewares
│   │   ├── auth.middleware.js         # Verifies JWT from requests
│   │   ├── rbac.middleware.js         # Enforces role permissions per route
│   │   ├── audit.middleware.js        # Automates logging to audit_logs table
│   │   └── error.middleware.js        # Global error and exception handler
│   │
│   ├── routes/                        # Express route definitions
│   │   ├── application.routes.js      # Module A routes
│   │   ├── bplo.routes.js             # Module B routes
│   │   ├── treasury.routes.js         # Module C: OTC payment routes (unchanged)
│   │   ├── treasury.online.routes.js  # 🆕 NEW — POST /api/treasury/payments/online
│   │   │                              #     RBAC: Applicant or Treasury_Officer
│   │   │                              #     Initiates PayMongo Payment Intent
│   │   │                              #     Transitions status to PaymentProcessing
│   │   ├── webhook.routes.js          # 🆕 NEW — POST /api/webhooks/paymongo
│   │   │                              #     No JWT auth (server-to-server)
│   │   │                              #     Uses express.raw() — must mount BEFORE express.json()
│   │   ├── barangay.routes.js         # Module D routes
│   │   ├── retirement.routes.js       # Module E routes
│   │   └── document.routes.js         # Module F routes
│   │
│   ├── services/                      # Core business logic and database interactions
│   │   ├── application.service.js     # State machine transitions ⚠️ UPDATED
│   │   │                              #     Added: ForPayment → PaymentProcessing
│   │   │                              #     Added: PaymentProcessing → Paid
│   │   │                              #     Added: PaymentProcessing → ForPayment
│   │   │                              #     Existing transitions unchanged
│   │   ├── assessment.service.js      # Tax and fee calculation logic
│   │   ├── audit.service.js           # Writes securely to audit_logs
│   │   ├── email.service.js           # Event-driven email sending ⚠️ UPDATED
│   │   │                              #     PAYMENT_RECORDED template supports both
│   │   │                              #     cashier OR numbers and PM-prefixed OR numbers
│   │   ├── paymongo.service.js        # 🆕 NEW — PayMongo API client
│   │   │                              #     createPaymentIntent(amount, description, appNo)
│   │   │                              #       amount in centavos (PHP × 100)
│   │   │                              #     createPaymentLink(amount, description, appNo)
│   │   │                              #     verifyWebhookSignature(rawBody, sigHeader)
│   │   │                              #       HMAC-SHA256 using PAYMONGO_WEBHOOK_SECRET
│   │   │                              #       returns false on failure — does not throw
│   │   │                              #     getPayment(paymentId) — manual verification fallback
│   │   ├── storage.service.js         # Pre-signed URLs and file uploads
│   │   └── pdf.service.js             # pdf-lib template population
│   │
│   ├── utils/                         # Shared utility functions
│   │   ├── constants.js               # Enums, valid states, role IDs ⚠️ UPDATED
│   │   │                              #     APPLICATION_STATUS.PAYMENT_PROCESSING added
│   │   │                              #     TRANSACTION_TENDERED_TYPE: GCASH, CARD, ONLINE added
│   │   │                              #     AUDIT_ACTIONS: ONLINE_PAYMENT_INITIATED,
│   │   │                              #       ONLINE_PAYMENT_CONFIRMED, ONLINE_PAYMENT_FAILED added
│   │   └── helpers.js                 # General helpers (UUID, date formatters)
│   │
│   └── app.js                         # Express application setup ⚠️ UPDATED
│                                      #   CRITICAL MOUNT ORDER:
│                                      #   1. webhook.routes with express.raw() — BEFORE express.json()
│                                      #   2. express.json() global middleware
│                                      #   3. treasury.online.routes at /api/treasury
│                                      #   4. All other routes (unchanged)
│
├── supabase/
│   └── migrations/
│       ├── 001_roles.sql
│       ├── 002_users.sql
│       ├── 003_taxpayers.sql
│       ├── 004_businesses.sql
│       ├── 005_applications.sql
│       ├── 006_verifications.sql
│       ├── 007_barangay.sql
│       ├── 008_treasury.sql
│       ├── 009_retirements.sql
│       ├── 010_permits.sql
│       ├── 011_audit_logs.sql
│       ├── 012_email_notifications.sql
│       ├── 013_rls_policies.sql
│       ├── 015_design_gaps_fix.sql
│       ├── 016_application_data_reviews.sql
│       ├── 017_uaf_clearance_hook.sql
│       └── 018_paymongo_payment.sql    # 🆕 NEW — PayMongo migration
│                                       #   Adds GCash, Card, Online to tendered_type enum
│                                       #   Adds PaymentProcessing to application_status enum
│                                       #   Adds paymongo_payment_intent_id (UNIQUE) to transactions
│                                       #   Adds paymongo_payment_id (UNIQUE) to transactions
│                                       #   Adds payment_channel to transactions
│                                       #   Creates payment_gateway_logs table with RLS
│                                       #   (append-only — no DELETE policy)
│
├── tests/                             # Unit and integration tests
├── .env                               # Local environment variables (gitignored)
├── .env.example                       # Template ⚠️ UPDATED — 4 PayMongo vars added
│                                      #   PAYMONGO_SECRET_KEY=sk_test_...
│                                      #   PAYMONGO_WEBHOOK_SECRET=whsec_...
│                                      #   PAYMONGO_SUCCESS_URL=https://...
│                                      #   PAYMONGO_CANCEL_URL=https://...
├── .prettierrc                        # Code formatting rules
├── eslint.config.js                   # Linter configuration
├── package.json                       # Dependencies and scripts
└── server.js                          # Entry point; starts the HTTP server
```

---

## 2. Frontend Codebase (`ebpls-frontend`)

**Tech Stack:** React.js, Vite, Tailwind CSS, Zustand, React Router, Leaflet.js.

The frontend is organized around the different User Roles (Applicant, BPLO, Treasury, Barangay, Admin) and utilizes a component-based structure.

```text
ebpls-frontend/
├── public/                            # Static assets (favicons, manifest)
│   └── assets/                        # Public images
│
├── src/
│   ├── assets/
│   │   └── index.css                  # Tailwind directives and global styles
│   │
│   ├── components/                    # Reusable React components
│   │   ├── ui/                        # Generic UI (Buttons, Inputs, Modals, Badges)
│   │   ├── layout/                    # Navbars, Sidebars, Footers
│   │   └── shared/                    # Domain-specific shared components
│   │       ├── DocumentUploadPanel.jsx
│   │       ├── InteractiveLocationPin.jsx
│   │       └── StatusBadge.jsx        # ⚠️ UPDATED — PaymentProcessing badge style added
│   │                                  #   (purple / animated indicator)
│   │
│   ├── hooks/                         # Custom React hooks
│   │   ├── useAuth.js                 # Authentication logic
│   │   ├── useAutosave.js             # UAF draft autosave logic
│   │   ├── useApplicationStatus.js    # Status polling ⚠️ UPDATED
│   │   │                              #   Used by StatusTracker during PaymentProcessing
│   │   │                              #   to poll GET /api/applications/:app_no/status
│   │   │                              #   every 5 seconds until status changes
│   │   └── useNotifications.js        # Notification management
│   │
│   ├── layouts/                       # High-level layouts tailored to roles
│   │   ├── ApplicantLayout.jsx        # Mobile-first navigation
│   │   ├── BPLOLayout.jsx             # Desktop-first dashboard layout
│   │   ├── TreasuryLayout.jsx         # POS-style layout
│   │   ├── BarangayLayout.jsx
│   │   └── AdminLayout.jsx
│   │
│   ├── screens/                       # Main page views organized by role
│   │   ├── public/
│   │   │   └── LandingPage.jsx
│   │   ├── auth/
│   │   │   ├── Login.jsx
│   │   │   ├── Register.jsx
│   │   │   └── ForgotPassword.jsx
│   │   ├── applicant/
│   │   │   ├── Dashboard.jsx
│   │   │   ├── UAFWizardScreen.jsx    # 5-step application wizard
│   │   │   └── StatusTracker.jsx      # ⚠️ UPDATED — ForPayment state now shows:
│   │   │                              #   Option A: OTC instructions (unchanged)
│   │   │                              #   Option B: "Pay Online via PayMongo" button
│   │   │                              #     → calls POST /api/treasury/payments/online
│   │   │                              #     → redirects to PayMongo checkout_url
│   │   │                              #   PaymentProcessing state shows:
│   │   │                              #     "Your online payment is being confirmed..."
│   │   │                              #     Polls status every 5 seconds via useApplicationStatus
│   │   │                              #     Auto-updates to download view on Paid/Completed
│   │   ├── bplo/
│   │   │   ├── Dashboard.jsx
│   │   │   └── SplitScreenVerifier.jsx
│   │   ├── treasury/
│   │   │   ├── AssessmentGrid.jsx
│   │   │   └── CashierPOS.jsx         # OTC payment logger (unchanged)
│   │   ├── barangay/
│   │   │   └── ClearanceQueue.jsx
│   │   └── admin/
│   │       ├── MasterData.jsx
│   │       ├── DocumentBuilder.jsx
│   │       └── AuditLogs.jsx          # ⚠️ UPDATED — filter options now include
│   │                                  #   ONLINE_PAYMENT_INITIATED
│   │                                  #   ONLINE_PAYMENT_CONFIRMED
│   │                                  #   ONLINE_PAYMENT_FAILED
│   │
│   ├── store/                         # Zustand state management
│   │   ├── authStore.js               # User session and role
│   │   ├── applicationStore.js        # Local state for UAF forms ⚠️ UPDATED
│   │   │                              #   PaymentProcessing added to handled statuses
│   │   │                              #   Drives StatusTracker view switching
│   │   └── UIStore.js                 # Modals, sidebars, toast states
│   │
│   ├── utils/
│   │   ├── apiClient.js               # Axios/Fetch wrapper with JWT injection
│   │   ├── formatters.js              # Currency (PHP), Date formatters
│   │   └── constants.js               # App configuration
│   │
│   ├── App.jsx                        # Main router configuration and layout mapping
│   └── main.jsx                       # React DOM entry point
│
├── .env.example                       # Frontend environment variables (API URLs)
├── eslint.config.js
├── package.json
├── tailwind.config.js
└── vite.config.js
```

---

## 3. Key Structural Design Decisions

### 3.1 Role-Based Routing (`/src/screens/` and `/src/layouts/`)
Because the UI requirements drastically differ between roles (e.g., Applicant is Mobile-first, BPLO/Treasury is Desktop-first), views and layouts are segregated by role rather than feature.

### 3.2 Middleware Layer (`/src/middlewares/`)
The backend relies on `auth.middleware.js` and `rbac.middleware.js` to enforce strict access controls. `audit.middleware.js` ensures all data mutations are logged automatically without cluttering controller logic.

### 3.3 Services Layer (`/src/services/`)
Business logic (fee calculation, state machine enforcement, PayMongo API calls, webhook signature verification) is kept out of controllers and placed in services. This makes unit testing significantly easier and keeps controllers thin.

### 3.4 Zustand Stores (`/src/store/`)
State management is split logically. `applicationStore` handles the complex draft state of the UAF wizard and the payment status view (including the new `PaymentProcessing` polling state), while `authStore` handles user identity.

### 3.5 Webhook Route Mount Order — Critical ⚠️
The PayMongo webhook endpoint must receive the **raw, unparsed request body** for HMAC-SHA256 signature verification. If Express has already run `express.json()` on the request, the body will be pre-parsed and the signature will always fail.

**Required mount order in `app.js`:**
```js
// 1. Webhook route with raw body parser — MUST come first
app.use('/api/webhooks', express.raw({ type: 'application/json' }), webhookRoutes);

// 2. Global JSON parser for all other routes
app.use(express.json());

// 3. All other route registrations
app.use('/api/treasury', treasuryRoutes);
app.use('/api/treasury', treasuryOnlineRoutes);
// ...etc
```

### 3.6 PayMongo Credential Security
`PAYMONGO_SECRET_KEY` and `PAYMONGO_WEBHOOK_SECRET` must **never** be:
- Hard-coded in any source file
- Logged to console or any log store
- Stored in any database table or returned in any API response

Both keys must be accessed exclusively through `src/config/env.js` (Zod-validated at startup). The app will fail to start if either variable is missing or empty.

### 3.7 `payment_gateway_logs` — Append-Only Audit Table
The `payment_gateway_logs` table stores every inbound PayMongo webhook payload as a permanent record. It serves two purposes:

1. **Idempotency:** Before processing any webhook, the handler checks if `paymongo_event_id` already exists with `processed = true`. If so, it returns `200` immediately with no side effects.
2. **Audit trail:** Every raw payload is preserved for debugging, dispute resolution, and DPA compliance.

No DELETE RLS policy is granted on this table. Rows must never be deleted.

---

## 4. New Files Summary (v2.0)

| File | Type | Purpose |
|---|---|---|
| `supabase/migrations/018_paymongo_payment.sql` | Migration | Enum additions, transactions columns, payment_gateway_logs table + RLS |
| `src/services/paymongo.service.js` | Service | PayMongo API client (Payment Intent, Payment Link, signature verification) |
| `src/routes/treasury.online.routes.js` | Route | `POST /api/treasury/payments/online` — RBAC protected |
| `src/routes/webhook.routes.js` | Route | `POST /api/webhooks/paymongo` — raw body, no JWT |
| `src/controllers/webhook.controller.js` | Controller | Webhook handler: signature check, idempotency, state transitions, doc + email trigger |

## 5. Modified Files Summary (v2.0 — Targeted Changes Only)

| File | What Changed |
|---|---|
| `src/config/env.js` | Added 4 PayMongo env vars to Zod schema |
| `src/utils/constants.js` | Added `PAYMENT_PROCESSING` status, `GCASH`/`CARD`/`ONLINE` tendered types, 3 new audit actions |
| `src/services/application.service.js` | Added 3 new state machine transitions; existing transitions untouched |
| `src/services/email.service.js` | `PAYMENT_RECORDED` template updated to support both OR number formats |
| `src/app.js` | Mounted 2 new route files; webhook route gets `express.raw()` before global `express.json()` |
| `src/screens/applicant/StatusTracker.jsx` | Added online payment button for `ForPayment`; added polling UI for `PaymentProcessing` |
| `src/store/applicationStore.js` | Added `PaymentProcessing` to handled statuses |
| `src/components/shared/StatusBadge.jsx` | Added `PaymentProcessing` badge style (purple / animated) |
| `.env.example` | Added 4 PayMongo placeholder variables |

---

*eBPLS File Structure v2.0 — Municipality of Liliw*
*Updated: Five new backend files, one new migration, nine targeted file modifications for PayMongo online payment integration.*