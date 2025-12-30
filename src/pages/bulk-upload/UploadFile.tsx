import { Button } from "@/components/ui/button";
import { bulkImportService } from "@/services/bulkImportService";
import {
  ArrowRight,
  Check,
  CircleCheck,
  FileSpreadsheet,
  FileText,
  Loader2,
  Upload,
} from "lucide-react";
import { useState } from "react";
import { useParams } from "react-router-dom";
import { toast } from "sonner";

const STEPS_DATA = [
  {
    title: "Preview Data",
    description:
      "View your uploaded data in a clean table format before processing",
    icon: FileSpreadsheet,
  },
  {
    title: "Smart Mapping",
    description:
      "Auto-map columns with intelligent suggestions based on column names",
    icon: ArrowRight,
  },
  {
    title: "Error Review",
    description:
      "Review and fix validation errors inline before final processing",
    icon: CircleCheck,
  },
];

function UploadFile() {
  const { type } = useParams();

  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  console.log(uploadedFile);

  const handleFileUpload = async (file: File) => {
    if (type) {
      try {
        setIsProcessing(true);
        setUploadedFile(file);
        const res = await bulkImportService.bulkImport({
          file,
          template_key: type,
        });
        console.log(res);
      } catch (error) {
        toast.error("Error uploading file");
        console.error("Error uploading invoice:", error);
      } finally {
        setIsProcessing(false);
      }
    } else {
      toast.error("Cannot find template type");
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileUpload(files[0]);
    }
  };

  const handleRemove = () => {
    setUploadedFile(null);
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold capitalize">{`Bulk Upload ${type}`}</h1>
      </div>
      <div className="space-y-6">
        <div className="p-8 border rounded-md h-[40vh]">
          {uploadedFile ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <Check className="h-12 w-12 mx-auto mb-4 text-primary" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  File Uploaded{" "}
                </h3>
                <p className="text-gray-600 mb-4">{uploadedFile.name}</p>
                <Button onClick={handleRemove}>Upload Another</Button>
              </div>
            </div>
          ) : isProcessing ? (
            <div className="h-full flex items-center justify-center">
              {isProcessing && (
                <div className="text-center">
                  <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-primary" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Processing file...
                  </h3>
                  <p className="text-gray-600">
                    Please wait while we process your file
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div
              className="p-12 text-center hover:border-primary/50 transition-colors cursor-pointer"
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onClick={() => {
                const input = document.createElement("input");
                input.type = "file";
                input.accept = ".csv,.xlsx";
                input.onchange = (e) => {
                  const file = (e.target as HTMLInputElement).files?.[0];
                  if (file) {
                    handleFileUpload(file);
                  }
                };
                input.click();
              }}
            >
              <div className="flex flex-col items-center space-y-4">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                  <Upload className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <p className="text-xl font-semibold text-gray-900 mb-2">
                    Upload a file
                  </p>
                  <p className="text-gray-600 mb-4">
                    Drag and drop or click to upload
                  </p>
                  <Button className="bg-primary hover:bg-primary/90 mb-4">
                    <FileText className="h-4 w-4 mr-2" />
                    Browse file
                  </Button>
                  <p className="text-gray-600 text-sm">
                    Supported Formats: CSV, XLSX
                  </p>
                  <p className="text-gray-600 text-sm">
                    Maximum file size: 10MB
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {STEPS_DATA.map((step) => {
            return (
              <div key={step.title} className="space-y-4 p-6 border rounded-md">
                <div className="w-12 h-12 rounded-md bg-primary/10 flex items-center justify-center mb-4">
                  <step.icon className="flex items-center justify-between mx-auto text-primary" />
                </div>
                <h2>{step.title}</h2>
                <p>{step.description}</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default UploadFile;
