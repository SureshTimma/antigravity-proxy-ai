'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  Settings, 
  UserPlus, 
  Mail, 
  RefreshCw, 
  Loader2, 
  CheckCircle, 
  AlertCircle,
  Plus,
  Trash2,
  ChevronRight,
  ExternalLink,
  Info,
  BarChart3,
  Clock,
  ChevronDown,
  Download,
  Package
} from 'lucide-react';

export default function SettingsView({ onAccountAction, onSendInput, onStartChatting }) {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState(null);
  
  // Account management states
  const [showRemoveList, setShowRemoveList] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [showRemoveAnother, setShowRemoveAnother] = useState(false);
  const [showAddAnother, setShowAddAnother] = useState(false);
  const [pendingRemoveAccount, setPendingRemoveAccount] = useState(null);
  
  // Auth detection states
  const [isWaitingForAuth, setIsWaitingForAuth] = useState(false);
  const [isWaitingForRemove, setIsWaitingForRemove] = useState(false);
  const [isSettingUp, setIsSettingUp] = useState(false);
  const [newlyAddedAccount, setNewlyAddedAccount] = useState(null);
  const [removedAccount, setRemovedAccount] = useState(null);
  const [initialAccountCount, setInitialAccountCount] = useState(0);
  
  // Limits states
  const [limitsData, setLimitsData] = useState(null);
  const [limitsLoading, setLimitsLoading] = useState(false);
  const [limitsError, setLimitsError] = useState(null);
  const [expandedAccount, setExpandedAccount] = useState(null);

  // Version/Update states
  const [versionInfo, setVersionInfo] = useState(null);
  const [checkingUpdates, setCheckingUpdates] = useState(false);

  const fetchAccounts = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/proxy/accounts');
      const data = await response.json();
      
      if (data.success) {
        setAccounts(data.accounts);
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to fetch accounts' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to fetch accounts' });
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchLimits = useCallback(async () => {
    setLimitsLoading(true);
    setLimitsError(null);
    try {
      const response = await fetch('/api/proxy/limits');
      const data = await response.json();
      
      if (data.success) {
        setLimitsData(data);
      } else {
        setLimitsError(data.error || 'Failed to fetch limits');
      }
    } catch (error) {
      setLimitsError('Failed to connect to proxy');
    } finally {
      setLimitsLoading(false);
    }
  }, []);

  const fetchVersionInfo = useCallback(async () => {
    setCheckingUpdates(true);
    try {
      const response = await fetch('/api/updates');
      const data = await response.json();
      setVersionInfo(data);
    } catch (error) {
      console.error('Failed to check for updates:', error);
    } finally {
      setCheckingUpdates(false);
    }
  }, []);

  // Fetch accounts, limits, and version info on mount
  useEffect(() => {
    fetchAccounts();
    fetchLimits();
    fetchVersionInfo();
  }, [fetchAccounts, fetchLimits, fetchVersionInfo]);

  // Polling for auth detection (add)
  useEffect(() => {
    if (!isWaitingForAuth) return;

    const startTime = Date.now();
    const timeout = 120000; // 2 minutes
    const interval = 2000; // Check every 2 seconds

    const pollForNewAccount = async () => {
      try {
        const response = await fetch('/api/proxy/accounts');
        const data = await response.json();
        
        if (data.success) {
          const currentAccounts = data.accounts;
          
          // Check if a new account was added
          if (currentAccounts.length > initialAccountCount) {
            // Find the new account (compare with previous list)
            const newAccount = currentAccounts.find(
              acc => !accounts.some(existing => existing.email === acc.email)
            );
            
            if (newAccount) {
              setNewlyAddedAccount(newAccount);
            }
            
            // Send Ctrl+C to terminate terminal
            onSendInput('\x03');
            
            setAccounts(currentAccounts);
            setIsWaitingForAuth(false);
            setMessage({ type: 'success', text: `Successfully added ${newAccount?.email || 'account'}` });
            return true;
          }
        }
      } catch (error) {
        console.error('Error polling for accounts:', error);
      }
      return false;
    };

    const intervalId = setInterval(async () => {
      if (Date.now() - startTime > timeout) {
        clearInterval(intervalId);
        setIsWaitingForAuth(false);
        setMessage({ type: 'error', text: 'Authentication timed out. Please try again.' });
        return;
      }
      
      const found = await pollForNewAccount();
      if (found) {
        clearInterval(intervalId);
      }
    }, interval);

    return () => clearInterval(intervalId);
  }, [isWaitingForAuth, initialAccountCount, accounts]);

  // Polling for remove detection
  useEffect(() => {
    if (!isWaitingForRemove) return;

    const startTime = Date.now();
    const timeout = 30000; // 30 seconds
    const interval = 2000;

    const pollForRemoval = async () => {
      try {
        const response = await fetch('/api/proxy/accounts');
        const data = await response.json();
        
        if (data.success) {
          const currentAccounts = data.accounts;
          
          if (currentAccounts.length < initialAccountCount) {
            const removedEmail = pendingRemoveAccount?.email;
            setRemovedAccount(pendingRemoveAccount);
            
            // Send Ctrl+C to terminate terminal
            onSendInput('\\x03');
            
            setAccounts(currentAccounts);
            setIsWaitingForRemove(false);
            setShowConfirmation(false);
            setPendingRemoveAccount(null);
            setMessage({ type: 'success', text: `Successfully removed ${removedEmail || 'account'}` });
            return true;
          }
        }
      } catch (error) {
        console.error('Error polling for removal:', error);
      }
      return false;
    };

    const intervalId = setInterval(async () => {
      if (Date.now() - startTime > timeout) {
        clearInterval(intervalId);
        setIsWaitingForRemove(false);
        setMessage({ type: 'error', text: 'Removal timed out. Please check the terminal.' });
        fetchAccounts();
        return;
      }
      
      const found = await pollForRemoval();
      if (found) {
        clearInterval(intervalId);
      }
    }, interval);

    return () => clearInterval(intervalId);
  }, [isWaitingForRemove, initialAccountCount, pendingRemoveAccount, fetchAccounts]);

  const handleAddAccount = () => {
    setInitialAccountCount(accounts.length);
    setIsSettingUp(true);
    onAccountAction('powershell -ExecutionPolicy Bypass "antigravity-claude-proxy accounts add"', 'add');
    
    setTimeout(() => {
      onSendInput('a');
      setIsSettingUp(false);
      setIsWaitingForAuth(true);
      setMessage(null);
      setNewlyAddedAccount(null);
    }, 1500);
  };

  const handleRemoveAccount = () => {
    setShowRemoveList(true);
    setRemovedAccount(null);
    onAccountAction('powershell -ExecutionPolicy Bypass "antigravity-claude-proxy accounts add"', 'remove');
    
    setTimeout(() => {
      onSendInput('r');
    }, 1500);
  };

  // Direct removal - click trash icon on an account
  const handleDirectRemove = (accountNumber, email) => {
    setPendingRemoveAccount({ number: accountNumber, email });
    setRemovedAccount(null);
    setIsSettingUp(true);
    
    // Start the remove flow in terminal
    onAccountAction('powershell -ExecutionPolicy Bypass "antigravity-claude-proxy accounts add"', 'remove');
    
    setTimeout(() => {
      onSendInput('r');
      setIsSettingUp(false);
      setShowConfirmation(true);
    }, 1500);
  };

  const handleSelectAccountToRemove = (accountNumber, email) => {
    setPendingRemoveAccount({ number: accountNumber, email });
    setShowRemoveList(false);
    setShowConfirmation(true);
  };

  const handleConfirmRemove = (confirm) => {
    if (confirm) {
      setInitialAccountCount(accounts.length);
      onSendInput(pendingRemoveAccount.number.toString());
      
      setTimeout(() => {
        onSendInput('y');
        setShowConfirmation(false);
        setIsWaitingForRemove(true);
      }, 500);
    } else {
      onSendInput('n');
      setShowConfirmation(false);
      setPendingRemoveAccount(null);
      fetchAccounts();
    }
  };

  const handleRemoveAnother = (yes) => {
    if (yes) {
      onSendInput('y');
      setShowRemoveAnother(false);
      setShowRemoveList(true);
      setRemovedAccount(null);
    } else {
      onSendInput('n');
      // Send Ctrl+C to interrupt terminal
      setTimeout(() => {
        onSendInput('\x03');
      }, 300);
      setShowRemoveAnother(false);
      setPendingRemoveAccount(null);
      setRemovedAccount(null);
      fetchAccounts();
    }
  };

  const handleAddAnother = (yes) => {
    if (yes) {
      onSendInput('y');
      setInitialAccountCount(accounts.length);
      setShowAddAnother(false);
      setIsWaitingForAuth(true);
      setNewlyAddedAccount(null);
    } else {
      onSendInput('n');
      // Send Ctrl+C to interrupt terminal
      setTimeout(() => {
        onSendInput('\x03');
      }, 300);
      setShowAddAnother(false);
      setNewlyAddedAccount(null);
      fetchAccounts();
    }
  };

  const handleBackToAccounts = () => {
    setShowRemoveList(false);
    setShowConfirmation(false);
    setShowRemoveAnother(false);
    setShowAddAnother(false);
    setIsWaitingForAuth(false);
    setIsWaitingForRemove(false);
    setIsSettingUp(false);
    setPendingRemoveAccount(null);
    setNewlyAddedAccount(null);
    setRemovedAccount(null);
    fetchAccounts();
  };

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="w-[80%] max-w-5xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <Settings size={24} className="text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-semibold">Settings</h1>
            <p className="text-sm text-muted-foreground">Manage your proxy accounts and preferences</p>
          </div>
        </div>

        {/* Accounts Section */}
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="px-5 py-4 border-b border-border bg-muted/30 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <UserPlus size={18} className="text-primary" />
              <div>
                <h2 className="font-medium">Claude Accounts</h2>
                <p className="text-xs text-muted-foreground">Manage your authenticated accounts</p>
              </div>
            </div>
            <button
              onClick={fetchAccounts}
              disabled={loading}
              className="p-2 rounded-lg hover:bg-muted transition-all duration-150 disabled:opacity-50 cursor-pointer active:scale-90"
              title="Refresh accounts"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>

          <div className="p-5">
            {/* Message */}
            {message && (
              <div className={`mb-4 p-3 rounded-lg flex items-start gap-2 text-sm ${
                message.type === 'error' 
                  ? 'bg-destructive/10 text-destructive border border-destructive/20' 
                  : 'bg-accent/10 text-accent border border-accent/20'
              }`}>
                {message.type === 'error' ? <AlertCircle size={16} /> : <CheckCircle size={16} />}
                {message.text}
              </div>
            )}

            {/* Conditional Content */}
            {isSettingUp ? (
              <div className="space-y-4">
                <div className="text-center py-8">
                  <Loader2 size={40} className="mx-auto text-primary mb-3 animate-spin" />
                  <h3 className="font-semibold mb-1">Setting Up</h3>
                  <p className="text-sm text-muted-foreground">Preparing terminal commands...</p>
                </div>
              </div>
            ) : showAddAnother ? (
              <div className="space-y-4">
                {newlyAddedAccount && (
                  <div className="p-4 rounded-lg border border-accent/30 bg-accent/5">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <CheckCircle size={20} className="text-accent" />
                      <span className="font-medium text-accent">Account Added!</span>
                    </div>
                    <div className="flex items-center justify-center gap-2">
                      <Mail size={14} className="text-muted-foreground" />
                      <span className="text-sm">{newlyAddedAccount.email}</span>
                    </div>
                  </div>
                )}
                
                <div className="p-3 rounded-lg border border-border bg-muted/30">
                  <p className="text-sm text-center">Add another account?</p>
                </div>
                
                <div className="flex gap-2">
                  <button
                    onClick={() => handleAddAnother(true)}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-all duration-150 cursor-pointer active:scale-[0.98]"
                  >
                    <div className="w-6 h-6 rounded-full bg-primary-foreground/20 flex items-center justify-center font-mono font-bold text-xs">
                      Y
                    </div>
                    Yes
                  </button>
                  <button
                    onClick={() => handleAddAnother(false)}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-border hover:bg-muted transition-all duration-150 cursor-pointer active:scale-[0.98]"
                  >
                    <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center font-mono font-bold text-xs">
                      N
                    </div>
                    No, Done
                  </button>
                </div>
              </div>
            ) : showRemoveAnother ? (
              <div className="space-y-4">
                {removedAccount && (
                  <div className="p-4 rounded-lg border border-destructive/30 bg-destructive/5">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <CheckCircle size={20} className="text-destructive" />
                      <span className="font-medium text-destructive">Account Removed!</span>
                    </div>
                    <div className="flex items-center justify-center gap-2">
                      <Mail size={14} className="text-muted-foreground" />
                      <span className="text-sm">{removedAccount.email}</span>
                    </div>
                  </div>
                )}
                
                <div className="p-3 rounded-lg border border-border bg-muted/30">
                  <p className="text-sm text-center">Remove another account?</p>
                </div>
                
                <div className="flex gap-2">
                  <button
                    onClick={() => handleRemoveAnother(true)}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-all duration-150 cursor-pointer active:scale-[0.98]"
                  >
                    <div className="w-6 h-6 rounded-full bg-primary-foreground/20 flex items-center justify-center font-mono font-bold text-xs">
                      Y
                    </div>
                    Yes
                  </button>
                  <button
                    onClick={() => handleRemoveAnother(false)}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-border hover:bg-muted transition-all duration-150 cursor-pointer active:scale-[0.98]"
                  >
                    <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center font-mono font-bold text-xs">
                      N
                    </div>
                    No, Done
                  </button>
                </div>
              </div>
            ) : isWaitingForRemove ? (
              <div className="space-y-4">
                <div className="text-center py-6">
                  <Loader2 size={40} className="mx-auto text-destructive mb-3 animate-spin" />
                  <h3 className="font-semibold mb-1">Removing Account</h3>
                  <p className="text-sm text-muted-foreground">Please wait...</p>
                </div>
                
                {pendingRemoveAccount && (
                  <div className="p-3 rounded-lg bg-muted/50 border border-border">
                    <div className="flex items-center justify-center gap-2">
                      <Mail size={14} className="text-muted-foreground" />
                      <span className="text-sm">{pendingRemoveAccount.email}</span>
                    </div>
                  </div>
                )}
              </div>
            ) : showConfirmation && pendingRemoveAccount ? (
              <div className="space-y-4">
                <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20">
                  <p className="text-sm text-center mb-3">Are you sure you want to remove this account?</p>
                  <div className="flex items-center justify-center gap-2 font-medium">
                    <span className="text-xs px-2 py-0.5 rounded bg-muted">
                      {pendingRemoveAccount.number}
                    </span>
                    <span className="text-sm font-medium">{pendingRemoveAccount.email}</span>
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <button
                    onClick={() => handleConfirmRemove(true)}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-all duration-150 cursor-pointer active:scale-[0.98]"
                  >
                    <div className="w-6 h-6 rounded-full bg-destructive-foreground/20 flex items-center justify-center font-mono font-bold text-xs">
                      Y
                    </div>
                    Yes, Remove
                  </button>
                  <button
                    onClick={() => handleConfirmRemove(false)}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-border hover:bg-muted transition-all duration-150 cursor-pointer active:scale-[0.98]"
                  >
                    <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center font-mono font-bold text-xs">
                      N
                    </div>
                    Cancel
                  </button>
                </div>
              </div>
            ) : showRemoveList ? (
              <div className="space-y-4">
                <div className="text-center mb-2">
                  <h3 className="font-medium">Select account to remove</h3>
                  <p className="text-xs text-muted-foreground">Click on an account to remove it</p>
                </div>
                
                <div className="space-y-2">
                  {accounts.map((account, idx) => (
                    <button
                      key={account.email}
                      onClick={() => handleSelectAccountToRemove(idx + 1, account.email)}
                      className="w-full flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-destructive/5 hover:border-destructive/30 transition-all duration-150 text-left group cursor-pointer active:scale-[0.99]"
                    >
                      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center font-mono font-bold text-sm">
                        {idx + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-sm truncate block">{account.email}</span>
                      </div>
                      <Trash2 size={16} className="text-muted-foreground group-hover:text-destructive transition-colors" />
                    </button>
                  ))}
                </div>
                
                <button
                  onClick={handleBackToAccounts}
                  className="w-full px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-all duration-150 cursor-pointer"
                >
                  ← Cancel
                </button>
              </div>
            ) : isWaitingForAuth ? (
              <div className="space-y-4">
                <div className="text-center py-6">
                  <Loader2 size={40} className="mx-auto text-primary mb-3 animate-spin" />
                  <h3 className="font-semibold mb-1">Waiting for Authentication</h3>
                  <p className="text-sm text-muted-foreground">Complete login in the browser window that opened</p>
                </div>
                
                <div className="p-3 rounded-lg bg-muted/50 border border-border">
                  <p className="text-xs text-muted-foreground text-center">
                    This will automatically detect when you've logged in.
                  </p>
                </div>

                <button
                  onClick={handleBackToAccounts}
                  className="w-full px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-all duration-150 cursor-pointer"
                >
                  ← Cancel
                </button>
              </div>
            ) : (
              <>
                {/* Accounts List */}
                <div className="mb-5">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-medium text-muted-foreground">Saved Accounts</h3>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">{accounts.length} account{accounts.length !== 1 ? 's' : ''}</span>
                      <button
                        onClick={handleAddAccount}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-accent/10 text-accent hover:bg-accent/20 transition-all duration-150 text-xs font-medium cursor-pointer active:scale-[0.98]"
                        title="Add Account"
                      >
                        <Plus size={14} />
                        Add Account
                      </button>
                    </div>
                  </div>
                  
                  {loading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="animate-spin text-muted-foreground" size={24} />
                    </div>
                  ) : accounts.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <UserPlus size={32} className="mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No accounts found</p>
                      <p className="text-xs">Click + to add an account</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {accounts.map((account, idx) => (
                        <div
                          key={account.email}
                          className="flex items-center gap-3 p-3 rounded-lg border border-border bg-muted/30 group hover:border-border/80 transition-colors"
                        >
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <Mail size={14} className="text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <span className="text-sm truncate block">{account.email}</span>
                          </div>
                          <span className="text-xs text-muted-foreground">#{idx + 1}</span>
                          <button
                            onClick={() => handleDirectRemove(idx + 1, account.email)}
                            className="w-7 h-7 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive flex items-center justify-center transition-all duration-150 opacity-0 group-hover:opacity-100 cursor-pointer active:scale-90"
                            title="Remove account"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Models & Usage Section */}
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="px-5 py-4 border-b border-border bg-muted/30 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <BarChart3 size={18} className="text-secondary" />
              <div>
                <h2 className="font-medium">Models & Usage</h2>
                <p className="text-xs text-muted-foreground">Rate limits and availability per account</p>
              </div>
            </div>
            <button
              onClick={fetchLimits}
              disabled={limitsLoading}
              className="p-2 rounded-lg hover:bg-muted transition-all duration-150 disabled:opacity-50 cursor-pointer active:scale-90"
              title="Refresh limits"
            >
              <RefreshCw size={16} className={limitsLoading ? 'animate-spin' : ''} />
            </button>
          </div>

          <div className="p-5">
            {limitsLoading && !limitsData ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="animate-spin text-muted-foreground" size={24} />
              </div>
            ) : limitsError ? (
              <div className="text-center py-8 text-muted-foreground">
                <AlertCircle size={32} className="mx-auto mb-2 opacity-50 text-destructive" />
                <p className="text-sm text-destructive">{limitsError}</p>
                <p className="text-xs mt-1">Make sure the proxy is running</p>
              </div>
            ) : limitsData ? (
              <div className="space-y-4">
                {/* Summary */}
                <div className="flex items-center gap-4 text-xs text-muted-foreground pb-3 border-b border-border">
                  <span>{limitsData.totalAccounts} account{limitsData.totalAccounts !== 1 ? 's' : ''}</span>
                  <span>•</span>
                  <span>{limitsData.models?.length || 0} models available</span>
                  {limitsData.timestamp && (
                    <>
                      <span>•</span>
                      <span>Updated {limitsData.timestamp}</span>
                    </>
                  )}
                </div>

                {/* Account Limits */}
                <div className="space-y-3">
                  {limitsData.accounts?.map((account) => (
                    <div key={account.email} className="rounded-lg border border-border overflow-hidden">
                      {/* Account Header */}
                      <button
                        onClick={() => setExpandedAccount(expandedAccount === account.email ? null : account.email)}
                        className="w-full px-4 py-3 flex items-center gap-3 bg-muted/30 hover:bg-muted/50 transition-all duration-150 cursor-pointer"
                      >
                        <div className={`w-2 h-2 rounded-full ${account.status === 'ok' ? 'bg-accent' : 'bg-destructive'}`} />
                        <span className="text-sm font-medium flex-1 text-left truncate">{account.email}</span>
                        <ChevronDown 
                          size={16} 
                          className={`text-muted-foreground transition-transform ${expandedAccount === account.email ? 'rotate-180' : ''}`} 
                        />
                      </button>

                      {/* Model Limits (Expanded) */}
                      {expandedAccount === account.email && (
                        <div className="p-4 space-y-3 bg-background">
                          {account.limits && Object.entries(account.limits)
                            .filter(([model]) => !model.startsWith('chat_') && !model.startsWith('rev'))
                            .sort(([a], [b]) => a.localeCompare(b))
                            .map(([model, limit]) => {
                              const percentage = Math.round((limit.remainingFraction || 0) * 100);
                              const isLow = percentage < 30;
                              const isMedium = percentage >= 30 && percentage < 70;
                              
                              return (
                                <div key={model} className="space-y-1.5">
                                  <div className="flex items-center justify-between text-xs">
                                    <span className="font-medium truncate">{model}</span>
                                    <span className={`font-mono ${isLow ? 'text-destructive' : isMedium ? 'text-warning' : 'text-accent'}`}>
                                      {limit.remaining}
                                    </span>
                                  </div>
                                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                                    <div 
                                      className={`h-full rounded-full transition-all ${
                                        isLow ? 'bg-destructive' : isMedium ? 'bg-warning' : 'bg-accent'
                                      }`}
                                      style={{ width: `${percentage}%` }}
                                    />
                                  </div>
                                  {limit.resetTime && (
                                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                                      <Clock size={10} />
                                      <span>Resets {new Date(limit.resetTime).toLocaleString()}</span>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <BarChart3 size={32} className="mx-auto mb-2 opacity-50" />
                <p className="text-sm">No usage data available</p>
              </div>
            )}
          </div>
        </div>

        {/* Info Section */}
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="px-5 py-4 border-b border-border bg-muted/30 flex items-center gap-3">
            <Info size={18} className="text-muted-foreground" />
            <div>
              <h2 className="font-medium">About</h2>
              <p className="text-xs text-muted-foreground">Antigravity Claude Proxy</p>
            </div>
          </div>
          
          <div className="p-5 space-y-4">
            {/* Version Info */}
            {versionInfo ? (
              <>
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground flex items-center gap-2">
                      <Package size={14} />
                      Proxy AI (UI)
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono">{versionInfo.packages?.['antigravity-proxy-ai']?.installed || 'N/A'}</span>
                      {versionInfo.packages?.['antigravity-proxy-ai']?.updateAvailable && (
                        <span className="px-2 py-0.5 text-xs bg-green-500/20 text-green-500 rounded-full">
                          {versionInfo.packages?.['antigravity-proxy-ai']?.latest} available
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground flex items-center gap-2">
                      <Package size={14} />
                      Claude Proxy (CLI)
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono">{versionInfo.packages?.['antigravity-claude-proxy']?.installed || 'N/A'}</span>
                      {versionInfo.packages?.['antigravity-claude-proxy']?.updateAvailable && (
                        <span className="px-2 py-0.5 text-xs bg-green-500/20 text-green-500 rounded-full">
                          {versionInfo.packages?.['antigravity-claude-proxy']?.required} required
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                
                {versionInfo.hasUpdates && (
                  <div className="pt-2 border-t border-border">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Updates available</span>
                      <button
                        onClick={fetchVersionInfo}
                        disabled={checkingUpdates}
                        className="flex items-center gap-2 px-3 py-1.5 text-xs bg-green-500/20 text-green-500 rounded-lg hover:bg-green-500/30 transition-colors disabled:opacity-50"
                      >
                        <Download size={14} />
                        {checkingUpdates ? 'Checking...' : 'Check Again'}
                      </button>
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">
                      Use the floating notification to update packages
                    </p>
                  </div>
                )}
              </>
            ) : (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Version</span>
                <button
                  onClick={fetchVersionInfo}
                  disabled={checkingUpdates}
                  className="text-xs text-primary hover:underline disabled:opacity-50"
                >
                  {checkingUpdates ? 'Checking...' : 'Check for updates'}
                </button>
              </div>
            )}
            
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Proxy Endpoint</span>
              <span className="font-mono">localhost:8080</span>
            </div>
            <div className="pt-2">
              <a
                href="https://github.com/badri-s2001/antigravity-claude-proxy"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-primary hover:underline cursor-pointer"
              >
                View on GitHub
                <ExternalLink size={14} />
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
