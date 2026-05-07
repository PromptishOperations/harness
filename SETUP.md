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

You also need:
- An Anthropic API key. Create one at https://console.anthropic.com → Settings → API Keys.
- A site directory. The folder of HTML/JS/whatever you want the agent to edit.

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

This pulls a small dep tree (Express, better-sqlite3, chokidar, dotenv). Should take under a minute.

### 3. Get your Anthropic API key

Go to https://console.anthropic.com → Settings → API Keys → Create Key. Copy it. Treat it like a password — it bills your account.

### 4. Create your `.env`

Copy the example:

```bash
cp .env.example .env
```

Open `.env` in your editor. Fill in:

```
PORT=7878
SITE_PATH=/absolute/path/to/your/site
DB_PATH=./data/harness.db
ANTHROPIC_API_KEY=sk-ant-...
MODEL=claude-sonnet-4-5
```

`SITE_PATH` must be an absolute path. `~` and relative paths will fail.

### 5. Start the harness

```bash
npm start
```

You should see:

```
[harness] db ready at ./data/harness.db
[harness] watching /absolute/path/to/your/site
[harness] listening on http://localhost:7878
```

### 6. Open the harness in your browser

Go to `http://localhost:7878`. You'll see the chat pane on the left, the live preview of your site on the right.

### 7. First chat

Type something concrete:

> Change the page title to "Hello from the harness"

Watch the chat pane stream the agent's reply. When it edits a file, the preview iframe refreshes automatically. You'll see the title change.

That's the loop. Type, edit, refresh.

## What success looks like

- `npm start` exits cleanly to a listening state with no stack traces.
- `http://localhost:7878` shows two panes — chat (left), site preview (right).
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
