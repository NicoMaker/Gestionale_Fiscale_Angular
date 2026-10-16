import { Injectable, signal } from '@angular/core';

export interface ConfirmState {
  title: string;
  message: string;
  okLabel: string;
  danger: boolean;
  resolve: (v: boolean) => void;
}

@Injectable({ providedIn: 'root' })
export class ConfirmService {
  readonly state = signal<ConfirmState | null>(null);

  ask(
    message: string,
    opts: { title?: string; okLabel?: string; danger?: boolean } = {},
  ): Promise<boolean> {
    return new Promise((resolve) => {
      this.state.set({
        title: opts.title ?? 'Conferma',
        message,
        okLabel: opts.okLabel ?? 'Conferma',
        danger: opts.danger ?? false,
        resolve,
      });
    });
  }

  answer(v: boolean) {
    const s = this.state();
    this.state.set(null);
    s?.resolve(v);
  }
}
