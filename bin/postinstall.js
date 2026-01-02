#!/usr/bin/env node

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
};

// Read required version from versions.js (parse as text since it's ESM)
function getRequiredVersion() {
  try {
    const versionsPath = path.join(__dirname, '..', 'app', 'config', 'versions.js');
    const content = fs.readFileSync(versionsPath, 'utf8');
    const match = content.match(/'antigravity-claude-proxy':\s*'([^']+)'/);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

// Get installed version of a global package
function getInstalledVersion(packageName) {
  try {
    const result = execSync(`npm list -g ${packageName} --depth=0 --json`, { 
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'ignore']
    });
    const data = JSON.parse(result);
    return data.dependencies?.[packageName]?.version || null;
  } catch {
    return null;
  }
}

// Compare semantic versions - returns true if 'target' is newer than 'installed'
function isOlderThan(installed, target) {
  if (!installed || !target) return true; // If not installed, needs install
  
  const installedParts = installed.split('.').map(Number);
  const targetParts = target.split('.').map(Number);
  
  for (let i = 0; i < 3; i++) {
    const inst = installedParts[i] || 0;
    const tgt = targetParts[i] || 0;
    if (tgt > inst) return true;
    if (tgt < inst) return false;
  }
  return false;
}

function installClaudeProxy(version) {
  console.log(`\n${colors.cyan}📦 Installing antigravity-claude-proxy@${version}...${colors.reset}\n`);
  
  try {
    execSync(`npm install -g antigravity-claude-proxy@${version}`, { 
      stdio: 'inherit',
      encoding: 'utf8'
    });
    console.log(`\n${colors.green}✓${colors.reset} antigravity-claude-proxy@${version} installed successfully!`);
    return true;
  } catch (error) {
    console.log(`\n${colors.yellow}⚠${colors.reset} Could not install antigravity-claude-proxy automatically.`);
    console.log(`  Please run manually: ${colors.cyan}npm install -g antigravity-claude-proxy@${version}${colors.reset}`);
    return false;
  }
}

function main() {
  const requiredVersion = getRequiredVersion();
  const installedVersion = getInstalledVersion('antigravity-claude-proxy');

  // Check if we need to install/update antigravity-claude-proxy
  if (requiredVersion) {
    if (!installedVersion) {
      console.log(`\n${colors.yellow}⚠${colors.reset} antigravity-claude-proxy is not installed.`);
      installClaudeProxy(requiredVersion);
    } else if (isOlderThan(installedVersion, requiredVersion)) {
      console.log(`\n${colors.yellow}⚠${colors.reset} antigravity-claude-proxy needs update: ${installedVersion} → ${requiredVersion}`);
      installClaudeProxy(requiredVersion);
    } else {
      console.log(`\n${colors.green}✓${colors.reset} antigravity-claude-proxy@${installedVersion} is up to date.`);
    }
  }

  // Show success message
  console.log(`
${colors.magenta}╔═══════════════════════════════════════════════════════════╗${colors.reset}
${colors.magenta}║${colors.reset}                                                           ${colors.magenta}║${colors.reset}
${colors.magenta}║${colors.reset}   ${colors.green}✓${colors.reset} ${colors.bright}Antigravity Proxy AI${colors.reset} installed successfully!      ${colors.magenta}║${colors.reset}
${colors.magenta}║${colors.reset}                                                           ${colors.magenta}║${colors.reset}
${colors.magenta}╚═══════════════════════════════════════════════════════════╝${colors.reset}

  ${colors.bright}To start the application, run:${colors.reset}

    ${colors.cyan}antigravity-proxy-ai${colors.reset}

  ${colors.bright}Or use npx:${colors.reset}

    ${colors.cyan}npx antigravity-proxy-ai${colors.reset}

`);
}

main();
