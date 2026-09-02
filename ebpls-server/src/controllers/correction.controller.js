const correctionService = require('../services/correction.service');
const { UploadRequestPayloadSchema } = require('../utils/validators');

/**
 * Submits a new correction request
 * POST /api/corrections
 */
const submitCorrectionRequest = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const result = await correctionService.submitCorrectionRequest(userId, req.body);
    return res.status(201).json(result);
  } catch (error) {
    next(error);
  }
};

/**
 * Generates an upload URL for a proof document
 * POST /api/corrections/upload
 */
const getUploadUrl = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const validatedData = UploadRequestPayloadSchema.parse(req.body);
    
    const result = await correctionService.getUploadUrl(userId, null, validatedData.fileName);
    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

/**
 * Lists the applicant's own correction requests
 * GET /api/corrections/my
 */
const listMyCorrectionRequests = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const result = await correctionService.listMyCorrectionRequests(userId);
    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  submitCorrectionRequest,
  getUploadUrl,
  listMyCorrectionRequests
};
