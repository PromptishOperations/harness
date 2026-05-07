# Setup — From Purchase to Running

You bought the harness. Here's how to get it running on your machine. Plan on 10–15 minutes if your prereqs are already in place, 30 if they aren't.

## Before you start — prereqs

Confirm each of these is installed and on your PATH. Run the check, expect the rough output.

| Tool             | Check                | Looks like                                |
|------------------|----------------------|-------------------------------------------|
| Node.js 20+      | `node --version`     | `v20.x.x` or higher                       |
| npm              | `npm --version`      | `10.x` or higher                          |
| git              | `git --version`      | any recent version                        |
| Claude Code      | `claude --version`   | a version string from Anthropic's CLI     |

Missing Node? Install from https://nodejs.org (LTS).
Missing Claude Code? Install per https://docs.anthropic.com/claude-code.

You also need ONE of these (not both):

- **Claude Code subscription** (recommended): if you've already paid for Claude Code, run `claude /login` once on this machine. The harness uses your subscription — no separate API billing.
- **Anthropic API key**: create one at https://console.anthropic.com → Settings → API Keys. Per-token billing on your Anthropic account.

Plus:
- A site directory. The folder of HTML/JS/whatever you want the agent to edit. Bundled `./sites/example/` works for first-run.

## Steps

### 1. Clone the repo

```bash
git clone https://github.com/PromptishOperations/harness.git
cd harness
```

### 2. Install Node dependencies

```bash
npm install
```

This pulls a small dep tree (`@anthropic-ai/sdk`, `better-sqlite3`, `dotenv`). Should take under a minute.

### 3. Authenticate

Pick ONE:

**Option A — Claude Code subscription (recommended for buyers who already pay for Claude Code):**

```bash
claude /login
```

Follow the prompts. The harness will use your Claude Code session automatically. Skip step 4's `ANTHROPIC_API_KEY` (leave blank).

**Option B — Anthropic API key:**

Go to https://console.anthropic.com → Settings → API Keys → Create Key. Copy it. Treat it like a password — it bills your account per token.

### 4. Create your `.env`

Copy the example:

```bash
cp .env.example .env
```

Open `.env` in your editor. Adjust as needed:

```
PORT=7878
SITE_PATH=./sites/example                     # or absolute path to your site
DB_PATH=./harness.db
ANTHROPIC_API_KEY=                             # blank if using Claude Code subscription (option A)
MODEL=claude-sonnet-4-6
```

For your real site, `SITE_PATH` should be an absolute path. The bundled `./sites/example` works as-is for first-run.

### 5. Start the harness

```bash
npm start
```

You should see:

```
promptish webdev harness running at http://localhost:7878/
editing site: /absolute/path/to/your/site
model:        claude-sonnet-4-6
```

### 6. Open the harness in your browser

Go to `http://localhost:7878`. You'll see three panes — the file tree on the left, the live preview of your site in the center, the chat sidebar on the right.

### 7. First chat

Type something concrete:

> Change the page title to "Hello from the harness"

Watch the chat pane stream the agent's reply. When it edits a file, the preview iframe refreshes automatically. You'll see the title change.

That's the loop. Type, edit, refresh.

## What success looks like

- `npm start` exits cleanly to a listening state with no stack traces.
- `http://localhost:7878` shows three panes — file tree (left), site preview (center), chat (right).
- A chat message that asks for a concrete change results in: (a) the agent describing what it's doing, (b) a file on disk being modified, (c) the preview pane reflecting the change without you reloading.
- Closing and reopening the browser keeps your prior chat history.

If all four are true, you're done.

## Troubleshooting

### Port already in use

```
Error: listen EADDRINUSE: address already in use :::7878
```

Either kill whatever owns the port, or change `PORT` in `.env` and restart.

### Missing API key

```
Error: ANTHROPIC_API_KEY is not set
```

You either skipped step 4 or `.env` is in the wrong directory. It must live in the harness project root, next to `package.json`.

### SQLite errors on first run

```
Error: SQLITE_CANTOPEN: unable to open database file
```

The `data/` directory doesn't exist or isn't writable. Run:

```bash
mkdir -p data
```

Then `npm start` again.

### Preview pane is blank

`SITE_PATH` is wrong, or it points at a directory with no `index.html` and no dev server. The harness serves the directory statically. If your site needs a build step (Next.js, Vite, etc.), run that build separately and point `SITE_PATH` at the build output.

### Claude Code not found

```
Error: spawn claude ENOENT
```

Claude Code CLI isn't on your PATH. Reinstall per Anthropic's docs and confirm `claude --version` works in the same shell where you run `npm start`.

### Agent edits a file but preview doesn't refresh

The file watcher missed it. Hit refresh in the browser once. If it keeps happening, file an issue with your OS + Node version.

## Getting help

GitHub Issues: https://github.com/PromptishOperations/harness/issues

No SLA. Best effort. Include: OS, Node version, what you ran, what you saw, what you expected.
