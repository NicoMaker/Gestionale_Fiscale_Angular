const {
  runQuery,
  runQueryAndGetId,
  queryAll,
  queryOne,
} = require("../config/database");
const { spostaInCestino } = require("./cestinoRepository");

function getAdempimenti() {
  return queryAll(`SELECT * FROM adempimenti WHERE attivo = 1 ORDER BY nome`);
}

function getAdempimentiCliente(id_cliente, anno) {
  return queryAll(
    `
    SELECT DISTINCT 
      a.id, a.codice, a.nome, a.descrizione, a.scadenza_tipo,
      a.is_contabilita, a.has_rate, a.is_checkbox, a.is_text_only, a.rate_labels, a.anno_validita
    FROM adempimenti a
    INNER JOIN adempimenti_cliente ac ON a.id = ac.id_adempimento
    WHERE ac.id_cliente = ? AND ac.anno = ? AND a.attivo = 1
    ORDER BY a.nome
  `,
    [id_cliente, anno],
  );
}

function createAdempimento(data) {
  const esistente = queryOne(
    `SELECT id FROM adempimenti WHERE codice = ? AND attivo = 1`,
    [data.codice],
  );
  if (esistente) {
    throw new Error(`Codice adempimento "${data.codice}" già esistente`);
  }

  const rl = data.rate_labels ? JSON.stringify(data.rate_labels) : null;
  const annoValidita = data.anno_validita ? parseInt(data.anno_validita) : null;

  const newId = runQueryAndGetId(
    `
    INSERT INTO adempimenti (codice, nome, descrizione, scadenza_tipo, 
      is_contabilita, has_rate, is_checkbox, is_text_only, rate_labels, anno_validita) 
    VALUES (?,?,?,?,?,?,?,?,?,?)`,
    [
      data.codice,
      data.nome,
      data.descrizione || null,
      data.scadenza_tipo,
      data.is_contabilita || 0,
      data.has_rate || 0,
      data.is_checkbox || 0,
      data.is_text_only || 0,
      rl,
      annoValidita,
    ],
  );
  return newId;
}

function updateAdempimento(data) {
  const rl = data.rate_labels ? JSON.stringify(data.rate_labels) : null;
  const annoValidita = data.anno_validita ? parseInt(data.anno_validita) : null;

  runQuery(
    `
    UPDATE adempimenti SET 
      codice = ?, nome = ?, descrizione = ?, scadenza_tipo = ?, 
      is_contabilita = ?, has_rate = ?, is_checkbox = ?, is_text_only = ?, rate_labels = ?, anno_validita = ?
    WHERE id = ?`,
    [
      data.codice,
      data.nome,
      data.descrizione || null,
      data.scadenza_tipo,
      data.is_contabilita || 0,
      data.has_rate || 0,
      data.is_checkbox || 0,
      data.is_text_only || 0,
      rl,
      annoValidita,
      data.id,
    ],
  );
}

function deleteAdempimento(id) {
  const count = queryOne(
    `SELECT COUNT(*) as cnt FROM adempimenti_cliente WHERE id_adempimento = ?`,
    [id],
  );
  if (count.cnt > 0) {
    throw new Error(
      `Impossibile eliminare l'adempimento: è assegnato a ${count.cnt} clienti.`,
    );
  }
  const adp = queryOne(`SELECT * FROM adempimenti WHERE id = ?`, [id]);
  if (adp) {
    spostaInCestino({ tabella: "adempimenti", record_id: id, dati_json: adp });
  }
  runQuery(`UPDATE adempimenti SET attivo = 0 WHERE id = ?`, [id]);
}

function canDeleteAdempimento(id) {
  const count = queryOne(
    `SELECT COUNT(*) as cnt FROM adempimenti_cliente WHERE id_adempimento = ?`,
    [id],
  );
  return { canDelete: count.cnt === 0, clientiCount: count.cnt };
}

function inserisciAdempimentoSeAssente(id_cliente, adp, anno) {
  let inseriti = 0;
  const esistenti = queryAll(
    `
    SELECT id, mese, trimestre, semestre FROM adempimenti_cliente 
    WHERE id_cliente = ? AND id_adempimento = ? AND anno = ?`,
    [id_cliente, adp.id, anno],
  );

  if (adp.is_text_only) {
    const esiste = esistenti.find(
      (e) => e.mese === null && e.trimestre === null && e.semestre === null,
    );
    if (!esiste) {
      runQuery(
        `
        INSERT INTO adempimenti_cliente (id_cliente, id_adempimento, anno, stato, note) 
        VALUES (?,?,?,?,?)`,
        [id_cliente, adp.id, anno, "text_only", ""],
      );
      inseriti++;
    }
  } else if (adp.scadenza_tipo === "trimestrale") {
    for (let t = 1; t <= 4; t++) {
      const esiste = esistenti.find((e) => e.trimestre === t);
      if (!esiste) {
        runQuery(
          `INSERT INTO adempimenti_cliente (id_cliente, id_adempimento, anno, trimestre, stato) VALUES (?,?,?,?,?)`,
          [id_cliente, adp.id, anno, t, "da_fare"],
        );
        inseriti++;
      }
    }
  } else if (adp.scadenza_tipo === "semestrale") {
    for (let s = 1; s <= 2; s++) {
      const esiste = esistenti.find((e) => e.semestre === s);
      if (!esiste) {
        runQuery(
          `INSERT INTO adempimenti_cliente (id_cliente, id_adempimento, anno, semestre, stato) VALUES (?,?,?,?,?)`,
          [id_cliente, adp.id, anno, s, "da_fare"],
        );
        inseriti++;
      }
    }
  } else if (adp.scadenza_tipo === "mensile") {
    for (let m = 1; m <= 12; m++) {
      const esiste = esistenti.find((e) => e.mese === m);
      if (!esiste) {
        runQuery(
          `INSERT INTO adempimenti_cliente (id_cliente, id_adempimento, anno, mese, stato) VALUES (?,?,?,?,?)`,
          [id_cliente, adp.id, anno, m, "da_fare"],
        );
        inseriti++;
      }
    }
  } else {
    const esiste = esistenti.find(
      (e) => e.mese === null && e.trimestre === null && e.semestre === null,
    );
    if (!esiste) {
      runQuery(
        `INSERT INTO adempimenti_cliente (id_cliente, id_adempimento, anno, stato) VALUES (?,?,?,?)`,
        [id_cliente, adp.id, anno, "da_fare"],
      );
      inseriti++;
    }
  }
  return inseriti;
}

function inserisciAdempimentoSeAssenteConDettagli(id_cliente, adp, anno) {
  let inseriti = 0,
    mantenuti = 0;
  const esistenti = queryAll(
    `
    SELECT id, mese, trimestre, semestre FROM adempimenti_cliente 
    WHERE id_cliente = ? AND id_adempimento = ? AND anno = ?`,
    [id_cliente, adp.id, anno],
  );

  if (adp.is_text_only) {
    const esiste = esistenti.find(
      (e) => e.mese === null && e.trimestre === null && e.semestre === null,
    );
    if (!esiste) {
      runQuery(
        `INSERT INTO adempimenti_cliente (id_cliente, id_adempimento, anno, stato, note) VALUES (?,?,?,?,?)`,
        [id_cliente, adp.id, anno, "text_only", ""],
      );
      inseriti++;
    } else {
      mantenuti++;
    }
  } else if (adp.scadenza_tipo === "trimestrale") {
    for (let t = 1; t <= 4; t++) {
      const esiste = esistenti.find((e) => e.trimestre === t);
      if (!esiste) {
        runQuery(
          `INSERT INTO adempimenti_cliente (id_cliente, id_adempimento, anno, trimestre, stato) VALUES (?,?,?,?,?)`,
          [id_cliente, adp.id, anno, t, "da_fare"],
        );
        inseriti++;
      } else {
        mantenuti++;
      }
    }
  } else if (adp.scadenza_tipo === "semestrale") {
    for (let s = 1; s <= 2; s++) {
      const esiste = esistenti.find((e) => e.semestre === s);
      if (!esiste) {
        runQuery(
          `INSERT INTO adempimenti_cliente (id_cliente, id_adempimento, anno, semestre, stato) VALUES (?,?,?,?,?)`,
          [id_cliente, adp.id, anno, s, "da_fare"],
        );
        inseriti++;
      } else {
        mantenuti++;
      }
    }
  } else if (adp.scadenza_tipo === "mensile") {
    for (let m = 1; m <= 12; m++) {
      const esiste = esistenti.find((e) => e.mese === m);
      if (!esiste) {
        runQuery(
          `INSERT INTO adempimenti_cliente (id_cliente, id_adempimento, anno, mese, stato) VALUES (?,?,?,?,?)`,
          [id_cliente, adp.id, anno, m, "da_fare"],
        );
        inseriti++;
      } else {
        mantenuti++;
      }
    }
  } else {
    const esiste = esistenti.find(
      (e) => e.mese === null && e.trimestre === null && e.semestre === null,
    );
    if (!esiste) {
      runQuery(
        `INSERT INTO adempimenti_cliente (id_cliente, id_adempimento, anno, stato) VALUES (?,?,?,?)`,
        [id_cliente, adp.id, anno, "da_fare"],
      );
      inseriti++;
    } else {
      mantenuti++;
    }
  }
  // FIX: i chiamanti (genera:tutti) leggono anche `dettagli`
  return { inseriti, mantenuti, dettagli: [] };
}

function generaAdempimentoPerTutti(id_adp, anno) {
  const a = queryOne(`SELECT * FROM adempimenti WHERE id = ?`, [id_adp]);
  if (!a) return { inseriti: 0, mantenuti: 0 };
  let inseriti = 0,
    mantenuti = 0;
  const clienti = queryAll(`SELECT id FROM clienti WHERE attivo = 1`);
  clienti.forEach((c) => {
    const r = inserisciAdempimentoSeAssenteConDettagli(c.id, a, anno);
    inseriti += r.inseriti;
    mantenuti += r.mantenuti;
  });
  return { inseriti, mantenuti };
}

function createAdempimentoPersonalizzato(data) {
  const baseCodice = data.nome
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "_")
    .substring(0, 10);
  let codiceUnivoco = baseCodice;
  let counter = 1;
  while (
    queryOne(`SELECT id FROM adempimenti WHERE codice = ? AND attivo = 1`, [
      codiceUnivoco,
    ])
  ) {
    codiceUnivoco = `${baseCodice}_${counter++}`;
  }

  const newId = runQueryAndGetId(
    `
    INSERT INTO adempimenti (codice, nome, descrizione, scadenza_tipo, is_contabilita, has_rate, is_checkbox, is_text_only, rate_labels) 
    VALUES (?,?,?,?,?,?,?,?,?)`,
    [
      codiceUnivoco,
      data.nome,
      data.descrizione || `Adempimento: ${data.nome}`,
      data.scadenza_tipo || "annuale",
      data.is_contabilita || 0,
      data.has_rate || 0,
      data.is_checkbox || 0,
      data.is_text_only || 0,
      null,
    ],
  );

  let generati = 0;
  if (data.genera_immediatamente && data.clienti_selezionati) {
    const nuovoAdp = queryOne(`SELECT * FROM adempimenti WHERE id = ?`, [
      newId,
    ]);
    let clientiDaProcessare = [];
    if (data.clienti_selezionati === "tutti") {
      clientiDaProcessare = queryAll(
        `SELECT id FROM clienti WHERE attivo = 1`,
      ).map((c) => c.id);
    } else if (Array.isArray(data.clienti_selezionati)) {
      clientiDaProcessare = data.clienti_selezionati;
    }
    clientiDaProcessare.forEach((clienteId) => {
      generati += inserisciAdempimentoSeAssente(
        clienteId,
        nuovoAdp,
        data.anno || new Date().getFullYear(),
      );
    });
  }
  return { id: newId, codice: codiceUnivoco, generati_per_clienti: generati };
}

function checkAdempimentiClienteEsistenti(id_cliente, anno) {
  const adp = queryAll(
    `SELECT * FROM adempimenti WHERE attivo = 1 AND (anno_validita IS NULL OR anno_validita = ?)`,
    [anno],
  );
  const esistenti = queryAll(
    `
    SELECT id_adempimento, mese, trimestre, semestre FROM adempimenti_cliente 
    WHERE id_cliente = ? AND anno = ?`,
    [id_cliente, anno],
  );
  const risultato = [];
  adp.forEach((a) => {
    const status = {
      id_adempimento: a.id,
      nome: a.nome,
      codice: a.codice,
      scadenza_tipo: a.scadenza_tipo,
      esistenti: [],
      mancanti: [],
      totale: 0,
    };
    if (a.is_text_only) {
      status.totale = 1;
      const esiste = esistenti.find(
        (e) =>
          e.id_adempimento === a.id &&
          e.mese === null &&
          e.trimestre === null &&
          e.semestre === null,
      );
      if (esiste) status.esistenti.push({ periodo: "Testo", id: esiste.id });
      else status.mancanti.push({ periodo: "Testo" });
    } else if (a.scadenza_tipo === "trimestrale") {
      status.totale = 4;
      for (let t = 1; t <= 4; t++) {
        const esiste = esistenti.find(
          (e) => e.id_adempimento === a.id && e.trimestre === t,
        );
        if (esiste) status.esistenti.push({ periodo: `T${t}`, id: esiste.id });
        else status.mancanti.push({ periodo: `T${t}`, mese: t });
      }
    } else if (a.scadenza_tipo === "semestrale") {
      status.totale = 2;
      for (let s = 1; s <= 2; s++) {
        const esiste = esistenti.find(
          (e) => e.id_adempimento === a.id && e.semestre === s,
        );
        if (esiste) status.esistenti.push({ periodo: `S${s}`, id: esiste.id });
        else status.mancanti.push({ periodo: `S${s}`, mese: s * 6 });
      }
    } else if (a.scadenza_tipo === "mensile") {
      status.totale = 12;
      for (let m = 1; m <= 12; m++) {
        const esiste = esistenti.find(
          (e) => e.id_adempimento === a.id && e.mese === m,
        );
        if (esiste)
          status.esistenti.push({ periodo: getMeseNome(m), id: esiste.id });
        else status.mancanti.push({ periodo: getMeseNome(m), mese: m });
      }
    } else {
      status.totale = 1;
      const esiste = esistenti.find(
        (e) =>
          e.id_adempimento === a.id &&
          e.mese === null &&
          e.trimestre === null &&
          e.semestre === null,
      );
      if (esiste) status.esistenti.push({ periodo: "Ann", id: esiste.id });
      else status.mancanti.push({ periodo: "Ann", mese: null });
    }
    risultato.push(status);
  });
  return risultato;
}

function getMeseNome(mese) {
  const mesi = [
    "Gen",
    "Feb",
    "Mar",
    "Apr",
    "Mag",
    "Giu",
    "Lug",
    "Ago",
    "Set",
    "Ott",
    "Nov",
    "Dic",
  ];
  return mesi[mese - 1] || "Mese";
}

function applicaAdempimentiAClienti(adempimenti_ids, clienti_ids, anno) {
  let totaleInseriti = 0,
    totaleSkipped = 0;
  for (const adpId of adempimenti_ids) {
    const adp = queryOne(
      `SELECT * FROM adempimenti WHERE id = ? AND attivo = 1`,
      [adpId],
    );
    if (!adp) continue;
    // Coerenza con scadenziario/stats: non applicare un adempimento vincolato
    // a un anno diverso da quello richiesto.
    if (
      adp.anno_validita !== null &&
      adp.anno_validita !== undefined &&
      String(adp.anno_validita) !== String(anno)
    ) {
      totaleSkipped += clienti_ids.length;
      continue;
    }
    for (const clienteId of clienti_ids) {
      const risultato = inserisciAdempimentoSeAssenteConDettagli(
        clienteId,
        adp,
        anno,
      );
      totaleInseriti += risultato.inseriti;
      totaleSkipped += risultato.mantenuti;
    }
  }
  return {
    inseriti: totaleInseriti,
    skipped: totaleSkipped,
    clienti: clienti_ids.length,
    adempimenti: adempimenti_ids.length,
  };
}

function eliminaAdempimentiDaClienti(adempimenti_ids, clienti_ids, anno) {
  let eliminati = 0,
    nonTrovati = 0;
  for (const adpId of adempimenti_ids) {
    for (const clienteId of clienti_ids) {
      const esistenti = queryAll(
        `SELECT ac.*, a.nome as adempimento_nome, a.codice as adempimento_codice,
                c.nome as cliente_nome
         FROM adempimenti_cliente ac
         JOIN adempimenti a ON ac.id_adempimento = a.id
         JOIN clienti c ON ac.id_cliente = c.id
         WHERE ac.id_adempimento = ? AND ac.id_cliente = ? AND ac.anno = ?`,
        [adpId, clienteId, anno],
      );
      if (esistenti.length === 0) {
        nonTrovati++;
        continue;
      }
      esistenti.forEach((r) =>
        spostaInCestino({
          tabella: "adempimenti_cliente",
          record_id: r.id,
          dati_json: r,
        }),
      );
      runQuery(
        `DELETE FROM adempimenti_cliente WHERE id_adempimento = ? AND id_cliente = ? AND anno = ?`,
        [adpId, clienteId, anno],
      );
      eliminati += esistenti.length;
    }
  }
  return { eliminati, nonTrovati };
}

function eliminaAdempimentiClienteBulk(ids_righe) {
  let eliminati = 0;
  for (const id of ids_righe) {
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
      runQuery(`DELETE FROM adempimenti_cliente WHERE id = ?`, [id]);
      eliminati++;
    }
  }
  return { eliminati };
}

module.exports = {
  getAdempimenti,
  getAdempimentiCliente,
  createAdempimento,
  updateAdempimento,
  deleteAdempimento,
  generaAdempimentoPerTutti,
  inserisciAdempimentoSeAssente,
  inserisciAdempimentoSeAssenteConDettagli,
  canDeleteAdempimento,
  createAdempimentoPersonalizzato,
  checkAdempimentiClienteEsistenti,
  applicaAdempimentiAClienti,
  eliminaAdempimentiDaClienti,
  eliminaAdempimentiClienteBulk,
};
