// ═══════════════════════════════════════════════════════════════
// seedData.js — Schema iniziale e dati di seed
// ═══════════════════════════════════════════════════════════════

function createSchema(db) {
  // ── CLIENTI ──
  db.run(`CREATE TABLE IF NOT EXISTS clienti (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    codice_fiscale TEXT,
    partita_iva TEXT,
    email TEXT,
    telefono TEXT,
    indirizzo TEXT,
    citta TEXT,
    cap TEXT,
    provincia TEXT,
    pec TEXT,
    sdi TEXT,
    iban TEXT,
    note TEXT,
    referente TEXT,
    attivo INTEGER DEFAULT 1,
    contabilita INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  )`);

  // ── TIPOLOGIE CLIENTE ──
  db.run(`CREATE TABLE IF NOT EXISTS tipologie_cliente (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    codice TEXT NOT NULL UNIQUE,
    nome TEXT NOT NULL,
    descrizione TEXT,
    colore TEXT DEFAULT '#5b8df6'
  )`);

  // ── SOTTOTIPOLOGIE ──
  db.run(`CREATE TABLE IF NOT EXISTS sottotipologie (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    id_tipologia INTEGER NOT NULL,
    codice TEXT NOT NULL,
    nome TEXT NOT NULL,
    is_separator INTEGER DEFAULT 0,
    ordine INTEGER DEFAULT 0,
    FOREIGN KEY (id_tipologia) REFERENCES tipologie_cliente(id)
  )`);

  // ── CLIENTI CONFIG ANNUALE ──
  db.run(`CREATE TABLE IF NOT EXISTS clienti_config_annuale (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    id_cliente INTEGER NOT NULL,
    anno INTEGER NOT NULL,
    id_tipologia INTEGER,
    id_sottotipologia INTEGER,
    col2_value TEXT,
    col3_value TEXT,
    periodicita TEXT,
    UNIQUE(id_cliente, anno),
    FOREIGN KEY (id_cliente) REFERENCES clienti(id),
    FOREIGN KEY (id_tipologia) REFERENCES tipologie_cliente(id),
    FOREIGN KEY (id_sottotipologia) REFERENCES sottotipologie(id)
  )`);

  // ── ADEMPIMENTI ──
  db.run(`CREATE TABLE IF NOT EXISTS adempimenti (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    codice TEXT NOT NULL,
    nome TEXT NOT NULL,
    descrizione TEXT,
    scadenza_tipo TEXT CHECK(scadenza_tipo IN ('annuale','semestrale','trimestrale','mensile')),
    is_contabilita INTEGER DEFAULT 0,
    has_rate INTEGER DEFAULT 0,
    is_checkbox INTEGER DEFAULT 0,
    is_text_only INTEGER DEFAULT 0,
    rate_labels TEXT,
    anno_validita INTEGER DEFAULT NULL,
    attivo INTEGER DEFAULT 1
  )`);

  db.run(
    `CREATE UNIQUE INDEX IF NOT EXISTS idx_adempimenti_codice_attivo ON adempimenti(codice) WHERE attivo = 1`,
  );

  // ── ADEMPIMENTI CLIENTE ──
  db.run(`CREATE TABLE IF NOT EXISTS adempimenti_cliente (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    id_cliente INTEGER NOT NULL,
    id_adempimento INTEGER NOT NULL,
    anno INTEGER NOT NULL,
    mese INTEGER,
    trimestre INTEGER,
    semestre INTEGER,
    stato TEXT CHECK(stato IN ('da_fare','in_corso','completato','n_a','text_only')) DEFAULT 'da_fare',
    data_scadenza TEXT,
    data_completamento TEXT,
    note TEXT,
    importo REAL,
    importo_saldo REAL,
    importo_acconto1 REAL,
    importo_acconto2 REAL,
    importo_iva REAL,
    importo_contabilita REAL,
    cont_completata INTEGER DEFAULT 0,
    iva_completata INTEGER DEFAULT 0,
    FOREIGN KEY (id_cliente) REFERENCES clienti(id),
    FOREIGN KEY (id_adempimento) REFERENCES adempimenti(id)
  )`);

  db.run(
    `CREATE INDEX IF NOT EXISTS idx_adempimenti_cliente_cliente ON adempimenti_cliente(id_cliente)`,
  );
  db.run(
    `CREATE INDEX IF NOT EXISTS idx_adempimenti_cliente_anno ON adempimenti_cliente(anno)`,
  );

  // ── APPUNTI ──
  db.run(`CREATE TABLE IF NOT EXISTS appunti (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    titolo TEXT NOT NULL,
    contenuto TEXT,
    id_cliente INTEGER,
    data_inserimento TEXT DEFAULT (datetime('now')),
    data_scadenza TEXT,
    priorita TEXT CHECK(priorita IN ('bassa','media','alta')) DEFAULT 'media',
    completato INTEGER DEFAULT 0,
    FOREIGN KEY (id_cliente) REFERENCES clienti(id)
  )`);

  // ── PAGINA BIANCA ──
  db.run(`CREATE TABLE IF NOT EXISTS pagina_bianca (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tipo TEXT NOT NULL CHECK(tipo IN ('studio', 'cliente')),
    titolo TEXT NOT NULL,
    contenuto TEXT,
    allegati TEXT,
    id_cliente INTEGER,
    data_creazione TEXT DEFAULT (datetime('now')),
    data_modifica TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (id_cliente) REFERENCES clienti(id)
  )`);

  db.run(`CREATE TRIGGER IF NOT EXISTS update_pagina_bianca_modifica 
  AFTER UPDATE ON pagina_bianca
  BEGIN
    UPDATE pagina_bianca SET data_modifica = datetime('now') WHERE id = NEW.id;
  END`);

  // ── CESTINO ──
  db.run(`CREATE TABLE IF NOT EXISTS cestino (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tabella TEXT NOT NULL,
    record_id INTEGER,
    dati_json TEXT NOT NULL,
    eliminato_da TEXT DEFAULT 'utente',
    data_eliminazione TEXT DEFAULT (datetime('now'))
  )`);

  db.run(`CREATE INDEX IF NOT EXISTS idx_cestino_tabella ON cestino(tabella)`);
  db.run(
    `CREATE INDEX IF NOT EXISTS idx_cestino_data ON cestino(data_eliminazione DESC)`,
  );
}

function seedData(db) {
  // ── TIPOLOGIE ──
  const tipologie = [
    { codice: "PF", nome: "Persona Fisica", colore: "#5b8df6" },
    { codice: "SP", nome: "Società di Persone", colore: "#a78bfa" },
    { codice: "SC", nome: "Società di Capitali", colore: "#34d399" },
    { codice: "ASS", nome: "Associazione", colore: "#fbbf24" },
  ];

  tipologie.forEach((t) => {
    db.run(
      `INSERT OR IGNORE INTO tipologie_cliente (codice, nome, colore) VALUES (?,?,?)`,
      [t.codice, t.nome, t.colore],
    );
  });

  // Recupera gli ID inseriti
  const stmt = db.prepare(`SELECT id, codice FROM tipologie_cliente`);
  const tipMap = {};
  while (stmt.step()) {
    const row = stmt.getAsObject();
    tipMap[row.codice] = row.id;
  }
  stmt.free();

  // ── SOTTOTIPOLOGIE PF ──
  const sottoPF = [
    { codice: "PF_PRIV", nome: "Privato", is_sep: 0, ordine: 1 },
    { codice: "PF_SOCIO", nome: "Socio", is_sep: 0, ordine: 2 },
    {
      codice: "PF_DITTA_ORD",
      nome: "Ditta Individuale Ordinario",
      is_sep: 0,
      ordine: 3,
    },
    {
      codice: "PF_DITTA_SEM",
      nome: "Ditta Individuale Semplificato",
      is_sep: 0,
      ordine: 4,
    },
    {
      codice: "PF_DITTA_FOR",
      nome: "Ditta Individuale Forfettario",
      is_sep: 0,
      ordine: 5,
    },
    {
      codice: "PF_PROF_ORD",
      nome: "Professionista Ordinario",
      is_sep: 0,
      ordine: 6,
    },
    {
      codice: "PF_PROF_SEM",
      nome: "Professionista Semplificato",
      is_sep: 0,
      ordine: 7,
    },
    {
      codice: "PF_PROF_FOR",
      nome: "Professionista Forfettario",
      is_sep: 0,
      ordine: 8,
    },
  ];

  const sottoSP = [
    { codice: "SP_ORD", nome: "Ordinaria", is_sep: 0, ordine: 1 },
    { codice: "SP_SEMP", nome: "Semplificata", is_sep: 0, ordine: 2 },
  ];

  const sottoSC = [
    { codice: "SC_ORD", nome: "Ordinaria", is_sep: 0, ordine: 1 },
  ];

  const sottoASS = [
    { codice: "ASS_ORD", nome: "Ordinaria", is_sep: 0, ordine: 1 },
    { codice: "ASS_SEMP", nome: "Semplificata", is_sep: 0, ordine: 2 },
  ];

  const allSotto = [
    ...sottoPF.map((s) => ({ ...s, tip: "PF" })),
    ...sottoSP.map((s) => ({ ...s, tip: "SP" })),
    ...sottoSC.map((s) => ({ ...s, tip: "SC" })),
    ...sottoASS.map((s) => ({ ...s, tip: "ASS" })),
  ];

  allSotto.forEach((s) => {
    const tipId = tipMap[s.tip];
    if (!tipId) return;
    db.run(
      `INSERT OR IGNORE INTO sottotipologie (id_tipologia, codice, nome, is_separator, ordine) VALUES (?,?,?,?,?)`,
      [tipId, s.codice, s.nome, s.is_sep, s.ordine],
    );
  });
}

module.exports = { createSchema, seedData };
