'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, User, Bot, Loader2, Square, Sparkles, RotateCcw, Copy, Check, ChevronDown, ChevronRight } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { updateChatMessages, createChat, chatExists } from '../lib/chatHistory';

export default function ChatInterface({ 
  model = 'claude-sonnet-4-5-thinking',
  chatId = null,
  initialMessages = [],
  onMessagesChange = null 
}) {
  const [messages, setMessages] = useState(initialMessages);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentThinking, setCurrentThinking] = useState('');
  const [expandedThinking, setExpandedThinking] = useState({});
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);
  const abortControllerRef = useRef(null);

  // Update messages when initialMessages change (e.g., loading a different chat)
  useEffect(() => {
    setMessages(initialMessages);
    setExpandedThinking({});
  }, [initialMessages, chatId]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, currentThinking]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 200) + 'px';
    }
  }, [input]);

  // Save messages to chat history whenever they change
  const saveMessages = useCallback((newMessages) => {
    if (chatId && newMessages.length > 0) {
      // Check if chat exists in storage, if not create it now
      if (!chatExists(chatId)) {
        createChat(model, chatId, newMessages);
      } else {
        updateChatMessages(chatId, newMessages);
      }
      // Dispatch event to update sidebar
      window.dispatchEvent(new Event('chatHistoryUpdated'));
    }
    if (onMessagesChange) {
      onMessagesChange(newMessages);
    }
  }, [chatId, model, onMessagesChange]);

  const toggleThinking = (messageId) => {
    setExpandedThinking(prev => ({ ...prev, [messageId]: !prev[messageId] }));
  };

  const copyToClipboard = async (text) => {
    await navigator.clipboard.writeText(text);
  };

  const stopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsLoading(false);
    }
  };

  const sendMessage = async (messageText = null) => {
    const textToSend = messageText || input.trim();
    if (!textToSend || isLoading) return;

    const userMessage = { role: 'user', content: textToSend, id: Date.now() };
    const newMessages = [...messages, userMessage];

    setMessages(newMessages);
    saveMessages(newMessages);
    setInput('');
    setIsLoading(true);
    setCurrentThinking('');

    abortControllerRef.current = new AbortController();

    try {
      // Send full conversation history to the API for context
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          messages: newMessages.map(m => ({ role: m.role, content: m.content })),
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) throw new Error(`API error: ${response.status}`);

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      let assistantContent = '';
      let thinkingContent = '';
      let buffer = '';
      const messageId = Date.now();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;

            try {
              const parsed = JSON.parse(data);

              if (parsed.type === 'content_block_delta') {
                if (parsed.delta?.type === 'thinking_delta') {
                  thinkingContent += parsed.delta.thinking || '';
                  setCurrentThinking(thinkingContent);
                } else if (parsed.delta?.type === 'text_delta') {
                  assistantContent += parsed.delta.text || '';
                  setMessages(prev => {
                    const updated = [...prev];
                    const lastIdx = updated.length - 1;
                    if (lastIdx >= 0 && updated[lastIdx].role === 'assistant') {
                      updated[lastIdx] = { ...updated[lastIdx], content: assistantContent, thinking: thinkingContent, id: messageId };
                    } else {
                      updated.push({ role: 'assistant', content: assistantContent, thinking: thinkingContent, id: messageId });
                    }
                    return updated;
                  });
                }
              }
            } catch (e) { }
          }
        }
      }

      // Final save after streaming completes
      const finalMessages = [...newMessages];
      if (assistantContent || thinkingContent) {
        finalMessages.push({ 
          role: 'assistant', 
          content: assistantContent || "Couldn't generate response.", 
          thinking: thinkingContent, 
          id: messageId 
        });
      }
      
      setMessages(finalMessages);
      saveMessages(finalMessages);
      
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error('Error:', error);
        const errorMessages = [...newMessages, { 
          role: 'assistant', 
          content: `Error: ${error.message}. Make sure proxy is running on localhost:8080.`, 
          isError: true,
          id: Date.now()
        }];
        setMessages(errorMessages);
        saveMessages(errorMessages);
      }
    } finally {
      setIsLoading(false);
      setCurrentThinking('');
      abortControllerRef.current = null;
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearChat = () => {
    setMessages([]);
    setCurrentThinking('');
    if (chatId) {
      saveMessages([]);
    }
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {messages.length === 0 ? (
          <WelcomeScreen onSuggestionClick={(text) => sendMessage(text)} />
        ) : (
          <div className="w-[80%] max-w-5xl mx-auto py-6 px-4 space-y-6">
            {messages.map((message, index) => (
              <MessageBubble
                key={message.id || index}
                message={message}
                isExpanded={expandedThinking[message.id]}
                onToggleThinking={() => toggleThinking(message.id)}
                onCopy={copyToClipboard}
              />
            ))}

            {/* Thinking indicator */}
            {isLoading && currentThinking && (
              <div className="flex gap-4 animate-slideUp">
                <div className="w-8 h-8 rounded-lg bg-secondary/20 flex items-center justify-center shrink-0">
                  <Sparkles size={16} className="text-secondary animate-pulse" />
                </div>
                <div className="flex-1 rounded-lg border border-secondary/20 bg-secondary/5 p-4">
                  <div className="flex items-center gap-2 text-xs text-secondary mb-2">
                    <Loader2 size={12} className="animate-spin" />
                    <span>Thinking...</span>
                  </div>
                  <div className="prose prose-sm max-w-none text-muted-foreground">
                    <ReactMarkdown
                      components={{
                        code({ node, inline, className, children, ...props }) {
                          return inline ? (
                            <code className="bg-muted px-1.5 py-0.5 rounded text-secondary text-xs" {...props}>{children}</code>
                          ) : (
                            <pre className="rounded-lg p-4 overflow-x-auto bg-zinc-900 border border-border"><code className="text-xs" {...props}>{children}</code></pre>
                          );
                        },
                      }}
                    >
                      {currentThinking}
                    </ReactMarkdown>
                  </div>
                </div>
              </div>
            )}

            {/* Loading indicator */}
            {isLoading && !currentThinking && messages[messages.length - 1]?.role === 'user' && (
              <div className="flex gap-4 animate-fadeIn">
                <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center shrink-0">
                  <Bot size={16} className="text-primary" />
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 size={16} className="animate-spin" />
                  <span className="text-sm">Generating response...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="border-t border-border bg-card/80 backdrop-blur-xl p-4">
        <div className="w-[80%] max-w-5xl mx-auto">
          <div className="relative flex items-end gap-2">
            <div className="flex-1 relative">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Send a message..."
                rows={1}
                disabled={isLoading}
                className="w-full min-h-[48px] max-h-[200px] resize-none pr-12 px-4 py-3 rounded-lg border border-border bg-muted focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary disabled:opacity-50 text-sm"
              />

              {isLoading ? (
                <button
                  onClick={stopGeneration}
                  className="absolute right-1 bottom-1 h-9 w-9 flex items-center justify-center rounded-md text-destructive hover:bg-destructive/10 transition-all duration-150 cursor-pointer active:scale-90"
                  title="Stop generating"
                >
                  <Square size={16} fill="currentColor" />
                </button>
              ) : (
                <button
                  onClick={() => sendMessage()}
                  disabled={!input.trim()}
                  className="absolute right-1 bottom-1 h-9 w-9 flex items-center justify-center rounded-md text-primary hover:bg-primary/10 transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer active:scale-90"
                  title="Send message"
                >
                  <Send size={16} />
                </button>
              )}
            </div>

            {messages.length > 0 && (
              <button
                onClick={clearChat}
                className="h-10 w-10 flex items-center justify-center rounded-lg hover:bg-muted transition-all duration-150 cursor-pointer active:scale-90"
                title="Clear chat"
              >
                <RotateCcw size={18} />
              </button>
            )}
          </div>

          <p className="text-[10px] text-muted-foreground text-center mt-3">
            <kbd className="px-1 py-0.5 rounded bg-muted border border-border font-mono">Enter</kbd> to send,{' '}
            <kbd className="px-1 py-0.5 rounded bg-muted border border-border font-mono">Shift+Enter</kbd> for new line
          </p>
        </div>
      </div>
    </div>
  );
}

function WelcomeScreen({ onSuggestionClick }) {
  const suggestions = [
    'Explain quantum computing in simple terms',
    'Write a Python function to sort a list',
    'What are the benefits of TypeScript?',
    'Help me debug my React component',
  ];

  return (
    <div className="h-full flex flex-col items-center justify-center px-4 animate-slideUp">
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center mb-6 shadow-lg">
        <Sparkles size={32} className="text-primary" />
      </div>
      <h1 className="text-2xl font-bold mb-2">Antigravity Claude Proxy</h1>
      <p className="text-muted-foreground text-center max-w-md mb-8">
        Chat with Claude models through the Antigravity proxy. Start a conversation below.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-lg w-full">
        {suggestions.map((prompt, i) => (
          <button
            key={i}
            onClick={() => onSuggestionClick(prompt)}
            className="h-auto p-4 text-left text-sm text-muted-foreground hover:text-foreground border border-border rounded-lg hover:bg-muted hover:border-muted-foreground/30 transition-all duration-150 cursor-pointer active:scale-[0.98]"
          >
            {prompt}
          </button>
        ))}
      </div>
    </div>
  );
}

function MessageBubble({ message, isExpanded, onToggleThinking, onCopy }) {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === 'user';

  const handleCopy = async () => {
    await onCopy(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`flex gap-4 animate-slideUp ${isUser ? 'flex-row-reverse' : ''}`}>
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
        isUser ? 'bg-accent/20' : message.isError ? 'bg-destructive/20' : 'bg-primary/20'
      }`}>
        {isUser ? (
          <User size={16} className="text-accent" />
        ) : (
          <Bot size={16} className={message.isError ? 'text-destructive' : 'text-primary'} />
        )}
      </div>

      <div className={`flex-1 max-w-[85%] ${isUser ? 'flex flex-col items-end' : ''}`}>
        {/* Thinking block */}
        {!isUser && message.thinking && (
          <div className="mb-3">
            <button
              onClick={onToggleThinking}
              className="flex items-center gap-2 text-xs text-secondary hover:text-secondary/80 px-2 py-1 rounded-md hover:bg-secondary/10 transition-all duration-150 cursor-pointer active:scale-[0.98]"
            >
              {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              <Sparkles size={12} />
              View thinking process
            </button>

            {isExpanded && (
              <div className="mt-2 rounded-lg border border-secondary/20 bg-secondary/5 p-3 text-sm text-muted-foreground">
                <div className="prose prose-sm max-w-none">
                  <ReactMarkdown
                    components={{
                      code({ node, inline, className, children, ...props }) {
                        return inline ? (
                          <code className="bg-muted px-1.5 py-0.5 rounded text-secondary text-xs" {...props}>{children}</code>
                        ) : (
                          <pre className="rounded-lg p-4 overflow-x-auto bg-zinc-900 border border-border"><code className="text-xs" {...props}>{children}</code></pre>
                        );
                      },
                    }}
                  >
                    {message.thinking}
                  </ReactMarkdown>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Message content */}
        <div className={`rounded-lg p-4 ${
          isUser 
            ? 'bg-primary/10 border border-primary/20' 
            : message.isError 
              ? 'bg-destructive/10 border border-destructive/20' 
              : 'bg-muted/50 border border-border'
        }`}>
          {isUser ? (
            <p className="text-sm whitespace-pre-wrap">{message.content}</p>
          ) : (
            <div className="prose prose-sm max-w-none">
              <ReactMarkdown
                components={{
                  code({ node, inline, className, children, ...props }) {
                    return inline ? (
                      <code className="bg-muted px-1.5 py-0.5 rounded text-primary text-xs" {...props}>{children}</code>
                    ) : (
                      <pre className="rounded-lg p-4 overflow-x-auto bg-zinc-900 border border-border"><code className="text-xs" {...props}>{children}</code></pre>
                    );
                  },
                }}
              >
                {message.content}
              </ReactMarkdown>
            </div>
          )}
        </div>

        {/* Copy button */}
        {!isUser && !message.isError && (
          <button
            onClick={handleCopy}
            className="mt-2 flex items-center gap-1.5 text-xs px-2 py-1 rounded-md hover:bg-muted transition-all duration-150 text-muted-foreground hover:text-foreground cursor-pointer active:scale-[0.98]"
          >
            {copied ? <><Check size={12} className="text-accent" />Copied!</> : <><Copy size={12} />Copy</>}
          </button>
        )}
      </div>
    </div>
  );
}
