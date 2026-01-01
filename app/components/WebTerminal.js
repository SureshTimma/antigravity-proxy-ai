'use client';

import { useEffect, useRef, useState } from 'react';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import io from 'socket.io-client';
import { Copy, Check } from 'lucide-react';
import 'xterm/css/xterm.css';

export default function WebTerminal({ onRef, initialCommand, isVisible, onOutput }) {
  const terminalRef = useRef(null);
  const socketRef = useRef(null);
  const termRef = useRef(null);
  const fitAddonRef = useRef(null);
  const commandSentRef = useRef(false);
  const [copied, setCopied] = useState(false);

  // Handle visibility changes (tab switching)
  useEffect(() => {
    if (isVisible && fitAddonRef.current && termRef.current) {
        // Slight delay to ensure DOM is rendered before fitting
        setTimeout(() => {
            try {
              if (fitAddonRef.current && termRef.current && terminalRef.current) {
                fitAddonRef.current.fit();
                const cols = termRef.current.cols;
                const rows = termRef.current.rows;
                if (cols && rows) {
                  socketRef.current?.emit('terminal:resize', { cols, rows });
                }
              }
            } catch (e) {
              console.warn('[WebTerminal] Fit error:', e);
            }
        }, 50);
    }
  }, [isVisible]);

  useEffect(() => {
    console.log('[WebTerminal] Initializing...');
    
    // Initialize Socket with forceNew to ensure checking a separate connection/PTY
    const socket = io(undefined, { forceNew: true });
    socketRef.current = socket;
    console.log('[WebTerminal] Socket created');

    // Initialize Terminal with improved theme
    const term = new Terminal({
      cursorBlink: true,
      cursorStyle: 'bar',
      cursorWidth: 2,
      theme: {
        background: '#050505',
        foreground: '#e4e4e7',
        cursor: '#38bdf8',
        cursorAccent: '#050505',
        selectionBackground: 'rgba(56, 189, 248, 0.25)',
        selectionForeground: '#ffffff',
        black: '#18181b',
        red: '#ef4444',
        green: '#22c55e',
        yellow: '#eab308',
        blue: '#3b82f6',
        magenta: '#a855f7',
        cyan: '#06b6d4',
        white: '#d4d4d8',
        brightBlack: '#52525b',
        brightRed: '#f87171',
        brightGreen: '#4ade80',
        brightYellow: '#facc15',
        brightBlue: '#60a5fa',
        brightMagenta: '#c084fc',
        brightCyan: '#22d3ee',
        brightWhite: '#fafafa',
      },
      fontFamily: '"JetBrains Mono", "Fira Code", Menlo, Monaco, "Courier New", monospace',
      fontSize: 13,
      fontWeight: '400',
      fontWeightBold: '600',
      lineHeight: 1.4,
      letterSpacing: 0,
      allowProposedApi: true,
      scrollback: 5000,
      smoothScrollDuration: 100,
    });
    
    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    fitAddonRef.current = fitAddon;
    
    term.open(terminalRef.current);
    fitAddon.fit();
    termRef.current = term;

    // Expose methods to parent
    if (onRef) {
      onRef({
        runCommand: (cmd) => {
          console.log('[WebTerminal] runCommand:', cmd);
          socket.emit('terminal:input', cmd + '\r');
        },
        write: (data) => {
            console.log('[WebTerminal] write:', data);
            socket.emit('terminal:input', data);
        },
        sendInput: (input) => {
            console.log('[WebTerminal] sendInput:', input);
            // Send raw input to terminal (for interactive prompts)
            socket.emit('terminal:input', input);
        },
        clear: () => {
            console.log('[WebTerminal] clear');
            // Clear screen and move cursor to top
            term.write('\x1b[2J\x1b[H');
            term.clear();
        }
      });
    }

    // Handlers
    socket.on('connect', () => {
      console.log('[WebTerminal] Socket connected, id:', socket.id);
      term.write('\r\n\x1b[38;2;56;189;248m●\x1b[0m \x1b[38;2;148;163;184mConnected to backend terminal\x1b[0m\r\n');
      socket.emit('terminal:start');
      console.log('[WebTerminal] Emitted terminal:start');

      // Auto-start the proxy server after PTY is ready
      setTimeout(() => {
        console.log('[WebTerminal] Auto-starting proxy on port 8642...');
        term.write('\x1b[38;2;148;163;184m› Starting proxy server...\x1b[0m\r\n');
        const isWindows = navigator.platform.toLowerCase().includes('win');
        const cmd = isWindows 
          ? '$env:PORT=8642; antigravity-claude-proxy start'
          : 'PORT=8642 antigravity-claude-proxy start';
        socket.emit('terminal:input', cmd + '\r');
      }, 800);

      // Execute initial command if provided and not yet sent
      if (initialCommand && !commandSentRef.current) {
          commandSentRef.current = true;
          console.log('[WebTerminal] Will execute initial command:', initialCommand);
          // Small delay to ensure PTY is ready
          setTimeout(() => {
              term.write(`\r\n\x1b[38;2;148;163;184m› Executing:\x1b[0m ${initialCommand}\r\n`);
              socket.emit('terminal:input', initialCommand + '\r');
          }, 1000);
      }
    });

    socket.on('disconnect', (reason) => {
      console.log('[WebTerminal] Socket disconnected, reason:', reason);
    });

    socket.on('connect_error', (error) => {
      console.error('[WebTerminal] Socket connect_error:', error);
    });

    socket.on('terminal:output', (data) => {
      // Log only first 100 chars to avoid spam
      console.log('[WebTerminal] terminal:output:', data.substring(0, 100) + (data.length > 100 ? '...' : ''));
      term.write(data);
      
      // Call onOutput callback if provided
      if (onOutput) {
        onOutput(data);
      }
    });

    term.onData((data) => {
      console.log('[WebTerminal] term.onData (user input):', JSON.stringify(data));
      socket.emit('terminal:input', data);
    });
    
    // Handle resize
    const handleResize = () => {
        try {
          if (terminalRef.current && term.cols && term.rows) {
            fitAddon.fit();
            const dims = { cols: term.cols, rows: term.rows };
            console.log('[WebTerminal] Resize:', dims);
            socket.emit('terminal:resize', dims);
          }
        } catch (e) {
          console.warn('[WebTerminal] Resize error:', e);
        }
    };
    
    window.addEventListener('resize', handleResize);

    return () => {
      console.log('[WebTerminal] Cleanup - disconnecting socket and disposing terminal');
      socket.disconnect();
      term.dispose();
      window.removeEventListener('resize', handleResize);
    };
  }, []); // Run once on mount

  // Copy terminal content to clipboard
  const copyTerminalContent = async () => {
    if (!termRef.current) return;
    
    const term = termRef.current;
    // Get all lines from the terminal buffer
    const buffer = term.buffer.active;
    let content = '';
    
    for (let i = 0; i < buffer.length; i++) {
      const line = buffer.getLine(i);
      if (line) {
        content += line.translateToString(true) + '\n';
      }
    }
    
    // Trim trailing empty lines
    content = content.trimEnd();
    
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy terminal content:', err);
    }
  };

  return (
    <div className={`w-full h-full overflow-hidden relative bg-[#050505] ${!isVisible ? 'hidden' : ''}`}>
      {/* Copy Button */}
      <button
        onClick={copyTerminalContent}
        className="absolute top-3 right-3 z-10 p-2 rounded-lg bg-zinc-800/80 hover:bg-zinc-700 border border-zinc-700/50 transition-all duration-150 group"
        title="Copy terminal output"
      >
        {copied ? (
          <Check size={16} className="text-green-400" />
        ) : (
          <Copy size={16} className="text-zinc-400 group-hover:text-zinc-200" />
        )}
      </button>
      <div ref={terminalRef} className="w-full h-full p-2" />
    </div>
  );
}
