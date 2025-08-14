'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User } from 'lucide-react';
import { httpsCallable, getFunctions } from 'firebase/functions';

import { useAuth } from '@/components/auth-provider';
import { useToast } from '@/components/toast';
import { TMessage } from './interfaces';
import { subscribeToSessionMessages } from './services';
import AssistantMessage from './assistant-message';


export function ChatInterface() {
  const { user } = useAuth();
  const { error: showError } = useToast();

  const [messages, setMessages] = useState<TMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // For now, support a single session per user
  const sessionId = '001';

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Subscribe to Firestore messages for the current user and session
  useEffect(() => {
    if (!user?.uid) return;
    console.log(`user.uid =======> ${user.uid}`);
    const unsubscribe = subscribeToSessionMessages(sessionId, (msgs) => setMessages(msgs));
    return () => unsubscribe();
  }, [user?.uid]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    if (!user?.uid) return;

    const clientMessageId = Date.now().toString();
    const prompt = input.trim();
    setInput('');
    setIsLoading(true);

    try {
      // Call the Google Cloud Function using Firebase callable function
      const functions = getFunctions();
      const chatFunction = httpsCallable(functions, 'chat');
      const result = await chatFunction({
        prompt,
        sessionId,
        clientMessageId,
      });
      const data = result.data as { success: boolean; message: string; data: string | null };

      if (!data.success || !data.data) {
        showError(data.message || 'Sorry, I encountered an error. Please try again.', 'Chat Error');
      } else {
        // Success path: Firestore subscription will render saved messages
      }
    } catch (error) {
      console.error('Error sending message:', error);
      showError('Sorry, I encountered an error. Please try again.', 'Chat Error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] bg-white rounded-lg shadow-sm border">
      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-gray-500 mt-8">
            <Bot className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p>Start a conversation with your AI assistant</p>
          </div>
        )}
        
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`px-4 py-3 rounded-lg ${
                message.role === 'user'
                  ? 'bg-indigo-600 text-white max-w-xs lg:max-w-md'
                  : 'bg-gray-100 text-gray-900 w-[55%]'
              }`}
            >
              <div className="flex items-start space-x-2">
                {message.role === 'assistant' && (
                  <Bot className="h-4 w-4 mt-1 flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  {message.role === 'assistant' && message ? (
                    <AssistantMessage message={message} />
                  ) : (
                    <p className="text-sm whitespace-pre-wrap">{message.message as string}</p>
                  )}
                  <p className="text-xs opacity-70 mt-2">
                    {message.createdAt.toDate().toLocaleTimeString('pt-BR', {
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                      hour12: false
                    })}
                  </p>
                </div>
                {message.role === 'user' && (
                  <User className="h-4 w-4 mt-1 flex-shrink-0" />
                )}
              </div>
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 text-gray-900 w-[55%] px-4 py-3 rounded-lg">
              <div className="flex items-center space-x-2">
                <Bot className="h-4 w-4" />
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input Form */}
      <div className="border-t p-4">
        <form onSubmit={handleSubmit} className="flex space-x-4">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="h-5 w-5" />
          </button>
        </form>
      </div>
    </div>
  );
}
