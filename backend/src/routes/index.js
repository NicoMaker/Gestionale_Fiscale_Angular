const express = require("express");
const router = express.Router();

const healthRoutes = require("./healthRoutes");
const downloadRoutes = require("./downloadRoutes");

/**
 * Aggrega tutte le route API sotto il prefisso `/api`:
 *   - GET /api/health        → healthRoutes
 *   - GET /api/download-db   → downloadRoutes
 *
 * NB: la route "catch-all" per la SPA (htmlRoutes) va montata separatamente
 * in app.js DOPO gli statici e le API.
 */
router.use("/api", healthRoutes);
router.use("/api", downloadRoutes);

module.exports = router;
