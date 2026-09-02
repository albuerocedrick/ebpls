-- 043_location_mismatch.sql
ALTER TABLE applications
  ADD COLUMN IF NOT EXISTS location_mismatch BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN applications.location_mismatch IS
  'Set TRUE when server-side Turf.js point-in-polygon check detects the submitted
   pin coordinates do not fall within the declared barangay polygon. Re-evaluated
   on every resubmission.';
