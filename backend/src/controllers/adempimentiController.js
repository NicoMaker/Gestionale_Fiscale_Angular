const adempimentiRepository = require("../repositories/adempimentiRepository");
const { queryOne } = require("../config/database");

/**
 * Handler socket per il dominio ADEMPIMENTI: anagrafica adempimenti,
 * generazione per cliente, eliminazione (anche bulk) e adempimenti
 * personalizzati.
 */
module.exports = function registerAdempimentiController(io, socket) {
  socket.on("get:adempimenti", () => {
    try {
      const data = adempimentiRepository.getAdempimenti();
      socket.emit("res:adempimenti", { success: true, data });
    } catch (e) {
      socket.emit("res:adempimenti", { success: false, error: e.message });
    }
  });

  socket.on("get:adempimenti_cliente", ({ id_cliente, anno }) => {
    try {
      const data = adempimentiRepository.getAdempimentiCliente(
        id_cliente,
        anno,
      );
      socket.emit("res:adempimenti_cliente", { success: true, data });
    } catch (e) {
      socket.emit("res:adempimenti_cliente", {
        success: false,
        error: e.message,
      });
    }
  });

  socket.on("create:adempimento", (data) => {
    try {
      const newId = adempimentiRepository.createAdempimento(data);
      const anno = data.anno_validita
        ? parseInt(data.anno_validita)
        : new Date().getFullYear();
      const tot = adempimentiRepository.generaAdempimentoPerTutti(newId, anno);
      io.emit("broadcast:adempimenti_updated");
      io.emit("broadcast:scadenzario_updated", { anno });
      socket.emit("res:create:adempimento", {
        success: true,
        id: newId,
        generati: tot,
      });
    } catch (e) {
      socket.emit("res:create:adempimento", {
        success: false,
        error: e.message,
      });
    }
  });

  socket.on("update:adempimento", (data) => {
    try {
      adempimentiRepository.updateAdempimento(data);
      io.emit("broadcast:adempimenti_updated");
      socket.emit("res:update:adempimento", { success: true });
    } catch (e) {
      socket.emit("res:update:adempimento", {
        success: false,
        error: e.message,
      });
    }
  });

  socket.on("delete:adempimento", ({ id }) => {
    try {
      adempimentiRepository.deleteAdempimento(id);
      io.emit("broadcast:adempimenti_updated");
      socket.emit("res:delete:adempimento", { success: true });
      socket.emit("notify", {
        type: "success",
        msg: "Adempimento eliminato con successo",
      });
    } catch (e) {
      socket.emit("res:delete:adempimento", {
        success: false,
        error: e.message,
      });
      socket.emit("notify", { type: "error", msg: e.message });
    }
  });

  // ── BULK: controlla se gli adempimenti selezionati sono eliminabili ─
  socket.on("check:adempimenti:bulk", ({ ids }) => {
    try {
      const results = ids.map((id) => {
        const check = adempimentiRepository.canDeleteAdempimento(id);
        const a = queryOne("SELECT nome FROM adempimenti WHERE id = ?", [id]);
        return {
          id,
          nome: a ? a.nome : "#" + id,
          canDelete: check.canDelete,
          clientiCount: check.clientiCount,
        };
      });
      socket.emit("res:check:adempimenti:bulk", { success: true, results });
    } catch (e) {
      socket.emit("res:check:adempimenti:bulk", {
        success: false,
        error: e.message,
      });
    }
  });

  // ── BULK: elimina più adempimenti ─────────────────────────────────
  socket.on("delete:adempimenti:bulk", ({ ids }) => {
    const ok = [];
    const failed = [];
    for (const id of ids) {
      try {
        adempimentiRepository.deleteAdempimento(id);
        ok.push(id);
      } catch (e) {
        failed.push({ id, error: e.message });
      }
    }
    if (ok.length > 0) io.emit("broadcast:adempimenti_updated");
    socket.emit("res:delete:adempimenti:bulk", { success: true, ok, failed });
    const totOk = ok.length;
    const msg = failed.length
      ? "Eliminati " + totOk + ", falliti " + failed.length
      : totOk +
        (totOk === 1 ? " adempimento eliminato" : " adempimenti eliminati") +
        " con successo";
    socket.emit("notify", {
      type: failed.length ? "warning" : "success",
      msg,
    });
  });

  socket.on("create:adempimento_personalizzato", (data) => {
    try {
      const risultato =
        adempimentiRepository.createAdempimentoPersonalizzato(data);
      io.emit("broadcast:adempimenti_updated");
      if (risultato.generati_per_clienti > 0) {
        io.emit("broadcast:scadenzario_updated", {
          anno: data.anno || new Date().getFullYear(),
        });
        io.emit("broadcast:globale_updated", {
          anno: data.anno || new Date().getFullYear(),
        });
        io.emit("broadcast:stats_updated", {
          anno: data.anno || new Date().getFullYear(),
        });
      }
      socket.emit("res:create:adempimento_personalizzato", {
        success: true,
        ...risultato,
      });
    } catch (e) {
      socket.emit("res:create:adempimento_personalizzato", {
        success: false,
        error: e.message,
      });
    }
  });

  socket.on("check:adempimenti_cliente", ({ id_cliente, anno }) => {
    try {
      const risultato = adempimentiRepository.checkAdempimentiClienteEsistenti(
        id_cliente,
        anno,
      );
      socket.emit("res:check:adempimenti_cliente", {
        success: true,
        data: risultato,
      });
    } catch (e) {
      socket.emit("res:check:adempimenti_cliente", {
        success: false,
        error: e.message,
      });
    }
  });
};
