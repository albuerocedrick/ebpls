---
name: ebpls-tester
description: Defines testing protocols and QA standards for the eBPLS system. Use this skill to validate state transitions, RBAC enforcement, and data privacy compliance.
---

# Testing & Quality Assurance Rules
* **State Machine Validation:** Write tests to explicitly ensure that the system rejects status updates that skip steps (e.g., throwing an error if moving from 'Pending' directly to 'Assessed')[cite: 2].
* **RBAC Boundary Testing:** Every protected route must include a test asserting that requests from the wrong role (e.g., Applicant trying to access BPLO verification routes) correctly return a 403 error[cite: 2].
* **Payment Scope Testing:** Ensure tests strictly enforce that `tendered_type` only accepts 'Cash' or 'Manager Check'[cite: 2]. Attempting to inject electronic payment types must fail the database constraint.
* **Audit Log Compliance:** Write integration tests ensuring that modifying an application status or recording a payment correctly populates the `audit_logs` table with the correct IP, user ID, and JSONB diffs[cite: 2].
* **Frontend Component Testing:** Use Vitest and React Testing Library to verify that the UAF multi-step wizard correctly triggers autosave endpoints[cite: 2], and that the Treasury Cashier POS accurately computes change amounts[cite: 2].