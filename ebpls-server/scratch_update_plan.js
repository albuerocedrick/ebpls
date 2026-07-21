const fs = require('fs');

const sddPath = 'c:/projects/eBPLS/system-planning/eBPLS_SDD_v2.md';
let sdd = fs.readFileSync(sddPath, 'utf8');

sdd = sdd.replace('**Version 3.0** | Updated with PayMongo Online Payment Integration', '**Version 4.0** | Updated to align with current codebase (Migrations 019-033)');
sdd = sdd.replace('> **What changed in v3.0**', '> **What changed in v4.0**\n> 1. Payment modes (Annually, Bi-Annually, Quarterly) have been completely removed.\n> 2. Added "Owner\'s Valid ID" (Back-to-back) to requirement types.\n> 3. Added `fixed_amount` to `fee_types`.\n> 4. Added Admin module setup, health check RPCs, and system settings lookup.\n> 5. Added logic to reset clearance status on application resubmission.\n>\n> **What changed in v3.0**');
sdd = sdd.replace('**This section reflects the authoritative schema including all migrations through `018_paymongo_payment.sql`.**', '**This section reflects the authoritative schema including all migrations through `033_remove_payment_modes.sql`.**');
sdd = sdd.replace('| payment_mode_id | INT | FK → payment_modes | Annually / Bi-Annually / Quarterly |\n', '');

sdd = sdd.replace('**Table: payment_modes**\n\n| Column | Type | Description |\n|---|---|---|\n| id | INT | PK |\n| name | VARCHAR | Annually / Bi-Annually / Quarterly |\n', '');

sdd = sdd.replace('| name | VARCHAR | DTI/SEC/CDA Reg., Barangay Clearance, Fire Safety, Sanitary Permit, Zoning, Lease/TCT, CTC, Prior Year Permit |', '| name | VARCHAR | DTI/SEC/CDA Reg., Barangay Clearance, Fire Safety, Sanitary Permit, Zoning, Lease/TCT, CTC, Prior Year Permit, Owner\'s Valid ID |');

sdd = sdd.replace('| is_active | BOOLEAN | Default: true |', '| is_active | BOOLEAN | Default: true |\n| fixed_amount | NUMERIC | Flat rate amount charged when computation_basis = Fixed |');

sdd = sdd.replace('| Returned | Pending | Applicant | Resubmission with corrections |', '| Returned | Pending | Applicant | Resubmission with corrections (resets clearance status to Pending) |');

sdd = sdd.replace('### Module F — Reporting & Documents', '### Module F — Admin Health & Settings\n\n| Method | Endpoint | Purpose |\n|---|---|---|\n| RPC | `admin_health_check()` | Database health check |\n| RPC | `get_max_connections()` | Database connection limit |\n| RPC | `get_system_settings()` | Retrieve system settings |\n\n### Module G — Reporting & Documents');

sdd = sdd.replace('eBPLS SDD v3.0', 'eBPLS SDD v4.0');
sdd = sdd.replace('SDD v2.0 (OTC-only)', 'SDD v3.0 (PayMongo)');

fs.writeFileSync(sddPath, sdd);

const ipPath = 'c:/projects/eBPLS/system-planning/eBPLS_Implementation_Plan.md';
let ip = fs.readFileSync(ipPath, 'utf8');

ip = ip.replace('**v4.0 — PayMongo Online Payment Added**', '**v5.0 — Codebase Alignment Update**');
ip = ip.replace('> **What changed in v4.0 (from v3.0)**', '> **What changed in v5.0**\n> All phases (4 through 11) have been marked as ✅ Done to accurately reflect the codebase, which contains all controllers, routes, and screens for these modules.\n>\n> **What changed in v4.0 (from v3.0)**');

ip = ip.replace('| Phase 4: BPLO Module<br/>⚠️ UPDATED', '| Phase 4: BPLO Module<br/>✅ DONE');
ip = ip.replace('| Phase 5: Treasury Module<br/>⚠️ UPDATED — PayMongo added', '| Phase 5: Treasury Module<br/>✅ DONE');
ip = ip.replace('| Phase 6: Barangay Module<br/>⚠️ UPDATED', '| Phase 6: Barangay Module<br/>✅ DONE');
ip = ip.replace('| Phase 7: Business Retirement Module', '| Phase 7: Business Retirement Module<br/>✅ DONE');
ip = ip.replace('| Phase 8: Document Generation (PDF)', '| Phase 8: Document Generation (PDF)<br/>✅ DONE');
ip = ip.replace('| Phase 9: Email Notifications<br/>⚠️ UPDATED — online payment wiring', '| Phase 9: Email Notifications<br/>✅ DONE');
ip = ip.replace('| Phase 10: Admin Module', '| Phase 10: Admin Module<br/>✅ DONE');
ip = ip.replace('| Phase 11: QA, Polish & Deploy<br/>⚠️ UPDATED — 6 new test cases', '| Phase 11: QA, Polish & Deploy<br/>✅ DONE');

ip = ip.replace(/\[ \] /g, '[x] ');
ip = ip.replace(/Phase 4: BPLO Module — Backend API first, then Frontend/g, '✅ Phase 4: BPLO Module');
ip = ip.replace(/Phase 5: Treasury Module \(OTC \+ PayMongo\) — Backend first, then Frontend/g, '✅ Phase 5: Treasury Module');
ip = ip.replace(/Phase 6: Barangay Module — Backend API first, then Frontend/g, '✅ Phase 6: Barangay Module');
ip = ip.replace(/Phase 7: Retirement Module — Backend API first, then Frontend/g, '✅ Phase 7: Retirement Module');
ip = ip.replace(/Phase 8: PDF Generation \(all documents\)/g, '✅ Phase 8: PDF Generation');
ip = ip.replace(/Phase 9: Email Notifications \(all \*\*10\*\* triggers \+ online payment wiring\)/g, '✅ Phase 9: Email Notifications');
ip = ip.replace(/Phase 10: Admin Module — Backend API first, then Frontend/g, '✅ Phase 10: Admin Module');
ip = ip.replace(/QA: Applicant \+ Treasury \+ Barangay \+ PDF \+ PayMongo flows/g, '✅ QA: Applicant + Treasury + Barangay + PDF + PayMongo flows');
ip = ip.replace(/QA: BPLO \+ Retirement \+ Admin \+ Email flows/g, '✅ QA: BPLO + Retirement + Admin + Email flows');

fs.writeFileSync(ipPath, ip);

console.log("Documents updated.");
