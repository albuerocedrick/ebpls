# eBPLS System Update: Comprehensive Patch Notes (Phases 1 to 6.1)

Welcome to the latest major update of the eBPLS (Electronic Business Permits and Licensing System). Based on recent feedback and requirements from the adviser and municipal stakeholders, we have rolled out a comprehensive set of features. 

These updates are focused on **transparency, automated communication, and strict adherence to the official Municipal Revenue Code.**

Below is a detailed breakdown of every new feature, enhancement, and workflow improvement added to the system.

---

## 🏛️ 1. Treasury Office Enhancements

### 1.1 Digital Revenue Code Integration (Fee Schedule Page)
* **What was changed**: We have taken the official printed Municipal Revenue Code and fully digitized it into a centralized database.
* **New UI Feature**: A dedicated **"Fee Schedule"** page is now available in the Treasury dashboard sidebar.
* **Complete Details**:
  * The page displays all **13 business categories** (e.g., Manufacturers, Wholesalers, Service Establishments, Financial Institutions).
  * It includes all sub-categories and their exact fixed fees (e.g., Bakery Products at ₱500.00, Air guns at ₱200.00).
  * **Tiered pricing** is fully supported. For example, "Piggery Farms" dynamically shows the 8 different pricing tiers ranging from "Exempt" (less than 10 heads) up to ₱3,000.00 (more than 500 heads).
  * The page also prominently displays the **"Other Municipal Fees"** that are universally applied (Business Tax, Sanitary Inspection Fee, Garbage Fee, Fire Safety Inspection Fee, etc.) for full transparency.
  * Special rules (like the 25% surcharge for late renewals) are highlighted at the top.

---

## 👨‍💼 2. Applicant Experience & Transparency

### 2.1 Dynamic Application Form (Step 3)
* **What was changed**: The business registration form is now "smart" and adapts to the applicant's chosen business activity.
* **Complete Details**: 
  * If an applicant selects a business type that has tiered pricing in the Revenue Code, Step 3 of the form will dynamically generate a specific input field for them.
  * For example, selecting "Poultry - Broiler" will automatically ask the applicant to input their "Number of Heads". Selecting "Boarding House" will ask for the "Number of Boarders". 
  * This guarantees that the Treasury has the exact metrics needed to assess the correct fee tier without needing to call the applicant for clarification.

### 2.2 Transparent Fee Assessment Breakdown
* **What was changed**: Applicants are no longer presented with just a "total amount due". They now receive a fully itemized receipt *before* payment.
* **Complete Details**:
  * Once the Treasury assesses the application, the applicant's Status Tracker updates to show a detailed **Fee Assessment Breakdown Card**.
  * The card lists the exact **Mayor's Permit Fee** based on their business category.
  * It itemizes all other municipal fees (e.g., explaining that the Fire Safety Fee is calculated as 10% of the Mayor's Permit Fee).
  * It clearly displays any late penalties or surcharges if applicable.

### 2.3 Step-by-Step Procedure Guide
* **What was changed**: A dynamic helper box has been added to the applicant's dashboard to guide them through the permit lifecycle.
* **Complete Details**:
  * If the status is **Pending**, the guide tells them: *"Awaiting BPLO review. No action required."*
  * If the status is **Returned**, it says: *"Corrections needed. Please review BPLO remarks and resubmit."*
  * If the status is **For Payment**, it instructs them on how to pay via GCash, Card, or Over-The-Counter.
  * If the status is **Completed**, it provides the download link for their digital permit.

### 2.4 Online Payment Breakdown Toggle
* **What was changed**: When an applicant chooses to pay online via PayMongo (GCash/Card), they can review their fees one last time.
* **Complete Details**: Inside the blue payment checkout card, there is a new collapsible toggle called "View Fee Breakdown". Clicking it expands the full itemized list of fees, ensuring they have absolute confidence in the total amount being charged to their e-wallet or credit card.

---

## 🔔 3. Universal Notification System (Phase 6.1 Frontend Integration)

We have completely overhauled how the system communicates with the applicant, ensuring they never miss an update and reducing the number of follow-up calls to the municipal office.

### 3.1 Real-Time In-App Pop-Up Notifications
* **What was changed**: A prominent, color-coded pop-up alert will now slide into view at the top of the applicant's screen whenever their application moves to a new step.
* **Complete Details**:
  * **Login Detection**: If an applicant has unread updates when they log in, the most recent update will immediately pop up on their screen.
  * **Timespan Display**: Pop-ups now show exactly when the event happened (e.g., *"2 hours ago"* or *"Just now"*).
  * **Color-Coded Statuses**:
    * 🔍 **Under Review (Blue)**: Alerts the user the moment BPLO starts looking at their files.
    * ✅ **Verified (Green)**: Documents approved and forwarded to Treasury.
    * 📋 **Assessed (Orange)**: Treasury has finalized the fees; TOP (Tax Order of Payment) is ready.
    * 💳 **Payment Confirmed (Green)**: Payment received successfully.
    * ⚠️ **Returned (Red)**: Application declined due to errors; includes the exact remarks from the BPLO officer.
    * 📄 **Permit Ready (Green)**: Final certificate is ready for download.

### 3.2 Automated Email Alerts for Every Step
* **What was changed**: The email system has been expanded to mirror the in-app pop-ups.
* **Complete Details**:
  * A brand new email trigger was added for **"Application Under Review"**.
  * Every single time the application changes status, the applicant receives an official email from the eBPLS system.
  * All emails now include a highly accurate **timestamp line** at the bottom (e.g., *"Status updated on: August 19, 2026 at 2:15 PM"*), providing a perfect paper trail for both the applicant and the municipality.

---

## 🏢 4. BPLO Workflow Improvements

### 4.1 Certificate Ready Notification with Custom Notes
* **What was changed**: The BPLO office now has direct communication controls when a permit finishes processing.
* **Complete Details**:
  * In the BPLO dashboard, there is a new sidebar section for the **"Completed Queue"**.
  * Next to every completed permit, there is a **"Notify Applicant"** button.
  * When clicked, the BPLO officer can type a custom message (e.g., *"Your permit is ready. Please proceed to Window 3 with your valid ID to claim the physical plate."*).
  * Hitting send instantly triggers the **Permit Ready** in-app pop-up and dispatches an email to the applicant containing those exact instructions.
  * The dashboard row then updates with a ✅ **Notified** badge and timestamp to prevent duplicate notifications.
