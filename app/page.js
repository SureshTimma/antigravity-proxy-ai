'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import ControlPanel from './components/ControlPanel';
import Sidebar from './components/Sidebar';
import ChatInterface from './components/ChatInterface';
import SettingsView from './components/SettingsView';
import UpdateNotification from './components/UpdateNotification';
import { Terminal, Circle, MessageSquare, ChevronDown, Settings } from 'lucide-react';
import { createChat, getChat, getRecentChats, updateChatModel, generateChatId, chatExists } from './lib/chatHistory';

const WebTerminal = dynamic(() => import('./components/WebTerminal'), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full flex flex-col items-center justify-center gap-4 bg-zinc-950">
      <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center animate-pulse">
        <Terminal size={24} className="text-primary" />
      </div>
      <div className="text-sm text-muted-foreground">Initializing terminal...</div>
    </div>
  )
});

export default function Home() {
  const terminalRef = useRef(null);
  const connectionCheckRef = useRef(null); // Prevent duplicate connection checks
  const [isConnected, setIsConnected] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [activeView, setActiveView] = useState('chat');
  const [selectedModel, setSelectedModel] = useState('');
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);
  const [models, setModels] = useState([]);
  const [proxyPort, setProxyPort] = useState(8642);
  const [terminalOutput, setTerminalOutput] = useState('');
  
  // Handle terminal output for pattern detection
  const handleTerminalOutput = useCallback((data) => {
    setTerminalOutput(prev => {
      // Keep only last 2000 chars to avoid memory issues
      const newOutput = prev + data;
      return newOutput.slice(-2000);
    });
  }, []);
  
  // Chat history state
  const [activeChatId, setActiveChatId] = useState(null);
  const [activeChatMessages, setActiveChatMessages] = useState([]);

  // Fetch proxy port configuration
  useEffect(() => {
    fetch('/api/config')
      .then(res => res.json())
      .then(data => {
        if (data.proxyPort) {
          setProxyPort(data.proxyPort);
        }
      })
      .catch(() => {});
  }, []);

  // Check if proxy server is running and fetch models
  const checkProxyConnection = useCallback(async (retryCount = 0) => {
    setIsChecking(true);
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      
      // First check health endpoint
      const healthResponse = await fetch(`http://localhost:${proxyPort}/health`, {
        method: 'GET',
        headers: { 'x-api-key': 'test' },
        signal: controller.signal,
      });
      
      if (!healthResponse.ok) {
        clearTimeout(timeoutId);
        // Only retry once for initial check - terminal output detection handles new starts
        if (retryCount < 1) {
          setTimeout(() => checkProxyConnection(retryCount + 1), 1000);
          return;
        }
        setIsConnected(false);
        setIsChecking(false);
        connectionCheckRef.current = false;
        return;
      }
      
      // Then fetch models
      const response = await fetch(`http://localhost:${proxyPort}/v1/models`, {
        method: 'GET',
        headers: { 'x-api-key': 'test' },
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const data = await response.json();
        // Parse models from API response
        if (data.data && Array.isArray(data.data)) {
          const fetchedModels = data.data.map(model => ({
            id: model.id,
            name: formatModelName(model.id),
          }));
          setModels(fetchedModels);
          
          // Set default model to lowest Claude model if none selected
          if (!selectedModel && fetchedModels.length > 0) {
            // Find Claude models and sort by power (ascending)
            const claudeModels = fetchedModels.filter(m => 
              m.id.toLowerCase().includes('claude')
            );
            
            if (claudeModels.length > 0) {
              // Sort by power score (lowest first) and pick the first one
              const lowestClaude = claudeModels.sort((a, b) => {
                const scoreA = getModelPowerScore(a.id);
                const scoreB = getModelPowerScore(b.id);
                return scoreA - scoreB;
              })[0];
              setSelectedModel(lowestClaude.id);
            } else {
              setSelectedModel(fetchedModels[0].id);
            }
          }
        }
        setIsConnected(true);
        connectionCheckRef.current = false;
      } else {
        // Only retry once for initial check
        if (retryCount < 1) {
          setTimeout(() => checkProxyConnection(retryCount + 1), 1000);
          return;
        }
        setIsConnected(false);
        connectionCheckRef.current = false;
      }
    } catch (error) {
      // Only retry once for initial check
      if (retryCount < 1) {
        setTimeout(() => checkProxyConnection(retryCount + 1), 1000);
        return;
      }
      setIsConnected(false);
      connectionCheckRef.current = false;
    } finally {
      setIsChecking(false);
    }
  }, [selectedModel, proxyPort]);

  // Watch terminal output for proxy server startup success
  useEffect(() => {
    if (!terminalOutput) return;
    
    // Detect successful proxy server startup
    if (terminalOutput.includes('Server started successfully') || 
        terminalOutput.includes('Server running at: http://localhost:')) {
      // Only trigger if we're not already connected and not already checking
      if (!isConnected && !connectionCheckRef.current) {
        console.log('[page.js] Detected proxy server started, checking connection...');
        connectionCheckRef.current = true;
        // Small delay to ensure server is fully ready
        setTimeout(() => {
          checkProxyConnection(0);
        }, 500);
      }
    }
  }, [terminalOutput, isConnected, checkProxyConnection]);

  // Format model ID to display name
  const formatModelName = (modelId) => {
    return modelId
      .replace(/-/g, ' ')
      .replace(/\b\w/g, c => c.toUpperCase());
  };

  // Detect model provider from ID
  const getModelProvider = (modelId) => {
    const id = modelId.toLowerCase();
    if (id.startsWith('claude') || id.includes('claude')) return 'Claude';
    if (id.startsWith('gemini') || id.includes('gemini')) return 'Gemini';
    if (id.startsWith('gpt') || id.startsWith('o1') || id.startsWith('o3') || id.includes('openai')) return 'OpenAI';
    return 'Other';
  };

  // Calculate model power score for sorting (higher = more powerful)
  const getModelPowerScore = (modelId) => {
    const id = modelId.toLowerCase();
    let score = 0;
    
    // Version detection (e.g., 4.5, 3, 2.5)
    const versionMatch = id.match(/(\d+)\.?(\d*)/);
    if (versionMatch) {
      const major = parseInt(versionMatch[1]) || 0;
      const minor = parseInt(versionMatch[2]) || 0;
      score += major * 100 + minor * 10;
    }
    
    // Tier detection (Claude)
    if (id.includes('opus')) score += 300;
    else if (id.includes('sonnet')) score += 200;
    else if (id.includes('haiku')) score += 100;
    
    // Tier detection (Gemini/General)
    if (id.includes('ultra')) score += 400;
    else if (id.includes('pro')) score += 200;
    else if (id.includes('flash')) score += 100;
    else if (id.includes('lite') || id.includes('mini') || id.includes('nano')) score += 50;
    
    // Quality tier (high/medium/low)
    if (id.includes('high')) score += 30;
    else if (id.includes('medium')) score += 20;
    else if (id.includes('low')) score += 10;
    
    // Size indicators (for GPT-like models)
    const sizeMatch = id.match(/(\d+)b/);
    if (sizeMatch) {
      score += parseInt(sizeMatch[1]) / 10;
    }
    
    // Thinking/reasoning models get slight boost
    if (id.includes('thinking') || id.includes('reason')) score += 5;
    
    return score;
  };

  // Group models by provider and sort by power
  const groupedModels = models.reduce((groups, model) => {
    const provider = getModelProvider(model.id);
    if (!groups[provider]) groups[provider] = [];
    groups[provider].push(model);
    return groups;
  }, {});

  // Sort each group by power score (ascending - weakest first)
  Object.keys(groupedModels).forEach(provider => {
    groupedModels[provider].sort((a, b) => getModelPowerScore(a.id) - getModelPowerScore(b.id));
  });

  // Provider order for display
  const providerOrder = ['Claude', 'Gemini', 'OpenAI', 'Other'];
  const sortedProviders = providerOrder.filter(p => groupedModels[p]?.length > 0);

  // Check connection on mount
  useEffect(() => {
    checkProxyConnection();
  }, [checkProxyConnection]);

  // Initialize with existing chat or prepare for new one (without creating in storage)
  useEffect(() => {
    const chats = getRecentChats(1);
    if (chats.length > 0) {
      // Load the most recent chat
      setActiveChatId(chats[0].id);
      setActiveChatMessages(chats[0].messages || []);
      if (chats[0].model) {
        setSelectedModel(chats[0].model);
      }
    } else {
      // Prepare for a new chat without creating in storage
      // Chat will be created when first message is sent
      setActiveChatId(generateChatId());
      setActiveChatMessages([]);
    }
  }, []);

  const handleCommand = (cmd) => {
    if (!terminalRef.current) return;

    if (cmd === 'STOP') {
      terminalRef.current.write('\x03');
    } else if (cmd === 'cls') {
      terminalRef.current.clear();
    } else {
      terminalRef.current.write('\x03');
      setTimeout(() => {
        terminalRef.current.runCommand(cmd);
      }, 500);
    }
  };

  const handleNewChat = useCallback(() => {
    // Generate ID but don't create in storage yet - will be created on first message
    const newChatId = generateChatId();
    setActiveChatId(newChatId);
    setActiveChatMessages([]);
    setActiveView('chat');
    
    // Clear terminal output for fresh detection, reset connection state
    setTerminalOutput('');
    connectionCheckRef.current = false;
    
    // If not connected, restart proxy; otherwise just ensure it's running
    if (terminalRef.current) {
      terminalRef.current.write('\x03'); // Cancel any running command
      setTimeout(() => {
        // Always restart proxy to ensure clean state
        setIsConnected(false);
        terminalRef.current.runCommand('$env:PORT=8642; antigravity-claude-proxy start');
        // Terminal output detection will trigger connection check when server is ready
      }, 300);
    }
  }, []);

  const handleChatSelect = useCallback((chat) => {
    setActiveChatId(chat.id);
    setActiveChatMessages(chat.messages || []);
    if (chat.model) {
      setSelectedModel(chat.model);
    }
    setActiveView('chat');
    
    // Ensure proxy is running for this chat
    if (!isConnected && terminalRef.current) {
      // Clear terminal output for fresh detection, reset connection state
      setTerminalOutput('');
      connectionCheckRef.current = false;
      
      terminalRef.current.write('\x03'); // Cancel any running command
      setTimeout(() => {
        terminalRef.current.runCommand('$env:PORT=8642; antigravity-claude-proxy start');
        // Terminal output detection will trigger connection check when server is ready
      }, 300);
    }
  }, [isConnected]);

  const handleAccountAction = useCallback((command, action) => {
    // Run command in terminal but don't switch view
    if (terminalRef.current) {
      // Clear output buffer for fresh pattern detection
      setTerminalOutput('');
      
      // If restarting proxy, reset connection state for fresh detection
      if (action === 'start') {
        setIsConnected(false);
        connectionCheckRef.current = false;
      }
      
      // First, stop any running process with Ctrl+C
      terminalRef.current.sendInput('\x03');
      
      // Then run the command after a short delay
      setTimeout(() => {
        terminalRef.current.runCommand(command);
      }, 500);
    }
  }, []);

  const handleSendTerminalInput = useCallback((input) => {
    // Send input directly to the terminal (for interactive prompts)
    if (terminalRef.current) {
      terminalRef.current.sendInput(input + '\r');
    }
  }, []);

  // Handler for running update commands in terminal
  const handleRunUpdateCommand = useCallback((command) => {
    if (terminalRef.current) {
      // Switch to terminal view to show the update progress
      setActiveView('terminal');
      // Clear and run the update command
      terminalRef.current.write('\x03'); // Cancel any running command
      setTimeout(() => {
        terminalRef.current.runCommand(command);
      }, 300);
    }
  }, []);

  const handleSidebarSelect = (type) => {
    if (type === 'chat') {
      setActiveView('chat');
    } else if (type === 'terminal') {
      setActiveView('terminal');
    } else if (type === 'settings') {
      setActiveView('settings');
    } else if (type === 'NEW') {
      handleNewChat();
    }
  };

  const handleModelChange = (modelId) => {
    setSelectedModel(modelId);
    setIsModelDropdownOpen(false);
    
    // Update the current chat's model
    if (activeChatId) {
      updateChatModel(activeChatId, modelId);
    }
  };

  const selectedModelData = models.find(m => m.id === selectedModel);

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden">
      {/* Sidebar */}
      <div className="h-full">
        <Sidebar 
          onSelect={handleSidebarSelect} 
          activeView={activeView}
          activeChatId={activeChatId}
          onChatSelect={handleChatSelect}
          onNewChat={handleNewChat}
        />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-full relative">
        {/* Header */}
        <header className="h-14 border-b border-border flex items-center px-4 justify-between bg-card/80 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                activeView === 'chat'
                  ? 'bg-secondary/20'
                  : activeView === 'settings'
                  ? 'bg-muted'
                  : 'bg-primary/20'
              }`}>
                {activeView === 'chat' ? (
                  <MessageSquare size={18} className="text-secondary" />
                ) : activeView === 'settings' ? (
                  <Settings size={18} className="text-muted-foreground" />
                ) : (
                  <Terminal size={18} className="text-primary" />
                )}
              </div>
              <div>
                <h1 className="font-semibold text-sm">
                  {activeView === 'chat' ? 'Chat' : activeView === 'settings' ? 'Settings' : 'Proxy Terminal'}
                </h1>
                <p className="text-xs text-muted-foreground">
                  {activeView === 'chat' ? 'Antigravity Claude Proxy' : activeView === 'settings' ? 'Manage accounts & preferences' : 'Active Session'}
                </p>
              </div>
            </div>
          </div>

          {/* Right side controls */}
          <div className="flex items-center gap-3">
            {/* Model selector */}
            {activeView === 'chat' && (
              <div className="relative">
                <button
                  onClick={() => models.length > 0 && setIsModelDropdownOpen(!isModelDropdownOpen)}
                  disabled={models.length === 0}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border bg-muted hover:bg-muted/80 text-xs transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer active:scale-[0.98]"
                >
                  <span>{selectedModelData?.name || (models.length === 0 ? 'No models available' : 'Select model')}</span>
                  <ChevronDown size={14} className={`transition-transform ${isModelDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {isModelDropdownOpen && models.length > 0 && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setIsModelDropdownOpen(false)} />
                    <div className="absolute right-0 top-full mt-1 w-72 max-h-80 overflow-y-auto rounded-lg border border-border bg-card shadow-xl z-20 py-1">
                      {sortedProviders.map((provider, idx) => (
                        <div key={provider}>
                          {idx > 0 && <div className="border-t border-border my-1" />}
                          <div className="px-3 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                            {provider}
                          </div>
                          {groupedModels[provider].map((model) => (
                            <button
                              key={model.id}
                              onClick={() => handleModelChange(model.id)}
                              className={`w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-muted transition-all duration-150 text-left cursor-pointer active:bg-muted/80 ${
                                selectedModel === model.id ? 'bg-primary/10 text-primary' : ''
                              }`}
                            >
                              <span className="truncate">{model.name}</span>
                            </button>
                          ))}
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Connection status - click to restart proxy */}
            <button
              onClick={() => {
                // Terminate terminal and restart proxy
                if (terminalRef.current) {
                  // Reset connection state and clear terminal output to allow fresh detection
                  setIsConnected(false);
                  setTerminalOutput(''); // Clear so we can detect fresh server start
                  connectionCheckRef.current = false;
                  terminalRef.current.write('\x03'); // Ctrl+C to stop
                  setTimeout(() => {
                    terminalRef.current.runCommand('$env:PORT=8642; antigravity-claude-proxy start');
                    // Terminal output detection will trigger connection check when server is ready
                  }, 500);
                }
              }}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs transition-all duration-150 cursor-pointer active:scale-95 ${
                isChecking 
                  ? 'bg-muted text-muted-foreground'
                  : isConnected 
                    ? 'bg-accent/20 text-accent hover:bg-accent/30' 
                    : 'bg-destructive/20 text-destructive hover:bg-destructive/30'
              }`}
              title="Click to restart proxy server"
            >
              <Circle size={6} fill="currentColor" className={isChecking ? 'animate-spin' : isConnected ? 'animate-pulse' : ''} />
              {isChecking ? 'Checking...' : isConnected ? 'Connected' : 'Disconnected'}
            </button>
          </div>
        </header>

        {/* Terminal (hidden when in chat mode) */}
        <div className={`flex-1 overflow-hidden relative ${activeView !== 'terminal' ? 'hidden' : ''}`}>
          <div className="absolute inset-0 m-4 rounded-xl overflow-hidden border border-border bg-zinc-950 shadow-2xl">
            <div className="h-10 bg-zinc-900 border-b border-zinc-800 flex items-center px-4 gap-2">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-500/80 hover:bg-red-500 transition-colors cursor-pointer" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/80 hover:bg-yellow-500 transition-colors cursor-pointer" />
                <div className="w-3 h-3 rounded-full bg-green-500/80 hover:bg-green-500 transition-colors cursor-pointer" />
              </div>
              <div className="flex-1 text-center">
                <span className="text-xs text-muted-foreground font-mono">~/antigravity-proxy</span>
              </div>
              <div className="w-[54px]" />
            </div>

            <div className="h-[calc(100%-40px)]">
              <WebTerminal
                isVisible={true}
                onRef={(ref) => (terminalRef.current = ref)}
                onOutput={handleTerminalOutput}
              />
            </div>
          </div>
        </div>

        {/* Control Panel for terminal */}
        {activeView === 'terminal' && (
          <div className="p-4 bg-card/50 border-t border-border backdrop-blur-sm">
            <ControlPanel onCommand={handleCommand} />
          </div>
        )}

        {/* Chat Interface */}
        {activeView === 'chat' && (
          <ChatInterface 
            key={activeChatId}
            chatId={activeChatId}
            model={selectedModel}
            initialMessages={activeChatMessages}
            isConnected={isConnected}
            isCheckingConnection={isChecking}
          />
        )}

        {/* Settings View */}
        {activeView === 'settings' && (
          <SettingsView
            onAccountAction={handleAccountAction}
            onSendInput={handleSendTerminalInput}
            terminalOutput={terminalOutput}
            onStartChatting={() => {
              setActiveView('chat');
              handleNewChat();
            }}
          />
        )}
      </div>

      {/* Update Notification */}
      <UpdateNotification onRunCommand={handleRunUpdateCommand} />
    </div>
  );
}
