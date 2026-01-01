import { NextResponse } from 'next/server';
import { execSync } from 'child_process';
import { REQUIRED_VERSIONS } from '../../config/versions.js';

// Force dynamic rendering - don't pre-render this route
export const dynamic = 'force-dynamic';
export const revalidate = 0;

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

// Get latest version from npm registry
async function getLatestVersion(packageName) {
  try {
    const response = await fetch(`https://registry.npmjs.org/${packageName}/latest`, {
      headers: { 'Accept': 'application/json' },
      cache: 'no-store'
    });
    if (!response.ok) return null;
    const data = await response.json();
    return data.version;
  } catch {
    return null;
  }
}

// Compare semantic versions - returns true if 'target' is newer than 'installed'
function isOlderThan(installed, target) {
  if (!installed || !target) return false;
  
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

export async function GET() {
  try {
    // Check antigravity-proxy-ai (this package) - use npm latest
    const proxyAiInstalled = getInstalledVersion('antigravity-proxy-ai');
    const proxyAiLatest = await getLatestVersion('antigravity-proxy-ai');
    const proxyAiUpdateAvailable = isOlderThan(proxyAiInstalled, proxyAiLatest);

    // Check antigravity-claude-proxy - use required version from config
    const claudeProxyInstalled = getInstalledVersion('antigravity-claude-proxy');
    const claudeProxyRequired = REQUIRED_VERSIONS['antigravity-claude-proxy'];
    const claudeProxyUpdateAvailable = isOlderThan(claudeProxyInstalled, claudeProxyRequired);

    return NextResponse.json({
      packages: {
        'antigravity-proxy-ai': {
          installed: proxyAiInstalled,
          latest: proxyAiLatest,
          updateAvailable: proxyAiUpdateAvailable
        },
        'antigravity-claude-proxy': {
          installed: claudeProxyInstalled,
          required: claudeProxyRequired,
          updateAvailable: claudeProxyUpdateAvailable
        }
      },
      hasUpdates: proxyAiUpdateAvailable || claudeProxyUpdateAvailable,
      updateCommand: getUpdateCommand(proxyAiUpdateAvailable, claudeProxyUpdateAvailable, claudeProxyRequired)
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

function getUpdateCommand(proxyAiNeedsUpdate, claudeProxyNeedsUpdate, claudeProxyVersion) {
  const packages = [];
  if (proxyAiNeedsUpdate) packages.push('antigravity-proxy-ai@latest');
  if (claudeProxyNeedsUpdate) packages.push(`antigravity-claude-proxy@${claudeProxyVersion}`);
  
  if (packages.length === 0) return null;
  return `npm install -g ${packages.join(' ')}`;
}
