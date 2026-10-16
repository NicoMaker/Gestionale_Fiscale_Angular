import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AdempimentoCliente } from '../core/models';
import { SocketService } from '../core/socket.service';
import { StateService } from '../core/state.service';
import { AdpEdit } from '../shared/adp-edit';
import {
  STATI,
  fmtData,
  fmtEuro,
  importoTotale,
  norm,
  periodoLabel,
  scaduto,
  statoIcon,
  statoLabel,
} from '../core/utils';

const PAGINA = 200;

@Component({
  selector: 'app-globale',
  standalone: true,
  imports: [FormsModule, RouterLink, AdpEdit],
  template: `
    <div class="page">
      <div class="toolbar no-print">
        <input
          class="input"
          style="width:240px"
          placeholder="🔍 Cliente, adempimento, CF…"
          [ngModel]="q()"
          (ngModelChange)="q.set($event); limite.set(PAGINA)"
        />
        <select
          class="input"
          [ngModel]="stato()"
          (ngModelChange)="stato.set($event); limite.set(PAGINA)"
        >
          <option value="tutti">Tutti gli stati</option>
          @for (s of stati; track s.value) {
            <option [value]="s.value">{{ s.label }}</option>
          }
        </select>
        <select
          class="input"
          [ngModel]="adp()"
          (ngModelChange)="adp.set($event); limite.set(PAGINA)"
        >
          <option value="">Tutti gli adempimenti</option>
          @for (n of nomiAdp(); track n) {
            <option [value]="n">{{ n }}</option>
          }
        </select>
        <select
          class="input"
          [ngModel]="tipo()"
          (ngModelChange)="tipo.set($event); limite.set(PAGINA)"
        >
          <option value="">Tutte le tipologie</option>
          @for (t of tipologie(); track t) {
            <option [value]="t">{{ t }}</option>
          }
        </select>
        <label class="chk"
          ><input
            type="checkbox"
            [ngModel]="soloScaduti()"
            (ngModelChange)="soloScaduti.set($event)"
          />
          Solo scaduti</label
        >
        <span class="grow"></span>
        <span class="muted">{{ filtrate().length }} righe · totale {{ fmtEuro(totale()) }}</span>
      </div>

      <div class="table-wrap">
        <table class="t">
          <thead>
            <tr>
              <th (click)="ordina('cliente_nome')" style="cursor:pointer">
                Cliente {{ freccia('cliente_nome') }}
              </th>
              <th (click)="ordina('adempimento_nome')" style="cursor:pointer">
                Adempimento {{ freccia('adempimento_nome') }}
              </th>
              <th>Periodo</th>
              <th (click)="ordina('data_scadenza')" style="cursor:pointer">
                Scadenza {{ freccia('data_scadenza') }}
              </th>
              <th>Stato</th>
              <th class="right">Importo</th>
              <th class="no-print"></th>
            </tr>
          </thead>
          <tbody>
            @for (r of visibili(); track r.id) {
              <tr [class.done]="r.stato === 'completato'">
                <td>
                  <a [routerLink]="['/scadenzario']" [queryParams]="{ cliente: r.cliente_id }"
                    ><b>{{ r.cliente_nome }}</b></a
                  >
                  @if (r.cliente_tipologia_codice) {
                    <span
                      class="pill"
                      style="margin-left:6px"
                      [style.color]="r.cliente_tipologia_colore || ''"
                      >{{ r.cliente_tipologia_codice }}</span
                    >
                  }
                </td>
                <td>{{ r.adempimento_nome }}</td>
                <td>{{ periodo(r) }}</td>
                <td class="nowrap">
                  {{ fmtData(r.data_scadenza) }}
                  @if (scaduto(r)) {
                    <span class="pill late">scaduto</span>
                  }
                </td>
                <td>
                  <span class="pill" [class]="'pill ' + r.stato"
                    >{{ icona(r.stato) }} {{ label(r.stato) }}</span
                  >
                </td>
                <td class="right">{{ importoTotale(r) ? fmtEuro(importoTotale(r)) : '—' }}</td>
                <td class="actions no-print">
                  <button class="btn sm icon" (click)="edit.set(r)">✏️</button>
                </td>
              </tr>
            } @empty {
              <tr>
                <td colspan="7">
                  <div class="empty">
                    <div class="ic">🌐</div>
                    Nessun risultato.
                  </div>
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
      @if (filtrate().length > visibili().length) {
        <div class="row" style="justify-content:center;margin-top:12px">
          <button class="btn" (click)="limite.set(limite() + PAGINA)">
            Mostra altre {{ PAGINA }} righe ({{ filtrate().length - visibili().length }} restanti)
          </button>
        </div>
      }
    </div>
    @if (edit(); as r) {
      <app-adp-edit [row]="r" (closed)="edit.set(null)" (saved)="edit.set(null)" />
    }
  `,
})
export class GlobalePage {
  private sock = inject(SocketService);
  readonly st = inject(StateService);
  readonly PAGINA = PAGINA;
  readonly stati = STATI;
  readonly fmtData = fmtData;
  readonly fmtEuro = fmtEuro;
  readonly importoTotale = importoTotale;
  readonly scaduto = scaduto;
  readonly periodo = periodoLabel;
  readonly icona = statoIcon;
  readonly label = statoLabel;

  righe = signal<AdempimentoCliente[]>([]);
  q = signal('');
  stato = signal('tutti');
  adp = signal('');
  tipo = signal('');
  soloScaduti = signal(false);
  sortKey = signal<keyof AdempimentoCliente>('cliente_nome');
  sortDir = signal(1);
  limite = signal(PAGINA);
  edit = signal<AdempimentoCliente | null>(null);

  nomiAdp = computed(() =>
    [...new Set(this.righe().map((r) => r.adempimento_nome))].sort((a, b) =>
      a.localeCompare(b, 'it'),
    ),
  );
  tipologie = computed(() =>
    [
      ...new Set(
        this.righe()
          .map((r) => r.cliente_tipologia_codice)
          .filter(Boolean) as string[],
      ),
    ].sort(),
  );

  filtrate = computed(() => {
    const q = norm(this.q()).trim(),
      k = this.sortKey(),
      d = this.sortDir();
    return this.righe()
      .filter((r) => this.stato() === 'tutti' || r.stato === this.stato())
      .filter((r) => !this.adp() || r.adempimento_nome === this.adp())
      .filter((r) => !this.tipo() || r.cliente_tipologia_codice === this.tipo())
      .filter((r) => !this.soloScaduti() || scaduto(r))
      .filter(
        (r) =>
          !q ||
          [r.cliente_nome, r.adempimento_nome, r.cliente_cf, r.cliente_piva].some((v) =>
            norm(v).includes(q),
          ),
      )
      .sort((a, b) => {
        const x = (a[k] ?? '') as any,
          y = (b[k] ?? '') as any;
        return (typeof x === 'number' ? x - y : String(x).localeCompare(String(y), 'it')) * d;
      });
  });
  visibili = computed(() => this.filtrate().slice(0, this.limite()));
  totale = computed(() => this.filtrate().reduce((s, r) => s + importoTotale(r), 0));

  constructor() {
    effect(() => {
      this.st.anno();
      untracked(() => this.load());
    });
    this.sock
      .onBroadcast(
        'broadcast:globale_updated',
        'broadcast:scadenzario_updated',
        'broadcast:clienti_updated',
      )
      .pipe(takeUntilDestroyed())
      .subscribe(() => this.load());
  }

  async load() {
    const res = await this.sock.call<AdempimentoCliente[]>('get:scadenzario_globale', {
      anno: this.st.anno(),
      filtri: {},
    });
    if (res) this.righe.set(res.data ?? []);
  }

  ordina(k: keyof AdempimentoCliente) {
    if (this.sortKey() === k) this.sortDir.update((d) => -d);
    else {
      this.sortKey.set(k);
      this.sortDir.set(1);
    }
  }
  freccia(k: string) {
    return this.sortKey() === k ? (this.sortDir() > 0 ? '▲' : '▼') : '';
  }
}
