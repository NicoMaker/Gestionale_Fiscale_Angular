const tipologieRepository = require("../repositories/tipologieRepository");

/**
 * Handler socket per le TIPOLOGIE cliente (sola lettura).
 */
module.exports = function registerTipologieController(io, socket) {
  socket.on("get:tipologie", () => {
    try {
      const data = tipologieRepository.getTipologieConSotto();
      socket.emit("res:tipologie", { success: true, data });
    } catch (e) {
      socket.emit("res:tipologie", { success: false, error: e.message });
    }
  });
};
