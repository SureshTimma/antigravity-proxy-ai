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

function checkCommand(command) {
  try {
    execSync(`${command} --version`, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
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

function startProxy() {
  logStep('2/4', 'Starting proxy server...');
  
  const isWindows = process.platform === 'win32';
  const command = isWindows ? 'powershell' : 'sh';
  const args = isWindows 
    ? ['-ExecutionPolicy', 'Bypass', '-Command', 'antigravity-claude-proxy start']
    : ['-c', 'antigravity-claude-proxy start'];

  const proxy = spawn(command, args, {
    stdio: 'ignore',
    detached: true,
    shell: false,
  });

  proxy.unref();
  log('  ✓ Proxy server starting on http://localhost:8080', colors.green);
  return proxy;
}

async function startWebUI() {
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

  log('  ✓ Starting server on http://localhost:3000', colors.green);
  
  // Start the Next.js server
  const server = spawn('node', ['server.js'], {
    cwd: packageDir,
    stdio: 'inherit',
    shell: true,
  });

  return server;
}

function openBrowser() {
  logStep('4/4', 'Opening browser...');
  
  const url = 'http://localhost:3000';
  const platform = process.platform;
  
  setTimeout(() => {
    try {
      if (platform === 'win32') {
        execSync(`start ${url}`, { shell: true, stdio: 'ignore' });
      } else if (platform === 'darwin') {
        execSync(`open ${url}`, { stdio: 'ignore' });
      } else {
        execSync(`xdg-open ${url}`, { stdio: 'ignore' });
      }
      log('  ✓ Browser opened', colors.green);
    } catch {
      log(`  → Open ${url} in your browser`, colors.yellow);
    }
  }, 2000);
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

  // Step 2: Start proxy server
  startProxy();

  // Wait a bit for proxy to start
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Step 3: Start web UI
  const server = await startWebUI();

  // Step 4: Open browser
  openBrowser();

  console.log(`
${colors.green}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}
  ${colors.bright}Antigravity Proxy AI is running!${colors.reset}
  
  ${colors.cyan}Web UI:${colors.reset}    http://localhost:3000
  ${colors.cyan}Proxy:${colors.reset}     http://localhost:8080
  
  Press ${colors.yellow}Ctrl+C${colors.reset} to stop
${colors.green}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}
`);

  // Handle exit
  process.on('SIGINT', () => {
    console.log(`\n${colors.yellow}Shutting down...${colors.reset}`);
    server.kill();
    process.exit(0);
  });
}

main().catch(console.error);
