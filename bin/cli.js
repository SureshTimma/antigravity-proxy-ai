#!/usr/bin/env node

const { spawn, execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const net = require('net');

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  red: '\x1b[31m',
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function logStep(step, message) {
  console.log(`${colors.cyan}[${step}]${colors.reset} ${message}`);
}

function banner() {
  console.log(`
${colors.magenta}╔═══════════════════════════════════════════════════════════╗
║                                                               ║
║   ${colors.bright}🚀 Antigravity Proxy AI${colors.reset}${colors.magenta}                                  ║
║   ${colors.reset}Modern web interface for Claude AI${colors.magenta}                        ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝${colors.reset}
`);
}

// Check if a port is available
function isPortAvailable(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', () => resolve(false));
    server.once('listening', () => {
      server.close();
      resolve(true);
    });
    server.listen(port, '127.0.0.1');
  });
}

// Find an available port starting from the given port
async function findAvailablePort(startPort, maxAttempts = 20) {
  for (let i = 0; i < maxAttempts; i++) {
    const port = startPort + i;
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`Could not find available port starting from ${startPort}`);
}

function isProxyInstalled() {
  try {
    execSync('antigravity-claude-proxy --version', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

async function installProxy() {
  logStep('1/4', 'Checking antigravity-claude-proxy...');
  
  if (isProxyInstalled()) {
    log('  ✓ antigravity-claude-proxy is already installed', colors.green);
    return true;
  }

  log('  ↓ Installing antigravity-claude-proxy...', colors.yellow);
  
  try {
    execSync('npm install -g antigravity-claude-proxy', { 
      stdio: 'inherit',
      shell: true 
    });
    log('  ✓ antigravity-claude-proxy installed successfully', colors.green);
    return true;
  } catch (error) {
    log('  ✗ Failed to install antigravity-claude-proxy', colors.red);
    log('  Please run: npm install -g antigravity-claude-proxy', colors.yellow);
    return false;
  }
}

function startProxy(port) {
  logStep('2/4', 'Starting proxy server...');
  
  const isWindows = process.platform === 'win32';
  
  let proxy;
  if (isWindows) {
    // On Windows, use windowsHide to prevent terminal window from appearing
    proxy = spawn('cmd.exe', ['/c', `antigravity-claude-proxy start --port ${port}`], {
      stdio: 'ignore',
      detached: false,
      windowsHide: true,
    });
  } else {
    proxy = spawn('sh', ['-c', `antigravity-claude-proxy start --port ${port}`], {
      stdio: 'ignore',
      detached: true,
    });
    proxy.unref();
  }

  log(`  ✓ Proxy server starting on http://localhost:${port}`, colors.green);
  return proxy;
}

async function startWebUI(webPort, proxyPort) {
  logStep('3/4', 'Starting web interface...');
  
  const packageDir = path.resolve(__dirname, '..');
  
  // Check if node_modules exists, if not install
  const nodeModulesPath = path.join(packageDir, 'node_modules');
  if (!fs.existsSync(nodeModulesPath)) {
    log('  ↓ Installing dependencies (first run)...', colors.yellow);
    execSync('npm install --production', { 
      cwd: packageDir, 
      stdio: 'inherit' 
    });
  }

  // Build if .next doesn't exist
  const nextPath = path.join(packageDir, '.next');
  if (!fs.existsSync(nextPath)) {
    log('  ↓ Building application (first run)...', colors.yellow);
    execSync('npm run build', { 
      cwd: packageDir, 
      stdio: 'inherit' 
    });
  }

  log(`  ✓ Starting server on http://localhost:${webPort}`, colors.green);
  
  // Start the Next.js server with custom port and proxy port env
  // Don't use shell: true to avoid the deprecation warning
  const server = spawn(process.execPath, ['server.js'], {
    cwd: packageDir,
    stdio: 'inherit',
    env: {
      ...process.env,
      PORT: webPort.toString(),
      PROXY_PORT: proxyPort.toString(),
    },
  });

  return server;
}

function openBrowser(port) {
  logStep('4/4', 'Opening browser...');
  
  const url = `http://localhost:${port}`;
  const platform = process.platform;
  
  setTimeout(() => {
    try {
      if (platform === 'win32') {
        spawn('cmd.exe', ['/c', 'start', '', url], { 
          stdio: 'ignore',
          windowsHide: true,
        });
      } else if (platform === 'darwin') {
        spawn('open', [url], { stdio: 'ignore' });
      } else {
        spawn('xdg-open', [url], { stdio: 'ignore' });
      }
      log('  ✓ Browser opened', colors.green);
    } catch {
      log(`  → Open ${url} in your browser`, colors.yellow);
    }
  }, 3000);
}

async function main() {
  banner();

  // Check Node.js version
  const nodeVersion = process.version.match(/^v(\d+)/)[1];
  if (parseInt(nodeVersion) < 18) {
    log('Error: Node.js 18 or higher is required', colors.red);
    process.exit(1);
  }

  // Step 1: Install proxy if needed
  const proxyInstalled = await installProxy();
  if (!proxyInstalled) {
    process.exit(1);
  }

  // Find available ports BEFORE starting anything
  log('  → Finding available ports...', colors.cyan);
  
  let proxyPort, webPort;
  try {
    proxyPort = await findAvailablePort(8080);
    webPort = await findAvailablePort(3000);
    
    if (proxyPort !== 8080) {
      log(`  → Port 8080 in use, using ${proxyPort} for proxy`, colors.yellow);
    }
    if (webPort !== 3000) {
      log(`  → Port 3000 in use, using ${webPort} for web UI`, colors.yellow);
    }
  } catch (error) {
    log(`Error: ${error.message}`, colors.red);
    process.exit(1);
  }

  // Step 2: Start proxy server
  const proxyProcess = startProxy(proxyPort);

  // Wait a bit for proxy to start
  await new Promise(resolve => setTimeout(resolve, 3000));

  // Step 3: Start web UI
  const server = await startWebUI(webPort, proxyPort);

  // Step 4: Open browser
  openBrowser(webPort);

  console.log(`
${colors.green}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}
  ${colors.bright}Antigravity Proxy AI is running!${colors.reset}
  
  ${colors.cyan}Web UI:${colors.reset}    http://localhost:${webPort}
  ${colors.cyan}Proxy:${colors.reset}     http://localhost:${proxyPort}
  
  Press ${colors.yellow}Ctrl+C${colors.reset} to stop
${colors.green}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}
`);

  // Handle exit
  process.on('SIGINT', () => {
    console.log(`\n${colors.yellow}Shutting down...${colors.reset}`);
    if (proxyProcess && !proxyProcess.killed) {
      proxyProcess.kill();
    }
    server.kill();
    process.exit(0);
  });
}

main().catch(console.error);
