import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import {
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
} from "lucide-react";

type FileUploadStatus = "pending" | "uploading" | "uploaded" | "failed";

export type UploadFileItem = {
  id: string;
  name: string;
  status: FileUploadStatus;
};

type Props = {
  open: boolean;
  files: UploadFileItem[];
};

export function UploadProgressDialog({ open, files }: Props) {
  const total = files.length;
  const uploaded = files.filter((f) => f.status === "uploaded").length;

  const percentage =
    total > 0 ? Math.round((uploaded / total) * 100) : 0;

  const renderIcon = (status: FileUploadStatus) => {
    switch (status) {
      case "pending":
        return <Clock className="h-4 w-4 text-muted-foreground" />;
      case "uploading":
        return (
          <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
        );
      case "uploaded":
        return (
          <CheckCircle2 className="h-4 w-4 text-green-500" />
        );
      case "failed":
        return <XCircle className="h-4 w-4 text-red-500" />;
    }
  };

  return (
    <Dialog open={open}>
      <DialogContent
        className="sm:max-w-[420px]"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Uploading files</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="text-sm text-muted-foreground">
            {uploaded} of {total} files uploaded
          </div>

          <Progress value={percentage} />

          {/* File list */}
          <div className="max-h-48 overflow-y-auto space-y-2">
            {files.map((file) => (
              <div
                key={file.id}
                className="flex items-center gap-2 text-sm"
              >
                {renderIcon(file.status)}
                <span className="truncate">{file.name}</span>
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
