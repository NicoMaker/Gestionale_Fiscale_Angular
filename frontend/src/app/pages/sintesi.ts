import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AdempimentoCliente } from '../core/models';
import { SocketService } from '../core/socket.service';
import { StateService } from '../core/state.service';
import { Modal } from '../shared/modal';
import { AdpEdit } from '../shared/adp-edit';
import { fmtData, norm, periodoLabel, periodoOrdine, statoIcon, statoLabel } from '../core/utils';

interface Cella { righe: AdempimentoCliente[]; tot: number; done: number; na: number; classe: string }

@Component({
  selector: 'app-sintesi',
  standalone: true,
  imports: [FormsModule, Modal, AdpEdit],
  styles: [`
    td.cell { text-align: center; cursor: pointer; min-width: 74px; font-weight: 600; }
    td.cell:hover { outline: 2px solid var(--accent); outline-offset: -2px; }
    td.c-completato { color: var(--ok); background: color-mix(in srgb, var(--ok) 14%, transparent); }
    td.c-in_corso { color: var(--warn); background: color-mix(in srgb, var(--warn) 14%, transparent); }
    td.c-da_fare { color: var(--err); background: color-mix(in srgb, var(--err) 14%, transparent); }
    td.c-n_a { color: var(--muted); }
    td.vuota { color: var(--line); cursor: default; }
    .sticky { position: sticky; left: 0; background: var(--card); z-index: 1; min-width: 220px; }
    th.v { writing-mode: vertical-rl; transform: rotate(180deg); white-space: nowrap; max-height: 170px; text-align: left; }
  `],
  template: `
    <div class="page">
      <div class="toolbar no-print">
        <input class="input" style="width:240px" placeholder="🔍 Cerca cliente…" [ngModel]="q()" (ngModelChange)="q.set($event)">
        <label class="chk"><input type="checkbox" [ngModel]="soloIncompleti()" (ngModelChange)="soloIncompleti.set($event)"> Solo clienti con attività aperte</label>
        <span class="grow"></span>
        <span class="muted small">🟢 completato · 🟡 in corso · 🔴 da fare · ⚪ n/a</span>
      </div>

      <div class="row no-print" style="margin-bottom:12px">
        <span class="muted">Colonne:</span>
        @for (n of nomiAdp(); track n) {
          <button class="pill" [style.opacity]="nascosti().has(n) ? .35 : 1" (click)="toggleCol(n)">{{ n }}</button>
        }
      </div>

      <div class="table-wrap">
        <table class="t">
          <thead><tr>
            <th class="sticky">Cliente</th>
            @for (n of colonne(); track n) { <th class="v">{{ n }}</th> }
          </tr></thead>
          <tbody>
            @for (c of clienti(); track c.id) {
              <tr>
                <td class="sticky"><b>{{ c.nome }}</b></td>
                @for (n of colonne(); track n) {
                  @let cel = c.celle.get(n);
                  @if (cel) {
                    <td class="cell" [class]="'cell c-' + cel.classe" (click)="apri(c.nome, n, cel)">{{ cel.done }}/{{ cel.tot - cel.na }}</td>
                  } @else { <td class="cell vuota">·</td> }
                }
              </tr>
            } @empty {
              <tr><td [attr.colspan]="colonne().length + 1"><div class="empty"><div class="ic">🧮</div>Nessun dato per il {{ st.anno() }}.</div></td></tr>
            }
          </tbody>
        </table>
      </div>
    </div>

    @if (dettaglio(); as d) {
      <app-modal [title]="d.cliente + ' — ' + d.adempimento" (closed)="dettaglio.set(null)">
        <table class="t">
          <thead><tr><th>Periodo</th><th>Scadenza</th><th>Stato</th><th></th></tr></thead>
          <tbody>
            @for (r of d.righe; track r.id) {
              <tr><td>{{ periodo(r) }}</td><td>{{ fmtData(r.data_scadenza) }}</td>
                <td><span class="pill" [class]="'pill ' + r.stato">{{ icona(r.stato) }} {{ label(r.stato) }}</span></td>
                <td class="actions"><button class="btn sm icon" (click)="edit.set(r)">✏️</button></td></tr>
            }
          </tbody>
        </table>
        <ng-container footer><button class="btn" (click)="dettaglio.set(null)">Chiudi</button></ng-container>
      </app-modal>
    }
    @if (edit(); as r) { <app-adp-edit [row]="r" (closed)="edit.set(null)" (saved)="edit.set(null); dettaglio.set(null)" /> }
  `,
})
export class SintesiPage {
  private sock = inject(SocketService);
  readonly st = inject(StateService);
  readonly fmtData = fmtData; readonly periodo = periodoLabel; readonly icona = statoIcon; readonly label = statoLabel;

  righe = signal<AdempimentoCliente[]>([]);
  q = signal(''); soloIncompleti = signal(false);
  nascosti = signal(new Set<string>());
  dettaglio = signal<{ cliente: string; adempimento: string; righe: AdempimentoCliente[] } | null>(null);
  edit = signal<AdempimentoCliente | null>(null);

  nomiAdp = computed(() => [...new Set(this.righe().map((r) => r.adempimento_nome))].sort((a, b) => a.localeCompare(b, 'it')));
  colonne = computed(() => this.nomiAdp().filter((n) => !this.nascosti().has(n)));

  clienti = computed(() => {
    const q = norm(this.q()).trim();
    const mappa = new Map<number, { id: number; nome: string; celle: Map<string, Cella> }>();
    for (const r of this.righe()) {
      if (this.nascosti().has(r.adempimento_nome)) continue;
      let c = mappa.get(r.cliente_id);
      if (!c) mappa.set(r.cliente_id, (c = { id: r.cliente_id, nome: r.cliente_nome, celle: new Map() }));
      let cel = c.celle.get(r.adempimento_nome);
      if (!cel) c.celle.set(r.adempimento_nome, (cel = { righe: [], tot: 0, done: 0, na: 0, classe: '' }));
      cel.righe.push(r);
      cel.tot++;
      if (r.stato === 'completato') cel.done++;
      if (r.stato === 'n_a') cel.na++;
    }
    for (const c of mappa.values())
      for (const cel of c.celle.values()) {
        const attivi = cel.tot - cel.na;
        cel.classe = attivi === 0 ? 'n_a' : cel.done === attivi ? 'completato' : cel.righe.some((r) => r.stato === 'in_corso') || cel.done > 0 ? 'in_corso' : 'da_fare';
      }
    return [...mappa.values()]
      .filter((c) => !q || norm(c.nome).includes(q))
      .filter((c) => !this.soloIncompleti() || [...c.celle.values()].some((x) => x.classe === 'da_fare' || x.classe === 'in_corso'))
      .sort((a, b) => a.nome.localeCompare(b.nome, 'it', { sensitivity: 'base' }));
  });

  constructor() {
    effect(() => { this.st.anno(); untracked(() => this.load()); });
    this.sock.onBroadcast('broadcast:scadenzario_updated', 'broadcast:globale_updated', 'broadcast:clienti_updated').pipe(takeUntilDestroyed()).subscribe(() => this.load());
  }

  async load() {
    const res = await this.sock.call<AdempimentoCliente[]>('get:sintesi', { anno: this.st.anno() });
    if (res) this.righe.set(res.data ?? []);
  }

  toggleCol(n: string) { this.nascosti.update((s) => { const x = new Set(s); x.has(n) ? x.delete(n) : x.add(n); return x; }); }

  apri(cliente: string, adempimento: string, cel: Cella) {
    this.dettaglio.set({ cliente, adempimento, righe: [...cel.righe].sort((a, b) => periodoOrdine(a) - periodoOrdine(b)) });
  }
}
