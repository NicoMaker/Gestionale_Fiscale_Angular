const initSqlJs = require("sql.js");
const path = require("path");
const fs = require("fs");
const { createSchema, seedData } = require("./seed");

const DB_PATH = path.join(__dirname, "../../db", "gestionale.db");
let db;

function saveDB() {
  const data = db.export();
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  fs.writeFileSync(DB_PATH, Buffer.from(data));
}

function runQuery(sql, params = []) {
  db.run(sql, params);
  saveDB();
  return db;
}

function runQueryAndGetId(sql, params = []) {
  db.run(sql, params);
  // FIX: leggere l'id PRIMA di saveDB(): db.export() di sql.js azzera
  // last_insert_rowid() e farebbe restituire sempre 0.
  const stmt = db.prepare("SELECT last_insert_rowid() as id");
  stmt.step();
  const result = stmt.getAsObject();
  stmt.free();
  saveDB();
  return result.id;
}

function queryAll(sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const rows = [];
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();
  return rows;
}

function queryOne(sql, params = []) {
  return queryAll(sql, params)[0] || null;
}

async function initDB() {
  const SQL = await initSqlJs();
  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(fileBuffer);
    console.log("✅ Database caricato da file");
    migrateDB();
  } else {
    db = new SQL.Database();
    console.log("🆕 Nuovo database creato");
    createSchema(db);
    seedData(db);
    saveDB();
  }
  return db;
}

function migrateDB() {
  const migrations = [
    `ALTER TABLE sottotipologie ADD COLUMN is_separator INTEGER DEFAULT 0`,
    `ALTER TABLE adempimenti ADD COLUMN is_contabilita INTEGER DEFAULT 0`,
    `ALTER TABLE adempimenti ADD COLUMN has_rate INTEGER DEFAULT 0`,
    `ALTER TABLE adempimenti ADD COLUMN rate_labels TEXT`,
    `ALTER TABLE adempimenti ADD COLUMN is_checkbox INTEGER DEFAULT 0`,
    `ALTER TABLE adempimenti ADD COLUMN is_text_only INTEGER DEFAULT 0`,
    `ALTER TABLE adempimenti ADD COLUMN anno_validita INTEGER DEFAULT NULL`,
    `ALTER TABLE adempimenti_cliente ADD COLUMN importo_saldo REAL`,
    `ALTER TABLE adempimenti_cliente ADD COLUMN importo_acconto1 REAL`,
    `ALTER TABLE adempimenti_cliente ADD COLUMN importo_acconto2 REAL`,
    `ALTER TABLE adempimenti_cliente ADD COLUMN importo_iva REAL`,
    `ALTER TABLE adempimenti_cliente ADD COLUMN importo_contabilita REAL`,
    `ALTER TABLE adempimenti_cliente ADD COLUMN cont_completata INTEGER DEFAULT 0`,
    `ALTER TABLE adempimenti_cliente ADD COLUMN iva_completata INTEGER DEFAULT 0`,
    `ALTER TABLE clienti ADD COLUMN periodicita TEXT`,
    `ALTER TABLE clienti ADD COLUMN col2_value TEXT`,
    `ALTER TABLE clienti ADD COLUMN col3_value TEXT`,

    // Tabella appunti
    `CREATE TABLE IF NOT EXISTS appunti (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      titolo TEXT NOT NULL,
      contenuto TEXT,
      id_cliente INTEGER,
      data_inserimento TEXT DEFAULT (datetime('now','localtime')),
      data_scadenza TEXT,
      priorita TEXT CHECK(priorita IN ('bassa','media','alta')) DEFAULT 'media',
      completato INTEGER DEFAULT 0,
      FOREIGN KEY (id_cliente) REFERENCES clienti(id)
    )`,
    `CREATE INDEX IF NOT EXISTS idx_appunti_cliente ON appunti(id_cliente)`,
    `CREATE INDEX IF NOT EXISTS idx_appunti_scadenza ON appunti(data_scadenza)`,
    `CREATE INDEX IF NOT EXISTS idx_appunti_completato ON appunti(completato)`,

    // Tabella pagina_bianca
    `CREATE TABLE IF NOT EXISTS pagina_bianca (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tipo TEXT NOT NULL CHECK(tipo IN ('studio', 'cliente')),
      titolo TEXT NOT NULL,
      contenuto TEXT,
      allegati TEXT,
      id_cliente INTEGER,
      data_creazione TEXT DEFAULT (datetime('now','localtime')),
      data_modifica TEXT DEFAULT (datetime('now','localtime')),
      FOREIGN KEY (id_cliente) REFERENCES clienti(id)
    )`,
    `CREATE INDEX IF NOT EXISTS idx_pagina_bianca_tipo ON pagina_bianca(tipo)`,
    `CREATE INDEX IF NOT EXISTS idx_pagina_bianca_cliente ON pagina_bianca(id_cliente)`,
    `CREATE INDEX IF NOT EXISTS idx_pagina_bianca_data ON pagina_bianca(data_creazione DESC)`,

    // Trigger per data_modifica su pagina_bianca
    `CREATE TRIGGER IF NOT EXISTS update_pagina_bianca_modifica 
    AFTER UPDATE ON pagina_bianca
    BEGIN
      UPDATE pagina_bianca SET data_modifica = datetime('now','localtime') WHERE id = NEW.id;
    END`,

    // Ricreazione tabella adempimenti
    `CREATE TABLE IF NOT EXISTS adempimenti_new (
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
    )`,
    `INSERT OR IGNORE INTO adempimenti_new
       SELECT id, codice, nome, descrizione, scadenza_tipo,
              is_contabilita, has_rate, is_checkbox, 
              COALESCE(is_text_only, 0) as is_text_only,
              rate_labels, anno_validita, attivo
       FROM adempimenti`,
    `DROP TABLE adempimenti`,
    `ALTER TABLE adempimenti_new RENAME TO adempimenti`,
    `CREATE UNIQUE INDEX IF NOT EXISTS idx_adempimenti_codice_attivo ON adempimenti(codice) WHERE attivo = 1`,

    // ── CESTINO ──
    `CREATE TABLE IF NOT EXISTS cestino (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tabella TEXT NOT NULL,
      record_id INTEGER,
      dati_json TEXT NOT NULL,
      eliminato_da TEXT DEFAULT 'utente',
      data_eliminazione TEXT DEFAULT (datetime('now','localtime'))
    )`,
    `CREATE INDEX IF NOT EXISTS idx_cestino_tabella ON cestino(tabella)`,
    `CREATE INDEX IF NOT EXISTS idx_cestino_data ON cestino(data_eliminazione DESC)`,

    // ── MIGRAZIONE STATO: vecchi valori → nuovi valori ──
    // Converte: 'fatto' → 'completato', 'non_applicabile' → 'n_a', 'text_only' → 'text_only' (invariato)
    // e ricrea la tabella con il CHECK aggiornato
    `CREATE TABLE IF NOT EXISTS adempimenti_cliente_new (
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
    )`,
    `INSERT OR IGNORE INTO adempimenti_cliente_new
       SELECT id, id_cliente, id_adempimento, anno, mese, trimestre, semestre,
         CASE stato
           WHEN 'fatto'           THEN 'completato'
           WHEN 'non_applicabile' THEN 'n_a'
           ELSE COALESCE(stato, 'da_fare')
         END,
         data_scadenza, data_completamento, note,
         importo, importo_saldo, importo_acconto1, importo_acconto2,
         importo_iva, importo_contabilita,
         COALESCE(cont_completata, 0),
         COALESCE(iva_completata, 0)
       FROM adempimenti_cliente`,
    `DROP TABLE adempimenti_cliente`,
    `ALTER TABLE adempimenti_cliente_new RENAME TO adempimenti_cliente`,
    `CREATE INDEX IF NOT EXISTS idx_adempimenti_cliente_cliente ON adempimenti_cliente(id_cliente)`,
    `CREATE INDEX IF NOT EXISTS idx_adempimenti_cliente_anno ON adempimenti_cliente(anno)`,

    // ── NORMALIZZAZIONE col2_value / col3_value ─────────────────────────
    // BUG STORICO: il form salva sempre valori minuscoli normalizzati
    // (es. "ditta", "ordinario"), ma alcuni dati (seed demo, importazioni
    // vecchie) erano stati inseriti con l'etichetta originale così com'è
    // (es. "Ditta Individuale", "Ordinario"). Il filtro per tipologia
    // confronta sempre col i valori minuscoli normalizzati: se il dato nel
    // DB era rimasto con la maiuscola/etichetta estesa, quel cliente non
    // veniva MAI trovato da nessun filtro parziale (appariva "sparito").
    // Questa normalizzazione riallinea tutti i valori esistenti al formato
    // corretto. È idempotente: se eseguita più volte non cambia nulla.
    `UPDATE clienti_config_annuale SET col2_value = CASE col2_value
       WHEN 'Privato' THEN 'privato'
       WHEN 'Socio' THEN 'socio'
       WHEN 'Ditta Individuale' THEN 'ditta'
       WHEN 'Professionista' THEN 'professionista'
       ELSE col2_value END
     WHERE col2_value IN ('Privato','Socio','Ditta Individuale','Professionista')`,
    `UPDATE clienti_config_annuale SET col3_value = CASE col3_value
       WHEN 'Ordinario' THEN 'ordinario'
       WHEN 'Semplificato' THEN 'semplificato'
       WHEN 'Forfettario' THEN 'forfettario'
       WHEN 'Ordinaria' THEN 'ordinaria'
       WHEN 'Semplificata' THEN 'semplificata'
       ELSE col3_value END
     WHERE col3_value IN ('Ordinario','Semplificato','Forfettario','Ordinaria','Semplificata')`,
    // Stessa normalizzazione sulla tabella clienti (colonne legacy, tenute
    // allineate per sicurezza anche se il percorso principale è la config annuale)
    `UPDATE clienti SET col2_value = CASE col2_value
       WHEN 'Privato' THEN 'privato'
       WHEN 'Socio' THEN 'socio'
       WHEN 'Ditta Individuale' THEN 'ditta'
       WHEN 'Professionista' THEN 'professionista'
       ELSE col2_value END
     WHERE col2_value IN ('Privato','Socio','Ditta Individuale','Professionista')`,
    `UPDATE clienti SET col3_value = CASE col3_value
       WHEN 'Ordinario' THEN 'ordinario'
       WHEN 'Semplificato' THEN 'semplificato'
       WHEN 'Forfettario' THEN 'forfettario'
       WHEN 'Ordinaria' THEN 'ordinaria'
       WHEN 'Semplificata' THEN 'semplificata'
       ELSE col3_value END
     WHERE col3_value IN ('Ordinario','Semplificato','Forfettario','Ordinaria','Semplificata')`,

    // Correzione dato demo non valido: ASS_SEMP (Associazione · Semplificata)
    // non è un regime forfettario, quindi non può avere periodicita='annuale'
    // (solo mensile/trimestrale sono ammessi per questa sottotipologia).
    // Con periodicita='annuale' questo cliente non corrispondeva a NESSUNA
    // combinazione valida del filtro tipologie e spariva sempre appena si
    // applicava un filtro parziale.
    `UPDATE clienti_config_annuale SET periodicita = 'trimestrale'
     WHERE periodicita = 'annuale'
       AND id_sottotipologia IN (SELECT id FROM sottotipologie WHERE codice = 'ASS_SEMP')`,
  ];

  migrations.forEach((sql) => {
    try {
      db.run(sql);
    } catch (e) {
      // Ignora errori di colonna già esistente
    }
  });
  saveDB();
}

module.exports = {
  get db() {
    return db;
  },
  initDB,
  saveDB,
  runQuery,
  runQueryAndGetId,
  queryAll,
  queryOne,
};
