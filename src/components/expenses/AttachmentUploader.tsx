import { useRef, useState } from "react";
import { Button } from "../ui/button";

type UploadingFile = {
  file: File;
  progress: number;
  fileId?: string;
  error?: string;
};

type AttachmentUploaderProps = {
  value: string[];
  onChange: (fileIds: string[]) => void;

  generateUploadUrl: (file: File) => Promise<{
    uploadUrl: string;
    fileId: string;
  }>;

  multiple?: boolean;
  disabled?: boolean;
};

export function AttachmentUploader({
  value,
  onChange,
  generateUploadUrl,
  multiple = true,
  disabled,
}: AttachmentUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState<UploadingFile[]>([]);

  const handleSelectFiles = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    for (const file of files) {
      await uploadFile(file);
    }

    e.target.value = ""; // reset input
  };

  const uploadFile = async (file: File) => {
    const temp: UploadingFile = { file, progress: 0 };
    setUploading((p) => [...p, temp]);

    try {
      const { uploadUrl, fileId } = await generateUploadUrl(file);

      await fetch(uploadUrl, {
        method: "PUT",
        body: file,
      });

      onChange([...value, fileId]);
    } catch (err) {
      temp.error = "Upload failed";
    } finally {
      setUploading((p) => p.filter((f) => f.file !== file));
    }
  };

  return (
    <div className="space-y-2">
      <Button
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
      >
        Add attachment
      </Button>

      <input
        ref={inputRef}
        type="file"
        hidden
        multiple={multiple}
        onChange={handleSelectFiles}
      />
    </div>
  );
}
