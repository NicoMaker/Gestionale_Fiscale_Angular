import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Appunto, Cliente } from '../core/models';
import { SocketService } from '../core/socket.service';
import { StateService } from '../core/state.service';
import { ConfirmService } from '../core/confirm.service';
import { ToastService } from '../core/toast.service';
import { Modal } from '../shared/modal';
import { fmtData, norm, oggiISO } from '../core/utils';

@Component({
  selector: 'app-appunti',
  standalone: true,
  imports: [FormsModule, Modal],
  template: `
    <div class="page">
      <div class="toolbar no-print">
        <input class="input" style="width:240px" placeholder="🔍 Cerca…" [ngModel]="q()" (ngModelChange)="q.set($event)">
        <select class="input" [ngModel]="stato()" (ngModelChange)="stato.set($event)">
          <option value="aperti">Aperti</option><option value="completati">Completati</option><option value="tutti">Tutti</option>
        </select>
        <select class="input" [ngModel]="prio()" (ngModelChange)="prio.set($event)">
          <option value="">Ogni priorità</option><option value="alta">Alta</option><option value="media">Media</option><option value="bassa">Bassa</option>
        </select>
        <span class="muted">{{ filtrati().length }} scadenze · {{ scaduti() }} scadute</span>
        <span class="grow"></span>
        @if (sel().size) { <button class="btn danger" (click)="eliminaSel()">🗑️ Elimina {{ sel().size }}</button> }
        <button class="btn primary" (click)="nuovo()">+ Scadenza</button>
      </div>

      <div class="table-wrap">
        <table class="t">
          <thead><tr><th style="width:30px"></th><th style="width:34px">✓</th><th>Titolo</th><th>Cliente</th><th>Scadenza</th><th>Priorità</th><th class="no-print"></th></tr></thead>
          <tbody>
            @for (a of filtrati(); track a.id) {
              <tr [class.done]="a.completato">
                <td><input type="checkbox" [checked]="sel().has(a.id)" (change)="toggleSel(a.id)"></td>
                <td><input type="checkbox" [checked]="!!a.completato" (change)="toggleCompletato(a)"></td>
                <td><b [style.text-decoration]="a.completato ? 'line-through' : 'none'">{{ a.titolo }}</b>
                  @if (a.contenuto) { <div class="muted small" style="white-space:pre-line">{{ a.contenuto }}</div> }</td>
                <td>{{ a.cliente_nome || '—' }}</td>
                <td class="nowrap">{{ fmtData(a.data_scadenza) }} @if (!a.completato && a.data_scadenza && a.data_scadenza < oggi) { <span class="pill late">scaduta</span> }</td>
                <td><span class="pill" [class]="'pill ' + a.priorita">{{ a.priorita }}</span></td>
                <td class="actions no-print">
                  <button class="btn sm icon" (click)="modifica(a)">✏️</button>
                  <button class="btn sm icon danger" (click)="elimina(a)">🗑️</button>
                </td>
              </tr>
            } @empty { <tr><td colspan="7"><div class="empty"><div class="ic">⏰</div>Nessuna scadenza.</div></td></tr> }
          </tbody>
        </table>
      </div>
    </div>

    @if (form(); as f) {
      <app-modal [title]="f.id ? '✏️ Modifica scadenza' : '➕ Nuova scadenza studio'" (closed)="form.set(null)">
        <div class="form-grid">
          <label class="f full">Titolo *<input class="input" [(ngModel)]="f.titolo"></label>
          <label class="f">Cliente (opzionale)
            <select class="input" [(ngModel)]="f.id_cliente">
              <option [ngValue]="null">— nessuno —</option>
              @for (c of clienti(); track c.id) { <option [ngValue]="c.id">{{ c.nome }}</option> }
            </select></label>
          <label class="f">Data scadenza<input class="input" type="date" [(ngModel)]="f.data_scadenza"></label>
          <label class="f">Priorità
            <select class="input" [(ngModel)]="f.priorita"><option value="alta">Alta</option><option value="media">Media</option><option value="bassa">Bassa</option></select></label>
          <label class="chk" style="align-self:end"><input type="checkbox" [(ngModel)]="f.completato"> Completata</label>
          <label class="f full">Dettagli<textarea class="input" [(ngModel)]="f.contenuto"></textarea></label>
        </div>
        <ng-container footer>
          <button class="btn" (click)="form.set(null)">Annulla</button>
          <button class="btn primary" (click)="salva()">💾 Salva</button>
        </ng-container>
      </app-modal>
    }
  `,
})
export class AppuntiPage {
  private sock = inject(SocketService);
  private st = inject(StateService);
  private confirm = inject(ConfirmService);
  private toast = inject(ToastService);
  readonly fmtData = fmtData;
  readonly oggi = oggiISO();
  lista = signal<Appunto[]>([]);
  clienti = signal<Cliente[]>([]);
  q = signal(''); stato = signal('aperti'); prio = signal('');
  sel = signal(new Set<number>());
  form = signal<any | null>(null);

  filtrati = computed(() => {
    const q = norm(this.q()).trim();
    return this.lista()
      .filter((a) => this.stato() === 'tutti' || (this.stato() === 'aperti' ? !a.completato : !!a.completato))
      .filter((a) => !this.prio() || a.priorita === this.prio())
      .filter((a) => !q || [a.titolo, a.contenuto, a.cliente_nome].some((v) => norm(v).includes(q)));
  });
  scaduti = computed(() => this.lista().filter((a) => !a.completato && a.data_scadenza && a.data_scadenza < this.oggi).length);

  constructor() {
    this.load();
    this.sock.call<Cliente[]>('get:clienti', { anno: this.st.anno() }).then((r) => r && this.clienti.set(r.data ?? []));
    this.sock.onBroadcast('broadcast:appunti_updated').pipe(takeUntilDestroyed()).subscribe(() => this.load());
  }

  async load() { const r = await this.sock.call<Appunto[]>('get:appunti', {}); if (r) this.lista.set(r.data ?? []); }
  toggleSel(id: number) { this.sel.update((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; }); }
  nuovo() { this.form.set({ titolo: '', contenuto: '', id_cliente: null, data_scadenza: '', priorita: 'media', completato: false }); }
  modifica(a: Appunto) { this.form.set({ ...a, data_scadenza: a.data_scadenza?.slice(0, 10) ?? '', completato: !!a.completato }); }

  async salva() {
    const f = this.form()!;
    if (!f.titolo?.trim()) return this.toast.error('Il titolo è obbligatorio');
    const data = { id: f.id, titolo: f.titolo.trim(), contenuto: f.contenuto || null, id_cliente: f.id_cliente || null, data_scadenza: f.data_scadenza || null, priorita: f.priorita, completato: f.completato ? 1 : 0 };
    const res = await this.sock.call(f.id ? 'update:appunto' : 'create:appunto', data);
    if (res) this.form.set(null);
  }
  toggleCompletato(a: Appunto) { return this.sock.call('toggle:appunto_completato', { id: a.id, completato: a.completato ? 0 : 1 }); }
  async elimina(a: Appunto) {
    if (await this.confirm.ask(`Eliminare «${a.titolo}»?`, { danger: true, okLabel: 'Elimina' })) await this.sock.call('delete:appunto', { id: a.id });
  }
  async eliminaSel() {
    const ids = [...this.sel()];
    if (!(await this.confirm.ask(`Eliminare ${ids.length} scadenze?`, { danger: true, okLabel: 'Elimina' }))) return;
    await this.sock.call('delete:appunti:bulk', { ids });
    this.sel.set(new Set());
  }
}
