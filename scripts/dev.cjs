/* One-command local dev runner: starts the API (:4000) and Vite (:5173).
 * Usage: npm run dev   (from the project root)
 */
const { spawn, spawnSync, execFileSync } = require('child_process');
const net = require('net');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const BACKEND = path.join(ROOT, 'backend');
const FRONTEND = path.join(ROOT, 'frontend');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function argValue(names) {
  const argv = process.argv.slice(2);
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    for (const name of names) {
      if (arg === name && argv[i + 1]) return argv[i + 1];
      if (arg.startsWith(`${name}=`)) return arg.slice(name.length + 1);
    }
  }
  return null;
}

const requestedWeb = Number(argValue(['--port', '-p']));
const requestedApi = Number(argValue(['--api-port']));
const WEB_PORT = Number.isInteger(requestedWeb) && requestedWeb > 0 && requestedWeb < 65536 ? requestedWeb : 5173;
const API_PORT = Number.isInteger(requestedApi) && requestedApi > 0 && requestedApi < 65536 ? requestedApi : 4000;
const WEB_URL = `http://localhost:${WEB_PORT}`;

const portBusy = (port) => new Promise((resolve) => {
  const sock = net.connect({ host: '127.0.0.1', port });
  const done = (v) => { sock.destroy(); resolve(v); };
  sock.once('connect', () => done(true));
  sock.once('error', () => done(false));
  setTimeout(() => done(false), 800);
});

const children = [];

function hasModule(dir, name) {
  return fs.existsSync(path.join(dir, 'node_modules', name));
}

function npmInstall(cwd, label) {
  console.log(`\x1b[33m[${label}]\x1b[0m dependencies are missing — installing them now (first run only)...`);
  const args = ['install', '--no-audit', '--no-fund'];
  const res = process.platform === 'win32'
    ? spawnSync('cmd.exe', ['/c', 'npm', ...args], { cwd, stdio: 'inherit' })
    : spawnSync('npm', args, { cwd, stdio: 'inherit' });
  if (res.status !== 0) {
    console.error(`\x1b[31m[${label}]\x1b[0m npm install failed. Check your internet connection and Node.js installation.`);
    process.exit(1);
  }
  console.log(`\x1b[32m[${label}]\x1b[0m dependencies installed.`);
}

function start(label, command, args, cwd, color, extraEnv) {
  const child = spawn(command, args, { cwd, env: { ...process.env, ...(extraEnv || {}) } });
  children.push(child);
  const prefix = `\x1b[${color}m[${label}]\x1b[0m `;
  const pipe = (stream, isErr) => {
    let buf = '';
    stream.on('data', (chunk) => {
      buf += chunk.toString();
      const lines = buf.split(/\r?\n/);
      buf = lines.pop();
      for (const line of lines) if (line.trim()) (isErr ? console.error : console.log)(prefix + line);
    });
  };
  pipe(child.stdout, false);
  pipe(child.stderr, true);
  child.on('exit', (code) => console.log(`${prefix}exited with code ${code}`));
  return child;
}

function shutdown() {
  for (const child of children) {
    if (!child || child.killed) continue;
    try {
      if (process.platform === 'win32') {
        execFileSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' });
      } else {
        child.kill('SIGTERM');
      }
    } catch { /* already gone */ }
  }
}
process.on('SIGINT', () => { shutdown(); process.exit(0); });
process.on('SIGTERM', () => { shutdown(); process.exit(0); });
process.on('exit', shutdown);

(async () => {
  // Make the first run foolproof: install dependencies if node_modules is missing.
  if (!hasModule(BACKEND, 'express')) npmInstall(BACKEND, 'api');
  if (!hasModule(FRONTEND, 'vite')) npmInstall(FRONTEND, 'web');

  const apiUp = await portBusy(API_PORT);
  const webUp = await portBusy(WEB_PORT);

  if (apiUp) console.log(`\x1b[33m[api]\x1b[0m :${API_PORT} is already in use — reusing the running backend.`);
  else start('api', process.execPath, ['src/server.js'], BACKEND, '36', { PORT: String(API_PORT) });

  if (webUp) console.log(`\x1b[33m[web]\x1b[0m :${WEB_PORT} is already in use — reusing the running frontend.`);
  else {
    const viteArgs = ['run', 'dev', '--', '--port', String(WEB_PORT), '--strictPort'];
    if (process.platform === 'win32') start('web', 'cmd.exe', ['/c', 'npm', ...viteArgs], FRONTEND, '35');
    else start('web', 'npm', viteArgs, FRONTEND, '35');
  }

  if (!apiUp) {
    let ok = false;
    for (let i = 0; i < 40; i += 1) {
      await sleep(500);
      try { if ((await fetch(`http://127.0.0.1:${API_PORT}/health`)).ok) { ok = true; break; } } catch { /* wait */ }
    }
    console.log(ok ? `\x1b[32m[api]\x1b[0m healthy on http://localhost:${API_PORT}` : '\x1b[31m[api]\x1b[0m failed to start (see errors above)');
  }

  if (!webUp) {
    let ok = false;
    for (let i = 0; i < 60; i += 1) {
      await sleep(500);
      if (await portBusy(WEB_PORT)) { ok = true; break; }
    }
    console.log(ok ? `\x1b[32m[web]\x1b[0m ready on ${WEB_URL}` : '\x1b[31m[web]\x1b[0m failed to start (see errors above)');
  }

  console.log('\n============================================================');
  console.log('  SpendWise AI is running');
  console.log(`  Open:      ${WEB_URL}`);
  console.log('  Demo login: demo@spendwise.com  /  demo1234');
  console.log(`  API health: http://localhost:${API_PORT}/health`);
  console.log('  Press Ctrl+C to stop both servers.');
  console.log('============================================================\n');

  if (children.length === 0) {
    console.log('Both servers were already running, so nothing new was started.');
    process.exit(0);
  }
})().catch((e) => { console.error(e); shutdown(); process.exit(1); });
