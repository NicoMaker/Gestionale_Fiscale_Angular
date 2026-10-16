import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Cliente, Nota } from '../core/models';
import { SocketService } from '../core/socket.service';
import { StateService } from '../core/state.service';
import { ConfirmService } from '../core/confirm.service';
import { ToastService } from '../core/toast.service';
import { Modal } from '../shared/modal';
import { fmtDataOra, norm } from '../core/utils';

@Component({
  selector: 'app-note',
  standalone: true,
  imports: [FormsModule, Modal],
  template: `
    <div class="page">
      <div class="toolbar no-print">
        <button class="btn" [class.primary]="tipo() === 'studio'" (click)="tipo.set('studio')">
          🏢 Studio
        </button>
        <button class="btn" [class.primary]="tipo() === 'cliente'" (click)="tipo.set('cliente')">
          👤 Cliente
        </button>
        <input
          class="input"
          style="width:240px"
          placeholder="🔍 Cerca nelle note…"
          [ngModel]="q()"
          (ngModelChange)="q.set($event)"
        />
        <span class="grow"></span>
        <button class="btn primary" (click)="nuova()">+ Nota {{ tipo() }}</button>
      </div>

      <div class="grid cols2">
        @for (n of filtrate(); track n.id) {
          <div class="card">
            <div class="row">
              <h3 class="grow" style="margin:0">{{ n.titolo || 'Senza titolo' }}</h3>
              <button class="btn sm icon no-print" (click)="modifica(n)">✏️</button>
              <button class="btn sm icon danger no-print" (click)="elimina(n)">🗑️</button>
            </div>
            @if (n.cliente_nome) {
              <span class="pill">👤 {{ n.cliente_nome }}</span>
            }
            <p style="white-space:pre-wrap">{{ n.contenuto }}</p>
            @if (n.allegati) {
              <div class="small muted">📎 {{ n.allegati }}</div>
            }
            <div class="small muted">
              Modificata {{ fmtDataOra(n.data_modifica || n.data_creazione) }}
            </div>
          </div>
        } @empty {
          <div class="empty" style="grid-column:1/-1">
            <div class="ic">📝</div>
            Nessuna nota.
          </div>
        }
      </div>
    </div>

    @if (form(); as f) {
      <app-modal
        [title]="(f.id ? '✏️ Modifica nota ' : '➕ Nuova nota ') + f.tipo"
        (closed)="form.set(null)"
      >
        <div class="form-grid">
          <label class="f full">Titolo<input class="input" [(ngModel)]="f.titolo" /></label>
          @if (f.tipo === 'cliente') {
            <label class="f full"
              >Cliente *
              <select class="input" [(ngModel)]="f.id_cliente">
                <option [ngValue]="null">— Seleziona —</option>
                @for (c of clienti(); track c.id) {
                  <option [ngValue]="c.id">{{ c.nome }}</option>
                }
              </select></label
            >
          }
          <label class="f full"
            >Contenuto<textarea
              class="input"
              style="min-height:200px"
              [(ngModel)]="f.contenuto"
            ></textarea>
          </label>
          <label class="f full"
            >Allegati / riferimenti<input
              class="input"
              [(ngModel)]="f.allegati"
              placeholder="Link o nomi file"
          /></label>
        </div>
        <ng-container footer>
          <button class="btn" (click)="form.set(null)">Annulla</button>
          <button class="btn primary" (click)="salva()">💾 Salva</button>
        </ng-container>
      </app-modal>
    }
  `,
})
export class NotePage {
  private sock = inject(SocketService);
  private st = inject(StateService);
  private confirm = inject(ConfirmService);
  private toast = inject(ToastService);
  readonly fmtDataOra = fmtDataOra;
  note = signal<Nota[]>([]);
  clienti = signal<Cliente[]>([]);
  tipo = signal<'studio' | 'cliente'>('studio');
  q = signal('');
  form = signal<any | null>(null);

  filtrate = computed(() => {
    const q = norm(this.q()).trim();
    return this.note().filter(
      (n) =>
        n.tipo === this.tipo() &&
        (!q ||
          [n.titolo, n.contenuto, n.cliente_nome, n.allegati].some((v) => norm(v).includes(q))),
    );
  });

  constructor() {
    this.load();
    this.sock
      .call<Cliente[]>('get:clienti', { anno: this.st.anno() })
      .then((r) => r && this.clienti.set(r.data ?? []));
    this.sock
      .onBroadcast('broadcast:pagina_bianca_updated')
      .pipe(takeUntilDestroyed())
      .subscribe(() => this.load());
  }

  async load() {
    const r = await this.sock.call<Nota[]>('get:pagina_bianca', {});
    if (r) this.note.set(r.data ?? []);
  }
  nuova() {
    this.form.set({ tipo: this.tipo(), titolo: '', contenuto: '', allegati: '', id_cliente: null });
  }
  modifica(n: Nota) {
    this.form.set({ ...n });
  }

  async salva() {
    const f = this.form()!;
    if (f.tipo === 'cliente' && !f.id_cliente) return this.toast.error('Seleziona un cliente');
    if (!f.titolo?.trim() && !f.contenuto?.trim())
      return this.toast.error('Inserisci titolo o contenuto');
    const data = {
      id: f.id,
      tipo: f.tipo,
      titolo: f.titolo?.trim() || '',
      contenuto: f.contenuto || null,
      allegati: f.allegati || null,
      id_cliente: f.tipo === 'cliente' ? f.id_cliente : null,
    };
    const res = await this.sock.call(f.id ? 'update:pagina_bianca' : 'create:pagina_bianca', data);
    if (res) this.form.set(null);
  }
  async elimina(n: Nota) {
    if (
      await this.confirm.ask(`Eliminare la nota «${n.titolo || 'senza titolo'}»?`, {
        danger: true,
        okLabel: 'Elimina',
      })
    )
      await this.sock.call('delete:pagina_bianca', { id: n.id });
  }
}
