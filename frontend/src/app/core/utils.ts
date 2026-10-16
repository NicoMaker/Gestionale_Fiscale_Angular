import { AdempimentoCliente, Stato } from './models';

export const MESI = [
  'Gennaio',
  'Febbraio',
  'Marzo',
  'Aprile',
  'Maggio',
  'Giugno',
  'Luglio',
  'Agosto',
  'Settembre',
  'Ottobre',
  'Novembre',
  'Dicembre',
];
export const MESI_SHORT = [
  'Gen',
  'Feb',
  'Mar',
  'Apr',
  'Mag',
  'Giu',
  'Lug',
  'Ago',
  'Set',
  'Ott',
  'Nov',
  'Dic',
];

export const STATI: { value: Stato; label: string; icon: string }[] = [
  { value: 'da_fare', label: 'Da fare', icon: '⏳' },
  { value: 'in_corso', label: 'In corso', icon: '🔄' },
  { value: 'completato', label: 'Completato', icon: '✅' },
  { value: 'n_a', label: 'N/A', icon: '➖' },
  { value: 'text_only', label: 'Solo testo', icon: '📝' },
];

export function statoLabel(s: string): string {
  return STATI.find((x) => x.value === s)?.label ?? s;
}
export function statoIcon(s: string): string {
  return STATI.find((x) => x.value === s)?.icon ?? '';
}

export function periodoLabel(
  r: Pick<AdempimentoCliente, 'scadenza_tipo' | 'mese' | 'trimestre' | 'semestre'>,
): string {
  switch (r.scadenza_tipo) {
    case 'mensile':
      return MESI[(r.mese || 1) - 1] ?? '-';
    case 'trimestrale':
      return `${r.trimestre}° trimestre`;
    case 'semestrale':
      return `${r.semestre}° semestre`;
    default:
      return 'Annuale';
  }
}

export function periodoShort(
  r: Pick<AdempimentoCliente, 'scadenza_tipo' | 'mese' | 'trimestre' | 'semestre'>,
): string {
  switch (r.scadenza_tipo) {
    case 'mensile':
      return MESI_SHORT[(r.mese || 1) - 1] ?? '-';
    case 'trimestrale':
      return `T${r.trimestre}`;
    case 'semestrale':
      return `S${r.semestre}`;
    default:
      return 'Anno';
  }
}

export function periodoOrdine(
  r: Pick<AdempimentoCliente, 'mese' | 'trimestre' | 'semestre'>,
): number {
  return (r.mese || 0) * 100 + (r.trimestre || 0) * 10 + (r.semestre || 0);
}

export function fmtData(d?: string | null): string {
  if (!d) return '—';
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(d);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : d;
}

export function fmtDataOra(d?: string | null): string {
  if (!d) return '—';
  const m = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/.exec(d);
  return m ? `${m[3]}/${m[2]}/${m[1]} ${m[4]}:${m[5]}` : fmtData(d);
}

export function fmtEuro(n?: number | null): string {
  if (n === null || n === undefined || n === ('' as any)) return '—';
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(Number(n));
}

export function oggiISO(): string {
  const d = new Date();
  const p = (x: number) => String(x).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function scaduto(r: { data_scadenza?: string | null; stato: string }): boolean {
  return (
    !!r.data_scadenza &&
    r.stato !== 'completato' &&
    r.stato !== 'n_a' &&
    r.data_scadenza < oggiISO()
  );
}

export function importoTotale(r: AdempimentoCliente): number {
  return [
    r.importo,
    r.importo_saldo,
    r.importo_acconto1,
    r.importo_acconto2,
    r.importo_iva,
    r.importo_contabilita,
  ]
    .map((x) => Number(x) || 0)
    .reduce((a, b) => a + b, 0);
}

export function norm(s: unknown): string {
  return String(s ?? '').toLowerCase();
}

export function rateLabels(raw?: string | null): string[] {
  if (!raw) return [];
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v.map(String) : [];
  } catch {
    return [];
  }
}
