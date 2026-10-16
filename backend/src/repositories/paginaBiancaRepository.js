const {
  runQuery,
  runQueryAndGetId,
  queryAll,
  queryOne,
} = require("../config/database");
const { spostaInCestino } = require("./cestinoRepository");

function getPaginaBianca(filtri = {}) {
  let sql = `
    SELECT pb.*, c.nome as cliente_nome
    FROM pagina_bianca pb
    LEFT JOIN clienti c ON pb.id_cliente = c.id
    WHERE 1=1
  `;
  const params = [];

  if (filtri.tipo) {
    sql += ` AND pb.tipo = ?`;
    params.push(filtri.tipo);
  }

  // id_cliente può essere un singolo id oppure un array di id (multi‑select)
  const idClienti = (
    Array.isArray(filtri.id_cliente) ? filtri.id_cliente : [filtri.id_cliente]
  )
    .filter((v) => v !== undefined && v !== null && v !== "")
    .map((v) => parseInt(v))
    .filter((v) => !isNaN(v));
  if (idClienti.length > 0) {
    sql += ` AND pb.id_cliente IN (${idClienti.map(() => "?").join(",")})`;
    params.push(...idClienti);
  }

  if (filtri.search && filtri.search.trim()) {
    const s = `%${filtri.search.trim()}%`;
    sql += ` AND (pb.titolo LIKE ? OR pb.contenuto LIKE ? OR pb.allegati LIKE ?)`;
    params.push(s, s, s);
  }

  sql += ` ORDER BY pb.data_creazione DESC`;
  return queryAll(sql, params);
}

function getPaginaBiancaSingolo(id) {
  return queryOne(
    `
    SELECT pb.*, c.nome as cliente_nome
    FROM pagina_bianca pb
    LEFT JOIN clienti c ON pb.id_cliente = c.id
    WHERE pb.id = ?
  `,
    [id],
  );
}

function createPaginaBianca(data) {
  return runQueryAndGetId(
    `
    INSERT INTO pagina_bianca (tipo, titolo, contenuto, allegati, id_cliente)
    VALUES (?,?,?,?,?)
  `,
    [
      data.tipo,
      data.titolo || "",
      data.contenuto || null,
      data.allegati || null,
      data.id_cliente || null,
    ],
  );
}

function updatePaginaBianca(data) {
  runQuery(
    `
    UPDATE pagina_bianca SET
      tipo = ?, titolo = ?, contenuto = ?, allegati = ?, id_cliente = ?
    WHERE id = ?
  `,
    [
      data.tipo,
      data.titolo || "",
      data.contenuto || null,
      data.allegati || null,
      data.id_cliente || null,
      data.id,
    ],
  );
}

function deletePaginaBianca(id) {
  const nota = queryOne(`SELECT * FROM pagina_bianca WHERE id = ?`, [id]);
  if (nota) {
    spostaInCestino({
      tabella: "pagina_bianca",
      record_id: id,
      dati_json: nota,
    });
  }
  runQuery(`DELETE FROM pagina_bianca WHERE id = ?`, [id]);
}

module.exports = {
  getPaginaBianca,
  getPaginaBiancaSingolo,
  createPaginaBianca,
  updatePaginaBianca,
  deletePaginaBianca,
};
