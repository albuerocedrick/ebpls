# eBPLS Client Frontend Test Document & User Acceptance Testing (UAT) Guide

**Project:** Electronic Business Permits and Licensing System (eBPLS)  
**Deployment:** Municipality of Liliw, Laguna  
**Document Version:** 1.0 (Comprehensive Client Specification & UAT Guide)  
**Date:** November 8, 2026  
**Applicable Baseline Documents:**  
- [eBPLS Approved Final System Revisions Specification v4.0](file:///c:/projects/eBPLS/system-planning/eBPLS_Suggested_Revisions_Proposal.md)  
- [eBPLS Main Implementation Plan: Approved 13 System Revisions v2.0](file:///c:/projects/eBPLS/system-planning/eBPLS_Approved_Revisions_Main_Implementation_Plan.md)  

---

## 1. Executive Summary & Purpose

This document provides the Municipal Government of Liliw, the Project Adviser, and Quality Assurance reviewers with an end-to-end testing specification for the modernized **Electronic Business Permits and Licensing System (eBPLS)**.

This guide is divided into two core sections:
1. **System Changes Matrix (Pre-Change vs. Changed / Post-Revision):** A structured comparison contrasting the legacy behavior against the modernized operational workflows across all 13 approved system revisions.
2. **Comprehensive Frontend Test Cases (UAT Plan):** An exhaustive, role-by-role test manual detailing exact preconditions, step-by-step procedures, test inputs, expected UI behaviors, and acceptance criteria for formal sign-off.

---

# SECTION 1: SYSTEM CHANGES SPECIFICATION (PRE-CHANGE VS. CHANGED)

The following tables detail the 13 approved functional and architectural revisions, comparing legacy baseline operations (**Pre-Change**) with the deployed modernized workflows (**Changed / Post-Revision**).

---

### Module A: Applicant Experience & Business Registration

| # | Feature / Area | Pre-Change (Legacy Workflow) | Changed / Post-Revision (Modernized Workflow) |
|---|---|---|---|
| **1** | **Barangay Clearance Acquisition** | Required a separate dedicated **Barangay Module** with individual `Barangay_Officer` accounts across 33 barangays, a "Request via Municipality" digital queue, and in-person municipal hall endorsements. | **Pure Document Upload:** The Barangay Module and `Barangay_Officer` role are completely removed. Barangay Business Clearance is a standard mandatory upload slot in Step 4. Applicants upload their physical clearance; BPLO verifies it directly. |
| **2** | **Location Pinning & Map Navigation** | Applicants used an interactive Leaflet map component with draggable pins and GPS rooftop detection. Frequent false GPS drifts triggered *"Pin outside declared barangay"* polygon errors and failed submissions. | **Automated Barangay Centroid Pinning:** Draggable maps and manual GPS pins are completely removed. Selecting any of Liliw's 33 barangays instantly assigns the official municipal geographic centroid coordinates in the background. Zero boundary errors. |
| **3** | **Address Fields (City & Province)** | Editable free-text fields for City/Municipality and Province, leading to spelling variations (*"Liliw"*, *"Lilio"*, *"Laguna"*, *"Liliw Laguna"*) and database fragmentation. | **Hardcoded & Locked Boundaries:** City is permanently set to **"Liliw"** and Province is permanently set to **"Laguna"**. Applicant only fills in *Barangay* (dropdown) and *Street / Unit / Purok* (text input). Uniform address formatting. |
| **4** | **Property Tenancy & Documentation** | Fixed, static document checklist asking for generic property clearances regardless of whether the business space was rented, owned commercially, or operated inside a home. | **Dynamic Tenancy Selector:** Step 2 includes a 3-way Property Tenancy selector (`Rented`, `Owned Commercial`, `Owned Residential`). Step 4 dynamically tailors uploads (e.g., Contract of Lease for Rented; Building Permit for Owned Commercial). Non-applicable uploads are hidden. |
| **5** | **Multi-Unit / Stall Declaration** | Merchants renting multiple market stalls or commercial arcade units had to file separate applications for each stall, generating duplicate fees and multiple permits for a single business. | **Unified Multi-Stall Declaration:** In Step 3, applicants declare all units using a `[+ Add Unit / Stall Number]` tag component (e.g., *Stall 12, Stall 13*). Generates a single consolidated Tax Order of Payment and one Business Permit enumerating all units. |
| **6** | **Capital Determination & Foot-Traffic Guidance** | Uniform capital input with no commercial traffic context. Micro-enterprises in remote upland barangays were subjected to the same baseline expectations as bustling market vendors. | **Configurable Foot-Traffic Zoning Matrix:** Admin maintains 3 Foot-Traffic Zones (Zone 1: Prime Commercial ₱50k floor, 1.25x; Zone 2: Sub-Commercial ₱25k floor, 1.00x; Zone 3: Rural ₱10k floor, 0.80x). Step 3 renders an instant guidance banner advising applicants of their zone baseline. |

---

### Module B: BPLO Review & Inter-Office Clearances

| # | Feature / Area | Pre-Change (Legacy Workflow) | Changed / Post-Revision (Modernized Workflow) |
|---|---|---|---|
| **7** | **BPLO Review Actions & Decisions** | Fragmented multi-stage status workflows with nested sub-statuses (*"Pending Barangay"*, *"Under Initial Review"*, *"Clearance Review"*), causing processing delays. | **Streamlined Binary Review Workflow:** Consolidated to two primary buttons: `[Approve & Forward to Treasury]` (instantly assesses and locks file) and `[Disapprove / Return with Remarks]` (notifies applicant with specific document-level remarks for immediate re-upload). |
| **8** | **BPLO Location & Jurisdiction Verification** | Verifier screen embedded an interactive Leaflet map requiring officers to manually inspect GIS polygon boundaries, causing slow loading times and map tile rendering errors. | **High-Visibility Address & Zoning Card:** Leaflet map is completely removed. Verifier renders a clean, read-only Jurisdiction & Zoning card displaying formatted address, Foot-Traffic Zone badge, Tenancy status, and covered Stall numbers. Instant load (<500ms). |
| **9** | **Inter-Office Regulatory Clearances (MHO & BFP)** | Required external department officers (Sanitary/MHO and Fire/BFP) to hold separate user accounts, log in to individual portals, and sign off before permit progression, creating bottlenecks. | **Consolidated Regulatory Checklist & JIL Export:** BPLO acts as the Business One-Stop Shop (BOSS). Verifier includes a regulatory checklist for Sanitary and Fire safety based on uploaded certificates. The system generates a printable weekly **Joint Inspection List (JIL)** for routine physical audits. |

---

### Module C: Treasury Assessment & Cashiering

| # | Feature / Area | Pre-Change (Legacy Workflow) | Changed / Post-Revision (Modernized Workflow) |
|---|---|---|---|
| **10** | **Assessment Initiation** | Treasury officer had to open a separate "Pending Assessment" queue, click a manual *"Run Assessment Engine"* button, and wait for billing computation. | **Zero-Click Automated Trigger:** Manual "Run Assessment" button is completely removed. The moment BPLO clicks `[Approve & Forward]`, the backend calculation engine automatically fires, itemizes fees, applies zone multipliers, and transitions status to `Assessed`. |
| **11** | **Fee Amount Integrity & Exemptions** | Treasury assessment grid featured editable numeric text boxes where officers could arbitrarily overwrite fee amounts, creating audit vulnerability. | **100% Read-Only, COA-Compliant Grid:** Fee line items strictly mirror municipal tax ordinances and cannot be edited manually. Legitimate tax relief is handled via a formal **BMBE Exemption Switch** requiring uploaded DTI certificate validation and mandatory audit logging. |
| **12** | **Payment Processing Architecture** | Relied on third-party PayMongo API, credit card modals, and external webhooks. Suffered from gateway downtime, customer convenience fees, and dropped webhook states. | **Dual-Channel Payment (PayMongo Removed):** PayMongo is 100% eliminated. Replaced by: **(1) Over-The-Counter Cashier POS** for in-person cash/manager check, and **(2) Bank Transfer / GCash Proof Upload** where applicants upload deposit slips for Cashier verification. |
| **13** | **Status Reflection & Document Issuance** | Payment confirmation required manual status switching by staff. Digital permits and official receipts were not released until batch processing runs. | **Instant Status Update & Automated Document Release:** Confirming payment immediately shifts applicant status to **`PAID / COMPLETED`**. Status tracker instantly unlocks 1-click download buttons for tamper-evident **Official Business Permit PDF** (with QR code) and **Electronic Official Receipt (E-Resibo) PDF**. |

---

### Module D: Administrative & Reporting Tools

| # | Feature / Area | Pre-Change (Legacy Workflow) | Changed / Post-Revision (Modernized Workflow) |
|---|---|---|---|
| **—** | **Admin Master Data: Zoning Matrix** | Commercial zoning and rates were static or hardcoded in configuration files requiring developer intervention to alter fee multipliers or baseline capital. | **Interactive Master Data Editor:** In `MasterData.jsx`, Admins can create, edit, activate/deactivate location zones, update fee multipliers, and reassign any of the 33 barangays to different zones in real time. |
| **—** | **Joint Inspection List (JIL) PDF Export** | No standard consolidated mechanism for BPLO to notify sanitary and fire inspectors of newly approved businesses for post-permit compliance inspections. | **1-Click Weekly JIL Export:** Admin and BPLO dashboards feature an **"Export JIL"** button generating a clean, landscape PDF report with business names, addresses, contacts, sanitary/fire checkboxes, and official signatory blocks. |

---

# SECTION 2: FRONTEND TEST CASES (USER ACCEPTANCE TESTING PLAN)

---

## Test Suite 1: Applicant Portal & UAF Registration Wizard

### TC-APP-01: Step 2 Address Form — Automated Centroid Pinning & Locked Boundaries
- **Module:** Applicant / Unified Application Form (UAF)
- **Target Screen:** `Step2_Location.jsx`
- **User Role:** `Applicant`
- **Preconditions:** User is logged in as an Applicant and is on Step 2 of the Business Registration Wizard.
- **Test Steps:**
  1. Inspect the **Province** and **City / Municipality** form fields.
  2. Verify that **Province** is fixed as *"Laguna"* and **City / Municipality** is fixed as *"Liliw"*. Attempt to type or alter these inputs.
  3. Select **Barangay** as *"Rizal (Poblacion)"*.
  4. Inspect the location screen for map elements.
  5. Enter House / Street address: *"124 Gat Tayaw Street"*.
  6. Click `[Next Step: Business Details]`.
- **Expected Results:**
  - [x] Province and City fields are read-only / disabled and cannot be edited.
  - [x] No interactive Leaflet map, map tiles, draggable pin, or GPS button appears.
  - [x] Selecting *"Rizal (Poblacion)"* automatically associates official coordinates (Lat: ~14.1303, Long: ~121.4371) in state without user manipulation.
  - [x] Wizard advances to Step 3 smoothly with zero polygon/boundary warning alerts.

---

### TC-APP-02: Step 2 Property Tenancy Selector & Dynamic Requirement Adaptation
- **Module:** Applicant / UAF Wizard
- **Target Screen:** `Step2_Location.jsx` → `Step4_Documents.jsx`
- **User Role:** `Applicant`
- **Preconditions:** Applicant is on Step 2.
- **Test Steps:**
  1. Under **Property Tenancy**, select `[X] Rented / Leased Space`.
  2. Complete Step 2 and navigate forward to Step 4 (Documentary Requirements).
  3. Inspect the required upload slots in Step 4.
  4. Click `[Previous Step]` back to Step 2, change selection to `[X] Owned (Commercial Building / Property)`.
  5. Navigate back to Step 4 and inspect the required upload slots.
  6. Return to Step 2, select `[X] Owned (Residential / Home-Based)`, and re-inspect Step 4.
- **Expected Results:**
  - [x] When **Rented** is selected: Step 4 mandates upload slots for **Contract of Lease** and **Lessor's Business Permit**.
  - [x] When **Owned Commercial** is selected: Step 4 mandates **Building Permit / Certificate of Occupancy** or **Real Property Tax Declaration**. Rented documents are completely hidden.
  - [x] When **Owned Residential** is selected: Step 4 requires **Zoning Clearance Compliance** documentation.
  - [x] No applicant sees non-applicable property upload dropzones.

---

### TC-APP-03: Step 3 Business Activities, Foot-Traffic Zone Guidance & Multi-Stalls
- **Module:** Applicant / UAF Wizard
- **Target Screen:** `Step3_Activities.jsx`
- **User Role:** `Applicant`
- **Preconditions:** Applicant selected *"Rizal (Poblacion)"* (Zone 1) in Step 2 and is now on Step 3.
- **Test Steps:**
  1. Inspect the top information banner on Step 3.
  2. Locate the **Units / Stalls** section. Click `[+ Add Unit / Stall Number]`.
  3. Input *"Stall 12"*, click Add. Input *"Stall 13"*, click Add.
  4. Select a primary business line (e.g., *Retail - Footwear & Slippers*).
  5. Inspect the **Capital Investment** input field and observe the dynamic zoning notice.
  6. Input Capital Investment as `₱60,000.00`.
  7. Click `[Next Step: Upload Documents]`.
- **Expected Results:**
  - [x] Dynamic foot-traffic banner explicitly displays: *"Zone 1 (Prime Commercial) — Recommended Minimum Capital: ₱50,000.00"*.
  - [x] Added stalls appear as removable chips/tags (`Stall 12`, `Stall 13`).
  - [x] Form successfully validates and preserves all stall numbers into application state.

---

### TC-APP-04: Step 4 Pure Upload for Barangay Business Clearance
- **Module:** Applicant / UAF Wizard
- **Target Screen:** `Step4_Documents.jsx`
- **User Role:** `Applicant`
- **Preconditions:** Applicant has completed Steps 1 to 3 and is on Step 4.
- **Test Steps:**
  1. Inspect the **Barangay Business Clearance** upload section.
  2. Verify there is **no** *"Request via Municipality"* button or toggle switch.
  3. Attempt to proceed without uploading Barangay Clearance.
  4. Upload a valid test clearance file (`sample_brgy_clearance.pdf` or `.png`, < 5MB).
  5. Upload all other required documents (DTI/SEC Registration, Owner ID, Contract of Lease).
  6. Click `[Next Step: Review & Submit]`.
- **Expected Results:**
  - [x] Barangay Business Clearance is rendered as a standard file dropzone.
  - [x] Attempting to proceed without uploading triggers a validation error: *"Barangay Business Clearance is required"*.
  - [x] Uploading a valid image or PDF displays a success badge and file preview thumbnail.
  - [x] Advance to Step 5 succeeds without external barangay routing.

---

### TC-APP-05: Step 5 Final Review & Unified Submission
- **Module:** Applicant / UAF Wizard
- **Target Screen:** `Step5_Review.jsx`
- **User Role:** `Applicant`
- **Preconditions:** All wizard steps 1–4 are completed.
- **Test Steps:**
  1. On Step 5 Review, inspect the **Business Location & Address** section.
  2. Verify formatted address displays: *"[Street], Brgy. Rizal (Poblacion), Liliw, Laguna"*.
  3. Verify **Tenancy Type** displays: *"Rented Commercial Space"*.
  4. Verify **Covered Stalls** lists: *"Stall 12, Stall 13"*.
  5. Check the declaration acknowledgement checkbox.
  6. Click `[Submit Application]`.
- **Expected Results:**
  - [x] Application submits atomically to the backend.
  - [x] Success modal displays the generated Application Reference Number (e.g., `APP-20261108-XXXX`).
  - [x] User is redirected to Applicant Status Tracker with status **`PENDING`**.

---

## Test Suite 2: Applicant Status Tracker & Proof of Payment Upload

### TC-APP-06: Status Tracker — Assessed Application & Payment Option Selection
- **Module:** Applicant / Status Tracker
- **Target Screen:** `StatusTracker.jsx`
- **User Role:** `Applicant`
- **Preconditions:** Application has been approved by BPLO and is in `FOR_PAYMENT` / `ASSESSED` status.
- **Test Steps:**
  1. Log in as the Applicant and open the Status Tracker for the application.
  2. Verify the status badge displays **`FOR PAYMENT`**.
  3. Inspect the itemized **Tax Order of Payment (TOP)** breakdown (Mayor's Permit, Garbage Fee, Sanitary Fee, etc.).
  4. Check the payment options displayed on the page.
  5. Verify that **NO PayMongo** buttons, credit card forms, or third-party payment modals appear.
- **Expected Results:**
  - [x] Itemized fees match municipal schedule with clear Total Amount Due.
  - [x] Two distinct payment options are presented:
    - **Option 1:** *Pay Over-The-Counter (Cashier POS) at Liliw Municipal Hall*.
    - **Option 2:** *Submit Bank Transfer / GCash Proof of Payment*.
  - [x] Zero references to PayMongo or external transaction processing fees.

---

### TC-APP-07: Bank Transfer / GCash Proof of Payment Submission
- **Module:** Applicant / Status Tracker
- **Target Screen:** `StatusTracker.jsx`
- **User Role:** `Applicant`
- **Preconditions:** Application is in `FOR_PAYMENT` status.
- **Test Steps:**
  1. Select the **"Submit Bank Transfer / GCash Proof of Payment"** tab.
  2. Select Payment Channel: `GCash` (or `Bank Transfer - Landbank`).
  3. Enter Payment Reference Number: *"GCASH-9876543210"*.
  4. Select Payment Date: Today's date.
  5. Upload a receipt screenshot / deposit slip (`deposit_slip.jpg` or `.pdf`).
  6. Click `[Submit Proof of Payment]`.
- **Expected Results:**
  - [x] System validates inputs (channel, reference number, date, and file).
  - [x] File uploads securely to the `proof-of-payments` storage bucket.
  - [x] Screen immediately updates status badge to **`PAYMENT VERIFICATION PENDING`**.
  - [x] Banner indicates: *"Your deposit slip has been submitted and is currently being verified by the Treasury Office."*

---

### TC-APP-08: Instant Payment Reflection & 1-Click Document Downloads
- **Module:** Applicant / Status Tracker
- **Target Screen:** `StatusTracker.jsx`
- **User Role:** `Applicant`
- **Preconditions:** Treasury Cashier has confirmed payment (via OTC or Verified Proof).
- **Test Steps:**
  1. Open or refresh the Status Tracker for the confirmed application.
  2. Inspect the main status badge and timeline.
  3. Verify the display of the generated **Official Receipt (OR) Number** (format: `OTC-YYYYMMDD-XXXXXX`).
  4. Click `[Download Official Business Permit (PDF)]`.
  5. Click `[Download Official Receipt / E-Resibo (PDF)]`.
- **Expected Results:**
  - [x] Status badge is bright green: **`PAID`** / **`COMPLETED`**.
  - [x] Both download buttons are active and unlocked.
  - [x] Business Permit PDF opens in a new tab with official municipal header, business name, address, covered stalls, and QR verification code.
  - [x] E-Resibo PDF opens with canonical OR number and complete itemized fee breakdown.

---

## Test Suite 3: BPLO Review & Split-Screen Verifier

### TC-BPLO-01: BPLO Application Queue & Fast Verifier Loading
- **Module:** BPLO Module
- **Target Screen:** `Dashboard.jsx` → `SplitScreenVerifier.jsx`
- **User Role:** `BPLO_Officer`
- **Preconditions:** Applications exist in `PENDING` or `UNDER_REVIEW` status.
- **Test Steps:**
  1. Log in as BPLO Officer and open BPLO Dashboard.
  2. Verify queue lists pending applications with applicant names, business names, and submission timestamps.
  3. Click `[Review Application]` on a pending application.
  4. Observe the loading time of `SplitScreenVerifier.jsx`.
  5. Verify network requests in browser developer tools (F12).
- **Expected Results:**
  - [x] Dashboard loads accurately with quick filter and sort options.
  - [x] Split-Screen Verifier opens in under 500ms.
  - [x] Zero network requests to `unpkg.com/leaflet`, `tile.openstreetmap.org`, or map CDN dependencies.

---

### TC-BPLO-02: Address & Zoning Jurisdiction Summary Card Inspection
- **Module:** BPLO Module
- **Target Screen:** `SplitScreenVerifier.jsx`
- **User Role:** `BPLO_Officer`
- **Preconditions:** BPLO officer is reviewing an application with tenancy and multiple stalls.
- **Test Steps:**
  1. On the left inspection panel, locate the **Jurisdiction & Zoning Card**.
  2. Inspect the declared establishment address.
  3. Inspect the **Location Zone** badge and multiplier.
  4. Inspect the **Tenancy Type** badge.
  5. Inspect the **Covered Stalls** section.
- **Expected Results:**
  - [x] Address is formatted cleanly: *124 Gat Tayaw St., Brgy. Rizal (Poblacion), Liliw, Laguna*.
  - [x] Zone badge displays: *"Zone 1 (Prime Commercial)"* with rate multiplier `1.25x`.
  - [x] Tenancy badge displays: *"Rented Commercial Space"*.
  - [x] Stalls section explicitly lists: *"Stall 12, Stall 13"*.
  - [x] No map canvas or polygon diagnostic panel is present.

---

### TC-BPLO-03: Consolidated Regulatory Clearances Checklist (MHO & BFP)
- **Module:** BPLO Module
- **Target Screen:** `SplitScreenVerifier.jsx`
- **User Role:** `BPLO_Officer`
- **Preconditions:** BPLO officer is reviewing an application with attached health and fire documents.
- **Test Steps:**
  1. Locate the **Regulatory Clearances Section** in the left review pane.
  2. Review the Sanitary / Health Inspection line.
  3. Review the Fire Safety Inspection Certificate (FSIC / BFP) line.
  4. On the right preview panel, click and verify the applicant's uploaded Sanitary permit and Fire certificate.
  5. Check `[X] Health & Sanitary Clearance Verified`.
  6. Check `[X] Fire Safety (BFP) Verified / Endorsed for Post-Audit`.
- **Expected Results:**
  - [x] Checkboxes respond smoothly with clear visual check state.
  - [x] Right pane displays document previews with full zoom and rotation controls.
  - [x] Checklist state persists and unblocks the primary approval action.

---

### TC-BPLO-04: Binary Action — Disapprove / Return with Required Remarks
- **Module:** BPLO Module
- **Target Screen:** `SplitScreenVerifier.jsx`
- **User Role:** `BPLO_Officer`
- **Preconditions:** BPLO officer is reviewing an application with an illegible or deficient document.
- **Test Steps:**
  1. In the document checklist, mark one document (e.g., Contract of Lease) as `Deficient`.
  2. Click the secondary action button: `[Disapprove / Return with Remarks]`.
  3. In the modal, leave the remarks text box empty and click `[Confirm Return]`.
  4. Observe validation response.
  5. Enter remarks: *"Contract of lease is illegible. Please upload a clear, signed copy with notary seal."*
  6. Click `[Confirm Return]`.
- **Expected Results:**
  - [x] Attempting to return without remarks is blocked with validation error: *"Return remarks are required"*.
  - [x] Submitting valid remarks transitions application status to **`RETURNED`**.
  - [x] Officer is returned to BPLO queue with confirmation toast: *"Application returned to applicant for corrections."*

---

### TC-BPLO-05: Binary Action — Approve & Forward to Treasury (Auto-Assessment)
- **Module:** BPLO Module
- **Target Screen:** `SplitScreenVerifier.jsx`
- **User Role:** `BPLO_Officer`
- **Preconditions:** All submitted documents and regulatory items are checked as Verified.
- **Test Steps:**
  1. Verify all checklist items show green verified badges.
  2. Click the primary button: `[Approve & Forward to Treasury]`.
  3. Observe system behavior and confirmation alerts.
  4. Log in or inspect the Treasury module for this application.
- **Expected Results:**
  - [x] Application data immediately locks against edits.
  - [x] System executes automated fee calculation in the background.
  - [x] Application transitions directly to **`ASSESSED`** (or **`FOR PAYMENT`**).
  - [x] Record immediately appears in the Treasury Cashier queue with zero manual intervention.

---

## Test Suite 4: Treasury Assessment & Cashier POS

### TC-TRS-01: Zero-Click Automated Assessment Grid (No Manual "Run" Button)
- **Module:** Treasury Module
- **Target Screen:** `AssessmentGrid.jsx`
- **User Role:** `Treasury_Officer`
- **Preconditions:** An application has just been approved by BPLO.
- **Test Steps:**
  1. Log in as Treasury Officer and navigate to Assessment Grid for the approved application.
  2. Inspect the screen on initial load.
  3. Look for any button labelled *"Run Assessment Engine"* or *"Calculate Fees"*.
  4. Inspect the itemized fee table.
- **Expected Results:**
  - [x] The assessment grid is already 100% calculated and populated upon initial page load.
  - [x] The manual *"Run Assessment Engine"* button is completely absent.
  - [x] Line items accurately reflect the business activity, floor area, and the 1.25x (or applicable) Zone multiplier.

---

### TC-TRS-02: Read-Only Fee Line Items & Tamper-Proof Audit Compliance
- **Module:** Treasury Module
- **Target Screen:** `AssessmentGrid.jsx`
- **User Role:** `Treasury_Officer`
- **Preconditions:** Treasury officer is viewing an assessed application.
- **Test Steps:**
  1. Click on fee amount cells (e.g., Mayor's Permit Fee, Garbage Fee, Regulatory Fees).
  2. Attempt to double click or type new numbers into the amounts.
  3. Inspect the DOM elements using browser developer tools.
- **Expected Results:**
  - [x] All fee values are rendered as non-editable static typography mirroring the municipal revenue ordinance.
  - [x] There are no editable text inputs, sliders, or arbitrary discount fields.
  - [x] Total Amount Due is strictly immutable.

---

### TC-TRS-03: BMBE Statutory Tax Exemption Switch & Audit Trail
- **Module:** Treasury Module
- **Target Screen:** `AssessmentGrid.jsx`
- **User Role:** `Treasury_Officer`
- **Preconditions:** Application belongs to a registered micro-enterprise with a valid DTI BMBE Certificate.
- **Test Steps:**
  1. Locate the **BMBE Statutory Exemption** section.
  2. Toggle `[Apply BMBE Tax Exemption]`.
  3. In the prompted dialog, enter the DTI BMBE Registration Number and select the verified DTI BMBE certificate upload.
  4. Click `[Confirm BMBE Exemption]`.
  5. Inspect the updated Tax Order of Payment.
- **Expected Results:**
  - [x] Local Business Tax line item immediately recalculates to **₱0.00** with an *"Exempt (BMBE RA 9178)"* badge.
  - [x] Regulatory fees (Sanitary, Garbage, Mayor's Permit) remain intact and are not unlawfully zeroed out.
  - [x] An irreversible audit log entry is recorded with the officer's ID, timestamp, and BMBE certificate reference.

---

### TC-TRS-04: Cashier POS — Tab 1: Over-the-Counter (OTC) Cash & Auto Change
- **Module:** Treasury Cashier POS
- **Target Screen:** `CashierPOS.jsx` (Tab 1: Over-the-Counter POS)
- **User Role:** `Treasury_Officer`
- **Preconditions:** Applicant arrives at Municipal Hall to pay for application with Total Due = ₱2,350.00.
- **Test Steps:**
  1. Open Cashier POS. Select Tab 1: **"Over-the-Counter (OTC) POS"**.
  2. Search / select the application number.
  3. Verify Total Due displays `₱2,350.00`.
  4. In the **Cash Tendered** input, enter `₱2,000.00` (insufficient). Observe button state.
  5. Update **Cash Tendered** to `₱3,000.00`.
  6. Observe the calculated **Change Due**.
  7. Click `[Confirm Payment & Issue OR]`.
- **Expected Results:**
  - [x] When tendered amount is insufficient, the Confirm button is disabled with notice: *"Insufficient cash tendered"*.
  - [x] When `₱3,000.00` is entered, Change Due instantly displays `₱650.00`.
  - [x] Confirming payment generates a canonical OR Number (`OTC-YYYYMMDD-XXXXXX`).
  - [x] Application transitions to **`COMPLETED`** / **`PAID`** immediately.

---

### TC-TRS-05: Cashier POS — Tab 2: Bank Transfer / GCash Proofs Inspection
- **Module:** Treasury Cashier POS
- **Target Screen:** `CashierPOS.jsx` (Tab 2: Bank Transfer / GCash Proofs)
- **User Role:** `Treasury_Officer`
- **Preconditions:** Applicants have submitted deposit slips via their Status Trackers.
- **Test Steps:**
  1. In Cashier POS, click Tab 2: **"Bank Transfer / GCash Proofs"**.
  2. Observe the pending queue counter badge on the tab header.
  3. Test the search bar by searching for an applicant's name or application number.
  4. Test the channel filter tabs: click `GCash`, then `Bank Transfer`, then `ALL`.
  5. Click on an item in the left queue list.
  6. Inspect the right preview panel.
- **Expected Results:**
  - [x] Tab badge displays accurate count of pending deposit slips.
  - [x] Queue filters instantly by search keyword and payment channel.
  - [x] Right pane renders a high-resolution, side-by-side interactive document preview (image or PDF).
  - [x] Transaction details display: Application No, Reference No, Payment Date, Amount Due, and Applicant Name.

---

### TC-TRS-06: Cashier POS — Tab 2: Proof Verification (Approve vs. Reject)
- **Module:** Treasury Cashier POS
- **Target Screen:** `CashierPOS.jsx` (Tab 2: Bank Transfer / GCash Proofs)
- **User Role:** `Treasury_Officer`
- **Preconditions:** Officer is inspecting a submitted deposit slip on Tab 2.
- **Test Steps:**
  - **Scenario A: Valid Proof Confirmation:**
    1. Select a verified deposit slip that matches municipal bank records.
    2. Click `[Confirm Payment & Issue OR]`.
    3. Observe confirmation dialog and result.
  - **Scenario B: Fraudulent / Unreadable Proof Rejection:**
    4. Select an invalid or fraudulent deposit slip.
    5. Click `[Reject / Return Deposit Slip]`.
    6. In the rejection modal, attempt to submit without remarks.
    7. Enter remarks: *"Deposit reference number does not match municipal Landbank records. Please provide validated bank receipt."*
    8. Click `[Confirm Rejection]`.
- **Expected Results:**
  - [x] **Scenario A:** Issues canonical OR number, marks transaction verified, moves application to `COMPLETED`, sends email notification, and removes item from pending queue.
  - [x] **Scenario B:** Blocks submission without remarks. Submitting valid remarks marks transaction `Rejected`, reverts application status to `FOR_PAYMENT`, and updates applicant portal with the rejection notice.

---

## Test Suite 5: Admin Master Data & Inter-Agency Reporting

### TC-ADM-01: Admin Master Data — Foot-Traffic Location Zones CRUD
- **Module:** Admin Module
- **Target Screen:** `MasterData.jsx`
- **User Role:** `Admin`
- **Preconditions:** User is logged in as an Admin.
- **Test Steps:**
  1. Navigate to Admin Console → **Master Data**.
  2. Select the **Location Zones** tab.
  3. Verify the 3 default zones exist:
     - *Zone 1 (Prime Commercial)*: Min Capital ₱50,000.00 / Multiplier 1.25x
     - *Zone 2 (Sub-Commercial)*: Min Capital ₱25,000.00 / Multiplier 1.00x
     - *Zone 3 (Rural / Upland)*: Min Capital ₱10,000.00 / Multiplier 0.80x
  4. Click `[Edit]` on Zone 2. Change fee multiplier to `1.05x` and click `[Save]`.
  5. Refresh page and verify persistence.
- **Expected Results:**
  - [x] All 3 foot-traffic zones display correctly with traffic levels, baseline floors, and multipliers.
  - [x] Edits save to the database in real time and persist across page refreshes.
  - [x] Audited changes are recorded in Admin audit logs.

---

### TC-ADM-02: Admin Master Data — Barangay Zone Reassignment & Centroid Editing
- **Module:** Admin Module
- **Target Screen:** `MasterData.jsx`
- **User Role:** `Admin`
- **Preconditions:** Admin is on Master Data → Barangays tab.
- **Test Steps:**
  1. Inspect the list of all 33 Liliw barangays.
  2. Locate Barangay *"Bongkol"*.
  3. Click `[Edit Barangay]`.
  4. Change its assigned zone from Zone 3 to **Zone 2**.
  5. Verify that latitude and longitude coordinate fields remain intact.
  6. Click `[Save Changes]`.
- **Expected Results:**
  - [x] Barangay list enumerates all 33 official Liliw barangays without omissions.
  - [x] Zone assignment updates immediately.
  - [x] When a new applicant selects *Bongkol*, the system automatically applies Zone 2 rates and guidance.

---

### TC-ADM-03: Joint Inspection List (JIL) PDF Report Export
- **Module:** Admin / BPLO Module
- **Target Screen:** `AdminDashboard.jsx` and `Dashboard.jsx` (BPLO)
- **User Role:** `Admin` or `BPLO_Officer`
- **Preconditions:** Approved businesses exist in the system.
- **Test Steps:**
  1. On the Admin Dashboard or BPLO Dashboard header, locate the **"Export JIL"** button.
  2. Click `[Export JIL]`.
  3. Verify the browser triggers a new tab or downloads `joint-inspection-list.pdf`.
  4. Open and inspect the generated PDF document.
- **Expected Results:**
  - [x] PDF opens cleanly in landscape orientation with official Liliw municipal header.
  - [x] Report title reads: *"JOINT INSPECTION LIST (JIL) — BPLO / MHO / BFP PHYSICAL AUDIT"*.
  - [x] Table includes columns: `#`, `Application No`, `Business Name`, `Address / Barangay`, `Contact / Owner`, `MHO Sanitary Inspection [ ]`, and `BFP Fire Safety Inspection [ ]`.
  - [x] Physical inspection check-squares are rendered for manual field auditing.
  - [x] Bottom of document includes official 3-signature block for BPLO Officer, Municipal Health Officer, and BFP Fire Marshal.

---

## Test Suite 6: Security, Navigation & Route Retirement

### TC-SEC-01: Complete Retirement of Barangay Module Routes
- **Module:** System Security & Routing
- **Target Screen:** Browser URL Navigation
- **User Role:** Any (Guest, Applicant, Staff)
- **Preconditions:** Server and frontend are running.
- **Test Steps:**
  1. In the browser address bar, attempt to navigate to `/barangay/queue`.
  2. Attempt to navigate to `/barangay/clearances`.
  3. Inspect the sidebar / navigation menus for any "Barangay" links.
- **Expected Results:**
  - [x] Direct URL navigation to legacy barangay routes redirects to 404 Not Found or default dashboard.
  - [x] No sidebar or navigation menu contains any reference to Barangay Officer or Barangay Clearances.
  - [x] API requests to `/api/barangay/*` return HTTP `404 Not Found`.

---

### TC-SEC-02: Complete Removal of PayMongo Endpoints & Assets
- **Module:** System Security & Payment Architecture
- **Target Screen:** Browser Developer Tools & Application Bundles
- **User Role:** Any
- **Preconditions:** Frontend production build has completed.
- **Test Steps:**
  1. Navigate to `/payment/success` and `/payment/cancel`.
  2. Search browser console and network tabs for `paymongo.com`.
  3. Test backend endpoint: send a GET/POST request to `/api/webhooks/paymongo`.
- **Expected Results:**
  - [x] Legacy callback routes `/payment/success` and `/payment/cancel` are completely retired (404 / redirect).
  - [x] Zero network requests or script dependencies connect to PayMongo servers.
  - [x] Backend webhook routes return HTTP `404 Not Found`.

---

### TC-SEC-03: Role-Based Access Control (RBAC) Guard Enforcement
- **Module:** System Security
- **Target Screen:** Navigation Guards
- **User Role:** `Applicant` attempting Staff Routes
- **Preconditions:** User is logged in with `Applicant` role.
- **Test Steps:**
  1. As an Applicant, attempt to access `/bplo/dashboard`.
  2. Attempt to access `/treasury/cashier`.
  3. Attempt to access `/admin/master-data`.
- **Expected Results:**
  - [x] All unauthorized navigation attempts are intercepted by `RoleGuard`.
  - [x] User is redirected to their own Applicant Dashboard with error alert: *"Access denied: Unauthorized role."*
  - [x] Backend API requests with invalid role tokens return HTTP `403 Forbidden`.

---

# SECTION 3: UAT EXECUTION TRACKING & SIGN-OFF SHEET

| Test Case ID | Test Case Title | Target Module | Pass / Fail | Tested By | Date Tested | Remarks / Notes |
|---|---|:---:|:---:|---|:---:|---|
| **TC-APP-01** | Step 2 Auto-Centroid & Locked Address | Applicant UAF | | | | |
| **TC-APP-02** | Step 2 Property Tenancy & Checklist | Applicant UAF | | | | |
| **TC-APP-03** | Step 3 Zoning Guidance & Multi-Stalls | Applicant UAF | | | | |
| **TC-APP-04** | Step 4 Pure Barangay Clearance Upload | Applicant UAF | | | | |
| **TC-APP-05** | Step 5 Final Review & Submission | Applicant UAF | | | | |
| **TC-APP-06** | Status Tracker - Assessment & TOP | Applicant Status | | | | |
| **TC-APP-07** | Proof of Payment Upload (Bank/GCash) | Applicant Status | | | | |
| **TC-APP-08** | Instant Status & PDF Document Releases | Applicant Status | | | | |
| **TC-BPLO-01** | Queue & Fast Verifier Load (<500ms) | BPLO Verifier | | | | |
| **TC-BPLO-02** | Address & Zoning Card Inspection | BPLO Verifier | | | | |
| **TC-BPLO-03** | Regulatory Checklist (MHO & BFP) | BPLO Verifier | | | | |
| **TC-BPLO-04** | Disapprove / Return with Remarks | BPLO Verifier | | | | |
| **TC-BPLO-05** | Approve & Forward (Auto-Assessment) | BPLO Verifier | | | | |
| **TC-TRS-01** | Zero-Click Automated Assessment Grid | Treasury Assessment | | | | |
| **TC-TRS-02** | 100% Read-Only Fee Line Items | Treasury Assessment | | | | |
| **TC-TRS-03** | BMBE Statutory Tax Exemption Switch | Treasury Assessment | | | | |
| **TC-TRS-04** | Cashier POS Tab 1: OTC Cash & Change | Treasury Cashier | | | | |
| **TC-TRS-05** | Cashier POS Tab 2: Proof Queue & Preview | Treasury Cashier | | | | |
| **TC-TRS-06** | Cashier POS Tab 2: Confirm OR vs Reject | Treasury Cashier | | | | |
| **TC-ADM-01** | Master Data: Location Zones CRUD | Admin Console | | | | |
| **TC-ADM-02** | Master Data: Barangay Reassignment | Admin Console | | | | |
| **TC-ADM-03** | Joint Inspection List (JIL) PDF Export | Admin & BPLO | | | | |
| **TC-SEC-01** | Barangay Module Route Retirement (404) | Security & Routing | | | | |
| **TC-SEC-02** | PayMongo Removal & Webhook Purge (404) | Security & Routing | | | | |
| **TC-SEC-03** | Strict RBAC Route Guard Enforcement | Security & Routing | | | | |

---

### Official Client Sign-Off

**Tested and Accepted By:**

____________________________________________  
**BPLO Officer / Representative**  
Municipality of Liliw, Laguna  
Date: ________________________  

____________________________________________  
**Municipal Treasurer / Representative**  
Municipality of Liliw, Laguna  
Date: ________________________  

____________________________________________  
**Project Adviser / Technical Lead**  
eBPLS Project Team  
Date: ________________________  
