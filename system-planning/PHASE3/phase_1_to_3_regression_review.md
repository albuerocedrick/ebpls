# Phase 1–3 regression review

Reviewed November 6, 2026, after fixing the two issues found during the cross-phase review.

## Fixes

- Returned-application responses now include each activity's saved `gross_sales_prev_year`, including zero. Draft normalization and submission retain it, and the database resubmission test verifies that PHP 500,000 remains PHP 500,000. The activity and final-review screens expose the declaration; negative or invalid gross sales are rejected. A failed activity query returns an error instead of an incomplete edit response.
- Existing barangay names are disabled in the Admin editor, and the Admin update endpoint rejects renames before any write. This preserves the name-based links used by existing businesses and automatic assessments. Zone reassignment, coordinates, and other supported edits still work with the unchanged name. Renaming existing barangays now requires a deliberate data migration outside this editor.
- No database migration or repricing of existing bills is required for these fixes.

## Recheck results

- **47 automated tests pass.** The six additional tests cover rejected renames (including combined rename/zone changes), normal zone/coordinate editing, edit-response → wizard payload → Business Tax calculation, failed activity loading, database resubmission with retained gross sales, and gross-sales validation. The earlier tests still cover all three phases, atomic writes/rollback, zoning calculations, BMBE evidence/audits/restoration, and finalization.
- Frontend production build passes. ESLint passes on all 14 frontend files changed across Phases 1–3. `git diff --check` passes.
- Isolated browser checks confirm the disabled existing barangay name, editable zone/coordinate controls, and PHP 500,000 gross sales carried from Activities to Review. Preview forms use sample applications and simulated draft/upload endpoints.
- Live read-only checks confirm the three expected zone rates and all 33 active barangays with coordinates and joined zone metadata.
- All nine live application-type/tenancy combinations return mandatory Barangay Business Clearance and the correct tenancy document.
- Live automatic-assessment input retrieval/calculation succeeds with eight fee items. Arbitrary fee override remains disabled.
- The live database still has eight assessments and 64 lines. Header and line totals both equal **PHP 147,037.21**; no base amounts are missing. Authenticated clients cannot update the financial tables or execute approval/exemption RPCs; the backend service role can execute the required functions.
- No live application was submitted, approved, exempted, finalized, or paid during this recheck. No database records were changed.

## Remaining acceptance limits

- Barangay coordinates and zone assignments are the user-approved editable starter data. They still require authoritative confirmation before operational billing; Zone 2 currently has no assigned barangays.
- The user-approved existing 2% Business Tax fallback remains unchanged and still requires Revenue Code confirmation for operational sign-off.
- Full-project frontend lint has the previously reported 58 errors and 13 warnings in files outside the Phase 1–3 changes. The changed files pass lint.
- Submission and financial mutations were checked in isolated PostgreSQL/API tests. This recheck did not create a production application or send applicant notifications.
