#!/usr/bin/env node
// Promptish webdev harness — chat-driven IDE for static sites.
// Single-site by design (v1). Configure via .env.
//
// Endpoints:
//   GET  /api/site-files                 — file tree
//   GET  /api/site-file?path=...         — read file
//   POST /api/site-file-write            — write file
//   POST /api/site-file-delete           — delete file
//   GET  /api/site-preview/<path>        — serve site asset (iframe src)
//   POST /api/site-chat                  — kick off a Claude turn (json or multipart)
//   GET  /api/site-chat-poll?dispatch_id — tail dispatch log + changed files
//   GET  /api/site-chat-history          — rehydrate chat from DB

const fs = require('fs');
const path = require('path');
const http = require('http');
const crypto = require('crypto');
const { spawn } = require('child_process');
const Database = require('better-sqlite3');

const ROOT = path.resolve(__dirname, '..');
const PORT = parseInt(process.env.PORT || '9998', 10);
const SITE_DIR = path.resolve(process.env.SITE_PATH || './sites/example');
const DB_PATH = path.resolve(process.env.DB_PATH || './harness.db');
const MODEL = process.env.MODEL || 'claude-sonnet-4-6';
const PUBLIC_DIR = path.join(ROOT, 'public');
const DISPATCH_DIR = path.join(ROOT, 'dispatches');

fs.mkdirSync(DISPATCH_DIR, { recursive: true });

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

// In-memory dispatch registry. Survives only as long as the process; logs survive on disk.
const dispatches = new Map(); // id → { status, started_at, finished_at, exit_code, log_path, conversation_id, prompt }
const _insertTurn = db.prepare(`INSERT INTO chat_turns (conversation_id, role, content) VALUES (?, ?, ?)`);
const _getTurns = db.prepare(`SELECT role, content FROM chat_turns WHERE conversation_id = ? ORDER BY id ASC`);
const _latestConv = db.prepare(`
  SELECT conversation_id, MAX(id) AS last_id
    FROM chat_turns
   GROUP BY conversation_id
   ORDER BY last_id DESC
   LIMIT 1
`);

const MIME = { '.html':'text/html', '.js':'application/javascript', '.css':'text/css', '.json':'application/json',
  '.svg':'image/svg+xml', '.png':'image/png', '.jpg':'image/jpeg', '.jpeg':'image/jpeg', '.gif':'image/gif',
  '.webp':'image/webp', '.ico':'image/x-icon', '.woff':'font/woff', '.woff2':'font/woff2', '.ttf':'font/ttf',
  '.txt':'text/plain', '.md':'text/markdown' };

// ----- helpers -----
function json(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', c => chunks.push(c));
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8');
      if (!raw) return resolve({});
      try { resolve(JSON.parse(raw)); } catch (e) { reject(e); }
    });
    req.on('error', reject);
  });
}

function readRawBody(req, maxBytes = 64 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let total = 0;
    req.on('data', c => {
      total += c.length;
      if (total > maxBytes) { reject(new Error('body too large')); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

// Minimal multipart/form-data parser. Returns { fields, files: [{ name, filename, contentType, data }] }.
function parseMultipart(buffer, boundary) {
  const fields = {};
  const files = [];
  const delim = Buffer.from(`--${boundary}`);
  let idx = 0;
  while (idx < buffer.length) {
    const start = buffer.indexOf(delim, idx);
    if (start < 0) break;
    const afterDelim = start + delim.length;
    if (buffer[afterDelim] === 0x2d && buffer[afterDelim + 1] === 0x2d) break;
    let partStart = afterDelim;
    if (buffer[partStart] === 0x0d && buffer[partStart + 1] === 0x0a) partStart += 2;
    const headerEnd = buffer.indexOf(Buffer.from('\r\n\r\n'), partStart);
    if (headerEnd < 0) break;
    const headerStr = buffer.slice(partStart, headerEnd).toString('utf8');
    const bodyStart = headerEnd + 4;
    const nextDelim = buffer.indexOf(delim, bodyStart);
    if (nextDelim < 0) break;
    const body = buffer.slice(bodyStart, nextDelim - 2);
    const disp = /Content-Disposition:\s*form-data;\s*([^\r\n]+)/i.exec(headerStr);
    if (disp) {
      const nameM = /name="([^"]*)"/i.exec(disp[1]);
      const fileM = /filename="([^"]*)"/i.exec(disp[1]);
      const ctM = /Content-Type:\s*([^\r\n]+)/i.exec(headerStr);
      const name = nameM ? nameM[1] : null;
      if (name) {
        if (fileM) files.push({ name, filename: fileM[1], contentType: ctM ? ctM[1].trim() : 'application/octet-stream', data: body });
        else fields[name] = body.toString('utf8');
      }
    }
    idx = nextDelim;
  }
  return { fields, files };
}

// Reject any path that escapes SITE_DIR. Returns the absolute resolved path.
function assertInSite(requested) {
  const abs = path.resolve(SITE_DIR, requested);
  const root = path.resolve(SITE_DIR);
  if (abs !== root && !abs.startsWith(root + path.sep)) throw new Error('path escapes site scope');
  return abs;
}

function listSiteFiles(sub = '') {
  const out = [];
  const dir = path.join(SITE_DIR, sub);
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return out; }
  for (const ent of entries) {
    if (ent.name.startsWith('.')) continue;
    const rel = sub ? `${sub}/${ent.name}` : ent.name;
    if (ent.isDirectory()) out.push(...listSiteFiles(rel));
    else out.push(rel);
  }
  return out;
}

function walkTree(dir, relPath = '') {
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return []; }
  return entries
    .filter(e => !e.name.startsWith('.') || e.name === '.htaccess')
    .map(e => {
      const fullPath = path.join(dir, e.name);
      const file = relPath ? `${relPath}/${e.name}` : e.name;
      if (e.isDirectory()) return { name: e.name, type: 'dir', path: file, children: walkTree(fullPath, file) };
      return { name: e.name, type: 'file', path: file };
    });
}

// ----- GET routes -----
const GET = {
  '/api/health': () => ({ ok: true, site: SITE_DIR }),

  '/api/site-files': () => walkTree(SITE_DIR),

  '/api/site-file': (url) => {
    const filePath = url.searchParams.get('path');
    if (!filePath) throw new Error('path required');
    const abs = assertInSite(filePath);
    const content = fs.readFileSync(abs, 'utf8');
    return { path: filePath, content };
  },

  '/api/site-chat-poll': (url) => {
    const dispatchId = url.searchParams.get('dispatch_id');
    if (!dispatchId) throw new Error('dispatch_id required');
    const d = dispatches.get(dispatchId);
    if (!d) return { content: '', status: 'unknown', finished_at: null, changed_files: [] };
    let content = '';
    try { content = fs.readFileSync(d.log_path, 'utf8'); } catch {}
    const status = d.status;
    const terminal = status !== 'running' && status !== 'queued';
    let changed_files = [];
    if (terminal && d.started_ms) {
      for (const rel of listSiteFiles()) {
        try {
          const st = fs.statSync(path.join(SITE_DIR, rel));
          if (st.mtimeMs > d.started_ms) changed_files.push(rel);
        } catch {}
      }
    }
    return { content, status, finished_at: d.finished_at || null, changed_files };
  },

  '/api/site-chat-history': () => {
    const latest = _latestConv.get();
    if (!latest) return { conversation_id: null, messages: [] };
    const turns = _getTurns.all(latest.conversation_id);
    return {
      conversation_id: latest.conversation_id,
      messages: turns.map(t => ({ role: t.role, content: t.content })),
    };
  },
};

// ----- POST routes -----
const POST = {
  '/api/site-file-write': async (req, res) => {
    const b = await parseBody(req);
    const { path: filePath, content } = b;
    if (!filePath || content === undefined) return json(res, 400, { error: 'path + content required' });
    try {
      const abs = assertInSite(filePath);
      fs.mkdirSync(path.dirname(abs), { recursive: true });
      fs.writeFileSync(abs, content, 'utf8');
      json(res, 200, { ok: true, path: filePath });
    } catch (e) {
      json(res, e.message.includes('escapes') ? 403 : 500, { error: e.message });
    }
  },

  '/api/site-file-delete': async (req, res) => {
    const b = await parseBody(req);
    const { path: filePath } = b;
    if (!filePath) return json(res, 400, { error: 'path required' });
    try {
      const abs = assertInSite(filePath);
      if (fs.existsSync(abs)) fs.unlinkSync(abs);
      json(res, 200, { ok: true });
    } catch (e) {
      json(res, e.message.includes('escapes') ? 403 : 500, { error: e.message });
    }
  },

  '/api/site-chat': async (req, res) => {
    const ctype = String(req.headers['content-type'] || '');
    let prompt, clientSessionId, selectedFile, uploadedFiles = [];
    if (/^multipart\/form-data/i.test(ctype)) {
      const m = /boundary=(?:"([^"]+)"|([^;]+))/i.exec(ctype);
      if (!m) return json(res, 400, { error: 'multipart boundary missing' });
      const boundary = (m[1] || m[2]).trim();
      let raw;
      try { raw = await readRawBody(req); } catch (e) { return json(res, 413, { error: e.message }); }
      const { fields, files } = parseMultipart(raw, boundary);
      prompt = fields.prompt;
      clientSessionId = fields.session_id;
      selectedFile = fields.selected_file;
      uploadedFiles = files.filter(f => f.name === 'images' || f.name === 'image' || f.name === 'attachments');
    } else {
      const b = await parseBody(req);
      prompt = b.prompt;
      clientSessionId = b.session_id;
      selectedFile = b.selected_file;
    }
    if (!prompt) return json(res, 400, { error: 'prompt required' });

    // Pick or mint a conversation id. Reuse client's id if it has turns; else fall back to most
    // recent conv on this DB; else mint fresh.
    let conversationId;
    if (clientSessionId && db.prepare('SELECT 1 FROM chat_turns WHERE conversation_id = ? LIMIT 1').get(clientSessionId)) {
      conversationId = clientSessionId;
    } else {
      const latest = _latestConv.get();
      conversationId = latest ? latest.conversation_id : 'wdc-' + crypto.randomBytes(4).toString('hex');
    }

    // Save uploaded screenshots into the site so Claude can Read them.
    const savedAttachments = [];
    const MAX_PER_FILE = 10 * 1024 * 1024;
    if (uploadedFiles.length) {
      for (const f of uploadedFiles) {
        if (f.data.length > MAX_PER_FILE) return json(res, 413, { error: `attachment too large (max ${MAX_PER_FILE} bytes)` });
        if (f.contentType && !/^image\//i.test(f.contentType)) return json(res, 415, { error: `only image/* allowed, got ${f.contentType}` });
      }
      const uploadDir = path.join(SITE_DIR, 'assets', 'images');
      fs.mkdirSync(uploadDir, { recursive: true });
      uploadedFiles.forEach((f, i) => {
        const safeBase = (f.filename || `upload-${i}`).replace(/[^A-Za-z0-9._-]/g, '_').slice(-80) || `upload-${i}`;
        const ext = path.extname(safeBase) || ({ 'image/png': '.png', 'image/jpeg': '.jpg', 'image/gif': '.gif', 'image/webp': '.webp' }[f.contentType] || '');
        const stem = path.basename(safeBase, path.extname(safeBase));
        const finalName = `${stem}${ext}`;
        const abs = path.join(uploadDir, finalName);
        if (!abs.startsWith(uploadDir + path.sep)) throw new Error('path traversal blocked');
        fs.writeFileSync(abs, f.data);
        savedAttachments.push({ rel: `./assets/images/${finalName}`, abs, size: f.data.length });
      });
    }

    // Build the prompt.
    const priorTurns = _getTurns.all(conversationId);
    const historyBlock = priorTurns.length
      ? `\n\n## Conversation history\n${priorTurns.map(m => `[${m.role === 'user' ? 'Operator' : 'Claude'}]: ${m.content}`).join('\n\n')}\n`
      : '';
    const selectedFileHint = selectedFile ? `\nThe operator currently has **${selectedFile}** selected in the file tree.` : '';
    const attachmentBlock = savedAttachments.length
      ? `\n\n## Attached screenshots\nThe operator attached ${savedAttachments.length} image(s). Read them with your Read tool:\n${savedAttachments.map(a => `- ${a.abs} (relative: ${a.rel})`).join('\n')}\n`
      : '';
    const sitePreamble = `## Site context
You are editing a static site rooted at: ${SITE_DIR}
File edits MUST stay inside this directory. Never write outside it.${selectedFileHint}${attachmentBlock}${historyBlock}

# User request
`;
    const fullPrompt = sitePreamble + prompt;

    const dispatchId = 'd' + crypto.randomBytes(6).toString('hex');
    const logPath = path.join(DISPATCH_DIR, `${dispatchId}.log`);
    const logStream = fs.createWriteStream(logPath, { flags: 'a' });
    const startedMs = Date.now();
    dispatches.set(dispatchId, {
      status: 'queued', started_ms: startedMs, finished_at: null, exit_code: null,
      log_path: logPath, conversation_id: conversationId, prompt,
    });

    // Scope tool access tightly: file ops within cwd (SITE_DIR), no Bash/Web/other.
    // Customer's chat-driven file editing still works; arbitrary shell access does not.
    // Operators who genuinely need broader tools can override via env CLAUDE_ALLOWED_TOOLS.
    const allowedTools = process.env.CLAUDE_ALLOWED_TOOLS || 'Read Edit Write Glob Grep';

    // Build the env we pass to `claude -p`. Strip empty-or-placeholder
    // ANTHROPIC_API_KEY so claude falls through to its own credential store
    // (Claude Code subscription auth) when the user hasn't actually set a key.
    const childEnv = { ...process.env, HARNESS_DISPATCH_ID: dispatchId, HARNESS_CONVERSATION_ID: conversationId };
    const ak = childEnv.ANTHROPIC_API_KEY;
    if (!ak || ak.startsWith('placeholder') || ak === '') {
      delete childEnv.ANTHROPIC_API_KEY;
    }

    const child = spawn('claude', ['-p', '--allowedTools', allowedTools, '--model', MODEL], {
      cwd: SITE_DIR,
      shell: true,
      env: childEnv,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    child.stdin.write(fullPrompt);
    child.stdin.end();

    let tail = '';
    child.stdout.on('data', d => { logStream.write(d); tail += d.toString(); if (tail.length > 8000) tail = tail.slice(-8000); });
    child.stderr.on('data', d => { logStream.write(d); });

    const dispatch = dispatches.get(dispatchId);
    dispatch.status = 'running';

    child.on('close', (code) => {
      try { logStream.end(); } catch {}
      dispatch.status = code === 0 ? 'done' : 'failed';
      dispatch.exit_code = code;
      dispatch.finished_at = new Date().toISOString();
      if (code === 0) {
        try {
          _insertTurn.run(conversationId, 'user', prompt);
          _insertTurn.run(conversationId, 'assistant', tail.slice(-6000));
        } catch (e) { console.error('chat-turn persist failed:', e.message); }
      }
    });
    child.on('error', (err) => {
      try { logStream.end(); } catch {}
      dispatch.status = 'failed';
      dispatch.finished_at = new Date().toISOString();
      try { fs.appendFileSync(logPath, `\n[harness] spawn error: ${String(err)}\n`); } catch {}
    });

    json(res, 200, {
      dispatch_id: dispatchId,
      session_id: conversationId,
      attachments: savedAttachments.map(a => a.rel),
    });
  },
};

// ----- request dispatch -----
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

  // GET site-preview/<path>
  if (req.method === 'GET' && url.pathname.startsWith('/api/site-preview/')) {
    const filePath = decodeURIComponent(url.pathname.slice('/api/site-preview/'.length)) || 'index.html';
    try {
      const abs = assertInSite(filePath);
      fs.readFile(abs, (err, data) => {
        if (err) return json(res, 404, { error: 'not found' });
        res.writeHead(200, { 'Content-Type': MIME[path.extname(abs)] || 'application/octet-stream' });
        res.end(data);
      });
    } catch (e) {
      return json(res, 403, { error: e.message });
    }
    return;
  }

  if (req.method === 'GET' && GET[url.pathname]) {
    try { return json(res, 200, GET[url.pathname](url)); }
    catch (e) { return json(res, 500, { error: e.message }); }
  }

  if (req.method === 'POST' && POST[url.pathname]) {
    try { return await POST[url.pathname](req, res); }
    catch (e) { return json(res, 500, { error: e.message }); }
  }

  if (req.method !== 'GET') return json(res, 405, { error: 'method not allowed' });

  // Static files from /public
  const filePath = url.pathname === '/' ? '/index.html' : url.pathname;
  const abs = path.join(PUBLIC_DIR, filePath);
  if (!abs.startsWith(PUBLIC_DIR)) return json(res, 403, { error: 'forbidden' });
  fs.readFile(abs, (err, data) => {
    if (err) return json(res, 404, { error: 'not found' });
    const ext = path.extname(abs);
    const headers = { 'Content-Type': MIME[ext] || 'application/octet-stream' };
    if (ext === '.html') headers['Cache-Control'] = 'no-store';
    res.writeHead(200, headers);
    res.end(data);
  });
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`promptish webdev harness running at http://localhost:${PORT}/`);
  console.log(`editing site: ${SITE_DIR}`);
  console.log(`model:        ${MODEL}`);
});
