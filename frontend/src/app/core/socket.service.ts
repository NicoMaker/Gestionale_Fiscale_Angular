import { Injectable, signal } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { Observable, Subject } from 'rxjs';
import { filter } from 'rxjs/operators';
import { Res } from './models';
import { ToastService } from './toast.service';

/**
 * Wrapper tipizzato di Socket.IO.
 * Il backend risponde con "res:<evento>" (get:X -> res:X). Le richieste con la stessa
 * risposta vengono serializzate, così due chiamate parallele non si scambiano l'esito.
 */
@Injectable({ providedIn: 'root' })
export class SocketService {
  private readonly socket: Socket = io({ transports: ['websocket', 'polling'] });
  readonly connected = signal(false);
  private readonly bc = new Subject<string>();
  private readonly chains = new Map<string, Promise<unknown>>();

  constructor(private toast: ToastService) {
    this.socket.on('connect', () => this.connected.set(true));
    this.socket.on('disconnect', () => this.connected.set(false));
    this.socket.on('notify', (n: { type: any; msg: string }) => this.toast.show(n.msg, n.type));
    this.socket.onAny((ev: string) => {
      if (ev.startsWith('broadcast:')) this.bc.next(ev);
    });
  }

  /** Emette quando il server notifica una modifica (broadcast:*). */
  onBroadcast(...events: string[]): Observable<string> {
    return this.bc.pipe(filter((e) => events.length === 0 || events.includes(e)));
  }

  private static resEvent(event: string): string {
    return event.startsWith('get:') ? 'res:' + event.slice(4) : 'res:' + event;
  }

  /** Invia un evento e attende la risposta; rigetta se success=false. */
  request<T = any>(event: string, payload?: unknown): Promise<Res<T>> {
    const resEvent = SocketService.resEvent(event);
    const prev = this.chains.get(resEvent) ?? Promise.resolve();
    const run = () =>
      new Promise<Res<T>>((resolve, reject) => {
        const timer = setTimeout(() => {
          this.socket.off(resEvent, handler);
          reject(new Error('Timeout: il server non risponde'));
        }, 20000);
        const handler = (res: Res<T>) => {
          clearTimeout(timer);
          if (res?.success === false) reject(new Error(res.error || 'Errore'));
          else resolve(res);
        };
        this.socket.once(resEvent, handler);
        this.socket.emit(event, payload);
      });
    const next = prev.then(run, run);
    this.chains.set(resEvent, next.catch(() => undefined));
    return next;
  }

  /** Come request(), ma mostra un toast d'errore e ritorna null invece di rigettare. */
  async call<T = any>(event: string, payload?: unknown): Promise<Res<T> | null> {
    try {
      return await this.request<T>(event, payload);
    } catch (e: any) {
      this.toast.error(e?.message || 'Errore');
      return null;
    }
  }
}
