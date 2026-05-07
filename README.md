```
██████╗ ██████╗  ██████╗ ███╗   ███╗██████╗ ████████╗██╗███████╗██╗  ██╗
██╔══██╗██╔══██╗██╔═══██╗████╗ ████║██╔══██╗╚══██╔══╝██║██╔════╝██║  ██║
██████╔╝██████╔╝██║   ██║██╔████╔██║██████╔╝   ██║   ██║███████╗███████║
██╔═══╝ ██╔══██╗██║   ██║██║╚██╔╝██║██╔═══╝    ██║   ██║╚════██║██╔══██║
██║     ██║  ██║╚██████╔╝██║ ╚═╝ ██║██║        ██║   ██║███████║██║  ██║
╚═╝     ╚═╝  ╚═╝ ╚═════╝ ╚═╝     ╚═╝╚═╝        ╚═╝   ╚═╝╚══════╝╚═╝  ╚═╝
                          H A R N E S S   //   v1
```

> Chat with Claude. Watch your site rebuild itself in the next pane.

The harness is a local chat-driven IDE for a single website. Point it at a directory, type what you want changed, and a Claude agent edits the files in place while a live preview iframe refreshes next to the chat. SQLite keeps every conversation so you can pick up where you left off.

## What you get

- A local web app: chat pane on the left, live site preview on the right.
- A Claude agent wired to your site directory with file read/write/edit tools.
- Persistent chat history per site (SQLite, single file on disk).
- Hot-reload preview — saves trigger an iframe refresh, no manual reload.
- The whole source. Read it, audit it, modify it for your own use.

## Quickstart

```bash
git clone https://github.com/PromptishOperations/harness.git
cd harness
npm install
cp .env.example .env          # then edit .env, drop in your API key + site path
npm start
```

Open `http://localhost:7878`. Start typing.

## Prerequisites

| Requirement       | Why                                                |
|-------------------|----------------------------------------------------|
| Node.js 20+       | Runtime for the harness server.                    |
| Anthropic API key | The agent talks to Claude. Get one at console.anthropic.com. |
| Claude Code CLI   | The harness shells out to it for agent execution.  |
| A site directory  | Static or framework-based. The agent edits files in this dir. |

## Configuration

All config via `.env` in the project root.

| Variable             | Default                  | Notes                                              |
|----------------------|--------------------------|----------------------------------------------------|
| `PORT`               | `7878`                   | Where the harness listens.                         |
| `SITE_PATH`          | (required)               | Absolute path to the site directory you're editing. |
| `DB_PATH`            | `./data/harness.db`      | SQLite file. Created on first run.                 |
| `ANTHROPIC_API_KEY`  | (required)               | Your key. Never commit this.                       |
| `MODEL`              | `claude-sonnet-4-5`      | Override to test other models.                     |

## What's in v1

- Single site per harness instance.
- Chat history persisted across restarts.
- File edit / create / read tools available to the agent.
- Live preview via iframe with auto-refresh on file change.
- Image attachments in chat (drop a screenshot, ask "match this").

## What's NOT in v1

- Multi-site switching. One harness, one site. Multi-site lands in v2.
- Hosted/cloud version. This is self-hosted only.
- Auth / multi-user. Run it on your own machine.
- Update mechanism. $99 buys the current state at purchase. No update commitment yet.
- Plugins, themes, integrations.

## License

Source-available. Free for personal use, evaluation, and non-commercial work. Commercial use (any business operation, agency client work, internal company use) requires a $99 commercial license at https://promptish.io/harness.

Honor system. We don't phone home. We do read GitHub stars and issues.

Full terms: [LICENSE](./LICENSE).

## Support

GitHub Issues only: https://github.com/PromptishOperations/harness/issues

No SLA. Best effort. We read everything that gets filed. If you need contracted support, that's a different conversation — operator@promptish.io.

## Demo

Demo video: coming soon. See [DEMO-SCRIPT.md](./DEMO-SCRIPT.md) for the walkthrough.

## Buy

`https://promptish.io/harness` — $99 one-time, commercial license.

---

Built by [Promptish](https://promptish.io). We use this internally to ship our own client work.
