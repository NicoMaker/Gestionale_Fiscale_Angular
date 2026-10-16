import { Component, HostListener, computed, inject } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map } from 'rxjs/operators';
import { StateService } from './core/state.service';
import { SocketService } from './core/socket.service';
import { ToastService } from './core/toast.service';
import { ConfirmService } from './core/confirm.service';
import { Modal } from './shared/modal';

interface NavItem { path: string; label: string; icon: string; key: string; anno: boolean }

export const NAV: NavItem[] = [
  { path: 'dashboard', label: 'Dashboard', icon: '📊', key: 'd', anno: true },
  { path: 'clienti', label: 'Clienti', icon: '👥', key: 'c', anno: true },
  { path: 'scadenzario', label: 'Scadenzario cliente', icon: '📅', key: 's', anno: true },
  { path: 'globale', label: 'Vista globale', icon: '🌐', key: 'g', anno: true },
  { path: 'sintesi', label: 'Sintesi adempimenti', icon: '🧮', key: 'y', anno: true },
  { path: 'adempimenti', label: 'Adempimenti', icon: '📋', key: 'a', anno: false },
  { path: 'tipologie', label: 'Tipologie clienti', icon: '🏷️', key: 't', anno: false },
  { path: 'appunti', label: 'Scadenze studio', icon: '⏰', key: 'e', anno: false },
  { path: 'note', label: 'Note', icon: '📝', key: 'n', anno: false },
  { path: 'cestino', label: 'Cestino', icon: '🗑️', key: 'x', anno: false },
  { path: 'scorciatoie', label: 'Scorciatoie', icon: '⌨️', key: 'k', anno: false },
];

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, Modal],
  styles: [`
    :host { display: flex; height: 100vh; }
    .sidebar { width: 232px; flex: none; background: var(--bg2); border-right: 1px solid var(--line); display: flex; flex-direction: column; padding: 14px 10px; gap: 4px; overflow: auto; }
    .brand { font-weight: 800; font-size: 17px; padding: 6px 10px 14px; display: flex; gap: 8px; align-items: center; }
    .nav a { display: flex; gap: 10px; align-items: center; padding: 8px 10px; border-radius: 8px; color: var(--text); }
    .nav a:hover { background: var(--accent-d); }
    .nav a.on { background: var(--accent); color: #fff; }
    .main { flex: 1; min-width: 0; display: flex; flex-direction: column; }
    .topbar { display: flex; align-items: center; gap: 12px; padding: 12px 20px; border-bottom: 1px solid var(--line); background: var(--bg2); }
    .topbar h1 { font-size: 18px; }
    .content { flex: 1; overflow: auto; }
    .year { display: flex; align-items: center; gap: 4px; background: var(--card2); border: 1px solid var(--line); border-radius: 8px; padding: 2px; }
    .year b { min-width: 52px; text-align: center; }
    .dot { width: 9px; height: 9px; border-radius: 50%; background: var(--err); }
    .dot.on { background: var(--ok); }
    @media (max-width: 800px) { .sidebar { width: 64px; } .sidebar span.lbl, .brand span { display: none; } }
  `],
  template: `
    <aside class="sidebar no-print">
      <div class="brand">🧾 <span>Gestionale Fiscale</span></div>
      <nav class="nav">
        @for (n of nav; track n.path) {
          <a [routerLink]="'/' + n.path" routerLinkActive="on" [title]="n.label">
            <span>{{ n.icon }}</span><span class="lbl">{{ n.label }}</span>
          </a>
        }
      </nav>
    </aside>

    <section class="main">
      <header class="topbar no-print">
        <h1>{{ current().icon }} {{ current().label }}</h1>
        <span class="grow"></span>
        @if (current().anno) {
          <div class="year">
            <button class="btn ghost sm" (click)="st.cambiaAnno(-1)" title="Anno precedente">◀</button>
            <b>{{ st.anno() }}</b>
            <button class="btn ghost sm" (click)="st.cambiaAnno(1)" title="Anno successivo">▶</button>
          </div>
        }
        <button class="btn sm" (click)="st.toggleTheme()" title="Cambia tema (T)">{{ st.theme() === 'dark' ? '🌙' : '☀️' }}</button>
        <button class="btn sm" (click)="print()" title="Stampa">🖨️</button>
        <span class="dot" [class.on]="sock.connected()" [title]="sock.connected() ? 'Connesso' : 'Disconnesso'"></span>
      </header>
      <main class="content"><router-outlet /></main>
    </section>

    <div class="toasts no-print">
      @for (t of toast.toasts(); track t.id) {
        <div class="toast" [class]="'toast ' + t.type" (click)="toast.dismiss(t.id)">{{ t.msg }}</div>
      }
    </div>

    @if (confirm.state(); as c) {
      <app-modal [title]="c.title" (closed)="confirm.answer(false)">
        <p style="white-space:pre-line;margin:0">{{ c.message }}</p>
        <ng-container footer>
          <button class="btn" (click)="confirm.answer(false)">Annulla</button>
          <button class="btn" [class.danger]="c.danger" [class.solid]="c.danger" [class.primary]="!c.danger" (click)="confirm.answer(true)">{{ c.okLabel }}</button>
        </ng-container>
      </app-modal>
    }
  `,
})
export class App {
  readonly nav = NAV;
  readonly st = inject(StateService);
  readonly sock = inject(SocketService);
  readonly toast = inject(ToastService);
  readonly confirm = inject(ConfirmService);
  private router = inject(Router);

  private url = toSignal(
    this.router.events.pipe(filter((e) => e instanceof NavigationEnd), map(() => this.router.url)),
    { initialValue: this.router.url },
  );
  readonly current = computed(() => {
    const seg = this.url().split('?')[0].split('/')[1] || 'dashboard';
    return NAV.find((n) => n.path === seg) ?? NAV[0];
  });

  print() { window.print(); }

  // Scorciatoie: "g" + lettera = vai a pagina, "t" = tema, "?" = elenco
  private gPending = false;
  @HostListener('document:keydown', ['$event'])
  onKey(e: KeyboardEvent) {
    const t = e.target as HTMLElement;
    if (t && (/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || t.isContentEditable)) return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (this.gPending) {
      this.gPending = false;
      const n = NAV.find((x) => x.key === e.key.toLowerCase());
      if (n) { e.preventDefault(); this.router.navigate(['/', n.path]); }
      return;
    }
    if (e.key === 'g') { this.gPending = true; setTimeout(() => (this.gPending = false), 1200); }
    else if (e.key === 't') this.st.toggleTheme();
    else if (e.key === '?') this.router.navigate(['/scorciatoie']);
  }
}
