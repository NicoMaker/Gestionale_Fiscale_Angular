export interface Res<T = any> {
  success: boolean;
  error?: string;
  data?: T;
  [k: string]: any;
}

export type Stato = 'da_fare' | 'in_corso' | 'completato' | 'n_a' | 'text_only';
export type ScadenzaTipo = 'annuale' | 'semestrale' | 'trimestrale' | 'mensile';

export interface Sottotipologia {
  id: number;
  id_tipologia: number;
  codice: string;
  nome: string;
  is_separator: number;
  ordine: number;
}

export interface Tipologia {
  id: number;
  codice: string;
  nome: string;
  descrizione?: string;
  colore?: string;
  sottotipologie: Sottotipologia[];
}

export interface Cliente {
  id: number;
  nome: string;
  codice_fiscale?: string | null;
  partita_iva?: string | null;
  email?: string | null;
  telefono?: string | null;
  indirizzo?: string | null;
  citta?: string | null;
  cap?: string | null;
  provincia?: string | null;
  pec?: string | null;
  sdi?: string | null;
  iban?: string | null;
  note?: string | null;
  referente?: string | null;
  attivo?: number;
  contabilita?: number;
  id_tipologia?: number | null;
  id_sottotipologia?: number | null;
  col2_value?: string | null;
  col3_value?: string | null;
  periodicita?: string | null;
  tipologia_codice?: string | null;
  tipologia_nome?: string | null;
  tipologia_colore?: string | null;
  sottotipologia_codice?: string | null;
  sottotipologia_nome?: string | null;
}

export interface Adempimento {
  id: number;
  codice: string;
  nome: string;
  descrizione?: string | null;
  scadenza_tipo: ScadenzaTipo;
  is_contabilita: number;
  has_rate: number;
  is_checkbox: number;
  is_text_only: number;
  rate_labels?: string | null;
  anno_validita?: number | null;
}

export interface AdempimentoCliente {
  id: number;
  id_cliente: number;
  id_adempimento: number;
  anno: number;
  mese?: number | null;
  trimestre?: number | null;
  semestre?: number | null;
  stato: Stato;
  data_scadenza?: string | null;
  data_completamento?: string | null;
  note?: string | null;
  importo?: number | null;
  importo_saldo?: number | null;
  importo_acconto1?: number | null;
  importo_acconto2?: number | null;
  importo_iva?: number | null;
  importo_contabilita?: number | null;
  cont_completata?: number | null;
  iva_completata?: number | null;
  adempimento_codice: string;
  adempimento_nome: string;
  scadenza_tipo: ScadenzaTipo;
  is_contabilita: number;
  has_rate: number;
  rate_labels?: string | null;
  is_checkbox: number;
  cliente_id: number;
  cliente_nome: string;
  cliente_cf?: string | null;
  cliente_piva?: string | null;
  cliente_tipologia_codice?: string | null;
  cliente_tipologia_colore?: string | null;
  cliente_sottotipologia_nome?: string | null;
  cliente_periodicita?: string | null;
  cliente_col2?: string | null;
  cliente_col3?: string | null;
}

export interface StatsAdempimento {
  codice: string;
  nome: string;
  totale: number;
  completati: number;
  da_fare: number;
  na: number;
}

export interface Stats {
  anno: number;
  totClienti: number;
  adempimentiStats: StatsAdempimento[];
  totale: number;
  completati: number;
  da_fare: number;
  in_corso: number;
  na: number;
}

export interface Appunto {
  id: number;
  titolo: string;
  contenuto?: string | null;
  id_cliente?: number | null;
  cliente_nome?: string | null;
  data_inserimento?: string;
  data_scadenza?: string | null;
  priorita: 'alta' | 'media' | 'bassa';
  completato: number;
}

export interface Nota {
  id: number;
  tipo: 'studio' | 'cliente';
  titolo: string;
  contenuto?: string | null;
  allegati?: string | null;
  id_cliente?: number | null;
  cliente_nome?: string | null;
  data_creazione?: string;
  data_modifica?: string;
}

export interface CestinoItem {
  id: number;
  tabella: string;
  record_id: number;
  dati: any;
  eliminato_da?: string;
  data_eliminazione: string;
}

export interface Percorso {
  sepLabel: string | null;
  col2Label: string | null;
  col3Label: string | null;
  codice: string;
  hasPer: boolean;
  isForfettario: boolean;
}

export interface PeriodicitaOpt {
  value: string;
  label: string;
  color: string;
}

export interface TipologieConfig {
  percorsi: Record<string, Percorso[]>;
  periodicitaIva: PeriodicitaOpt[];
  periodicitaAnnuale: PeriodicitaOpt[];
  tipologie: Record<string, { color: string; desc: string; icon: string }>;
  col2Colors: Record<string, string>;
  col3Colors: Record<string, string>;
  sepColors: Record<string, string>;
}
