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

import { useAuth } from '@/components/auth-provider';
import { useToast } from '@/components/toast';
import { storage } from '@/lib/firebase';
import { 
  subscribeToDocuments, 
  subscribeToDocumentProcessingStatus, 
  DocumentProcessingStatus 
} from './services';
import { Document } from './interfaces';

export function DocumentManagement() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [processingStatuses, setProcessingStatuses] = useState<DocumentProcessingStatus[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user } = useAuth();
  const { success: showSuccess, error: showError, info: showInfo } = useToast();

  // Track previous statuses to detect changes
  const [previousStatuses, setPreviousStatuses] = useState<Map<string, string>>(new Map());

  // Subscribe to documents for the current user
  useEffect(() => {
    if (!user?.uid) return;
    console.log(`Subscribing to documents for user: ${user.uid}`);
    const unsubscribe = subscribeToDocuments(user.uid, (docs) => setDocuments(docs));
    return () => unsubscribe();
  }, [user?.uid]);

  // Subscribe to document processing status for real-time updates
  useEffect(() => {
    if (!user?.uid) return;
    console.log(`Subscribing to processing status for user: ${user.uid}`);
    const unsubscribe = subscribeToDocumentProcessingStatus(user.uid, (statuses) => {
      setProcessingStatuses(statuses);
      
      // Check for status changes and show appropriate toasts
      statuses.forEach((status) => {
        const previousStatus = previousStatuses.get(status.file_name);
        
        if (previousStatus !== status.status) {
          // Status changed, show notification
          switch (status.status) {
            case 'processing':
              showInfo(`${status.file_name} is being processed...`);
              break;
            case 'vectorizing':
              showInfo(`${status.file_name} is being vectorized for search...`);
              break;
            case 'completed':
              showSuccess(`${status.file_name} is ready for chat!`);
              break;
            case 'failed':
              showError(`${status.file_name} processing failed: ${status.error_message || 'Unknown error'}`);
              break;
          }
        }
      });
      
      // Update previous statuses
      const newPreviousStatuses = new Map();
      statuses.forEach((status) => {
        newPreviousStatuses.set(status.file_name, status.status);
      });
      setPreviousStatuses(newPreviousStatuses);
    });
    
    return () => unsubscribe();
  }, [user?.uid, previousStatuses, showSuccess, showError, showInfo]);

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setIsUploading(true);

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      try {
        // Show initial upload notification
        showInfo(`${file.name} uploaded successfully. Processing will begin shortly...`);
        
        // Upload to Firebase Storage
        const storageRef = ref(storage, `user-documents/${user?.uid}/${file.name}`);
        await uploadBytes(storageRef, file);
        // The subscription will automatically update the documents list and show processing notifications
      } catch (error) {
        console.error('Upload error:', error);
        showError(`Failed to upload ${file.name}. Please try again.`);
      }
    }

    setIsUploading(false);
  };

  const handleDeleteDocument = async (document: Document) => {
    // Show confirmation dialog
    const isConfirmed = window.confirm(`Are you sure you want to delete "${document.name}"? This action cannot be undone.`);
    
    if (!isConfirmed) return;

    try {
      // Delete from Firebase Storage
      const storageRef = ref(storage, `user-documents/${user?.uid}/${document.name}`);
      await deleteObject(storageRef);
      showSuccess(`${document.name} deleted successfully`);
      // The subscription will automatically update the documents list
    } catch (error) {
      console.error('Delete error:', error);
      showError('Failed to delete document. Please try again.');
    }
  };

  const getStatusIcon = (status: Document['status'], processingStatus?: DocumentProcessingStatus) => {
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
      }
    }
    
    // Fallback to document status
    switch (status) {
      case 'uploading':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'processing':
        return <Clock className="h-4 w-4 text-blue-500" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
    }
  };

  const getStatusText = (status: Document['status'], processingStatus?: DocumentProcessingStatus) => {
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
          return 'Ready for chat';
        case 'failed':
          return 'Processing failed';
      }
    }
    
    // Fallback to document status
    switch (status) {
      case 'uploading':
        return 'Uploading...';
      case 'processing':
        return 'Processing...';
      case 'completed':
        return 'Completed';
      case 'error':
        return 'Error';
    }
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
            Drag and drop files here, or click to select files
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
          {documents.length === 0 ? (
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
                        {processingStatus && processingStatus.status !== 'completed' && processingStatus.status !== 'failed' && (
                          <div className="mt-2 w-full bg-gray-200 rounded-full h-1.5">
                            <div 
                              className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
                              style={{ width: `${processingStatus.progress_percentage || 0}%` }}
                            ></div>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(document.status, processingStatus)}
                        <span className="text-sm text-gray-600">
                          {getStatusText(document.status, processingStatus)}
                        </span>
                      </div>
                      <button
                        onClick={() => handleDeleteDocument(document)}
                        className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
                        title="Delete document"
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
    </div>
  );
}
