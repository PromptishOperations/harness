#!/usr/bin/env node
// PostToolUse hook for the harness. Reads the JSON event off stdin and appends
// a one-line JSON record to the local dispatch log. Pure local audit trail —
// nothing is sent over the network.
//
// Activated when the spawned `claude` subprocess sets HARNESS_DISPATCH_ID in env.

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
    type: 'tool_call',
    tool: event.tool_name,
    input: trimInput(event.tool_input),
    response: summarize(event.tool_response),
    cwd: event.cwd || null,
  };
  try { fs.appendFileSync(logPath, JSON.stringify(record) + '\n'); } catch {}
  process.exit(0);
});

function trimInput(input) {
  if (!input) return null;
  try {
    const s = JSON.stringify(input);
    return s.length > 4000 ? s.slice(0, 4000) + '…(truncated)' : input;
  } catch { return null; }
}

function summarize(resp) {
  if (!resp) return null;
  if (typeof resp === 'string') return resp.slice(0, 500);
  try {
    const s = JSON.stringify(resp);
    return s.length > 1000 ? s.slice(0, 1000) + '…' : s;
  } catch { return null; }
}
