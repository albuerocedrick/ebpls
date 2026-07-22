/**
 * @file requirement.service.js
 * @description Service for resolving applicable requirements based on application details.
 */

const { supabaseAdmin } = require('../config/supabase');
const { createError } = require('../middlewares/error.middleware');
const { ERROR_CODES } = require('../utils/constants');

/**
 * Resolves the applicable requirements for an application.
 *
 * @param {Object} params
 * @param {number} params.application_type_id - 1 for New, 2 for Renewal.
 * @param {number} params.org_type_id - ID of the organization type.
 * @param {string[]} [params.activity_names=[]] - Array of business activity names.
 * @param {boolean} [params.is_renting=false] - Whether the applicant is renting the location.
 * @returns {Promise<Array>} Sorted array of applicable requirements.
 */
async function resolveApplicableRequirements({ application_type_id, org_type_id, activity_names = [], is_renting = false }) {
  try {
    // Step 1: Fetch all active requirement types that apply to the given application type
    let query = supabaseAdmin
      .from('requirement_types')
      .select(`
        id,
        name,
        description,
        is_conditional,
        condition_type,
        condition_description,
        sort_order,
        max_files,
        requirement_conditions (
          match_value
        )
      `)
      .eq('is_active', true);

    if (application_type_id === 1) { // New
      query = query.eq('applies_to_new', true);
    } else if (application_type_id === 2 || application_type_id === 3) { // Renewal & Additional Line
      query = query.eq('applies_to_renewal', true);
    } else {
       throw createError('Invalid application type', 400, ERROR_CODES.VALIDATION_ERROR);
    }

    const { data: requirements, error } = await query;

    if (error) {
      throw createError('Failed to fetch requirements from database: ' + error.message, 500, ERROR_CODES.INTERNAL_ERROR);
    }

    // Prepare org type name lookup if org_type_id is provided
    let orgTypeName = null;
    if (org_type_id) {
      const { data: orgTypeData, error: orgTypeError } = await supabaseAdmin
        .from('organization_types')
        .select('name')
        .eq('id', org_type_id)
        .single();
        
      if (orgTypeError) {
         throw createError('Failed to fetch organization type: ' + orgTypeError.message, 500, ERROR_CODES.INTERNAL_ERROR);
      }
      if (orgTypeData) {
        orgTypeName = orgTypeData.name;
      }
    }

    const applicableRequirements = [];

    // Step 2 & 3: Process each requirement to see if it applies
    for (const req of requirements) {
      // Step 2: Non-conditional requirements are included automatically
      if (!req.is_conditional) {
        applicableRequirements.push(req);
        continue;
      }

      // Step 3: Check condition_type
      const conditions = req.requirement_conditions || [];
      const matchValues = conditions.map(c => c.match_value);

      if (req.condition_type === 'org_type') {
         if (orgTypeName && matchValues.includes(orgTypeName)) {
           applicableRequirements.push(req);
         }
      } else if (req.condition_type === 'business_activity') {
         const hasMatchingActivity = activity_names.some(activity => matchValues.includes(activity));
         if (hasMatchingActivity) {
           applicableRequirements.push(req);
         }
      } else if (req.condition_type === 'rental_status') {
         if (is_renting === true) {
           applicableRequirements.push(req);
         }
      }
    }

    // Step 4: Sort ascending by sort_order
    applicableRequirements.sort((a, b) => a.sort_order - b.sort_order);

    // Clean up the output to remove requirement_conditions as it's not needed in the result
    return applicableRequirements.map(req => {
      const { requirement_conditions, ...rest } = req;
      return rest;
    });

  } catch (err) {
    if (err.status) {
       throw err;
    }
    throw createError('Error resolving applicable requirements: ' + err.message, 500, ERROR_CODES.INTERNAL_ERROR);
  }
}

module.exports = {
  resolveApplicableRequirements
};
