const scadenzarioRepository = require("../repositories/scadenzarioRepository");

/**
 * Handler socket per il dominio SCADENZARIO: scadenzario del singolo
 * cliente, generazione/rigenerazione, copia tra anni, aggiornamento stato
 * delle singole righe e vista globale.
 */
module.exports = function registerScadenzarioController(io, socket) {
  socket.on("get:scadenzario", ({ id_cliente, anno, filtri = {} }) => {
    try {
      const data = scadenzarioRepository.getScadenzarioConDettagliCliente(
        id_cliente,
        anno,
        filtri,
      );
      socket.emit("res:scadenzario", { success: true, data });
    } catch (e) {
      socket.emit("res:scadenzario", { success: false, error: e.message });
    }
  });

  socket.on("genera:scadenzario", ({ id_cliente, anno }) => {
    try {
      const tot = scadenzarioRepository.generaScadenzarioInterno(
        id_cliente,
        anno,
      );
      io.emit("broadcast:scadenzario_updated", { id_cliente, anno });
      io.emit("broadcast:stats_updated", { anno });
      socket.emit("res:genera:scadenzario", { success: true, inseriti: tot });
    } catch (e) {
      socket.emit("res:genera:scadenzario", {
        success: false,
        error: e.message,
      });
    }
  });

  socket.on("genera:tutti", ({ anno, adempimenti }) => {
    try {
      const risultato = scadenzarioRepository.generaTuttiClientiAnno(
        anno,
        adempimenti,
      );
      io.emit("broadcast:scadenzario_updated", { anno });
      io.emit("broadcast:globale_updated", { anno });
      io.emit("broadcast:stats_updated", { anno });
      socket.emit("res:genera:tutti", { success: true, ...risultato });
    } catch (e) {
      socket.emit("res:genera:tutti", { success: false, error: e.message });
    }
  });

  socket.on("rigenera:tutti", ({ anno, adempimenti }) => {
    try {
      const tot = scadenzarioRepository.rigeneraTuttiClientiAnno(
        anno,
        adempimenti,
      );
      io.emit("broadcast:scadenzario_updated", { anno });
      io.emit("broadcast:globale_updated", { anno });
      io.emit("broadcast:stats_updated", { anno });
      socket.emit("res:rigenera:tutti", { success: true, inseriti: tot });
    } catch (e) {
      socket.emit("res:rigenera:tutti", { success: false, error: e.message });
    }
  });

  socket.on("copia:scadenzario", ({ id_cliente, anno_da, anno_a }) => {
    try {
      const tot = scadenzarioRepository.copiaScadenzarioCliente(
        id_cliente,
        anno_da,
        anno_a,
      );
      io.emit("broadcast:scadenzario_updated", { id_cliente, anno: anno_a });
      socket.emit("res:copia:scadenzario", { success: true, copiati: tot });
    } catch (e) {
      socket.emit("res:copia:scadenzario", {
        success: false,
        error: e.message,
      });
    }
  });

  socket.on("copia:tutti", ({ anno_da, anno_a }) => {
    try {
      const tot = scadenzarioRepository.copiaTuttiClienti(anno_da, anno_a);
      io.emit("broadcast:scadenzario_updated", { anno: anno_a });
      io.emit("broadcast:globale_updated", { anno: anno_a });
      socket.emit("res:copia:tutti", { success: true, copiati: tot });
    } catch (e) {
      socket.emit("res:copia:tutti", { success: false, error: e.message });
    }
  });

  socket.on("update:adempimento_stato", (data) => {
    try {
      const result = scadenzarioRepository.updateAdempimentoStato(data);
      io.emit("broadcast:scadenzario_updated", {
        id_cliente: result.id_cliente,
        anno: result.anno,
      });
      io.emit("broadcast:globale_updated", { anno: result.anno });
      io.emit("broadcast:stats_updated", { anno: result.anno });
      socket.emit("res:update:adempimento_stato", { success: true });
    } catch (e) {
      socket.emit("res:update:adempimento_stato", {
        success: false,
        error: e.message,
      });
    }
  });

  socket.on("delete:adempimento_cliente", ({ id }) => {
    try {
      const result = scadenzarioRepository.deleteAdempimentoCliente(id);
      io.emit("broadcast:scadenzario_updated", {
        id_cliente: result.id_cliente,
        anno: result.anno,
      });
      io.emit("broadcast:globale_updated", { anno: result.anno });
      socket.emit("res:delete:adempimento_cliente", { success: true });
    } catch (e) {
      socket.emit("res:delete:adempimento_cliente", {
        success: false,
        error: e.message,
      });
    }
  });

  socket.on("add:adempimento_cliente", (data) => {
    try {
      scadenzarioRepository.addAdempimentoCliente(data);
      io.emit("broadcast:scadenzario_updated", {
        id_cliente: data.id_cliente,
        anno: data.anno,
      });
      socket.emit("res:add:adempimento_cliente", { success: true });
    } catch (e) {
      socket.emit("res:add:adempimento_cliente", {
        success: false,
        error: e.message,
      });
    }
  });

  // ── SCADENZARIO GLOBALE ──
  socket.on("get:scadenzario_globale", ({ anno, filtri = {} }) => {
    try {
      const data = scadenzarioRepository.getScadenzarioGlobale(anno, filtri);
      socket.emit("res:scadenzario_globale", { success: true, data });
    } catch (e) {
      socket.emit("res:scadenzario_globale", {
        success: false,
        error: e.message,
      });
    }
  });
};
