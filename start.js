#!/usr/bin/env node
// Promptish webdev harness — entrypoint.
// Loads .env, runs migrations, starts the server.
require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Auth check — accept either ANTHROPIC_API_KEY or a logged-in Claude Code session.
// Claude Code subscription users don't need to set ANTHROPIC_API_KEY; their
// CLI auth (claude /login or claude setup-token) is sufficient because the
// harness shells out to `claude -p` rather than calling the SDK directly.
const hasApiKey = !!process.env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_API_KEY.startsWith('placeholder');
let hasClaudeLogin = false;
try {
  const status = execSync('claude auth status', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
  hasClaudeLogin = /"loggedIn"\s*:\s*true/.test(status);
} catch {
  // claude not on PATH or not authenticated — treated as not-logged-in
}

if (!hasApiKey && !hasClaudeLogin) {
  console.error('error: no Anthropic credentials available.');
  console.error('');
  console.error('  the harness needs ONE of these (not both):');
  console.error('    a) Claude Code subscription: install Claude Code, then `claude /login` once');
  console.error('    b) Anthropic API key: set ANTHROPIC_API_KEY in .env (creates per-token billing)');
  console.error('');
  console.error('  most buyers use (a) — already paid for Claude Code, no extra API billing.');
  process.exit(1);
}

if (hasApiKey && hasClaudeLogin) {
  console.warn('note: both ANTHROPIC_API_KEY and Claude Code login are present.');
  console.warn('      ANTHROPIC_API_KEY will take precedence inside spawned `claude -p`.');
  console.warn('      to use your Claude Code subscription instead, unset ANTHROPIC_API_KEY in .env.');
}

const SITE_PATH = path.resolve(process.env.SITE_PATH || './sites/example');
if (!fs.existsSync(SITE_PATH)) {
  console.error(`error: SITE_PATH does not exist: ${SITE_PATH}`);
  console.error('       set SITE_PATH in .env to a folder containing your site files.');
  process.exit(1);
}

// Run migrations before booting the server.
require('./server/migrate.js');

// Boot.
require('./server/server.js');
