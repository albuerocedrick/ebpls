# eBPLS Execution Tasks

- [x] **Phase 1 — Shared: Fee Schedule Database + Reference Page**
  - [x] Database migration (`036_fee_schedule.sql`)
  - [x] Backend API (`GET /api/treasury/fee-schedule`)
  - [x] Frontend `FeeSchedule.jsx` (including Other Municipal Fees)
  - [x] Sidebar navigation added for Treasury and Applicant

- [x] **Phase 1.5 — Applicant: Dynamic Conditional Inputs in Step 3**
  - [x] Update `GET /api/applications/lookups` to return `business_activity_metrics`
  - [x] Modify `Step3_Activities.jsx` to dynamically render input for tiered industries
  - [x] Ensure `metric_count` is stored in Zustand state and submitted
  - [x] Verify persistence in `business_activities` table

- [x] **Phase 2 — Applicant: Assessment Breakdown + Step-by-Step Procedure**
  - [x] Create `GET /api/applications/:app_no/assessment` endpoint
  - [x] Add Fee Assessment Breakdown Card to `StatusTracker.jsx`
  - [x] Create `ProcedureGuide.jsx` component for step-by-step instructions
  - [x] Verify dynamic computation text appears correctly

- [x] **Phase 3 — Applicant: In-App Pop-Up Notification for Returned Applications**
  - [x] Database migration (`037_notifications.sql` / next available)
  - [x] Create `GET /api/notifications/unread` and `PUT /api/notifications/:id/read` endpoints
  - [x] Hook `returnApplication` in `bplo.controller.js` to insert notification
  - [x] Create `notificationStore.js` with polling
  - [x] Build `NotificationBell.jsx` and `NotificationPopup.jsx`
  - [x] Mount in `ApplicantLayout.jsx`

- [x] **Phase 4 — Applicant: Fee Breakdown During Online Payment**
  - [x] Enhance Payment Card in `StatusTracker.jsx` with collapsible breakdown
  - [x] Verify layout and mobile responsiveness
  - [x] Test PayMongo integration still works perfectly

- [x] **Phase 5 — BPLO: Certificate Ready Notification with Notes**
  - [x] Database migration for `cert_notified_at` and `cert_notes`
  - [x] Create `POST /api/bplo/applications/:app_no/notify-ready` endpoint
  - [x] Configure `CERT_READY_NOTIFICATION` email template
  - [x] Build `CompletedQueue.jsx` for BPLO
  - [x] Add "Completed" sidebar item to BPLO Layout

- [x] **Phase 6 — UX Improvements, Auto-OR, Filters & Accordion**
  - [x] 6.1 Pop-up notifications for ALL status updates with timespan
  - [x] 6.2 Email on every status update with timestamp
  - [x] 6.3 Auto-generate OTC receipt/OR number (no manual input)
  - [x] 6.4 BPLO Dashboard status filter dropdown
  - [x] 6.5 Fee Schedule collapsible accordion sections
  - [x] 6.6 Clearance Queue status filter dropdown

- [ ] **Phase 7 — Final Integration Testing**
  - [ ] Run through all 103 frontend test cases manually
