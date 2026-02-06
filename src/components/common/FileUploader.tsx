import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Upload, X, FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { fileService } from "@/services/fileService";

interface FileUploaderProps {
  value?: string[];
  onChange: (fileIds: string[]) => void;
  accept?: string;
  maxSizeMB?: number;
}

interface UploadedFile {
  id: string;
  name: string;
  file?: File;
}

export function FileUploader({ 
  value = [], 
  onChange, 
  accept = ".pdf,.jpg,.jpeg,.png",
  maxSizeMB = 10 
}: FileUploaderProps) {
  const [uploading, setUploading] = useState(false);
  // We maintain a local state of file details for display, 
  // but if we only receive IDs in 'value', we might not have names.
  // For new uploads we have names. For existing IDs (edit mode), we might not.
  // For this verify specific task (create flow), we mainly care about new uploads.
  // If 'value' has IDs not in our local 'uploadedFiles', we treat them as "Existing File".
  const [localFiles, setLocalFiles] = useState<UploadedFile[]>([]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setUploading(true);
    try {
      const newFileIds: string[] = [];
      const newLocalFiles: UploadedFile[] = [];

      for (const file of files) {
        // Validate type (basic check based on accept prop if simple)
        // For now, relying on backend and simple frontend checks
        
        // Validate size
        if (file.size > maxSizeMB * 1024 * 1024) {
          toast.error(`${file.name}: File size must be less than ${maxSizeMB}MB`);
          continue;
        }

        const fileId = await fileService.uploadFile(file);
        newFileIds.push(fileId);
        newLocalFiles.push({
          id: fileId,
          name: file.name,
          file: file
        });
        
        toast.success(`${file.name} uploaded successfully`);
      }

      setLocalFiles(prev => [...prev, ...newLocalFiles]);
      onChange([...value, ...newFileIds]);

    } catch (error: any) {
      toast.error(error.message || "Failed to upload file");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleRemoveFile = (fileId: string) => {
    setLocalFiles(prev => prev.filter(f => f.id !== fileId));
    onChange(value.filter(id => id !== fileId));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length === 0) return;

    // Reuse handleFileSelect logic by creating a synthetic event
    // or just refactor logic. Let's duplicate slightly for safety/speed 
    // or better, extract logic.
    
    setUploading(true);
    try {
      const newFileIds: string[] = [];
      const newLocalFiles: UploadedFile[] = [];

      for (const file of files) {
        if (file.size > maxSizeMB * 1024 * 1024) {
          toast.error(`${file.name}: File size must be less than ${maxSizeMB}MB`);
          continue;
        }

        const fileId = await fileService.uploadFile(file);
        newFileIds.push(fileId);
        newLocalFiles.push({ id: fileId, name: file.name, file });
        toast.success(`${file.name} uploaded successfully`);
      }

      setLocalFiles(prev => [...prev, ...newLocalFiles]);
      onChange([...value, ...newFileIds]);

    } catch (error: any) {
        toast.error(error.message || "Failed to upload file");
    } finally {
        setUploading(false);
    }
  };

  return (
    <div className="space-y-3">
      <div
        className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-primary/50 transition-colors cursor-pointer bg-gray-50/50"
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={() => document.getElementById('file-upload-component')?.click()}
      >
        <input
          id="file-upload-component"
          type="file"
          multiple
          accept={accept}
          onChange={handleFileSelect}
          className="hidden"
        />
        <div className="flex flex-col items-center gap-2">
          {uploading ? (
             <Loader2 className="h-8 w-8 text-primary animate-spin" />
          ) : (
             <Upload className="h-8 w-8 text-gray-400" />
          )}
          <p className="text-sm text-gray-600">
            {uploading ? "Uploading..." : "Click or drag files to upload"}
          </p>
          <p className="text-xs text-gray-500">
            PDF, JPG, PNG (max {maxSizeMB}MB)
          </p>
        </div>
      </div>

      {/* File List */}
      {value.length > 0 && (
        <div className="space-y-2">
            {value.map(id => {
                const file = localFiles.find(f => f.id === id);
                return (
                    <div key={id} className="flex items-center justify-between p-2 bg-white rounded border shadow-sm">
                        <div className="flex items-center gap-2 overflow-hidden">
                            <FileText className="h-4 w-4 text-blue-600 flex-shrink-0" />
                            <span className="text-sm truncate max-w-[200px]">
                                {file ? file.name : id}
                            </span>
                        </div>
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                                e.stopPropagation();
                                handleRemoveFile(id);
                            }}
                            className="h-6 w-6 p-0 text-gray-500 hover:text-red-500"
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                );
            })}
        </div>
      )}
    </div>
  );
}
