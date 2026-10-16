import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { Tipologia, TipologieConfig } from './models';
import { SocketService } from './socket.service';

@Injectable({ providedIn: 'root' })
export class TipologieService {
  private http = inject(HttpClient);
  private sock = inject(SocketService);
  readonly lista = signal<Tipologia[]>([]);
  readonly config = signal<TipologieConfig | null>(null);
  private loading?: Promise<void>;

  /** Carica (una sola volta) tipologie dal DB e configurazione percorsi dal JSON statico. */
  load(force = false): Promise<void> {
    if (!this.loading || force) {
      this.loading = (async () => {
        const [cfg, res] = await Promise.all([
          firstValueFrom(this.http.get<TipologieConfig>('json/tipologie-data.json')),
          this.sock.request<Tipologia[]>('get:tipologie'),
        ]);
        this.config.set(cfg);
        this.lista.set(res.data ?? []);
      })().catch((e) => {
        this.loading = undefined;
        throw e;
      });
    }
    return this.loading;
  }
}
