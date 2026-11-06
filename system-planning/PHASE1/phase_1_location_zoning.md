# Phase 1 — Location & Zoning Foundation

Owner: Developer 1. Scope: approved revisions plan v2.0, Phase 1 only.

## Implementation status

- [x] Migration 044: `location_zones`, constrained rates, barangay zone foreign key and coordinates, zone index, zone RLS and grants.
- [x] Three default zones: High / PHP 50,000 / 1.25×; Medium / PHP 25,000 / 1.00×; Low / PHP 10,000 / 0.80×.
- [x] All 33 existing barangays retain their IDs and receive in-boundary derived centroids and editable starter zones.
- [x] Admin Master Data: zone creation, editing, activation/deactivation and deletion of unreferenced zones; barangay zone and coordinate editing.
- [x] Backend input validation, active-zone checks for new assignments, audit snapshots and referenced-zone deletion protection.
- [x] Applicant barangay API returns coordinates and zone details; both current dropdown consumers accept the new response.
- [x] Local PostgreSQL migration/constraint/RLS checks and API tests pass (15 tests).
- [x] Frontend production build and focused Admin page lint pass.
- [x] Browser smoke check with isolated sample data: all 33 barangays render, a capital-floor edit saves, and a barangay zone dropdown saves its new assignment.
- [ ] Apply migration 044 to the shared Supabase database and verify the live Admin workflow. Sign-in with the correct account succeeded and the account can see linked project `qdnljtlaopxuhwzhytve`. The project status is `INACTIVE`; temporary database login creation times out (HTTP 544) and the project's REST hostname does not resolve. Resume/restore the project before retrying. No remote database changes have been made.

## Starter data decision

The user approved editable starter data. The approved specification defines the three rate bands and identifies Poblacion as prime commercial, but does not enumerate road/market classifications or provide official surveyed reference points.

The initial mapping therefore assigns the five `(Poblacion)` barangays to Zone 1 and the remaining 28 to Zone 3. Zone 2 exists and is available for confirmed highway/main-road barangays. These are provisional defaults, not a municipal zoning determination. Admin must review assignments before Phase 3 uses them to assess fees.

The complete [33-barangay data review checklist](phase_1_data_review.md) records every starter assignment and derived coordinate, with pending approval/correction entries. No authoritative source for this project's exact zoning bands or official surveyed centroid list has been verified.

Coordinates are area-weighted centroids derived from the committed `ebpls-server/src/data/liliw-barangays.geojson` (metadata: BetterGov / NAMRIA 2023). Holes are subtracted and multipolygon areas are weighted. Every seeded point is independently checked to be inside its barangay polygon. These are not official surveyed centroids. Admin can replace them with approved coordinates.

`node scripts/generate-location-zones-migration.js` reproduces migration 044 from that source. Do not regenerate or edit an already-deployed migration; use a new migration for later corrections.

## Apply and verify

From `C:\EBPLS\ebpls\ebpls-server`:

```powershell
npx supabase login
npx supabase db push --dry-run
npm run db:push
```

Review the dry-run migration list first. The Phase 1 migration is `044_location_zones_and_centroids.sql`; earlier unapplied migrations must be reviewed separately. Alternatively, execute that file in the linked Supabase project's SQL Editor. Use the project's existing migration deployment convention to keep migration history consistent.

If the CLI returns HTTP 403, the project owner must grant this account appropriate database-management access or apply the migration from an authorized account. Do not relink this repository to an unrelated project to bypass that error.

Run these read-only checks after deployment:

```sql
SELECT name, foot_traffic_level, min_capital_floor, fee_multiplier, is_active
FROM public.location_zones ORDER BY id;

SELECT b.id, b.name, b.latitude, b.longitude, z.name AS zone
FROM public.barangays b
JOIN public.location_zones z ON z.id = b.zone_id
ORDER BY b.name;
```

Expected: three zones and 33 seeded barangays. Migration 044 aborts and rolls back if it cannot map all 33 original names. It does not replace existing barangay IDs.

Then sign in as Admin, open **Master Data → Location Zones**, edit a capital floor, save, and reload. Open **Barangays & Zoning**, change a barangay's zone, save, and reload. Confirm the corresponding audit entries. A zone referenced by a barangay cannot be deleted; it may be deactivated. Existing assignments to inactive zones can be retained, but new assignments must select an active zone.

## API contract for Phases 2–4

`GET /api/applications/barangays` requires authentication. `data` now contains objects rather than name strings:

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Bagong Anyo (Poblacion)",
      "latitude": 14.13,
      "longitude": 121.43,
      "zone_id": 1,
      "zone": {
        "id": 1,
        "name": "Zone 1 (Prime Commercial)",
        "foot_traffic_level": "High",
        "min_capital_floor": 50000,
        "fee_multiplier": 1.25,
        "is_active": true
      }
    }
  ]
}
```

Coordinates above illustrate the response shape; use the returned values. Only active barangays are returned, ordered by name. Both `Step2_Location.jsx` and `ClearanceQueue.jsx` have minimal compatibility changes to extract names. The separate `/api/applications/lookups` endpoint retains its existing name arrays.

Existing Admin routes now allow `location_zones`:

- `GET /api/admin/master-data/location_zones`
- `POST /api/admin/master-data/location_zones`
- `PUT /api/admin/master-data/location_zones/:id`
- `DELETE /api/admin/master-data/location_zones/:id`
- `PUT /api/admin/master-data/barangays/:id` accepts `zone_id`, `latitude`, `longitude`, `name`, `is_active`.

All Admin routes retain authentication and the Admin role guard. Zones require a name, `High` / `Medium` / `Low` traffic level, nonnegative capital floor and positive multiplier. Barangay creation requires name, zone and coordinates. Updates may be partial; arbitrary fields and invalid coordinate ranges are rejected.

## Repeatable local verification

```powershell
cd C:\EBPLS\ebpls\ebpls-server
npm ci
npm test
cd ..\ebpls-frontend
npm ci
npm run build
npx eslint src/screens/admin/MasterData.jsx
```

Database tests use an isolated PGlite PostgreSQL engine, migration 030, and test role helpers. API tests use the real routes/controllers/validation/RBAC guard with simulated identities and mocked Supabase responses. They do not connect to or mutate the shared database. Live deployment and browser verification remain separate acceptance checks.

Phase 2 can now consume the centroid and zone contract. No tenancy fields, applicant wizard redesign, fee assessment behavior, payment workflows, or BPLO workflow overhaul are implemented in this phase.
