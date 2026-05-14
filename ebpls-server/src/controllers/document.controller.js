// =================================================================
// File: src/controllers/document.controller.js
// Purpose: PDF document generation endpoints for Phase 8.
//          Generates and streams Business Permit, E-Resibo, TOP,
//          and Barangay Clearance PDFs.
// Policy:  PDFs are generated on-demand (not stored). Each request
//          fetches fresh data and renders a new PDF.
// =================================================================

const { supabaseAdmin } = require('../config/supabase');
const { logAction, AUDIT_ACTIONS } = require('../services/audit.service');
const pdfService = require('../services/pdf.service');
const { createError } = require('../middlewares/error.middleware');
const { ERROR_CODES, STATUSES } = require('../utils/constants');

// -----------------------------------------------------------------
// HELPERS
// -----------------------------------------------------------------

/**
 * Generates a sequential permit number: BP-{YEAR}-{NNNNN}
 */
const generatePermitNo = async () => {
  const year = new Date().getFullYear();
  const prefix = `BP-${year}-`;

  const { data, error } = await supabaseAdmin
    .from('permits')
    .select('permit_no')
    .ilike('permit_no', `${prefix}%`)
    .order('permit_no', { ascending: false })
    .limit(1)
    .single();

  let nextSeq = 1;
  if (!error && data && data.permit_no) {
    const lastSeq = data.permit_no.split('-')[2];
    nextSeq = parseInt(lastSeq, 10) + 1;
  }

  return `${prefix}${String(nextSeq).padStart(5, '0')}`;
};

/**
 * Fetches or creates the permit record for an application.
 * Returns the permit data needed for PDF generation.
 */
const getOrCreatePermit = async (applicationNo, userId) => {
  // Check if permit already exists
  const { data: existing } = await supabaseAdmin
    .from('permits')
    .select('*')
    .eq('application_no', applicationNo)
    .single();

  if (existing) return existing;

  // Create new permit
  const permitNo = await generatePermitNo();
  const now = new Date();
  const expiresAt = new Date(now.getFullYear(), 11, 31, 23, 59, 59); // Dec 31 of current year

  const { data: permit, error } = await supabaseAdmin
    .from('permits')
    .insert({
      application_no: applicationNo,
      permit_no: permitNo,
      issued_at: now.toISOString(),
      expires_at: expiresAt.toISOString(),
      issued_by: userId,
    })
    .select()
    .single();

  if (error) {
    console.error('[document.controller] Failed to create permit:', error.message);
    throw createError('Failed to generate permit record.', 500, ERROR_CODES.INTERNAL_ERROR);
  }

  // Create permit_line_items from application_activities
  const { data: activities } = await supabaseAdmin
    .from('application_activities')
    .select('activity_id')
    .eq('application_no', applicationNo);

  if (activities && activities.length > 0) {
    const lineItems = activities.map((a) => ({
      permit_id: permit.id,
      activity_id: a.activity_id,
    }));

    await supabaseAdmin.from('permit_line_items').insert(lineItems);
  }

  return permit;
};

// -----------------------------------------------------------------
// HANDLERS
// -----------------------------------------------------------------

/**
 * GET /api/documents/permit/:app_no
 * Generates and returns the Business Permit PDF.
 */
const getPermitPDF = async (req, res, next) => {
  try {
    const { app_no } = req.params;
    const userId = req.user.userId;

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
      .eq('application_no', app_no)
      .single();

    if (appErr || !app) {
      throw createError('Application not found.', 404, ERROR_CODES.NOT_FOUND);
    }

    // Guard: must be Paid or Completed
    if (![STATUSES.PAID, STATUSES.COMPLETED].includes(app.status)) {
      throw createError('Permit is not yet available. Application must be paid first.', 403, ERROR_CODES.FORBIDDEN);
    }

    // 2. Get or create permit record
    const permit = await getOrCreatePermit(app_no, userId);

    // 3. Fetch activities
    const { data: activities } = await supabaseAdmin
      .from('application_activities')
      .select('business_activities ( name )')
      .eq('application_no', app_no);

    const activityNames = activities?.map((a) => a.business_activities?.name).filter(Boolean) || [];

    // 4. Build owner name
    const tp = app.businesses?.taxpayers;
    const ownerName = tp
      ? `${tp.first_name} ${tp.middle_name ? tp.middle_name + ' ' : ''}${tp.last_name}`
      : 'Business Owner';

    // 5. Build address
    const biz = app.businesses;
    const address = biz
      ? `${biz.address_line1 || ''}, ${biz.barangay || ''}, ${biz.city || 'Liliw'}, ${biz.province || 'Laguna'}`
      : 'Liliw, Laguna';

    // 6. Generate PDF
    const pdfBuffer = await pdfService.generatePermitPDF({
      permitNo: permit.permit_no,
      applicationNo: app_no,
      businessName: biz?.business_name || 'Business',
      tradeName: biz?.trade_name,
      ownerName,
      address,
      activities: activityNames,
      issuedAt: permit.issued_at,
      expiresAt: permit.expires_at,
      issuedBy: 'Hon. Municipal Mayor',
    });

    // 7. Audit
    await logAction({
      userId,
      action: AUDIT_ACTIONS.PERMIT_GENERATED,
      entityType: 'permits',
      entityId: permit.id,
      newValue: { permit_no: permit.permit_no, application_no: app_no },
      ipAddress: req.ip || null,
    });

    // 8. Send PDF
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="Permit_${app_no}.pdf"`);
    return res.send(pdfBuffer);
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/documents/eresibo/:app_no
 * Generates and returns the E-Resibo (Official Receipt) PDF.
 */
const getEResiboPDF = async (req, res, next) => {
  try {
    const { app_no } = req.params;
    const userId = req.user.userId;

    // 1. Fetch application + business + owner
    const { data: app, error: appErr } = await supabaseAdmin
      .from('applications')
      .select(`
        application_no, status,
        businesses (
          business_name,
          taxpayers ( first_name, middle_name, last_name )
        )
      `)
      .eq('application_no', app_no)
      .single();

    if (appErr || !app) {
      throw createError('Application not found.', 404, ERROR_CODES.NOT_FOUND);
    }

    if (![STATUSES.PAID, STATUSES.COMPLETED].includes(app.status)) {
      throw createError('Receipt not available. Payment has not been recorded.', 403, ERROR_CODES.FORBIDDEN);
    }

    // 2. Fetch assessment + line items
    const { data: assessment } = await supabaseAdmin
      .from('assessments')
      .select(`
        id, total_amount, created_at,
        assessment_line_items ( fee_type_id, amount, fee_types ( name ) )
      `)
      .eq('application_no', app_no)
      .single();

    // 3. Fetch transaction
    const { data: transaction } = await supabaseAdmin
      .from('transactions')
      .select('*, users:cashier_id ( email )')
      .eq('assessment_id', assessment?.id)
      .single();

    // Build data
    const tp = app.businesses?.taxpayers;
    const ownerName = tp
      ? `${tp.first_name} ${tp.middle_name ? tp.middle_name + ' ' : ''}${tp.last_name}`
      : 'Business Owner';

    const lineItems = assessment?.assessment_line_items?.map((item) => ({
      name: item.fee_types?.name || `Fee #${item.fee_type_id}`,
      amount: item.amount,
    })) || [];

    // 4. Generate PDF
    const pdfBuffer = await pdfService.generateEResiboPDF({
      orNumber: transaction?.or_number || transaction?.paymongo_payment_id || 'N/A',
      businessName: app.businesses?.business_name || 'Business',
      ownerName,
      applicationNo: app_no,
      paidAt: transaction?.paid_at,
      lineItems,
      totalAmount: assessment?.total_amount || 0,
      tenderedType: transaction?.tendered_type || 'Cash',
      amountTendered: transaction?.amount_tendered || 0,
      changeAmount: transaction?.change_amount || 0,
      cashierName: transaction?.users?.email || 'Treasury Officer',
    });

    // 5. Audit
    await logAction({
      userId,
      action: AUDIT_ACTIONS.ERESIBO_GENERATED,
      entityType: 'transactions',
      entityId: transaction?.transaction_id || app_no,
      newValue: { or_number: transaction?.or_number, application_no: app_no },
      ipAddress: req.ip || null,
    });

    // 6. Send PDF
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="EResibo_${app_no}.pdf"`);
    return res.send(pdfBuffer);
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/documents/top/:app_no
 * Generates and returns the Tax Order of Payment (TOP) PDF.
 */
const getTOPPDF = async (req, res, next) => {
  try {
    const { app_no } = req.params;
    const userId = req.user.userId;

    // 1. Fetch application + business + owner
    const { data: app, error: appErr } = await supabaseAdmin
      .from('applications')
      .select(`
        application_no, status,
        businesses (
          business_name,
          taxpayers ( first_name, middle_name, last_name )
        )
      `)
      .eq('application_no', app_no)
      .single();

    if (appErr || !app) {
      throw createError('Application not found.', 404, ERROR_CODES.NOT_FOUND);
    }

    // TOP is available once assessed
    const validStatuses = [STATUSES.ASSESSED, STATUSES.FOR_PAYMENT, STATUSES.PAYMENT_PROCESSING, STATUSES.PAID, STATUSES.COMPLETED];
    if (!validStatuses.includes(app.status)) {
      throw createError('TOP not available. Assessment has not been completed.', 403, ERROR_CODES.FORBIDDEN);
    }

    // 2. Fetch assessment + line items
    const { data: assessment } = await supabaseAdmin
      .from('assessments')
      .select(`
        id, total_amount, created_at,
        assessment_line_items ( fee_type_id, amount, fee_types ( name ) )
      `)
      .eq('application_no', app_no)
      .single();

    if (!assessment) {
      throw createError('Assessment not found for this application.', 404, ERROR_CODES.NOT_FOUND);
    }

    // Build data
    const tp = app.businesses?.taxpayers;
    const ownerName = tp
      ? `${tp.first_name} ${tp.middle_name ? tp.middle_name + ' ' : ''}${tp.last_name}`
      : 'Business Owner';

    const lineItems = assessment.assessment_line_items?.map((item) => ({
      name: item.fee_types?.name || `Fee #${item.fee_type_id}`,
      amount: item.amount,
    })) || [];

    // 3. Generate PDF
    const pdfBuffer = await pdfService.generateTOPPDF({
      applicationNo: app_no,
      businessName: app.businesses?.business_name || 'Business',
      ownerName,
      assessedAt: assessment.created_at,
      lineItems,
      totalAmount: assessment.total_amount,
    });

    // 4. Audit
    await logAction({
      userId,
      action: AUDIT_ACTIONS.TOP_GENERATED,
      entityType: 'assessments',
      entityId: assessment.id,
      newValue: { application_no: app_no, total_amount: assessment.total_amount },
      ipAddress: req.ip || null,
    });

    // 5. Send PDF
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="TOP_${app_no}.pdf"`);
    return res.send(pdfBuffer);
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/documents/barangay-clearance/:id
 * Generates and returns the Barangay Clearance PDF.
 */
const getBarangayClearancePDF = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    // 1. Fetch clearance with application and business data
    const { data: clearance, error: clrErr } = await supabaseAdmin
      .from('barangay_clearances')
      .select(`
        *,
        applications (
          application_no,
          businesses (
            business_name, address_line1, barangay, city,
            taxpayers ( first_name, middle_name, last_name )
          )
        )
      `)
      .eq('id', id)
      .single();

    if (clrErr || !clearance) {
      throw createError('Barangay clearance not found.', 404, ERROR_CODES.NOT_FOUND);
    }

    if (clearance.status !== 'Issued') {
      throw createError('Clearance has not been issued yet.', 403, ERROR_CODES.FORBIDDEN);
    }

    // Build data
    const biz = clearance.applications?.businesses;
    const tp = biz?.taxpayers;
    const ownerName = tp
      ? `${tp.first_name} ${tp.middle_name ? tp.middle_name + ' ' : ''}${tp.last_name}`
      : 'Business Owner';

    // 2. Generate PDF
    const pdfBuffer = await pdfService.generateBarangayClearancePDF({
      clearanceId: id,
      businessName: biz?.business_name || 'Business',
      ownerName,
      barangay: biz?.barangay || 'Poblacion',
      address: `${biz?.address_line1 || ''}, ${biz?.barangay || ''}, ${biz?.city || 'Liliw'}, Laguna`,
      issuedAt: clearance.issued_at,
      processedBy: 'Punong Barangay',
    });

    // 3. Audit
    await logAction({
      userId,
      action: AUDIT_ACTIONS.CLEARANCE_ISSUED,
      entityType: 'barangay_clearances',
      entityId: id,
      newValue: { generated_pdf: true },
      ipAddress: req.ip || null,
    });

    // 4. Send PDF
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="BarangayClearance_${id}.pdf"`);
    return res.send(pdfBuffer);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getPermitPDF,
  getEResiboPDF,
  getTOPPDF,
  getBarangayClearancePDF,
};
