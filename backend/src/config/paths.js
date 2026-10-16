const path = require("path");
const fs = require("fs");

// Cartella con la build di Angular (ng build -> frontend/dist/browser)
const FRONTEND_DIST = path.join(__dirname, "../../../frontend/dist/browser");
const FRONTEND_INDEX = path.join(FRONTEND_DIST, "index.html");

function frontendBuilded() {
  return fs.existsSync(FRONTEND_INDEX);
}

module.exports = { FRONTEND_DIST, FRONTEND_INDEX, frontendBuilded };
