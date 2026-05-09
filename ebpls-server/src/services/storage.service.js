// =================================================================
// File: src/services/storage.service.js
// Purpose: Handles secure interactions with Supabase Storage.
// Policy:  Secure By Default. Pre-signed URLs must have strict expiries
//          and scoped paths to prevent unauthorized access and collisions.
// =================================================================

const { supabaseAdmin } = require('../config/supabase');
const { createError }   = require('../middlewares/error.middleware');
const { ERROR_CODES }   = require('../utils/constants');

// ASSUMPTION: The private bucket in Supabase is named 'documents'.
const BUCKET_NAME = 'documents';
const UPLOAD_URL_EXPIRY_SECONDS = 15 * 60; // 15 minutes strict expiry

/**
 * Generates a pre-signed URL allowing the client to upload a file directly to Supabase Storage.
 * 
 * @param {string} taxpayerId - The UUID of the taxpayer (from req.user) to namespace the file.
 * @param {string} fileName   - The original file name (validated upstream by Zod).
 * @returns {Promise<{ signedUrl: string, path: string }>}
 */
const generatePresignedUploadUrl = async (taxpayerId, fileName) => {
  // 1. Sanitize file name to avoid weird characters in the URL
  const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.\-_]/g, '_');
  
  // 2. Construct a unique, namespaced path
  // Format: taxpayer_id/timestamp_sanitizedFileName
  const filePath = `${taxpayerId}/${Date.now()}_${sanitizedFileName}`;

  // 3. Request the signed upload URL from Supabase
  const { data, error } = await supabaseAdmin
    .storage
    .from(BUCKET_NAME)
    .createSignedUploadUrl(filePath, {
      expiresIn: UPLOAD_URL_EXPIRY_SECONDS,
    });

  if (error) {
    console.error(`[storage.service] Failed to create signed upload URL:`, error.message);
    throw createError(
      'Unable to generate secure file upload URL at this time.',
      500,
      ERROR_CODES.INTERNAL_ERROR
    );
  }

  // 4. Return the URL (for the client to PUT the file) and the Path (to save in DB later)
  return {
    signedUrl: data.signedUrl,
    path: filePath
  };
};

module.exports = {
  generatePresignedUploadUrl
};