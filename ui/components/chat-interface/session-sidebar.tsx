'use client';

import { useState } from 'react';
import { Plus, Trash2, MessageSquare, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAuth } from '@/components/auth-provider';
import { useToast } from '@/components/toast';
import { ISession } from './interfaces';
import { createNewSession, deleteSession } from './services';

interface SessionSidebarProps {
  currentSessionId: string | null;
  sessions: ISession[];
  isLoading: boolean;
  onSessionSelect: (sessionId: string) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onSessionsUpdate: () => void;
}

export function SessionSidebar({ 
  currentSessionId, 
  sessions,
  isLoading,
  onSessionSelect, 
  isCollapsed, 
  onToggleCollapse,
  onSessionsUpdate
}: SessionSidebarProps) {
  const { user } = useAuth();
  const { error: showError, success: showSuccess } = useToast();
  
  const [isCreating, setIsCreating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  const handleCreateSession = async () => {
    setIsCreating(true);
    try {
      const result = await createNewSession();
      if (result.success && result.data) {
        // Select the new session
        onSessionSelect(result.data.sessionId);
        showSuccess('New session created');
        // Notify parent to refresh sessions list
        onSessionsUpdate();
      } else {
        showError(result.message || 'Failed to create session');
      }
    } catch (error) {
      showError('Failed to create new session');
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteSession = async (sessionId: string) => {
    setIsDeleting(true);
    try {
      const result = await deleteSession(sessionId);
      if (result.success) {
        setShowDeleteConfirm(null);
        showSuccess('Session deleted');
        
        // If the deleted session was the current one, select the first available session
        if (currentSessionId === sessionId && sessions.length > 1) {
          const remainingSessions = sessions.filter(s => s.sessionId !== sessionId);
          if (remainingSessions.length > 0) {
            onSessionSelect(remainingSessions[0].sessionId);
          }
        }
        
        // Notify parent to refresh sessions list
        onSessionsUpdate();
      } else {
        showError(result.message || 'Failed to delete session');
      }
    } catch (error) {
      showError('Failed to delete session');
    } finally {
      setIsDeleting(false);
    }
  };

  const formatSessionName = (session: ISession) => {
    if (session.name) {
      return session.name.length > 30 ? session.name.substring(0, 30) + '...' : session.name;
    }
    return 'New Chat';
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (isCollapsed) {
    return (
      <div className="w-12 bg-gray-50 border-r border-gray-200 flex flex-col items-center py-4">
        <button
          onClick={onToggleCollapse}
          className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
          title="Expand sidebar"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
        <div className="mt-4">
          <button
            onClick={handleCreateSession}
            disabled={isCreating}
            className="p-2 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
            title={isCreating ? "Creating new chat..." : "New chat"}
          >
            {isCreating ? (
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-600 border-t-transparent"></div>
            ) : (
              <Plus className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-64 bg-gray-50 border-r border-gray-200 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Chat History</h2>
        <button
          onClick={onToggleCollapse}
          className="p-1 hover:bg-gray-200 rounded transition-colors"
          title="Collapse sidebar"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
      </div>

      {/* New Chat Button */}
      <div className="p-4">
        <button
          onClick={handleCreateSession}
          disabled={isCreating}
          className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
        >
          {isCreating ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
              <span>Creating...</span>
            </>
          ) : (
            <>
              <Plus className="h-4 w-4" />
              <span>New Chat</span>
            </>
          )}
        </button>
      </div>

      {/* Sessions List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="p-4 text-center text-gray-500">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="mt-2">Loading sessions...</p>
          </div>
        ) : sessions.length === 0 ? (
          <div className="p-4 text-center text-gray-500">
            <MessageSquare className="h-8 w-8 mx-auto mb-2 text-gray-400" />
            <p>No conversations yet</p>
            <p className="text-sm">Start a new chat to begin</p>
          </div>
        ) : (
          <div className="space-y-1 p-2">
            {sessions.map((session) => (
              <div
                key={session.sessionId}
                className={`group relative flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${
                  currentSessionId === session.sessionId
                    ? 'bg-indigo-100 text-indigo-900'
                    : 'hover:bg-gray-100 text-gray-700'
                }`}
                onClick={() => onSessionSelect(session.sessionId)}
              >
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">
                    {formatSessionName(session)}
                  </div>
                  <div className="text-xs text-gray-500 truncate">
                    {formatDate(session.updatedAt)}
                  </div>
                </div>
                
                {/* Delete Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowDeleteConfirm(session.sessionId);
                  }}
                  className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 hover:text-red-600 rounded transition-all"
                  title="Delete session"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4">
            <h3 className="text-lg font-semibold mb-2">Delete Session</h3>
            <p className="text-gray-600 mb-4">
              Are you sure you want to delete this session? This action cannot be undone.
            </p>
            <div className="flex space-x-3">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
                             <button
                 onClick={() => handleDeleteSession(showDeleteConfirm)}
                 disabled={isDeleting}
                 className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center space-x-2"
               >
                 {isDeleting ? (
                   <>
                     <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                     <span>Deleting...</span>
                   </>
                 ) : (
                   <span>Delete</span>
                 )}
               </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
