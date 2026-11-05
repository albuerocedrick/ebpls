# eBPLS Approved Final System Revisions Specification: Complete Operational Workflows

**Project:** Electronic Business Permits and Licensing System (eBPLS)  
**Deployment:** Municipality of Liliw, Laguna  
**Document Version:** 4.0 (Fully Approved & Actionable Specification)  
**Date:** November 5, 2026  

---

## Executive Summary

Following official consultations and stakeholder reviews with the Municipal Government of Liliw and the project adviser (Sir Jordan), **ALL thirteen (13) proposed system revisions and all recommended Option 1 (Option A) architectural designs have been OFFICIALLY APPROVED.**

There are no remaining pending options, ambiguities, or undecided items. This document serves as the final, authoritative technical and operational specification for the eBPLS codebase across the **Applicant**, **BPLO**, **Treasury**, and **Admin** modules. Every item includes its official decision and an exhaustive, step-by-step **"How It Works"** workflow.

---

# APPROVED SYSTEM REVISIONS SPECIFICATION

---

## MODULE A: APPLICANT EXPERIENCE & BUSINESS REGISTRATION

---

### 1. Removal of Barangay Module $\rightarrow$ Shift to Pure Document Upload
* **Status:** **APPROVED (Final)**
* **Official Decision:** The dedicated Barangay Module, the `Barangay_Officer` user role, and separate barangay queues are **completely removed**.
* **Rationale:** Eliminates redundant municipal hall walk-ins and simplifies the administrative overhead of managing separate barangay officer accounts across 33 barangays.
* **How It Works (Step-by-Step):**
  1. **Applicant View (Step 4 - Documentary Requirements):** The applicant sees **"Barangay Business Clearance"** as one of the standard mandatory document upload slots (alongside DTI/SEC registration and Owner's Valid ID).
  2. **File Upload:** The applicant uploads a clear photo or PDF of their physical Barangay Clearance issued by their respective barangay hall. (The previous *"Request via municipality"* toggle button is completely removed).
  3. **BPLO Split-Screen Inspection:** When the BPLO Officer opens the application in the Split-Screen Verifier, the uploaded Barangay Clearance appears directly in the document viewer alongside other submitted requirements.
  4. **Direct Verification:** BPLO clicks `[Verify Document]`. No separate barangay login, digital clearance creation, or external endorsement queue is required.

---

### 2. Automated Area Pinned Location (Barangay Centroid)
* **Status:** **APPROVED (Final)**
* **Official Decision:** Manual map pin dragging, GPS pin manipulation, and rooftop-exact geolocation checking are **completely removed**.
* **Rationale:** Commercial establishments in rural and provincial settings frequently trigger false boundary mismatch warnings due to GPS drift and unmapped roads. Area-based centroid pinning guarantees 100% submission success while maintaining proper jurisdiction tracking.
* **How It Works (Step-by-Step):**
  1. **Applicant View (Step 2 - Location):** The applicant selects their Barangay from the dropdown list of 33 official Liliw barangays (e.g., *Rizal (Poblacion)*).
  2. **Instant Automated Pinning:** The system immediately and automatically assigns the official geographic center coordinates (Centroid) of Barangay Rizal to the application record in the background.
  3. **No Map Dragging:** The applicant does not have to drag pins on a map or worry about GPS precision on mobile phones or desktops.
  4. **Identical BPLO View:** When BPLO reviews the application, the system displays the exact same automated area coordinates for Barangay Rizal.
  5. **Zero Polygon Errors:** Completely eliminates boundary mismatch warnings (e.g., *"Pin is outside declared barangay"*), allowing seamless validation.

---

### 3. Location Form: Hardcoded City & Province
* **Status:** **APPROVED (Final)**
* **Official Decision:** Editable text input fields for City/Municipality and Province are **permanently removed**.
* **Rationale:** The system is exclusively deployed for the Municipality of Liliw, Laguna. Manual text inputs for city/province frequently introduced spelling discrepancies and database fragmentation.
* **How It Works (Step-by-Step):**
  1. **Applicant View (Step 2 - Location):** The applicant only fills out two clean location inputs:
     * **Barangay:** (Standardized dropdown of the 33 official Liliw barangays).
     * **Street / Building / Unit No. / Purok:** (Text input for physical establishment address).
  2. **Automatic Schema Assignment:** The system permanently and automatically sets `Province = "Laguna"` and `City/Municipality = "Liliw"` in the database record.
  3. **Display:** On both the Applicant and Staff dashboards, the address is automatically formatted consistently as: *[Street/Purok], [Barangay], Liliw, Laguna*.

---

### 4. Property Tenancy & Building Documentation: Dynamic Tenancy Selector
* **Status:** **APPROVED (Option 1 Adopted)**
* **Official Decision:** Introduce a **Dynamic Tenancy Selector in Step 2** that automatically customizes the documentary requirements in Step 4 based on property ownership.
* **Rationale:** Prevents applicant confusion and prevents unnecessary rejections by ensuring applicants are only asked for building and tenancy documents that match their actual legal occupancy.
* **How It Works (Step-by-Step):**
  1. **Applicant Selection (Step 2 - Location):** The applicant selects their **Property Tenancy**:
     * `[ ] Rented / Leased Space`
     * `[ ] Owned (Commercial Building / Property)`
     * `[ ] Owned (Residential / Home-Based)`
  2. **Dynamic Checklist Adaptation (Step 4 - Documents):** The system dynamically updates the required document dropzones:
     * **If Rented:** Step 4 automatically mandates upload slots for *Contract of Lease* and *Lessor's Business Permit*.
     * **If Owned Commercial:** Step 4 automatically mandates upload slots for *Building Permit / Certificate of Occupancy* or *Real Property Tax Declaration*.
     * **If Owned Residential:** Step 4 flags the record for *Zoning Clearance Compliance*.
  3. **Clean UX:** Non-applicable documents are completely hidden from the applicant's view, preventing accidental "N/A" file uploads.

---

### 5. Multiple Units in One Application: Multi-Stall / Sub-Unit Declaration
* **Status:** **APPROVED (Option 1 Adopted)**
* **Official Decision:** Allow commercial stallholders and multi-unit tenants operating in the same commercial building or public market to declare all units under a **single application and single permit**.
* **Rationale:** Resolves the operational burden for merchants in public markets or commercial arcades who rent multiple adjacent stalls, avoiding duplicate filings and multiple permit fees for one unified business.
* **How It Works (Step-by-Step):**
  1. **Applicant Declaration (Step 3 - Business Details):** The applicant specifies their primary commercial address (e.g., *Liliw Public Market* or *Gat Tayaw Commercial Arcade*).
  2. **Sub-Unit Entries:** The applicant clicks `[+ Add Unit / Stall Number]`, declaring individual identifiers (e.g., *Stalls 12, 13, and 14*) and entering the aggregated floor area ($m^2$).
  3. **Consolidated Assessment:** The Treasury fee engine automatically calculates the Mayor's Permit and garbage fees based on the aggregated stalls and total floor area.
  4. **Single Unified Permit:** The generated Business Permit and Tax Order of Payment (TOP) clearly enumerate all covered stall numbers under one legal establishment.

---

### 6. Capital Determination via Configurable Foot-Traffic Zoning Matrix
* **Status:** **APPROVED (Final)**
* **Official Decision:** Capital validation and fee assessment will account for commercial foot traffic, implemented as a **100% Configurable Master Data Matrix** in the database.
* **Rationale:** Businesses in high-density areas (such as the market or footwear district) generate significantly higher foot traffic and revenue than home-based or rural stores. Making this matrix configurable allows the LGU to adjust baseline rates anytime without code updates.
* **How It Works (Step-by-Step):**
  1. **Admin Master Data Configuration:**
     * Admin manages three (3) Foot-Traffic Zones via `location_zones`:
       * **Zone 1 (Prime Commercial / High Traffic):** Poblacion & Public Market $\rightarrow$ Min. Capital Floor: **₱50,000.00**; Rate Multiplier: **1.25**.
       * **Zone 2 (Sub-Commercial / Medium Traffic):** Provincial Highway / Main Road $\rightarrow$ Min. Capital Floor: **₱25,000.00**; Rate Multiplier: **1.00**.
       * **Zone 3 (Rural / Low Traffic):** Interior/Upland barangays $\rightarrow$ Min. Capital Floor: **₱10,000.00**; Rate Multiplier: **0.80**.
     * Admin can reassign any barangay's zone or edit the minimum capital baseline anytime via simple dropdowns in the Admin Console.
  2. **Applicant Guidance (Step 3 - Business Activities):**
     * When an applicant selects *Rizal (Poblacion)*, the system automatically detects **Zone 1**.
     * Under the Capital input field, a dynamic guidance banner appears:  
       > ℹ️ *Zone 1 (Prime Commercial): High foot-traffic area. Inirerekomendang minimum capital: ₱50,000.00.*
  3. **Assessment Engine Integration:**
     * The fee calculation engine applies the appropriate zonal baseline and rate multiplier, ensuring fair taxation between bustling commercial hubs and rural micro-enterprises.

---

## MODULE B: BPLO REVIEW & INTER-OFFICE VERIFICATION

---

### 7. BPLO Binary Review Workflow (`Approve` vs. `Disapprove`)
* **Status:** **APPROVED (Final)**
* **Official Decision:** Consolidate BPLO review actions into two clean, unambiguous binary decisions.
* **Rationale:** Streamlines municipal processing times, eliminating complex nested sub-statuses and expediting permit turnaround to under 24 hours.
* **How It Works (Step-by-Step):**
  1. **Split-Screen Review:** The BPLO officer inspects the applicant's declared information on the left panel and previews submitted documents on the right panel.
  2. **Decision 1 — `[Approve & Forward to Treasury]`:** If all documentary requirements are verified and valid, BPLO clicks this primary button. Application data immediately locks against edits, the automated assessment engine fires, and the file moves to Treasury.
  3. **Decision 2 — `[Disapprove / Return with Remarks]`:** If an upload is deficient (e.g., expired ID or illegible lease contract), BPLO selects the deficient document, inputs a specific correction remark, and clicks Return.
  4. **Instant Citizen Notification:** The applicant receives an automated email and in-app banner alert stating the exact remarks, allowing them to re-upload corrected documents without restarting the application or paying new fees.

---

### 8. BPLO Review UI: High-Visibility Address & Zoning Jurisdiction Card
* **Status:** **APPROVED (Option 1 Adopted)**
* **Official Decision:** Completely remove the Leaflet interactive map component and polygon auditing panel from the BPLO Split-Screen Verifier, replacing it with a structured **Jurisdiction & Zoning Card**.
* **Rationale:** Eliminates page lag, removes broken tiles or map rendering errors, and maximizes screen space for document review.
* **How It Works (Step-by-Step):**
  1. **Inspection Layout:** When BPLO opens an application, the location section displays a high-visibility, read-only summary card:
     * **Declared Address:** *124 Gat Tayaw St., Brgy. Rizal (Poblacion), Liliw, Laguna*
     * **Zonal Classification:** *Zone 1 (Prime Commercial — High Foot Traffic)*
     * **Property Tenancy:** *Rented Commercial Space (Contract of Lease Attached)*
     * **Permit Scope:** *Single Establishment (Stalls 1 & 2 Covered)*
  2. **Audit Verification:** BPLO verifies municipal jurisdiction by inspecting formatted municipal address text rather than diagnosing GPS map pins.

---

### 9. Inter-Office Clearances: BPLO Consolidated Endorsement Checklist
* **Status:** **APPROVED (Option 1 Adopted)**
* **Official Decision:** Do **not** create separate login portals or user roles for the Municipal Health Office (MHO) and Bureau of Fire Protection (BFP). BPLO acts as the consolidated **Business One-Stop Shop (BOSS)** using an integrated regulatory checklist.
* **Rationale:** Prevents inter-agency bottlenecks where permits sit idle waiting for external inspectors to log in, strictly complying with the Ease of Doing Business Act (RA 11032).
* **How It Works (Step-by-Step):**
  1. **Document Uploads:** In Step 4, the applicant uploads their Sanitary/Health inspection card and Fire Safety Inspection Certificate (FSIC) receipt (or previous year's certificate).
  2. **BPLO Endorsement Panel:** Inside the Split-Screen Verifier, BPLO has a dedicated **Regulatory Clearances Section**:
     * ☑️ **Health & Sanitary Inspection:** `[ Verified from Upload / Endorsed to MHO ]`
     * ☑️ **Fire Safety (FSIC / BFP):** `[ Verified from Upload / Subject to Post-Audit Inspection ]`
     * ☑️ **Zoning & Engineering:** `[ Verified / Compliant ]`
  3. **Endorsement Sign-Off:** BPLO checks off these items based on uploaded files or municipal post-audit policies before clicking `[Approve & Forward to Treasury]`.
  4. **Post-Audit Reporting:** The system generates a weekly consolidated Joint Inspection List (JIL) that can be printed or emailed directly to BFP and MHO for their routine physical inspections.

---

## MODULE C: TREASURY ASSESSMENT & CASHIERING

---

### 10. Automated Assessment Engine Trigger in Treasury
* **Status:** **APPROVED (Final)**
* **Official Decision:** The manual "Run Assessment Engine" button is **completely removed**.
* **Rationale:** Reduces processing steps for Treasury staff from multiple clicks and wait times to zero-click instant billing.
* **How It Works (Step-by-Step):**
  1. **Automated Trigger:** The moment BPLO clicks `[Approve & Forward to Treasury]`, the backend calculation engine automatically fires in less than 1 second.
  2. **Idempotent Computation:** The engine computes:
     * Mayor's Permit Fee (based on business activity schedule and zone multiplier).
     * Local Business Tax (based on gross sales/capital investment).
     * Standard Regulatory Fees (Sanitary Fee, Garbage Fee based on area, Fire Safety Fee at 10%).
  3. **Instant Display:** When the Treasury officer opens `AssessmentGrid.jsx`, the itemized **Tax Order of Payment (TOP)** is already 100% computed, populated, and displayed on screen. Zero button clicks required.

---

### 11. Fixed Standard Fees & Read-Only Assessment Grid
* **Status:** **APPROVED (Final)**
* **Official Decision:** Treasury officers will no longer have editable text fields to alter fee amounts arbitrarily. All fees are rendered **strictly read-only**.
* **Rationale:** Ensures complete audit compliance with the Commission on Audit (COA) and the Local Government Code (RA 7160). No individual officer can invent arbitrary discounts.
* **How It Works (Step-by-Step):**
  1. **Read-Only Grid:** Every fee line item on the Treasury assessment grid is locked as read-only text mirroring the municipal revenue ordinance.
  2. **Legitimate Statutory Exemptions (e.g., BMBE Act RA 9178):**
     * If a micro-business holds a valid DTI BMBE certificate, the Treasury officer clicks a formal switch: `[Apply BMBE Tax Exemption]`.
     * The system verifies the uploaded BMBE certificate and zeroes out local business tax in an auditable, COA-compliant manner with mandatory audit logging.

---

### 12. Payment Architecture: Cashier OTC + Proof of Payment Upload (PayMongo Removed)
* **Status:** **APPROVED (Option 1 Adopted)**
* **Official Decision:** Completely remove PayMongo API code, webhooks, and third-party payment modals. Shift 100% to a stable dual-channel payment model: **(1) Over-The-Counter Cashier POS** and **(2) Official Bank / GCash Transfer with Proof of Payment Upload**.
* **Rationale:** Eliminates transaction convenience fees, prevents dropped webhook failures and corrupted payment states, and reflects actual municipal cashiering and banking practices.
* **How It Works (Step-by-Step):**
  1. **Billing Notice:** Once Treasury finalizes the assessment, the applicant receives their official Tax Order of Payment (TOP) with the total amount due.
  2. **Payment Channel 1 — Over-The-Counter (Cashier POS):**
     * Applicant presents their Application Number at the Municipal Hall Cashier.
     * Cashier enters Cash Tendered; the system automatically calculates change, records the transaction, auto-generates the Official Receipt number, and marks the application as Paid.
  3. **Payment Channel 2 — Bank / GCash Transfer with Receipt Upload:**
     * Applicant transfers payment to the official Municipal Landbank or GCash account outside the system.
     * In their Applicant Portal, they enter the *Transaction Reference Number*, *Date of Payment*, and *upload a photo/PDF of the deposit slip or transaction receipt*.
     * The application moves to `Payment Verification` status.
  4. **Treasury Verification:** Treasury opens the "Pending Payment Verifications" tab, validates the attached deposit slip against the municipal bank records, and clicks `[Confirm Payment & Release Permit]`.

---

### 13. Instant Payment Status Reflection & Digital Document Release
* **Status:** **APPROVED (Final)**
* **Official Decision:** Treasury confirmation of payment instantly reflects across the entire system, shifting the applicant's status to PAID and releasing official documents.
* **Rationale:** Eliminates taxpayer anxiety and eliminates follow-up phone calls by providing immediate digital receipting and permit downloads.
* **How It Works (Step-by-Step):**
  1. **Trigger:** The moment Treasury records an OTC payment or approves an uploaded deposit slip, the state machine transitions the record from `For Payment` directly to **`Completed / Paid`**.
  2. **Applicant Portal Update:** The applicant's Status Tracker instantly changes to a green **`PAID / PERMIT READY`** status badge.
  3. **Digital Releases:** Prominent download buttons immediately unlock for:
     * **E-Resibo (Electronic Official Receipt):** Printable official receipt with generated OR number and itemized breakdown.
     * **Official Business Permit:** Digitally signed, tamper-evident Business Permit PDF complete with verification QR code.
  4. **Email Dispatch:** An automated email is dispatched to the applicant with the attached PDF copies for their immediate records.

---

## Complete Summary & Implementation Matrix

| # | Feature / System Component | Module | Final Status | Approved Implementation Summary |
|---|---|---|:---:|---|
| 1 | **Barangay Module Removal** | Applicant / BPLO | **APPROVED** | Barangay Module removed; clearance is a pure document upload verified by BPLO. |
| 2 | **Automated Area Pinned Location** | Applicant / BPLO | **APPROVED** | Manual pin dragging removed; coordinates automatically assigned to Barangay Centroid. |
| 3 | **Hardcoded City & Province** | Applicant | **APPROVED** | Province permanently fixed to Laguna; City permanently fixed to Liliw. |
| 4 | **Dynamic Tenancy Documentation** | Applicant | **APPROVED** | Tenancy selector (Rented vs. Owned Commercial vs. Residential) tailors required uploads. |
| 5 | **Multi-Stall / Unit Declaration** | Applicant / Treasury | **APPROVED** | Multiple stalls/units in the same market or building declared under one application. |
| 6 | **Location-Based Capital Matrix** | Applicant / Treasury | **APPROVED** | 3 foot-traffic zones in DB (`location_zones`); configurable via Admin Master Data. |
| 7 | **BPLO Binary Review Workflow** | BPLO | **APPROVED** | Simple two-button action: `[Approve & Forward]` vs. `[Return with Remarks]`. |
| 8 | **Address & Zoning Jurisdiction Card**| BPLO | **APPROVED** | Leaflet map removed; replaced with high-visibility formatted address & zoning card. |
| 9 | **Inter-Office Regulatory Checklist** | BPLO | **APPROVED** | MHO Sanitary & BFP Fire verified via BPLO checklist without extra login portals. |
| 10 | **Automated Assessment Trigger** | Treasury | **APPROVED** | Manual button removed; fees auto-calculated immediately upon BPLO approval. |
| 11 | **Fixed Standard Fees (Read-Only)** | Treasury | **APPROVED** | Assessment grid is strictly read-only; arbitrary price tampering eliminated. |
| 12 | **OTC + Proof of Payment Upload** | Treasury / Applicant| **APPROVED** | PayMongo removed; Cashier POS + Deposit slip upload verified by Treasury. |
| 13 | **Instant Status & Permit Release** | Treasury / Applicant| **APPROVED** | Payment confirmation instantly updates applicant portal to PAID and unlocks downloads. |
