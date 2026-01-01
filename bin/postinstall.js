#!/usr/bin/env node

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
  yellow: '\x1b[33m',
};

function createWindowsShortcut() {
  if (process.platform !== 'win32') return;
  
  try {
    // Find the npm global bin directory
    const npmBin = execSync('npm bin -g', { encoding: 'utf8' }).trim();
    const cmdPath = path.join(npmBin, 'antigravity-proxy-ai.cmd');
    
    if (!fs.existsSync(cmdPath)) {
      return; // Skip if not installed globally
    }

    // Start Menu path
    const startMenuPath = path.join(
      os.homedir(),
      'AppData',
      'Roaming',
      'Microsoft',
      'Windows',
      'Start Menu',
      'Programs'
    );

    const shortcutPath = path.join(startMenuPath, 'Antigravity Proxy AI.lnk');

    // PowerShell script to create shortcut
    const psScript = `
      $WshShell = New-Object -ComObject WScript.Shell
      $Shortcut = $WshShell.CreateShortcut('${shortcutPath.replace(/\\/g, '\\\\')}')
      $Shortcut.TargetPath = 'cmd.exe'
      $Shortcut.Arguments = '/c antigravity-proxy-ai'
      $Shortcut.WorkingDirectory = '%USERPROFILE%'
      $Shortcut.Description = 'Antigravity Proxy AI - Claude Chat Interface'
      $Shortcut.WindowStyle = 1
      $Shortcut.Save()
    `;

    execSync(`powershell -ExecutionPolicy Bypass -Command "${psScript.replace(/"/g, '\\"').replace(/\n/g, ' ')}"`, {
      stdio: 'ignore'
    });

    console.log(`  ${colors.green}✓${colors.reset} Start Menu shortcut created`);
    
    // Ask about desktop shortcut
    const desktopPath = path.join(os.homedir(), 'Desktop', 'Antigravity Proxy AI.lnk');
    const psDesktopScript = `
      $WshShell = New-Object -ComObject WScript.Shell
      $Shortcut = $WshShell.CreateShortcut('${desktopPath.replace(/\\/g, '\\\\')}')
      $Shortcut.TargetPath = 'cmd.exe'
      $Shortcut.Arguments = '/c antigravity-proxy-ai'
      $Shortcut.WorkingDirectory = '%USERPROFILE%'
      $Shortcut.Description = 'Antigravity Proxy AI - Claude Chat Interface'
      $Shortcut.WindowStyle = 1
      $Shortcut.Save()
    `;

    execSync(`powershell -ExecutionPolicy Bypass -Command "${psDesktopScript.replace(/"/g, '\\"').replace(/\n/g, ' ')}"`, {
      stdio: 'ignore'
    });

    console.log(`  ${colors.green}✓${colors.reset} Desktop shortcut created`);

  } catch (error) {
    // Silently fail - shortcuts are optional
  }
}

function main() {
  console.log(`
${colors.magenta}╔═══════════════════════════════════════════════════════════╗${colors.reset}
${colors.magenta}║${colors.reset}                                                           ${colors.magenta}║${colors.reset}
${colors.magenta}║${colors.reset}   ${colors.green}✓${colors.reset} ${colors.bright}Antigravity Proxy AI${colors.reset} installed successfully!      ${colors.magenta}║${colors.reset}
${colors.magenta}║${colors.reset}                                                           ${colors.magenta}║${colors.reset}
${colors.magenta}╚═══════════════════════════════════════════════════════════╝${colors.reset}
`);

  // Create Windows shortcuts if installed globally
  createWindowsShortcut();

  console.log(`
  ${colors.bright}To start the application:${colors.reset}

    ${colors.cyan}antigravity-proxy-ai${colors.reset}     ${colors.yellow}(from terminal)${colors.reset}

  ${colors.bright}Or use the shortcuts:${colors.reset}

    ${colors.cyan}• Start Menu${colors.reset} → Search "Antigravity"
    ${colors.cyan}• Desktop${colors.reset} → Double-click the icon
    ${colors.cyan}• Taskbar${colors.reset} → Right-click shortcut → "Pin to taskbar"

`);
}

main();

