import api from '@/lib/api';

export interface FileUploadResponse {
  id: string;
  name: string;
  type: string;
  upload_url: string;
  download_url: string;
  content_type?: string;
}

export type FileType = 'RECEIPT' | 'INVOICES' | 'XLSX' | 'CSV' | 'PDF';

/**
 * Map browser MIME type to backend FileType enum
 */
const getFileTypeFromMimeType = (mimeType: string, fileName: string): FileType => {
  // Check by MIME type first
  if (mimeType.includes('pdf') || fileName.toLowerCase().endsWith('.pdf')) {
    return 'PDF';
  }
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel') || 
      fileName.toLowerCase().endsWith('.xlsx') || fileName.toLowerCase().endsWith('.xls')) {
    return 'XLSX';
  }
  if (mimeType.includes('csv') || fileName.toLowerCase().endsWith('.csv')) {
    return 'CSV';
  }
  
  // For images and other files, default to PDF (most common for receipts/invoices)
  // You can adjust this logic based on your use case
  if (mimeType.includes('image')) {
    return 'RECEIPT';
  }
  
  // Default to PDF for unknown types
  return 'PDF';
};

export const fileService = {
  /**
   * Create a file record and get S3 upload URL
   */
  createFile: async (name: string, type: FileType): Promise<FileUploadResponse> => {
    try {
      const response = await api.post('/api/v1/files/create', {
        name,
        type,
      });
      return response.data.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Upload file to S3 using presigned URL
   */
  uploadToS3: async (url: string, file: File, contentType?: string): Promise<void> => {
    try {
      await fetch(url, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': contentType || file.type,
        },
      });
    } catch (error) {
      throw error;
    }
  },

  /**
   * Complete file upload flow: create record and upload to S3
   */
  uploadFile: async (file: File): Promise<string> => {
    try {
      // Step 1: Map MIME type to backend FileType enum
      const fileType = getFileTypeFromMimeType(file.type, file.name);
      
      // Step 2: Sanitize filename and create file record
      // Replace spaces and special chars to avoid S3 signature issues with encoded keys
      const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const fileData = await fileService.createFile(sanitizedName, fileType);
      
      // Step 3: Upload file to S3
      await fileService.uploadToS3(fileData.upload_url, file, fileData.content_type);
      
      // Step 4: Return file ID
      return fileData.id;
    } catch (error) {
      console.error('Error uploading file:', error);
      throw error;
    }
  },

  /**
   * Download a file by ID
   */
  downloadFile: async (fileId: string): Promise<void> => {
    try {
      window.open(`/api/v1/files/download?id=${fileId}`, '_blank');
    } catch (error) {
      throw error;
    }
  },
};
