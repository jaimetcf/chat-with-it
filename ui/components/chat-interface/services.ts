import { db } from '@/lib/firebase';
import { collection, onSnapshot, orderBy, query, Timestamp } from 'firebase/firestore';

import { TMessage, IUserMessage, IAssistantMessage } from './interfaces';


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
