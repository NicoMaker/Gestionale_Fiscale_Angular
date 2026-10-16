import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CestinoItem } from '../core/models';
import { SocketService } from '../core/socket.service';
import { ConfirmService } from '../core/confirm.service';
import { ToastService } from '../core/toast.service';
import { fmtDataOra, norm } from '../core/utils';

const ETICHETTE: Record<string, string> = {
  clienti: '👥 Cliente',
  adempimenti: '📋 Adempimento',
  adempimenti_cliente: '📅 Riga scadenzario',
  appunti: '⏰ Scadenza studio',
  pagina_bianca: '📝 Nota',
};

@Component({
  selector: 'app-cestino',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="page">
      <div class="infobox">
        Gli elementi eliminati restano nel cestino per un periodo limitato, poi vengono rimossi
        automaticamente.
      </div>
      <div class="toolbar no-print">
        <input
          class="input"
          style="width:240px"
          placeholder="🔍 Cerca…"
          [ngModel]="q()"
          (ngModelChange)="q.set($event)"
        />
        <select class="input" [ngModel]="tabella()" (ngModelChange)="tabella.set($event)">
          <option value="">Tutti i tipi</option>
          @for (t of tabelle; track t) {
            <option [value]="t">{{ etichetta(t) }}</option>
          }
        </select>
        <span class="muted">{{ filtrati().length }} elementi</span>
        <span class="grow"></span>
        @if (sel().size) {
          <button class="btn" (click)="ripristinaSel()">♻️ Ripristina {{ sel().size }}</button>
          <button class="btn danger" (click)="eliminaSel()">❌ Elimina {{ sel().size }}</button>
        }
        <button class="btn danger" [disabled]="!lista().length" (click)="svuota()">
          🧹 Svuota cestino
        </button>
      </div>

      <div class="table-wrap">
        <table class="t">
          <thead>
            <tr>
              <th style="width:30px">
                <input type="checkbox" [checked]="tuttiSel()" (change)="toggleTutti()" />
              </th>
              <th>Tipo</th>
              <th>Elemento</th>
              <th>Eliminato il</th>
              <th class="no-print"></th>
            </tr>
          </thead>
          <tbody>
            @for (i of filtrati(); track i.id) {
              <tr [class.sel]="sel().has(i.id)">
                <td>
                  <input type="checkbox" [checked]="sel().has(i.id)" (change)="toggleSel(i.id)" />
                </td>
                <td>
                  <span class="pill">{{ etichetta(i.tabella) }}</span>
                </td>
                <td>
                  <b>{{ titolo(i) }}</b>
                  <div class="muted small">{{ extra(i) }}</div>
                </td>
                <td class="nowrap">{{ fmtDataOra(i.data_eliminazione) }}</td>
                <td class="actions no-print">
                  <button class="btn sm" (click)="ripristina(i)">♻️ Ripristina</button>
                  <button class="btn sm icon danger" (click)="elimina(i)">❌</button>
                </td>
              </tr>
            } @empty {
              <tr>
                <td colspan="5">
                  <div class="empty">
                    <div class="ic">🗑️</div>
                    Il cestino è vuoto.
                  </div>
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    </div>
  `,
})
export class CestinoPage {
  private sock = inject(SocketService);
  private confirm = inject(ConfirmService);
  private toast = inject(ToastService);
  readonly fmtDataOra = fmtDataOra;
  lista = signal<CestinoItem[]>([]);
  q = signal('');
  tabella = signal('');
  sel = signal(new Set<number>());

  get tabelle() {
    return [...new Set(this.lista().map((i) => i.tabella))];
  }
  filtrati = computed(() => {
    const q = norm(this.q()).trim();
    return this.lista().filter(
      (i) =>
        (!this.tabella() || i.tabella === this.tabella()) &&
        (!q || norm(this.titolo(i)).includes(q) || norm(JSON.stringify(i.dati)).includes(q)),
    );
  });
  tuttiSel = computed(
    () => this.filtrati().length > 0 && this.filtrati().every((i) => this.sel().has(i.id)),
  );

  constructor() {
    this.load();
    this.sock
      .onBroadcast('broadcast:cestino_updated')
      .pipe(takeUntilDestroyed())
      .subscribe(() => this.load());
  }

  etichetta(t: string) {
    return ETICHETTE[t] ?? t;
  }
  titolo(i: CestinoItem): string {
    const d = i.dati || {};
    return d.nome || d.titolo || d.adempimento_nome || d.codice || `#${i.record_id}`;
  }
  extra(i: CestinoItem): string {
    const d = i.dati || {};
    return [d.codice, d.scadenza_tipo, d.codice_fiscale, d.anno, d.stato]
      .filter(Boolean)
      .join(' · ');
  }

  async load() {
    const r = await this.sock.call<CestinoItem[]>('get:cestino', {});
    if (r) {
      this.lista.set(r.data ?? []);
      this.sel.set(new Set());
    }
  }
  toggleSel(id: number) {
    this.sel.update((s) => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  }
  toggleTutti() {
    this.sel.set(this.tuttiSel() ? new Set() : new Set(this.filtrati().map((i) => i.id)));
  }

  async ripristina(i: CestinoItem) {
    const r = await this.sock.call('ripristina:cestino', { id: i.id });
    if (r) this.toast.success('Elemento ripristinato');
  }
  async elimina(i: CestinoItem) {
    if (
      await this.confirm.ask(`Eliminare definitivamente «${this.titolo(i)}»?`, {
        danger: true,
        okLabel: 'Elimina',
      })
    )
      await this.sock.call('delete:cestino_item', { id: i.id });
  }
  async ripristinaSel() {
    const r = await this.sock.call('ripristina:cestino:bulk', { ids: [...this.sel()] });
    if (r) this.toast.success('Ripristino completato');
  }
  async eliminaSel() {
    if (
      await this.confirm.ask(`Eliminare definitivamente ${this.sel().size} elementi?`, {
        danger: true,
        okLabel: 'Elimina',
      })
    )
      await this.sock.call('delete:cestino:bulk', { ids: [...this.sel()] });
  }
  async svuota() {
    if (
      await this.confirm.ask('Svuotare completamente il cestino? Operazione irreversibile.', {
        danger: true,
        okLabel: 'Svuota',
      })
    )
      await this.sock.call('svuota:cestino');
  }
}
