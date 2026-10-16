import { Component, DestroyRef, effect, inject, signal, untracked } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Adempimento, Cliente, Stats } from '../core/models';
import { SocketService } from '../core/socket.service';
import { StateService } from '../core/state.service';
import { ToastService } from '../core/toast.service';
import { ConfirmService } from '../core/confirm.service';
import { Modal } from '../shared/modal';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [FormsModule, RouterLink, Modal],
  template: `
    <div class="page">
      <div class="toolbar no-print">
        <button class="btn" (click)="openApplica()">🧩 Applica / rimuovi adempimenti</button>
        <button class="btn" (click)="generaTutti()">⚙️ Genera scadenzario per tutti</button>
        <button class="btn" (click)="copiaAnno()">📋 Copia da {{ st.anno() - 1 }}</button>
      </div>

      @if (stats(); as s) {
        <div class="grid stats">
          <div class="stat">
            <div class="n">{{ s.totClienti }}</div>
            <div class="l">Clienti attivi</div>
          </div>
          <div class="stat">
            <div class="n">{{ s.totale }}</div>
            <div class="l">Adempimenti</div>
          </div>
          <div class="stat">
            <div class="n" style="color:var(--ok)">{{ s.completati }}</div>
            <div class="l">Completati</div>
          </div>
          <div class="stat">
            <div class="n" style="color:var(--err)">{{ s.da_fare }}</div>
            <div class="l">Da fare</div>
          </div>
          <div class="stat">
            <div class="n" style="color:var(--warn)">{{ s.in_corso }}</div>
            <div class="l">In corso</div>
          </div>
          <div class="stat">
            <div class="n">{{ perc(s) }}%</div>
            <div class="l">Avanzamento</div>
          </div>
        </div>

        <div class="grid cols2">
          <div class="card" style="grid-column: 1 / -1">
            <h3>Avanzamento per adempimento — {{ st.anno() }}</h3>
            @if (s.adempimentiStats.length) {
              <div class="table-wrap">
                <table class="t">
                  <thead>
                    <tr>
                      <th>Adempimento</th>
                      <th class="right">Totale</th>
                      <th class="right">Completati</th>
                      <th class="right">Da fare</th>
                      <th class="right">N/A</th>
                      <th style="width:200px">Progresso</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (a of s.adempimentiStats; track a.codice) {
                      <tr>
                        <td>
                          <b>{{ a.nome }}</b> <span class="muted small">{{ a.codice }}</span>
                        </td>
                        <td class="right">{{ a.totale }}</td>
                        <td class="right">{{ a.completati }}</td>
                        <td class="right">{{ a.da_fare }}</td>
                        <td class="right">{{ a.na }}</td>
                        <td>
                          <div class="bar">
                            <i [style.width.%]="percRiga(a.completati, a.totale - a.na)"></i>
                          </div>
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            } @else {
              <div class="empty">
                <div class="ic">📭</div>
                Nessun adempimento per il {{ st.anno() }}.
              </div>
            }
          </div>

          <div class="card" style="grid-column: 1 / -1">
            <h3>⚠️ Clienti senza adempimenti nel {{ st.anno() }} ({{ senzaAdp().length }})</h3>
            @if (senzaAdp().length) {
              <div class="row">
                @for (c of senzaAdp(); track c.id) {
                  <a
                    class="pill"
                    [routerLink]="['/scadenzario']"
                    [queryParams]="{ cliente: c.id }"
                    >{{ c.nome }}</a
                  >
                }
              </div>
            } @else {
              <span class="muted">Tutti i clienti hanno almeno un adempimento. 🎉</span>
            }
          </div>
        </div>
      } @else {
        <div class="empty">Caricamento…</div>
      }
    </div>

    @if (applicaOpen()) {
      <app-modal
        title="🧩 Applica / rimuovi adempimenti"
        [wide]="true"
        (closed)="applicaOpen.set(false)"
      >
        <div class="infobox">
          Anno <b>{{ st.anno() }}</b
          >. Seleziona uno o più adempimenti e uno o più clienti.
        </div>
        <div class="grid cols2">
          <div>
            <div class="row">
              <b>Adempimenti ({{ selAdp().size }})</b><span class="grow"></span>
              <button class="btn sm" (click)="toggleAll(adempimenti(), selAdp)">
                Tutti/nessuno
              </button>
            </div>
            <div class="checklist">
              @for (a of adempimenti(); track a.id) {
                <label
                  ><input
                    type="checkbox"
                    [checked]="selAdp().has(a.id)"
                    (change)="toggle(selAdp, a.id)"
                  />
                  {{ a.nome }}</label
                >
              }
            </div>
          </div>
          <div>
            <div class="row">
              <b>Clienti ({{ selCli().size }})</b><span class="grow"></span>
              <input
                class="input"
                style="width:140px"
                placeholder="Filtra…"
                [(ngModel)]="filtroCli"
              />
              <button class="btn sm" (click)="toggleAll(clientiFiltrati(), selCli)">
                Tutti/nessuno
              </button>
            </div>
            <div class="checklist">
              @for (c of clientiFiltrati(); track c.id) {
                <label
                  ><input
                    type="checkbox"
                    [checked]="selCli().has(c.id)"
                    (change)="toggle(selCli, c.id)"
                  />
                  {{ c.nome }}</label
                >
              }
            </div>
          </div>
        </div>
        <ng-container footer>
          <button class="btn" (click)="applicaOpen.set(false)">Chiudi</button>
          <button
            class="btn danger"
            [disabled]="!selAdp().size || !selCli().size"
            (click)="applica(false)"
          >
            🗑️ Rimuovi
          </button>
          <button
            class="btn primary"
            [disabled]="!selAdp().size || !selCli().size"
            (click)="applica(true)"
          >
            ➕ Applica
          </button>
        </ng-container>
      </app-modal>
    }
  `,
})
export class DashboardPage {
  readonly sock = inject(SocketService);
  readonly st = inject(StateService);
  private toast = inject(ToastService);
  private confirm = inject(ConfirmService);

  stats = signal<Stats | null>(null);
  senzaAdp = signal<Cliente[]>([]);
  adempimenti = signal<Adempimento[]>([]);
  clienti = signal<Cliente[]>([]);
  applicaOpen = signal(false);
  selAdp = signal(new Set<number>());
  selCli = signal(new Set<number>());
  filtroCli = '';

  constructor() {
    effect(() => {
      this.st.anno();
      untracked(() => this.load());
    });
    this.sock
      .onBroadcast(
        'broadcast:stats_updated',
        'broadcast:clienti_updated',
        'broadcast:scadenzario_updated',
        'broadcast:adempimenti_updated',
      )
      .pipe(takeUntilDestroyed())
      .subscribe(() => this.load());
  }

  async load() {
    const anno = this.st.anno();
    const [s, z] = await Promise.all([
      this.sock.call<Stats>('get:stats', { anno }),
      this.sock.call<Cliente[]>('get:clienti_senza_adempimenti', { anno }),
    ]);
    if (s) this.stats.set(s.data!);
    if (z) this.senzaAdp.set(z.data ?? []);
  }

  perc(s: Stats) {
    return this.percRiga(s.completati, s.totale - s.na);
  }
  percRiga(done: number, tot: number) {
    return tot > 0 ? Math.round((done / tot) * 100) : 0;
  }

  async openApplica() {
    const [a, c] = await Promise.all([
      this.sock.call<Adempimento[]>('get:adempimenti'),
      this.sock.call<Cliente[]>('get:clienti', { anno: this.st.anno() }),
    ]);
    this.adempimenti.set(a?.data ?? []);
    this.clienti.set(c?.data ?? []);
    this.selAdp.set(new Set());
    this.selCli.set(new Set());
    this.applicaOpen.set(true);
  }

  clientiFiltrati() {
    const f = this.filtroCli.toLowerCase();
    return this.clienti().filter((c) => !f || c.nome.toLowerCase().includes(f));
  }

  toggle(sig: ReturnType<typeof signal<Set<number>>>, id: number) {
    sig.update((s) => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  }
  toggleAll(list: { id: number }[], sig: ReturnType<typeof signal<Set<number>>>) {
    sig.update((s) =>
      list.every((x) => s.has(x.id)) ? new Set() : new Set(list.map((x) => x.id)),
    );
  }

  async applica(add: boolean) {
    const payload = {
      adempimenti_ids: [...this.selAdp()],
      clienti_ids: [...this.selCli()],
      anno: this.st.anno(),
    };
    if (
      !add &&
      !(await this.confirm.ask(
        `Rimuovere ${payload.adempimenti_ids.length} adempimenti da ${payload.clienti_ids.length} clienti per il ${payload.anno}?`,
        { danger: true, okLabel: 'Rimuovi' },
      ))
    )
      return;
    const res = await this.sock.call(
      add ? 'applica:adempimenti_a_clienti' : 'elimina:adempimenti_a_clienti',
      payload,
    );
    if (!res) return;
    this.toast.success(
      add ? `Inseriti ${res['inseriti']} adempimenti` : `Rimossi ${res['eliminati']} adempimenti`,
    );
    this.applicaOpen.set(false);
  }

  async generaTutti() {
    const anno = this.st.anno();
    if (
      !(await this.confirm.ask(
        `Generare lo scadenzario ${anno} per tutti i clienti (le righe già presenti sono mantenute)?`,
      ))
    )
      return;
    const res = await this.sock.call('genera:tutti', { anno, adempimenti: [] });
    if (res)
      this.toast.success(
        `Generazione completata (inseriti: ${res['inseriti'] ?? res['totaleInseriti'] ?? 0})`,
      );
  }

  async copiaAnno() {
    const a = this.st.anno();
    if (
      !(await this.confirm.ask(
        `Copiare configurazioni e scadenzario dal ${a - 1} al ${a} per tutti i clienti?`,
      ))
    )
      return;
    await this.sock.call('copia:config_tutti_clienti', { anno_da: a - 1, anno_a: a });
    const res = await this.sock.call('copia:tutti', { anno_da: a - 1, anno_a: a });
    if (res) this.toast.success(`Copia completata (${res['copiati'] ?? 0} righe)`);
  }
}
