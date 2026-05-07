#!/usr/bin/env node
// UserPromptSubmit hook for the harness. Appends the user's prompt to the
// dispatch's local audit log. No network calls.

const fs = require('fs');
const path = require('path');

let stdin = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', c => stdin += c);
process.stdin.on('end', () => {
  let event;
  try { event = JSON.parse(stdin); } catch { process.exit(0); }

  const dispatchId = process.env.HARNESS_DISPATCH_ID;
  if (!dispatchId) process.exit(0);

  const logPath = path.resolve(__dirname, '..', 'dispatches', `${dispatchId}.tool.log`);
  try { fs.mkdirSync(path.dirname(logPath), { recursive: true }); } catch {}

  const record = {
    ts: new Date().toISOString(),
    type: 'user_prompt',
    prompt: (event.prompt || '').slice(0, 4000),
    cwd: event.cwd || null,
  };
  try { fs.appendFileSync(logPath, JSON.stringify(record) + '\n'); } catch {}
  process.exit(0);
});
