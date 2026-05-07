// =================================================================
// File: src/services/audit.service.js
// Purpose: Centralized, reusable audit logging for DPA 2012 compliance.
//          Every significant mutation in the system must call logAction().
//
// Architecture:
//   - Uses supabaseAdmin (service_role key) to bypass RLS.
//   - RLS on public.audit_logs has NO INSERT policy for 'authenticated' role.
//     This means client-side writes are impossible by design (013_rls_policies.sql).
//   - This service is the ONLY authorized INSERT path into audit_logs.
//
// Policy (backend-developer.md):
//   - Fail Closed: If audit logging fails, the error is logged to console
//     but does NOT abort the parent request. The business operation succeeds
//     even if audit logging has a transient error — this prevents a logging
//     outage from blocking the entire application.
//   - ASSUMPTION: The trade-off above is intentional. A missed audit log is
//     less severe than blocking an applicant's submission. If stricter
//     compliance is required, wrap the parent operation in a DB transaction.
// =================================================================

const { supabaseAdmin } = require('../config/supabase');
const { AUDIT_ACTIONS }  = require('../utils/constants');

// Re-export AUDIT_ACTIONS so callers only need one import.
module.exports.AUDIT_ACTIONS = AUDIT_ACTIONS;

/**
 * Inserts an immutable record into public.audit_logs.
 *
 * @param {object}      params
 * @param {string|null} params.userId      - UUID of the acting user. Pass null for system actions.
 * @param {string}      params.action      - Canonical action name from AUDIT_ACTIONS.
 * @param {string}      params.entityType  - Table name of the affected entity (e.g., 'applications').
 * @param {string}      params.entityId    - PK of the affected row (string form of UUID or VARCHAR PK).
 * @param {object|null} [params.oldValue]  - JSONB snapshot of the row BEFORE the mutation.
 * @param {object|null} [params.newValue]  - JSONB snapshot of the row AFTER the mutation.
 * @param {string|null} [params.ipAddress] - Client IP from getClientIp(req). Falls back to null.
 *
 * @returns {Promise<void>} Resolves when the log is written. Never throws.
 */
const logAction = async ({
  userId,
  action,
  entityType,
  entityId,
  oldValue  = null,
  newValue  = null,
  ipAddress = null,
}) => {
  // Guard: action must be a recognized constant.
  // This prevents arbitrary strings from polluting the audit trail.
  const validActions = Object.values(AUDIT_ACTIONS);
  if (!validActions.includes(action)) {
    // Log the programming error but do not throw — fail soft for audit.
    console.error(
      `[audit.service] ⚠️  Unknown action "${action}" passed to logAction(). ` +
      `Add it to AUDIT_ACTIONS in constants.js and document it in 011_audit_logs.sql.`
    );
    return;
  }

  // Guard: entityType and entityId are required for traceability.
  if (!entityType || !entityId) {
    console.error(
      `[audit.service] ⚠️  logAction() called without entityType or entityId. ` +
      `Action: ${action}. Audit record will be skipped.`
    );
    return;
  }

  try {
    const { error } = await supabaseAdmin
      .from('audit_logs')
      .insert({
        user_id:     userId   || null,
        action,
        entity_type: entityType,
        entity_id:   String(entityId), // Coerce to VARCHAR to handle UUID and non-UUID PKs
        old_value:   oldValue  || null,
        new_value:   newValue  || null,
        ip_address:  ipAddress || null,
        // created_at is set server-side by Postgres DEFAULT NOW() — never trust client time.
      });

    if (error) {
      // Supabase returned an error (e.g., constraint violation, network issue).
      // Log it but do not propagate — see policy note above.
      console.error(`[audit.service] ❌ Failed to write audit log. Action: ${action}.`, error.message);
    }
  } catch (err) {
    // Unexpected runtime error (e.g., supabaseAdmin is misconfigured).
    // Same soft-fail policy applies.
    console.error(`[audit.service] ❌ Unexpected error in logAction(). Action: ${action}.`, err.message);
  }
};

module.exports = {
  logAction,
  // Re-export for convenience so callers don't need a second import
  AUDIT_ACTIONS,
};
