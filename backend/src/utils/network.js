const os = require("os");

function getLocalIP() {
  const ifaces = os.networkInterfaces();
  for (const n of Object.keys(ifaces))
    for (const i of ifaces[n])
      if (i.family === "IPv4" && !i.internal) return i.address;
  return "localhost";
}

async function getPublicIP() {
  try {
    const response = await fetch("https://api.ipify.org?format=json");
    const data = await response.json();
    return data.ip;
  } catch (e) {
    return "Non rilevato";
  }
}

module.exports = { getLocalIP, getPublicIP };
