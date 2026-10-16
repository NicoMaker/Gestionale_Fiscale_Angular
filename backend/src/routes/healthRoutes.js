const express = require("express");
const router = express.Router();

/**
 * Health check: stato del server, uptime e numero di connessioni socket.
 * L'istanza Socket.IO viene recuperata da `app.get("io")`.
 */
router.get("/health", (req, res) => {
  const io = req.app.get("io");
  res.json({
    status: "OK",
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    socketConnections: io ? io.engine.clientsCount : 0,
  });
});

module.exports = router;
