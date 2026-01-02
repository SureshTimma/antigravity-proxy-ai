#!/usr/bin/env node

/**
 * Release script
 * 1. Bumps the package version (patch by default, or specify major/minor/patch as argument)
 * 2. Updates versions.js with the currently installed antigravity-claude-proxy version
 * 3. Commits the changes
 * 4. Creates a git tag
 * 5. Pushes to GitHub (with tags)
 * 6. Publishes to npm
 * 
 * Usage: npm run release [major|minor|patch]
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
};

function run(cmd, options = {}) {
  console.log(`  ${colors.cyan}$ ${cmd}${colors.reset}`);
  try {
    execSync(cmd, { stdio: 'inherit', encoding: 'utf8', ...options });
    return true;
  } catch (error) {
    if (!options.ignoreError) {
      console.log(`${colors.red}✗ Command failed: ${cmd}${colors.reset}`);
      process.exit(1);
    }
    return false;
  }
}

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

function bumpVersion(currentVersion, type = 'patch') {
  const parts = currentVersion.split('.').map(Number);
  
  switch (type) {
    case 'major':
      parts[0]++;
      parts[1] = 0;
      parts[2] = 0;
      break;
    case 'minor':
      parts[1]++;
      parts[2] = 0;
      break;
    case 'patch':
    default:
      parts[2]++;
      break;
  }
  
  return parts.join('.');
}

function main() {
  // Get bump type from command line args (default: patch)
  const bumpType = process.argv[2] || 'patch';
  
  if (!['major', 'minor', 'patch'].includes(bumpType)) {
    console.log(`${colors.red}✗ Invalid version bump type: ${bumpType}${colors.reset}`);
    console.log(`  Use: ${colors.cyan}major${colors.reset}, ${colors.cyan}minor${colors.reset}, or ${colors.cyan}patch${colors.reset}`);
    process.exit(1);
  }

  console.log(`\n${colors.cyan}📦 Starting release process...${colors.reset}\n`);

  // Check for uncommitted changes first
  try {
    const status = execSync('git status --porcelain', { encoding: 'utf8' });
    if (status.trim()) {
      console.log(`${colors.yellow}⚠ You have uncommitted changes. They will be included in the release commit.${colors.reset}\n`);
    }
  } catch {
    console.log(`${colors.red}✗ Not a git repository or git not available${colors.reset}`);
    process.exit(1);
  }

  // Read and update package.json version
  const packageJsonPath = path.join(__dirname, '..', 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  const oldVersion = packageJson.version;
  const newVersion = bumpVersion(oldVersion, bumpType);
  
  packageJson.version = newVersion;
  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n', 'utf8');
  
  console.log(`${colors.green}✓${colors.reset} Version bumped: ${colors.yellow}${oldVersion}${colors.reset} → ${colors.bright}${newVersion}${colors.reset} (${bumpType})`);

  // Get current installed version of antigravity-claude-proxy
  const claudeProxyVersion = getInstalledVersion('antigravity-claude-proxy');

  if (!claudeProxyVersion) {
    console.log(`${colors.red}✗ antigravity-claude-proxy is not installed globally!${colors.reset}`);
    console.log(`  Install it first: ${colors.cyan}npm install -g antigravity-claude-proxy${colors.reset}\n`);
    process.exit(1);
  }

  console.log(`${colors.green}✓${colors.reset} Found antigravity-claude-proxy: ${colors.bright}${claudeProxyVersion}${colors.reset}`);

  // Update versions.js
  const versionsPath = path.join(__dirname, '..', 'app', 'config', 'versions.js');
  
  const versionsContent = `// Required versions - Auto-updated by prepublish script
// DO NOT EDIT MANUALLY - This is updated automatically before each publish

export const REQUIRED_VERSIONS = {
  // The version of antigravity-claude-proxy bundled with this release
  'antigravity-claude-proxy': '${claudeProxyVersion}'
};
`;

  fs.writeFileSync(versionsPath, versionsContent, 'utf8');
  console.log(`${colors.green}✓${colors.reset} Updated ${colors.cyan}app/config/versions.js${colors.reset}`);

  // Git operations
  console.log(`\n${colors.cyan}📝 Committing changes...${colors.reset}\n`);
  run('git add -A');
  run(`git commit -m "Release v${newVersion}"`);
  
  console.log(`\n${colors.cyan}🏷️  Creating git tag...${colors.reset}\n`);
  run(`git tag -a v${newVersion} -m "Release v${newVersion}"`);
  
  console.log(`\n${colors.cyan}📤 Pushing to GitHub...${colors.reset}\n`);
  run('git push');
  run('git push --tags');
  
  console.log(`\n${colors.cyan}📦 Publishing to npm...${colors.reset}\n`);
  run('npm publish');

  console.log(`\n${colors.green}═══════════════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.green}✓ Release v${newVersion} published successfully!${colors.reset}`);
  console.log(`${colors.green}═══════════════════════════════════════════════════════════${colors.reset}`);
  console.log(`\n  ${colors.bright}npm:${colors.reset}    https://www.npmjs.com/package/antigravity-proxy-ai`);
  console.log(`  ${colors.bright}GitHub:${colors.reset} https://github.com/SureshTimma/antigravity-proxy-ai/releases/tag/v${newVersion}`);
  console.log(`\n  Bundled with antigravity-claude-proxy@${claudeProxyVersion}\n`);
}

main();
