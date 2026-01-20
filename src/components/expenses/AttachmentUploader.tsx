import React, { useRef } from "react";
import { Button } from "../ui/button";
import { Paperclip } from "lucide-react";
import { toast } from "sonner";
import { Attachment } from "./ExpenseDetailsStep2";

type AttachmentUploaderProps = {
    onChange: React.Dispatch<
        React.SetStateAction<Attachment[]>
    >;
    setFileIds: React.Dispatch<
        React.SetStateAction<string[]>>;
    generateUploadUrl: (file: File) => Promise<{
        downloadUrl: string
        uploadUrl: string;
        fileId: string;
    }>;
    multiple?: boolean;
    disabled?: boolean;
};

export function AttachmentUploader({
    onChange,
    setFileIds,
    generateUploadUrl,
    multiple = true,
    disabled,
}: AttachmentUploaderProps) {
    const inputRef = useRef<HTMLInputElement>(null);

    const handleSelectFiles = async (
        e: React.ChangeEvent<HTMLInputElement>
    ) => {
        const files = Array.from(e.target.files || []);
        if (!files.length) return;
        const uploadedFileIds: string[] = [];
        const uploadedAttachments: Attachment[] = [];

        for (let i = 0; i < files.length; i++) {
            const file = files[i];

            try {
                const { uploadUrl, fileId, downloadUrl } = await generateUploadUrl(file);
                await fetch(uploadUrl, {
                    method: "PUT",
                    body: file,
                    headers: {
                        "Content-Type": file.type,
                    },
                });

                uploadedAttachments.push({ fileId, url: downloadUrl });
                uploadedFileIds.push(fileId);
            } catch (error) {
                console.error(error);
            }
        }
        onChange((prev) => [...prev, ...uploadedAttachments]);
        setFileIds((prev) => [...prev, ...uploadedFileIds]);
        toast.success('Successfully uploaded attachments');
        e.target.value = "";
    };


    return (
        <div className="space-y-2">
            <Button
                type="button"
                disabled={disabled}
                variant="outline"
                onClick={() => inputRef.current?.click()}
            >
                <Paperclip className="mr-2 h-4 w-4" />
                Add Attachment
            </Button>

            <input
                ref={inputRef}
                accept = '.pdf,image/*'
                type="file"
                hidden
                multiple={multiple}
                onChange={handleSelectFiles}
            />
            {/* <UploadProgressDialog open={dialogOpen} files={uploadFiles} /> */}
        </div>
    );
}
