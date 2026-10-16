# Gestionale Fiscale — Angular + Node

Tutto gira su **http://localhost:3000** (un solo processo).

## Avvio

```
npm install        # installa le dipendenze del backend
npm start          # avvia su porta 3000
```

Dati di prova (opzionale): `npm run dati:start`

La build Angular è già inclusa in `frontend/dist/browser`.

## Modificare il frontend

```
npm run build      # reinstalla dipendenze frontend e ricompila (Angular 21)
```

Sviluppo con ricarica: `cd frontend && npx ng build --watch --configuration development`, backend in parallelo.

## Struttura

- `backend/` Express + Socket.IO + sql.js (DB in `backend/db/gestionale.db`, creato al primo avvio)
- `frontend/` Angular standalone + signals, TypeScript

## Fix al backend originale

- `runQueryAndGetId` restituiva sempre 0 (sql.js azzera last_insert_rowid dopo export)
- `genera:tutti` falliva (mancava `dettagli`)
- `seed-demo.js` punta a `frontend/public/json/tipologie-data.json`
