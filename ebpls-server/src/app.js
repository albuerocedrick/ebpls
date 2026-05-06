const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const app = express();

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

// TODO: Mount API routes here
// app.use('/api/applications', require('./routes/application.routes'));

// Global Error Handler (Fail Closed)
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: 'Internal Server Error',
    // Do not leak stack traces in production
    ...(process.env.NODE_ENV === 'development' && { error: err.message }),
  });
});

module.exports = app;
