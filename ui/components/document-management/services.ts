import { storage } from '@/lib/firebase';
import { ref, listAll, getMetadata } from 'firebase/storage';
import { getFirestore, collection, onSnapshot, query, orderBy } from 'firebase/firestore';

import { Document, DocumentProcessingStatus } from './interfaces';


export function subscribeToDocuments(
  userId: string,
  onChange: (documents: Document[]) => void
) {
  if (!userId) {
    onChange([]);
    return () => {};
  }

  const userDocumentsRef = ref(storage, `user-documents/${userId}`);
  
  // Function to fetch and process documents
  const fetchDocuments = async () => {
    try {
      const result = await listAll(userDocumentsRef);
      const documents: Document[] = [];
      
      for (const itemRef of result.items) {
        try {
          const metadata = await getMetadata(itemRef);
          const document: Document = {
            id: itemRef.name, // Use filename as ID
            name: itemRef.name,
            size: metadata.size,
            status: 'completed' as const,
            uploadedAt: new Date(metadata.timeCreated),
            processedAt: new Date(metadata.updated),
          };
          documents.push(document);
        } catch (error) {
          console.error(`Error getting metadata for ${itemRef.name}:`, error);
        }
      }
      
      onChange(documents);
    } catch (error) {
      console.error('Error fetching documents:', error);
      onChange([]);
    }
  };

  // Initial fetch
  fetchDocuments();

  // Set up polling for changes (Firebase Storage doesn't have real-time listeners like Firestore)
  // We'll poll every 5 seconds to check for new documents
  const intervalId = setInterval(fetchDocuments, 5000);

  // Return unsubscribe function
  return () => {
    clearInterval(intervalId);
  };
}


export function subscribeToDocumentProcessingStatus(
  userId: string,
  onChange: (statuses: DocumentProcessingStatus[]) => void
) {
  if (!userId) {
    onChange([]);
    return () => {};
  }

  const firestore = getFirestore();
  
  const statusRef = collection(firestore, 'document_processing_status', userId, 'files');
  const statusQuery = query(statusRef, orderBy('updated_at', 'desc'));
  
  const unsubscribe = onSnapshot(statusQuery, (snapshot) => {
    const statuses: DocumentProcessingStatus[] = [];
    
    snapshot.forEach((doc) => {
      const data = doc.data();
      statuses.push({
        user_id: data.user_id,
        file_name: data.file_name,
        status: data.status,
        error_message: data.error_message,
        progress_percentage: data.progress_percentage,
        started_at: data.started_at?.toDate(),
        completed_at: data.completed_at?.toDate(),
        updated_at: data.updated_at?.toDate(),
      });
    });
    
    onChange(statuses);
  }, (error) => {
    console.error('Error listening to document processing status:', error);
    onChange([]);
  });

  return unsubscribe;
}
