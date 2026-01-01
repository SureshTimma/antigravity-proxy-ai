'use client';

import { Terminal, Info } from 'lucide-react';

export default function ControlPanel({ onCommand }) {
  return (
    <div className="w-full animate-fadeIn">
      <div className="max-w-4xl mx-auto">
        {/* Terminal info note */}
        <div className="flex items-center gap-3 p-1">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Info size={14} className="text-primary/70" />
            <p className="text-xs">
              This terminal runs the <span className="text-primary font-medium">Antigravity Claude Proxy</span> server locally, enabling seamless AI chat through your authenticated Claude accounts.
            </p>
          </div>
        </div>

        {/* Spacer to maintain height */}
        <div className="mt-3 h-[18px]"></div>
      </div>
    </div>
  );
}
