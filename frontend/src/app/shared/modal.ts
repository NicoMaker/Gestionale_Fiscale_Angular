import { Component, HostListener, input, output } from '@angular/core';

@Component({
  selector: 'app-modal',
  standalone: true,
  template: `
    <div class="overlay" (mousedown)="onBackdrop($event)">
      <div class="modal" [class.wide]="wide()" role="dialog" aria-modal="true">
        <header>
          <span>{{ title() }}</span>
          <button class="x" (click)="closed.emit()" aria-label="Chiudi">✕</button>
        </header>
        <div class="body"><ng-content /></div>
        <footer><ng-content select="[footer]" /></footer>
      </div>
    </div>
  `,
})
export class Modal {
  title = input('');
  wide = input(false);
  closed = output<void>();

  onBackdrop(e: MouseEvent) {
    if ((e.target as HTMLElement).classList.contains('overlay')) this.closed.emit();
  }
  @HostListener('document:keydown.escape') esc() { this.closed.emit(); }
}
