export async function GET() {
  const proxyPort = process.env.PROXY_PORT || '8642';
  
  return Response.json({
    proxyPort: parseInt(proxyPort, 10),
    proxyUrl: `http://localhost:${proxyPort}`,
  });
}
