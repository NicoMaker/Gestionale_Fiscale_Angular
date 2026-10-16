const paginaBiancaRepository = require("../repositories/paginaBiancaRepository");

/**
 * Handler socket per il dominio PAGINA BIANCA / note: CRUD ed eliminazione
 * bulk delle note (studio o cliente).
 */
module.exports = function registerPaginaBiancaController(io, socket) {
  socket.on("get:pagina_bianca", (filtri) => {
    try {
      const data = paginaBiancaRepository.getPaginaBianca(filtri);
      socket.emit("res:pagina_bianca", { success: true, data });
    } catch (e) {
      socket.emit("res:pagina_bianca", { success: false, error: e.message });
    }
  });

  socket.on("get:pagina_bianca_singolo", ({ id }) => {
    try {
      const data = paginaBiancaRepository.getPaginaBiancaSingolo(id);
      socket.emit("res:pagina_bianca_singolo", { success: true, data });
    } catch (e) {
      socket.emit("res:pagina_bianca_singolo", {
        success: false,
        error: e.message,
      });
    }
  });

  socket.on("create:pagina_bianca", (data) => {
    try {
      const newId = paginaBiancaRepository.createPaginaBianca(data);
      io.emit("broadcast:pagina_bianca_updated");
      socket.emit("res:create:pagina_bianca", { success: true, id: newId });
      socket.emit("notify", {
        type: "success",
        msg: "Appunto creato con successo",
      });
    } catch (e) {
      socket.emit("res:create:pagina_bianca", {
        success: false,
        error: e.message,
      });
    }
  });

  socket.on("update:pagina_bianca", (data) => {
    try {
      paginaBiancaRepository.updatePaginaBianca(data);
      io.emit("broadcast:pagina_bianca_updated");
      socket.emit("res:update:pagina_bianca", { success: true });
      socket.emit("notify", { type: "success", msg: "Appunto aggiornato" });
    } catch (e) {
      socket.emit("res:update:pagina_bianca", {
        success: false,
        error: e.message,
      });
    }
  });

  socket.on("delete:pagina_bianca", ({ id }) => {
    try {
      paginaBiancaRepository.deletePaginaBianca(id);
      io.emit("broadcast:pagina_bianca_updated");
      socket.emit("res:delete:pagina_bianca", { success: true });
      socket.emit("notify", { type: "success", msg: "Appunto eliminato" });
    } catch (e) {
      socket.emit("res:delete:pagina_bianca", {
        success: false,
        error: e.message,
      });
    }
  });

  // ── BULK: elimina più note ────────────────────────────────────────
  socket.on("delete:pagina_bianca:bulk", ({ ids }) => {
    const ok = [];
    const failed = [];
    for (const id of ids) {
      try {
        paginaBiancaRepository.deletePaginaBianca(id);
        ok.push(id);
      } catch (e) {
        failed.push({ id, error: e.message });
      }
    }
    if (ok.length > 0) io.emit("broadcast:pagina_bianca_updated");
    socket.emit("res:delete:pagina_bianca:bulk", {
      success: true,
      ok,
      failed,
    });
    const totOk = ok.length;
    const msg = failed.length
      ? "Eliminate " + totOk + ", fallite " + failed.length
      : totOk +
        (totOk === 1 ? " nota eliminata" : " note eliminate") +
        " con successo";
    socket.emit("notify", {
      type: failed.length ? "warning" : "success",
      msg,
    });
  });
};
