// =================================================================
// File: src/controllers/admin.controller.js
// Purpose: Controller for Admin-specific endpoints (Email Logs, Audit Logs, etc.)
// =================================================================

const { z } = require('zod');
const { supabaseAdmin } = require('../config/supabase');
const { createError } = require('../middlewares/error.middleware');
const { ERROR_CODES } = require('../utils/constants');
const { logAction, AUDIT_ACTIONS } = require('../services/audit.service');

let cachedHealthData = null;
let lastFetchTime = 0;
const CACHE_TTL = 60 * 1000; // 60 seconds

/**
 * GET /api/admin/health
 * @desc Get system health metrics with 60s cache.
 * @access Admin
 */
const getHealth = async (req, res, next) => {
  try {
    const now = Date.now();
    
    // Return cached data if within TTL
    if (cachedHealthData && (now - lastFetchTime < CACHE_TTL)) {
      return res.status(200).json({ success: true, data: cachedHealthData, cached: true });
    }

    // Fetch using RPCs
    const [connectionsRes, maxConnectionsRes, storageRes] = await Promise.all([
      supabaseAdmin.rpc('get_active_connections'),
      supabaseAdmin.rpc('get_max_connections'),
      supabaseAdmin.rpc('get_storage_size')
    ]);

    if (connectionsRes.error) {
      console.error('[getHealth] DB Connections Error:', connectionsRes.error.message);
    }
    if (maxConnectionsRes.error) {
      console.error('[getHealth] DB Max Connections Error:', maxConnectionsRes.error.message);
    }
    if (storageRes.error) {
      console.error('[getHealth] Storage Size Error:', storageRes.error.message);
    }

    cachedHealthData = {
      activeConnections: connectionsRes.data || 0,
      maxConnections: maxConnectionsRes.data || 100,
      storageSize: storageRes.data || 0,
      apiReads: global.systemStats ? global.systemStats.reads : 0,
      apiWrites: global.systemStats ? global.systemStats.writes : 0,
      errorRate: global.systemStats ? global.systemStats.errors : 0,
      timestamp: new Date().toISOString()
    };
    lastFetchTime = now;

    res.status(200).json({ success: true, data: cachedHealthData, cached: false });
  } catch (err) {
    next(err);
  }
};

const EmailLogQuerySchema = z.object({
  status: z.string().optional(),
  trigger_event: z.string().optional(),
  search: z.string().optional(),
  page: z.preprocess((val) => Number(val) || 1, z.number().int().min(1)),
  limit: z.preprocess((val) => Number(val) || 50, z.number().int().min(1).max(100))
});

/**
 * GET /api/admin/email-logs
 * @desc Fetch all email notifications for the Admin dashboard.
 * @access Admin
 */
const getEmailLogs = async (req, res, next) => {
  try {
    console.log('[getEmailLogs] Raw query:', req.query);
    const query = EmailLogQuerySchema.parse(req.query);
    console.log('[getEmailLogs] Parsed query:', query);
    const { status, trigger_event, search, page, limit } = query;
    const offset = (page - 1) * limit;

    let queryBuilder = supabaseAdmin
      .from('email_notifications')
      .select('id, application_no, trigger_event, recipient_email, recipient_name, subject, status, error_message, retry_count, sent_at, created_at, payload', { count: 'exact' });

    if (status) {
      queryBuilder = queryBuilder.eq('status', status);
    }
    if (trigger_event) {
      queryBuilder = queryBuilder.eq('trigger_event', trigger_event);
    }
    if (search) {
      queryBuilder = queryBuilder.or(`recipient_email.ilike.%${search}%,application_no.ilike.%${search}%`);
    }

    const { data, count, error } = await queryBuilder
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('[getEmailLogs] Error:', error.message);
      throw createError('Failed to fetch email logs.', 500, ERROR_CODES.INTERNAL_ERROR);
    }

    res.status(200).json({
      success: true,
      data,
      pagination: {
        total: count,
        page,
        limit,
        totalPages: Math.ceil((count || 0) / limit)
      }
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return next(createError('Invalid query parameters', 400, ERROR_CODES.VALIDATION_ERROR));
    }
    next(err);
  }
};

/**
 * GET /api/admin/applications
 * @desc Get all applications for the Master Queue, with pagination and filtering.
 * @access Admin
 */
const getAllApplications = async (req, res, next) => {
  try {
    const { page = 1, limit = 50, status, search } = req.query;
    
    // We use supabaseAdmin to bypass RLS and view all applications across the system.
    let query = supabaseAdmin
      .from('applications')
      .select(`
        application_no,
        status,
        submitted_at,
        created_at,
        type_id,
        application_types ( name ),
        businesses (
          business_name,
          taxpayers (
            first_name,
            last_name,
            users ( email )
          )
        )
      `, { count: 'exact' });

    const VALID_APPLICATION_STATUSES = [
      'Draft',
      'Pending',
      'Under Review',
      'Returned',
      'Verified',
      'For Assessment',
      'Assessed',
      'For Payment',
      'PaymentProcessing',
      'Paid',
      'Completed'
    ];

    if (status) {
      if (!VALID_APPLICATION_STATUSES.includes(status)) {
        return next(createError(`Invalid application status: "${status}"`, 400, ERROR_CODES.VALIDATION_ERROR));
      }
      query = query.eq('status', status);
    }

    if (search) {
      query = query.ilike('application_no', `%${search}%`);
    }

    // Pagination
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const from = (pageNum - 1) * limitNum;
    const to = from + limitNum - 1;
    
    query = query.range(from, to).order('created_at', { ascending: false });

    const { data, error, count } = await query;

    if (error) {
      console.error('[getAllApplications] Failed to fetch applications:', error.message);
      return next(createError(`Failed to fetch applications.`, 500));
    }

    // Format the response to flatten nested taxpayer info
    const formattedData = data.map(app => {
      const b = app.businesses;
      const t = b?.taxpayers;
      const u = t?.users;
      return {
        application_no: app.application_no,
        status: app.status,
        type: app.application_types?.name,
        submitted_at: app.submitted_at || app.created_at,
        business_name: b?.business_name,
        taxpayer_name: t ? `${t.first_name} ${t.last_name}` : null,
        taxpayer_email: u?.email || null,
      };
    });

    res.status(200).json({
      success: true,
      data: formattedData,
      meta: {
        total: count || 0,
        page: pageNum,
        limit: limitNum
      }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/admin/users
 * @desc Get all registered users, their roles, and taxpayer profile info.
 * @access Admin
 */
const getAllUsers = async (req, res, next) => {
  try {
    const { page = 1, limit = 50, role, search } = req.query;

    let query = supabaseAdmin
      .from('users')
      .select(`
        user_id,
        email,
        is_active,
        created_at,
        role_id,
        roles (
          role_name
        ),
        taxpayers (
          first_name,
          last_name,
          contact_no,
          tin_no
        )
      `, { count: 'exact' });

    if (role) {
      query = query.eq('role_id', parseInt(role, 10));
    }

    if (search) {
      query = query.or(`email.ilike.%${search}%`);
    }

    // Pagination
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const from = (pageNum - 1) * limitNum;
    const to = from + limitNum - 1;
    
    query = query.range(from, to).order('created_at', { ascending: false });

    const { data, error, count } = await query;

    if (error) {
      console.error('[getAllUsers] Failed to fetch users:', error.message);
      return next(createError(`Failed to fetch users.`, 500));
    }

    // Format data to be flat and easy to consume
    const formattedData = data.map(user => {
      const t = user.taxpayers;
      return {
        user_id: user.user_id,
        email: user.email,
        is_active: user.is_active,
        created_at: user.created_at,
        role_id: user.role_id,
        role_name: user.roles?.role_name,
        name: t ? `${t.first_name} ${t.last_name}` : 'Staff / Officer',
        contact_no: t?.contact_no || null,
        tin_no: t?.tin_no || null
      };
    });

    res.status(200).json({
      success: true,
      data: formattedData,
      meta: {
        total: count || 0,
        page: pageNum,
        limit: limitNum
      }
    });
  } catch (err) {
    next(err);
  }
};

const updateUserStatusSchema = z.object({
  isActive: z.boolean({ required_error: 'isActive flag is required.' }),
});

/**
 * PATCH /api/admin/users/:id/status
 * @desc Deactivate/activate a user account.
 * @access Admin
 */
const updateUserStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { isActive } = updateUserStatusSchema.parse(req.body);

    // Prevent Admins from deactivating themselves
    if (id === req.user.userId && !isActive) {
      return next(createError('You cannot deactivate your own administrator account.', 400));
    }

    const { data, error } = await supabaseAdmin
      .from('users')
      .update({ is_active: isActive })
      .eq('user_id', id)
      .select('user_id, email, is_active')
      .single();

    if (error) {
      console.error('[updateUserStatus] Failed to update status:', error.message);
      return next(createError('Failed to update user status.', 500));
    }

    // 4. Audit Log
    await logAction({
      userId: req.user.userId,
      action: AUDIT_ACTIONS.USER_DEACTIVATED,
      entityType: 'users',
      entityId: id,
      newValue: { is_active: isActive }
    });

    res.status(200).json({
      success: true,
      message: `User account successfully ${isActive ? 'activated' : 'deactivated'}.`,
      data
    });
  } catch (err) {
    next(err);
  }
};

const updateUserRoleSchema = z.object({
  roleId: z.coerce.number().int().min(1).max(5, { message: 'Invalid role ID.' }),
});

/**
 * PATCH /api/admin/users/:id/role
 * @desc Change a user's role.
 * @access Admin
 */
const updateUserRole = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { roleId } = updateUserRoleSchema.parse(req.body);

    // Prevent Admins from changing their own role to something else
    if (id === req.user.userId) {
      return next(createError('You cannot change your own administrator role.', 400));
    }

    const { data, error } = await supabaseAdmin
      .from('users')
      .update({ role_id: roleId })
      .eq('user_id', id)
      .select(`
        user_id,
        email,
        role_id,
        roles (
          role_name
        )
      `)
      .single();

    if (error) {
      console.error('[updateUserRole] Failed to update role:', error.message);
      return next(createError('Failed to update user role.', 500));
    }

    // 4. Audit Log
    await logAction({
      userId: req.user.userId,
      action: AUDIT_ACTIONS.USER_ROLE_CHANGED,
      entityType: 'users',
      entityId: id,
      newValue: { role_id: roleId, role_name: data.roles?.role_name }
    });

    res.status(200).json({
      success: true,
      message: `User role successfully updated to ${data.roles?.role_name || roleId}.`,
      data: {
        user_id: data.user_id,
        email: data.email,
        role_id: data.role_id,
        role_name: data.roles?.role_name
      }
    });
  } catch (err) {
    next(err);
  }
};

const ALLOWED_MASTER_TABLES = ['fee_types', 'requirement_types', 'clearance_types', 'barangays', 'business_activities', 'organization_types', 'system_settings'];
const PROTECTED_NAMES = [
  'Business Clearance',
  'DTI / SEC / CDA Registration',
  'Fire Safety Inspection Certificate',
  'Sanitary Permit',
  'Zoning Clearance',
  'Lease Contract / TCT',
  'Barangay Business Clearance',
  'Community Tax Certificate',
  "Owner's Valid ID (Front)",
  "Owner's Valid ID (Back)",
  'Sketch of Location',
  "Mayor's Permit Fee",
  'Fire Safety Inspection Fee',
  'MAYOR_NAME',
  'BPLO_CHIEF_NAME',
  'TREASURER_NAME',
  'MUNICIPALITY_NAME',
  'PROVINCE_NAME',
  'CONTACT_EMAIL',
  'CONTACT_PHONE'
];

/**
 * GET /api/admin/master-data/:table
 * @desc Fetch all rows from an allowed lookup table
 * @access Admin
 */
const getMasterData = async (req, res, next) => {
  try {
    const { table } = req.params;
    if (!ALLOWED_MASTER_TABLES.includes(table)) {
      return next(createError(`Invalid master data table: ${table}`, 400));
    }
    const { data, error } = await supabaseAdmin.from(table).select('*').order('id', { ascending: true });
    if (error) throw createError(`Failed to fetch ${table}: ${error.message}`, 500);
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/admin/master-data/:table
 * @desc Insert a new row into an allowed lookup table
 * @access Admin
 */
const createMasterData = async (req, res, next) => {
  try {
    const { table } = req.params;
    if (!ALLOWED_MASTER_TABLES.includes(table)) {
      return next(createError(`Invalid master data table: ${table}`, 400));
    }
    const { data, error } = await supabaseAdmin.from(table).insert([req.body]).select().single();
    if (error) throw createError(`Failed to insert into ${table}: ${error.message}`, 500);

    // Audit Log
    await logAction({
      userId: req.user.userId,
      action: AUDIT_ACTIONS.MASTER_DATA_UPDATED,
      entityType: table,
      entityId: String(data.id || data.key || 'new_record'),
      newValue: req.body
    });

    res.status(201).json({ success: true, message: 'Record created successfully.', data });
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/admin/master-data/:table/:id
 * @desc Update a row in an allowed lookup table
 * @access Admin
 */
const updateMasterData = async (req, res, next) => {
  try {
    const { table, id } = req.params;
    if (!ALLOWED_MASTER_TABLES.includes(table)) {
      return next(createError(`Invalid master data table: ${table}`, 400));
    }

    // Protection check for core lookup values
    const idColumn = table === 'system_settings' ? 'key' : 'name';
    const { data: existing } = await supabaseAdmin.from(table).select(idColumn).eq('id', id).single();
    
    if (existing && existing[idColumn] && PROTECTED_NAMES.includes(existing[idColumn])) {
      const incomingIdentifier = req.body[idColumn];
      // Only prevent modification if they are trying to change the identifier name/key
      if (incomingIdentifier !== undefined && incomingIdentifier !== existing[idColumn]) {
        return next(createError('This lookup record is a core system dependency and its identifier cannot be modified.', 400));
      }
    }
    
    const incomingName = req.body.name || req.body.key;
    if (incomingName && incomingName !== existing?.[idColumn] && PROTECTED_NAMES.includes(incomingName)) {
      return next(createError('You cannot rename a lookup record to a protected system name.', 400));
    }

    const { data, error } = await supabaseAdmin.from(table).update(req.body).eq('id', id).select().single();
    if (error) throw createError(`Failed to update ${table}: ${error.message}`, 500);

    // Audit Log
    await logAction({
      userId: req.user.userId,
      action: AUDIT_ACTIONS.MASTER_DATA_UPDATED,
      entityType: table,
      entityId: String(id),
      oldValue: existing,
      newValue: req.body
    });

    res.status(200).json({ success: true, message: 'Record updated successfully.', data });
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/admin/master-data/:table/:id
 * @desc Delete a row in an allowed lookup table with foreign key protection
 * @access Admin
 */
const deleteMasterData = async (req, res, next) => {
  try {
    const { table, id } = req.params;
    if (!ALLOWED_MASTER_TABLES.includes(table)) {
      return next(createError(`Invalid master data table: ${table}`, 400));
    }

    // Protection check for core lookup values
    const idColumn = table === 'system_settings' ? 'key' : 'name';
    const { data: existing } = await supabaseAdmin.from(table).select(idColumn).eq('id', id).single();
    
    if (existing && existing[idColumn] && PROTECTED_NAMES.includes(existing[idColumn])) {
      return next(createError('This lookup record is a core system dependency and cannot be deleted.', 400));
    }

    const { error } = await supabaseAdmin.from(table).delete().eq('id', id);
    if (error) {
      if (error.code === '23503') {
        return next(createError('This record cannot be deleted because it is already linked to active business permit profiles or logs. Please deactivate it instead.', 400));
      }
      throw createError(`Failed to delete record: ${error.message}`, 500);
    }

    // Audit Log
    await logAction({
      userId: req.user.userId,
      action: AUDIT_ACTIONS.MASTER_DATA_UPDATED,
      entityType: table,
      entityId: String(id),
      oldValue: existing,
      newValue: { deleted: true }
    });

    res.status(200).json({ success: true, message: 'Record deleted successfully.' });
  } catch (err) {
    next(err);
  }
};

const AuditLogQuerySchema = z.object({
  role: z.string().optional(),
  action: z.string().optional(),
  page: z.preprocess((val) => Number(val) || 1, z.number().int().min(1)),
  limit: z.preprocess((val) => Number(val) || 50, z.number().int().min(1).max(100))
});

/**
 * GET /api/admin/audit-logs
 * @desc Fetch paginated audit logs with optional filters
 * @access Admin
 */
const getAuditLogs = async (req, res, next) => {
  try {
    const query = AuditLogQuerySchema.parse(req.query);
    const { role, action, page, limit } = query;
    const offset = (page - 1) * limit;

    let selectString = '*, users(email, roles(role_name))';
    if (role) {
      selectString = '*, users!inner(email, roles!inner(role_name))';
    }

    let queryBuilder = supabaseAdmin
      .from('audit_logs')
      .select(selectString, { count: 'exact' });

    if (action) queryBuilder = queryBuilder.eq('action', action);
    if (role) queryBuilder = queryBuilder.eq('users.roles.role_name', role);

    const { data, count, error } = await queryBuilder
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw createError(`Failed to fetch audit logs: ${error.message}`, 500);

    res.status(200).json({
      success: true,
      data,
      pagination: {
        total: count,
        page,
        limit,
        totalPages: Math.ceil((count || 0) / limit)
      }
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return next(createError('Invalid query parameters', 400, ERROR_CODES.VALIDATION_ERROR));
    }
    next(err);
  }
};

/**
 * POST /api/admin/document-templates/:type
 * @desc Upload a document template PDF.
 * @access Admin
 */
const uploadDocumentTemplate = async (req, res, next) => {
  try {
    const { type } = req.params;
    if (!req.file) {
      return next(createError('No PDF file provided.', 400));
    }
    if (req.file.mimetype !== 'application/pdf') {
      return next(createError('Only PDF files are allowed.', 400));
    }

    const fileName = `${type}.pdf`;

    const { data, error } = await supabaseAdmin.storage
      .from('document-templates')
      .upload(fileName, req.file.buffer, {
        contentType: 'application/pdf',
        upsert: true
      });

    if (error) {
      console.error('[uploadDocumentTemplate] Supabase upload error:', error);
      throw createError(`Failed to upload template: ${error.message}`, 500);
    }

    // Audit Log
    await logAction({
      userId: req.user.userId,
      action: 'DOCUMENT_TEMPLATE_UPLOADED',
      entityType: 'document_templates',
      entityId: type,
      newValue: { fileName, size: req.file.size }
    });

    res.status(200).json({ success: true, message: 'Template uploaded successfully.', data });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getEmailLogs,
  getHealth,
  getAllApplications,
  getAllUsers,
  updateUserStatus,
  updateUserRole,
  getMasterData,
  createMasterData,
  updateMasterData,
  deleteMasterData,
  getAuditLogs,
  uploadDocumentTemplate,
};
