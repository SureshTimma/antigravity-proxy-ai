#!/usr/bin/env node

const { spawn, execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

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
    // On Windows, set PORT env and use powershell for proper env handling
    proxy = spawn('powershell.exe', [
      '-ExecutionPolicy', 'Bypass',
      '-Command', `$env:PORT='${port}'; antigravity-claude-proxy start`
    ], {
      stdio: 'ignore',
      detached: false,
      windowsHide: true,
    });
  } else {
    // On Unix, inline env var works
    proxy = spawn('sh', ['-c', `PORT=${port} antigravity-claude-proxy start`], {
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

  // Check for production build - BUILD_ID is the key indicator
  const nextPath = path.join(packageDir, '.next');
  const buildIdPath = path.join(nextPath, 'BUILD_ID');
  
  if (!fs.existsSync(buildIdPath)) {
    log('  ↓ Building application (first run, this may take a minute)...', colors.yellow);
    try {
      execSync('npm run build', { 
        cwd: packageDir, 
        stdio: 'inherit' 
      });
      log('  ✓ Build completed successfully', colors.green);
    } catch (error) {
      log('  ✗ Build failed', colors.red);
      throw error;
    }
  }

  log(`  ✓ Starting server on http://localhost:${webPort}`, colors.green);
  
  // Start the Next.js server with custom port and proxy port env
  // Don't use shell: true to avoid the deprecation warning
  const server = spawn(process.execPath, ['server.js'], {
    cwd: packageDir,
    stdio: 'inherit',
    env: {
      ...process.env,
      NODE_ENV: 'production',
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

  // Fixed ports - unique to avoid common port conflicts
  const proxyPort = 8642;
  const webPort = 8643;

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
