import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// GET - List all accounts
export async function GET() {
  try {
    const { stdout, stderr } = await execAsync('antigravity-claude-proxy accounts list', {
      shell: true,
      timeout: 10000,
    });
    
    // Parse the output to extract account emails
    const lines = stdout.split('\n').filter(line => line.trim());
    const accounts = [];
    
    // Look for lines that contain email addresses (lines starting with number and dot)
    for (const line of lines) {
      const match = line.match(/^\s*\d+\.\s*(.+@.+\..+)/);
      if (match) {
        accounts.push({ email: match[1].trim() });
      }
    }
    
    return NextResponse.json({ 
      success: true,
      accounts,
      raw: stdout
    });
  } catch (error) {
    // If command fails, might mean no accounts or command not found
    return NextResponse.json({ 
      success: true,
      accounts: [],
      error: error.message
    }, { status: 200 }); // Return 200 even on error to handle gracefully
  }
}
