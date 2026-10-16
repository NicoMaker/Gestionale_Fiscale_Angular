const { queryAll } = require("../config/database");

/**
 * Restituisce tutte le tipologie cliente con le relative sottotipologie
 * annidate nella proprietà `sottotipologie`.
 */
function getTipologieConSotto() {
  const tip = queryAll(`SELECT * FROM tipologie_cliente ORDER BY id`);
  const sub = queryAll(
    `SELECT * FROM sottotipologie ORDER BY id_tipologia, ordine, id`,
  );
  tip.forEach((t) => {
    t.sottotipologie = sub.filter((s) => s.id_tipologia === t.id);
  });
  return tip;
}

module.exports = { getTipologieConSotto };
