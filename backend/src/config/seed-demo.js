// ═══════════════════════════════════════════════════════════════════════════
//  seed-demo.js — MOTORE che genera il database demo `gestionale.db`
//  Posizione: backend/src/config/  (accanto a seed.js e demo-data.js)
// ───────────────────────────────────────────────────────────────────────────
//  Legge i dati da `demo-data.js` e li scrive nel database, rispettando lo
//  schema ufficiale del gestionale. Di norma NON serve modificare questo file:
//  per cambiare i dati modifica `demo-data.js`.
//
//  Comandi (dalla cartella backend/):
//     npm run dati          → genera solo il database demo
//     npm run dati:dev       → genera il database e avvia in sviluppo (nodemon)
//     npm run dati:start     → genera il database e avvia in produzione (node)
//
//  ⚠️  Sovrascrive backend/db/gestionale.db (con backup automatico datato).
// ═══════════════════════════════════════════════════════════════════════════

const initSqlJs = require("sql.js");
const path = require("path");
const fs = require("fs");
const { createSchema, seedData } = require("./seed");
const D = require("./demo-data"); // ← tutti i dati inventati stanno qui

const DB_PATH = path.join(__dirname, "../../db", "gestionale.db");

const ANNO = D.ANNO;
const ANNO_PREC = ANNO - 1;
// Data di riferimento per decidere cosa è "già fatto" e cosa è "da fare".
const OGGI = new Date(`${ANNO}-07-27`);

// ───────────────────────────────────────────────────────────────────────────
//  UTILITY: Codice Fiscale e Partita IVA formalmente validi
// ───────────────────────────────────────────────────────────────────────────
function calcolaPartitaIva() {
  const d = [];
  for (let i = 0; i < 10; i++) d.push(Math.floor(Math.random() * 10));
  let somma = 0;
  for (let i = 0; i < 10; i++) {
    if (i % 2 === 0) somma += d[i];
    else {
      let x = d[i] * 2;
      if (x > 9) x -= 9;
      somma += x;
    }
  }
  return d.join("") + ((10 - (somma % 10)) % 10);
}

const CF_MESI = ["A", "B", "C", "D", "E", "H", "L", "M", "P", "R", "S", "T"];
const CF_PARI = {
  0: 0,
  1: 1,
  2: 2,
  3: 3,
  4: 4,
  5: 5,
  6: 6,
  7: 7,
  8: 8,
  9: 9,
  A: 0,
  B: 1,
  C: 2,
  D: 3,
  E: 4,
  F: 5,
  G: 6,
  H: 7,
  I: 8,
  J: 9,
  K: 10,
  L: 11,
  M: 12,
  N: 13,
  O: 14,
  P: 15,
  Q: 16,
  R: 17,
  S: 18,
  T: 19,
  U: 20,
  V: 21,
  W: 22,
  X: 23,
  Y: 24,
  Z: 25,
};
const CF_DISPARI = {
  0: 1,
  1: 0,
  2: 5,
  3: 7,
  4: 9,
  5: 13,
  6: 15,
  7: 17,
  8: 19,
  9: 21,
  A: 1,
  B: 0,
  C: 5,
  D: 7,
  E: 9,
  F: 13,
  G: 15,
  H: 17,
  I: 19,
  J: 21,
  K: 2,
  L: 4,
  M: 18,
  N: 20,
  O: 11,
  P: 3,
  Q: 6,
  R: 8,
  S: 12,
  T: 14,
  U: 16,
  V: 10,
  W: 22,
  X: 25,
  Y: 24,
  Z: 23,
};
const CF_RESTO = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const consonanti = (s) =>
  s
    .toUpperCase()
    .replace(/[^A-Z]/g, "")
    .split("")
    .filter((c) => !"AEIOU".includes(c));
const vocali = (s) =>
  s
    .toUpperCase()
    .replace(/[^A-Z]/g, "")
    .split("")
    .filter((c) => "AEIOU".includes(c));
function cfCognome(c) {
  return (consonanti(c).join("") + vocali(c).join("") + "XXX").substring(0, 3);
}
function cfNome(n) {
  const c = consonanti(n);
  if (c.length >= 4) return c[0] + c[2] + c[3];
  return (c.join("") + vocali(n).join("") + "XXX").substring(0, 3);
}
function calcolaCodiceFiscale(nomeCompleto, n) {
  const parole = nomeCompleto
    .replace(/[^A-Za-z ]/g, "")
    .trim()
    .split(/\s+/);
  const cognome = parole[0] || "XXX";
  const nome = parole[1] || parole[0] || "XXX";
  let cf =
    cfCognome(cognome) +
    cfNome(nome) +
    String(n.a).slice(-2) +
    CF_MESI[n.m - 1];
  cf += String(n.sesso === "F" ? n.g + 40 : n.g).padStart(2, "0") + n.comune;
  let somma = 0;
  for (let i = 0; i < 15; i++)
    somma += i % 2 === 0 ? CF_DISPARI[cf[i]] : CF_PARI[cf[i]];
  return cf + CF_RESTO[somma % 26];
}

// ───────────────────────────────────────────────────────────────────────────
//  UTILITY: date e stati per periodo
// ───────────────────────────────────────────────────────────────────────────
const pad = (n) => String(n).padStart(2, "0");
function dataScadMese(anno, mese) {
  const m = mese === 12 ? 1 : mese + 1;
  const a = mese === 12 ? anno + 1 : anno;
  return `${a}-${pad(m)}-16`;
}
function dataScadTrim(anno, t) {
  const f = { 1: 5, 2: 8, 3: 11, 4: 2 };
  return `${t === 4 ? anno + 1 : anno}-${pad(f[t])}-28`;
}
function dataScadSem(anno, s) {
  return s === 1 ? `${anno}-06-16` : `${anno}-12-16`;
}
const ANN_DUE = {
  REDDITI: "06-30",
  IRAP: "06-30",
  DICH_IVA: "04-30",
  CU: "03-16",
  BILANCIO: "05-31",
  CPB: "06-30",
};
function dataScadAnn(anno, cod) {
  return `${anno}-${ANN_DUE[cod] || "11-30"}`;
}

function statoPerData(scadenzaStr) {
  const d = new Date(scadenzaStr);
  if (d < OGGI) return Math.random() < 0.85 ? "completato" : "in_corso";
  return (d - OGGI) / 86400000 <= 35 ? "in_corso" : "da_fare";
}
function dataCompletamento(scadenzaStr) {
  const d = new Date(scadenzaStr);
  d.setDate(d.getDate() - (2 + Math.floor(Math.random() * 8)));
  return d.toISOString().split("T")[0];
}
function importiPer(tipo, stato) {
  if (stato !== "completato" && stato !== "in_corso") return {};
  if (tipo === "contabilita")
    return {
      importo_iva: Math.round((300 + Math.random() * 3500) * 100) / 100,
      importo_contabilita: [80, 100, 120, 150, 200][
        Math.floor(Math.random() * 5)
      ],
      cont_completata: stato === "completato" ? 1 : 0,
      iva_completata: stato === "completato" ? 1 : 0,
    };
  if (tipo === "rate") {
    const s = Math.round((800 + Math.random() * 6000) * 100) / 100;
    return {
      importo_saldo: s,
      importo_acconto1: Math.round(s * 0.4 * 100) / 100,
      importo_acconto2: Math.round(s * 0.6 * 100) / 100,
    };
  }
  if (tipo === "scadenza")
    return { importo: Math.round((100 + Math.random() * 2000) * 100) / 100 };
  return {};
}

// ═══════════════════════════════════════════════════════════════════════════
//  GENERAZIONE
// ═══════════════════════════════════════════════════════════════════════════
async function main() {
  console.log("\n🌱 Generazione database DEMO in corso...\n");
  const SQL = await initSqlJs();

  if (fs.existsSync(DB_PATH)) {
    const stamp = new Date()
      .toISOString()
      .replace(/[:.]/g, "-")
      .substring(0, 19);
    const bak = `${DB_PATH}.backup-${stamp}`;
    fs.copyFileSync(DB_PATH, bak);
    console.log(`💾 Backup del database esistente: ${path.basename(bak)}`);
  }

  const db = new SQL.Database();
  createSchema(db); // schema ufficiale del gestionale
  seedData(db); // tipologie + sottotipologie ufficiali

  const run = (sql, p = []) => db.run(sql, p);
  const lastId = () => {
    const st = db.prepare("SELECT last_insert_rowid() AS id");
    st.step();
    const id = st.getAsObject().id;
    st.free();
    return id;
  };
  const one = (sql, p = []) => {
    const st = db.prepare(sql);
    st.bind(p);
    const r = st.step() ? st.getAsObject() : null;
    st.free();
    return r;
  };

  // Mappa sottotipologie → dettagli (tipologia, colonne) dal file del frontend
  const percorsi =
    require("../../../frontend/public/json/tipologie-data.json").percorsi;

  // NOTA: il form reale dell'app salva col2_value/col3_value con valori
  // minuscoli normalizzati ("ditta", "ordinario", ...), non con l'etichetta
  // originale ("Ditta Individuale", "Ordinario"). Se il seed demo generasse
  // l'etichetta grezza, i clienti demo non verrebbero MAI trovati dal filtro
  // per tipologia (mismatch di formato) e sarebbero sempre esclusi non
  // appena si applicava un qualsiasi filtro parziale. Normalizziamo qui
  // allo stesso modo del form, per coerenza.
  const col2ToDb = (label) => {
    if (!label) return null;
    return label === "Ditta Individuale" ? "ditta" : label.toLowerCase();
  };
  const col3ToDb = (label) => (label ? label.toLowerCase() : null);

  const sottoMap = {};
  Object.entries(percorsi).forEach(([tipCod, arr]) => {
    arr.forEach((p) => {
      const tip = one(`SELECT id FROM tipologie_cliente WHERE codice = ?`, [
        tipCod,
      ]);
      const sot = one(`SELECT id FROM sottotipologie WHERE codice = ?`, [
        p.codice,
      ]);
      sottoMap[p.codice] = {
        id_tipologia: tip ? tip.id : null,
        id_sottotipologia: sot ? sot.id : null,
        col2: col2ToDb(p.col2Label),
        col3: col3ToDb(p.col3Label),
      };
    });
  });

  // ── 1) ADEMPIMENTI ──────────────────────────────────────────────────────
  const adpMap = {};
  D.ADEMPIMENTI.forEach((a) => {
    run(
      `INSERT INTO adempimenti (codice, nome, descrizione, scadenza_tipo, is_contabilita, has_rate, is_checkbox, is_text_only, rate_labels, anno_validita, attivo)
       VALUES (?,?,?,?,?,?,?,?,?,?,1)`,
      [
        a.codice,
        a.nome,
        a.descrizione || null,
        a.scadenza_tipo,
        a.tipo === "contabilita" ? 1 : 0,
        a.tipo === "rate" ? 1 : 0,
        a.tipo === "checkbox" ? 1 : 0,
        a.tipo === "testo" ? 1 : 0,
        a.rate_labels ? JSON.stringify(a.rate_labels) : null,
        a.anno_validita || null,
      ],
    );
    adpMap[a.codice] = {
      id: lastId(),
      tipo: a.tipo,
      scadenza_tipo: a.scadenza_tipo,
      anno_validita: a.anno_validita || null,
    };
  });
  console.log(`✅ Adempimenti (catalogo): ${D.ADEMPIMENTI.length}`);

  // ── 2) CLIENTI + CONFIG ANNUALE ─────────────────────────────────────────
  const cliMap = {};
  D.CLIENTI.forEach((c) => {
    const s = sottoMap[c.sotto];
    if (!s) throw new Error(`Sottotipologia sconosciuta: ${c.sotto}`);
    const cf = c.nascita ? calcolaCodiceFiscale(c.nome, c.nascita) : null;
    const piva = c.piva ? calcolaPartitaIva() : null;
    const attivo = c.attivo === undefined ? 1 : c.attivo;
    run(
      `INSERT INTO clienti (nome, codice_fiscale, partita_iva, email, telefono, indirizzo, citta, cap, provincia, pec, sdi, iban, note, referente, attivo, contabilita)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        c.nome,
        cf,
        piva,
        c.email || null,
        c.tel || null,
        c.indirizzo || `Via Roma ${1 + Math.floor(Math.random() * 120)}`,
        c.citta || null,
        c.cap || null,
        c.prov || null,
        c.pec || null,
        c.sdi || null,
        `IT60X054${Math.floor(1000000000 + Math.random() * 8999999999)}`.substring(
          0,
          27,
        ),
        c.note || null,
        c.ref || null,
        attivo,
        c.contabilita || 0,
      ],
    );
    const id = lastId();
    cliMap[c.key] = id;
    run(
      `INSERT INTO clienti_config_annuale (id_cliente, anno, id_tipologia, id_sottotipologia, col2_value, col3_value, periodicita)
       VALUES (?,?,?,?,?,?,?)`,
      [id, ANNO, s.id_tipologia, s.id_sottotipologia, s.col2, s.col3, c.per],
    );
  });
  console.log(
    `✅ Clienti: ${D.CLIENTI.length} + configurazioni annuali ${ANNO}`,
  );

  // ── 2b) CONFIG ANNO PRECEDENTE (storicità / cambio regime) ───────────────
  // Idraulica Blu era Semplificato nel ${ANNO_PREC}, ora Forfettario.
  {
    const sPrec = sottoMap["PF_DITTA_SEM"];
    run(
      `INSERT INTO clienti_config_annuale (id_cliente, anno, id_tipologia, id_sottotipologia, col2_value, col3_value, periodicita) VALUES (?,?,?,?,?,?,?)`,
      [
        cliMap["ditta_f"],
        ANNO_PREC,
        sPrec.id_tipologia,
        sPrec.id_sottotipologia,
        sPrec.col2,
        sPrec.col3,
        "trimestrale",
      ],
    );
  }
  {
    const s = sottoMap["PF_PROF_FOR"];
    run(
      `INSERT INTO clienti_config_annuale (id_cliente, anno, id_tipologia, id_sottotipologia, col2_value, col3_value, periodicita) VALUES (?,?,?,?,?,?,?)`,
      [
        cliMap["prof_f"],
        ANNO_PREC,
        s.id_tipologia,
        s.id_sottotipologia,
        s.col2,
        s.col3,
        "annuale",
      ],
    );
  }
  console.log(`✅ Configurazioni ${ANNO_PREC} (storicità): 2`);

  // ── 3) ADEMPIMENTI_CLIENTE ──────────────────────────────────────────────
  let righeAdp = 0;
  function periodiDi(a, anno, cod) {
    if (a.tipo === "testo") return [{ key: "ann", scad: null }];
    if (a.scadenza_tipo === "mensile")
      return Array.from({ length: 12 }, (_, i) => ({
        key: `M${i + 1}`,
        mese: i + 1,
        scad: dataScadMese(anno, i + 1),
      }));
    if (a.scadenza_tipo === "trimestrale")
      return Array.from({ length: 4 }, (_, i) => ({
        key: `T${i + 1}`,
        trimestre: i + 1,
        scad: dataScadTrim(anno, i + 1),
      }));
    if (a.scadenza_tipo === "semestrale")
      return Array.from({ length: 2 }, (_, i) => ({
        key: `S${i + 1}`,
        semestre: i + 1,
        scad: dataScadSem(anno, i + 1),
      }));
    return [{ key: "ann", scad: dataScadAnn(anno, cod) }];
  }
  function inserisciRiga(
    id_cliente,
    a,
    anno,
    p,
    stato,
    note,
    importi,
    dataCompl,
  ) {
    run(
      `INSERT INTO adempimenti_cliente
        (id_cliente, id_adempimento, anno, mese, trimestre, semestre, stato, data_scadenza, data_completamento, note,
         importo, importo_saldo, importo_acconto1, importo_acconto2, importo_iva, importo_contabilita, cont_completata, iva_completata)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        id_cliente,
        a.id,
        anno,
        p.mese || null,
        p.trimestre || null,
        p.semestre || null,
        stato,
        p.scad || null,
        dataCompl,
        note,
        importi.importo || null,
        importi.importo_saldo || null,
        importi.importo_acconto1 || null,
        importi.importo_acconto2 || null,
        importi.importo_iva || null,
        importi.importo_contabilita || null,
        importi.cont_completata || 0,
        importi.iva_completata || 0,
      ],
    );
    righeAdp++;
  }
  function assegna(cliKey, anno, forzaCompletato = false) {
    const id_cliente = cliMap[cliKey];
    (D.ASSEGNAZIONI[cliKey] || []).forEach((cod) => {
      const a = adpMap[cod];
      if (!a) return;
      if (a.anno_validita && a.anno_validita !== anno) return; // rispetta anno di validità
      periodiDi(a, anno, cod).forEach((p) => {
        if (a.tipo === "testo") {
          return inserisciRiga(
            id_cliente,
            a,
            anno,
            p,
            "text_only",
            D.TESTO_ADEMPIMENTO[cliKey] || "",
            {},
            null,
          );
        }
        let stato;
        const ov = D.OVERRIDE_STATO[`${cliKey}|${cod}|${p.key}`];
        if (ov) stato = ov;
        else if (forzaCompletato) stato = "completato";
        else if (a.tipo === "checkbox") {
          const b = statoPerData(p.scad);
          stato = b === "in_corso" ? "da_fare" : b;
        } else stato = statoPerData(p.scad);
        const importi = importiPer(a.tipo, stato);
        const dataCompl =
          stato === "completato" && p.scad ? dataCompletamento(p.scad) : null;
        inserisciRiga(id_cliente, a, anno, p, stato, null, importi, dataCompl);
      });
    });
  }
  Object.keys(D.ASSEGNAZIONI).forEach((k) => assegna(k, ANNO));
  (D.STORICO || []).forEach((k) => assegna(k, ANNO_PREC, true));
  console.log(`✅ Righe scadenzario (adempimenti_cliente): ${righeAdp}`);

  // ── 4) APPUNTI (Scadenze Studio) ─────────────────────────────────────────
  D.APPUNTI.forEach((ap) => {
    run(
      `INSERT INTO appunti (titolo, contenuto, id_cliente, data_inserimento, data_scadenza, priorita, completato) VALUES (?,?,?,?,?,?,?)`,
      [
        ap.titolo,
        ap.contenuto || null,
        ap.cliente ? cliMap[ap.cliente] : null,
        `${ANNO}-07-01 09:00:00`,
        ap.scadenza || null,
        ap.priorita,
        ap.completato || 0,
      ],
    );
  });
  console.log(`✅ Scadenze Studio (appunti): ${D.APPUNTI.length}`);

  // ── 5) NOTE (pagina_bianca) ──────────────────────────────────────────────
  D.NOTE.forEach((n) => {
    run(
      `INSERT INTO pagina_bianca (tipo, titolo, contenuto, allegati, id_cliente, data_creazione, data_modifica) VALUES (?,?,?,?,?,?,?)`,
      [
        n.tipo,
        n.titolo,
        n.contenuto || null,
        n.allegati || null,
        n.cliente ? cliMap[n.cliente] : null,
        `${ANNO}-06-15 10:00:00`,
        `${ANNO}-06-15 10:00:00`,
      ],
    );
  });
  console.log(`✅ Note (pagina_bianca): ${D.NOTE.length}`);

  // ── 6) CESTINO ────────────────────────────────────────────────────────────
  const oraCestino = (giorniFa) => {
    const d = new Date(OGGI);
    d.setDate(d.getDate() - giorniFa);
    return d.toISOString().replace("T", " ").substring(0, 19);
  };
  let cestinoTot = 0;
  // Cliente eliminato (attivo=0) → anche nel cestino
  const clienteDel = D.CLIENTI.find((c) => c.attivo === 0);
  if (clienteDel) {
    const row = one(`SELECT * FROM clienti WHERE id = ?`, [
      cliMap[clienteDel.key],
    ]);
    run(
      `INSERT INTO cestino (tabella, record_id, dati_json, eliminato_da, data_eliminazione) VALUES (?,?,?,?,?)`,
      [
        "clienti",
        cliMap[clienteDel.key],
        JSON.stringify(row),
        "utente",
        oraCestino(3),
      ],
    );
    cestinoTot++;
  }
  (D.CESTINO || []).forEach((e) => {
    const dati = { ...e.dati };
    // Risolvi eventuali riferimenti a cliente/adempimento in id reali
    if (e.cliente && cliMap[e.cliente]) dati.id_cliente = cliMap[e.cliente];
    if (e.adempimento && adpMap[e.adempimento])
      dati.id_adempimento = adpMap[e.adempimento].id;
    run(
      `INSERT INTO cestino (tabella, record_id, dati_json, eliminato_da, data_eliminazione) VALUES (?,?,?,?,?)`,
      [
        e.tabella,
        e.record_id,
        JSON.stringify(dati),
        "utente",
        oraCestino(e.giorni_fa || 5),
      ],
    );
    cestinoTot++;
  });
  console.log(`✅ Cestino: ${cestinoTot} elementi`);

  // ── SALVATAGGIO ────────────────────────────────────────────────────────────
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  fs.writeFileSync(DB_PATH, Buffer.from(db.export()));
  console.log(`\n🎉 Database demo creato: ${DB_PATH}`);
  console.log(`   Anno demo: ${ANNO} (con storico ${ANNO_PREC}).`);
  console.log(`   Avvia con:  npm start   →  http://localhost:3000\n`);
}

main().catch((e) => {
  console.error("\n❌ Errore durante la generazione del seed:", e);
  process.exit(1);
});
