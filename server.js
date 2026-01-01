const express = require('express');
const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { Server } = require('socket.io');
const pty = require('node-pty');
const os = require('os');

const dev = process.env.NODE_ENV !== 'production';
const port = 3000;
const app = next({ dev });
const handle = app.getRequestHandler();

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
        
        term = pty.spawn(shell, args, {
          name: 'xterm-color',
          cols: 80,
          rows: 24,
          cwd: process.cwd(),
          env: process.env
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
