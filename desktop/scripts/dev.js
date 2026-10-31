const { spawn } = require('child_process');
const http = require('http');
const path = require('path');

function waitForVite(port = 5173, maxTries = 30) {
  return new Promise((resolve, reject) => {
    let tries = 0;
    const check = () => {
      tries++;
      const req = http.get(`http://localhost:${port}`, (res) => {
        resolve();
      });
      req.on('error', () => {
        if (tries >= maxTries) {
          reject(new Error('Vite dev server failed to start in time'));
        } else {
          setTimeout(check, 300);
        }
      });
      req.end();
    };
    check();
  });
}

async function runDev() {
  console.log('[Dev] Starting Vite dev server...');
  const isWin = process.platform === 'win32';
  const npxCmd = isWin ? 'npx.cmd' : 'npx';

  const vite = spawn(npxCmd, ['vite'], {
    cwd: path.resolve(__dirname, '..'),
    stdio: 'inherit',
    shell: isWin,
  });

  try {
    await waitForVite();
    console.log('[Dev] Vite ready! Launching Electron...');

    const electron = spawn(npxCmd, ['electron', '.'], {
      cwd: path.resolve(__dirname, '..'),
      env: {
        ...process.env,
        VITE_DEV_SERVER_URL: 'http://localhost:5173',
        NODE_ENV: 'development',
      },
      stdio: 'inherit',
      shell: isWin,
    });

    electron.on('close', (code) => {
      console.log(`[Dev] Electron closed (${code}). Stopping Vite...`);
      try {
        if (isWin && vite.pid) {
          spawn('taskkill', ['/pid', String(vite.pid), '/T', '/F'], { shell: true });
        } else {
          vite.kill();
        }
      } catch (e) {}
      process.exit(code || 0);
    });
  } catch (err) {
    console.error('[Dev] Error:', err.message);
    vite.kill();
    process.exit(1);
  }
}

runDev();
