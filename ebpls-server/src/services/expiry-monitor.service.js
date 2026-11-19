/**
 * File: src/services/expiry-monitor.service.js
 * Purpose: Automated background service monitoring permit validity dates.
 *          Dispatches multi-channel alerts at 60, 30, and 15 days before Dec 31
 *          with deduplication to prevent repeated notifications.
 */

const { supabaseAdmin } = require('../config/supabase');
const { EMAIL_TRIGGERS, AUDIT_ACTIONS } = require('../utils/constants');
const { dispatchEmail } = require('./email.service');
const { logAction } = require('./audit.service');

/**
 * Scans active permits and dispatches 60/30/15-day expiry alerts.
 * Supports an optional simulatedNow date for automated testing and scheduled cron runs.
 *
 * @param {Date|string|null} simulatedNow - Optional reference timestamp
 * @returns {Promise<object>} Summary of scanned and dispatched notifications
 */
async function scanAndDispatchExpiryAlerts(simulatedNow = null) {
  const refDate = simulatedNow ? new Date(simulatedNow) : new Date();

  // 1. Fetch eligible expiring permits using deduplicated stored procedure
  const { data: expiringPermits, error } = await supabaseAdmin.rpc('get_expiring_permits', {
    p_reference_date: refDate.toISOString(),
  });

  if (error) {
    console.error('[expiry-monitor] Failed to fetch expiring permits:', error.message);
    throw new Error(`Failed to query expiring permits: ${error.message}`);
  }

  const results = {
    reference_date: refDate.toISOString(),
    total_evaluated: expiringPermits ? expiringPermits.length : 0,
    tier_60: 0,
    tier_30: 0,
    tier_15: 0,
    details: [],
  };

  if (!expiringPermits || expiringPermits.length === 0) {
    return results;
  }

  for (const item of expiringPermits) {
    const {
      permit_no,
      business_id,
      bin,
      business_name,
      taxpayer_user_id,
      taxpayer_name,
      taxpayer_email,
      expires_at,
      days_remaining,
      warning_tier,
    } = item;

    const actionUrl = `/applicant/renew/${business_id}`;
    let triggerEvent;
    let notifTitle;
    let notifMsg;

    if (warning_tier === 60) {
      triggerEvent = EMAIL_TRIGGERS.PERMIT_EXPIRY_WARNING_60;
      notifTitle = `Permit Renewal Advisory (60 Days Remaining)`;
      notifMsg = `Your business permit for ${business_name} (BIN: ${bin}) expires on Dec 31. You may now review your approved branches and prepare gross sales declarations for 2027 renewal.`;
      results.tier_60 += 1;
    } else if (warning_tier === 30) {
      triggerEvent = EMAIL_TRIGGERS.PERMIT_EXPIRY_WARNING_30;
      notifTitle = `Permit Expiring in 30 Days (Renewal Open)`;
      notifMsg = `Your permit for ${business_name} expires on Dec 31. The online renewal portal is open for selective branch and line renewal.`;
      results.tier_30 += 1;
    } else {
      triggerEvent = EMAIL_TRIGGERS.PERMIT_EXPIRY_WARNING_15;
      notifTitle = `URGENT: Permit Expires in ${days_remaining} Days!`;
      notifMsg = `Your permit for ${business_name} expires on Dec 31. File your renewal immediately to avoid the 25% statutory renewal surcharge after January 20.`;
      results.tier_15 += 1;
    }

    // 2. Deliver in-app notification bell item
    if (taxpayer_user_id) {
      try {
        await supabaseAdmin.from('notifications').insert({
          user_id: taxpayer_user_id,
          type: warning_tier === 15 ? 'PERMIT_EXPIRY_URGENT' : 'PERMIT_EXPIRY_WARNING',
          title: notifTitle,
          message: notifMsg,
          action_url: actionUrl,
          is_read: false,
        });
      } catch (notifErr) {
        console.warn(`[expiry-monitor] Failed to insert in-app notification for ${permit_no}:`, notifErr.message);
      }
    }

    // 3. Dispatch transactional email
    if (taxpayer_email) {
      dispatchEmail({
        triggerEvent,
        recipientEmail: taxpayer_email,
        applicationNo: null,
        payload: {
          name: taxpayer_name,
          businessName: business_name,
          permitNo: permit_no,
          bin: bin || 'On Record',
          expiryDate: new Date(expires_at).toLocaleDateString('en-PH', { dateStyle: 'long', timeZone: 'Asia/Manila' }),
          actionUrl,
        },
      });
    }

    // 4. Log to permit_expiry_logs to prevent duplicate sends for this tier
    const { error: logErr } = await supabaseAdmin.rpc('log_permit_expiry_notification', {
      p_permit_no: permit_no,
      p_business_id: business_id,
      p_tier: warning_tier,
      p_channel: 'both',
    });

    if (logErr) {
      console.warn(`[expiry-monitor] Failed to record expiry log for ${permit_no}:`, logErr.message);
    }

    // 5. Audit log
    try {
      logAction({
        userId: taxpayer_user_id || null,
        action: AUDIT_ACTIONS.EXPIRY_WARNING_SENT,
        entityType: 'permits',
        entityId: permit_no,
        newValue: {
          permit_no,
          business_id,
          warning_tier,
          days_remaining,
          dispatched_at: new Date().toISOString(),
        },
      });
    } catch (auditErr) {
      console.warn(`[expiry-monitor] Failed to log audit for ${permit_no}:`, auditErr.message);
    }

    results.details.push({
      permit_no,
      business_name,
      warning_tier,
      days_remaining,
    });
  }

  return results;
}

/**
 * Initializes daily background interval for scanning permit validity.
 * Runs once every 24 hours.
 */
let cronIntervalId = null;

function startDailyExpiryCron() {
  if (cronIntervalId) return;

  // Run initial scan in background (safe, non-blocking)
  scanAndDispatchExpiryAlerts().catch((err) => {
    console.error('[expiry-monitor] Initial cron run failed:', err.message);
  });

  // Schedule daily interval (24 hours)
  const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
  cronIntervalId = setInterval(() => {
    scanAndDispatchExpiryAlerts().catch((err) => {
      console.error('[expiry-monitor] Daily cron run failed:', err.message);
    });
  }, TWENTY_FOUR_HOURS);
}

function stopDailyExpiryCron() {
  if (cronIntervalId) {
    clearInterval(cronIntervalId);
    cronIntervalId = null;
  }
}

module.exports = {
  scanAndDispatchExpiryAlerts,
  startDailyExpiryCron,
  stopDailyExpiryCron,
};
