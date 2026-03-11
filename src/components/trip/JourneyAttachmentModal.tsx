import { useRef, useState } from "react";
import { Upload, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { tripService } from "@/services/tripService";
import axios from "axios";
import { cn } from "@/lib/utils";

export interface Attachment {
  fileId: string;
  url: string;
  name?: string;
}

interface JourneyAttachmentModalProps {
  uploadDialogOpen: boolean;
  viewDialogOpen: boolean;
  selectedJourneyId: string | null;
  tripId: string | null;
  attachments: Attachment[];
  onUploadDialogChange: (open: boolean) => void;
  onViewDialogChange: (open: boolean) => void;
  onAttachmentsChange: (attachments: Attachment[]) => void;
  onDeleteAttachment: (fileId: string) => void;
}

type DocumentType = "FLIGHT_TICKET" | "HOTEL_VOUCHER" | "CAB_INVOICE" | "BOARDING_PASS" | "OTHER";

const DOCUMENT_TYPES: { value: DocumentType; label: string }[] = [
  { value: "FLIGHT_TICKET", label: "Flight Ticket" },
  { value: "HOTEL_VOUCHER", label: "Hotel Voucher" },
  { value: "CAB_INVOICE", label: "Cab Invoice" },
  { value: "BOARDING_PASS", label: "Boarding Pass" },
  { value: "OTHER", label: "Other" },
];

export function JourneyAttachmentModal({
  uploadDialogOpen,
  viewDialogOpen,
  selectedJourneyId,
  tripId,
  attachments,
  onUploadDialogChange,
  onViewDialogChange,
  onAttachmentsChange,
  onDeleteAttachment,
}: JourneyAttachmentModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [documentType, setDocumentType] = useState<DocumentType>("FLIGHT_TICKET");

  const createFileMetadata = async (file: File): Promise<{
    uploadUrl: string;
    downloadUrl: string;
    fileId: string;
  }> => {
    const res = await tripService.createFileMetadata(file.name);
    return {
      uploadUrl: res.data.data.upload_url,
      downloadUrl: res.data.data.download_url,
      fileId: res.data.data.id,
    };
  };

  const uploadFileToS3 = async (uploadUrl: string, file: File): Promise<void> => {
    const fileBlob = await file.arrayBuffer();
    await axios.put(uploadUrl, fileBlob, {
      headers: {
        "Content-Type": file.type,
      },
    });
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length || !selectedJourneyId || !tripId) return;

    setUploading(true);
    const uploadedAttachments: Attachment[] = [];
    const uploadedFileIds: string[] = [];

    try {
      // Step 1: Create file metadata and upload to S3
      for (const file of files) {
        try {
          const { uploadUrl, fileId, downloadUrl } = await createFileMetadata(file);
          
          // Step 2: Upload file to S3
          await uploadFileToS3(uploadUrl, file);

          uploadedAttachments.push({ fileId, url: downloadUrl, name: file.name });
          uploadedFileIds.push(fileId);
        } catch (error) {
          console.error("Error uploading file:", error);
          toast.error(`Failed to upload ${file.name}`);
        }
      }

      // Step 3: Attach documents to trip segment
      if (uploadedFileIds.length > 0) {
        try {
          await tripService.attachDocument({
            trip_id: tripId,
            trip_segment_id: selectedJourneyId,
            document_type: documentType,
            file_ids: uploadedFileIds,
            additional_info: null,
          });

          onAttachmentsChange([...attachments, ...uploadedAttachments]);
          toast.success("Attachments uploaded successfully");
          onUploadDialogChange(false);
          if (fileInputRef.current) {
            fileInputRef.current.value = "";
          }
        } catch (error) {
          console.error("Error attaching documents:", error);
          toast.error("Files uploaded but failed to attach to trip segment");
        }
      }
    } catch (error) {
      console.error("Error uploading attachments:", error);
      toast.error("Failed to upload attachments");
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteClick = (fileId: string) => {
    onDeleteAttachment(fileId);
    toast.success("Attachment deleted");
  };

  return (
    <>
      {/* Upload Attachment Dialog */}
      <Dialog open={uploadDialogOpen} onOpenChange={onUploadDialogChange}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="pb-1">
            <DialogTitle className="text-2xl font-semibold">Upload Ticket/Attachment</DialogTitle>
            <DialogDescription className="text-base">
              Upload tickets or attachments for this journey segment.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 pt-1">
            {/* Document Type Selector */}
            <div className="space-y-3">
              <Label className="text-sm font-semibold text-gray-700">Document Type</Label>
              <div className="flex gap-2 flex-wrap">
                {DOCUMENT_TYPES.map((type) => (
                  <Button
                    key={type.value}
                    type="button"
                    variant={documentType === type.value ? "default" : "outline"}
                    size="sm"
                    onClick={() => setDocumentType(type.value)}
                    className={cn(
                      "rounded-full",
                      documentType === type.value
                        ? "bg-[#161B53] text-white hover:bg-[#161B53]"
                        : "bg-white text-gray-700 hover:bg-gray-50 border border-gray-300"
                    )}
                  >
                    {type.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Upload Area */}
            <div className="space-y-3">
              <Label className="text-sm font-semibold text-gray-700">Upload Files</Label>
              <div
                className={cn(
                  "border-2 border-dashed rounded-xl p-12 text-center transition-all relative",
                  uploading
                    ? "border-[#0D9C99] bg-[#0D9C99]/5 cursor-wait"
                    : "border-gray-300 hover:border-[#0D9C99] hover:bg-[#0D9C99]/5 cursor-pointer group"
                )}
                onClick={() => !uploading && fileInputRef.current?.click()}
              >
                {uploading ? (
                  <div className="flex flex-col items-center justify-center space-y-4">
                    <div className="w-16 h-16 rounded-full bg-[#0D9C99]/10 flex items-center justify-center">
                      <div className="w-8 h-8 border-4 border-[#0D9C99] border-t-transparent rounded-full animate-spin"></div>
                    </div>
                    <div className="space-y-2">
                      <p className="text-base font-semibold text-gray-900">
                        Uploading files...
                      </p>
                      <p className="text-sm text-gray-500">
                        Please wait while we upload your files
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center space-y-4">
                    <div className="w-16 h-16 rounded-full bg-[#0D9C99]/10 flex items-center justify-center group-hover:bg-[#0D9C99]/20 transition-colors">
                      <Upload className="h-8 w-8 text-[#0D9C99] group-hover:scale-110 transition-transform" />
                    </div>
                    <div className="space-y-2">
                      <p className="text-base font-semibold text-gray-900">
                        Click to upload or drag and drop
                      </p>
                      <p className="text-sm text-gray-500">
                        PDF, JPG, PNG (Max 10MB per file)
                      </p>
                    </div>
                  </div>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,image/*"
                multiple
                onChange={handleFileSelect}
                className="hidden"
                disabled={uploading}
              />
            </div>
          </div>

          <DialogFooter className="gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => {
                onUploadDialogChange(false);
                setDocumentType("FLIGHT_TICKET");
                if (fileInputRef.current) {
                  fileInputRef.current.value = "";
                }
              }}
              className="px-6"
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Attachments Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={onViewDialogChange}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>View Attachments</DialogTitle>
            <DialogDescription>
              View and manage attachments for this journey segment.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
            {attachments.length > 0 ? (
              <div className="space-y-3">
                {attachments.map((attachment, index) => (
                  <div
                    key={attachment.fileId}
                    className="flex items-center justify-between p-3 border border-gray-200 rounded-lg"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="flex-shrink-0 w-10 h-10 bg-gray-100 rounded flex items-center justify-center">
                        <FileText className="h-5 w-5 text-gray-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {attachment.name || `Attachment ${index + 1}`}
                        </p>
                        <p className="text-xs text-gray-500">File ID: {attachment.fileId}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(attachment.url, "_blank")}
                        className="h-8 px-3 text-xs"
                      >
                        Open
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteClick(attachment.fileId)}
                        className="h-8 px-3 text-xs text-red-600 hover:text-red-700"
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <FileText className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                <p className="text-sm">No attachments uploaded yet</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => onViewDialogChange(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
