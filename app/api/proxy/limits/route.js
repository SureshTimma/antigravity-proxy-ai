import { NextResponse } from 'next/server';

// GET - Fetch account limits from proxy
export async function GET() {
  try {
    const proxyPort = process.env.PROXY_PORT || '8642';
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    
    const response = await fetch(`http://localhost:${proxyPort}/account-limits`, {
      method: 'GET',
      headers: { 'x-api-key': 'test' },
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    
    if (response.ok) {
      const data = await response.json();
      return NextResponse.json({ 
        success: true,
        ...data
      });
    } else {
      return NextResponse.json({ 
        success: false,
        error: 'Failed to fetch limits'
      }, { status: 200 });
    }
  } catch (error) {
    return NextResponse.json({ 
      success: false,
      error: error.message || 'Failed to connect to proxy'
    }, { status: 200 });
  }
}
