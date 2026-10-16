const express = require("express");
const router = express.Router();
const { FRONTEND_INDEX, frontendBuilded } = require("../config/paths");

// Fallback SPA Angular: ogni route non-API restituisce index.html
router.use((req, res, next) => {
  if (req.path.startsWith("/api") || req.path.startsWith("/socket.io")) {
    return next();
  }
  if (!frontendBuilded()) {
    return res
      .status(503)
      .send(
        "<h2>Frontend Angular non compilato</h2><p>Esegui <code>npm run build</code> nella cartella principale e riavvia.</p>",
      );
  }
  res.sendFile(FRONTEND_INDEX);
});

module.exports = router;
