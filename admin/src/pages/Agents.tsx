import React, { useState, useEffect, useRef } from 'react';
import { Card } from '../components/Card';
import { apiClient } from '../utils/api';
import { useAppStore } from '../store';
import { AgentSession, AgentMessage } from '../types';
import './Agents.css';

export const Agents: React.FC = () => {
  const {
    agentSessions,
    activeSessionId,
    isStreaming,
    setAgentSessions,
    setActiveSession,
    setIsStreaming,
  } = useAppStore();

  const [messageInput, setMessageInput] = useState('');
  const [streamingMessage, setStreamingMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [agentSessions, streamingMessage]);

  const createSession = async () => {
    try {
      const response = await apiClient.createAgentSession() as { session_id: string };
      const newSession: AgentSession = {
        id: response.session_id,
        created_at: new Date().toISOString(),
        messages: [],
      };
      setAgentSessions([...agentSessions, newSession]);
      setActiveSession(newSession.id);
    } catch (error) {
      console.error('Failed to create session:', error);
    }
  };

  const sendMessage = async () => {
    if (!messageInput.trim() || !activeSessionId || isStreaming) return;

    try {
      // Add user message immediately
      const userMessage: AgentMessage = {
        id: Date.now().toString(),
        session_id: activeSessionId,
        role: 'user',
        content: messageInput.trim(),
        timestamp: new Date().toISOString(),
      };

      const updatedSessions = agentSessions.map((session) =>
        session.id === activeSessionId
          ? { ...session, messages: [...session.messages, userMessage] }
          : session
      );
      setAgentSessions(updatedSessions);
      setMessageInput('');

      // Send message to backend
      await apiClient.sendAgentMessage(activeSessionId, 'user', userMessage.content);

      // Start streaming assistant response
      setIsStreaming(true);
      setStreamingMessage('');

      // Close existing stream if any
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }

      // Create new SSE stream
      const eventSource = apiClient.createAgentStream(activeSessionId);
      eventSourceRef.current = eventSource;

      eventSource.onmessage = (event) => {
        const data = JSON.parse(event.data);
        
        if (data.type === 'delta') {
          setStreamingMessage(prev => prev + data.content);
        } else if (data.type === 'done') {
          // Save complete assistant message
          const assistantMessage: AgentMessage = {
            id: Date.now().toString(),
            session_id: activeSessionId,
            role: 'assistant',
            content: streamingMessage,
            timestamp: new Date().toISOString(),
          };

          const finalSessions = agentSessions.map((session) =>
            session.id === activeSessionId
              ? { ...session, messages: [...session.messages, userMessage, assistantMessage] }
              : session
          );
          setAgentSessions(finalSessions);
          setStreamingMessage('');
          setIsStreaming(false);
          eventSource.close();
        }
      };

      eventSource.onerror = () => {
        setIsStreaming(false);
        setStreamingMessage('');
        eventSource.close();
      };

    } catch (error) {
      console.error('Failed to send message:', error);
      setIsStreaming(false);
    }
  };

  const activeSession = agentSessions.find(s => s.id === activeSessionId);

  return (
    <div className="agents">
      <div className="agents-header">
        <h1 className="page-title">Agent Communications</h1>
        <p className="page-subtitle">Elite AI agent interface</p>
      </div>

      <div className="agents-layout">
        <div className="sessions-panel">
          <Card title="Sessions">
            <button className="create-session-btn" onClick={createSession}>
              <span className="btn-icon">+</span>
              New Session
            </button>
            
            <div className="sessions-list">
              {agentSessions.map((session) => (
                <button
                  key={session.id}
                  className={`session-item ${activeSessionId === session.id ? 'active' : ''}`}
                  onClick={() => setActiveSession(session.id)}
                >
                  <div className="session-info">
                    <span className="session-id">#{session.id.slice(-6)}</span>
                    <span className="session-time">
                      {new Date(session.created_at).toLocaleTimeString()}
                    </span>
                  </div>
                  <span className="session-count">{session.messages.length}</span>
                </button>
              ))}
            </div>
          </Card>
        </div>

        <div className="chat-panel">
          <Card title={activeSession ? `Session #${activeSession.id.slice(-6)}` : 'Select Session'}>
            {activeSession ? (
              <>
                <div className="messages-container">
                  {activeSession.messages.map((message) => (
                    <div
                      key={message.id}
                      className={`message ${message.role}`}
                    >
                      <div className="message-header">
                        <span className="message-role">
                          {message.role === 'user' ? '👤' : '🤖'}
                        </span>
                        <span className="message-time">
                          {new Date(message.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <div className="message-content">{message.content}</div>
                    </div>
                  ))}

                  {isStreaming && streamingMessage && (
                    <div className="message assistant streaming">
                      <div className="message-header">
                        <span className="message-role">🤖</span>
                        <span className="typing-indicator">typing...</span>
                      </div>
                      <div className="message-content">{streamingMessage}</div>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>

                <div className="message-input-container">
                  <div className="input-group">
                    <input
                      type="text"
                      value={messageInput}
                      onChange={(e) => setMessageInput(e.target.value)}
                      placeholder="Send a message to the agent..."
                      className="message-input"
                      onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                      disabled={isStreaming}
                    />
                    <button
                      onClick={sendMessage}
                      className="send-button"
                      disabled={!messageInput.trim() || isStreaming}
                    >
                      {isStreaming ? '⏳' : '🚀'}
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="no-session">
                <p>Create or select a session to start chatting with agents</p>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};