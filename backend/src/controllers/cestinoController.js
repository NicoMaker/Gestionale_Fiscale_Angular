const cestinoRepository = require("../repositories/cestinoRepository");
const cestinoRestoreService = require("../services/cestinoRestoreService");

/**
 * Handler socket per il dominio CESTINO: elenco, ripristino (singolo e bulk),
 * eliminazione definitiva (singola e bulk) e svuotamento.
 */
module.exports = function registerCestinoController(io, socket) {
  socket.on("get:cestino", (filtri = {}) => {
    try {
      // Pulizia automatica elementi scaduti (>30gg)
      cestinoRepository.eliminaScadutiCestino();
      const data = cestinoRepository.getCestino(filtri);
      socket.emit("res:cestino", { success: true, data });
    } catch (e) {
      socket.emit("res:cestino", { success: false, error: e.message });
    }
  });

  socket.on("ripristina:cestino", ({ id }) => {
    try {
      const item = cestinoRepository.getCestinoItem(id);
      if (!item) throw new Error("Elemento non trovato nel cestino");

      const ripristinato = cestinoRestoreService.restoreItem(io, item);

      if (ripristinato) {
        cestinoRepository.eliminaDalCestino(id);
        io.emit("broadcast:cestino_updated");
        socket.emit("res:ripristina:cestino", { success: true });
        socket.emit("notify", {
          type: "success",
          msg: "Elemento ripristinato con successo",
        });
      } else {
        throw new Error(
          "Tabella non supportata per il ripristino: " + item.tabella,
        );
      }
    } catch (e) {
      socket.emit("res:ripristina:cestino", {
        success: false,
        error: e.message,
      });
      socket.emit("notify", { type: "error", msg: e.message });
    }
  });

  socket.on("delete:cestino_item", ({ id }) => {
    try {
      cestinoRepository.eliminaDalCestino(id);
      io.emit("broadcast:cestino_updated");
      socket.emit("res:delete:cestino_item", { success: true });
      socket.emit("notify", {
        type: "success",
        msg: "Elemento eliminato definitivamente",
      });
    } catch (e) {
      socket.emit("res:delete:cestino_item", {
        success: false,
        error: e.message,
      });
    }
  });

  socket.on("svuota:cestino", () => {
    try {
      const cnt = cestinoRepository.svuotaCestino();
      io.emit("broadcast:cestino_updated");
      socket.emit("res:svuota:cestino", { success: true, eliminati: cnt });
      socket.emit("notify", {
        type: "success",
        msg: `Cestino svuotato (${cnt} elementi eliminati)`,
      });
    } catch (e) {
      socket.emit("res:svuota:cestino", { success: false, error: e.message });
    }
  });

  // ── BULK: ripristina più elementi selezionati ──────────────────────
  socket.on("ripristina:cestino:bulk", ({ ids }) => {
    if (!Array.isArray(ids) || !ids.length) {
      socket.emit("res:ripristina:cestino:bulk", {
        success: false,
        error: "Nessun id fornito",
      });
      return;
    }
    const results = { ok: [], failed: [] };
    for (const id of ids) {
      try {
        const item = cestinoRepository.getCestinoItem(id);
        if (!item) throw new Error("Elemento non trovato");

        const ripristinato = cestinoRestoreService.restoreItem(io, item);

        if (ripristinato) {
          cestinoRepository.eliminaDalCestino(id);
          results.ok.push(id);
        } else {
          results.failed.push({ id, error: "Tabella non supportata" });
        }
      } catch (e) {
        results.failed.push({ id, error: e.message });
      }
    }
    io.emit("broadcast:cestino_updated");
    socket.emit("res:ripristina:cestino:bulk", {
      success: true,
      ok: results.ok.length,
      failed: results.failed,
    });
    const msg = results.failed.length
      ? `Ripristinati ${results.ok.length}, falliti ${results.failed.length}`
      : `${results.ok.length} element${results.ok.length === 1 ? "o ripristinato" : "i ripristinati"} con successo`;
    socket.emit("notify", {
      type: results.failed.length ? "warning" : "success",
      msg,
    });
  });

  // ── BULK: elimina definitivamente più elementi selezionati ─────────
  socket.on("delete:cestino:bulk", ({ ids }) => {
    if (!Array.isArray(ids) || !ids.length) {
      socket.emit("res:delete:cestino:bulk", {
        success: false,
        error: "Nessun id fornito",
      });
      return;
    }
    let eliminati = 0;
    for (const id of ids) {
      try {
        cestinoRepository.eliminaDalCestino(id);
        eliminati++;
      } catch (_) {}
    }
    io.emit("broadcast:cestino_updated");
    socket.emit("res:delete:cestino:bulk", { success: true, eliminati });
    socket.emit("notify", {
      type: "success",
      msg: `${eliminati} element${eliminati === 1 ? "o eliminato" : "i eliminati"} definitivamente`,
    });
  });
};
