# eBPLS File Structure

This document outlines the recommended directory structure for the **eBPLS (Electronic Business Permits and Licensing System)**. The project is split into two distinct codebases: the Node.js/Express Backend and the React.js Frontend, reflecting the Client-Server Architecture.

---

## 1. Backend Codebase (`ebpls-backend`)

**Tech Stack:** Node.js, Express.js, Supabase Client (PostgreSQL/Storage), pdf-lib, Nodemailer.

The backend follows a standard controller-service-route architecture to separate concerns, making it easy to enforce RBAC and maintain business logic.

```text
ebpls-backend/
├── src/
│   ├── config/                  # Configuration files and initializations
│   │   ├── env.js               # Environment variables validation
│   │   ├── supabase.js          # Supabase client setup (DB and Storage)
│   │   └── mailer.js            # Nodemailer / SMTP configuration
│   │
│   ├── controllers/             # Route handlers organized by architectural module
│   │   ├── application.controller.js  # Module A: UAF submissions, drafts
│   │   ├── bplo.controller.js         # Module B: Document verification
│   │   ├── treasury.controller.js     # Module C: Fees, TOP, OTC Payments
│   │   ├── barangay.controller.js     # Module D: Barangay Clearances
│   │   ├── retirement.controller.js   # Module E: Business Retirements
│   │   └── document.controller.js     # Module F: PDF generation endpoints
│   │
│   ├── middlewares/             # Express middlewares
│   │   ├── auth.middleware.js         # Verifies JWT from requests
│   │   ├── rbac.middleware.js         # Enforces role permissions per route
│   │   ├── audit.middleware.js        # Automates logging to `audit_logs` table
│   │   └── error.middleware.js        # Global error and exception handler
│   │
│   ├── routes/                  # Express route definitions (maps to controllers)
│   │   ├── application.routes.js
│   │   ├── bplo.routes.js
│   │   ├── treasury.routes.js
│   │   ├── barangay.routes.js
│   │   ├── retirement.routes.js
│   │   └── document.routes.js
│   │
│   ├── services/                # Core business logic and database interactions
│   │   ├── application.service.js     # State machine transitions
│   │   ├── assessment.service.js      # Tax and fee calculation logic
│   │   ├── audit.service.js           # Writes securely to audit_logs
│   │   ├── email.service.js           # Event-driven email sending
│   │   ├── storage.service.js         # Pre-signed URLs and file uploads
│   │   └── pdf.service.js             # pdf-lib template population
│   │
│   ├── utils/                   # Shared utility functions
│   │   ├── constants.js               # Enums, valid states, role IDs
│   │   └── helpers.js                 # General helpers
│   │
│   └── app.js                   # Express application setup, middleware mounting
│
├── tests/                       # Unit and integration tests
├── .env.example                 # Template for environment variables
├── .prettierrc                  # Code formatting rules
├── eslint.config.js             # Linter configuration
├── package.json                 # Dependencies and scripts
└── server.js                    # Entry point; starts the HTTP server
```

---

## 2. Frontend Codebase (`ebpls-frontend`)

**Tech Stack:** React.js, Vite, Tailwind CSS, Zustand, React Router, Leaflet.js.

The frontend is organized around the different User Roles (Applicant, BPLO, Treasury, Barangay, Admin) and utilizes a component-based structure.

```text
ebpls-frontend/
├── public/                      # Static assets (favicons, manifest)
│   └── assets/                  # Public images
│
├── src/
│   ├── assets/                  # CSS and internal assets
│   │   └── index.css            # Tailwind directives and global styles
│   │
│   ├── components/              # Reusable React components
│   │   ├── ui/                  # Generic UI (Buttons, Inputs, Modals, Badges)
│   │   ├── layout/              # Navbars, Sidebars, Footers
│   │   └── shared/              # Domain-specific shared components
│   │       ├── DocumentUploadPanel.jsx
│   │       ├── InteractiveLocationPin.jsx
│   │       └── StatusBadge.jsx
│   │
│   ├── hooks/                   # Custom React hooks
│   │   ├── useAuth.js                 # Authentication logic
│   │   ├── useAutosave.js             # UAF draft autosave logic
│   │   ├── useApplicationStatus.js    # Polling or fetching status
│   │   └── useNotifications.js        # Notification management
│   │
│   ├── layouts/                 # High-level layouts tailored to roles
│   │   ├── ApplicantLayout.jsx        # Mobile-first navigation
│   │   ├── BPLOLayout.jsx             # Desktop-first dashboard layout
│   │   ├── TreasuryLayout.jsx         # POS-style layout
│   │   ├── BarangayLayout.jsx
│   │   └── AdminLayout.jsx
│   │
│   ├── screens/                 # Main page views organized by role
│   │   ├── public/
│   │   │   └── LandingPage.jsx        # System overview and entry point
│   │   ├── auth/
│   │   │   ├── Login.jsx              # Universal login screen
│   │   │   ├── Register.jsx           # Applicant registration
│   │   │   └── ForgotPassword.jsx     # Password reset flow
│   │   ├── applicant/
│   │   │   ├── Dashboard.jsx
│   │   │   ├── UAFWizardScreen.jsx    # 5-step application wizard
│   │   │   └── StatusTracker.jsx
│   │   ├── bplo/
│   │   │   ├── Dashboard.jsx          # Application queue with SLAs
│   │   │   └── SplitScreenVerifier.jsx # Document verification interface
│   │   ├── treasury/
│   │   │   ├── AssessmentGrid.jsx     # Fee calculation override grid
│   │   │   └── CashierPOS.jsx         # High-contrast OTC payment logger
│   │   ├── barangay/
│   │   │   └── ClearanceQueue.jsx     # Pending clearance requests
│   │   └── admin/
│   │       ├── MasterData.jsx         # Lookup table management
│   │       ├── DocumentBuilder.jsx    # PDF layout customizer
│   │       └── AuditLogs.jsx          # DPA compliance viewer
│   │
│   ├── store/                   # Zustand state management
│   │   ├── authStore.js               # User session and role
│   │   ├── applicationStore.js        # Local state for UAF forms
│   │   └── UIStore.js                 # Modals, sidebars, toast states
│   │
│   ├── utils/                   # Helpers
│   │   ├── apiClient.js               # Axios/Fetch wrapper with JWT injection
│   │   ├── formatters.js              # Currency (PHP), Date formatters
│   │   └── constants.js               # App configuration
│   │
│   ├── App.jsx                  # Main router configuration and layout mapping
│   └── main.jsx                 # React DOM entry point
│
├── .env.example                 # Frontend environment variables (API URLs)
├── eslint.config.js             # Linter config
├── package.json                 # Dependencies
├── tailwind.config.js           # Tailwind configuration (themes, colors)
└── vite.config.js               # Vite bundler configuration
```

---

## 3. Key Structural Design Decisions

1. **Role-Based Routing (`/src/screens/` and `/src/layouts/`)**
   Because the UI requirements drastically differ between roles (e.g., Applicant is Mobile-first, BPLO/Treasury is Desktop-first), views and layouts are segregated by role rather than feature.
2. **Middleware Layer (`/src/middlewares/`)**
   The backend relies heavily on `auth.middleware.js` and `rbac.middleware.js` to ensure the strict access controls defined in the architecture. `audit.middleware.js` ensures that all data mutations are logged automatically without cluttering controller logic.
3. **Services Layer (`/src/services/`)**
   Business logic (like calculating fees or enforcing the state machine) is kept out of controllers and placed in services. This makes unit testing significantly easier.
4. **Zustand Stores (`/src/store/`)**
   State management is split logically. `applicationStore` handles the complex draft state of the UAF, while `authStore` handles standard user identity.
