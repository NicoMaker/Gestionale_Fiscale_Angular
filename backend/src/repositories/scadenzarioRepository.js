const { runQuery, queryAll, queryOne } = require("../config/database");
const {
  inserisciAdempimentoSeAssente,
  inserisciAdempimentoSeAssenteConDettagli,
} = require("./adempimentiRepository");
const { spostaInCestino } = require("./cestinoRepository");

function _annoFromRow(anno) {
  return anno || new Date().getFullYear();
}

function getScadenzarioConDettagliCliente(id_cliente, anno, filtri = {}) {
  let sql = `
    SELECT
      ac.*,
      a.codice as adempimento_codice,
      a.nome as adempimento_nome,
      a.scadenza_tipo,
      a.is_contabilita,
      a.has_rate,
      a.rate_labels,
      a.is_checkbox,
      a.anno_validita,
      c.id as cliente_id,
      c.nome as cliente_nome,
      c.codice_fiscale as cliente_cf,
      c.partita_iva as cliente_piva,
      c.email as cliente_email,
      c.telefono as cliente_tel,
      COALESCE(cfg.id_tipologia, cfg_last.id_tipologia) as cliente_id_tipologia,
      COALESCE(t.codice, t_last.codice)   as cliente_tipologia_codice,
      COALESCE(t.colore, t_last.colore)   as cliente_tipologia_colore,
      COALESCE(s.codice, s_last.codice)   as cliente_sottotipologia_codice,
      COALESCE(s.nome,   s_last.nome)     as cliente_sottotipologia_nome,
      COALESCE(cfg.periodicita,   cfg_last.periodicita)   as cliente_periodicita,
      COALESCE(cfg.col2_value,    cfg_last.col2_value)    as cliente_col2,
      COALESCE(cfg.col3_value,    cfg_last.col3_value)    as cliente_col3
    FROM adempimenti_cliente ac
    JOIN adempimenti a ON ac.id_adempimento = a.id
    JOIN clienti c ON ac.id_cliente = c.id
    LEFT JOIN clienti_config_annuale cfg
      ON cfg.id_cliente = c.id AND cfg.anno = ?
    LEFT JOIN clienti_config_annuale cfg_last
      ON cfg_last.id = (
        SELECT id FROM clienti_config_annuale
        WHERE id_cliente = c.id AND anno <= ?
        ORDER BY anno DESC LIMIT 1
      )
    LEFT JOIN tipologie_cliente t      ON t.id      = cfg.id_tipologia
    LEFT JOIN sottotipologie   s      ON s.id      = cfg.id_sottotipologia
    LEFT JOIN tipologie_cliente t_last ON t_last.id = cfg_last.id_tipologia
    LEFT JOIN sottotipologie   s_last ON s_last.id  = cfg_last.id_sottotipologia
    WHERE ac.id_cliente = ? AND ac.anno = ?
      AND (a.anno_validita IS NULL OR a.anno_validita = ?)
  `;
  const params = [anno, anno, id_cliente, anno, anno];

  if (filtri.stato && filtri.stato !== "tutti") {
    sql += ` AND ac.stato = ?`;
    params.push(filtri.stato);
  }
  if (filtri.search?.trim()) {
    const s = `%${filtri.search.trim()}%`;
    sql += ` AND (a.nome LIKE ? OR a.codice LIKE ?)`;
    params.push(s, s);
  }

  sql += ` ORDER BY ac.data_scadenza DESC NULLS LAST, a.nome COLLATE NOCASE, c.nome COLLATE NOCASE, ac.mese, ac.trimestre, ac.semestre`;
  return queryAll(sql, params);
}

function getScadenzarioGlobale(anno, filtri = {}) {
  let sql = `
    SELECT
      ac.*,
      a.codice as adempimento_codice,
      a.nome as adempimento_nome,
      a.scadenza_tipo,
      a.is_contabilita,
      a.has_rate,
      a.rate_labels,
      a.is_checkbox,
      a.anno_validita,
      c.id as cliente_id,
      c.nome as cliente_nome,
      c.codice_fiscale as cliente_cf,
      c.partita_iva as cliente_piva,
      c.email as cliente_email,
      c.telefono as cliente_tel,
      COALESCE(cfg.id_tipologia, cfg_last.id_tipologia) as cliente_id_tipologia,
      COALESCE(t.codice, t_last.codice)   as cliente_tipologia_codice,
      COALESCE(t.colore, t_last.colore)   as cliente_tipologia_colore,
      COALESCE(s.codice, s_last.codice)   as cliente_sottotipologia_codice,
      COALESCE(s.nome,   s_last.nome)     as cliente_sottotipologia_nome,
      COALESCE(cfg.periodicita,   cfg_last.periodicita)   as cliente_periodicita,
      COALESCE(cfg.col2_value,    cfg_last.col2_value)    as cliente_col2,
      COALESCE(cfg.col3_value,    cfg_last.col3_value)    as cliente_col3
    FROM adempimenti_cliente ac
    JOIN adempimenti a ON ac.id_adempimento = a.id
    JOIN clienti c ON ac.id_cliente = c.id
    LEFT JOIN clienti_config_annuale cfg
      ON cfg.id_cliente = c.id AND cfg.anno = ?
    LEFT JOIN clienti_config_annuale cfg_last
      ON cfg_last.id = (
        SELECT id FROM clienti_config_annuale
        WHERE id_cliente = c.id AND anno <= ?
        ORDER BY anno DESC LIMIT 1
      )
    LEFT JOIN tipologie_cliente t      ON t.id      = cfg.id_tipologia
    LEFT JOIN sottotipologie   s      ON s.id      = cfg.id_sottotipologia
    LEFT JOIN tipologie_cliente t_last ON t_last.id = cfg_last.id_tipologia
    LEFT JOIN sottotipologie   s_last ON s_last.id  = cfg_last.id_sottotipologia
    WHERE ac.anno = ? AND c.attivo = 1
      AND (a.anno_validita IS NULL OR a.anno_validita = ?)
  `;
  const params = [anno, anno, anno, anno];

  if (filtri.stato && filtri.stato !== "tutti") {
    sql += ` AND ac.stato = ?`;
    params.push(filtri.stato);
  }
  if (filtri.adempimento) {
    if (Array.isArray(filtri.adempimento)) {
      if (filtri.adempimento.length) {
        sql += ` AND a.nome IN (${filtri.adempimento.map(() => "?").join(",")})`;
        params.push(...filtri.adempimento);
      }
    } else {
      sql += ` AND a.nome = ?`;
      params.push(filtri.adempimento);
    }
  }
  if (filtri.search?.trim()) {
    const s = `%${filtri.search.trim()}%`;
    sql += ` AND (c.nome LIKE ? OR c.codice_fiscale LIKE ? OR c.partita_iva LIKE ? OR a.nome LIKE ?)`;
    params.push(s, s, s, s);
  }
  if (filtri.cliente_id) {
    if (Array.isArray(filtri.cliente_id)) {
      if (filtri.cliente_id.length) {
        sql += ` AND c.id IN (${filtri.cliente_id.map(() => "?").join(",")})`;
        params.push(...filtri.cliente_id);
      }
    } else {
      sql += ` AND c.id = ?`;
      params.push(filtri.cliente_id);
    }
  }

  sql += ` ORDER BY ac.data_scadenza DESC NULLS LAST, a.nome COLLATE NOCASE, c.nome COLLATE NOCASE, ac.mese, ac.trimestre, ac.semestre`;
  return queryAll(sql, params);
}

function generaScadenzarioInterno(id_cliente, anno) {
  // ⭐ Solo adempimenti senza anno_validita o con anno_validita == anno
  const adps = queryAll(
    `SELECT * FROM adempimenti WHERE attivo = 1
     AND (anno_validita IS NULL OR anno_validita = ?)`,
    [anno],
  );
  let tot = 0;
  adps.forEach((a) => {
    tot += inserisciAdempimentoSeAssente(id_cliente, a, anno);
  });
  return tot;
}

function generaTuttiClientiAnno(anno, adempimentiSelezionati = null) {
  const clienti = queryAll(`SELECT id, nome FROM clienti WHERE attivo = 1`);
  let adempimenti;

  if (adempimentiSelezionati && adempimentiSelezionati.length > 0) {
    const placeholders = adempimentiSelezionati.map(() => "?").join(",");
    // ⭐ Filtra anche qui per anno_validita
    adempimenti = queryAll(
      `SELECT * FROM adempimenti WHERE attivo = 1 AND id IN (${placeholders})
       AND (anno_validita IS NULL OR anno_validita = ?)`,
      [...adempimentiSelezionati, anno],
    );
  } else {
    // ⭐ Filtra per anno_validita
    adempimenti = queryAll(
      `SELECT * FROM adempimenti WHERE attivo = 1
       AND (anno_validita IS NULL OR anno_validita = ?)`,
      [anno],
    );
  }

  let totaleInseriti = 0;
  let totaleMantenuti = 0;
  const dettagliCompleti = [];

  clienti.forEach((c) => {
    adempimenti.forEach((a) => {
      const risultato = inserisciAdempimentoSeAssenteConDettagli(c.id, a, anno);
      totaleInseriti += risultato.inseriti;
      totaleMantenuti += risultato.mantenuti;

      if (risultato.dettagli.length > 0) {
        dettagliCompleti.push({
          cliente: c.nome,
          cliente_id: c.id,
          adempimento: a.nome,
          adempimento_id: a.id,
          dettagli: risultato.dettagli,
        });
      }
    });
  });

  return {
    inseriti: totaleInseriti,
    mantenuti: totaleMantenuti,
    dettagli: dettagliCompleti,
    riepilogo: `Generati ${totaleInseriti} nuovi adempimenti, mantenuti ${totaleMantenuti} adempimenti esistenti`,
  };
}

function rigeneraTuttiClientiAnno(anno, adempimentiSelezionati = null) {
  const clienti = queryAll(`SELECT id FROM clienti WHERE attivo = 1`);
  let adempimenti;

  if (adempimentiSelezionati && adempimentiSelezionati.length > 0) {
    const placeholders = adempimentiSelezionati.map(() => "?").join(",");
    adempimenti = queryAll(
      `SELECT * FROM adempimenti WHERE attivo = 1 AND id IN (${placeholders})
       AND (anno_validita IS NULL OR anno_validita = ?)`,
      [...adempimentiSelezionati, anno],
    );
  } else {
    adempimenti = queryAll(
      `SELECT * FROM adempimenti WHERE attivo = 1
       AND (anno_validita IS NULL OR anno_validita = ?)`,
      [anno],
    );
  }

  let tot = 0;
  clienti.forEach((c) => {
    adempimenti.forEach((a) => {
      tot += inserisciAdempimentoForzato(c.id, a, anno);
    });
  });
  return tot;
}

function copiaScadenzarioCliente(id_cliente, anno_da, anno_a) {
  const righe = queryAll(
    `SELECT * FROM adempimenti_cliente WHERE id_cliente = ? AND anno = ?`,
    [id_cliente, anno_da],
  );
  let tot = 0;
  righe.forEach((r) => {
    // ⭐ Non copiare adempimenti vincolati a un anno specifico diverso da anno_a
    const adp = queryOne(`SELECT anno_validita FROM adempimenti WHERE id = ?`, [
      r.id_adempimento,
    ]);
    if (
      adp &&
      adp.anno_validita !== null &&
      adp.anno_validita !== undefined &&
      String(adp.anno_validita) !== String(anno_a)
    ) {
      return; // skip: era valido solo per anno_da
    }

    const ex = queryOne(
      `SELECT id FROM adempimenti_cliente WHERE id_cliente = ? AND id_adempimento = ? AND anno = ? AND COALESCE(mese,0) = COALESCE(?,0) AND COALESCE(trimestre,0) = COALESCE(?,0) AND COALESCE(semestre,0) = COALESCE(?,0)`,
      [id_cliente, r.id_adempimento, anno_a, r.mese, r.trimestre, r.semestre],
    );
    if (!ex) {
      try {
        runQuery(
          `INSERT INTO adempimenti_cliente (id_cliente, id_adempimento, anno, mese, trimestre, semestre, stato, data_scadenza, data_completamento, note, importo, importo_saldo, importo_acconto1, importo_acconto2, importo_iva, importo_contabilita, cont_completata, iva_completata)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
          [
            r.id_cliente,
            r.id_adempimento,
            anno_a,
            r.mese,
            r.trimestre,
            r.semestre,
            "da_fare", // ⭐ stato sempre "da fare"
            r.data_scadenza, // ⭐ data di scadenza mantenuta
            r.data_completamento, // ⭐ data di completamento mantenuta
            null, // ⭐ note NON copiate
            null, // ⭐ importo NON copiato
            null, // ⭐ importo_saldo NON copiato
            null, // ⭐ importo_acconto1 NON copiato
            null, // ⭐ importo_acconto2 NON copiato
            null, // ⭐ importo_iva NON copiato
            null, // ⭐ importo_contabilita NON copiato
            0, // ⭐ cont_completata NON copiata
            0, // ⭐ iva_completata NON copiata
          ],
        );
        tot++;
      } catch (e) {}
    }
  });
  return tot;
}

function copiaTuttiClienti(anno_da, anno_a) {
  let tot = 0;
  queryAll(`SELECT id FROM clienti WHERE attivo = 1`).forEach((c) => {
    tot += copiaScadenzarioCliente(c.id, anno_da, anno_a);
  });
  return tot;
}

function updateAdempimentoStato(data) {
  runQuery(
    `UPDATE adempimenti_cliente SET
      stato = ?, data_scadenza = ?, data_completamento = ?, note = ?,
      importo = ?, importo_saldo = ?, importo_acconto1 = ?, importo_acconto2 = ?,
      importo_iva = ?, importo_contabilita = ?, cont_completata = ?, iva_completata = ?
    WHERE id = ?`,
    [
      data.stato,
      data.data_scadenza || null,
      data.data_completamento || null,
      data.note || null,
      data.importo || null,
      data.importo_saldo || null,
      data.importo_acconto1 || null,
      data.importo_acconto2 || null,
      data.importo_iva || null,
      data.importo_contabilita || null,
      data.cont_completata ? 1 : 0,
      data.iva_completata ? 1 : 0,
      data.id,
    ],
  );
  return queryOne(
    `SELECT id_cliente, anno FROM adempimenti_cliente WHERE id = ?`,
    [data.id],
  );
}

function deleteAdempimentoCliente(id) {
  const row = queryOne(
    `SELECT ac.*, a.nome as adempimento_nome, a.codice as adempimento_codice,
            c.nome as cliente_nome
     FROM adempimenti_cliente ac
     JOIN adempimenti a ON ac.id_adempimento = a.id
     JOIN clienti c ON ac.id_cliente = c.id
     WHERE ac.id = ?`,
    [id],
  );
  if (row) {
    spostaInCestino({
      tabella: "adempimenti_cliente",
      record_id: id,
      dati_json: row,
    });
  }
  runQuery(`DELETE FROM adempimenti_cliente WHERE id = ?`, [id]);
  return row ? { id_cliente: row.id_cliente, anno: row.anno } : null;
}

function addAdempimentoCliente(data) {
  const adp = queryOne(`SELECT * FROM adempimenti WHERE id = ?`, [
    data.id_adempimento,
  ]);
  if (!adp) throw new Error("Adempimento non trovato");
  return inserisciAdempimentoSeAssente(data.id_cliente, adp, data.anno);
}

function inserisciAdempimentoForzato(id_cliente, adp, anno) {
  let inseriti = 0;

  if (adp.scadenza_tipo === "trimestrale") {
    runQuery(
      `DELETE FROM adempimenti_cliente WHERE id_cliente = ? AND id_adempimento = ? AND anno = ?`,
      [id_cliente, adp.id, anno],
    );
    for (let t = 1; t <= 4; t++) {
      runQuery(
        `INSERT INTO adempimenti_cliente (id_cliente, id_adempimento, anno, trimestre, stato) VALUES (?,?,?,?,?)`,
        [id_cliente, adp.id, anno, t, "da_fare"],
      );
      inseriti++;
    }
  } else if (adp.scadenza_tipo === "semestrale") {
    runQuery(
      `DELETE FROM adempimenti_cliente WHERE id_cliente = ? AND id_adempimento = ? AND anno = ?`,
      [id_cliente, adp.id, anno],
    );
    for (let s = 1; s <= 2; s++) {
      runQuery(
        `INSERT INTO adempimenti_cliente (id_cliente, id_adempimento, anno, semestre, stato) VALUES (?,?,?,?,?)`,
        [id_cliente, adp.id, anno, s, "da_fare"],
      );
      inseriti++;
    }
  } else if (adp.scadenza_tipo === "mensile") {
    runQuery(
      `DELETE FROM adempimenti_cliente WHERE id_cliente = ? AND id_adempimento = ? AND anno = ?`,
      [id_cliente, adp.id, anno],
    );
    for (let m = 1; m <= 12; m++) {
      runQuery(
        `INSERT INTO adempimenti_cliente (id_cliente, id_adempimento, anno, mese, stato) VALUES (?,?,?,?,?)`,
        [id_cliente, adp.id, anno, m, "da_fare"],
      );
      inseriti++;
    }
  } else {
    runQuery(
      `DELETE FROM adempimenti_cliente WHERE id_cliente = ? AND id_adempimento = ? AND anno = ? AND mese IS NULL AND trimestre IS NULL AND semestre IS NULL`,
      [id_cliente, adp.id, anno],
    );
    runQuery(
      `INSERT INTO adempimenti_cliente (id_cliente, id_adempimento, anno, stato) VALUES (?,?,?,?)`,
      [id_cliente, adp.id, anno, "da_fare"],
    );
    inseriti++;
  }
  return inseriti;
}

module.exports = {
  getScadenzarioConDettagliCliente,
  getScadenzarioGlobale,
  generaScadenzarioInterno,
  generaTuttiClientiAnno,
  rigeneraTuttiClientiAnno,
  copiaScadenzarioCliente,
  copiaTuttiClienti,
  updateAdempimentoStato,
  deleteAdempimentoCliente,
  addAdempimentoCliente,
};
