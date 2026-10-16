const statsRepository = require("../repositories/statsRepository");

/**
 * Handler socket per le STATISTICHE della dashboard.
 */
module.exports = function registerStatsController(io, socket) {
  socket.on("get:stats", ({ anno }) => {
    try {
      const data = statsRepository.getStats(anno);
      socket.emit("res:stats", { success: true, data });
    } catch (e) {
      socket.emit("res:stats", { success: false, error: e.message });
    }
  });
};
