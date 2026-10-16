// ═══════════════════════════════════════════════════════════════
// cestino.js — Modulo backend gestione cestino
// ═══════════════════════════════════════════════════════════════

const {
  runQuery,
  runQueryAndGetId,
  queryAll,
  queryOne,
} = require("../config/database");

const GIORNI_RETENTION = 15;

// Calcola la soglia in JavaScript (evita problemi con datetime() in sql.js/WASM)
function getSoglia() {
  const d = new Date();
  d.setDate(d.getDate() - GIORNI_RETENTION);
  // Formato SQLite: YYYY-MM-DD HH:MM:SS
  return d.toISOString().replace("T", " ").substring(0, 19);
}

function spostaInCestino({ tabella, record_id, dati_json, eliminato_da }) {
  const ora = new Date().toISOString().replace("T", " ").substring(0, 19);
  return runQueryAndGetId(
    `INSERT INTO cestino (tabella, record_id, dati_json, eliminato_da, data_eliminazione)
     VALUES (?,?,?,?,?)`,
    [
      tabella,
      record_id,
      JSON.stringify(dati_json),
      eliminato_da || "utente",
      ora,
    ],
  );
}

function getCestino(filtri = {}) {
  eliminaScadutiCestino();

  let sql = `SELECT * FROM cestino WHERE 1=1`;
  const params = [];
  if (filtri.tabella) {
    sql += ` AND tabella = ?`;
    params.push(filtri.tabella);
  }
  if (filtri.search && filtri.search.trim()) {
    sql += ` AND (dati_json LIKE ? OR tabella LIKE ?)`;
    params.push(`%${filtri.search.trim()}%`, `%${filtri.search.trim()}%`);
  }
  sql += ` ORDER BY data_eliminazione DESC`;
  const rows = queryAll(sql, params);
  return rows.map((r) => ({ ...r, dati: safeParseJson(r.dati_json) }));
}

function getCestinoItem(id) {
  const r = queryOne(`SELECT * FROM cestino WHERE id = ?`, [id]);
  if (!r) return null;
  return { ...r, dati: safeParseJson(r.dati_json) };
}

function eliminaDalCestino(id) {
  const item = queryOne(`SELECT * FROM cestino WHERE id = ?`, [id]);
  if (!item) throw new Error("Elemento non trovato nel cestino");
  runQuery(`DELETE FROM cestino WHERE id = ?`, [id]);
  return item;
}

function svuotaCestino() {
  const count = queryOne(`SELECT COUNT(*) as cnt FROM cestino`);
  runQuery(`DELETE FROM cestino`);
  return count.cnt;
}

function eliminaScadutiCestino() {
  const soglia = getSoglia();
  const result = queryOne(
    `SELECT COUNT(*) as cnt FROM cestino WHERE data_eliminazione <= ?`,
    [soglia],
  );
  runQuery(`DELETE FROM cestino WHERE data_eliminazione <= ?`, [soglia]);
  return result ? result.cnt : 0;
}

// ── Ripristino singolo ─────────────────────────────────────────
// Ripristina un elemento dal cestino nella tabella di origine.
// Restituisce l'item ripristinato (con dati_json già parsato).
function ripristinaItem(id) {
  const item = getCestinoItem(id);
  if (!item) throw new Error("Elemento non trovato nel cestino");

  const dati = item.dati || {};

  switch (item.tabella) {
    case "clienti": {
      // Verifica che non esista già un cliente con lo stesso ID
      const esistente = queryOne(`SELECT id FROM clienti WHERE id = ?`, [
        item.record_id,
      ]);
      if (esistente) throw new Error("Esiste già un cliente con questo ID");
      runQuery(
        `INSERT INTO clienti (id, nome, codice_fiscale, partita_iva, email, tipologia,
          col2, col3, col4, attivo, note, created_at, updated_at)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [
          item.record_id,
          dati.nome || "",
          dati.codice_fiscale || null,
          dati.partita_iva || null,
          dati.email || null,
          dati.tipologia || null,
          dati.col2 || null,
          dati.col3 || null,
          dati.col4 || null,
          dati.attivo !== undefined ? dati.attivo : 1,
          dati.note || null,
          dati.created_at || new Date().toISOString(),
          new Date().toISOString(),
        ],
      );
      break;
    }

    case "adempimenti": {
      const esistente = queryOne(`SELECT id FROM adempimenti WHERE id = ?`, [
        item.record_id,
      ]);
      if (esistente) throw new Error("Esiste già un adempimento con questo ID");
      runQuery(
        `INSERT INTO adempimenti (id, nome, codice, descrizione, scadenza_tipo,
          periodicita, attivo, created_at)
         VALUES (?,?,?,?,?,?,?,?)`,
        [
          item.record_id,
          dati.nome || "",
          dati.codice || null,
          dati.descrizione || null,
          dati.scadenza_tipo || null,
          dati.periodicita || null,
          dati.attivo !== undefined ? dati.attivo : 1,
          dati.created_at || new Date().toISOString(),
        ],
      );
      break;
    }

    case "adempimenti_cliente": {
      // Verifica che il cliente e l'adempimento di riferimento esistano ancora
      const cliente = queryOne(`SELECT id FROM clienti WHERE id = ?`, [
        dati.id_cliente,
      ]);
      if (!cliente)
        throw new Error(
          `Cliente #${dati.id_cliente} non trovato — ripristina prima il cliente`,
        );
      const adp = queryOne(`SELECT id FROM adempimenti WHERE id = ?`, [
        dati.id_adempimento,
      ]);
      if (!adp)
        throw new Error(
          `Adempimento #${dati.id_adempimento} non trovato — ripristina prima l'adempimento`,
        );

      runQuery(
        `INSERT OR REPLACE INTO adempimenti_cliente
          (id, id_cliente, id_adempimento, anno, mese, trimestre, semestre,
           stato, importo, note, data_scadenza, updated_at)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
        [
          item.record_id,
          dati.id_cliente,
          dati.id_adempimento,
          dati.anno,
          dati.mese || null,
          dati.trimestre || null,
          dati.semestre || null,
          dati.stato || "da_fare",
          dati.importo || null,
          dati.note || null,
          dati.data_scadenza || null,
          new Date().toISOString(),
        ],
      );
      break;
    }

    case "appunti": {
      runQuery(
        `INSERT OR REPLACE INTO appunti
          (id, id_cliente, titolo, contenuto, data_scadenza, completato, anno, created_at)
         VALUES (?,?,?,?,?,?,?,?)`,
        [
          item.record_id,
          dati.id_cliente || null,
          dati.titolo || "",
          dati.contenuto || "",
          dati.data_scadenza || null,
          dati.completato || 0,
          dati.anno || new Date().getFullYear(),
          dati.created_at || new Date().toISOString(),
        ],
      );
      break;
    }

    case "pagina_bianca": {
      runQuery(
        `INSERT OR REPLACE INTO pagina_bianca
          (id, tipo, id_cliente, titolo, contenuto, created_at, updated_at)
         VALUES (?,?,?,?,?,?,?)`,
        [
          item.record_id,
          dati.tipo || "studio",
          dati.id_cliente || null,
          dati.titolo || "",
          dati.contenuto || "",
          dati.created_at || new Date().toISOString(),
          new Date().toISOString(),
        ],
      );
      break;
    }

    default:
      throw new Error(
        `Tabella non supportata per il ripristino: ${item.tabella}`,
      );
  }

  // Rimuovi dal cestino dopo il ripristino riuscito
  runQuery(`DELETE FROM cestino WHERE id = ?`, [id]);
  return item;
}

function safeParseJson(str) {
  try {
    return typeof str === "string" ? JSON.parse(str) : str;
  } catch {
    return {};
  }
}

module.exports = {
  spostaInCestino,
  getCestino,
  getCestinoItem,
  eliminaDalCestino,
  svuotaCestino,
  eliminaScadutiCestino,
  ripristinaItem,
  GIORNI_RETENTION,
};
