'use client';

import { useState, useRef, useEffect } from 'react';
import { 
  Upload, 
  FileText, 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  Trash2 
} from 'lucide-react';
import { ref, uploadBytes, deleteObject } from 'firebase/storage';
import { httpsCallable, getFunctions } from 'firebase/functions';

import { useAuth } from '@/components/auth-provider';
import { storage } from '@/lib/firebase';
import { 
  subscribeToDocuments, 
  subscribeToDocumentProcessingStatus, 
} from './services';
import { Document, DocumentProcessingStatus } from './interfaces';

export function DocumentManagement() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [processingStatuses, setProcessingStatuses] = useState<DocumentProcessingStatus[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<Document | null>(null);
  const [isLoadingDocuments, setIsLoadingDocuments] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user } = useAuth();

  // Track previous statuses to detect changes
  const [previousStatuses, setPreviousStatuses] = useState<Map<string, string>>(new Map());
  
  // Track documents that are being deleted with a timeout
  const [deletingDocuments, setDeletingDocuments] = useState<Set<string>>(new Set());

  // Subscribe to documents for the current user
  useEffect(() => {
    if (!user?.uid) return;
    console.log(`Subscribing to documents for user: ${user.uid}`);
    setIsLoadingDocuments(true);
    const unsubscribe = subscribeToDocuments(user.uid, (docs) => {
      setDocuments(docs);
      setIsLoadingDocuments(false);
    });
    return () => unsubscribe();
  }, [user?.uid]);

  // Subscribe to document processing status for real-time updates
  useEffect(() => {
    if (!user?.uid) return;
    console.log(`Subscribing to processing status for user: ${user.uid}`);
    const unsubscribe = subscribeToDocumentProcessingStatus(user.uid, (statuses) => {
      console.log('Processing statuses updated:', statuses);
      setProcessingStatuses(statuses);
      
      // Update previous statuses for tracking changes
      const newPreviousStatuses = new Map();
      const currentFileNames = new Set<string>();
      
      statuses.forEach((status) => {
        newPreviousStatuses.set(status.file_name, status.status);
        currentFileNames.add(status.file_name);
        
        // If a document is being deleted, add it to the deleting set
        if (status.status === 'deleting') {
          setDeletingDocuments(prev => new Set(prev).add(status.file_name));
        }
      });
      
      // Remove documents from deleting set if they're no longer in the statuses
      // but keep them for a short time to handle the transition
      setDeletingDocuments(prev => {
        const newDeleting = new Set(prev);
        prev.forEach(fileName => {
          if (!currentFileNames.has(fileName)) {
            // Remove from deleting set after 5 seconds
            setTimeout(() => {
              setDeletingDocuments(current => {
                const updated = new Set(current);
                updated.delete(fileName);
                return updated;
              });
            }, 5000);
          }
        });
        return newDeleting;
      });
      
      setPreviousStatuses(newPreviousStatuses);
    });
    
    return () => unsubscribe();
  }, [user?.uid]);

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setIsUploading(true);

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      try {
        // Upload to Firebase Storage
        const storageRef = ref(storage, `user-documents/${user?.uid}/${file.name}`);
        await uploadBytes(storageRef, file);
        // The subscription will automatically update the documents list
      } catch (error) {
        console.error('Upload error:', error);
      }
    }

    setIsUploading(false);
  };

  const handleDeleteDocument = async (document: Document) => {
    // Check if document is already being deleted
    const processingStatus = processingStatuses.find(
      status => status.file_name === document.name
    );
    
    if (processingStatus?.status === 'deleting' || deletingDocuments.has(document.name)) {
      console.log('Document is already being deleted');
      return;
    }
    
    // Show the deletion confirmation modal
    setShowDeleteConfirm(document);
  };

  const confirmDeleteDocument = async () => {
    if (!showDeleteConfirm) return;
    
    setIsDeleting(true);
    try {
      // First, delete from OpenAI storage and vector stores
      const functions = getFunctions();
      const deleteDocument = httpsCallable(functions, 'delete_document');
      
      const result = await deleteDocument({ fileName: showDeleteConfirm.name });
      const data = result.data as any;
      
      if (!data.success) {
        console.warn('Failed to delete from OpenAI:', data.message);
        // Continue with Firebase Storage deletion even if OpenAI deletion fails
      }
      
      // Delete from Firebase Storage
      const storageRef = ref(storage, `user-documents/${user?.uid}/${showDeleteConfirm.name}`);
      await deleteObject(storageRef);
      
      // Close the modal
      setShowDeleteConfirm(null);
      
      // The subscription will automatically update the documents list
    } catch (error) {
      console.error('Delete error:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const getStatusIcon = (status: Document['status'], processingStatus?: DocumentProcessingStatus, documentName?: string) => {
    // If we have real-time processing status, use that instead
    if (processingStatus) {
      switch (processingStatus.status) {
        case 'uploading':
          return <Clock className="h-4 w-4 text-yellow-500" />;
        case 'processing':
          return <Clock className="h-4 w-4 text-blue-500" />;
        case 'vectorizing':
          return <Clock className="h-4 w-4 text-purple-500" />;
        case 'completed':
          return <CheckCircle className="h-4 w-4 text-green-500" />;
        case 'failed':
          return <AlertCircle className="h-4 w-4 text-red-500" />;
        case 'deleting':
          return <Clock className="h-4 w-4 text-orange-500" />;
      }
    }
    
    // Check if this document is in the deleting set
    if (documentName && deletingDocuments.has(documentName)) {
      return <Clock className="h-4 w-4 text-orange-500" />;
    }
    
    // If no processing status exists and document status is 'completed', 
    // it means the document is ready (this is the normal case for existing documents)
    if (status === 'completed') {
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    }
    
    // If no processing status exists yet, show uploading icon
    // This happens when a file is uploaded but the Cloud Function hasn't started yet
    return <Clock className="h-4 w-4 text-yellow-500" />;
  };

  const getStatusText = (status: Document['status'], processingStatus?: DocumentProcessingStatus, documentName?: string) => {
    // If we have real-time processing status, use that instead
    if (processingStatus) {
      const progressText = processingStatus.progress_percentage 
        ? ` (${processingStatus.progress_percentage}%)` 
        : '';
        
      switch (processingStatus.status) {
        case 'uploading':
          return `Uploading...${progressText}`;
        case 'processing':
          return `Processing...${progressText}`;
        case 'vectorizing':
          return `Vectorizing...${progressText}`;
        case 'completed':
          return 'Document ready to be queried on chat.';
        case 'failed':
          return 'Processing failed';
        case 'deleting':
          return 'Being deleted...';
      }
    }
    
    // Check if this document is in the deleting set
    if (documentName && deletingDocuments.has(documentName)) {
      return 'Being deleted...';
    }
    
    // If no processing status exists and document status is 'completed', 
    // it means the document is ready (this is the normal case for existing documents)
    if (status === 'completed') {
      return 'Document ready to be queried on chat.';
    }
    
    // If no processing status exists yet, show uploading state
    // This happens when a file is uploaded but the Cloud Function hasn't started yet
    return 'Uploading...';
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Document Management</h2>
        <p className="text-gray-600">Upload and manage your company documents</p>
      </div>

      {/* Upload Area */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
          <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Upload Documents
          </h3>
          <p className="text-gray-600 mb-4">
            Click to select files
          </p>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 flex items-center justify-center space-x-2 mx-auto"
          >
            {isUploading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                <span>Uploading...</span>
              </>
            ) : (
              <>
                <Upload className="h-4 w-4" />
                <span>Select Files</span>
              </>
            )}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.doc,.docx,.txt"
            onChange={(e) => handleFileUpload(e.target.files)}
            className="hidden"
          />
        </div>
      </div>

      {/* Document List */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="px-6 py-4 border-b">
          <h3 className="text-lg font-medium text-gray-900">Documents</h3>
        </div>
        <div className="divide-y divide-gray-200">
          {isLoadingDocuments ? (
            <div className="px-6 py-12 text-center">
              <div className="flex flex-col items-center space-y-4">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-indigo-600 border-t-transparent"></div>
                <p className="text-gray-600">Loading documents... please wait</p>
              </div>
            </div>
          ) : documents.length === 0 ? (
            <div className="px-6 py-8 text-center text-gray-500">
              <FileText className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p>No documents uploaded yet</p>
            </div>
          ) : (
            documents.map((document) => {
              // Find corresponding processing status
              const processingStatus = processingStatuses.find(
                status => status.file_name === document.name
              );
              
              console.log(`Document ${document.name}:`, {
                documentStatus: document.status,
                processingStatus: processingStatus?.status,
                hasProcessingStatus: !!processingStatus
              });
              
              return (
                <div key={document.id} className="px-6 py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <FileText className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {document.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatFileSize(document.size)} • Uploaded{' '}
                          {document.uploadedAt.toLocaleDateString()}
                        </p>
                                                 {/* Show progress bar for processing documents */}
                         {((processingStatus && processingStatus.status !== 'completed' && processingStatus.status !== 'failed') || 
                           (!processingStatus)) && (
                           <div className="mt-2 w-full bg-gray-200 rounded-full h-1.5">
                             <div 
                               className={`h-1.5 rounded-full transition-all duration-300 ${
                                 processingStatus?.status === 'deleting' 
                                   ? 'bg-orange-500' 
                                   : 'bg-blue-600'
                               }`}
                               style={{ width: `${processingStatus?.progress_percentage || 0}%` }}
                             ></div>
                           </div>
                         )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                                             <div className="flex items-center space-x-2">
                         {getStatusIcon(document.status, processingStatus, document.name)}
                         <span className="text-sm text-gray-600">
                          {getStatusText(document.status, processingStatus, document.name)}
                        </span>
                      </div>
                                             <button
                         onClick={() => handleDeleteDocument(document)}
                         disabled={processingStatus?.status === 'deleting' || deletingDocuments.has(document.name)}
                         className={`p-1 rounded-md transition-colors ${
                           processingStatus?.status === 'deleting' || deletingDocuments.has(document.name)
                             ? 'text-gray-300 cursor-not-allowed'
                             : 'text-gray-400 hover:text-red-500 hover:bg-red-50'
                         }`}
                         title={processingStatus?.status === 'deleting' || deletingDocuments.has(document.name) ? 'Document is being deleted' : 'Delete document'}
                       >
                         <Trash2 className="h-4 w-4" />
                       </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4">
            <h3 className="text-lg font-semibold mb-2">Delete Document</h3>
            <p className="text-gray-600 mb-4">
              Are you sure you want to delete "{showDeleteConfirm.name}"? This action cannot be undone.
            </p>
            <div className="flex space-x-3">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteDocument}
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
