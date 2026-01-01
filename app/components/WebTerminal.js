'use client';

import { useEffect, useRef } from 'react';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import io from 'socket.io-client';
import 'xterm/css/xterm.css';

export default function WebTerminal({ onRef, initialCommand, isVisible, autoStartProxy = false }) {
  const terminalRef = useRef(null);
  const socketRef = useRef(null);
  const termRef = useRef(null);
  const fitAddonRef = useRef(null);
  const commandSentRef = useRef(false);
  const proxyStartedRef = useRef(false);

  // Handle visibility changes (tab switching)
  useEffect(() => {
    if (isVisible && fitAddonRef.current && termRef.current) {
        // Slight delay to ensure DOM is rendered before fitting
        setTimeout(() => {
            fitAddonRef.current.fit();
            const { cols, rows } = termRef.current;
            socketRef.current?.emit('terminal:resize', { cols, rows });
        }, 50);
    }
  }, [isVisible]);

  useEffect(() => {
    // Initialize Socket with forceNew to ensure checking a separate connection/PTY
    const socket = io(undefined, { forceNew: true });
    socketRef.current = socket;

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
          socket.emit('terminal:input', cmd + '\r');
        },
        write: (data) => {
            socket.emit('terminal:input', data);
        },
        sendInput: (input) => {
            // Send raw input to terminal (for interactive prompts)
            socket.emit('terminal:input', input);
        },
        clear: () => {
            // Clear screen and move cursor to top
            term.write('\x1b[2J\x1b[H');
            term.clear();
        }
      });
    }

    // Handlers
    socket.on('connect', () => {
      term.write('\r\n\x1b[38;2;56;189;248m●\x1b[0m \x1b[38;2;148;163;184mConnected to backend terminal\x1b[0m\r\n\r\n');
      socket.emit('terminal:start');

      // Auto-start the proxy server (only once) - disabled by default since CLI handles it
      // This can be enabled for development or manual restart scenarios
      if (autoStartProxy && !proxyStartedRef.current) {
        proxyStartedRef.current = true;
        setTimeout(() => {
          term.write('\x1b[38;2;56;189;248m›\x1b[0m \x1b[38;2;148;163;184mStarting Antigravity Proxy on port 8642...\x1b[0m\r\n\r\n');
          // Use explicit PORT env to ensure proxy uses correct port
          const isWindows = navigator.platform.toLowerCase().includes('win');
          const cmd = isWindows 
            ? '$env:PORT=8642; antigravity-claude-proxy start'
            : 'PORT=8642 antigravity-claude-proxy start';
          socket.emit('terminal:input', cmd + '\r');
        }, 500);
      }

      // Execute initial command if provided and not yet sent
      if (initialCommand && !commandSentRef.current) {
          commandSentRef.current = true;
          // Small delay to ensure PTY is ready
          setTimeout(() => {
              term.write(`\r\n\x1b[38;2;148;163;184m› Executing:\x1b[0m ${initialCommand}\r\n`);
              socket.emit('terminal:input', initialCommand + '\r');
          }, 1000);
      }
    });

    socket.on('terminal:output', (data) => {
      term.write(data);
    });

    term.onData((data) => {
      socket.emit('terminal:input', data);
    });
    
    // Handle resize
    const handleResize = () => {
        if (terminalRef.current) {
            fitAddon.fit();
            const dims = { cols: term.cols, rows: term.rows };
            socket.emit('terminal:resize', dims);
        }
    };
    
    window.addEventListener('resize', handleResize);

    return () => {
      socket.disconnect();
      term.dispose();
      window.removeEventListener('resize', handleResize);
    };
  }, []); // Run once on mount

  return (
    <div className={`w-full h-full overflow-hidden relative bg-[#050505] ${!isVisible ? 'hidden' : ''}`}>
       <div ref={terminalRef} className="w-full h-full p-2" />
    </div>
  );
}
