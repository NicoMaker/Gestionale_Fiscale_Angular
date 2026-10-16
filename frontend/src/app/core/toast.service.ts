import { Injectable, signal } from '@angular/core';

export type ToastType = 'success' | 'error' | 'warning' | 'info';
export interface Toast {
  id: number;
  msg: string;
  type: ToastType;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  readonly toasts = signal<Toast[]>([]);
  private seq = 0;

  show(msg: string, type: ToastType = 'info', ms = 3500) {
    const t: Toast = { id: ++this.seq, msg, type };
    this.toasts.update((l) => [...l, t]);
    setTimeout(() => this.dismiss(t.id), ms);
  }
  success(m: string) {
    this.show(m, 'success');
  }
  error(m: string) {
    this.show(m, 'error', 6000);
  }
  dismiss(id: number) {
    this.toasts.update((l) => l.filter((t) => t.id !== id));
  }
}
