import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Adempimento } from '../core/models';
import { SocketService } from '../core/socket.service';
import { ConfirmService } from '../core/confirm.service';
import { ToastService } from '../core/toast.service';
import { Modal } from '../shared/modal';
import { norm, rateLabels } from '../core/utils';

@Component({
  selector: 'app-adempimenti',
  standalone: true,
  imports: [FormsModule, Modal],
  template: `
    <div class="page">
      <div class="toolbar no-print">
        <input
          class="input"
          style="width:260px"
          placeholder="🔍 Cerca codice o nome…"
          [ngModel]="q()"
          (ngModelChange)="q.set($event)"
        />
        <select class="input" [ngModel]="tipo()" (ngModelChange)="tipo.set($event)">
          <option value="">Tutte le scadenze</option>
          <option value="annuale">Annuale</option>
          <option value="semestrale">Semestrale</option>
          <option value="trimestrale">Trimestrale</option>
          <option value="mensile">Mensile</option>
        </select>
        <span class="muted">{{ filtrati().length }} adempimenti</span>
        <span class="grow"></span>
        @if (sel().size) {
          <button class="btn danger" (click)="eliminaSel()">🗑️ Elimina {{ sel().size }}</button>
        }
        <button class="btn primary" (click)="nuovo()">+ Nuovo</button>
      </div>

      <div class="table-wrap">
        <table class="t">
          <thead>
            <tr>
              <th style="width:30px">
                <input type="checkbox" [checked]="tuttiSel()" (change)="toggleTutti()" />
              </th>
              <th>Codice</th>
              <th>Nome</th>
              <th>Scadenza</th>
              <th>Caratteristiche</th>
              <th>Anno validità</th>
              <th class="no-print"></th>
            </tr>
          </thead>
          <tbody>
            @for (a of filtrati(); track a.id) {
              <tr [class.sel]="sel().has(a.id)">
                <td>
                  <input type="checkbox" [checked]="sel().has(a.id)" (change)="toggleSel(a.id)" />
                </td>
                <td>
                  <code>{{ a.codice }}</code>
                </td>
                <td>
                  <b>{{ a.nome }}</b>
                  @if (a.descrizione) {
                    <div class="muted small">{{ a.descrizione }}</div>
                  }
                </td>
                <td>
                  <span class="pill">{{ a.scadenza_tipo }}</span>
                </td>
                <td>
                  @if (a.is_contabilita) {
                    <span class="pill">📒 Contabilità</span>
                  }
                  @if (a.has_rate) {
                    <span class="pill">💶 Rate</span>
                  }
                  @if (a.is_checkbox) {
                    <span class="pill">☑️ Checkbox</span>
                  }
                  @if (a.is_text_only) {
                    <span class="pill">📝 Solo testo</span>
                  }
                </td>
                <td>{{ a.anno_validita || 'sempre' }}</td>
                <td class="actions no-print">
                  <button class="btn sm icon" (click)="modifica(a)">✏️</button>
                  <button class="btn sm icon danger" (click)="elimina(a)">🗑️</button>
                </td>
              </tr>
            } @empty {
              <tr>
                <td colspan="7">
                  <div class="empty">
                    <div class="ic">📋</div>
                    Nessun adempimento.
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
        [title]="f.id ? '✏️ Modifica adempimento' : '➕ Nuovo adempimento'"
        (closed)="form.set(null)"
      >
        @if (!f.id) {
          <div class="infobox">
            Alla creazione l'adempimento viene generato per tutti i clienti attivi dell'anno di
            validità (o dell'anno corrente).
          </div>
        }
        <div class="form-grid">
          <label class="f">Codice *<input class="input" [(ngModel)]="f.codice" /></label>
          <label class="f">Nome *<input class="input" [(ngModel)]="f.nome" /></label>
          <label class="f"
            >Scadenza
            <select class="input" [(ngModel)]="f.scadenza_tipo">
              <option value="annuale">Annuale</option>
              <option value="semestrale">Semestrale</option>
              <option value="trimestrale">Trimestrale</option>
              <option value="mensile">Mensile</option>
            </select></label
          >
          <label class="f"
            >Anno validità (vuoto = sempre)<input
              class="input"
              type="number"
              [(ngModel)]="f.anno_validita"
          /></label>
          <label class="f full"
            >Descrizione<input class="input" [(ngModel)]="f.descrizione"
          /></label>
          <label class="chk"
            ><input type="checkbox" [(ngModel)]="f.is_contabilita" /> Contabilità</label
          >
          <label class="chk"
            ><input type="checkbox" [(ngModel)]="f.has_rate" /> Ha rate (saldo / acconti)</label
          >
          <label class="chk"
            ><input type="checkbox" [(ngModel)]="f.is_checkbox" /> Solo spunta</label
          >
          <label class="chk"
            ><input type="checkbox" [(ngModel)]="f.is_text_only" /> Solo testo</label
          >
          @if (f.has_rate) {
            <label class="f full"
              >Etichette rate (separate da virgola)<input
                class="input"
                [(ngModel)]="f.rate_labels"
                placeholder="Saldo, 1° acconto, 2° acconto"
            /></label>
          }
        </div>
        <ng-container footer>
          <button class="btn" (click)="form.set(null)">Annulla</button>
          <button class="btn primary" (click)="salva()">💾 Salva</button>
        </ng-container>
      </app-modal>
    }
  `,
})
export class AdempimentiPage {
  private sock = inject(SocketService);
  private confirm = inject(ConfirmService);
  private toast = inject(ToastService);
  lista = signal<Adempimento[]>([]);
  q = signal('');
  tipo = signal('');
  sel = signal(new Set<number>());
  form = signal<any | null>(null);

  filtrati = computed(() => {
    const q = norm(this.q()).trim();
    return this.lista().filter(
      (a) =>
        (!this.tipo() || a.scadenza_tipo === this.tipo()) &&
        (!q || norm(a.nome).includes(q) || norm(a.codice).includes(q)),
    );
  });
  tuttiSel = computed(
    () => this.filtrati().length > 0 && this.filtrati().every((a) => this.sel().has(a.id)),
  );

  constructor() {
    this.load();
    this.sock
      .onBroadcast('broadcast:adempimenti_updated')
      .pipe(takeUntilDestroyed())
      .subscribe(() => this.load());
  }

  async load() {
    const r = await this.sock.call<Adempimento[]>('get:adempimenti');
    if (r) this.lista.set(r.data ?? []);
  }
  toggleSel(id: number) {
    this.sel.update((s) => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  }
  toggleTutti() {
    this.sel.set(this.tuttiSel() ? new Set() : new Set(this.filtrati().map((a) => a.id)));
  }

  nuovo() {
    this.form.set({
      codice: '',
      nome: '',
      descrizione: '',
      scadenza_tipo: 'annuale',
      anno_validita: null,
      is_contabilita: false,
      has_rate: false,
      is_checkbox: false,
      is_text_only: false,
      rate_labels: '',
    });
  }
  modifica(a: Adempimento) {
    this.form.set({
      ...a,
      is_contabilita: !!a.is_contabilita,
      has_rate: !!a.has_rate,
      is_checkbox: !!a.is_checkbox,
      is_text_only: !!a.is_text_only,
      rate_labels: rateLabels(a.rate_labels).join(', '),
    });
  }

  async salva() {
    const f = this.form()!;
    if (!f.codice?.trim() || !f.nome?.trim())
      return this.toast.error('Codice e nome sono obbligatori');
    const labels = f.has_rate
      ? String(f.rate_labels || '')
          .split(',')
          .map((s: string) => s.trim())
          .filter(Boolean)
      : [];
    const data = {
      id: f.id,
      codice: f.codice.trim(),
      nome: f.nome.trim(),
      descrizione: f.descrizione || null,
      scadenza_tipo: f.scadenza_tipo,
      is_contabilita: f.is_contabilita ? 1 : 0,
      has_rate: f.has_rate ? 1 : 0,
      is_checkbox: f.is_checkbox ? 1 : 0,
      is_text_only: f.is_text_only ? 1 : 0,
      rate_labels: labels.length ? labels : null,
      anno_validita: f.anno_validita || null,
    };
    const res = await this.sock.call(f.id ? 'update:adempimento' : 'create:adempimento', data);
    if (res) {
      this.form.set(null);
      this.toast.success(
        f.id ? 'Adempimento aggiornato' : `Adempimento creato (generati: ${res['generati'] ?? 0})`,
      );
    }
  }

  async elimina(a: Adempimento) {
    const chk = await this.sock.call<any>('check:adempimenti:bulk', { ids: [a.id] });
    const r = chk?.['results']?.[0];
    if (r && !r.canDelete) {
      this.toast.error(
        `Impossibile eliminare «${a.nome}»: è assegnato a ${r.clientiCount} righe cliente. Rimuovilo prima dai clienti (Dashboard → Applica / rimuovi).`,
      );
      return;
    }
    if (
      !(await this.confirm.ask(`Eliminare «${a.nome}»? Potrai recuperarlo dal cestino.`, {
        danger: true,
        okLabel: 'Elimina',
      }))
    )
      return;
    await this.sock.call('delete:adempimento', { id: a.id });
  }

  async eliminaSel() {
    const ids = [...this.sel()];
    if (
      !(await this.confirm.ask(
        `Eliminare ${ids.length} adempimenti? Quelli ancora assegnati ai clienti verranno saltati.`,
        { danger: true, okLabel: 'Elimina' },
      ))
    )
      return;
    await this.sock.call('delete:adempimenti:bulk', { ids });
    this.sel.set(new Set());
  }
}
