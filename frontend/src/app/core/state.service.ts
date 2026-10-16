import { Injectable, effect, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class StateService {
  readonly anno = signal<number>(this.loadAnno());
  readonly theme = signal<'dark' | 'light'>((localStorage.getItem('gf-theme') as any) || 'dark');

  constructor() {
    effect(() => {
      document.documentElement.setAttribute('data-theme', this.theme());
      localStorage.setItem('gf-theme', this.theme());
    });
    effect(() => sessionStorage.setItem('gf-anno', String(this.anno())));
  }

  private loadAnno(): number {
    const v = parseInt(sessionStorage.getItem('gf-anno') || '', 10);
    return Number.isFinite(v) ? v : new Date().getFullYear();
  }

  cambiaAnno(delta: number) { this.anno.update((a) => a + delta); }
  toggleTheme() { this.theme.update((t) => (t === 'dark' ? 'light' : 'dark')); }
}
