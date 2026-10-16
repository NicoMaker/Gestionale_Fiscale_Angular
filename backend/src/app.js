const express = require("express");
const path = require("path");
const cors = require("cors");

const apiRoutes = require("./routes");
const htmlRoutes = require("./routes/htmlRoutes");
const errorHandler = require("./middleware/errorHandler");
const { FRONTEND_DIST } = require("./config/paths");

/**
 * Crea e configura l'applicazione Express.
 *
 * Ordine dei middleware (importante):
 *   1. CORS + parser JSON/urlencoded
 *   2. file statici del frontend
 *   3. route API (/api/...)
 *   4. catch-all SPA (serve index.html per le route non-API)
 *   5. gestione errori
 */
function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ extended: true, limit: "50mb" }));

  // Build Angular (frontend/dist/browser) servita dalla stessa porta del backend
  app.use(express.static(FRONTEND_DIST));

  // Route API
  app.use(apiRoutes);

  // Catch-all SPA (dopo statici e API)
  app.use(htmlRoutes);

  // Gestione errori centralizzata
  app.use(errorHandler);

  return app;
}

module.exports = createApp;
