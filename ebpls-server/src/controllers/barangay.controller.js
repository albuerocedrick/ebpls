const { supabaseAdmin } = require('../config/supabase');
const { logAction } = require('../services/audit.service');
const { dispatchEmail, EMAIL_TRIGGERS } = require('../services/email.service');
const { 
    DOC_VERIFICATION_STATUS, 
    AUDIT_ACTIONS 
} = require('../utils/constants');

const getPendingClearances = async (req, res, next) => {
    try {
        const { data, error } = await supabaseAdmin
            .from('barangay_clearances')
            .select(`
                *,
                applications ( 
                    application_no, 
                    business_id, 
                    status,
                    application_types ( name ),
                    businesses (
                        business_name,
                        trade_name,
                        address_line1,
                        barangay,
                        city,
                        province,
                        latitude,
                        longitude,
                        dti_sec_cda_reg_no,
                        is_franchise,
                        franchisor_name,
                        organization_types ( name ),
                        taxpayers (
                            first_name,
                            last_name,
                            middle_name,
                            contact_no
                        )
                    ),
                    doc_verifications (
                        requirement_id,
                        file_path,
                        requirement_types ( name )
                    )
                ),
                clearance_types ( name )
            `)
            .eq('status', 'Pending'); 

        if (error) throw error;

        res.status(200).json({ success: true, data });
    } catch (error) {
        next(error);
    }
};

const issueClearance = async (req, res, next) => {
    const { id } = req.params;
    const userId = req.user.user_id;

    try {
        // Step 1: Fetch the clearance to get the application_no
        const { data: clearance, error: fetchError } = await supabaseAdmin
            .from('barangay_clearances')
            .select('*')
            .eq('id', id)
            .single();

        if (fetchError || !clearance) {
            return res.status(404).json({ success: false, message: 'Clearance request not found' });
        }

        // Step 2: Update the clearance status
        const { data: updatedClearance, error: updateError } = await supabaseAdmin
            .from('barangay_clearances')
            .update({ 
                status: 'Issued', 
                processed_by: userId,
                issued_at: new Date().toISOString()
            })
            .eq('id', id)
            .select()
            .single();

        if (updateError) throw updateError;

        // Step 3: Feedback Loop - Update corresponding doc_verifications to 'Yes'
        const { error: docError } = await supabaseAdmin
            .from('doc_verifications')
            .update({ status: DOC_VERIFICATION_STATUS.YES, verified_by: userId })
            .eq('application_no', clearance.application_no)
            .eq('requirement_id', 2); // NOTE: Update this with your actual requirement_id for Brgy Clearance

        if (docError) throw docError;

        // Step 4: Audit Logging
        await logAction({
            userId,
            action: AUDIT_ACTIONS.CLEARANCE_ISSUED,
            entityType: 'barangay_clearances',
            entityId: id,
            oldValue: clearance,
            newValue: updatedClearance,
            ipAddress: req.ip || null
        });

        res.status(200).json({ success: true, data: updatedClearance });
    } catch (error) {
        next(error);
    }
};

const rejectClearance = async (req, res, next) => {
    const { id } = req.params;
    const { remarks } = req.body;
    const userId = req.user.user_id;

    if (!remarks) {
        return res.status(400).json({ success: false, message: 'Remarks are mandatory for rejection.' });
    }

    try {
        // Step 1: Fetch clearance
        const { data: clearance, error: fetchError } = await supabaseAdmin
            .from('barangay_clearances')
            .select('*')
            .eq('id', id)
            .single();

        if (fetchError || !clearance) {
            return res.status(404).json({ success: false, message: 'Clearance request not found' });
        }

        // Step 2: Update clearance status to Rejected
        const { data: updatedClearance, error: updateError } = await supabaseAdmin
            .from('barangay_clearances')
            .update({ 
                status: 'Rejected', 
                remarks: remarks,
                processed_by: userId 
            })
            .eq('id', id)
            .select()
            .single();

        if (updateError) throw updateError;

        // Step 3: Feedback Loop - Update doc_verifications to 'No'
        const { data: reqData } = await supabaseAdmin
            .from('requirement_types')
            .select('id')
            .eq('name', 'Barangay Business Clearance')
            .single();

        const requirementId = reqData?.id || 2; // Fallback to 2 if lookup fails

        const { error: docError } = await supabaseAdmin
            .from('doc_verifications')
            .update({ status: DOC_VERIFICATION_STATUS.NO, remarks: remarks, verified_by: userId })
            .eq('application_no', clearance.application_no)
            .eq('requirement_id', requirementId);

        if (docError) throw docError;

        // Step 3.5: Correction Loop - Update application status to 'Returned'
        const { error: appError } = await supabaseAdmin
            .from('applications')
            .update({ 
                status: 'Returned',
                return_remarks: remarks // CRITICAL: Update the main remark so the applicant sees it
            })
            .eq('application_no', clearance.application_no);

        if (appError) {
            console.error('[barangay.controller] Failed to return application:', appError.message);
        }

        // Step 4: Audit Logging
        await logAction({
            userId,
            action: AUDIT_ACTIONS.CLEARANCE_REJECTED,
            entityType: 'barangay_clearances',
            entityId: id,
            oldValue: clearance,
            newValue: updatedClearance,
            ipAddress: req.ip || null
        });

        // Return response immediately — email is fire-and-forget below.
        res.status(200).json({ success: true, data: updatedClearance });

        // Phase 9: Wire BARANGAY_CLEARANCE_REJECTED email trigger.
        // Resolve applicant via application_no → businesses → taxpayers → users join.
        const { data: clrApp } = await supabaseAdmin
            .from('applications')
            .select('application_no, businesses ( business_name, taxpayers ( first_name, last_name, users ( email ) ) )')
            .eq('application_no', clearance.application_no)
            .single();

        const clrTaxpayer = clrApp?.businesses?.taxpayers;
        const clrUser     = clrTaxpayer?.users;

        if (clrTaxpayer && clrUser?.email) {
            dispatchEmail({
                triggerEvent:   EMAIL_TRIGGERS.BARANGAY_CLEARANCE_REJECTED,
                recipientEmail: clrUser.email,
                applicationNo:  clearance.application_no,
                payload: {
                    name:           `${clrTaxpayer.first_name} ${clrTaxpayer.last_name}`,
                    applicationNo:  clearance.application_no,
                    businessName:   clrApp.businesses?.business_name || 'your business',
                    remarks,
                },
            });
        }
    } catch (error) {
        next(error);
    }
};

const { generatePresignedDownloadUrl } = require('../services/storage.service');

const getDocumentUrl = async (req, res, next) => {
    try {
        const { app_no: applicationNo, requirement_id: requirementId } = req.params;

        const { data: docRow, error: docError } = await supabaseAdmin
            .from('doc_verifications')
            .select('file_path')
            .eq('application_no', applicationNo)
            .eq('requirement_id', parseInt(requirementId, 10))
            .single();

        if (docError || !docRow || !docRow.file_path) {
            return res.status(200).json({ success: true, data: { fileUrl: null }, message: 'No document uploaded' });
        }

        const signedUrl = await generatePresignedDownloadUrl(docRow.file_path);

        return res.status(200).json({ success: true, data: { fileUrl: signedUrl } });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getPendingClearances,
    issueClearance,
    rejectClearance,
    getDocumentUrl
};