# Demo Script — Promptish Harness

Target length: **3 minutes final cut**, hard cap 5 min. The point is to show the loop, not narrate every byte.

## Pre-recording checklist

**On screen:**
- Browser at `http://localhost:7878`, harness running, demo site loaded in preview pane.
- A separate file-explorer window showing the demo site directory (only briefly, to prove "yes, real files on disk").

**NOT on screen:**
- Your `.env` file.
- The Anthropic console.
- Any other browser tabs (close them or use a fresh profile).
- Any chat apps, email, Slack, Discord notifications. Set OS to Do Not Disturb.
- Terminal output containing the API key. If you must show the terminal, scroll past the startup logs first.

**Recording setup:**
- Resolution: 1920x1080. Record full screen, not a window — captures any modals.
- Mic: do a 10-second test before the real take. Clip if you peak. Aim for -12 to -6 dB.
- Cursor: enable click highlighting if your screen recorder supports it.
- Browser zoom: 110-125% so text is readable on phones.
- Demo site: pick one with a visible header, hero, and a couple sections. Generic landing-page-ish. Not a client site.

## Beats

### [0:00 – 0:10] Hook

To camera or voiceover, one sentence:

> "This is Promptish Harness — chat with Claude on the left, watch your website rebuild itself on the right."

Cut to the harness UI, both panes visible.

### [0:10 – 0:30] What you're looking at

Voiceover while pointing with cursor:

> "Left side: chat. Right side: a live preview of my actual site, served from a folder on my disk. The agent has read-write access to that folder."

Briefly alt-tab to the file explorer showing the site directory. 2 seconds, no more. Alt-tab back.

### [0:30 – 1:00] Beat 1 — the easy ask

Type into chat:

> "Change the header background to a deep purple and the headline color to neon pink."

Hit send. Let the chat stream. When the agent finishes, the preview pane refreshes automatically.

Voiceover during the stream:

> "It's reading the relevant CSS file, making the edit, and saving. No build step in front of me, no copy-paste."

### [1:00 – 1:50] Beat 2 — the slightly clever ask

Drag a screenshot or reference image into the chat (a section design, a color palette, anything visually concrete). Type:

> "Match the hero section to this. Same layout, same vibe."

Hit send. Let the agent work. This will likely touch HTML and CSS, possibly more than one file. Preview refreshes when it's done.

Voiceover:

> "This is the part that used to take me an afternoon. Reference image in, working section out."

### [1:50 – 2:30] Beat 3 — proof of memory + multi-file

Type:

> "Now make it responsive — the hero should stack on mobile."

Let it run. The agent should reference the prior context and edit responsive CSS.

Voiceover:

> "Chat history persists. Restart the harness, your conversation's still there. SQLite, single file."

### [2:30 – 2:50] Closing

Cut to a simple end card or just the harness UI.

Voiceover:

> "Promptish Harness. Ninety-nine dollars, one-time, source-available, runs on your machine. Buy at promptish.io/harness. Bugs and feature requests on GitHub."

Show the URL on screen as text overlay.

### [2:50 – 3:00] End card

Static frame, 5 seconds:

```
promptish.io/harness — $99
github.com/PromptishOperations/harness
```

## Things to NOT do

- Don't narrate every keystroke. The viewer can read.
- Don't edit out the agent's "thinking" pauses entirely — a couple seconds of stream is the proof it's real.
- Don't show error states unless the recovery is fast and impressive. Save those for a separate "real-world" video.
- Don't promise features that aren't in v1 (multi-site, cloud, plugins).
- Don't use the word "magical." It isn't, and the buyer's BS detector will trip.

## Post-production

- Add captions. Half the audience will watch muted on a phone.
- Color-correct the harness UI if the recorder washed it out — the cyberpunk palette matters for brand.
- Export at 1080p, H.264, target file under 80 MB.
- Title: `Promptish Harness — 3-minute demo`
- Drop the final cut at `/docs/demo.md` link target, embed on `promptish.io/harness`.

## Backup plan if a beat fails on camera

Re-record just that beat. Don't re-record the whole video. Editor stitches.

If the agent does something genuinely funny or wrong on a take, keep it in a B-roll folder for a separate "honest demo" video later. Don't ship it as the main demo.
