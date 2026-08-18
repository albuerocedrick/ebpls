// =================================================================
// File: src/services/email.service.js
// Purpose: Centralized transactional email service for all 10 eBPLS
//          email trigger events. Implements the Outbox Pattern:
//          1. INSERT a 'Pending' row into email_notifications BEFORE sending.
//          2. Attempt to send via Nodemailer (Brevo or Ethereal).
//          3. UPDATE the row to 'Sent' or 'Failed' with error details.
//
// Architecture:
//   - Uses supabaseAdmin (service_role) to bypass RLS on email_notifications.
//   - dispatchEmail() is intentionally fire-and-forget (non-blocking).
//     Callers do NOT await it — the HTTP response is returned immediately.
//     Email failures never abort or delay the parent business transaction.
//   - All 10 EMAIL_TRIGGERS have a dedicated HTML template builder.
//   - PDF attachments are passed as in-memory buffers — never written to disk.
//
// ASSUMPTION: recipient_email is always a valid, non-null string.
//             The caller (controller) is responsible for resolving the
//             recipient's email before calling dispatchEmail().
// =================================================================

const { supabaseAdmin } = require('../config/supabase');
const { sendEmail }     = require('../config/mailer');
const { EMAIL_TRIGGERS } = require('../utils/constants');
const pdfService = require('./pdf.service');

// =================================================================
// SECTION 1: HTML EMAIL TEMPLATES
// Each function returns a { subject, html } object.
// The 'payload' argument contains all context needed to render the template.
// Payload is also stored as JSONB in email_notifications for retry use.
// =================================================================

const templates = {

  [EMAIL_TRIGGERS.ACCOUNT_CREATED]: ({ name, actionLink }) => ({
    subject: `eBPLS — Verify your Account`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 24px; border: 1px solid #e5e7eb; border-radius: 8px;">
        <h2 style="color: #1d4ed8;">Welcome to eBPLS!</h2>
        <p>Hello <strong>${name}</strong>,</p>
        <p>Thank you for registering. Please confirm your email address by clicking the link below:</p>
        <div style="text-align: center; margin: 24px 0;">
          <a href="${actionLink}" style="background-color: #1d4ed8; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">Verify Email</a>
        </div>
        <p style="font-size: 14px; color: #6b7280;">If the button does not work, copy and paste this link into your browser:<br/>${actionLink}</p>
        <hr style="border-color: #e5e7eb; margin-top: 32px;" />
        <p style="font-size: 12px; color: #6b7280;">Municipality of Liliw | eBPLS</p>
      </div>`,
  }),

  [EMAIL_TRIGGERS.PASSWORD_RESET]: ({ actionLink }) => ({
    subject: `eBPLS — Password Reset Request`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 24px; border: 1px solid #e5e7eb; border-radius: 8px;">
        <h2 style="color: #dc2626;">Password Reset</h2>
        <p>We received a request to reset your eBPLS password. Click the link below to set a new password:</p>
        <div style="text-align: center; margin: 24px 0;">
          <a href="${actionLink}" style="background-color: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">Reset Password</a>
        </div>
        <p style="font-size: 14px; color: #6b7280;">If you did not request a password reset, you can safely ignore this email.</p>
        <hr style="border-color: #e5e7eb; margin-top: 32px;" />
        <p style="font-size: 12px; color: #6b7280;">Municipality of Liliw | eBPLS</p>
      </div>`,
  }),


  [EMAIL_TRIGGERS.APPLICATION_SUBMITTED]: ({ name, applicationNo, businessName }) => ({
    subject: `eBPLS — Application Received (${applicationNo})`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 24px; border: 1px solid #e5e7eb; border-radius: 8px;">
        <h2 style="color: #1d4ed8;">Application Received</h2>
        <p>Hello <strong>${name}</strong>,</p>
        <p>Your business permit application for <strong>${businessName}</strong> has been successfully submitted to the BPLO office for review.</p>
        <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
          <tr><td style="padding: 8px; background: #f3f4f6; font-weight: bold; border-radius: 4px;">Application Number</td><td style="padding: 8px;">${applicationNo}</td></tr>
        </table>
        <p>You will receive another notification once your documents have been reviewed. You can track your application status by logging into your eBPLS account.</p>
        <hr style="border-color: #e5e7eb;" />
        <p style="font-size: 12px; color: #6b7280;">Municipality of Liliw | eBPLS</p>
      </div>`,
  }),

  [EMAIL_TRIGGERS.APPLICATION_RETURNED]: ({ name, applicationNo, businessName, remarks }) => ({
    subject: `eBPLS — Action Required: Application Returned (${applicationNo})`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 24px; border: 1px solid #e5e7eb; border-radius: 8px;">
        <h2 style="color: #dc2626;">Application Returned — Action Required</h2>
        <p>Hello <strong>${name}</strong>,</p>
        <p>Your business permit application for <strong>${businessName}</strong> (${applicationNo}) has been returned by the BPLO office and requires your attention.</p>
        <div style="background: #fef2f2; border-left: 4px solid #dc2626; padding: 12px 16px; border-radius: 4px; margin: 16px 0;">
          <strong>Officer's Remarks:</strong>
          <p style="margin: 8px 0 0;">${remarks || 'Please log in to your account for details.'}</p>
        </div>
        <p>Please log in to your eBPLS account, review the remarks, make the necessary corrections, and resubmit your application.</p>
        <hr style="border-color: #e5e7eb;" />
        <p style="font-size: 12px; color: #6b7280;">Municipality of Liliw | eBPLS</p>
      </div>`,
  }),

  [EMAIL_TRIGGERS.APPLICATION_VERIFIED]: ({ name, applicationNo, businessName }) => ({
    subject: `eBPLS — Application Verified (${applicationNo})`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 24px; border: 1px solid #e5e7eb; border-radius: 8px;">
        <h2 style="color: #16a34a;">Application Verified</h2>
        <p>Hello <strong>${name}</strong>,</p>
        <p>We are pleased to inform you that your business permit application for <strong>${businessName}</strong> (${applicationNo}) has been successfully verified by the BPLO office.</p>
        <p>Your application has been forwarded to the <strong>Treasury Office</strong> for fee assessment. You will receive another notification once your Tax Order of Payment (TOP) is ready.</p>
        <hr style="border-color: #e5e7eb;" />
        <p style="font-size: 12px; color: #6b7280;">Municipality of Liliw | eBPLS</p>
      </div>`,
  }),

  [EMAIL_TRIGGERS.TOP_GENERATED]: ({ name, applicationNo, businessName, totalAmount }) => ({
    subject: `eBPLS — Tax Order of Payment Ready (${applicationNo})`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 24px; border: 1px solid #e5e7eb; border-radius: 8px;">
        <h2 style="color: #1d4ed8;">Tax Order of Payment (TOP) Ready</h2>
        <p>Hello <strong>${name}</strong>,</p>
        <p>Your Tax Order of Payment for <strong>${businessName}</strong> (${applicationNo}) is now ready. The assessed amount due is:</p>
        <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 6px; padding: 16px; text-align: center; margin: 16px 0;">
          <span style="font-size: 28px; font-weight: bold; color: #1d4ed8;">PHP ${Number(totalAmount).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
        </div>
        <p>The official TOP document is attached to this email. Please proceed to the <strong>Municipal Treasury Office</strong> to settle your payment.</p>
        <hr style="border-color: #e5e7eb;" />
        <p style="font-size: 12px; color: #6b7280;">Municipality of Liliw | eBPLS</p>
      </div>`,
  }),

  [EMAIL_TRIGGERS.PAYMENT_RECORDED]: ({ name, applicationNo, businessName, orNumber, amount, paymentChannel }) => ({
    subject: `eBPLS — Payment Confirmed (OR No. ${orNumber})`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 24px; border: 1px solid #e5e7eb; border-radius: 8px;">
        <h2 style="color: #16a34a;">Payment Confirmed</h2>
        <p>Hello <strong>${name}</strong>,</p>
        <p>We have successfully received your payment for <strong>${businessName}</strong> (${applicationNo}).</p>
        <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
          <tr style="background: #f3f4f6;">
            <td style="padding: 10px; font-weight: bold;">Official Receipt No.</td>
            <td style="padding: 10px;">${orNumber}</td>
          </tr>
          <tr>
            <td style="padding: 10px; font-weight: bold;">Amount Paid</td>
            <td style="padding: 10px;">PHP ${Number(amount).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</td>
          </tr>
          <tr style="background: #f3f4f6;">
            <td style="padding: 10px; font-weight: bold;">Payment Method</td>
            <td style="padding: 10px;">${paymentChannel || 'Over-the-Counter'}</td>
          </tr>
        </table>
        <p>Your Business Permit is now being processed and will be ready shortly. You will receive a final notification when it is available for download.</p>
        <hr style="border-color: #e5e7eb;" />
        <p style="font-size: 12px; color: #6b7280;">Municipality of Liliw | eBPLS — This is an official receipt notification.</p>
      </div>`,
  }),

  [EMAIL_TRIGGERS.PERMIT_READY]: ({ name, applicationNo, businessName }) => ({
    subject: `eBPLS — Business Permit Ready (${applicationNo})`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 24px; border: 1px solid #e5e7eb; border-radius: 8px;">
        <h2 style="color: #16a34a;">Your Business Permit is Ready!</h2>
        <p>Hello <strong>${name}</strong>,</p>
        <p>Congratulations! Your official <strong>Business Permit</strong> and <strong>E-Resibo</strong> for <strong>${businessName}</strong> are now available.</p>
        <p>The documents are attached to this email. You may also download them at any time by logging in to your eBPLS account.</p>
        <p style="background: #f0fdf4; border-left: 4px solid #16a34a; padding: 12px 16px; border-radius: 4px;">Please display your Business Permit prominently at your place of business as required by the Local Government Code.</p>
        <hr style="border-color: #e5e7eb;" />
        <p style="font-size: 12px; color: #6b7280;">Municipality of Liliw | eBPLS</p>
      </div>`,
  }),

  [EMAIL_TRIGGERS.BARANGAY_CLEARANCE_REJECTED]: ({ name, applicationNo, businessName, remarks }) => ({
    subject: `eBPLS — Barangay Clearance Rejected (${applicationNo})`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 24px; border: 1px solid #e5e7eb; border-radius: 8px;">
        <h2 style="color: #dc2626;">Barangay Clearance Not Approved</h2>
        <p>Hello <strong>${name}</strong>,</p>
        <p>We regret to inform you that your Barangay Clearance request for <strong>${businessName}</strong> (${applicationNo}) was not approved by the Barangay Office.</p>
        <div style="background: #fef2f2; border-left: 4px solid #dc2626; padding: 12px 16px; border-radius: 4px; margin: 16px 0;">
          <strong>Reason for Rejection:</strong>
          <p style="margin: 8px 0 0;">${remarks || 'Please contact the Barangay Office directly for details.'}</p>
        </div>
        <p><strong>Next Steps:</strong> Your application has been returned. Please log in to your dashboard, correct the issues mentioned above, and re-submit your application online.</p>
        <hr style="border-color: #e5e7eb;" />
        <p style="font-size: 12px; color: #6b7280;">Municipality of Liliw | eBPLS</p>
      </div>`,
  }),

  [EMAIL_TRIGGERS.RETIREMENT_COMPLETE]: ({ name, businessName, cessationDate }) => ({
    subject: `eBPLS — Business Retirement Confirmed`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 24px; border: 1px solid #e5e7eb; border-radius: 8px;">
        <h2 style="color: #1d4ed8;">Business Retirement Confirmed</h2>
        <p>Hello <strong>${name}</strong>,</p>
        <p>This email confirms that the business retirement for <strong>${businessName}</strong> has been officially processed and recorded in the system effective <strong>${cessationDate}</strong>.</p>
        <p>All outstanding obligations have been settled. If you have any questions, please contact the BPLO office.</p>
        <hr style="border-color: #e5e7eb;" />
        <p style="font-size: 12px; color: #6b7280;">Municipality of Liliw | eBPLS</p>
      </div>`,
  }),

  [EMAIL_TRIGGERS.CERT_READY_NOTIFICATION]: ({ name, applicationNo, businessName, notes, downloadUrl }) => ({
    subject: `eBPLS — Your Business Permit is Ready for Download (${applicationNo})`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 24px; border: 1px solid #e5e7eb; border-radius: 8px;">
        <h2 style="color: #16a34a;">🎉 Your Business Permit is Ready!</h2>
        <p>Hello <strong>${name}</strong>,</p>
        <p>Great news! Your business permit for <strong>${businessName}</strong> is now ready for download.</p>
        <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
          <tr><td style="padding: 8px; background: #f3f4f6; font-weight: bold;">Application No.</td><td style="padding: 8px;">${applicationNo}</td></tr>
          <tr><td style="padding: 8px; background: #f3f4f6; font-weight: bold;">Business</td><td style="padding: 8px;">${businessName}</td></tr>
        </table>
        ${notes ? `<div style="background: #f0fdf4; border-left: 4px solid #16a34a; padding: 12px 16px; margin: 16px 0; border-radius: 4px;"><strong>Notes from BPLO:</strong><br/>${notes}</div>` : ''}
        <p>Please log in to your eBPLS account to download your Business Permit and E-Resibo.</p>
        <hr style="border-color: #e5e7eb; margin-top: 32px;" />
        <p style="font-size: 12px; color: #6b7280;">Municipality of Liliw | eBPLS</p>
      </div>`,
  }),
};

// =================================================================
// SECTION 2: CORE SERVICE FUNCTIONS
// =================================================================

/**
 * Inserts a 'Pending' row into email_notifications and returns its ID.
 * Called synchronously before the send attempt.
 *
 * @param {object} params
 * @param {string|null} params.applicationNo
 * @param {string}      params.triggerEvent  - A value from EMAIL_TRIGGERS constant.
 * @param {string}      params.recipientEmail
 * @param {string}      params.subject
 * @param {object}      params.payload       - Context data for template & retry.
 * @returns {Promise<string|null>}           - UUID of the inserted row, or null on failure.
 */
const _queueEmail = async ({ applicationNo, triggerEvent, recipientEmail, subject, payload }) => {
  const { data, error } = await supabaseAdmin
    .from('email_notifications')
    .insert({
      application_no:  applicationNo || null,
      trigger_event:   triggerEvent,
      recipient_email: recipientEmail,
      subject,
      status:          'Pending',
      payload,         // Stored as JSONB for retry/audit — added in migration 023
    })
    .select('id')
    .single();

  if (error) {
    console.error(`[email.service] Failed to queue email row for ${triggerEvent}:`, error.message);
    return null;
  }
  return data.id;
};

/**
 * Updates the email_notifications row after a send attempt.
 *
 * @param {string} id      - UUID of the email_notifications row.
 * @param {boolean} success - Whether the send succeeded.
 * @param {string} [errorMsg] - Error message string if failed.
 */
const _updateEmailStatus = async (id, success, errorMsg = null) => {
  const update = success
    ? { status: 'Sent',   sent_at: new Date().toISOString() }
    : { status: 'Failed', error_message: errorMsg, retry_count: supabaseAdmin.rpc };

  // Simple update — if this fails, we log it but do not throw.
  const { error } = await supabaseAdmin
    .from('email_notifications')
    .update(
      success
        ? { status: 'Sent', sent_at: new Date().toISOString() }
        : { status: 'Failed', error_message: errorMsg }
    )
    .eq('id', id);

  if (error) {
    console.error(`[email.service] Failed to update email status for row ${id}:`, error.message);
  }
};

/**
 * Dispatches a transactional email for a given trigger event.
 * This function is FIRE-AND-FORGET — callers must NOT await it.
 * Email failures never abort the parent business transaction.
 *
 * @param {object} params
 * @param {string}      params.triggerEvent   - Must be a value from EMAIL_TRIGGERS.
 * @param {string}      params.recipientEmail - Recipient's email address.
 * @param {object}      params.payload        - Data to render the template and store for audit.
 * @param {string|null} [params.applicationNo] - FK to applications.application_no (nullable).
 * @param {Buffer[]}    [params.attachments]  - In-memory PDF buffers. NOT written to disk.
 *
 * Example usage (in a controller):
 *   dispatchEmail({
 *     triggerEvent:   EMAIL_TRIGGERS.APPLICATION_SUBMITTED,
 *     recipientEmail: applicant.email,
 *     applicationNo:  application.application_no,
 *     payload: { name: applicant.full_name, applicationNo: application.application_no, businessName: business.business_name }
 *   }); // No await — fire and forget
 */
const dispatchEmail = (params) => {
  // Run the async logic in the background — do not block the caller.
  _sendEmailAsync(params).catch((unexpectedErr) => {
    // Belt-and-suspenders: catch anything that slips through the internal try/catch.
    console.error('[email.service] Unhandled error in dispatchEmail background task:', unexpectedErr);
  });
};

/**
 * Dynamically generates Business Permit and E-Resibo PDF attachments for an application.
 * Returns an array of { filename, buffer } objects.
 */
const generatePermitAndReceiptAttachments = async (applicationNo) => {
  try {
    // 1. Fetch application with business and owner data
    const { data: app, error: appErr } = await supabaseAdmin
      .from('applications')
      .select(`
        application_no, status,
        businesses (
          business_name, trade_name, address_line1, barangay, city, province,
          taxpayers ( first_name, middle_name, last_name )
        )
      `)
      .eq('application_no', applicationNo)
      .single();

    if (appErr || !app) {
      console.error(`[email.service] Application not found for attachments:`, appErr?.message);
      return [];
    }

    // 2. Fetch or create permit record
    let { data: permit } = await supabaseAdmin
      .from('permits')
      .select('*')
      .eq('application_no', applicationNo)
      .single();

    if (!permit) {
      // Generate sequential permit number
      const year = new Date().getFullYear();
      const prefix = `BP-${year}-`;

      const { data: lastPermit } = await supabaseAdmin
        .from('permits')
        .select('permit_no')
        .ilike('permit_no', `${prefix}%`)
        .order('permit_no', { ascending: false })
        .limit(1)
        .single();

      let nextSeq = 1;
      if (lastPermit && lastPermit.permit_no) {
        const parts = lastPermit.permit_no.split('-');
        if (parts.length >= 3) {
          const lastSeq = parts[2];
          nextSeq = parseInt(lastSeq, 10) + 1;
        }
      }

      const permitNo = `${prefix}${String(nextSeq).padStart(5, '0')}`;
      const now = new Date();
      const expiresAt = new Date(year, 11, 31, 23, 59, 59); // Dec 31 of current year

      // Resolve a valid user ID for the issued_by non-null constraint
      const { data: verifier } = await supabaseAdmin
        .from('doc_verifications')
        .select('verified_by')
        .eq('application_no', applicationNo)
        .not('verified_by', 'is', null)
        .limit(1)
        .maybeSingle();

      let issuedBy = verifier?.verified_by;

      if (!issuedBy) {
        // Safe 2-step lookup to avoid relationship parsing discrepancies
        const { data: roleData } = await supabaseAdmin
          .from('roles')
          .select('role_id')
          .in('role_name', ['BPLO_Officer', 'Admin']);

        const roleIds = roleData?.map((r) => r.role_id) || [];

        if (roleIds.length > 0) {
          const { data: fallbackUser } = await supabaseAdmin
            .from('users')
            .select('user_id')
            .in('role_id', roleIds)
            .limit(1)
            .maybeSingle();
            
          issuedBy = fallbackUser?.user_id;
        }
      }

      if (!issuedBy) {
        console.error(`[email.service] Could not find any BPLO_Officer or Admin user to issue the permit for ${applicationNo}.`);
      } else {
        const { data: newPermit, error: insertErr } = await supabaseAdmin
          .from('permits')
          .insert({
            permit_no: permitNo,
            application_no: applicationNo,
            issued_at: now.toISOString(),
            expires_at: expiresAt.toISOString(),
            issued_by: issuedBy,
          })
          .select()
          .single();

        if (insertErr) {
          console.error(`[email.service] Failed to create permit:`, insertErr.message);
        } else {
          permit = newPermit;
        }
      }
    }

    // 3. Fetch activities
    const { data: activities } = await supabaseAdmin
      .from('application_activities')
      .select('business_activities ( name )')
      .eq('application_no', applicationNo);

    const activityNames = activities?.map((a) => a.business_activities?.name).filter(Boolean) || [];

    // 4. Build owner name & address
    const tp = app.businesses?.taxpayers;
    const ownerName = tp
      ? `${tp.first_name} ${tp.middle_name ? tp.middle_name + ' ' : ''}${tp.last_name}`
      : 'Business Owner';

    const biz = app.businesses;
    const address = biz
      ? `${biz.address_line1 || ''}, ${biz.barangay || ''}, ${biz.city || 'Liliw'}, ${biz.province || 'Laguna'}`
      : 'Liliw, Laguna';

    // 5. Generate Permit PDF Buffer
    let permitBuffer = null;
    if (permit) {
      permitBuffer = await pdfService.generatePermitPDF({
        permitNo: permit.permit_no,
        applicationNo: applicationNo,
        businessName: biz?.business_name || 'Business',
        tradeName: biz?.trade_name,
        ownerName,
        address,
        activities: activityNames,
        issuedAt: permit.issued_at,
        expiresAt: permit.expires_at,
        issuedBy: 'Hon. Municipal Mayor',
      });
    }

    // 6. Fetch assessment + line items + transaction for E-Resibo
    const { data: assessment } = await supabaseAdmin
      .from('assessments')
      .select(`
        id, total_amount, created_at,
        assessment_line_items ( fee_type_id, amount, fee_types ( name ) )
      `)
      .eq('application_no', applicationNo)
      .single();

    const { data: transaction } = await supabaseAdmin
      .from('transactions')
      .select('*, users:cashier_id ( email )')
      .eq('assessment_id', assessment?.id)
      .single();

    const lineItems = assessment?.assessment_line_items?.map((item) => ({
      name: item.fee_types?.name || `Fee #${item.fee_type_id}`,
      amount: item.amount,
    })) || [];

    // 7. Generate E-Resibo PDF Buffer
    let receiptBuffer = null;
    if (assessment && transaction) {
      receiptBuffer = await pdfService.generateEResiboPDF({
        orNumber: transaction.or_number || transaction.paymongo_payment_id || 'N/A',
        businessName: biz?.business_name || 'Business',
        ownerName,
        applicationNo: applicationNo,
        paidAt: transaction.paid_at,
        lineItems,
        totalAmount: assessment.total_amount || 0,
        tenderedType: transaction.tendered_type || 'Cash',
        amountTendered: transaction.amount_tendered || 0,
        changeAmount: transaction.change_amount || 0,
        cashierName: transaction.users?.email || 'Treasury Officer',
      });
    }

    const attachments = [];
    if (permitBuffer) {
      attachments.push({
        filename: `Permit_${applicationNo}.pdf`,
        buffer: permitBuffer,
      });
    }
    if (receiptBuffer) {
      attachments.push({
        filename: `EResibo_${applicationNo}.pdf`,
        buffer: receiptBuffer,
      });
    }

    return attachments;
  } catch (error) {
    console.error(`[email.service] Error generating permit/receipt attachments:`, error);
    return [];
  }
};

/**
 * Internal async implementation. Always resolves — never rejects.
 * @private
 */
const _sendEmailAsync = async ({
  triggerEvent,
  recipientEmail,
  payload,
  applicationNo = null,
  attachments = [],
}) => {
  // Guard: triggerEvent must be a known constant.
  const templateBuilder = templates[triggerEvent];
  if (!templateBuilder) {
    console.error(`[email.service] Unknown trigger event "${triggerEvent}". Add it to EMAIL_TRIGGERS and templates.`);
    return;
  }

  // Guard: recipientEmail must be a non-null string.
  // ASSUMPTION: The calling controller resolved the email from the users table.
  if (!recipientEmail || typeof recipientEmail !== 'string') {
    console.error(`[email.service] Missing or invalid recipientEmail for trigger "${triggerEvent}". Aborting send.`);
    return;
  }

  // Build the template using the provided payload context.
  const { subject, html } = templateBuilder(payload);

  // If the trigger event is PERMIT_READY, generate the PDFs dynamically
  let finalAttachments = attachments;
  if (triggerEvent === EMAIL_TRIGGERS.PERMIT_READY && applicationNo) {
    console.log(`[email.service] Generating Permit and E-Resibo attachments dynamically for application ${applicationNo}...`);
    const generated = await generatePermitAndReceiptAttachments(applicationNo);
    finalAttachments = [...finalAttachments, ...generated];
  }

  // Step 1: Queue the row in email_notifications (Outbox Pattern — record before send).
  const notifId = await _queueEmail({ applicationNo, triggerEvent, recipientEmail, subject, payload });

  // Step 2: Attempt to send the email.
  try {
    const result = await sendEmail({
      to: recipientEmail,
      subject,
      html,
      attachments: finalAttachments.map((a, i) => ({
        filename:    a.filename || `attachment_${i + 1}.pdf`,
        content:     a.buffer,
        contentType: 'application/pdf',
      })),
    });

    console.log(`[email.service] Sent "${triggerEvent}" to ${recipientEmail}. MessageId: ${result.messageId}`);

    // Step 3a: Mark as Sent.
    if (notifId) await _updateEmailStatus(notifId, true);

  } catch (err) {
    console.error(`[email.service] Failed to send "${triggerEvent}" to ${recipientEmail}:`, err.message);

    // Step 3b: Mark as Failed with the error message for future debugging/retry.
    if (notifId) await _updateEmailStatus(notifId, false, err.message);
  }
};

module.exports = {
  dispatchEmail,
  EMAIL_TRIGGERS, // Re-export for convenience — callers only need one import.
};