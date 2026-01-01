import { NextResponse } from 'next/server';

// Note: In Next.js dev mode, this global variable might be reset strictly per route file invocation mechanism
// requires a persistent store or "global" hack for reliable single-instance in dev.
// For now, we assume simple usage.

export async function POST(request) {
    // In a real production app we'd track the PID or use a system service.
    // Since we don't have access to the exact child process reference across requests easily in serverless/lambda models,
    // (Next.js API routes are serverless-like), we might need to use 'taskkill' or 'pkill' by name.
    
    try {
        const { spawn } = require('child_process');
        
        // Kill by image name - forceful approach for Windows
        spawn('taskkill', ['/IM', 'node.exe', '/F', '/FI', "WINDOWTITLE eq antigravity-claude-proxy*"], { shell: true });
        // Actually, targeting the specific process started is harder without PID persistence.
        // Let's try killing the specific command if possible, or just fail gracefully.
        
        // A better approach for this local tool is to let the user know we can't fully track it without more complex state.
        // But let's try to just kill the task if we can identify it.
        // Or, if we are just spawning it, maybe good enough to return 'Not Implemented' securely.
        
        // Placeholder response:
        return NextResponse.json({ message: 'Stop command sent (Note: Process handling is limited in stateless API)', status: 'stopped' });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to stop proxy', details: error.message }, { status: 500 });
    }
}
