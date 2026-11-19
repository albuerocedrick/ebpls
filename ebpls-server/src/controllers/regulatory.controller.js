const { z } = require('zod');
const { supabaseAdmin } = require('../config/supabase');
const { generatePresignedDownloadUrl } = require('../services/storage.service');
const { createError } = require('../middlewares/error.middleware');
const { ROLES, STATUSES } = require('../utils/constants');

const agencyRoles = Object.freeze({ MHO: ROLES.MHO_OFFICER, BFB: ROLES.BFB_OFFICER, AMILYAR: ROLES.AMILYAR_OFFICER });
const agencySchema = z.enum(['MHO', 'BFB', 'AMILYAR']);
const appNumberSchema = z.string().min(1).max(20);
const queueStatuses = [STATUSES.PENDING, STATUSES.UNDER_REVIEW];
const passingStatuses = new Set(['Verified', 'Not Needed']);
const decisionSchema = z.object({ remarks: z.string().trim().min(1).max(1000) });

function authorizedAgency(req, write = false) {
  const agency = agencySchema.parse(req.query.agency);
  if (req.user.roleName !== agencyRoles[agency] && (write || req.user.roleName !== ROLES.ADMIN)) {
    throw createError('This clearance belongs to a different agency.', 403);
  }
  return agency;
}

async function read(query, message) {
  const { data, error } = await query;
  if (error) throw createError(message, 500);
  return data;
}

async function getClearanceStatuses(applicationNo) {
  const data = await read(supabaseAdmin.from('regulatory_clearances')
    .select('agency_code,status,remarks,verified_by,verified_at,officer:users(email,taxpayers(first_name,last_name))')
    .eq('application_no', applicationNo).order('agency_code'), 'Unable to load regulatory clearances.');
  return data.map(({ officer, ...row }) => {
    const profile = Array.isArray(officer?.taxpayers) ? officer.taxpayers[0] : officer?.taxpayers;
    return { ...row, officer_name: [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || officer?.email || null };
  });
}

const clearancesComplete = rows => Object.keys(agencyRoles).every(agency => rows.some(row => row.agency_code === agency && passingStatuses.has(row.status)));

async function getQueue(req, res, next) {
  try {
    const agency = authorizedAgency(req);
    const page = z.coerce.number().int().min(1).max(10000).default(1).parse(req.query.page);
    const limit = 25;
    const { data, error, count } = await supabaseAdmin.from('regulatory_clearances')
      .select('application_no,status,applications!inner(status,submitted_at,businesses(business_name,bin))', { count: 'exact' })
      .eq('agency_code', agency).eq('status', 'Pending').in('applications.status', queueStatuses)
      .order('application_no', { ascending: true }).range((page - 1) * limit, page * limit - 1);
    if (error) throw createError('Unable to load the inspection queue.', 500);
    res.json({ success: true, data, meta: { page, limit, total: count } });
  } catch (error) { next(error); }
}

async function getApplicationDocuments(req, res, next) {
  try {
    const agency = authorizedAgency(req);
    const applicationNo = appNumberSchema.parse(req.params.applicationNo);
    const record = await read(supabaseAdmin.from('regulatory_clearances')
      .select('status,applications!inner(status)')
      .eq('agency_code', agency).eq('application_no', applicationNo).in('applications.status', queueStatuses).maybeSingle(),
    'Unable to load the clearance.');
    if (!record || record.status !== 'Pending') throw createError('Pending clearance not found.', 404);

    const documents = await read(supabaseAdmin.from('doc_verifications')
      .select('requirement_id,file_path,requirement_types!inner(name,regulatory_agency_code),application_document_files(file_path,business_branches(branch_name,address_line1,barangay))')
      .eq('application_no', applicationNo).eq('requirement_types.regulatory_agency_code', agency), 'Unable to load agency documents.');
    const data = await Promise.all(documents.map(async document => {
      const branchByPath = new Map((document.application_document_files || []).map(file => [file.file_path, file.business_branches]));
      const paths = (document.file_path || '').split(',').map(path => path.trim()).filter(Boolean);
      const files = await Promise.all(paths.map(async path => ({
        url: await generatePresignedDownloadUrl(path, 15 * 60),
        is_image: /\.(jpe?g|png)$/i.test(path),
        branch: branchByPath.get(path) ?? null,
      })));
      return { requirement_id: document.requirement_id, name: document.requirement_types.name, files };
    }));
    res.json({ success: true, data });
  } catch (error) { next(error); }
}

function makeDecision(status) {
  return async (req, res, next) => {
    try {
      const agency = authorizedAgency(req, true);
      const applicationNo = appNumberSchema.parse(req.params.applicationNo);
      const remarks = status === 'Returned' ? decisionSchema.parse(req.body).remarks : null;
      const { data, error } = await supabaseAdmin.rpc('review_regulatory_clearance', {
        p_application_no: applicationNo, p_agency: agency, p_officer: req.user.userId, p_decision: status, p_remarks: remarks,
      });
      if (error) {
        if (error.code === '42501') throw createError('Only the assigned agency can review this clearance.', 403);
        if (error.code === 'P0002') throw createError('Clearance not found.', 404);
        if (error.code === '22023') throw createError(error.message, 409);
        throw createError('Unable to save the clearance decision.', 500);
      }
      res.json({ success: true, data });
    } catch (error) { next(error); }
  };
}

module.exports = {
  agencyRoles, getClearanceStatuses, clearancesComplete, getQueue, getApplicationDocuments,
  verify: makeDecision('Verified'), returnClearance: makeDecision('Returned'),
};
