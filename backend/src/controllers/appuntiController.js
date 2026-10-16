const appuntiRepository = require("../repositories/appuntiRepository");

/**
 * Handler socket per il dominio APPUNTI / scadenze studio: CRUD, eliminazione
 * bulk, toggle completamento e copia tra anni.
 */
module.exports = function registerAppuntiController(io, socket) {
  socket.on("get:appunti", (filtri = {}) => {
    try {
      const data = appuntiRepository.getAppunti(filtri);
      socket.emit("res:appunti", { success: true, data });
    } catch (e) {
      socket.emit("res:appunti", { success: false, error: e.message });
    }
  });

  socket.on("get:appunto", ({ id }) => {
    try {
      const data = appuntiRepository.getAppunto(id);
      socket.emit("res:appunto", { success: true, data });
    } catch (e) {
      socket.emit("res:appunto", { success: false, error: e.message });
    }
  });

  socket.on("create:appunto", (data) => {
    try {
      const newId = appuntiRepository.createAppunto(data);
      io.emit("broadcast:appunti_updated");
      socket.emit("res:create:appunto", { success: true, id: newId });
      socket.emit("notify", {
        type: "success",
        msg: "Appunto creato con successo",
      });
    } catch (e) {
      socket.emit("res:create:appunto", { success: false, error: e.message });
    }
  });

  socket.on("update:appunto", (data) => {
    try {
      appuntiRepository.updateAppunto(data);
      io.emit("broadcast:appunti_updated");
      socket.emit("res:update:appunto", { success: true });
      socket.emit("notify", { type: "success", msg: "Appunto aggiornato" });
    } catch (e) {
      socket.emit("res:update:appunto", { success: false, error: e.message });
    }
  });

  socket.on("delete:appunto", ({ id }) => {
    try {
      appuntiRepository.deleteAppunto(id);
      io.emit("broadcast:appunti_updated");
      socket.emit("res:delete:appunto", { success: true });
      socket.emit("notify", { type: "success", msg: "Appunto eliminato" });
    } catch (e) {
      socket.emit("res:delete:appunto", { success: false, error: e.message });
    }
  });

  // ── BULK: elimina più scadenze studio ─────────────────────────────
  socket.on("delete:appunti:bulk", ({ ids }) => {
    const ok = [];
    const failed = [];
    for (const id of ids) {
      try {
        appuntiRepository.deleteAppunto(id);
        ok.push(id);
      } catch (e) {
        failed.push({ id, error: e.message });
      }
    }
    if (ok.length > 0) io.emit("broadcast:appunti_updated");
    socket.emit("res:delete:appunti:bulk", { success: true, ok, failed });
    const totOk = ok.length;
    const msg = failed.length
      ? "Eliminati " + totOk + ", falliti " + failed.length
      : totOk +
        (totOk === 1 ? " scadenza eliminata" : " scadenze eliminate") +
        " con successo";
    socket.emit("notify", {
      type: failed.length ? "warning" : "success",
      msg,
    });
  });

  socket.on("toggle:appunto_completato", ({ id, completato }) => {
    try {
      appuntiRepository.toggleAppuntoCompletato(id, completato);
      io.emit("broadcast:appunti_updated");
      socket.emit("res:toggle:appunto_completato", { success: true });
    } catch (e) {
      socket.emit("res:toggle:appunto_completato", {
        success: false,
        error: e.message,
      });
    }
  });

  socket.on("copia:appunti_anno", ({ anno_da, anno_a, id_cliente }) => {
    try {
      const copiati = appuntiRepository.copiaAppuntiDaAnno(
        anno_da,
        anno_a,
        id_cliente || null,
      );
      io.emit("broadcast:appunti_updated");
      socket.emit("res:copia:appunti_anno", { success: true, copiati });
      socket.emit("notify", {
        type: "success",
        msg: `Copiati ${copiati} appunti dall'anno ${anno_da} al ${anno_a}`,
      });
    } catch (e) {
      socket.emit("res:copia:appunti_anno", {
        success: false,
        error: e.message,
      });
    }
  });
};
