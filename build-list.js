const fs = require("fs");
const path = require("path");

const root = __dirname;
const skip = new Set(["css", "js", "assets", "node_modules"]);

function visibleName(folderName) {
  const cleaned = folderName.replace(/(?:[_\-\s]*\d+)$/, "").trim();
  return cleaned || folderName;
}

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return null;
  }
}

function readTitle(indexPath, fallback) {
  try {
    const html = fs.readFileSync(indexPath, "utf8");
    const match = html.match(/<title>([^<]*)<\/title>/i);
    if (match && match[1].trim()) return match[1].trim();
  } catch {
    /* use fallback */
  }
  return fallback;
}

const games = [];
for (const name of fs.readdirSync(root)) {
  if (name.startsWith(".") || skip.has(name)) continue;
  const dir = path.join(root, name);
  if (!fs.statSync(dir).isDirectory()) continue;
  const indexPath = path.join(dir, "index.html");
  if (!fs.existsSync(indexPath)) continue;
  const config = readJson(path.join(dir, "game.config.json")) || {};
  const title = String(config.title || readTitle(indexPath, name));
  const display = visibleName(String(config.creator || config.displayName || config.name || name));
  games.push({ name: display, title, href: `/${encodeURI(name)}/` });
}

games.sort((a, b) => a.name.localeCompare(b.name, "ko"));
fs.writeFileSync(
  path.join(root, "games.json"),
  `${JSON.stringify({ intervalMs: 8000, games }, null, 2)}\n`,
  "utf8"
);
console.log(`games.json ${games.length}`);
