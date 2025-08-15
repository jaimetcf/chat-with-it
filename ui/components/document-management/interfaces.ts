export interface Document {
  id: string;
  name: string;
  size: number;
  status: 'uploading' | 'processing' | 'completed' | 'error' | 'deleting';
  uploadedAt: Date;
  processedAt?: Date;
}

export interface DocumentProcessingStatus {
  user_id: string;
  file_name: string;
  status: 'uploading' | 'processing' | 'vectorizing' | 'completed' | 'failed' | 'deleting';
  error_message?: string;
  progress_percentage?: number;
  file_id?: string;
  vector_store_id?: string;
  started_at?: Date;
  completed_at?: Date;
  updated_at?: Date;
}
