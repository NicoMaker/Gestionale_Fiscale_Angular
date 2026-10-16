// ═══════════════════════════════════════════════════════════════════════════
//  demo-data.js — I DATI DELLA DEMO (modifica QUI)
// ───────────────────────────────────────────────────────────────────────────
//  Questo file contiene SOLO i dati inventati del gestionale demo.
//  È il file da modificare per cambiare clienti, adempimenti, note, ecc.
//  La logica che li scrive nel database sta in `seed-demo.js` (non serve
//  toccarlo). Dopo ogni modifica rilancia:  npm run dati
// ═══════════════════════════════════════════════════════════════════════════

// Anno "corrente" della demo. Cambialo per spostare tutta la demo su un altro anno.
const ANNO = 2026;

// ═══════════════════════════════════════════════════════════════════════════
//  1) CATALOGO ADEMPIMENTI  (tabella: adempimenti)
// ───────────────────────────────────────────────────────────────────────────
//  tipo: 'scadenza' | 'contabilita' | 'rate' | 'checkbox' | 'testo'
//  scadenza_tipo: 'annuale' | 'semestrale' | 'trimestrale' | 'mensile'
//  anno_validita: null = valido ogni anno, oppure un anno specifico.
//  rate_labels: solo per tipo 'rate' — etichette delle 3 rate.
// ═══════════════════════════════════════════════════════════════════════════
const ADEMPIMENTI = [
  // ── Mensili ────────────────────────────────────────────────────────────
  {
    codice: "IVA_M",
    nome: "Liquidazione IVA Mensile",
    scadenza_tipo: "mensile",
    tipo: "contabilita",
    descrizione: "Liquidazione periodica IVA con versamento F24",
  },
  {
    codice: "F24_M",
    nome: "Versamento F24",
    scadenza_tipo: "mensile",
    tipo: "scadenza",
    descrizione: "Predisposizione e invio deleghe F24",
  },
  {
    codice: "CONTAB",
    nome: "Tenuta Contabilità",
    scadenza_tipo: "mensile",
    tipo: "contabilita",
    descrizione: "Registrazione fatture e prima nota",
  },
  {
    codice: "INTRA",
    nome: "Modello INTRASTAT",
    scadenza_tipo: "mensile",
    tipo: "checkbox",
    descrizione: "Elenchi riepilogativi operazioni intracomunitarie",
  },
  // ── Trimestrali ────────────────────────────────────────────────────────
  {
    codice: "IVA_T",
    nome: "Liquidazione IVA Trimestrale",
    scadenza_tipo: "trimestrale",
    tipo: "contabilita",
    descrizione: "Liquidazione IVA per contribuenti trimestrali",
  },
  {
    codice: "LIPE",
    nome: "Comunicazione LIPE",
    scadenza_tipo: "trimestrale",
    tipo: "scadenza",
    descrizione: "Liquidazioni Periodiche IVA",
  },
  {
    codice: "ESTERO",
    nome: "Esterometro",
    scadenza_tipo: "trimestrale",
    tipo: "checkbox",
    descrizione: "Comunicazione operazioni transfrontaliere",
  },
  // ── Semestrali ─────────────────────────────────────────────────────────
  {
    codice: "IMU",
    nome: "IMU (Acconto/Saldo)",
    scadenza_tipo: "semestrale",
    tipo: "scadenza",
    descrizione: "Acconto (giugno) e saldo (dicembre) IMU",
  },
  // ── Annuali ────────────────────────────────────────────────────────────
  {
    codice: "DICH_IVA",
    nome: "Dichiarazione IVA Annuale",
    scadenza_tipo: "annuale",
    tipo: "contabilita",
    descrizione: "Dichiarazione IVA annuale",
  },
  {
    codice: "REDDITI",
    nome: "Dichiarazione dei Redditi",
    scadenza_tipo: "annuale",
    tipo: "rate",
    descrizione: "Modello Redditi PF/SP/SC",
    rate_labels: ["Saldo", "1° Acconto", "2° Acconto"],
  },
  {
    codice: "IRAP",
    nome: "Dichiarazione IRAP",
    scadenza_tipo: "annuale",
    tipo: "rate",
    descrizione: "Imposta regionale attività produttive",
    rate_labels: ["Saldo", "1° Acconto", "2° Acconto"],
  },
  {
    codice: "CU",
    nome: "Certificazione Unica",
    scadenza_tipo: "annuale",
    tipo: "scadenza",
    descrizione: "Invio CU dipendenti/autonomi",
  },
  {
    codice: "BILANCIO",
    nome: "Deposito Bilancio",
    scadenza_tipo: "annuale",
    tipo: "checkbox",
    descrizione: "Deposito bilancio al Registro Imprese (società di capitali)",
  },
  {
    codice: "NOTE_CLI",
    nome: "Note Operative Cliente",
    scadenza_tipo: "annuale",
    tipo: "testo",
    descrizione: "Annotazioni libere sul cliente (campo testo)",
  },
  // ── Con anno di validità SPECIFICO (compare solo in quell'anno) ──────────
  {
    codice: "CPB",
    nome: "Concordato Preventivo Biennale",
    scadenza_tipo: "annuale",
    tipo: "rate",
    descrizione: "Adesione al CPB — valido solo per l'anno indicato",
    rate_labels: ["Saldo", "1° Acconto", "2° Acconto"],
    anno_validita: ANNO,
  },
];

// ═══════════════════════════════════════════════════════════════════════════
//  2) CLIENTI  (tabelle: clienti + clienti_config_annuale)
// ───────────────────────────────────────────────────────────────────────────
//  sotto  = codice sottotipologia (definisce tipologia, regime, colonne).
//  per    = periodicità IVA: 'mensile' | 'trimestrale' | 'annuale' | null.
//  piva   = true → genera una Partita IVA valida.
//  nascita = dati per generare il Codice Fiscale (persone fisiche).
//  attivo = 0 → il cliente finisce nel Cestino (eliminato).
// ═══════════════════════════════════════════════════════════════════════════
const CLIENTI = [
  {
    key: "priv",
    nome: "Bianchi Elena",
    sotto: "PF_PRIV",
    per: null,
    contabilita: 0,
    nascita: { g: 12, m: 4, a: 1985, sesso: "F", comune: "H501" },
    citta: "Roma",
    prov: "RM",
    cap: "00185",
    email: "elena.bianchi@example.it",
    tel: "06 4455667",
    ref: "",
  },
  {
    key: "socio",
    nome: "Rossi Marco",
    sotto: "PF_SOCIO",
    per: null,
    contabilita: 0,
    nascita: { g: 3, m: 9, a: 1978, sesso: "M", comune: "F205" },
    citta: "Milano",
    prov: "MI",
    cap: "20121",
    email: "marco.rossi@example.it",
    tel: "02 998877",
    ref: "",
  },
  {
    key: "ditta_o",
    nome: "Falegnameria Verdi",
    sotto: "PF_DITTA_ORD",
    per: "mensile",
    contabilita: 1,
    piva: true,
    nascita: { g: 22, m: 1, a: 1970, sesso: "M", comune: "A944" },
    citta: "Bologna",
    prov: "BO",
    cap: "40100",
    email: "info@falegnameriaverdi.it",
    tel: "051 223344",
    ref: "Verdi Luca",
  },
  {
    key: "ditta_s",
    nome: "Ferramenta Conti",
    sotto: "PF_DITTA_SEM",
    per: "trimestrale",
    contabilita: 1,
    piva: true,
    nascita: { g: 5, m: 11, a: 1982, sesso: "M", comune: "L219" },
    citta: "Torino",
    prov: "TO",
    cap: "10121",
    email: "conti@ferramenta.it",
    tel: "011 556677",
    ref: "",
  },
  {
    key: "ditta_f",
    nome: "Idraulica Blu di Neri",
    sotto: "PF_DITTA_FOR",
    per: "annuale",
    contabilita: 0,
    piva: true,
    nascita: { g: 18, m: 7, a: 1990, sesso: "M", comune: "D612" },
    citta: "Firenze",
    prov: "FI",
    cap: "50122",
    email: "neri@idraulicablu.it",
    tel: "055 112233",
    ref: "",
  },
  {
    key: "prof_o",
    nome: "Studio Legale Marino",
    sotto: "PF_PROF_ORD",
    per: "trimestrale",
    contabilita: 1,
    piva: true,
    nascita: { g: 9, m: 2, a: 1975, sesso: "F", comune: "F839" },
    citta: "Napoli",
    prov: "NA",
    cap: "80121",
    email: "avv.marino@example.it",
    tel: "081 445566",
    ref: "",
  },
  {
    key: "prof_s",
    nome: "Ing. Paolo Greco",
    sotto: "PF_PROF_SEM",
    per: "mensile",
    contabilita: 1,
    piva: true,
    nascita: { g: 27, m: 6, a: 1980, sesso: "M", comune: "G273" },
    citta: "Palermo",
    prov: "PA",
    cap: "90133",
    email: "paolo.greco@ing.it",
    tel: "091 334455",
    ref: "",
  },
  {
    key: "prof_f",
    nome: "Dott.ssa Sara Lombardi",
    sotto: "PF_PROF_FOR",
    per: "annuale",
    contabilita: 0,
    piva: true,
    nascita: { g: 14, m: 10, a: 1992, sesso: "F", comune: "L840" },
    citta: "Venezia",
    prov: "VE",
    cap: "30121",
    email: "sara.lombardi@example.it",
    tel: "041 667788",
    ref: "",
  },
  {
    key: "sp_ord",
    nome: "Costruzioni Sole SNC",
    sotto: "SP_ORD",
    per: "mensile",
    contabilita: 1,
    piva: true,
    citta: "Bari",
    prov: "BA",
    cap: "70121",
    email: "amministrazione@costruzionisole.it",
    tel: "080 223344",
    ref: "Sig. Esposito",
  },
  {
    key: "sp_sem",
    nome: "Trattoria Da Gino SAS",
    sotto: "SP_SEMP",
    per: "trimestrale",
    contabilita: 1,
    piva: true,
    citta: "Verona",
    prov: "VR",
    cap: "37121",
    email: "dagino@example.it",
    tel: "045 998811",
    ref: "",
  },
  {
    key: "sc_ord",
    nome: "TechNova SRL",
    sotto: "SC_ORD",
    per: "mensile",
    contabilita: 1,
    piva: true,
    citta: "Milano",
    prov: "MI",
    cap: "20124",
    email: "info@technova.it",
    tel: "02 776655",
    ref: "CFO Bianchi",
    sdi: "M5UXCR1",
    pec: "technova@pec.it",
  },
  {
    key: "ass_ord",
    nome: "ASD Polisportiva Aurora",
    sotto: "ASS_ORD",
    per: "trimestrale",
    contabilita: 1,
    piva: true,
    citta: "Genova",
    prov: "GE",
    cap: "16121",
    email: "aurora@asd.it",
    tel: "010 445599",
    ref: "Presidente Ferrari",
  },
  {
    key: "ass_sem",
    nome: "Associazione Culturale Lux",
    sotto: "ASS_SEMP",
    per: "trimestrale",
    contabilita: 0,
    piva: true,
    citta: "Cagliari",
    prov: "CA",
    cap: "09124",
    email: "info@lux.it",
    tel: "070 223311",
    ref: "",
  },
  // Cliente ESTERO (SDI convenzionale XXXXXXX) — mostra il caso operazioni estere
  {
    key: "estero",
    nome: "Weber Handels GmbH",
    sotto: "SC_ORD",
    per: "mensile",
    contabilita: 1,
    piva: true,
    citta: "Bolzano",
    prov: "BZ",
    cap: "39100",
    email: "info@weber-gmbh.de",
    tel: "0471 112200",
    ref: "Mr. Weber",
    sdi: "XXXXXXX",
    pec: "weber@pec.it",
  },
  // Cliente ELIMINATO (finisce nel Cestino, attivo=0). Nessun adempimento associato.
  {
    key: "deleted",
    nome: "Vecchio Cliente Cessato",
    sotto: "PF_DITTA_SEM",
    per: "trimestrale",
    contabilita: 0,
    piva: true,
    nascita: { g: 1, m: 1, a: 1960, sesso: "M", comune: "H501" },
    citta: "Roma",
    prov: "RM",
    cap: "00100",
    email: "cessato@example.it",
    tel: "",
    ref: "",
    attivo: 0,
  },
];

// ═══════════════════════════════════════════════════════════════════════════
//  3) ASSEGNAZIONI ADEMPIMENTI → CLIENTI  (tabella: adempimenti_cliente)
// ───────────────────────────────────────────────────────────────────────────
//  Per ogni cliente (chiave) elenca i CODICI adempimento da assegnare.
//  Gli stati (da fare / in corso / completato) sono generati automaticamente
//  in base al calendario. I casi N/A sono in OVERRIDE_STATO.
// ═══════════════════════════════════════════════════════════════════════════
const ASSEGNAZIONI = {
  priv: ["REDDITI", "IMU", "NOTE_CLI"],
  socio: ["REDDITI", "NOTE_CLI"],
  ditta_o: [
    "IVA_M",
    "F24_M",
    "CONTAB",
    "LIPE",
    "DICH_IVA",
    "REDDITI",
    "IRAP",
    "IMU",
    "NOTE_CLI",
    "CPB",
  ],
  ditta_s: [
    "IVA_T",
    "LIPE",
    "CONTAB",
    "DICH_IVA",
    "REDDITI",
    "IRAP",
    "IMU",
    "NOTE_CLI",
  ],
  ditta_f: ["REDDITI", "IMU", "NOTE_CLI"], // forfettario: niente IVA
  prof_o: [
    "IVA_T",
    "LIPE",
    "CONTAB",
    "DICH_IVA",
    "REDDITI",
    "IRAP",
    "CU",
    "NOTE_CLI",
    "CPB",
  ],
  prof_s: [
    "IVA_M",
    "F24_M",
    "CONTAB",
    "DICH_IVA",
    "REDDITI",
    "IRAP",
    "CU",
    "NOTE_CLI",
  ],
  prof_f: ["REDDITI", "NOTE_CLI"], // forfettario
  sp_ord: [
    "IVA_M",
    "F24_M",
    "CONTAB",
    "LIPE",
    "DICH_IVA",
    "REDDITI",
    "IRAP",
    "IMU",
    "CU",
    "NOTE_CLI",
  ],
  sp_sem: [
    "IVA_T",
    "LIPE",
    "CONTAB",
    "DICH_IVA",
    "REDDITI",
    "IRAP",
    "IMU",
    "NOTE_CLI",
  ],
  sc_ord: [
    "IVA_M",
    "F24_M",
    "CONTAB",
    "LIPE",
    "DICH_IVA",
    "REDDITI",
    "IRAP",
    "BILANCIO",
    "CU",
    "NOTE_CLI",
    "CPB",
  ],
  ass_ord: ["IVA_T", "LIPE", "CONTAB", "DICH_IVA", "IRAP", "CU", "NOTE_CLI"],
  ass_sem: ["REDDITI", "NOTE_CLI"],
  estero: [
    "IVA_M",
    "F24_M",
    "CONTAB",
    "INTRA",
    "ESTERO",
    "DICH_IVA",
    "REDDITI",
    "IRAP",
    "BILANCIO",
    "NOTE_CLI",
  ],
};

// Clienti a cui replicare gli adempimenti anche nell'anno precedente (tutto
// completato), per avere dati storici quando si cambia anno nella topbar.
const STORICO = ["ditta_o", "sc_ord"];

// Casi N/A espliciti: "chiaveCliente|codiceAdemp|periodo" → 'n_a'
//   periodo: 'ann' | 'S1'/'S2' | 'T1'..'T4' | 'M1'..'M12'
const OVERRIDE_STATO = {
  "sp_ord|IMU|S2": "n_a", // secondo semestre IMU non dovuto
  "ass_ord|CU|ann": "n_a", // associazione senza dipendenti
  "prof_s|IVA_M|M8": "n_a", // agosto non applicabile (esempio)
};

// Testo per gli adempimenti "Solo Testo" (NOTE_CLI) per alcuni clienti.
const TESTO_ADEMPIMENTO = {
  ditta_o:
    "Cliente puntuale nei pagamenti. Contabilità consegnata entro il 10 di ogni mese.",
  sc_ord:
    "Verificare compensi amministratori e ritenute. Bilancio in forma abbreviata.",
  prof_o:
    "Cassa Forense: verificare contributi soggettivi e integrativi a fine anno.",
};

// ═══════════════════════════════════════════════════════════════════════════
//  4) SCADENZE STUDIO  (tabella: appunti)
// ───────────────────────────────────────────────────────────────────────────
//  cliente: chiave cliente o null (promemoria interno di studio).
//  priorita: 'bassa' | 'media' | 'alta'.  scadenza: 'YYYY-MM-DD' o null.
// ═══════════════════════════════════════════════════════════════════════════
const APPUNTI = [
  {
    titolo: "Scadenza invio LIPE 3° trimestre",
    contenuto:
      "Preparare e inviare le comunicazioni LIPE per tutti i clienti trimestrali.",
    cliente: null,
    priorita: "alta",
    scadenza: `${ANNO}-11-30`,
    completato: 0,
  },
  {
    titolo: "Chiamare TechNova per fatture mancanti",
    contenuto: "Mancano le fatture di acquisto di giugno.",
    cliente: "sc_ord",
    priorita: "alta",
    scadenza: `${ANNO}-07-20`,
    completato: 0,
  }, // scaduto → in rosso
  {
    titolo: "Rinnovo firma digitale",
    contenuto: "Verificare scadenza smart card dello studio.",
    cliente: null,
    priorita: "media",
    scadenza: `${ANNO}-09-15`,
    completato: 0,
  },
  {
    titolo: "Appuntamento con Bianchi Elena",
    contenuto: "Consegna documenti 730.",
    cliente: "priv",
    priorita: "media",
    scadenza: `${ANNO}-08-05`,
    completato: 0,
  },
  {
    titolo: "Backup archivio 2025 completato",
    contenuto: "Copia su NAS e cloud effettuata.",
    cliente: null,
    priorita: "bassa",
    scadenza: `${ANNO}-06-30`,
    completato: 1,
  },
  {
    titolo: "Ordinare cancelleria",
    contenuto: "Toner e carta A4.",
    cliente: null,
    priorita: "bassa",
    scadenza: null,
    completato: 0,
  }, // senza data → in fondo
  {
    titolo: "Verifica CPB per clienti idonei",
    contenuto: "Valutare adesione al Concordato Preventivo Biennale.",
    cliente: "ditta_o",
    priorita: "alta",
    scadenza: `${ANNO}-10-31`,
    completato: 0,
  },
];

// ═══════════════════════════════════════════════════════════════════════════
//  5) NOTE  (tabella: pagina_bianca)
// ───────────────────────────────────────────────────────────────────────────
//  tipo: 'studio' (interna) | 'cliente' (associata a un cliente).
// ═══════════════════════════════════════════════════════════════════════════
const NOTE = [
  {
    tipo: "studio",
    titolo: "Checklist chiusura anno",
    contenuto:
      "1. Ratei e risconti\n2. Ammortamenti\n3. Rimanenze\n4. Compensi amministratori\n5. Verifica IVA da versare.",
    allegati: "Modello checklist: /modelli/chiusura.xlsx",
    cliente: null,
  },
  {
    tipo: "studio",
    titolo: "Scadenze fiscali principali",
    contenuto:
      "16 di ogni mese: IVA e ritenute. 30/11: 2° acconto imposte. 16/12: saldo IMU.",
    allegati: "",
    cliente: null,
  },
  {
    tipo: "cliente",
    titolo: "Istruzioni fatturazione TechNova",
    contenuto:
      "Emette fatture elettroniche tramite portale interno. SDI: M5UXCR1. Contatto tecnico: IT dept.",
    allegati: "https://portale.technova.it",
    cliente: "sc_ord",
  },
  {
    tipo: "cliente",
    titolo: "Regime forfettario — Idraulica Blu",
    contenuto:
      "Coefficiente redditività 67%. Limite ricavi 85.000 €. Monitorare superamento soglia.",
    allegati: "",
    cliente: "ditta_f",
  },
  {
    tipo: "cliente",
    titolo: "Verbale assemblea Polisportiva Aurora",
    contenuto: "Approvato rendiconto 2025. Confermato consiglio direttivo.",
    allegati: "verbale-2025.pdf",
    cliente: "ass_ord",
  },
];

// ═══════════════════════════════════════════════════════════════════════════
//  6) CESTINO  (tabella: cestino) — elementi eliminati ripristinabili (<15gg)
// ───────────────────────────────────────────────────────────────────────────
//  Copre TUTTI i tipi di elemento che possono finire nel Cestino (vedi manuale
//  cap. 10): Cliente, Adempimento, Riga Scadenzario, Scadenza Studio, Nota.
//  - Il CLIENTE eliminato è quello con attivo:0 (aggiunto in automatico dal seed).
//  - Gli altri 4 casi sono qui sotto.
//  giorni_fa = da quanti giorni è stato eliminato (deve restare < 15).
//  cliente / adempimento = chiavi (opzionali) risolte dal seed in id reali.
// ═══════════════════════════════════════════════════════════════════════════
const CESTINO = [
  // (1) ADEMPIMENTO eliminato dal catalogo
  {
    tabella: "adempimenti",
    record_id: 9001,
    giorni_fa: 5,
    dati: {
      id: 9001,
      codice: "OLD_TASSA",
      nome: "Vecchia Tassa Comunale (abrogata)",
      descrizione: "Adempimento non più previsto",
      scadenza_tipo: "annuale",
      attivo: 1,
    },
  },
  // (2) RIGA SCADENZARIO eliminata (referenzia un cliente e un adempimento reali)
  {
    tabella: "adempimenti_cliente",
    record_id: 9002,
    giorni_fa: 4,
    cliente: "ditta_o",
    adempimento: "REDDITI",
    dati: {
      id: 9002,
      anno: ANNO,
      stato: "da_fare",
      adempimento_nome: "Dichiarazione dei Redditi",
      cliente_nome: "Falegnameria Verdi",
      note: "Riga eliminata per errore",
    },
  },
  // (3) SCADENZA STUDIO eliminata
  {
    tabella: "appunti",
    record_id: 9003,
    giorni_fa: 6,
    dati: {
      id: 9003,
      titolo: "Vecchio promemoria archiviato",
      contenuto: "Riunione annullata",
      priorita: "bassa",
      completato: 0,
    },
  },
  // (4) NOTA eliminata
  {
    tabella: "pagina_bianca",
    record_id: 9004,
    giorni_fa: 10,
    dati: {
      id: 9004,
      tipo: "studio",
      titolo: "Bozza circolare 2025",
      contenuto: "Testo non più valido",
    },
  },
];

module.exports = {
  ANNO,
  ADEMPIMENTI,
  CLIENTI,
  ASSEGNAZIONI,
  STORICO,
  OVERRIDE_STATO,
  TESTO_ADEMPIMENTO,
  APPUNTI,
  NOTE,
  CESTINO,
};
