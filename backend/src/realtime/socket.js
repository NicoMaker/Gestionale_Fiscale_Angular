const registerTipologieController = require("../controllers/tipologieController");
const registerClientiController = require("../controllers/clientiController");
const registerAdempimentiController = require("../controllers/adempimentiController");
const registerScadenzarioController = require("../controllers/scadenzarioController");
const registerSintesiController = require("../controllers/sintesiController");
const registerStatsController = require("../controllers/statsController");
const registerApplicaController = require("../controllers/applicaController");
const registerAppuntiController = require("../controllers/appuntiController");
const registerPaginaBiancaController = require("../controllers/paginaBiancaController");
const registerCestinoController = require("../controllers/cestinoController");

/**
 * Configura Socket.IO: ad ogni connessione registra tutti i controller di
 * dominio. Ogni controller incapsula gli handler socket della propria
 * funzionalità, sostituendo il vecchio monolite `modules/sockets/index.js`.
 */
module.exports = function setupSocketHandlers(io) {
  io.on("connection", (socket) => {
    console.log(`✅ Client connesso: ${socket.id}`);

    // Registrazione dei controller di dominio
    registerTipologieController(io, socket);
    registerClientiController(io, socket);
    registerAdempimentiController(io, socket);
    registerScadenzarioController(io, socket);
    registerSintesiController(io, socket);
    registerStatsController(io, socket);
    registerApplicaController(io, socket);
    registerAppuntiController(io, socket);
    registerPaginaBiancaController(io, socket);
    registerCestinoController(io, socket);

    socket.on("disconnect", () => {
      console.log(`❌ Client disconnesso: ${socket.id}`);
    });
  });
};
