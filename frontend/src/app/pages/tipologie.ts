import { Component, inject } from '@angular/core';
import { TipologieService } from '../core/tipologie.service';
import { ToastService } from '../core/toast.service';

@Component({
  selector: 'app-tipologie',
  standalone: true,
  template: `
    <div class="page">
      <div class="infobox">
        Le tipologie e i regimi sono predefiniti. Il regime di ogni cliente si imposta in
        <b>Clienti</b> e vale per anno.
      </div>
      <div class="grid cols2">
        @for (t of tip.lista(); track t.id) {
          <div
            class="card"
            [style.border-top]="
              '3px solid ' +
              (tip.config()?.tipologie?.[t.codice]?.color || t.colore || 'var(--accent)')
            "
          >
            <h3>
              {{ tip.config()?.tipologie?.[t.codice]?.icon }} {{ t.nome }}
              <span class="pill">{{ t.codice }}</span>
            </h3>
            @if (t.descrizione) {
              <p class="muted" style="margin-top:0">{{ t.descrizione }}</p>
            }
            <div class="section-title">Regimi / percorsi</div>
            <div class="col" style="gap:6px">
              @for (p of tip.config()?.percorsi?.[t.codice] ?? []; track p.codice) {
                <div class="row">
                  @if (p.col2Label) {
                    <span
                      class="pill"
                      [style.color]="tip.config()?.col2Colors?.[p.col2Label] || ''"
                      >{{ p.col2Label }}</span
                    >
                  }
                  @if (p.col3Label) {
                    <span
                      class="pill"
                      [style.color]="tip.config()?.col3Colors?.[p.col3Label] || ''"
                      >{{ p.col3Label }}</span
                    >
                  }
                  @if (p.hasPer) {
                    <span class="pill">IVA mensile / trimestrale</span>
                  }
                  @if (p.isForfettario) {
                    <span class="pill">forfettario · annuale</span>
                  }
                  <code class="muted small">{{ p.codice }}</code>
                </div>
              }
            </div>
          </div>
        }
      </div>
    </div>
  `,
})
export class TipologiePage {
  readonly tip = inject(TipologieService);
  constructor() {
    this.tip.load(true).catch(() => inject(ToastService).error('Errore caricamento tipologie'));
  }
}
