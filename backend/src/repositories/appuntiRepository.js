const {
  runQuery,
  runQueryAndGetId,
  queryAll,
  queryOne,
} = require("../config/database");
const { spostaInCestino } = require("./cestinoRepository");

function getAppunti(filtri = {}) {
  let sql = `
    SELECT a.*, c.nome as cliente_nome
    FROM appunti a
    LEFT JOIN clienti c ON a.id_cliente = c.id
    WHERE 1=1
  `;
  const params = [];

  if (filtri.search) {
    sql += ` AND (a.titolo LIKE ? OR a.contenuto LIKE ?)`;
    params.push(`%${filtri.search}%`, `%${filtri.search}%`);
  }
  // id_cliente può essere un singolo id oppure un array di id (multi‑select)
  const idClienti = (
    Array.isArray(filtri.id_cliente) ? filtri.id_cliente : [filtri.id_cliente]
  )
    .filter((v) => v !== undefined && v !== null && v !== "")
    .map((v) => parseInt(v))
    .filter((v) => !isNaN(v));
  if (idClienti.length > 0) {
    sql += ` AND a.id_cliente IN (${idClienti.map(() => "?").join(",")})`;
    params.push(...idClienti);
  }
  if (filtri.completato !== undefined && filtri.completato !== "") {
    sql += ` AND a.completato = ?`;
    params.push(filtri.completato === "1" ? 1 : 0);
  }
  if (filtri.priorita && filtri.priorita !== "tutte") {
    sql += ` AND a.priorita = ?`;
    params.push(filtri.priorita);
  }

  sql += ` ORDER BY a.data_scadenza IS NULL, a.data_scadenza ASC, a.data_inserimento DESC`;
  return queryAll(sql, params);
}

function getAppunto(id) {
  return queryOne(
    `
    SELECT a.*, c.nome as cliente_nome
    FROM appunti a
    LEFT JOIN clienti c ON a.id_cliente = c.id
    WHERE a.id = ?
  `,
    [id],
  );
}

function createAppunto(data) {
  return runQueryAndGetId(
    `
    INSERT INTO appunti (titolo, contenuto, id_cliente, data_scadenza, priorita, completato)
    VALUES (?,?,?,?,?,?)
  `,
    [
      data.titolo,
      data.contenuto || null,
      data.id_cliente || null,
      data.data_scadenza || null,
      data.priorita || "media",
      data.completato ? 1 : 0,
    ],
  );
}

function updateAppunto(data) {
  runQuery(
    `
    UPDATE appunti SET
      titolo = ?, contenuto = ?, id_cliente = ?, data_scadenza = ?,
      priorita = ?, completato = ?
    WHERE id = ?
  `,
    [
      data.titolo,
      data.contenuto || null,
      data.id_cliente || null,
      data.data_scadenza || null,
      data.priorita || "media",
      data.completato ? 1 : 0,
      data.id,
    ],
  );
}

function deleteAppunto(id) {
  const appunto = queryOne(`SELECT * FROM appunti WHERE id = ?`, [id]);
  if (appunto) {
    spostaInCestino({ tabella: "appunti", record_id: id, dati_json: appunto });
  }
  runQuery(`DELETE FROM appunti WHERE id = ?`, [id]);
}

function toggleAppuntoCompletato(id, completato) {
  runQuery(`UPDATE appunti SET completato = ? WHERE id = ?`, [
    completato ? 1 : 0,
    id,
  ]);
}

function copiaAppuntiDaAnno(anno_da, anno_a, id_cliente = null) {
  let sql = `
    SELECT * FROM appunti
    WHERE strftime('%Y', data_scadenza) = ?
  `;
  const params = [String(anno_da)];

  if (id_cliente) {
    sql += ` AND id_cliente = ?`;
    params.push(id_cliente);
  }

  const appunti = queryAll(sql, params);
  let copiati = 0;

  appunti.forEach((ap) => {
    let nuovaScadenza = null;
    if (ap.data_scadenza) {
      const date = new Date(ap.data_scadenza);
      date.setFullYear(anno_a);
      nuovaScadenza = date.toISOString().split("T")[0];
    }

    runQuery(
      `
      INSERT INTO appunti (titolo, contenuto, id_cliente, data_scadenza, priorita, completato)
      VALUES (?,?,?,?,?,?)
    `,
      [ap.titolo, ap.contenuto, ap.id_cliente, nuovaScadenza, ap.priorita, 0],
    );
    copiati++;
  });

  return copiati;
}

module.exports = {
  getAppunti,
  getAppunto,
  createAppunto,
  updateAppunto,
  deleteAppunto,
  toggleAppuntoCompletato,
  copiaAppuntiDaAnno,
};
