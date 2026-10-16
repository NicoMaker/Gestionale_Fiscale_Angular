const express = require("express");
const router = express.Router();
const path = require("path");
const fs = require("fs");

function findDatabasePath() {
  const possiblePaths = [
    path.join(__dirname, "../../db", "gestionale.db"),
    path.join(__dirname, "../../gestionale.db"),
    path.join(__dirname, "../../../db", "gestionale.db"),
    path.join(process.cwd(), "db", "gestionale.db"),
    path.join(process.cwd(), "gestionale.db"),
  ];

  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      console.log(`✅ Database trovato in: ${p}`);
      return p;
    }
  }
  return null;
}

router.get("/download-db", (req, res) => {
  const dbPath = findDatabasePath();

  if (!dbPath || !fs.existsSync(dbPath)) {
    console.error("❌ File database non trovato nelle posizioni cercate");
    return res.status(404).json({
      success: false,
      error: "File database non trovato",
      message:
        "Il database non esiste o non è accessibile nel filesystem del server",
    });
  }

  const downloadFilename = "gestionale.db";

  console.log(`📥 Download DB richiesto - Path sorgente: ${dbPath}`);

  res.setHeader("Content-Type", "application/octet-stream");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="${downloadFilename}"`,
  );

  const fileStream = fs.createReadStream(dbPath);

  fileStream.on("error", (err) => {
    console.error("❌ Errore durante lo streaming del DB:", err);
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        error: "Errore durante il trasferimento del file",
      });
    }
  });

  fileStream.pipe(res);
});

module.exports = router;
