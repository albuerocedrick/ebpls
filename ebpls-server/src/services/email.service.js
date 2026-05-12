/**
 * Phase 6 Placeholder
 * The actual email templates and Nodemailer logic will be built in Phase 9.
 */
const enqueueEmail = async ({ applicationNo, triggerEvent, payload }) => {
    console.log(`🚧 [Email Mock] Would send ${triggerEvent} to App: ${applicationNo}`);
    console.log(`🚧 [Email Mock] Payload:`, payload);
    
    return true; 
};

module.exports = {
    emailService: {
        enqueueEmail
    }
};