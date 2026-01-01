const express = require('express');
const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { Server } = require('socket.io');
const pty = require('node-pty');
const os = require('os');
const { spawn } = require('child_process');

const dev = process.env.NODE_ENV !== 'production';
const port = parseInt(process.env.PORT, 10) || 8643;
const proxyPort = parseInt(process.env.PROXY_PORT, 10) || 8642;
const app = next({ dev });
const handle = app.getRequestHandler();

// Start proxy server automatically
let proxyProcess = null;

function startProxyServer() {
  const isWindows = os.platform() === 'win32';
  const env = { ...process.env, PORT: proxyPort.toString() };
  
  if (isWindows) {
    proxyProcess = spawn('cmd.exe', ['/c', 'antigravity-claude-proxy start'], {
      stdio: 'inherit',
      env,
    });
  } else {
    proxyProcess = spawn('sh', ['-c', 'antigravity-claude-proxy start'], {
      stdio: 'inherit',
      env,
    });
  }
  
  proxyProcess.on('error', (err) => {
    console.error('Failed to start proxy server:', err.message);
    console.log('Make sure antigravity-claude-proxy is installed: npm install -g antigravity-claude-proxy');
  });
  
  proxyProcess.on('exit', (code) => {
    if (code !== 0 && code !== null) {
      console.log(`Proxy server exited with code ${code}`);
    }
  });
}

// Cleanup on exit
process.on('SIGINT', () => {
  console.log('\nShutting down...');
  if (proxyProcess) {
    proxyProcess.kill();
  }
  process.exit(0);
});

process.on('SIGTERM', () => {
  if (proxyProcess) {
    proxyProcess.kill();
  }
  process.exit(0);
});

// Start proxy only in development mode (production CLI handles it separately)
if (dev) {
  console.log(`Starting proxy server on http://localhost:${proxyPort}...`);
  startProxyServer();
}

// Wait a bit for proxy to start (in dev mode), then start Next.js
const startDelay = dev ? 2000 : 0;
setTimeout(() => {
  app.prepare().then(() => {
  const server = express();
  const httpServer = createServer(server);
  const io = new Server(httpServer);

  io.on('connection', (socket) => {
    console.log('Client connected to terminal socket', socket.id);
    let term = null;

    socket.on('terminal:start', () => {
        if (term) return; // Already started
        
        const shell = os.platform() === 'win32' ? 'powershell.exe' : 'bash';
        const args = os.platform() === 'win32' ? ['-ExecutionPolicy', 'Bypass'] : [];
        
        // Create clean environment for PTY - remove conflicting PORT variable
        // and set PROXY_PORT for antigravity-claude-proxy
        const ptyEnv = { ...process.env };
        delete ptyEnv.PORT; // Remove web server port so proxy uses its default or PROXY_PORT
        ptyEnv.PROXY_PORT = proxyPort.toString();
        
        term = pty.spawn(shell, args, {
          name: 'xterm-color',
          cols: 80,
          rows: 24,
          cwd: process.cwd(),
          env: ptyEnv
        });

        // Send output to client
        term.onData((data) => {
          socket.emit('terminal:output', data);
        });

        term.onExit(({ exitCode, signal }) => {
            console.log(`Processes exited with code: ${exitCode}`);
        });

        console.log('PTY process started');
    });

    socket.on('terminal:input', (data) => {
      if (term) {
        term.write(data);
      }
    });
    
    socket.on('terminal:resize', ({ cols, rows }) => {
        if (term) {
            term.resize(cols, rows);
        }
    });

    socket.on('disconnect', () => {
      console.log('Client disconnected', socket.id);
      if (term) {
        term.kill();
        term = null;
      }
    });
  });

  server.all(/.*/, (req, res) => {
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  });

  httpServer.listen(port, (err) => {
    if (err) throw err;
    console.log(`> Ready on http://localhost:${port}`);
  });
});
}, 2000); // Wait for proxy to start
