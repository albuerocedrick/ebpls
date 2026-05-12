const { supabaseAdmin } = require('../config/supabase');
const { logAction } = require('../services/audit.service');
const { emailService } = require('../services/email.service');
const { 
    DOC_VERIFICATION_STATUS, 
    EMAIL_TRIGGERS, 
    AUDIT_ACTIONS 
} = require('../utils/constants');

const getPendingClearances = async (req, res, next) => {
    try {
        const { data, error } = await supabaseAdmin
            .from('barangay_clearances')
            .select(`
                *,
                applications ( application_no, business_id, status ),
                clearance_types ( name )
            `)
            .eq('status', 'Pending'); 

        if (error) throw error;

        // --- DEBUG TRACKER (Does not change logic) ---
        console.log("=== BACKEND DEBUG ===");
        console.log("Rows fetched from Supabase:", data ? data.length : 0);
        if (data && data.length > 0) {
             console.log("Sample Data:", JSON.stringify(data[0], null, 2));
        }
        // ----------------------------------------------

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
        const { error: docError } = await supabaseAdmin
            .from('doc_verifications')
            .update({ status: DOC_VERIFICATION_STATUS.NO, remarks: remarks, verified_by: userId })
            .eq('application_no', clearance.application_no)
            .eq('requirement_id', 2); // NOTE: Update this with your actual requirement_id

        if (docError) throw docError;

        // Step 4: Trigger Email (will hit your placeholder)
        await emailService.enqueueEmail({
            applicationNo: clearance.application_no,
            triggerEvent: EMAIL_TRIGGERS.BARANGAY_CLEARANCE_REJECTED,
            payload: { remarks }
        });

        // Step 5: Audit Logging
        await logAction({
            userId,
            action: AUDIT_ACTIONS.CLEARANCE_REJECTED,
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

module.exports = {
    getPendingClearances,
    issueClearance,
    rejectClearance
};