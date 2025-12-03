import React, { useState, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Settings, Upload, X, CheckCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";

interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  status: "uploading" | "success" | "error";
}

const UploadPolicyPage: React.FC = () => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const processingSteps = [
    "Reading policy document...",
    "Parsing content...",
    "Extracting rules...",
    "Creating query builder...",
    "Almost done...",
  ];

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    const files = Array.from(e.dataTransfer.files);
    handleFiles(files);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    handleFiles(files);
  };

  const handleFiles = (files: File[]) => {
    const validFiles = files.filter((file) => {
      const validTypes = [
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "text/plain",
      ];
      if (!validTypes.includes(file.type)) {
        toast.error(
          `${file.name} is not a supported file type. Please upload PDF, DOC, DOCX, or TXT files.`
        );
        return false;
      }
      if (file.size > 10 * 1024 * 1024) {
        // 10MB limit
        toast.error(
          `${file.name} is too large. Please upload files smaller than 10MB.`
        );
        return false;
      }
      return true;
    });

    if (validFiles.length === 0) return;

    const newFiles: UploadedFile[] = validFiles.map((file) => ({
      id: Math.random().toString(36).substr(2, 9),
      name: file.name,
      size: file.size,
      type: file.type,
      status: "uploading" as const,
    }));

    setUploadedFiles((prev) => [...prev, ...newFiles]);
    simulateUpload(newFiles);
  };

  const simulateUpload = (files: UploadedFile[]) => {
    setIsUploading(true);

    files.forEach((file, index) => {
      setTimeout(() => {
        setUploadedFiles((prev) =>
          prev.map((f) =>
            f.id === file.id ? { ...f, status: "success" as const } : f
          )
        );

        if (index === files.length - 1) {
          setIsUploading(false);
          toast.success("Policy documents uploaded successfully!");
        }
      }, 1000 + index * 500); // Stagger uploads
    });
  };

  const removeFile = (fileId: string) => {
    setUploadedFiles((prev) => prev.filter((f) => f.id !== fileId));
    toast.info("File removed");
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const getFileIcon = (type: string) => {
    if (type.includes("pdf")) return "📄";
    if (type.includes("word") || type.includes("document")) return "📝";
    return "📄";
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "success":
        return "bg-green-100 text-green-800  ";
      case "error":
        return "bg-red-100 text-red-800  ";
      default:
        return "bg-green-100 text-green-800  ";
    }
  };

  const handleProcessPolicy = () => {
    setIsProcessing(true);
    setProcessingStep(0);

    // Simulate processing steps
    const interval = setInterval(() => {
      setProcessingStep((prev) => {
        if (prev < processingSteps.length - 1) {
          return prev + 1;
        } else {
          clearInterval(interval);
          // Navigate to query builder after 5 seconds
          setTimeout(() => {
            navigate("/policy/builder");
          }, 1000);
          return prev;
        }
      });
    }, 1000); // Change step every second
  };

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent rounded-lg p-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Settings className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Upload Policy</h1>
            <p className="text-muted-foreground">
              Upload your organization's expense policy documents
            </p>
          </div>
        </div>
      </div>

      {/* Processing Spinner Overlay */}
      {isProcessing && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="text-center space-y-6 p-8">
            <div className="mx-auto w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center">
              <Loader2 className="h-10 w-10 text-primary animate-spin" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-semibold">
                Processing Policy Document
              </h3>
              <p className="text-muted-foreground">
                {processingSteps[processingStep]}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Upload Area */}
      <Card className="border-2 border-dashed border-muted-foreground/25 hover:border-primary/50 transition-colors">
        <CardContent className="p-8">
          <div
            className={cn(
              "text-center space-y-6",
              isDragOver && "bg-primary/5 rounded-lg p-4"
            )}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <div className="space-y-4">
              <div className="mx-auto w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center">
                <Upload className="h-10 w-10 text-primary" />
              </div>

              <div className="space-y-2">
                <h3 className="text-2xl font-semibold">
                  Upload your policy document
                </h3>
                <p className="text-muted-foreground max-w-md mx-auto">
                  Drag and drop your policy files here, or click the button
                  below to browse
                </p>
              </div>

              <div className="space-y-2">
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  size="lg"
                  className="px-8"
                  disabled={isUploading}
                >
                  <Upload className="mr-2 h-4 w-4" />
                  Choose Files
                </Button>

                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".pdf,.doc,.docx,.txt"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>

              <div className="text-sm text-muted-foreground space-y-1">
                <p>Supported formats: PDF, DOC, DOCX, TXT</p>
                <p>Maximum file size: 10MB per file</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Uploaded Files */}
      {uploadedFiles.length > 0 && (
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-4">Uploaded Files</h3>
            <div className="space-y-3">
              {uploadedFiles.map((file) => (
                <div
                  key={file.id}
                  className="flex items-center justify-between p-4 bg-muted/30 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="text-2xl">{getFileIcon(file.type)}</div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{file.name}</span>
                        <Badge
                          variant="secondary"
                          className={cn("text-xs", getStatusColor(file.status))}
                        >
                          {file.status === "uploading" && "Uploading..."}
                          {file.status === "success" && (
                            <span className="flex items-center gap-1">
                              <CheckCircle className="h-3 w-3" />
                              Uploaded
                            </span>
                          )}
                          {file.status === "error" && "Error"}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {formatFileSize(file.size)}
                      </p>
                    </div>
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeFile(file.id)}
                    disabled={file.status === "uploading"}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      {uploadedFiles.length > 0 && (
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => {
              setUploadedFiles([]);
              toast.info("All files cleared");
            }}
          >
            Clear All
          </Button>
          <Button
            onClick={handleProcessPolicy}
            disabled={
              isUploading || uploadedFiles.some((f) => f.status === "uploading")
            }
          >
            Process Policy
          </Button>
        </div>
      )}
    </div>
  );
};

export default UploadPolicyPage;
