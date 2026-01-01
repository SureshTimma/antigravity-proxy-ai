#!/usr/bin/env node

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
};

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
