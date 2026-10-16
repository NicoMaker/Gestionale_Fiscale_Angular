import { Component } from '@angular/core';
import { NAV } from '../app';

@Component({
  selector: 'app-scorciatoie',
  standalone: true,
  template: `
    <div class="page">
      <div class="card" style="max-width:640px">
        <h3>⌨️ Scorciatoie da tastiera</h3>
        <p class="muted">Funzionano quando non stai scrivendo in un campo di testo.</p>
        <table class="t">
          <tbody>
            <tr>
              <td><kbd>t</kbd></td>
              <td>Cambia tema chiaro / scuro</td>
            </tr>
            <tr>
              <td><kbd>?</kbd></td>
              <td>Apri questa pagina</td>
            </tr>
            <tr>
              <td><kbd>Esc</kbd></td>
              <td>Chiudi finestra aperta</td>
            </tr>
            @for (n of nav; track n.path) {
              <tr>
                <td>
                  <kbd>g</kbd> poi <kbd>{{ n.key }}</kbd>
                </td>
                <td>{{ n.icon }} {{ n.label }}</td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    </div>
  `,
})
export class ScorciatoiePage {
  readonly nav = NAV;
}
