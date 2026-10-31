const path = require('path');
const fs = require('fs');
const { spawn, exec } = require('child_process');
const http = require('http');

class BackendManager {
  constructor() {
    this.process = null;
    this.status = 'stopped'; // 'stopped' | 'starting' | 'running' | 'error'
    this.port = 3001;
    this.host = '127.0.0.1';
    this.logs = [];
    this.maxLogs = 200;

    // Load port dynamically from backend/.env if available
    try {
      const envPath = path.resolve(__dirname, '../../../backend/.env');
      if (fs.existsSync(envPath)) {
        const text = fs.readFileSync(envPath, 'utf8');
        const match = text.match(/^PORT\s*=\s*(\d+)/m);
        if (match) this.port = parseInt(match[1], 10);
      }
    } catch (e) {}
  }

  log(message) {
    const time = new Date().toLocaleTimeString();
    const entry = `[${time}] ${message}`;
    this.logs.push(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }
    console.log(`[BackendManager] ${message}`);
  }

  async checkHealth() {
    return new Promise((resolve) => {
      const req = http.get(`http://${this.host}:${this.port}/health`, { timeout: 1500 }, (res) => {
        if (res.statusCode >= 200 && res.statusCode < 400) {
          resolve(true);
        } else {
          resolve(false);
        }
      });
      req.on('error', () => resolve(false));
      req.on('timeout', () => {
        req.destroy();
        resolve(false);
      });
    });
  }

  async start() {
    // 1. Check if backend is already running independently
    const alreadyRunning = await this.checkHealth();
    if (alreadyRunning) {
      this.status = 'running';
      this.log('Backend is already running on port ' + this.port);
      return { status: 'running', external: true };
    }

    this.status = 'starting';
    this.log('Starting local backend process...');

    const backendDir = path.resolve(__dirname, '../../../backend');
    const distScript = path.join(backendDir, 'dist', 'index.js');

    try {
      const nodeExe = 'node';
      this.process = spawn(nodeExe, [distScript], {
        cwd: backendDir,
        env: { ...process.env, PORT: String(this.port), HOST: this.host, ELECTRON_RUN_AS_NODE: '1' },
        stdio: ['ignore', 'pipe', 'pipe'],
        windowsHide: true,
      });

      this.process.stdout.on('data', (data) => {
        const text = data.toString().trim();
        if (text) this.log(`[STDOUT] ${text}`);
      });

      this.process.stderr.on('data', (data) => {
        const text = data.toString().trim();
        if (text) this.log(`[STDERR] ${text}`);
      });

      this.process.on('close', (code) => {
        this.log(`Backend process exited with code ${code}`);
        this.status = 'stopped';
        this.process = null;
      });

      this.process.on('error', (err) => {
        this.log(`Failed to start backend: ${err.message}`);
        this.status = 'error';
        this.process = null;
      });

      // Poll until backend is healthy or timeout
      for (let i = 0; i < 15; i++) {
        await new Promise((r) => setTimeout(r, 600));
        const ok = await this.checkHealth();
        if (ok) {
          this.status = 'running';
          this.log('Backend successfully initialized and verified.');
          return { status: 'running', external: false };
        }
      }

      this.log('Backend did not respond to health check in time; may still be starting.');
      return { status: this.status, external: false };
    } catch (err) {
      this.status = 'error';
      this.log(`Start error: ${err.message}`);
      return { status: 'error', error: err.message };
    }
  }

  stop() {
    if (!this.process) {
      this.status = 'stopped';
      return;
    }

    this.log('Stopping backend child process...');
    try {
      if (process.platform === 'win32' && this.process.pid) {
        exec(`taskkill /pid ${this.process.pid} /T /F`, (err) => {
          if (err) {
            console.error('Failed to taskkill backend:', err);
          }
        });
      } else {
        this.process.kill('SIGTERM');
      }
    } catch (e) {
      console.error('Error stopping backend:', e);
    }
    this.process = null;
    this.status = 'stopped';
  }

  getStatus() {
    return {
      status: this.status,
      port: this.port,
      host: this.host,
      logs: this.logs.slice(-30),
    };
  }
}

module.exports = new BackendManager();
