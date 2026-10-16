const adempimentiRepository = require("../repositories/adempimentiRepository");

/**
 * Handler socket per l'operazione "APPLICA" della dashboard: applicare o
 * rimuovere in blocco uno o più adempimenti a uno o più clienti per un anno.
 */
module.exports = function registerApplicaController(io, socket) {
  // ── APPLICA ADEMPIMENTI A CLIENTI ──
  socket.on(
    "applica:adempimenti_a_clienti",
    ({ adempimenti_ids, clienti_ids, anno }) => {
      try {
        const risultato = adempimentiRepository.applicaAdempimentiAClienti(
          adempimenti_ids,
          clienti_ids,
          anno,
        );
        io.emit("broadcast:adempimenti_updated");
        io.emit("broadcast:scadenzario_updated", { anno });
        io.emit("broadcast:globale_updated", { anno });
        io.emit("broadcast:stats_updated", { anno });
        socket.emit("res:applica:adempimenti_a_clienti", {
          success: true,
          inseriti: risultato.inseriti,
          clienti: clienti_ids.length,
          adempimenti: adempimenti_ids.length,
          dettagli: { skipped: risultato.skipped },
        });
      } catch (e) {
        socket.emit("res:applica:adempimenti_a_clienti", {
          success: false,
          error: e.message,
        });
      }
    },
  );

  // ── ELIMINA ADEMPIMENTI DA CLIENTI ──
  socket.on(
    "elimina:adempimenti_a_clienti",
    ({ adempimenti_ids, clienti_ids, anno }) => {
      try {
        const risultato = adempimentiRepository.eliminaAdempimentiDaClienti(
          adempimenti_ids,
          clienti_ids,
          anno,
        );
        io.emit("broadcast:scadenzario_updated", { anno });
        io.emit("broadcast:globale_updated", { anno });
        io.emit("broadcast:stats_updated", { anno });
        socket.emit("res:elimina:adempimenti_a_clienti", {
          success: true,
          eliminati: risultato.eliminati,
          nonTrovati: risultato.nonTrovati,
          clienti: clienti_ids.length,
          adempimenti: adempimenti_ids.length,
        });
      } catch (e) {
        socket.emit("res:elimina:adempimenti_a_clienti", {
          success: false,
          error: e.message,
        });
      }
    },
  );

  // ── ELIMINA ADEMPIMENTI BULK (righe scadenzario di un cliente) ──
  socket.on(
    "elimina:adempimenti_cliente_bulk",
    ({ ids_righe, id_cliente, anno }) => {
      try {
        const risultato =
          adempimentiRepository.eliminaAdempimentiClienteBulk(ids_righe);
        io.emit("broadcast:scadenzario_updated", { id_cliente, anno });
        io.emit("broadcast:globale_updated", { anno });
        io.emit("broadcast:stats_updated", { anno });
        socket.emit("res:elimina:adempimenti_cliente_bulk", {
          success: true,
          eliminati: risultato.eliminati,
        });
      } catch (e) {
        socket.emit("res:elimina:adempimenti_cliente_bulk", {
          success: false,
          error: e.message,
        });
      }
    },
  );
};
