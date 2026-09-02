const correctionService = require('../services/correction.service');
const { UploadRequestPayloadSchema, CorrectionRejectSchema } = require('../utils/validators');

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

/**
 * Lists all pending correction requests (BPLO)
 * GET /api/bplo/corrections/pending
 */
const listPendingCorrectionRequests = async (req, res, next) => {
  try {
    const result = await correctionService.listPendingCorrectionRequests();
    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

/**
 * Gets detail of a correction request (BPLO)
 * GET /api/bplo/corrections/:id
 */
const getCorrectionRequestDetail = async (req, res, next) => {
  try {
    const result = await correctionService.getCorrectionRequestDetail(req.params.id);
    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

/**
 * Approves a correction request (BPLO)
 * PUT /api/bplo/corrections/:id/approve
 */
const approveCorrectionRequest = async (req, res, next) => {
  try {
    const bploUserId = req.user.userId;
    const ipAddress = req.ip;
    const result = await correctionService.approveCorrectionRequest(req.params.id, bploUserId, ipAddress);
    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

/**
 * Rejects a correction request (BPLO)
 * PUT /api/bplo/corrections/:id/reject
 */
const rejectCorrectionRequest = async (req, res, next) => {
  try {
    const bploUserId = req.user.userId;
    const ipAddress = req.ip;
    const validatedData = CorrectionRejectSchema.parse(req.body);
    
    const result = await correctionService.rejectCorrectionRequest(
      req.params.id, 
      bploUserId, 
      validatedData.remarks,
      ipAddress
    );
    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  submitCorrectionRequest,
  getUploadUrl,
  listMyCorrectionRequests,
  listPendingCorrectionRequests,
  getCorrectionRequestDetail,
  approveCorrectionRequest,
  rejectCorrectionRequest
};
