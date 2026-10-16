const http = require("http");
const { Server } = require("socket.io");
const cron = require("node-cron");

const createApp = require("./src/app");
const { initDB, runQuery, queryOne } = require("./src/config/database");
const { getLocalIP, getPublicIP } = require("./src/utils/network");
const setupSocketHandlers = require("./src/realtime/socket");
const cestinoRepository = require("./src/repositories/cestinoRepository");

const app = createApp();
const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] },
  transports: ["websocket", "polling"],
  pingTimeout: 60000,
});

// Rende l'istanza io disponibile alle route (es. /api/health)
app.set("io", io);

// Configura gli handler Socket.IO (controller di dominio)
setupSocketHandlers(io);

// -- CRON: eliminazione automatica cestino ogni notte a mezzanotte ----------
// Scatta alle 00:00:05 (5 secondi dopo mezzanotte) ogni giorno
cron.schedule("5 0 * * *", () => {
  try {
    const eliminati = cestinoRepository.eliminaScadutiCestino();
    if (eliminati > 0) {
      console.log(
        `🗑️ Cron cestino: eliminati ${eliminati} elementi scaduti (>${cestinoRepository.GIORNI_RETENTION} giorni)`,
      );
      io.emit("broadcast:cestino_updated");
    }
  } catch (e) {
    console.error("❌ Cron cestino errore:", e.message);
  }
});

const PORT = process.env.PORT || 3000;

initDB().then(async () => {
  const localIP = getLocalIP();
  const publicIP = await getPublicIP();

  // -- PULIZIA IMMEDIATA all'avvio --------------------------------------------
  // Elimina i record scaduti confrontando con ENTRAMBI i formati di soglia
  // (UTC e localtime) per coprire i record inseriti prima del fix timezone.
  try {
    const giorni = cestinoRepository.GIORNI_RETENTION;
    const result = queryOne(`SELECT COUNT(*) as cnt FROM cestino WHERE
      data_eliminazione <= datetime('now', '-${giorni} days')
      OR data_eliminazione <= datetime('now', 'localtime', '-${giorni} days')`);
    if (result && result.cnt > 0) {
      runQuery(`DELETE FROM cestino WHERE
        data_eliminazione <= datetime('now', '-${giorni} days')
        OR data_eliminazione <= datetime('now', 'localtime', '-${giorni} days')`);
      console.log(
        `🗑️ Avvio: eliminati ${result.cnt} elementi scaduti dal cestino (>${giorni} giorni)`,
      );
      io.emit("broadcast:cestino_updated");
    }
  } catch (e) {
    console.error("❌ Pulizia cestino all'avvio errore:", e.message);
  }

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`\n🚀 Server avviato con successo!`);
    console.log(`🌐 IP Pubblico: http://${publicIP}:${PORT}`);
    console.log(`🏠 IP Locale:   http://${localIP}:${PORT}`);
    console.log(`📍 Localhost:  http://localhost:${PORT}`);
    console.log(`\n--------------------------------------`);
    console.log(
      `⏰ Cron cestino attivo: eliminazione automatica ogni notte alle 00:00`,
    );
  });
});
