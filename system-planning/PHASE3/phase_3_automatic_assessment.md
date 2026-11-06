# Phase 3 — Automated Assessment & Read-Only Treasury

Owner: Developer 1. Date: November 6, 2026.

The subsequent [Phase 1–3 regression review](phase_1_to_3_regression_review.md) records the returned-application gross-sales fix, barangay rename protection, and 47 passing tests.

## Implemented behavior

- BPLO's existing verify endpoint calculates the bill automatically and commits the assessment header, fee items, application status **Assessed**, and mandatory audit entries together. Treasury no longer initiates assessment.
- Fee calculation reads one database snapshot containing the application, activity declarations, barangay zone, active fee definitions, Revenue Code schedule and rules. The commit rejects a stale snapshot if these inputs changed after calculation.
- Mayor's Permit uses matching Revenue Code activity/tier entries and the configured `DEFAULT_FEE` for unlisted activities. A missing tier count or unmatched tier is an error, rather than silently selecting the first tier. Multiple activities are consolidated into one assessment; separate stall labels do not invent extra permit/garbage charges without a configured tariff or floor-area input.
- Zoning multiplies the base regulatory fees. Business Tax retains its existing gross-sales/capital basis and is not zone-multiplied. Percentage fees use their already-adjusted reference fee, so Fire Safety is not multiplied twice. Fixed zero fees remain zero. Amounts and totals are rounded to cents.
- The user explicitly selected **keeping the existing 2% Business Tax fallback** where `fee_types.percentage_value` is absent. The bill records this as a calculation note. This retains current system behavior; it is not certification of the municipality's tax schedule.
- Declared capital is compared with the selected zone's recommended floor and a shortfall is displayed. The engine does not alter declarations or silently inflate the tax base.
- Treasury displays saved fee amounts and their calculation descriptions as read-only text. The manual generation button and arbitrary amount inputs are gone. Old generation/override/reset endpoints return HTTP 410, and authenticated client roles cannot directly mutate assessment tables.
- BMBE relief requires an uploaded PDF/JPG/PNG certificate up to 5 MB, an officer confirmation, an approved LGU ordinance/authority reference, and remarks. Only **Business Tax** is zeroed; regulatory fees stay payable. Removing relief restores the original frozen tax amount, not a newly calculated price.
- Exemption apply/remove, total updates, and audit entries are atomic. Missing audit writes roll back the financial change. Relief is limited to new unpaid assessments before finalization. Finalization locks the bill state and posts it for payment; retries do not send duplicate finalization notifications.

## BMBE policy basis

[RA 9178, Section 7](https://elibrary.judiciary.gov.ph/thebookshelf/showdocs/2/1477) exempts qualifying income and encourages LGUs to grant local tax/fee relief. A DTI certificate alone does not establish Liliw's local Business Tax exemption. The Treasury control therefore records the officer's verified certificate and **approved local authority reference**, rather than treating every certificate as an automatic blanket fee waiver.

The system checks the uploaded object's ownership, existence, MIME type and size. Treasury must review whether the document is a valid DTI BMBE certificate and whether the cited local authority actually permits the relief; file validation cannot determine those facts.

## Database deployment and compatibility

Migration **047_automatic_assessment.sql is applied** to the linked Supabase project. It adds calculation/exemption metadata, original fee amounts, service-only functions and client write restrictions.

Deployment preserved all eight existing assessments and 64 fee lines. Header totals and line totals both remained **PHP 147,037.21** before and after migration. Existing invoices are not recalculated on page load. Legacy bills remain readable and retain their original amounts; the new BMBE control is only available for new automatic assessments. Legacy approved applications with no assessment need explicit administrative review, rather than a hidden GET mutation or a manual Treasury engine button.

**Developer 2 handoff:** migration 047 is consumed; the next unused migration is currently **048**. The BPLO verify URL remains unchanged, but successful approval now returns `status: "Assessed"`, `assessment_id`, `total_amount`, and `already_assessed`. Phase 4 should keep this automatic approval path while replacing the BPLO UI and retiring its existing legacy barangay-clearance guard. Existing document/data-review checks are also rechecked by the atomic approval function.

## Verification

- **41 automated tests pass**, including Phases 1 and 2.
- Real PostgreSQL migrations run in isolated PGlite tests. Tests cover Zone 1/3 differences, percentage dependencies, tier validation, capital guidance, atomic approval, duplicate approval, stale configuration, role checks, mandatory audit failures, BMBE evidence/authority, tax restoration and finalized-bill protection.
- HTTP tests exercise the real BPLO/Treasury routes, calculation service and validation against controlled external boundaries, including retired override endpoints and BMBE certificate checks.
- Live read-only checks confirm the snapshot RPC and calculation return eight fee lines, the old override controller returns 410, client writes/RPC execution are denied, backend execution is allowed, and existing totals are unchanged.
- Isolated browser testing confirms there are **zero editable amount fields** and no manual generation button. It verifies missing-evidence validation, sample certificate upload, Business Tax changing from PHP 1,000 to zero, and restoration to PHP 1,000. All preview data and financial changes were simulated.
- The user signed into the real Treasury account. Existing bill APP-2026-00013 displayed its unchanged PHP 2,560 total and read-only fee items. No approval, finalization, payment, production exemption, or outbound applicant notification was triggered during browser verification.
- Production build and focused lint pass.

Repeatable read-only deployment check, from `ebpls-server`:

```powershell
npm test
npx supabase db query --linked --file ..\scripts\verify-phase3.sql
```

The Phase 1 zone assignments/derived coordinates remain editable starter data requiring authoritative confirmation for operational billing. The retained 2% fallback likewise needs review against the approved Revenue Code before production billing sign-off. Technical completion does not certify municipal rates or the eligibility of a particular business.
