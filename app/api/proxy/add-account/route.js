import { NextResponse } from 'next/server';
import { spawn } from 'child_process';

export async function POST(request) {
  try {
    // Attempt to parse body for argument if needed
    // const { sessionKey } = await request.json(); 
    
    // We use stdio: 'inherit' so the interactive prompt appears in the server terminal
    const process = spawn('antigravity-claude-proxy', ['accounts', 'add'], { 
      shell: true, 
      stdio: 'inherit' 
    });
    
    return NextResponse.json({ 
        message: 'Command started. Please check the terminal window where you started the server to complete the login flow.', 
        status: 'initiated' 
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to add account', details: error.message }, { status: 500 });
  }
}
