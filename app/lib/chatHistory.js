'use client';

// Chat history utility functions using localStorage

const STORAGE_KEY = 'antigravity-chat-history';

// Generate a unique ID for each chat
export const generateChatId = () => {
  return `chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// Get all chats from storage
export const getAllChats = () => {
  if (typeof window === 'undefined') return [];
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error('Error reading chat history:', e);
    return [];
  }
};

// Save all chats to storage
const saveAllChats = (chats) => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(chats));
  } catch (e) {
    console.error('Error saving chat history:', e);
  }
};

// Check if a chat exists in storage
export const chatExists = (chatId) => {
  if (!chatId) return false;
  const chats = getAllChats();
  return chats.some(c => c.id === chatId);
};

// Create a new chat (optionally with existing id and messages)
export const createChat = (model = 'claude-sonnet-4-5-thinking', existingId = null, initialMessages = []) => {
  const chat = {
    id: existingId || generateChatId(),
    title: 'New Chat',
    model,
    messages: initialMessages,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  
  // Auto-generate title from first user message
  if (initialMessages.length > 0) {
    const firstUserMessage = initialMessages.find(m => m.role === 'user');
    if (firstUserMessage) {
      const title = firstUserMessage.content.slice(0, 50);
      chat.title = title + (firstUserMessage.content.length > 50 ? '...' : '');
    }
  }
  
  const chats = getAllChats();
  chats.unshift(chat); // Add to beginning
  saveAllChats(chats);
  
  return chat;
};

// Get a specific chat by ID
export const getChat = (chatId) => {
  const chats = getAllChats();
  return chats.find(c => c.id === chatId) || null;
};

// Update a chat's messages
export const updateChatMessages = (chatId, messages) => {
  const chats = getAllChats();
  const chatIndex = chats.findIndex(c => c.id === chatId);
  
  if (chatIndex !== -1) {
    chats[chatIndex].messages = messages;
    chats[chatIndex].updatedAt = Date.now();
    
    // Auto-generate title from first user message if still "New Chat"
    if (chats[chatIndex].title === 'New Chat' && messages.length > 0) {
      const firstUserMessage = messages.find(m => m.role === 'user');
      if (firstUserMessage) {
        const title = firstUserMessage.content.slice(0, 50);
        chats[chatIndex].title = title + (firstUserMessage.content.length > 50 ? '...' : '');
      }
    }
    
    saveAllChats(chats);
    return chats[chatIndex];
  }
  
  return null;
};

// Update chat model
export const updateChatModel = (chatId, model) => {
  const chats = getAllChats();
  const chatIndex = chats.findIndex(c => c.id === chatId);
  
  if (chatIndex !== -1) {
    chats[chatIndex].model = model;
    chats[chatIndex].updatedAt = Date.now();
    saveAllChats(chats);
    return chats[chatIndex];
  }
  
  return null;
};

// Delete a chat
export const deleteChat = (chatId) => {
  const chats = getAllChats();
  const filtered = chats.filter(c => c.id !== chatId);
  saveAllChats(filtered);
  return filtered;
};

// Clear all chats
export const clearAllChats = () => {
  saveAllChats([]);
};

// Get recent chats (last N)
export const getRecentChats = (limit = 20) => {
  const chats = getAllChats();
  return chats.slice(0, limit);
};

// Format timestamp for display
export const formatChatTime = (timestamp) => {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};
