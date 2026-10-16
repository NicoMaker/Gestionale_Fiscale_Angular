const { runQuery, queryOne } = require("../config/database");

/**
 * Ripristina un singolo elemento del cestino nella sua tabella d'origine.
 *
 * Logica di business estratta dagli handler socket: reinserisce/riattiva il
 * record in base alla tabella di provenienza ed emette il broadcast di dominio
 * corrispondente. NON rimuove l'elemento dal cestino e NON emette
 * `broadcast:cestino_updated`: quelle operazioni restano a carico del chiamante
 * (handler singolo o bulk), così da poter aggregare i risultati.
 *
 * @param {import("socket.io").Server} io  istanza Socket.IO per i broadcast
 * @param {{tabella:string, record_id:number, dati:object}} item  elemento cestino
 * @returns {boolean} true se il ripristino è avvenuto, false se la tabella non è gestita
 * @throws se i vincoli d'integrità impediscono il ripristino (es. cliente/adempimento eliminato)
 */
function restoreItem(io, item) {
  const dati = item.dati;

  if (item.tabella === "clienti") {
    // Riattiva il cliente
    runQuery(
      `UPDATE clienti SET attivo = 1, updated_at = datetime('now') WHERE id = ?`,
      [item.record_id],
    );
    io.emit("broadcast:clienti_updated");
    return true;
  }

  if (item.tabella === "adempimenti") {
    // Riattiva l'adempimento
    runQuery(`UPDATE adempimenti SET attivo = 1 WHERE id = ?`, [
      item.record_id,
    ]);
    io.emit("broadcast:adempimenti_updated");
    return true;
  }

  if (item.tabella === "appunti") {
    // Reinserisce l'appunto
    runQuery(
      `INSERT OR REPLACE INTO appunti (id, titolo, contenuto, id_cliente, data_inserimento, data_scadenza, priorita, completato)
       VALUES (?,?,?,?,?,?,?,?)`,
      [
        dati.id,
        dati.titolo,
        dati.contenuto || null,
        dati.id_cliente || null,
        dati.data_inserimento,
        dati.data_scadenza || null,
        dati.priorita || "media",
        dati.completato || 0,
      ],
    );
    io.emit("broadcast:appunti_updated");
    return true;
  }

  if (item.tabella === "pagina_bianca") {
    // Reinserisce la nota
    runQuery(
      `INSERT OR REPLACE INTO pagina_bianca (id, tipo, titolo, contenuto, allegati, id_cliente, data_creazione, data_modifica)
       VALUES (?,?,?,?,?,?,?,?)`,
      [
        dati.id,
        dati.tipo,
        dati.titolo || "",
        dati.contenuto || null,
        dati.allegati || null,
        dati.id_cliente || null,
        dati.data_creazione,
        dati.data_modifica,
      ],
    );
    io.emit("broadcast:pagina_bianca_updated");
    return true;
  }

  if (item.tabella === "adempimenti_cliente") {
    // Verifica che cliente e adempimento esistano ancora
    const clienteOk = queryOne(
      `SELECT id FROM clienti WHERE id = ? AND attivo = 1`,
      [dati.id_cliente],
    );
    if (!clienteOk)
      throw new Error(
        `Impossibile ripristinare: il cliente associato non esiste più o è stato eliminato.`,
      );
    const adpOk = queryOne(
      `SELECT id FROM adempimenti WHERE id = ? AND attivo = 1`,
      [dati.id_adempimento],
    );
    if (!adpOk)
      throw new Error(
        `Impossibile ripristinare: l'adempimento associato non esiste più o è stato eliminato.`,
      );
    // Reinserisce la riga adempimenti_cliente
    runQuery(
      `INSERT OR REPLACE INTO adempimenti_cliente
         (id, id_cliente, id_adempimento, anno, mese, trimestre, semestre,
          stato, data_scadenza, data_completamento, note, importo,
          importo_saldo, importo_acconto1, importo_acconto2, importo_iva,
          importo_contabilita, cont_completata, iva_completata)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        dati.id,
        dati.id_cliente,
        dati.id_adempimento,
        dati.anno,
        dati.mese || null,
        dati.trimestre || null,
        dati.semestre || null,
        dati.stato || "da_fare",
        dati.data_scadenza || null,
        dati.data_completamento || null,
        dati.note || null,
        dati.importo || null,
        dati.importo_saldo || null,
        dati.importo_acconto1 || null,
        dati.importo_acconto2 || null,
        dati.importo_iva || null,
        dati.importo_contabilita || null,
        dati.cont_completata || 0,
        dati.iva_completata || 0,
      ],
    );
    io.emit("broadcast:scadenzario_updated", {
      id_cliente: dati.id_cliente,
      anno: dati.anno,
    });
    io.emit("broadcast:globale_updated", { anno: dati.anno });
    io.emit("broadcast:stats_updated", { anno: dati.anno });
    return true;
  }

  return false;
}

module.exports = { restoreItem };
