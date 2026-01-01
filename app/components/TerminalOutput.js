'use client';

import { useEffect, useRef } from 'react';
import { Terminal as TerminalIcon } from 'lucide-react';

export default function TerminalOutput({ logs = [] }) {
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  return (
    <div className="glass-panel w-full max-w-4xl mx-auto mt-8 p-0 overflow-hidden flex flex-col h-[500px]">
      <div className="bg-black/40 p-4 border-b border-white/10 flex items-center gap-3">
        <TerminalIcon className="text-[var(--accent-primary)] w-5 h-5" />
        <span className="font-mono text-sm tracking-wider text-[var(--text-secondary)]">TERMINAL OUTPUT</span>
      </div>
      <div className="flex-1 overflow-y-auto p-4 font-mono text-sm space-y-2 bg-[#050505]/90">
        {logs.length === 0 && (
          <div className="text-[var(--text-secondary)] italic opacity-50">Waiting for commands...</div>
        )}
        {logs.map((log, i) => (
          <div key={i} className="text-gray-300 break-all">
            <span className="text-[var(--accent-secondary)] mr-2">$</span>
            {log}
          </div>
        ))}
        <div ref={endRef} />
      </div>
    </div>
  );
}
