const clientiRepository = require("../repositories/clientiRepository");
const { queryOne } = require("../config/database");

/**
 * Handler socket per il dominio CLIENTI: anagrafica, configurazione,
 * eliminazione (anche bulk) e copia configurazione tra anni.
 */
module.exports = function registerClientiController(io, socket) {
  socket.on("get:clienti", (filtri = {}) => {
    try {
      const anno = filtri.anno || new Date().getFullYear();
      const data = clientiRepository.getClientiConDettagli(filtri, anno);
      socket.emit("res:clienti", { success: true, data, anno });
    } catch (e) {
      socket.emit("res:clienti", { success: false, error: e.message });
    }
  });

  socket.on("get:cliente", ({ id, anno }) => {
    try {
      const a = anno || new Date().getFullYear();
      const c = clientiRepository.getClienteConDettagli(id, a);
      socket.emit("res:cliente", { success: true, data: c, anno: a });
    } catch (e) {
      socket.emit("res:cliente", { success: false, error: e.message });
    }
  });

  socket.on("get:cliente_storico", ({ id }) => {
    try {
      const storico = clientiRepository.getConfigStoricoCliente(id);
      socket.emit("res:cliente_storico", { success: true, data: storico });
    } catch (e) {
      socket.emit("res:cliente_storico", {
        success: false,
        error: e.message,
      });
    }
  });

  socket.on("create:cliente", (data) => {
    try {
      const newId = clientiRepository.createCliente(data);
      io.emit("broadcast:clienti_updated");
      socket.emit("res:create:cliente", { success: true, id: newId });
      socket.emit("notify", {
        type: "success",
        msg: "Cliente creato con successo",
      });
    } catch (e) {
      socket.emit("res:create:cliente", { success: false, error: e.message });
    }
  });

  socket.on("update:cliente", (data) => {
    try {
      clientiRepository.updateClienteAnagrafica(data);
      clientiRepository.updateClienteConfig(data);
      io.emit("broadcast:clienti_updated");
      socket.emit("res:update:cliente", { success: true });
      socket.emit("notify", { type: "success", msg: "Cliente aggiornato" });
    } catch (e) {
      socket.emit("res:update:cliente", { success: false, error: e.message });
    }
  });

  socket.on("delete:cliente", ({ id }) => {
    try {
      clientiRepository.deleteCliente(id);
      io.emit("broadcast:clienti_updated");
      socket.emit("res:delete:cliente", { success: true });
      socket.emit("notify", {
        type: "success",
        msg: "Cliente eliminato con successo",
      });
    } catch (e) {
      socket.emit("res:delete:cliente", { success: false, error: e.message });
      socket.emit("notify", { type: "error", msg: e.message });
    }
  });

  // ── BULK: controlla se i clienti selezionati sono eliminabili ─────
  socket.on("check:clienti:bulk", ({ ids }) => {
    try {
      const results = ids.map((id) => {
        const check = clientiRepository.canDeleteCliente(id);
        const c = queryOne("SELECT nome FROM clienti WHERE id = ?", [id]);
        return {
          id,
          nome: c ? c.nome : "#" + id,
          canDelete: check.canDelete,
          adempimentiCount: check.adempimentiCount,
        };
      });
      socket.emit("res:check:clienti:bulk", { success: true, results });
    } catch (e) {
      socket.emit("res:check:clienti:bulk", {
        success: false,
        error: e.message,
      });
    }
  });

  // ── BULK: elimina più clienti ─────────────────────────────────────
  socket.on("delete:clienti:bulk", ({ ids }) => {
    const ok = [];
    const failed = [];
    for (const id of ids) {
      try {
        clientiRepository.deleteCliente(id);
        ok.push(id);
      } catch (e) {
        failed.push({ id, error: e.message });
      }
    }
    if (ok.length > 0) io.emit("broadcast:clienti_updated");
    socket.emit("res:delete:clienti:bulk", { success: true, ok, failed });
    const totOk = ok.length;
    const msg = failed.length
      ? "Eliminati " + totOk + ", falliti " + failed.length
      : totOk +
        (totOk === 1 ? " cliente eliminato" : " clienti eliminati") +
        " con successo";
    socket.emit("notify", {
      type: failed.length ? "warning" : "success",
      msg,
    });
  });

  // Copia configurazione cliente
  socket.on("copia:config_cliente", ({ id_cliente, anno_da, anno_a }) => {
    try {
      const config = clientiRepository.copiaConfigClienteAnno(
        id_cliente,
        anno_da,
        anno_a,
      );
      io.emit("broadcast:clienti_updated");
      socket.emit("res:copia:config_cliente", { success: true, config });
      socket.emit("notify", {
        type: "success",
        msg: `Configurazione cliente copiata dall'anno ${anno_da} al ${anno_a}`,
      });
    } catch (e) {
      socket.emit("res:copia:config_cliente", {
        success: false,
        error: e.message,
      });
      socket.emit("notify", { type: "error", msg: e.message });
    }
  });

  socket.on("copia:config_tutti_clienti", ({ anno_da, anno_a }) => {
    try {
      const risultati = clientiRepository.copiaTuttiClientiAnno(
        anno_da,
        anno_a,
      );
      io.emit("broadcast:clienti_updated");
      socket.emit("res:copia:config_tutti_clienti", {
        success: true,
        risultati,
      });
    } catch (e) {
      socket.emit("res:copia:config_tutti_clienti", {
        success: false,
        error: e.message,
      });
    }
  });

  // ── CLIENTI SENZA ADEMPIMENTI ──
  socket.on("get:clienti_senza_adempimenti", ({ anno }) => {
    try {
      const clientiSenzaAdp =
        clientiRepository.getClientiSenzaAdempimenti(anno);
      socket.emit("res:clienti_senza_adempimenti", {
        success: true,
        data: clientiSenzaAdp,
      });
    } catch (e) {
      socket.emit("res:clienti_senza_adempimenti", {
        success: false,
        error: e.message,
      });
    }
  });
};
