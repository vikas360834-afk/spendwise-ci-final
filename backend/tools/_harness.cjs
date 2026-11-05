/* Shared harness helpers for the local verification tools. */
const { spawn } = require('child_process');
const path = require('path');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const BASE = process.env.BASE || 'http://localhost:4000';

/**
 * Make sure the backend is reachable. If not, start it as a child of this
 * process so it stays alive for the duration of the test and is torn down
 * with it.
 * @returns {Promise<import('child_process').ChildProcess|null>}
 */
async function ensureServer() {
  try {
    const res = await fetch(`${BASE}/health`);
    if (res.ok) return null;
  } catch {
    /* not running yet */
  }

  const proc = spawn(process.execPath, ['src/server.js'], {
    cwd: path.join(__dirname, '..'),
    stdio: 'ignore',
  });

  for (let i = 0; i < 40; i += 1) {
    await sleep(500);
    try {
      const res = await fetch(`${BASE}/health`);
      if (res.ok) return proc;
    } catch {
      /* keep waiting */
    }
  }

  proc.kill();
  throw new Error('backend did not start on ' + BASE);
}

module.exports = { ensureServer, sleep, BASE };
