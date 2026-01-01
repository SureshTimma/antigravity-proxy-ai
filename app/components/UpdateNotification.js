'use client';

import { useState, useEffect } from 'react';
import { Download, X, RefreshCw, CheckCircle, AlertCircle, Package } from 'lucide-react';

export default function UpdateNotification({ onRunCommand }) {
  const [updateInfo, setUpdateInfo] = useState(null);
  const [isChecking, setIsChecking] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateStatus, setUpdateStatus] = useState(null); // 'success' | 'error' | null
  const [expanded, setExpanded] = useState(false);

  const checkForUpdates = async () => {
    setIsChecking(true);
    try {
      const response = await fetch('/api/updates');
      const data = await response.json();
      setUpdateInfo(data);
      setIsDismissed(false);
    } catch (error) {
      console.error('Failed to check for updates:', error);
    } finally {
      setIsChecking(false);
    }
  };

  useEffect(() => {
    // Check for updates on mount
    checkForUpdates();
    
    // Check every 30 minutes
    const interval = setInterval(checkForUpdates, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const handleUpdate = () => {
    if (!updateInfo?.updateCommand || !onRunCommand) return;
    
    setIsUpdating(true);
    setUpdateStatus(null);
    
    // Run the update command in the terminal
    onRunCommand(updateInfo.updateCommand);
    
    // Show updating status for a moment, then prompt to restart
    setTimeout(() => {
      setIsUpdating(false);
      setUpdateStatus('success');
    }, 3000);
  };

  const handleDismiss = () => {
    setIsDismissed(true);
  };

  // Don't show if no updates or dismissed
  if (!updateInfo?.hasUpdates || isDismissed) {
    return null;
  }

  const packages = updateInfo.packages;
  const proxyAi = packages['antigravity-proxy-ai'];
  const claudeProxy = packages['antigravity-claude-proxy'];

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-md">
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-white/20 rounded-lg">
              <Download className="w-4 h-4 text-white" />
            </div>
            <span className="text-white font-semibold">Updates Available</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setExpanded(!expanded)}
              className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
              title={expanded ? "Collapse" : "Expand"}
            >
              <Package className="w-4 h-4 text-white/80" />
            </button>
            <button
              onClick={checkForUpdates}
              disabled={isChecking}
              className="p-1.5 hover:bg-white/10 rounded-lg transition-colors disabled:opacity-50"
              title="Check again"
            >
              <RefreshCw className={`w-4 h-4 text-white/80 ${isChecking ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={handleDismiss}
              className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
              title="Dismiss"
            >
              <X className="w-4 h-4 text-white/80" />
            </button>
          </div>
        </div>

        {/* Package Details (expandable) */}
        {expanded && (
          <div className="px-4 pb-2 space-y-2">
            {proxyAi?.updateAvailable && (
              <div className="bg-white/10 rounded-lg px-3 py-2">
                <div className="text-white/90 text-sm font-medium">antigravity-proxy-ai</div>
                <div className="text-white/60 text-xs">
                  {proxyAi.installed || 'not installed'} → {proxyAi.latest}
                </div>
              </div>
            )}
            {claudeProxy?.updateAvailable && (
              <div className="bg-white/10 rounded-lg px-3 py-2">
                <div className="text-white/90 text-sm font-medium">antigravity-claude-proxy</div>
                <div className="text-white/60 text-xs">
                  {claudeProxy.installed || 'not installed'} → {claudeProxy.required}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Status Message */}
        {updateStatus === 'success' && (
          <div className="px-4 pb-2">
            <div className="flex items-center gap-2 bg-green-500/20 rounded-lg px-3 py-2">
              <CheckCircle className="w-4 h-4 text-green-300" />
              <span className="text-green-100 text-sm">
                Update started! Restart the app to apply changes.
              </span>
            </div>
          </div>
        )}

        {updateStatus === 'error' && (
          <div className="px-4 pb-2">
            <div className="flex items-center gap-2 bg-red-500/20 rounded-lg px-3 py-2">
              <AlertCircle className="w-4 h-4 text-red-300" />
              <span className="text-red-100 text-sm">
                Update failed. Try manually in terminal.
              </span>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="px-4 pb-3 flex gap-2">
          <button
            onClick={handleUpdate}
            disabled={isUpdating || !onRunCommand}
            className="flex-1 flex items-center justify-center gap-2 bg-white text-purple-700 font-semibold py-2 px-4 rounded-lg hover:bg-white/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isUpdating ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Updating...
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                Update Now
              </>
            )}
          </button>
          <button
            onClick={handleDismiss}
            className="px-4 py-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
          >
            Later
          </button>
        </div>

        {/* Command Preview */}
        {expanded && updateInfo.updateCommand && (
          <div className="px-4 pb-3">
            <div className="bg-black/30 rounded-lg px-3 py-2">
              <code className="text-white/70 text-xs font-mono break-all">
                {updateInfo.updateCommand}
              </code>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
