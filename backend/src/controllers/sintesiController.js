const scadenzarioRepository = require("../repositories/scadenzarioRepository");

/**
 * Handler socket per la SINTESI adempimenti (matrice clienti × adempimenti,
 * sola lettura). Riusa lo stesso modello dati dello Scadenzario Globale:
 * nessun filtro lato server, la pagina Sintesi filtra tutto lato client
 * (ricerca, adempimenti selezionati, tipologie) per restare reattiva.
 */
module.exports = function registerSintesiController(io, socket) {
  socket.on("get:sintesi", ({ anno } = {}) => {
    try {
      const annoVal = anno || new Date().getFullYear();
      const data = scadenzarioRepository.getScadenzarioGlobale(annoVal, {});
      socket.emit("res:sintesi", { success: true, data, anno: annoVal });
    } catch (e) {
      socket.emit("res:sintesi", { success: false, error: e.message });
    }
  });
};
