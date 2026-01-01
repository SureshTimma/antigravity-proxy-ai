import { NextResponse } from 'next/server';
import { spawn } from 'child_process';

let proxyProcess = null;

export async function POST(request) {
  if (proxyProcess) {
    return NextResponse.json({ message: 'Proxy is already running', status: 'running' }, { status: 400 });
  }

  try {
    // Explicitly set PORT to 8080 to avoid conflict with Next.js (which sets PORT env var)
    const env = { ...process.env, PORT: '8080' };
    proxyProcess = spawn('antigravity-claude-proxy', ['start'], { shell: true, env });

    proxyProcess.stdout.on('data', (data) => {
      console.log(`[Proxy Log]: ${data}`);
      // In a real app, we would push this to a websocket or store it for polling
    });

    proxyProcess.stderr.on('data', (data) => {
      console.error(`[Proxy Error]: ${data}`);
    });

    proxyProcess.on('close', (code) => {
      console.log(`Proxy process exited with code ${code}`);
      proxyProcess = null;
    });

    return NextResponse.json({ message: 'Proxy started successfully', status: 'started' });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to start proxy', details: error.message }, { status: 500 });
  }
}
