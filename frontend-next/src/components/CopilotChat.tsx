'use client';

import { useState, useEffect, useRef } from 'react';
import { api, StabilityData, Match } from '@/lib/api';
import styles from './CopilotChat.module.css';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
}

interface CopilotChatProps {
  playerId: string | null;
  stabilityData: StabilityData | null;
  recentMatches: Match[];
}

const STORAGE_KEY = 'valai_chat_sessions';

export default function CopilotChat({ playerId, stabilityData, recentMatches }: CopilotChatProps) {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Load sessions from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Convert date strings back to Date objects
        const sessionsWithDates = parsed.map((s: ChatSession) => ({
          ...s,
          createdAt: new Date(s.createdAt),
          updatedAt: new Date(s.updatedAt),
          messages: s.messages.map((m: Message) => ({
            ...m,
            timestamp: new Date(m.timestamp)
          }))
        }));
        setSessions(sessionsWithDates);
        if (sessionsWithDates.length > 0) {
          setActiveSessionId(sessionsWithDates[0].id);
        }
      } catch (e) {
        console.error('Failed to load chat sessions:', e);
      }
    }
  }, []);

  // Save sessions to localStorage whenever they change
  useEffect(() => {
    if (sessions.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
    }
  }, [sessions]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [sessions, activeSessionId]);

  const activeSession = sessions.find(s => s.id === activeSessionId);

  const createNewSession = () => {
    const newSession: ChatSession = {
      id: Date.now().toString(),
      title: 'New Chat',
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };
    setSessions(prev => [newSession, ...prev]);
    setActiveSessionId(newSession.id);
    setInput('');
    setError(null);
  };

  const deleteSession = (sessionId: string) => {
    setSessions(prev => prev.filter(s => s.id !== sessionId));
    if (activeSessionId === sessionId) {
      const remaining = sessions.filter(s => s.id !== sessionId);
      setActiveSessionId(remaining.length > 0 ? remaining[0].id : null);
    }
  };

  const generateTitle = (content: string): string => {
    // Take first 30 chars of user's first message as title
    const title = content.slice(0, 30);
    return title.length < content.length ? title + '...' : title;
  };

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    // Create session if none exists
    let currentSessionId = activeSessionId;
    if (!currentSessionId) {
      const newSession: ChatSession = {
        id: Date.now().toString(),
        title: 'New Chat',
        messages: [],
        createdAt: new Date(),
        updatedAt: new Date()
      };
      setSessions(prev => [newSession, ...prev]);
      currentSessionId = newSession.id;
      setActiveSessionId(newSession.id);
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date()
    };

    // Add user message to session
    setSessions(prev => prev.map(s => {
      if (s.id === currentSessionId) {
        const isFirstMessage = s.messages.length === 0;
        return {
          ...s,
          title: isFirstMessage ? generateTitle(input.trim()) : s.title,
          messages: [...s.messages, userMessage],
          updatedAt: new Date()
        };
      }
      return s;
    }));

    setInput('');
    setIsLoading(true);
    setError(null);

    try {
      // Get current session messages for context
      const currentSession = sessions.find(s => s.id === currentSessionId);
      const previousMessages = currentSession?.messages || [];

      // Build player stats object
      const playerStats = {
        stability: stabilityData ? {
          score: stabilityData.score,
          label: stabilityData.label,
          volatility: stabilityData.volatility,
          avg_hs_rate: stabilityData.avg_hs_rate || stabilityData.current_hs_rate,
          match_count: stabilityData.match_count,
          description: stabilityData.description
        } : null,
        recent_matches: recentMatches.slice(0, 5)
      };

      const response = await api.sendChatMessage(
        [...previousMessages, userMessage].map(m => ({
          role: m.role,
          content: m.content
        })),
        playerStats
      );

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.message,
        timestamp: new Date()
      };

      // Add assistant response to session
      setSessions(prev => prev.map(s => {
        if (s.id === currentSessionId) {
          return {
            ...s,
            messages: [...s.messages, assistantMessage],
            updatedAt: new Date()
          };
        }
        return s;
      }));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (date: Date) => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString();
    }
  };

  return (
    <div className={styles.container}>
      {/* Sidebar */}
      <div className={`${styles.sidebar} ${sidebarOpen ? styles.sidebarOpen : ''}`}>
        <button className={styles.newChatBtn} onClick={createNewSession}>
          <span className={styles.plusIcon}>+</span>
          New Chat
        </button>
        
        <div className={styles.sessionsList}>
          {sessions.map(session => (
            <div
              key={session.id}
              className={`${styles.sessionItem} ${session.id === activeSessionId ? styles.sessionActive : ''}`}
              onClick={() => setActiveSessionId(session.id)}
            >
              <div className={styles.sessionInfo}>
                <span className={styles.sessionTitle}>{session.title}</span>
                <span className={styles.sessionDate}>{formatDate(session.updatedAt)}</span>
              </div>
              <button
                className={styles.deleteBtn}
                onClick={(e) => {
                  e.stopPropagation();
                  deleteSession(session.id);
                }}
              >
                ×
              </button>
            </div>
          ))}
        </div>

        {sessions.length === 0 && (
          <div className={styles.emptyState}>
            <p>No conversations yet</p>
            <p className={styles.emptyHint}>Start a new chat to get advice on your gameplay!</p>
          </div>
        )}
      </div>

      {/* Toggle sidebar button */}
      <button 
        className={styles.toggleSidebar}
        onClick={() => setSidebarOpen(!sidebarOpen)}
      >
        {sidebarOpen ? '◀' : '▶'}
      </button>

      {/* Main chat area */}
      <div className={styles.chatArea}>
        {/* Messages */}
        <div className={styles.messages}>
          {!activeSession || activeSession.messages.length === 0 ? (
            <div className={styles.welcomeMessage}>
              <div className={styles.welcomeIcon}>🎯</div>
              <h3>ValAI Copilot</h3>
              <p>Your personal Valorant coach powered by AI</p>
              {stabilityData && (
                <div className={styles.statsPreview}>
                  <p>I have access to your stats:</p>
                  <ul>
                    <li>Stability Score: <strong>{stabilityData.score}</strong> ({stabilityData.label})</li>
                    <li>Avg HS Rate: <strong>{stabilityData.avg_hs_rate || stabilityData.current_hs_rate}%</strong></li>
                    <li>Matches Analyzed: <strong>{stabilityData.match_count}</strong></li>
                  </ul>
                </div>
              )}
              <div className={styles.suggestions}>
                <p>Try asking:</p>
                <button onClick={() => setInput("How can I improve my headshot rate?")}>
                  How can I improve my headshot rate?
                </button>
                <button onClick={() => setInput("Analyze my stability and give me tips")}>
                  Analyze my stability and give me tips
                </button>
                <button onClick={() => setInput("What does my volatility mean?")}>
                  What does my volatility mean?
                </button>
              </div>
            </div>
          ) : (
            activeSession.messages.map(message => (
              <div
                key={message.id}
                className={`${styles.message} ${message.role === 'user' ? styles.userMessage : styles.assistantMessage}`}
              >
                <div className={styles.messageAvatar}>
                  {message.role === 'user' ? '👤' : '🎯'}
                </div>
                <div className={styles.messageContent}>
                  <div className={styles.messageHeader}>
                    <span className={styles.messageSender}>
                      {message.role === 'user' ? 'You' : 'ValAI Copilot'}
                    </span>
                    <span className={styles.messageTime}>{formatTime(message.timestamp)}</span>
                  </div>
                  <div className={styles.messageText}>
                    {message.content.split('\n').map((line, i) => (
                      <p key={i}>{line || '\u00A0'}</p>
                    ))}
                  </div>
                </div>
              </div>
            ))
          )}
          
          {isLoading && (
            <div className={`${styles.message} ${styles.assistantMessage}`}>
              <div className={styles.messageAvatar}>🎯</div>
              <div className={styles.messageContent}>
                <div className={styles.typingIndicator}>
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Error message */}
        {error && (
          <div className={styles.errorMessage}>
            {error}
          </div>
        )}

        {/* Input area */}
        <div className={styles.inputArea}>
          <div className={`${styles.inputWrapper} flex items-center`}>
            <textarea
            className="px-4 py-3 leading-relaxed resize-none"
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about Valorant strategies, your stats, or how to improve..."
              rows={1}
              disabled={isLoading}
            />
            <button
              className={styles.sendBtn}
              onClick={sendMessage}
              disabled={!input.trim() || isLoading}
            >
              <span className={styles.sendIcon}>➤</span>
            </button>
          </div>
          <p className={styles.disclaimer}>
            ValAI Copilot focuses on Valorant topics and uses your stats for personalized advice.
          </p>
        </div>
      </div>
    </div>
  );
}
