// =================================================================
// File: src/middlewares/metrics.middleware.js
// Purpose: Track real-time API read/write volume and errors.
// =================================================================

// Initialize global stats on server start
global.systemStats = {
  reads: 0,
  writes: 0,
  errors: 0,
};

const metricsTracker = (req, res, next) => {
  // Only track /api requests
  if (req.path && req.path.startsWith('/api')) {
    if (req.method === 'GET') {
      global.systemStats.reads++;
    } else if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
      global.systemStats.writes++;
    }
  }
  next();
};

module.exports = metricsTracker;
