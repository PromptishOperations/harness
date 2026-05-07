#!/usr/bin/env node
// Promptish webdev harness — entrypoint.
// Loads .env, runs migrations, starts the server.
require('dotenv').config();

const fs = require('fs');
const path = require('path');

if (!process.env.ANTHROPIC_API_KEY) {
  console.error('error: ANTHROPIC_API_KEY missing from environment.');
  console.error('       Copy .env.example to .env and fill it in, then re-run.');
  process.exit(1);
}

const SITE_PATH = path.resolve(process.env.SITE_PATH || './sites/example');
if (!fs.existsSync(SITE_PATH)) {
  console.error(`error: SITE_PATH does not exist: ${SITE_PATH}`);
  console.error('       Set SITE_PATH in .env to a folder containing your site files.');
  process.exit(1);
}

// Run migrations before booting the server.
require('./server/migrate.js');

// Boot.
require('./server/server.js');
