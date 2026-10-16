/**
 * Middleware centralizzato di gestione errori Express.
 * Cattura le eccezioni non gestite nelle route HTTP e risponde in JSON.
 */
function errorHandler(err, req, res, next) {
  console.error("❌ Errore richiesta:", err.message);
  if (res.headersSent) return next(err);
  res.status(err.status || 500).json({
    success: false,
    error: err.message || "Errore interno del server",
  });
}

module.exports = errorHandler;
