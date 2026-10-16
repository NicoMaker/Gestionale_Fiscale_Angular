import { Component, computed, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdempimentoCliente } from '../core/models';
import { SocketService } from '../core/socket.service';
import { Modal } from './modal';
import { STATI, oggiISO, periodoLabel, rateLabels } from '../core/utils';

/** Modale di modifica di una riga adempimento-cliente (usata da Scadenzario, Globale, Sintesi). */
@Component({
  selector: 'app-adp-edit',
  standalone: true,
  imports: [FormsModule, Modal],
  template: `
    <app-modal [title]="'✏️ ' + row().adempimento_nome" (closed)="closed.emit()">
      <div class="infobox">
        <b>{{ row().cliente_nome }}</b> · {{ periodo() }} · anno {{ row().anno }}
      </div>
      <div class="form-grid">
        <label class="f">Stato
          <select class="input" [(ngModel)]="m.stato" (ngModelChange)="onStato()">
            @for (s of stati; track s.value) { <option [value]="s.value">{{ s.icon }} {{ s.label }}</option> }
          </select>
        </label>
        <label class="f">Data scadenza
          <input class="input" type="date" [(ngModel)]="m.data_scadenza">
        </label>
        <label class="f">Data completamento
          <input class="input" type="date" [(ngModel)]="m.data_completamento">
        </label>

        @if (row().has_rate) {
          <label class="f">{{ etichette()[0] || 'Saldo' }} (€)
            <input class="input" type="number" step="0.01" [(ngModel)]="m.importo_saldo"></label>
          <label class="f">{{ etichette()[1] || '1° acconto' }} (€)
            <input class="input" type="number" step="0.01" [(ngModel)]="m.importo_acconto1"></label>
          <label class="f">{{ etichette()[2] || '2° acconto' }} (€)
            <input class="input" type="number" step="0.01" [(ngModel)]="m.importo_acconto2"></label>
        } @else if (row().is_contabilita) {
          <label class="f">Importo contabilità (€)
            <input class="input" type="number" step="0.01" [(ngModel)]="m.importo_contabilita"></label>
          <label class="f">Importo IVA (€)
            <input class="input" type="number" step="0.01" [(ngModel)]="m.importo_iva"></label>
          <label class="chk"><input type="checkbox" [(ngModel)]="m.cont_completata"> Contabilità completata</label>
          <label class="chk"><input type="checkbox" [(ngModel)]="m.iva_completata"> IVA completata</label>
        } @else if (!row().is_checkbox) {
          <label class="f">Importo (€)
            <input class="input" type="number" step="0.01" [(ngModel)]="m.importo"></label>
        }
        <label class="f full">Note
          <textarea class="input" [(ngModel)]="m.note"></textarea></label>
      </div>
      <ng-container footer>
        <button class="btn" (click)="closed.emit()">Annulla</button>
        <button class="btn primary" [disabled]="saving()" (click)="save()">💾 Salva</button>
      </ng-container>
    </app-modal>
  `,
})
export class AdpEdit {
  row = input.required<AdempimentoCliente>();
  closed = output<void>();
  saved = output<void>();
  private sock = inject(SocketService);
  readonly stati = STATI;
  saving = signal(false);
  periodo = computed(() => periodoLabel(this.row()));
  etichette = computed(() => rateLabels(this.row().rate_labels));
  m: any = {};

  ngOnInit() {
    const r = this.row();
    this.m = {
      id: r.id,
      stato: r.stato,
      data_scadenza: r.data_scadenza?.slice(0, 10) ?? '',
      data_completamento: r.data_completamento?.slice(0, 10) ?? '',
      note: r.note ?? '',
      importo: r.importo ?? null,
      importo_saldo: r.importo_saldo ?? null,
      importo_acconto1: r.importo_acconto1 ?? null,
      importo_acconto2: r.importo_acconto2 ?? null,
      importo_iva: r.importo_iva ?? null,
      importo_contabilita: r.importo_contabilita ?? null,
      cont_completata: !!r.cont_completata,
      iva_completata: !!r.iva_completata,
    };
  }

  onStato() {
    if (this.m.stato === 'completato' && !this.m.data_completamento) this.m.data_completamento = oggiISO();
    if (this.m.stato !== 'completato') this.m.data_completamento = '';
  }

  async save() {
    this.saving.set(true);
    const res = await this.sock.call('update:adempimento_stato', this.m);
    this.saving.set(false);
    if (res) this.saved.emit();
  }
}
