'use client';

import { useState, useEffect } from 'react';
import { Terminal, Settings, Plus, MessageSquare, Github, Zap, ChevronRight, ExternalLink, Trash2, Clock } from 'lucide-react';
import { getRecentChats, deleteChat, formatChatTime, chatExists } from '../lib/chatHistory';

export default function Sidebar({ onSelect, activeView = 'chat', activeChatId = null, onChatSelect, onNewChat }) {
  const [chatHistory, setChatHistory] = useState([]);

  // Load chat history on mount and when it changes
  useEffect(() => {
    const loadHistory = () => {
      const chats = getRecentChats(30);
      setChatHistory(chats);
    };
    
    loadHistory();
    
    // Listen for storage changes (in case of updates from other components)
    const handleStorageChange = () => loadHistory();
    window.addEventListener('storage', handleStorageChange);
    
    // Custom event for same-tab updates
    window.addEventListener('chatHistoryUpdated', handleStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('chatHistoryUpdated', handleStorageChange);
    };
  }, []);

  // Refresh history when activeChatId changes
  useEffect(() => {
    const chats = getRecentChats(30);
    setChatHistory(chats);
  }, [activeChatId]);

  const handleNavClick = (item) => {
    if (onSelect) onSelect(item);
  };

  const handleDeleteChat = (e, chatId) => {
    e.stopPropagation();
    deleteChat(chatId);
    setChatHistory(getRecentChats(30));
    
    // If deleting active chat, create a new one
    if (chatId === activeChatId && onNewChat) {
      onNewChat();
    }
    
    // Dispatch event to notify other components
    window.dispatchEvent(new Event('chatHistoryUpdated'));
  };

  const handleChatClick = (chat) => {
    if (onChatSelect) {
      onChatSelect(chat);
    }
  };

  // Group chats by date
  const groupedChats = chatHistory.reduce((groups, chat) => {
    const date = new Date(chat.updatedAt);
    const now = new Date();
    const diffDays = Math.floor((now - date) / 86400000);
    
    let group;
    if (diffDays === 0) group = 'Today';
    else if (diffDays === 1) group = 'Yesterday';
    else if (diffDays < 7) group = 'Previous 7 Days';
    else group = 'Older';
    
    if (!groups[group]) groups[group] = [];
    groups[group].push(chat);
    return groups;
  }, {});

  return (
    <div className="w-[280px] h-screen bg-sidebar border-r border-border flex flex-col">
      {/* Brand Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center shadow-lg">
            <Zap size={20} className="text-white" />
          </div>
          <div>
            <h1 className="font-bold text-sm">Antigravity</h1>
            <p className="text-xs text-muted-foreground">Claude Proxy Manager</p>
          </div>
        </div>
      </div>

      {/* Quick Action */}
      <div className="p-4">
        <button
          onClick={() => onNewChat ? onNewChat() : handleNavClick('NEW')}
          className="w-full flex items-center gap-3 h-12 px-3 rounded-lg border border-primary/20 bg-primary/5 hover:bg-primary/10 hover:border-primary/30 transition-all duration-150 cursor-pointer active:scale-[0.98]"
        >
          <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
            <Plus size={16} className="text-primary" />
          </div>
          <span className="font-medium text-sm">New Chat</span>
          <ChevronRight size={14} className="ml-auto text-muted-foreground" />
        </button>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto px-3">
        <div className="space-y-4 py-2">
          {/* Chat History Section */}
          {chatHistory.length > 0 && (
            <div>
              <p className="px-3 py-2 text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                <Clock size={10} />
                Chat History
              </p>

              <div className="space-y-3">
                {Object.entries(groupedChats).map(([group, chats]) => (
                  <div key={group}>
                    <p className="px-3 py-1 text-[10px] text-muted-foreground">{group}</p>
                    <div className="space-y-0.5">
                      {chats.map((chat) => (
                        <ChatHistoryItem
                          key={chat.id}
                          chat={chat}
                          isActive={chat.id === activeChatId}
                          onClick={() => handleChatClick(chat)}
                          onDelete={(e) => handleDeleteChat(e, chat.id)}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-border space-y-1">
        <NavItem
          icon={<Settings size={18} />}
          label="Settings"
          isActive={activeView === 'settings'}
          onClick={() => handleNavClick('settings')}
        />
        <NavItem
          icon={<Terminal size={18} />}
          label="Terminal"
          isActive={activeView === 'terminal'}
          onClick={() => handleNavClick('terminal')}
          badge={
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-accent" />
            </span>
          }
        />
        <NavItem
          icon={<Github size={18} />}
          label="View on GitHub"
          onClick={() => window.open('https://github.com/badri-s2001/antigravity-claude-proxy', '_blank')}
          suffix={<ExternalLink size={12} className="text-muted-foreground" />}
        />
      </div>
    </div>
  );
}

function NavItem({ icon, label, isActive, onClick, badge, suffix }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 h-10 px-3 rounded-lg transition-all duration-150 cursor-pointer ${
        isActive 
          ? 'bg-primary/10 text-primary hover:bg-primary/15' 
          : 'hover:bg-muted text-foreground active:bg-muted/80'
      }`}
    >
      <span className={isActive ? 'text-primary' : ''}>{icon}</span>
      <span className="font-medium text-sm">{label}</span>
      {badge && <span className="ml-auto">{badge}</span>}
      {suffix && <span className="ml-auto">{suffix}</span>}
    </button>
  );
}

function ChatHistoryItem({ chat, isActive, onClick, onDelete }) {
  const [showDelete, setShowDelete] = useState(false);
  
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setShowDelete(true)}
      onMouseLeave={() => setShowDelete(false)}
      className={`w-full flex items-center gap-2 h-9 px-3 rounded-lg transition-all duration-150 text-left group cursor-pointer ${
        isActive 
          ? 'bg-secondary/10 text-secondary' 
          : 'hover:bg-muted text-foreground active:bg-muted/80'
      }`}
    >
      <MessageSquare size={14} className={isActive ? 'text-secondary' : 'text-muted-foreground'} />
      <span className="flex-1 text-xs truncate">{chat.title}</span>
      {showDelete ? (
        <button
          onClick={onDelete}
          className="p-1 rounded hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-all duration-150 cursor-pointer active:scale-90"
        >
          <Trash2 size={12} />
        </button>
      ) : (
        <span className="text-[10px] text-muted-foreground">{formatChatTime(chat.updatedAt)}</span>
      )}
    </button>
  );
}
