const { queryAll, queryOne } = require("../config/database");

function getStats(anno) {
  const totClienti = queryOne(
    `SELECT COUNT(*) as c FROM clienti WHERE attivo=1`,
  ).c;

  // ⭐ Filtra adempimenti: includi solo quelli senza anno_validita o con anno_validita == anno
  const adpStats = queryAll(
    `
    SELECT
      a.codice,
      a.nome,
      COUNT(ac.id) as totale,
      SUM(CASE WHEN ac.stato='completato' THEN 1 ELSE 0 END) as completati,
      SUM(CASE WHEN ac.stato='da_fare' THEN 1 ELSE 0 END) as da_fare,
      SUM(CASE WHEN ac.stato='n_a' THEN 1 ELSE 0 END) as na
    FROM adempimenti a
    LEFT JOIN adempimenti_cliente ac ON a.id=ac.id_adempimento AND ac.anno=?
    WHERE a.attivo=1
      AND (a.anno_validita IS NULL OR a.anno_validita = ?)
    GROUP BY a.id
    ORDER BY a.nome
  `,
    [anno, anno],
  );

  const totali = queryOne(
    `
    SELECT
      COUNT(*) as totale,
      SUM(CASE WHEN ac.stato='completato' THEN 1 ELSE 0 END) as completati,
      SUM(CASE WHEN ac.stato='da_fare' THEN 1 ELSE 0 END) as da_fare,
      SUM(CASE WHEN ac.stato='in_corso' THEN 1 ELSE 0 END) as in_corso,
      SUM(CASE WHEN ac.stato='n_a' THEN 1 ELSE 0 END) as na
    FROM adempimenti_cliente ac
    JOIN adempimenti a ON a.id = ac.id_adempimento
    WHERE ac.anno=?
      AND (a.anno_validita IS NULL OR a.anno_validita = ?)
  `,
    [anno, anno],
  );

  return {
    anno,
    totClienti,
    adempimentiStats: adpStats,
    totale: totali?.totale || 0,
    completati: totali?.completati || 0,
    da_fare: totali?.da_fare || 0,
    in_corso: totali?.in_corso || 0,
    na: totali?.na || 0,
  };
}

module.exports = { getStats };
