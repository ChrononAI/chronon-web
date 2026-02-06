import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { travelService } from "@/services/travelService";
import { fileService } from "@/services/fileService";
import { toast } from "sonner";
import { Upload, X, FileText, Loader2 } from "lucide-react";

interface AdminUpdateModalProps {
  open: boolean;
  onClose: () => void;
  travelId: string;
  currentData?: {
    admin_amount?: number;
    admin_notes?: string;
    file_ids?: string[];
  };
  onSuccess?: () => void;
}

interface UploadedFile {
  id: string;
  name: string;
  file: File;
}

export function AdminUpdateModal({
  open,
  onClose,
  travelId,
  currentData,
  onSuccess,
}: AdminUpdateModalProps) {
  const [adminAmount, setAdminAmount] = useState<string>(
    currentData?.admin_amount?.toString() || ""
  );
  const [adminNotes, setAdminNotes] = useState<string>(
    currentData?.admin_notes || ""
  );
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setUploading(true);
    try {
      for (const file of files) {
        // Validate file type
        if (!file.type.match(/^(application\/pdf|image\/(jpeg|jpg|png))$/)) {
          toast.error(`${file.name}: Only PDF, JPG, and PNG files are supported`);
          continue;
        }

        // Validate file size (10MB limit)
        if (file.size > 10 * 1024 * 1024) {
          toast.error(`${file.name}: File size must be less than 10MB`);
          continue;
        }

        // Upload file and get ID
        const fileId = await fileService.uploadFile(file);
        
        setUploadedFiles(prev => [...prev, {
          id: fileId,
          name: file.name,
          file: file,
        }]);
        
        toast.success(`${file.name} uploaded successfully`);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to upload file");
    } finally {
      setUploading(false);
      // Reset input
      e.target.value = "";
    }
  };

  const handleRemoveFile = (fileId: string) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== fileId));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const data: any = {};
      
      if (adminAmount) {
        data.admin_amount = parseFloat(adminAmount);
      }
      
      if (adminNotes) {
        data.admin_notes = adminNotes;
      }
      
      // Combine existing file IDs with newly uploaded ones
      const existingFileIds = currentData?.file_ids || [];
      const newFileIds = uploadedFiles.map(f => f.id);
      const allFileIds = [...existingFileIds, ...newFileIds];
      
      if (allFileIds.length > 0) {
        data.file_ids = allFileIds;
      }

      await travelService.adminUpdate(travelId, data);
      toast.success("Travel request updated successfully");
      onSuccess?.();
      onClose();
      
      // Reset form
      setUploadedFiles([]);
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to update travel request");
    } finally {
      setLoading(false);
    }
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

    // Create a fake input event to reuse the upload logic
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    
    // Create a DataTransfer object to set files
    const dataTransfer = new DataTransfer();
    files.forEach(file => dataTransfer.items.add(file));
    input.files = dataTransfer.files;
    
    // Trigger the change event
    const event = new Event('change', { bubbles: true });
    Object.defineProperty(event, 'target', { value: input, enumerable: true });
    handleFileSelect(event as any);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Admin Update Travel Request</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="admin_amount">Amount And Attachments</Label>
            <Input
              id="admin_amount"
              type="number"
              step="0.01"
              placeholder="Enter approved amount"
              value={adminAmount}
              onChange={(e) => setAdminAmount(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="admin_notes">Admin Notes</Label>
            <Textarea
              id="admin_notes"
              placeholder="Enter admin notes or comments"
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              rows={4}
            />
          </div>

          <div className="space-y-2">
            <Label>Attach Files</Label>
            
            {/* File Upload Area */}
            <div
              className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-primary/50 transition-colors cursor-pointer"
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onClick={() => document.getElementById('file-upload')?.click()}
            >
              <input
                id="file-upload"
                type="file"
                multiple
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={handleFileSelect}
                className="hidden"
              />
              <div className="flex flex-col items-center gap-2">
                <Upload className="h-8 w-8 text-gray-400" />
                <p className="text-sm text-gray-600">
                  {uploading ? "Uploading..." : "Click or drag files to upload"}
                </p>
                <p className="text-xs text-gray-500">
                  PDF, JPG, PNG (max 10MB)
                </p>
              </div>
            </div>

            {/* Uploaded Files List */}
            {uploadedFiles.length > 0 && (
              <div className="space-y-2 mt-3">
                <p className="text-sm font-medium">Uploaded Files:</p>
                {uploadedFiles.map((file) => (
                  <div
                    key={file.id}
                    className="flex items-center justify-between p-2 bg-gray-50 rounded border"
                  >
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-blue-600" />
                      <span className="text-sm">{file.name}</span>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveFile(file.id)}
                      className="h-6 w-6 p-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {/* Existing Files (if any) */}
            {currentData?.file_ids && currentData.file_ids.length > 0 && (
              <div className="mt-3">
                <p className="text-sm font-medium text-gray-600">Existing Files:</p>
                <p className="text-xs text-gray-500 mt-1">
                  {currentData.file_ids.join(", ")}
                </p>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading || uploading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading || uploading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                "Update"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
