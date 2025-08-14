export interface Document {
  id: string;
  name: string;
  size: number;
  status: 'uploading' | 'processing' | 'completed' | 'error';
  uploadedAt: Date;
  processedAt?: Date;
}
