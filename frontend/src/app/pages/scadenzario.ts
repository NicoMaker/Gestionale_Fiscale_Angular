import { Component, DestroyRef, computed, effect, inject, signal, untracked } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Adempimento, AdempimentoCliente, Cliente } from '../core/models';
import { SocketService } from '../core/socket.service';
import { StateService } from '../core/state.service';
import { ConfirmService } from '../core/confirm.service';
import { ToastService } from '../core/toast.service';
import { Modal } from '../shared/modal';
import { AdpEdit } from '../shared/adp-edit';
import {
  STATI,
  fmtData,
  fmtEuro,
  importoTotale,
  norm,
  oggiISO,
  periodoLabel,
  periodoOrdine,
  scaduto,
} from '../core/utils';

@Component({
  selector: 'app-scadenzario',
  standalone: true,
  imports: [FormsModule, Modal, AdpEdit],
  template: `
    <div class="page">
      <div class="toolbar no-print">
        <select
          class="input"
          style="min-width:260px"
          [ngModel]="idCliente()"
          (ngModelChange)="scegli($event)"
        >
          <option [ngValue]="null">— Seleziona cliente —</option>
          @for (c of clienti(); track c.id) {
            <option [ngValue]="c.id">{{ c.nome }}</option>
          }
        </select>
        @if (idCliente()) {
          <select class="input" [ngModel]="stato()" (ngModelChange)="stato.set($event)">
            <option value="tutti">Tutti gli stati</option>
            @for (s of stati; track s.value) {
              <option [value]="s.value">{{ s.label }}</option>
            }
          </select>
          <input
            class="input"
            placeholder="🔍 Adempimento…"
            [ngModel]="q()"
            (ngModelChange)="q.set($event)"
          />
          <span class="grow"></span>
          <button
            class="btn"
            (click)="genera()"
            title="Crea le righe mancanti in base alla classificazione"
          >
            ⚙️ Genera
          </button>
          <button class="btn" (click)="copia()">📋 Copia da {{ st.anno() - 1 }}</button>
          <button class="btn primary" (click)="apriAggiungi()">+ Adempimento</button>
        }
      </div>

      @if (!idCliente()) {
        <div class="empty">
          <div class="ic">📅</div>
          Seleziona un cliente per vedere il suo scadenzario {{ st.anno() }}.
        </div>
      } @else {
        <div class="grid stats">
          <div class="stat">
            <div class="n">{{ righe().length }}</div>
            <div class="l">Righe</div>
          </div>
          <div class="stat">
            <div class="n" style="color:var(--ok)">{{ conta('completato') }}</div>
            <div class="l">Completate</div>
          </div>
          <div class="stat">
            <div class="n" style="color:var(--err)">{{ conta('da_fare') }}</div>
            <div class="l">Da fare</div>
          </div>
          <div class="stat">
            <div class="n" style="color:var(--warn)">{{ conta('in_corso') }}</div>
            <div class="l">In corso</div>
          </div>
        </div>

        <div class="table-wrap">
          <table class="t">
            <thead>
              <tr>
                <th>Adempimento</th>
                <th>Periodo</th>
                <th>Scadenza</th>
                <th>Stato</th>
                <th class="right">Importo</th>
                <th>Note</th>
                <th class="no-print"></th>
              </tr>
            </thead>
            <tbody>
              @for (r of filtrate(); track r.id) {
                <tr [class.done]="r.stato === 'completato'">
                  <td>
                    <b>{{ r.adempimento_nome }}</b>
                  </td>
                  <td>{{ periodo(r) }}</td>
                  <td class="nowrap">
                    {{ fmtData(r.data_scadenza) }}
                    @if (scaduto(r)) {
                      <span class="pill late">scaduto</span>
                    }
                  </td>
                  <td>
                    <select
                      class="input"
                      style="padding:3px 6px"
                      [ngModel]="r.stato"
                      (ngModelChange)="cambiaStato(r, $event)"
                    >
                      @for (s of stati; track s.value) {
                        <option [value]="s.value">{{ s.icon }} {{ s.label }}</option>
                      }
                    </select>
                  </td>
                  <td class="right">{{ importoTotale(r) ? fmtEuro(importoTotale(r)) : '—' }}</td>
                  <td class="small muted" style="max-width:260px">{{ r.note }}</td>
                  <td class="actions no-print">
                    <button class="btn sm icon" (click)="edit.set(r)" title="Modifica">✏️</button>
                    <button class="btn sm icon danger" (click)="elimina(r)" title="Elimina">
                      🗑️
                    </button>
                  </td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="7">
                    <div class="empty">
                      <div class="ic">📭</div>
                      Nessuna riga. Premi «Genera» per creare lo scadenzario.
                    </div>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    </div>

    @if (edit(); as r) {
      <app-adp-edit [row]="r" (closed)="edit.set(null)" (saved)="edit.set(null)" />
    }

    @if (aggiungi()) {
      <app-modal title="+ Aggiungi adempimento al cliente" (closed)="aggiungi.set(false)">
        <label class="f"
          >Adempimento
          <select class="input" [(ngModel)]="nuovoAdp">
            <option [ngValue]="null">— Seleziona —</option>
            @for (a of adempimentiDisp(); track a.id) {
              <option [ngValue]="a.id">{{ a.nome }} ({{ a.scadenza_tipo }})</option>
            }
          </select>
        </label>
        <ng-container footer>
          <button class="btn" (click)="aggiungi.set(false)">Annulla</button>
          <button class="btn primary" [disabled]="!nuovoAdp" (click)="aggiungiAdp()">
            Aggiungi
          </button>
        </ng-container>
      </app-modal>
    }
  `,
})
export class ScadenzarioPage {
  private sock = inject(SocketService);
  readonly st = inject(StateService);
  private confirm = inject(ConfirmService);
  private toast = inject(ToastService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  readonly stati = STATI;
  readonly fmtData = fmtData;
  readonly fmtEuro = fmtEuro;
  readonly importoTotale = importoTotale;
  readonly scaduto = scaduto;
  readonly periodo = periodoLabel;

  clienti = signal<Cliente[]>([]);
  idCliente = signal<number | null>(null);
  righe = signal<AdempimentoCliente[]>([]);
  stato = signal('tutti');
  q = signal('');
  edit = signal<AdempimentoCliente | null>(null);
  aggiungi = signal(false);
  tuttiAdp = signal<Adempimento[]>([]);
  nuovoAdp: number | null = null;

  filtrate = computed(() => {
    const q = norm(this.q()).trim();
    return this.righe()
      .filter((r) => this.stato() === 'tutti' || r.stato === this.stato())
      .filter(
        (r) => !q || norm(r.adempimento_nome).includes(q) || norm(r.adempimento_codice).includes(q),
      )
      .sort(
        (a, b) =>
          a.adempimento_nome.localeCompare(b.adempimento_nome, 'it') ||
          periodoOrdine(a) - periodoOrdine(b),
      );
  });
  adempimentiDisp = computed(() => {
    const presenti = new Set(this.righe().map((r) => r.id_adempimento));
    const anno = this.st.anno();
    return this.tuttiAdp().filter(
      (a) => !presenti.has(a.id) && (!a.anno_validita || a.anno_validita === anno),
    );
  });

  constructor() {
    this.sock
      .call<Cliente[]>('get:clienti', { anno: this.st.anno() })
      .then((r) => r && this.clienti.set(r.data ?? []));
    const qp = parseInt(this.route.snapshot.queryParamMap.get('cliente') || '', 10);
    if (Number.isFinite(qp)) this.idCliente.set(qp);
    effect(() => {
      this.st.anno();
      this.idCliente();
      untracked(() => this.load());
    });
    this.sock
      .onBroadcast('broadcast:scadenzario_updated', 'broadcast:clienti_updated')
      .pipe(takeUntilDestroyed())
      .subscribe(() => this.load());
  }

  scegli(id: number | null) {
    this.idCliente.set(id);
    this.router.navigate([], { queryParams: { cliente: id }, replaceUrl: true });
  }

  conta(s: string) {
    return this.righe().filter((r) => r.stato === s).length;
  }

  async load() {
    const id = this.idCliente();
    if (!id) return this.righe.set([]);
    const res = await this.sock.call<AdempimentoCliente[]>('get:scadenzario', {
      id_cliente: id,
      anno: this.st.anno(),
      filtri: {},
    });
    if (res) this.righe.set(res.data ?? []);
  }

  async cambiaStato(r: AdempimentoCliente, stato: string) {
    await this.sock.call('update:adempimento_stato', {
      ...r,
      stato,
      data_completamento: stato === 'completato' ? r.data_completamento || oggiISO() : null,
    });
  }

  async genera() {
    const res = await this.sock.call('genera:scadenzario', {
      id_cliente: this.idCliente(),
      anno: this.st.anno(),
    });
    if (res) this.toast.success(`Righe inserite: ${res['inseriti']}`);
  }

  async copia() {
    const a = this.st.anno();
    if (
      !(await this.confirm.ask(`Copiare lo scadenzario del ${a - 1} nel ${a} per questo cliente?`))
    )
      return;
    const res = await this.sock.call('copia:scadenzario', {
      id_cliente: this.idCliente(),
      anno_da: a - 1,
      anno_a: a,
    });
    if (res) this.toast.success(`Righe copiate: ${res['copiati']}`);
  }

  async apriAggiungi() {
    const r = await this.sock.call<Adempimento[]>('get:adempimenti');
    this.tuttiAdp.set(r?.data ?? []);
    this.nuovoAdp = null;
    this.aggiungi.set(true);
  }

  async aggiungiAdp() {
    const res = await this.sock.call('add:adempimento_cliente', {
      id_cliente: this.idCliente(),
      id_adempimento: this.nuovoAdp,
      anno: this.st.anno(),
    });
    if (res) {
      this.aggiungi.set(false);
      this.toast.success('Adempimento aggiunto');
    }
  }

  async elimina(r: AdempimentoCliente) {
    if (
      !(await this.confirm.ask(`Eliminare «${r.adempimento_nome}» (${periodoLabel(r)})?`, {
        danger: true,
        okLabel: 'Elimina',
      }))
    )
      return;
    await this.sock.call('delete:adempimento_cliente', { id: r.id });
  }
}
