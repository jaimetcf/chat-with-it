export interface Document {
  id: string;
  name: string;
  size: number;
  status: 'uploading' | 'processing' | 'completed' | 'error';
  uploadedAt: Date;
  processedAt?: Date;
}

export interface DocumentProcessingStatus {
  user_id: string;
  file_name: string;
  status: 'uploading' | 'processing' | 'vectorizing' | 'completed' | 'failed';
  error_message?: string;
  progress_percentage?: number;
  started_at?: Date;
  completed_at?: Date;
  updated_at?: Date;
}
