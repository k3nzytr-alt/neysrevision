"use strict";
const http = require("http");
const fs = require("fs");
const fsp = fs.promises;
const path = require("path");
const crypto = require("crypto");

const PORT = Number(process.env.PORT) || 3000;
const ROOT = __dirname;
const DATA_DIR = path.resolve(process.env.DATA_DIR || path.join(__dirname, "data"));
const ALLOW_SIGNUPS = process.env.ALLOW_SIGNUPS !== "false";
const MAX_BODY = 8 * 1024 * 1024;
const UP_URL = process.env.UPSTASH_REDIS_REST_URL;
const UP_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

const store = UP_URL && UP_TOKEN ? {
  kind: "upstash",
  async get(key) {
    const response = await fetch(UP_URL + "/get/" + encodeURIComponent(key), { headers: { Authorization: "Bearer " + UP_TOKEN } });
    const json = await response.json();
    return json.result ? JSON.parse(json.result) : null;
  },
  async set(key, value) {
    const response = await fetch(UP_URL, { method: "POST", headers: { Authorization: "Bearer " + UP_TOKEN, "Content-Type": "application/json" }, body: JSON.stringify(["SET", key, JSON.stringify(value)]) });
    if (!response.ok) throw new Error("Upstash write failed");
  },
  async del(key) {
    await fetch(UP_URL, { method: "POST", headers: { Authorization: "Bearer " + UP_TOKEN, "Content-Type": "application/json" }, body: JSON.stringify(["DEL", key]) });
  }
} : {
  kind: "files",
  file: key => path.join(DATA_DIR, key.replace(/[^a-z0-9_.-]/gi, "_") + ".json"),
  async get(key) { try { return JSON.parse(await fsp.readFile(this.file(key), "utf8")); } catch { return null; } },
  async set(key, value) {
    await fsp.mkdir(DATA_DIR, { recursive: true });
    const file = this.file(key), temp = file + "." + process.pid + ".tmp";
    await fsp.writeFile(temp, JSON.stringify(value));
    await fsp.rename(temp, file);
  },
  async del(key) { try { await fsp.unlink(this.file(key)); } catch {} }
};

const normalise = value => String(value || "").trim().toLowerCase();
const validUser = value => /^[a-z0-9_.-]{3,24}$/.test(value);
const hashPassword = (password, salt) => new Promise((resolve, reject) => crypto.scrypt(password, salt, 64, (error, key) => error ? reject(error) : resolve(key.toString("hex"))));
const tokenKey = token => "token_" + crypto.createHash("sha256").update(token).digest("hex");

async function issueToken(user) {
  const token = crypto.randomBytes(32).toString("hex");
  await store.set(tokenKey(token), { user, created: Date.now() });
  return token;
}
async function userFromRequest(req) {
  const match = /^Bearer ([a-f0-9]{64})$/.exec(req.headers.authorization || "");
  if (!match) return null;
  const session = await store.get(tokenKey(match[1]));
  return session ? session.user : null;
}

const failures = new Map();
const failureKey = (req, user) => (req.socket.remoteAddress || "") + "|" + user;
function tooManyFailures(req, user) {
  const item = failures.get(failureKey(req, user));
  return item && item.count >= 10 && Date.now() - item.started < 15 * 60 * 1000;
}
function recordFailure(req, user) {
  const key = failureKey(req, user), previous = failures.get(key);
  failures.set(key, previous && Date.now() - previous.started < 15 * 60 * 1000 ? { count: previous.count + 1, started: previous.started } : { count: 1, started: Date.now() });
}

function send(res, status, value) {
  const body = JSON.stringify(value);
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", "Content-Length": Buffer.byteLength(body) });
  res.end(body);
}
function readJSON(req) {
  return new Promise((resolve, reject) => {
    let size = 0; const chunks = [];
    req.on("data", chunk => {
      size += chunk.length;
      if (size > MAX_BODY) { reject(Object.assign(new Error("Too large"), { code: 413 })); req.destroy(); }
      else chunks.push(chunk);
    });
    req.on("end", () => { try { resolve(chunks.length ? JSON.parse(Buffer.concat(chunks).toString("utf8")) : {}); } catch { reject(Object.assign(new Error("Bad JSON"), { code: 400 })); } });
    req.on("error", reject);
  });
}

async function api(req, res, url) {
  const route = req.method + " " + url.pathname;
  if (route === "GET /api/health") return send(res, 200, { ok: true, signups: ALLOW_SIGNUPS, storage: store.kind, persistent: store.kind === "upstash" || Boolean(process.env.DATA_DIR) });
  if (route === "POST /api/register") {
    if (!ALLOW_SIGNUPS) return send(res, 403, { error: "New accounts are switched off." });
    const body = await readJSON(req), user = normalise(body.username);
    if (!validUser(user)) return send(res, 400, { error: "Username: 3–24 letters, numbers, dots, dashes or underscores." });
    if (typeof body.password !== "string" || body.password.length < 6) return send(res, 400, { error: "Password needs at least 6 characters." });
    if (await store.get("user_" + user)) return send(res, 409, { error: "That username is taken." });
    const salt = crypto.randomBytes(16).toString("hex");
    await store.set("user_" + user, { user, salt, hash: await hashPassword(body.password, salt), created: Date.now() });
    return send(res, 200, { token: await issueToken(user), username: user });
  }
  if (route === "POST /api/login") {
    const body = await readJSON(req), user = normalise(body.username);
    if (tooManyFailures(req, user)) return send(res, 429, { error: "Too many attempts. Try again in 15 minutes." });
    const account = validUser(user) ? await store.get("user_" + user) : null;
    const candidate = account && typeof body.password === "string" ? await hashPassword(body.password, account.salt) : "";
    const valid = account && candidate.length === account.hash.length && crypto.timingSafeEqual(Buffer.from(candidate, "hex"), Buffer.from(account.hash, "hex"));
    if (!valid) { recordFailure(req, user); return send(res, 401, { error: "Wrong username or password." }); }
    return send(res, 200, { token: await issueToken(user), username: user });
  }

  const user = await userFromRequest(req);
  if (!user) return send(res, 401, { error: "Not signed in." });
  if (route === "POST /api/logout") { await store.del(tokenKey(req.headers.authorization.slice(7))); return send(res, 200, { ok: true }); }
  if (route === "GET /api/me") return send(res, 200, { username: user });
  if (route === "GET /api/progress") {
    const saved = await store.get("progress_" + user);
    return send(res, 200, { data: saved ? saved.data : null, updated: saved ? saved.updated : 0 });
  }
  if (route === "PUT /api/progress") {
    const body = await readJSON(req), data = body.data;
    if (!data || typeof data !== "object") return send(res, 400, { error: "Missing data." });
    const current = await store.get("progress_" + user), updated = Number(data.updated) || Date.now();
    if (current && current.updated > updated) return send(res, 409, { data: current.data, updated: current.updated });
    await store.set("progress_" + user, { data, updated });
    return send(res, 200, { ok: true, updated });
  }
  return send(res, 404, { error: "Not found." });
}

const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".pdf": "application/pdf", ".ico": "image/x-icon" };
async function serveStatic(req, res, url) {
  let requestPath = decodeURIComponent(url.pathname);
  if (requestPath === "/" || requestPath === "") requestPath = "/index.html";
  if (requestPath !== "/index.html" && !requestPath.startsWith("/files/")) { res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" }); return res.end("Not found"); }
  const file = path.normalize(path.join(ROOT, requestPath));
  if (!file.startsWith(ROOT + path.sep)) { res.writeHead(403); return res.end(); }
  try {
    const stat = await fsp.stat(file);
    if (!stat.isFile()) throw new Error("Not a file");
    const ext = path.extname(file).toLowerCase();
    res.writeHead(200, { "Content-Type": TYPES[ext] || "application/octet-stream", "Content-Length": stat.size, "Cache-Control": ext === ".html" ? "no-cache" : "public, max-age=300" });
    if (req.method === "HEAD") return res.end();
    fs.createReadStream(file).pipe(res);
  } catch { res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" }); res.end("Not found"); }
}

http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://local");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "same-origin");
  try {
    if (url.pathname.startsWith("/api/")) return await api(req, res, url);
    if (req.method !== "GET" && req.method !== "HEAD") { res.writeHead(405); return res.end(); }
    return await serveStatic(req, res, url);
  } catch (error) {
    if (!res.headersSent) send(res, error.code === 413 ? 413 : error.code === 400 ? 400 : 500, { error: error.code === 413 ? "Too much data." : error.code === 400 ? "Bad request." : "Server error." });
    if (!error.code) console.error(error);
  }
}).listen(PORT, () => {
  if (store.kind === "files" && !process.env.DATA_DIR) console.warn("WARNING: local account data is temporary on many cloud hosts. Configure Upstash or a persistent DATA_DIR before relying on it.");
  console.log(`Nevaeh Revision on http://localhost:${PORT} (storage: ${store.kind})`);
});
