const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const authRoutes = require('./routes/auth.routes');
const { errorHandler } = require('./middlewares/error.middleware');

const app = express();

// Trust proxy (Nginx/Render/etc.) so req.ip and X-Forwarded-For work correctly
// This is required for audit.service.js IP extraction.
app.set('trust proxy', 1);

// Security middlewares (Fail closed / Default deny posture)
app.use(helmet()); 
app.use(cors()); // TODO: Configure origin explicitly in production

// Request parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging
app.use(morgan('dev'));

// Health check route
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'eBPLS API is running' });
});

// -----------------------------------------------------------------
// API ROUTES
// -----------------------------------------------------------------
app.use('/api/auth', authRoutes);

// TODO: Mount future routes here
// app.use('/api/applications', require('./routes/application.routes'));

// -----------------------------------------------------------------
// GLOBAL ERROR HANDLER
// Must be the very last middleware mounted.
// -----------------------------------------------------------------
app.use(errorHandler);

module.exports = app;
