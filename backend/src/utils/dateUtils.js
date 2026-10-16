// ═══════════════════════════════════════════════════════════════
// DATE-UTILS.JS — Utilità per formattazione date in italiano (Backend)
// ═══════════════════════════════════════════════════════════════

/**
 * Formatta una data in formato italiano (GG/MM/AAAA)
 * @param {string|Date} data - La data da formattare (stringa ISO, YYYY-MM-DD o oggetto Date)
 * @returns {string} - La data formattata in italiano
 */
function formattaDataItaliana(data) {
  if (!data) return "";

  let dataObj;

  // Se è una stringa, prova a convertirla in oggetto Date
  if (typeof data === "string") {
    // Gestione formati comuni: YYYY-MM-DD, YYYY/MM/DD, DD/MM/YYYY
    if (data.includes("-")) {
      // Formato ISO: YYYY-MM-DD o YYYY-MM-DDTHH:mm:ss
      const parts = data.split("T")[0].split("-");
      if (parts.length === 3) {
        dataObj = new Date(parts[0], parts[1] - 1, parts[2]);
      }
    } else if (data.includes("/")) {
      // Formato europeo: DD/MM/YYYY
      const parts = data.split("/");
      if (parts.length === 3) {
        const giorno = parseInt(parts[0], 10);
        const mese = parseInt(parts[1], 10);
        const anno = parseInt(parts[2], 10);
        dataObj = new Date(anno, mese - 1, giorno);
      }
    } else {
      // Tentativo diretto
      dataObj = new Date(data);
    }
  } else if (data instanceof Date) {
    dataObj = data;
  } else {
    return "";
  }

  // Verifica che la data sia valida
  if (isNaN(dataObj.getTime())) {
    return "";
  }

  // Formatta in GG/MM/AAAA
  const giorno = String(dataObj.getDate()).padStart(2, "0");
  const mese = String(dataObj.getMonth() + 1).padStart(2, "0");
  const anno = dataObj.getFullYear();

  return `${giorno}/${mese}/${anno}`;
}

/**
 * Formatta una data con ora in formato italiano (GG/MM/AAAA HH:mm)
 * @param {string|Date} data - La data da formattare
 * @returns {string} - La data e ora formattate in italiano
 */
function formattaDataOraItaliana(data) {
  if (!data) return "";

  let dataObj;

  if (typeof data === "string") {
    dataObj = new Date(data);
  } else if (data instanceof Date) {
    dataObj = data;
  } else {
    return "";
  }

  if (isNaN(dataObj.getTime())) {
    return "";
  }

  const giorno = String(dataObj.getDate()).padStart(2, "0");
  const mese = String(dataObj.getMonth() + 1).padStart(2, "0");
  const anno = dataObj.getFullYear();
  const ore = String(dataObj.getHours()).padStart(2, "0");
  const minuti = String(dataObj.getMinutes()).padStart(2, "0");

  return `${giorno}/${mese}/${anno} ${ore}:${minuti}`;
}

/**
 * Converte una data dal formato italiano (DD/MM/YYYY) a ISO (YYYY-MM-DD)
 * @param {string} dataItaliana - La data in formato italiano
 * @returns {string} - La data in formato ISO
 */
function daItalianaAISO(dataItaliana) {
  if (!dataItaliana) return "";

  const parts = dataItaliana.split("/");
  if (parts.length !== 3) return "";

  const giorno = parts[0].padStart(2, "0");
  const mese = parts[1].padStart(2, "0");
  const anno = parts[2];

  return `${anno}-${mese}-${giorno}`;
}

/**
 * Ottiene la data odierna in formato italiano
 * @returns {string} - La data odierna formattata in italiano
 */
function oggiItaliano() {
  return formattaDataItaliana(new Date());
}

/**
 * Ottiene la data e ora odierne in formato italiano
 * @returns {string} - La data e ora odierne formattate in italiano
 */
function oraOggiItaliano() {
  return formattaDataOraItaliana(new Date());
}

/**
 * Formatta un timestamp Unix in formato italiano
 * @param {number} timestamp - Il timestamp Unix
 * @returns {string} - La data formattata in italiano
 */
function formattaTimestampItaliano(timestamp) {
  if (!timestamp) return "";
  return formattaDataItaliana(new Date(timestamp));
}

module.exports = {
  formattaDataItaliana,
  formattaDataOraItaliana,
  daItalianaAISO,
  oggiItaliano,
  oraOggiItaliano,
  formattaTimestampItaliano,
};
