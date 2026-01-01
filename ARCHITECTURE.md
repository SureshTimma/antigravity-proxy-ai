# Antigravity Proxy AI - Architecture & Flow Documentation

## Overview

Antigravity Proxy AI is a modern web interface for chatting with Claude AI models through the Antigravity Claude Proxy. It provides a beautiful chat UI, terminal access, and account management - all in one package.

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         User's Browser                                   │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │
│  │  Chat View  │  │Terminal View│  │Settings View│  │   Sidebar   │     │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘     │
└─────────┼────────────────┼────────────────┼────────────────┼────────────┘
          │                │                │                │
          ▼                ▼                ▼                ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                      Next.js Web Server (Port 8643)                      │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                         API Routes                               │    │
│  │  /api/chat      - Proxy chat messages to Claude                 │    │
│  │  /api/config    - Get configuration (ports)                     │    │
│  │  /api/proxy/*   - Account management, limits, start/stop        │    │
│  │  /api/updates   - Check for package updates                     │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                    Socket.IO Server                              │    │
│  │  - PTY (pseudo-terminal) management                             │    │
│  │  - Real-time terminal I/O                                       │    │
│  └─────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────────────────┐
│              Antigravity Claude Proxy (Port 8642)                        │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │  /v1/messages     - Anthropic Messages API (streaming)          │    │
│  │  /v1/models       - List available Claude models                │    │
│  │  /health          - Health check endpoint                       │    │
│  │  /account-limits  - Get account quotas and usage                │    │
│  └─────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    Antigravity Desktop App                               │
│                  (Google Account Authentication)                         │
└─────────────────────────────────────────────────────────────────────────┘
```

## File Structure

```
antigravity-proxy-ai/
├── bin/
│   ├── cli.js           # CLI entry point (npx antigravity-proxy-ai)
│   └── postinstall.js   # Post-install script
├── app/
│   ├── page.js          # Main page component (orchestrates everything)
│   ├── layout.js        # Root layout with fonts and metadata
│   ├── globals.css      # Global styles and Tailwind config
│   ├── components/
│   │   ├── ChatInterface.js    # Chat UI with streaming responses
│   │   ├── WebTerminal.js      # xterm.js terminal component
│   │   ├── SettingsView.js     # Account management UI
│   │   ├── Sidebar.js          # Navigation and chat history
│   │   ├── ControlPanel.js     # Terminal control buttons
│   │   └── UpdateNotification.js # Update alerts
│   ├── api/
│   │   ├── chat/route.js       # Proxy chat to Claude
│   │   ├── config/route.js     # Configuration endpoint
│   │   ├── updates/route.js    # Version check
│   │   └── proxy/
│   │       ├── accounts/route.js   # List accounts
│   │       ├── limits/route.js     # Get usage limits
│   │       ├── start/route.js      # Start proxy
│   │       └── stop/route.js       # Stop proxy
│   └── lib/
│       └── chatHistory.js      # LocalStorage chat persistence
├── server.js            # Custom Next.js server with Socket.IO
└── package.json
```

## Core Components

### 1. page.js (Main Orchestrator)

The main page component manages:

- **View State**: `activeView` can be 'chat', 'terminal', or 'settings'
- **Connection State**: `isConnected`, `isChecking` - tracks proxy connection
- **Terminal Output**: `terminalOutput` - captured for pattern detection
- **Chat State**: `activeChatId`, `activeChatMessages`, `selectedModel`

**Key Refs:**
- `terminalRef` - Reference to WebTerminal methods
- `connectionCheckRef` - Prevents duplicate connection checks

### 2. WebTerminal.js (Terminal Component)

Implements a real terminal using:
- **xterm.js** - Terminal emulator in the browser
- **Socket.IO** - Real-time communication with server
- **node-pty** - Server-side pseudo-terminal

**Exposed Methods (via onRef):**
```javascript
{
  runCommand(cmd)   // Execute a command with Enter
  write(data)       // Send raw data to terminal
  sendInput(input)  // Send input (for interactive prompts)
  clear()           // Clear terminal screen
}
```

**Output Callback:**
- `onOutput(data)` - Called when terminal receives output, used for pattern detection

### 3. ChatInterface.js (Chat Component)

Handles chat functionality:
- Streaming responses from Claude
- Markdown rendering with syntax highlighting
- Thinking process display (for thinking models)
- Message history persistence
- Connection-aware input (disabled when disconnected)

**Props:**
```javascript
{
  model,              // Selected Claude model ID
  chatId,             // Unique chat identifier
  initialMessages,    // Messages to load
  isConnected,        // Proxy connection status
  isCheckingConnection // Loading state
}
```

### 4. SettingsView.js (Account Management)

Manages Google accounts for the proxy:
- Add new accounts (OAuth flow)
- Remove existing accounts
- View account usage limits
- Pattern-based terminal interaction

**Pattern Detection:**
Uses `terminalOutput` prop to detect prompts:
- `[a/r/f]` - Menu prompt (add/remove/fresh)
- `Enter account number` - Remove account prompt

### 5. Sidebar.js (Navigation)

Provides:
- View switching (Chat/Terminal/Settings)
- Chat history list (from localStorage)
- New chat button
- Chat selection

## Connection Flow

### Initial Load

```
1. Page loads
2. WebTerminal connects via Socket.IO
3. Server spawns PTY with PowerShell
4. WebTerminal auto-runs: $env:PORT=8642; antigravity-claude-proxy start
5. Terminal output includes "Server started successfully"
6. page.js detects this pattern in terminalOutput
7. checkProxyConnection() is triggered
8. Health check + models fetch → isConnected = true
9. Chat input is enabled
```

### Connection Detection (Pattern-Based)

```javascript
// page.js - Watch terminal output for proxy startup
useEffect(() => {
  if (terminalOutput.includes('Server started successfully') || 
      terminalOutput.includes('Server running at: http://localhost:')) {
    if (!isConnected && !connectionCheckRef.current) {
      connectionCheckRef.current = true;
      setTimeout(() => checkProxyConnection(0), 500);
    }
  }
}, [terminalOutput, isConnected, checkProxyConnection]);
```

### Connection Check

```javascript
async function checkProxyConnection(retryCount = 0) {
  // 1. Check /health endpoint
  // 2. Fetch /v1/models
  // 3. Set isConnected = true
  // 4. If fails and retryCount < 1, retry after 1s
}
```

## Account Management Flow

### Adding an Account

```
1. User clicks "Add Account" in SettingsView
2. resetAccountStates() clears any previous operation
3. pendingActionRef = 'wait_for_menu_add'
4. Run: antigravity-claude-proxy accounts
5. Terminal shows menu with [a/r/f]
6. Pattern detected → send 'a'
7. isWaitingForAuth = true
8. Browser opens for Google OAuth
9. Poll /api/proxy/accounts every 2s
10. When new account detected:
    - Send 'n' (don't add another)
    - Restart proxy
    - Show success message
```

### Removing an Account

```
1. User clicks trash icon on account
2. resetAccountStates() clears previous state
3. pendingActionRef = 'wait_for_menu_remove_direct'
4. Run: antigravity-claude-proxy accounts
5. Terminal shows menu with [a/r/f]
6. Pattern detected → send 'r'
7. pendingActionRef = 'wait_for_account_number'
8. Terminal shows "Enter account number"
9. Pattern detected → show confirmation dialog
10. User confirms → send account number + 'y'
11. Poll for removal → restart proxy
```

## Chat Flow

### Sending a Message

```
1. User types message and hits Enter
2. Check: isConnected && !isLoading
3. Add user message to state and localStorage
4. POST /api/chat with full message history
5. Stream response chunks:
   - thinking_delta → update thinking state
   - text_delta → update assistant message
6. Save final message to localStorage
7. Dispatch 'chatHistoryUpdated' event
```

### Chat API Route

```javascript
// app/api/chat/route.js
POST /api/chat → POST http://localhost:8642/v1/messages
  - Adds headers: x-api-key, anthropic-version
  - Streams response back to client
```

## State Management

### Connection State

| State | Meaning |
|-------|---------|
| `isConnected=false, isChecking=true` | Checking connection |
| `isConnected=false, isChecking=false` | Disconnected |
| `isConnected=true, isChecking=false` | Connected |

### Terminal Output Buffer

```javascript
// Keeps last 2000 chars to avoid memory issues
setTerminalOutput(prev => (prev + data).slice(-2000));
```

### Pending Action Tracking

```javascript
// SettingsView uses ref to track multi-step operations
pendingActionRef.current = 'wait_for_menu_add' | 'wait_for_menu_remove' | 
                           'wait_for_menu_remove_direct' | 'wait_for_account_number' | null
```

## CLI Entry Point

```javascript
// bin/cli.js
1. Check Node.js version >= 18
2. Check/install antigravity-claude-proxy
3. Start proxy on port 8642 (background)
4. Wait 3 seconds
5. Start Next.js server on port 8643
6. Open browser to http://localhost:8643
```

## Error Handling

### Terminal Errors

```javascript
// WebTerminal.js - Safe dimension access
try {
  if (fitAddonRef.current && termRef.current && terminalRef.current) {
    fitAddonRef.current.fit();
    // ...
  }
} catch (e) {
  console.warn('[WebTerminal] Fit error:', e);
}
```

### Chat Errors

```javascript
// ChatInterface.js - Display error in chat
catch (error) {
  setMessages(prev => [...prev, {
    role: 'assistant',
    content: `Error: ${error.message}`,
    isError: true
  }]);
}
```

### Connection Errors

- Retry once on initial check
- Terminal output detection triggers new check when proxy starts
- UI shows "Proxy not connected" banner

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 8643 | Web UI port |
| `PROXY_PORT` | 8642 | Claude proxy port |
| `NODE_ENV` | development | Environment mode |

## Key Design Decisions

1. **Pattern-based detection over timers**: Instead of arbitrary timeouts, we watch terminal output for specific patterns to trigger actions.

2. **Single terminal instance**: One PTY serves all terminal operations (proxy, accounts, etc.)

3. **Connection-first approach**: Always try to connect before starting proxy - avoids "address in use" errors.

4. **State reset on new operations**: `resetAccountStates()` ensures clean state for each account operation.

5. **Streaming responses**: Chat uses SSE streaming for real-time response display.

6. **LocalStorage for chat history**: Simple persistence without backend database.

## Common Issues & Solutions

| Issue | Cause | Solution |
|-------|-------|----------|
| "Address already in use" | Proxy already running | Check connection first, don't restart |
| "Proxy not connected" after refresh | Proxy not started yet | Wait for terminal output detection |
| Account add stuck | Pattern not detected | Check terminal output, ensure proxy version |
| xterm dimensions error | Terminal not initialized | Try-catch with null checks |
| Models not loading | Proxy not ready | Retry connection check |

## Testing Checklist

- [ ] Fresh install and run
- [ ] Page refresh with proxy running
- [ ] New chat while connected
- [ ] New chat while disconnected
- [ ] Chat select (old chat)
- [ ] Add account flow
- [ ] Remove account flow
- [ ] Add then immediately remove
- [ ] Settings → Chat → Settings
- [ ] Terminal view and back
- [ ] Chat streaming
- [ ] Stop generation
- [ ] Clear chat
