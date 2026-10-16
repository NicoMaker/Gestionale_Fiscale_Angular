import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Cliente, Percorso, Tipologia } from '../core/models';
import { SocketService } from '../core/socket.service';
import { StateService } from '../core/state.service';
import { TipologieService } from '../core/tipologie.service';
import { ConfirmService } from '../core/confirm.service';
import { ToastService } from '../core/toast.service';
import { Modal } from '../shared/modal';
import { norm } from '../core/utils';

const VUOTO = () => ({
  nome: '',
  codice_fiscale: '',
  partita_iva: '',
  email: '',
  telefono: '',
  indirizzo: '',
  citta: '',
  cap: '',
  provincia: '',
  pec: '',
  sdi: '',
  iban: '',
  referente: '',
  note: '',
  contabilita: false,
});

@Component({
  selector: 'app-clienti',
  standalone: true,
  imports: [FormsModule, RouterLink, Modal],
  template: `
    <div class="page">
      <div class="toolbar no-print">
        <input
          class="input"
          style="width:260px"
          placeholder="🔍 Cerca nome, CF, P.IVA, email…"
          [ngModel]="q()"
          (ngModelChange)="q.set($event)"
        />
        <select class="input" [ngModel]="ft()" (ngModelChange)="ft.set($event)">
          <option value="">Tutte le tipologie</option>
          @for (t of tip.lista(); track t.id) {
            <option [value]="t.codice">{{ t.nome }}</option>
          }
        </select>
        <span class="muted">{{ filtrati().length }} / {{ clienti().length }} clienti</span>
        <span class="grow"></span>
        @if (sel().size) {
          <button class="btn danger" (click)="eliminaSelezionati()">
            🗑️ Elimina {{ sel().size }} selezionati
          </button>
        }
        <button class="btn primary" (click)="nuovo()">+ Cliente</button>
      </div>

      <div class="table-wrap">
        <table class="t">
          <thead>
            <tr>
              <th style="width:30px">
                <input type="checkbox" [checked]="tuttiSel()" (change)="toggleTutti()" />
              </th>
              <th>Nome</th>
              <th>Classificazione</th>
              <th>CF / P.IVA</th>
              <th>Contatti</th>
              <th class="no-print"></th>
            </tr>
          </thead>
          <tbody>
            @for (c of filtrati(); track c.id) {
              <tr [class.sel]="sel().has(c.id)">
                <td>
                  <input type="checkbox" [checked]="sel().has(c.id)" (change)="toggleSel(c.id)" />
                </td>
                <td>
                  <b>{{ c.nome }}</b>
                  @if (c.referente) {
                    <div class="muted small">👤 {{ c.referente }}</div>
                  }
                </td>
                <td>
                  @if (c.tipologia_codice) {
                    <span
                      class="pill"
                      [style.color]="c.tipologia_colore || ''"
                      [style.border-color]="c.tipologia_colore || ''"
                      >{{ c.tipologia_codice }}</span
                    >
                    @if (c.col2_value) {
                      <span class="pill">{{ c.col2_value }}</span>
                    }
                    @if (c.col3_value) {
                      <span class="pill">{{ c.col3_value }}</span>
                    }
                    @if (c.periodicita) {
                      <span class="pill">{{ c.periodicita }}</span>
                    }
                  } @else {
                    <span class="muted">— non configurato</span>
                  }
                </td>
                <td class="small">
                  {{ c.codice_fiscale || '—' }}
                  <div class="muted">{{ c.partita_iva || '' }}</div>
                </td>
                <td class="small">
                  {{ c.email || '' }}
                  <div class="muted">{{ c.telefono || '' }}</div>
                </td>
                <td class="actions no-print">
                  <a
                    class="btn sm icon"
                    [routerLink]="['/scadenzario']"
                    [queryParams]="{ cliente: c.id }"
                    title="Scadenzario"
                    >📅</a
                  >
                  <button class="btn sm icon" (click)="modifica(c)" title="Modifica">✏️</button>
                  <button class="btn sm icon danger" (click)="elimina(c)" title="Elimina">
                    🗑️
                  </button>
                </td>
              </tr>
            } @empty {
              <tr>
                <td colspan="6">
                  <div class="empty">
                    <div class="ic">👥</div>
                    Nessun cliente trovato.
                  </div>
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    </div>

    @if (form(); as f) {
      <app-modal
        [title]="f.id ? '✏️ Modifica cliente' : '➕ Nuovo cliente'"
        [wide]="true"
        (closed)="form.set(null)"
      >
        <div class="infobox">
          📅 Classificazione valida per l'anno <b>{{ st.anno() }}</b
          >.
        </div>
        <div class="form-grid">
          <label class="f full"
            >Nome / Ragione sociale *<input class="input" [(ngModel)]="f.nome"
          /></label>
          <label class="f"
            >Codice fiscale<input class="input" [(ngModel)]="f.codice_fiscale"
          /></label>
          <label class="f">Partita IVA<input class="input" [(ngModel)]="f.partita_iva" /></label>
          <label class="f">Referente<input class="input" [(ngModel)]="f.referente" /></label>
          <label class="f">Email<input class="input" type="email" [(ngModel)]="f.email" /></label>
          <label class="f">PEC<input class="input" [(ngModel)]="f.pec" /></label>
          <label class="f">Telefono<input class="input" [(ngModel)]="f.telefono" /></label>
          <label class="f">Codice SDI<input class="input" [(ngModel)]="f.sdi" /></label>
          <label class="f full">IBAN<input class="input" [(ngModel)]="f.iban" /></label>
          <label class="f full">Indirizzo<input class="input" [(ngModel)]="f.indirizzo" /></label>
          <label class="f">Città<input class="input" [(ngModel)]="f.citta" /></label>
          <label class="f">CAP<input class="input" [(ngModel)]="f.cap" /></label>
          <label class="f"
            >Provincia<input class="input" maxlength="2" [(ngModel)]="f.provincia"
          /></label>
        </div>

        <div class="section-title">Classificazione {{ st.anno() }}</div>
        <div class="form-grid">
          <label class="f"
            >Tipologia *
            <select class="input" [(ngModel)]="f.tipologia" (ngModelChange)="onTipologia()">
              @for (t of tip.lista(); track t.id) {
                <option [value]="t.codice">
                  {{ tip.config()?.tipologie?.[t.codice]?.icon }} {{ t.nome }}
                </option>
              }
            </select>
          </label>
          <label class="f"
            >Regime / percorso *
            <select class="input" [(ngModel)]="f.percorso" (ngModelChange)="onPercorso()">
              @for (p of percorsi(); track p.codice) {
                <option [value]="p.codice">{{ labelPercorso(p) }}</option>
              }
            </select>
          </label>
          @if (percorsoCorrente()?.hasPer) {
            <label class="f"
              >Periodicità IVA *
              <select class="input" [(ngModel)]="f.periodicita">
                @for (p of tip.config()?.periodicitaIva ?? []; track p.value) {
                  <option [value]="p.value">{{ p.label }}</option>
                }
              </select>
            </label>
          }
          <label class="chk" style="align-self:end"
            ><input type="checkbox" [(ngModel)]="f.contabilita" /> Contabilità interna</label
          >
        </div>
        <label class="f" style="margin-top:12px"
          >Note<textarea class="input" [(ngModel)]="f.note"></textarea>
        </label>
        <ng-container footer>
          <button class="btn" (click)="form.set(null)">Annulla</button>
          <button class="btn primary" (click)="salva()">💾 Salva</button>
        </ng-container>
      </app-modal>
    }
  `,
})
export class ClientiPage {
  private sock = inject(SocketService);
  readonly st = inject(StateService);
  readonly tip = inject(TipologieService);
  private confirm = inject(ConfirmService);
  private toast = inject(ToastService);

  clienti = signal<Cliente[]>([]);
  q = signal('');
  ft = signal('');
  sel = signal(new Set<number>());
  form = signal<any | null>(null);

  filtrati = computed(() => {
    const q = norm(this.q()).trim();
    const ft = this.ft();
    return this.clienti()
      .filter((c) => !ft || c.tipologia_codice === ft)
      .filter(
        (c) =>
          !q ||
          [c.nome, c.codice_fiscale, c.partita_iva, c.email, c.referente, c.telefono].some((v) =>
            norm(v).includes(q),
          ),
      )
      .sort((a, b) => a.nome.localeCompare(b.nome, 'it', { sensitivity: 'base' }));
  });
  tuttiSel = computed(
    () => this.filtrati().length > 0 && this.filtrati().every((c) => this.sel().has(c.id)),
  );

  percorsi = computed<Percorso[]>(() => {
    const f = this.form();
    return (f && this.tip.config()?.percorsi[f.tipologia]) || [];
  });
  percorsoCorrente = computed(() => {
    const f = this.form();
    return this.percorsi().find((p) => p.codice === f?.percorso) ?? null;
  });

  constructor() {
    this.tip.load().catch(() => this.toast.error('Impossibile caricare le tipologie'));
    effect(() => {
      this.st.anno();
      untracked(() => this.load());
    });
    this.sock
      .onBroadcast('broadcast:clienti_updated')
      .pipe(takeUntilDestroyed())
      .subscribe(() => this.load());
  }

  async load() {
    const res = await this.sock.call<Cliente[]>('get:clienti', { anno: this.st.anno() });
    if (res) this.clienti.set(res.data ?? []);
  }

  labelPercorso(p: Percorso) {
    return [p.col2Label, p.col3Label].filter(Boolean).join(' · ') || p.sepLabel || p.codice;
  }

  toggleSel(id: number) {
    this.sel.update((s) => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  }
  toggleTutti() {
    this.sel.set(this.tuttiSel() ? new Set() : new Set(this.filtrati().map((c) => c.id)));
  }

  async nuovo() {
    await this.tip.load();
    const t = this.tip.lista()[0]?.codice ?? 'PF';
    this.form.set({
      ...VUOTO(),
      tipologia: t,
      percorso: this.tip.config()!.percorsi[t]?.[0]?.codice ?? '',
      periodicita: '',
    });
    this.onPercorso();
  }

  async modifica(c: Cliente) {
    await this.tip.load();
    const t = c.tipologia_codice ?? this.tip.lista()[0]?.codice ?? 'PF';
    const lista = this.tip.config()!.percorsi[t] ?? [];
    const p =
      lista.find((x) => x.codice === c.sottotipologia_codice) ??
      lista.find(
        (x) =>
          (x.col2Label ?? null) === (c.col2_value ?? null) &&
          (x.col3Label ?? null) === (c.col3_value ?? null),
      ) ??
      lista[0];
    this.form.set({
      ...VUOTO(),
      ...Object.fromEntries(Object.keys(VUOTO()).map((k) => [k, (c as any)[k] ?? ''])),
      contabilita: !!c.contabilita,
      id: c.id,
      tipologia: t,
      percorso: p?.codice ?? '',
      periodicita: c.periodicita ?? '',
    });
  }

  onTipologia() {
    const f = this.form()!;
    f.percorso = this.tip.config()!.percorsi[f.tipologia]?.[0]?.codice ?? '';
    this.onPercorso();
  }

  onPercorso() {
    const f = this.form()!;
    const p = this.tip.config()!.percorsi[f.tipologia]?.find((x) => x.codice === f.percorso);
    if (p?.hasPer) {
      if (!['mensile', 'trimestrale'].includes(f.periodicita)) f.periodicita = 'trimestrale';
    } else f.periodicita = p ? 'annuale' : '';
    this.form.set({ ...f });
  }

  async salva() {
    const f = this.form()!;
    if (!f.nome.trim()) return this.toast.error('Il nome è obbligatorio');
    const t: Tipologia | undefined = this.tip.lista().find((x) => x.codice === f.tipologia);
    const p = this.percorsoCorrente();
    if (!t || !p) return this.toast.error('Seleziona tipologia e regime');
    const sotto = t.sottotipologie.find((s) => s.codice === p.codice);
    const nz = (v: string, fn: (s: string) => string = (s) => s) =>
      v?.toString().trim() ? fn(v.toString().trim()) : null;
    const data = {
      id: f.id,
      anno: this.st.anno(),
      nome: f.nome.trim(),
      id_tipologia: t.id,
      id_sottotipologia: sotto?.id ?? null,
      col2_value: p.col2Label,
      col3_value: p.col3Label,
      periodicita: f.periodicita || null,
      codice_fiscale: nz(f.codice_fiscale, (s) => s.toUpperCase()),
      partita_iva: nz(f.partita_iva, (s) => s.replace(/[^0-9]/g, '')),
      email: nz(f.email),
      telefono: nz(f.telefono),
      indirizzo: nz(f.indirizzo),
      citta: nz(f.citta),
      cap: nz(f.cap, (s) => s.replace(/[^0-9]/g, '')),
      provincia: nz(f.provincia, (s) => s.toUpperCase()),
      pec: nz(f.pec),
      sdi: nz(f.sdi, (s) => s.toUpperCase()),
      iban: nz(f.iban, (s) => s.toUpperCase().replace(/\s/g, '')),
      referente: nz(f.referente),
      note: nz(f.note),
      contabilita: f.contabilita ? 1 : 0,
    };
    const res = await this.sock.call(f.id ? 'update:cliente' : 'create:cliente', data);
    if (res) this.form.set(null);
  }

  async elimina(c: Cliente) {
    const chk = await this.sock.call<any>('check:clienti:bulk', { ids: [c.id] });
    const r = chk?.['results']?.[0];
    if (r && !r.canDelete) {
      this.toast.error(
        `Impossibile eliminare «${c.nome}»: ha ${r.adempimentiCount} adempimenti associati. Rimuovili prima dallo scadenzario.`,
      );
      return;
    }
    if (
      !(await this.confirm.ask(
        `Eliminare il cliente "${c.nome}"? Potrai recuperarlo dal cestino.`,
        { danger: true, okLabel: 'Elimina' },
      ))
    )
      return;
    await this.sock.call('delete:cliente', { id: c.id });
    this.sel.update((s) => {
      const n = new Set(s);
      n.delete(c.id);
      return n;
    });
  }

  async eliminaSelezionati() {
    const ids = [...this.sel()];
    if (
      !(await this.confirm.ask(
        `Eliminare ${ids.length} clienti selezionati? Quelli con adempimenti associati verranno saltati.`,
        { danger: true, okLabel: 'Elimina' },
      ))
    )
      return;
    await this.sock.call('delete:clienti:bulk', { ids });
    this.sel.set(new Set());
  }
}
