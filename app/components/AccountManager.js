'use client';

import { useState, useEffect } from 'react';
import { X, UserPlus, Trash2, RefreshCw, Mail, Loader2, AlertCircle, CheckCircle, Plus, RotateCcw } from 'lucide-react';

export default function AccountManager({ isOpen, onClose, onAccountAction, onSendInput, onDone }) {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [message, setMessage] = useState(null);
  const [showOptions, setShowOptions] = useState(false);
  const [showRemoveList, setShowRemoveList] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [showRemoveAnother, setShowRemoveAnother] = useState(false);
  const [showAddAnother, setShowAddAnother] = useState(false);
  const [showFinalAccounts, setShowFinalAccounts] = useState(false);
  const [pendingRemoveAccount, setPendingRemoveAccount] = useState(null);
  const [isWaitingForAuth, setIsWaitingForAuth] = useState(false);
  const [isWaitingForRemove, setIsWaitingForRemove] = useState(false);
  const [newlyAddedAccount, setNewlyAddedAccount] = useState(null);
  const [removedAccount, setRemovedAccount] = useState(null);
  const [initialAccountCount, setInitialAccountCount] = useState(0);

  // Fetch accounts on mount
  useEffect(() => {
    if (isOpen) {
      fetchAccounts();
      setShowOptions(false);
      setShowRemoveList(false);
      setShowConfirmation(false);
      setShowRemoveAnother(false);
      setShowAddAnother(false);
      setShowFinalAccounts(false);
      setPendingRemoveAccount(null);
      setIsWaitingForAuth(false);
      setIsWaitingForRemove(false);
      setNewlyAddedAccount(null);
      setRemovedAccount(null);
    }
  }, [isOpen]);

  // Poll for new accounts when waiting for authentication
  useEffect(() => {
    if (!isWaitingForAuth) return;

    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch('/api/proxy/accounts');
        const data = await response.json();
        const currentAccounts = data.accounts || [];
        
        // Check if a new account was added
        if (currentAccounts.length > initialAccountCount) {
          // Find the new account (last one added)
          const newAccount = currentAccounts.find(acc => !accounts.includes(acc)) || currentAccounts[currentAccounts.length - 1];
          
          setNewlyAddedAccount(newAccount);
          setAccounts(currentAccounts);
          setIsWaitingForAuth(false);
          setShowOptions(false);
          setShowAddAnother(true);
          setMessage(null);
        }
      } catch (error) {
        // Silently continue polling
      }
    }, 2000); // Poll every 2 seconds

    // Stop polling after 3 minutes
    const timeout = setTimeout(() => {
      setIsWaitingForAuth(false);
      clearInterval(pollInterval);
    }, 180000);

    return () => {
      clearInterval(pollInterval);
      clearTimeout(timeout);
    };
  }, [isWaitingForAuth, initialAccountCount, accounts]);

  // Poll for account removal
  useEffect(() => {
    if (!isWaitingForRemove) return;

    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch('/api/proxy/accounts');
        const data = await response.json();
        const currentAccounts = data.accounts || [];
        
        // Check if account was removed
        if (currentAccounts.length < initialAccountCount) {
          setAccounts(currentAccounts);
          setIsWaitingForRemove(false);
          setShowRemoveAnother(true);
          setMessage(null);
        }
      } catch (error) {
        // Silently continue polling
      }
    }, 2000);

    // Stop polling after 30 seconds
    const timeout = setTimeout(() => {
      setIsWaitingForRemove(false);
      setShowRemoveAnother(true);
      setMessage(null);
      fetchAccounts();
    }, 30000);

    return () => {
      clearInterval(pollInterval);
      clearTimeout(timeout);
    };
  }, [isWaitingForRemove, initialAccountCount]);
  const fetchAccounts = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const response = await fetch('/api/proxy/accounts');
      const data = await response.json();
      setAccounts(data.accounts || []);
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to fetch accounts' });
    } finally {
      setLoading(false);
    }
  };

  const handleManageAccounts = () => {
    // Run the accounts add command which shows the menu
    const command = 'powershell -ExecutionPolicy Bypass "antigravity-claude-proxy accounts add"';
    if (onAccountAction) {
      onAccountAction(command, 'manage');
    }
    // Show the options buttons
    setShowOptions(true);
    setMessage({ type: 'info', text: 'Wait for the prompt to appear, then select an option below' });
  };

  const handleOptionSelect = (option) => {
    // For remove, show the accounts list instead of sending immediately
    if (option === 'r') {
      // First send 'r' to terminal
      if (onSendInput) {
        onSendInput(option);
      }
      setShowRemoveList(true);
      setMessage({ type: 'info', text: 'Select an account to remove:' });
      return;
    }
    
    // Send the key to the terminal
    if (onSendInput) {
      onSendInput(option);
    }
    
    // For add/fresh, start polling for authentication
    if (option === 'a' || option === 'f') {
      setInitialAccountCount(accounts.length);
      setIsWaitingForAuth(true);
      setNewlyAddedAccount(null);
      setMessage({ 
        type: 'info', 
        text: '⏳ Waiting for authentication... Complete login in browser.'
      });
    }
  };

  const handleAddAnother = (yes) => {
    // Send y or n to terminal
    if (onSendInput) {
      onSendInput(yes ? 'y' : 'n');
    }
    
    if (yes) {
      // Start polling for the next account
      setInitialAccountCount(accounts.length);
      setIsWaitingForAuth(true);
      setNewlyAddedAccount(null);
      setShowAddAnother(false);
      setMessage({ 
        type: 'info', 
        text: '⏳ Waiting for authentication... Complete login in browser.'
      });
    } else {
      // Refresh and show final accounts list
      setShowAddAnother(false);
      setShowFinalAccounts(true);
      setMessage({ 
        type: 'success', 
        text: 'All accounts updated successfully!'
      });
      fetchAccounts();
    }
  };

  const handleRemoveAccountByNumber = (accountNumber, email) => {
    // Send the account number to terminal
    if (onSendInput) {
      onSendInput(accountNumber.toString());
    }
    
    // Show confirmation dialog
    setPendingRemoveAccount({ number: accountNumber, email });
    setShowConfirmation(true);
    setShowRemoveList(false);
    setMessage({ 
      type: 'info', 
      text: `Confirm removal of account #${accountNumber}?`
    });
  };

  const handleConfirmRemove = (confirm) => {
    // Send y or n to terminal
    if (onSendInput) {
      onSendInput(confirm ? 'y' : 'n');
    }
    
    if (confirm) {
      // Start polling to detect when account is removed
      setRemovedAccount(pendingRemoveAccount);
      setInitialAccountCount(accounts.length);
      setIsWaitingForRemove(true);
      setShowConfirmation(false);
      setMessage({ 
        type: 'info', 
        text: 'Removing account...'
      });
    } else {
      setMessage({ 
        type: 'info', 
        text: `Removal cancelled.`
      });
      
      // Close modal after a short delay
      setTimeout(() => {
        onClose();
        setShowOptions(false);
        setShowRemoveList(false);
        setShowConfirmation(false);
        setShowRemoveAnother(false);
        setPendingRemoveAccount(null);
      }, 1500);
    }
  };

  const handleRemoveAnother = (yes) => {
    // Send y or n to terminal
    if (onSendInput) {
      onSendInput(yes ? 'y' : 'n');
    }
    
    if (yes) {
      // Refresh accounts and show remove list again
      fetchAccounts();
      setShowRemoveAnother(false);
      setShowRemoveList(true);
      setMessage({ 
        type: 'info', 
        text: 'Select another account to remove:'
      });
    } else {
      // Refresh and show final accounts list
      setShowRemoveAnother(false);
      setShowFinalAccounts(true);
      setMessage({ 
        type: 'success', 
        text: 'All accounts updated successfully!'
      });
      fetchAccounts();
    }
  };

  const handleFinishAndGoToChat = () => {
    // Reset all states
    setShowOptions(false);
    setShowRemoveList(false);
    setShowConfirmation(false);
    setShowRemoveAnother(false);
    setShowAddAnother(false);
    setShowFinalAccounts(false);
    setPendingRemoveAccount(null);
    
    // Close modal and switch to chat
    onClose();
    if (onDone) {
      onDone();
    }
  };

  const handleRemoveAccount = (email) => {
    // For direct removal, we need to run the command and then select the account
    const command = 'powershell -ExecutionPolicy Bypass "antigravity-claude-proxy accounts add"';
    if (onAccountAction) {
      onAccountAction(command, 'remove');
    }
    setShowOptions(true);
    setMessage({ type: 'info', text: `Select 'Remove existing' then choose ${email} in terminal` });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-md mx-4 bg-card border border-border rounded-xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-muted/30">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <UserPlus size={20} className="text-primary" />
            Account Manager
          </h2>
          <button
            onClick={() => {
              onClose();
              setShowOptions(false);
              setShowRemoveList(false);
              setShowConfirmation(false);
              setShowRemoveAnother(false);
              setShowAddAnother(false);
              setShowFinalAccounts(false);
              setPendingRemoveAccount(null);
              setIsWaitingForAuth(false);
              setIsWaitingForRemove(false);
              setNewlyAddedAccount(null);
              setRemovedAccount(null);
            }}
            className="p-1.5 rounded-lg hover:bg-muted transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-5">
          {/* Message */}
          {message && (
            <div className={`mb-4 p-3 rounded-lg flex items-start gap-2 text-sm ${
              message.type === 'error' 
                ? 'bg-destructive/10 text-destructive border border-destructive/20' 
                : message.type === 'success'
                ? 'bg-accent/10 text-accent border border-accent/20'
                : 'bg-primary/10 text-primary border border-primary/20'
            }`}>
              {message.type === 'error' ? (
                <AlertCircle size={16} className="mt-0.5 shrink-0" />
              ) : message.type === 'success' ? (
                <CheckCircle size={16} className="mt-0.5 shrink-0" />
              ) : (
                <Loader2 size={16} className="mt-0.5 shrink-0 animate-spin" />
              )}
              <span>{message.text}</span>
            </div>
          )}

          {/* Show waiting for authentication */}
          {isWaitingForAuth ? (
            <div className="space-y-4">
              <div className="text-center py-6">
                <Loader2 size={40} className="mx-auto text-primary mb-3 animate-spin" />
                <h3 className="font-semibold mb-1">Waiting for Authentication</h3>
                <p className="text-sm text-muted-foreground">Complete the login in your browser...</p>
              </div>
              
              <div className="p-3 rounded-lg bg-muted/50 border border-border">
                <p className="text-xs text-muted-foreground text-center">
                  This will automatically detect when you've logged in.
                </p>
              </div>

              <button
                onClick={() => {
                  setIsWaitingForAuth(false);
                  setShowOptions(true);
                }}
                className="w-full px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                ← Back to options
              </button>
            </div>
          ) : showFinalAccounts ? (
            <div className="space-y-4">
              <div className="text-center mb-2">
                <CheckCircle size={40} className="mx-auto text-accent mb-2" />
                <h3 className="font-semibold">All Done!</h3>
              </div>
              
              <div className="border border-border rounded-lg overflow-hidden">
                <div className="px-3 py-2 bg-muted/50 border-b border-border">
                  <h4 className="text-xs font-medium text-muted-foreground">Your Accounts ({accounts.length})</h4>
                </div>
                {loading ? (
                  <div className="flex items-center justify-center py-6">
                    <Loader2 size={20} className="animate-spin text-muted-foreground" />
                  </div>
                ) : accounts.length === 0 ? (
                  <div className="py-6 text-center text-sm text-muted-foreground">
                    No accounts configured
                  </div>
                ) : (
                  <div className="divide-y divide-border max-h-48 overflow-y-auto">
                    {accounts.map((email, index) => (
                      <div 
                        key={index}
                        className="flex items-center gap-3 px-4 py-3"
                      >
                        <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center">
                          <span className="text-xs font-bold text-accent">{index + 1}</span>
                        </div>
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <Mail size={14} className="text-muted-foreground shrink-0" />
                          <span className="text-sm truncate">{email}</span>
                        </div>
                        <CheckCircle size={14} className="text-accent shrink-0" />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <button
                onClick={handleFinishAndGoToChat}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                Start Chatting
              </button>
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
                    <span className="text-sm">{newlyAddedAccount}</span>
                  </div>
                </div>
              )}
              
              <div className="p-3 rounded-lg border border-border bg-muted/30">
                <p className="text-sm text-center">Add another account?</p>
              </div>
              
              <div className="flex gap-2">
                <button
                  onClick={() => handleAddAnother(true)}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                  <div className="w-6 h-6 rounded-full bg-primary-foreground/20 flex items-center justify-center font-mono font-bold text-xs">
                    Y
                  </div>
                  Yes, Add Another
                </button>
                <button
                  onClick={() => handleAddAnother(false)}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-border hover:bg-muted transition-colors"
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
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                  <div className="w-6 h-6 rounded-full bg-primary-foreground/20 flex items-center justify-center font-mono font-bold text-xs">
                    Y
                  </div>
                  Yes
                </button>
                <button
                  onClick={() => handleRemoveAnother(false)}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-border hover:bg-muted transition-colors"
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
              <div className="p-4 rounded-lg border border-destructive/30 bg-destructive/5">
                <p className="text-sm text-center mb-2">Are you sure you want to remove this account?</p>
                <div className="flex items-center justify-center gap-2 py-2">
                  <div className="w-8 h-8 rounded-full bg-destructive/10 text-destructive flex items-center justify-center font-mono font-bold">
                    {pendingRemoveAccount.number}
                  </div>
                  <span className="text-sm font-medium">{pendingRemoveAccount.email}</span>
                </div>
              </div>
              
              <div className="flex gap-2">
                <button
                  onClick={() => handleConfirmRemove(true)}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors"
                >
                  <div className="w-6 h-6 rounded-full bg-destructive-foreground/20 flex items-center justify-center font-mono font-bold text-xs">
                    Y
                  </div>
                  Yes, Remove
                </button>
                <button
                  onClick={() => handleConfirmRemove(false)}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-border hover:bg-muted transition-colors"
                >
                  <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center font-mono font-bold text-xs">
                    N
                  </div>
                  No, Cancel
                </button>
              </div>
            </div>
          ) : showRemoveList ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground mb-4">
                Click on an account to remove it:
              </p>
              
              {accounts.length === 0 ? (
                <div className="py-8 text-center text-sm text-muted-foreground border border-border rounded-lg">
                  No accounts to remove
                </div>
              ) : (
                <div className="border border-border rounded-lg overflow-hidden divide-y divide-border">
                  {accounts.map((email, index) => (
                    <button
                      key={index}
                      onClick={() => handleRemoveAccountByNumber(index + 1, email)}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-destructive/10 transition-colors text-left"
                    >
                      <div className="w-8 h-8 rounded-full bg-destructive/10 text-destructive flex items-center justify-center font-mono font-bold">
                        {index + 1}
                      </div>
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <Mail size={14} className="text-muted-foreground shrink-0" />
                        <span className="text-sm truncate">{email}</span>
                      </div>
                      <Trash2 size={14} className="text-destructive shrink-0" />
                    </button>
                  ))}
                </div>
              )}

              <button
                onClick={() => {
                  setShowRemoveList(false);
                  setMessage(null);
                }}
                className="w-full mt-2 px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                ← Back to options
              </button>
            </div>
          ) : showOptions ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground mb-4">
                Choose an action to send to the terminal:
              </p>
              
              <button
                onClick={() => handleOptionSelect('a')}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors text-left"
              >
                <div className="w-8 h-8 rounded-full bg-primary-foreground/20 flex items-center justify-center font-mono font-bold">
                  A
                </div>
                <div>
                  <div className="font-medium">Add New</div>
                  <div className="text-xs opacity-80">Add a new Claude account</div>
                </div>
              </button>

              <button
                onClick={() => handleOptionSelect('r')}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg border border-border hover:bg-muted transition-colors text-left"
              >
                <div className="w-8 h-8 rounded-full bg-destructive/10 text-destructive flex items-center justify-center font-mono font-bold">
                  R
                </div>
                <div>
                  <div className="font-medium">Remove Existing</div>
                  <div className="text-xs text-muted-foreground">Remove a saved account</div>
                </div>
              </button>

              <button
                onClick={() => setShowOptions(false)}
                className="w-full mt-2 px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                ← Back to accounts
              </button>

              <div className="mt-4 p-3 rounded-lg bg-muted/50 border border-border">
                <p className="text-xs text-muted-foreground text-center mb-2">
                  After completing authentication in the browser:
                </p>
                <button
                  onClick={() => {
                    setShowOptions(false);
                    fetchAccounts();
                  }}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-accent/20 text-accent hover:bg-accent/30 text-sm transition-colors"
                >
                  <RefreshCw size={14} />
                  Done - Refresh Accounts
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Accounts List */}
              <div className="mb-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium text-muted-foreground">Saved Accounts</h3>
                  <button
                    onClick={fetchAccounts}
                    disabled={loading}
                    className="p-1.5 rounded-lg hover:bg-muted transition-colors disabled:opacity-50"
                    title="Refresh"
                  >
                    <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                  </button>
                </div>
                
                <div className="border border-border rounded-lg overflow-hidden">
                  {loading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 size={20} className="animate-spin text-muted-foreground" />
                    </div>
                  ) : accounts.length === 0 ? (
                    <div className="py-8 text-center text-sm text-muted-foreground">
                      No accounts saved
                    </div>
                  ) : (
                    <div className="divide-y divide-border">
                      {accounts.map((email, index) => (
                        <div 
                          key={index}
                          className="flex items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                              <Mail size={14} className="text-primary" />
                            </div>
                            <span className="text-sm">{email}</span>
                          </div>
                          <button
                            onClick={() => handleRemoveAccount(email)}
                            className="p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                            title="Remove account"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Main Action Button */}
              <button
                onClick={handleManageAccounts}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                <UserPlus size={16} />
                Manage Accounts
              </button>

              {/* Help text */}
              <p className="mt-4 text-xs text-muted-foreground text-center">
                Click "Manage Accounts" to add, remove, or reset accounts.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
