# Phase 2 — Applicant Registration Experience

Owner: Developer 1. Date: November 6, 2026.

## Completed scope

- Migration `045_applicant_fields_and_tenancy.sql` adds constrained tenancy and a unit/stall array to businesses. Existing rentals are backfilled as Rented; other existing records default to Owned Commercial. A trigger keeps the legacy `is_renting` field compatible.
- Step 2 locks Liliw/Laguna, removes applicant map/pin dragging and mismatch warnings, assigns the selected barangay's stored reference coordinates, and offers Rented, Owned Commercial, and Owned Residential.
- Step 3 supports up to 50 unique unit/stall labels and displays the selected zone's recommended capital floor. This is guidance; fee computation remains Phase 3.
- Step 4 uses ordinary mandatory Barangay Business Clearance uploads. There is no municipality-request toggle. Rented requires Contract of Lease (plus the existing Lessor's Permit rule); Owned Commercial requires Building Permit; Owned Residential requires Zoning Clearance. Existing organization/activity-specific requirements remain in place.
- Step 5 displays tenancy, covered stalls, and only applicable uploaded requirements. The final payload excludes stale uploads for a previously selected tenancy.
- Older drafts are normalized with deep defaults, old rentals are preserved, municipal-clearance requests become upload-only, and multiple files with the same requirement ID are grouped safely. Existing returned applications load the new fields and retain uploaded files.
- Client validation blocks missing requirements, duplicate/blank stalls, and malformed activities. PDF/JPG/PNG uploads are checked before transfer, with a 5 MB limit.
- The backend verifies the required files exist in the submitting taxpayer's storage namespace, validates type/size, and rejects incomplete requirements before any submission writes.
- `submit_applicant_application` saves the business, application, activities, verification rows, and draft deletion in one transaction. It uses the trusted barangay centroid, verifies ownership and editable status for returned applications, replaces obsolete activity/document rows, and rolls back all changes if a write fails.

## Deployment and permissions

Migrations **045 and 046 are applied** to the linked eBPLS Supabase project. Migration 046 explicitly removes Supabase's inherited function grants from anon/authenticated roles; only the backend service role can execute the submission RPC. This was verified against the live database.

**Migration coordination:** 046 is consumed by `046_applicant_submission_permissions.sql`. The planned Phase 5 payment-proof migration must use the next unused number, currently **047**, rather than reusing 046. Check remote history before creating future migrations.

The applicant submission path no longer calls the municipal clearance hook or creates a `barangay_clearances` row. Existing staff routes and older clearance records remain for Developer 2's Phase 4 retirement work.

## Verification evidence

- **29 automated tests passed**, including the existing Phase 1 suite.
- PostgreSQL tests apply the real relevant migrations in PGlite, verify tenancy/stall persistence for all three options, check returned-app replacement and ownership/status enforcement, and prove failed activity/document writes retain drafts and leave no partial business/application records.
- Service tests verify conditional requirements, required clearance/property uploads, storage/path validation, canonical coordinates, duplicate activities, and RPC failure handling. Frontend utility tests cover old drafts, multi-file grouping, missing uploads, duplicate stalls, payload filtering, and allowed upload types/sizes.
- All **nine live read-only combinations** of application type (New/Renewal/Additional Line) and tenancy returned mandatory clearance and the correct property document.
- Isolated browser testing verified automatic reference location, zoning guidance, adding stalls 12/13/14, blocking a missing clearance, accepting a sample PNG upload, and rendering the final review with tenancy and stalls. Preview uploads and draft saves were simulated and did not create a live application.
- The user signed into the real Applicant test account. Its saved draft loaded; the live wizard displayed Bayate's assigned reference point, fixed Liliw/Laguna, all tenancy options, stall controls, and the correct property document. Missing uploads blocked progression. No application was submitted, and no live file was uploaded during this browser check.
- Focused lint passes for all changed frontend files. Production build passes.

The real submission transaction was tested in isolated PostgreSQL, not by creating a production application or sending applicant notifications. A production end-to-end submission remains a separate optional acceptance check if the project owner wants a deliberately created test application.

## Repeatable checks

From `ebpls-server`:

```powershell
npm test
npx supabase db query --linked --file ..\scripts\verify-phase2.sql
```

From `ebpls-frontend`:

```powershell
npm run build
```

Phase 1's starter zoning/centroid data still requires authoritative confirmation before Phase 3 fee-assessment rollout. Phase 2 uses that existing editable reference data without claiming it has municipal approval.
