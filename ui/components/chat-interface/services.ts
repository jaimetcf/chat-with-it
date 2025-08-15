import { db } from '@/lib/firebase';
import { collection, onSnapshot, orderBy, query, Timestamp } from 'firebase/firestore';
import { httpsCallable, getFunctions } from 'firebase/functions';

import { TMessage, IUserMessage, IAssistantMessage, ISession } from './interfaces';


export function subscribeToSessionMessages(
  sessionId: string,
  onChange: (messages: TMessage[]) => void
) {
  const messagesRef = collection(db, 'sessions', sessionId, 'messages');
  const q = query(messagesRef, orderBy('createdAt'));
  const unsubscribe = onSnapshot(q, (snapshot) => {
    const nextMessages: TMessage[] = snapshot.docs.map((doc) => {
      const message = doc.data() as TMessage;
      const createdAt = message.createdAt as Timestamp | undefined;
      
      // Handle different message structures based on role
      if (message.role === 'user') {
        const userMessage = message as IUserMessage;          
        return userMessage
      } else {
        const assistantMessage = message as IAssistantMessage;
        return assistantMessage        
      } 
    });
    onChange(nextMessages);
  });
  return unsubscribe;
}

export async function createNewSession(): Promise<{ success: boolean; data?: { sessionId: string; name: string | null }; message?: string }> {
  try {
    const functions = getFunctions();
    const createSessionFunction = httpsCallable(functions, 'create_session');
    const result = await createSessionFunction({});
    const data = result.data as { success: boolean; message: string; data: { sessionId: string; name: string | null } | null };
    
    if (data.success && data.data) {
      return { success: true, data: data.data };
    } else {
      return { success: false, message: data.message };
    }
  } catch (error) {
    console.error('Error creating session:', error);
    return { success: false, message: 'Failed to create new session' };
  }
}

export async function listUserSessions(): Promise<{ success: boolean; data?: ISession[]; message?: string }> {
  try {
    const functions = getFunctions();
    const listSessionsFunction = httpsCallable(functions, 'list_sessions');
    const result = await listSessionsFunction({});
    const data = result.data as { success: boolean; message: string; data: ISession[] | null };
    
    if (data.success && data.data) {
      return { success: true, data: data.data };
    } else {
      return { success: false, message: data.message };
    }
  } catch (error) {
    console.error('Error listing sessions:', error);
    return { success: false, message: 'Failed to list sessions' };
  }
}

export async function deleteSession(sessionId: string): Promise<{ success: boolean; message?: string }> {
  try {
    const functions = getFunctions();
    const deleteSessionFunction = httpsCallable(functions, 'delete_session');
    const result = await deleteSessionFunction({ sessionId });
    const data = result.data as { success: boolean; message: string; data: any };
    
    if (data.success) {
      return { success: true };
    } else {
      return { success: false, message: data.message };
    }
  } catch (error) {
    console.error('Error deleting session:', error);
    return { success: false, message: 'Failed to delete session' };
  }
}
