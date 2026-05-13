// =================================================================
// File: src/app.js
// Purpose: Main application entry point and middleware pipeline.
// Policy:  Mount webhooks BEFORE JSON parsers to preserve raw body
//          required for HMAC signature verification.
// =================================================================

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");

// Route Imports
const barangayRoutes = require('./routes/barangay.routes.js');
const authRoutes = require("./routes/auth.routes");
const applicationRoutes = require("./routes/application.routes");
const bploRoutes = require("./routes/bplo.routes");

// Phase 5 Route Imports
const treasuryRoutes = require('./routes/treasury.routes');
const treasuryOnlineRoutes = require('./routes/treasury.online.routes');
const webhookRoutes = require('./routes/webhook.routes');

// Phase 7 Route Import
const retirementRoutes = require('./routes/retirement.routes');

// Middleware imports
const { errorHandler } = require("./middlewares/error.middleware");

const app = express();

// Trust proxy for audit.service.js IP extraction (Nginx/Render/etc.)
app.set("trust proxy", 1);

// 1. Security & Global Middlewares
app.use(helmet());
app.use(cors());
app.use(morgan("dev"));

// -----------------------------------------------------------------
// 2. WEBHOOK ROUTES (CRITICAL: MUST BE BEFORE express.json())
// -----------------------------------------------------------------
// We use express.raw to keep the body as a Buffer for signature verification.
app.use(
  '/api/webhooks', 
  express.raw({ type: '*/*' }), 
  webhookRoutes
);

// -----------------------------------------------------------------
// 3. GLOBAL BODY PARSERS (For all other routes)
// -----------------------------------------------------------------
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// -----------------------------------------------------------------
// 4. API ROUTES
// -----------------------------------------------------------------
app.use("/api/auth", authRoutes);
app.use("/api/applications", applicationRoutes);
app.use("/api/bplo", bploRoutes);
app.use("/api/barangay", barangayRoutes);

// Phase 5: Treasury & Online Payments
app.use("/api/treasury", treasuryOnlineRoutes);
app.use("/api/treasury", treasuryRoutes);

// Phase 7: Business Retirement
app.use("/api/retirement", retirementRoutes);

// Health check route
app.get("/health", (req, res) => {
  res.status(200).json({ status: "OK", message: "eBPLS API is running" });
});

// -----------------------------------------------------------------
// 5. GLOBAL ERROR HANDLER
// Must be the very last middleware mounted.
// -----------------------------------------------------------------
app.use(errorHandler);

module.exports = app;