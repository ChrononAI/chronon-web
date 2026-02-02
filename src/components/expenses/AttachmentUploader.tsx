import React, { useRef } from "react";
import { Button } from "../ui/button";
import { Paperclip } from "lucide-react";
import { toast } from "sonner";
import { Attachment } from "./ExpenseDetailsStep2";
import { Tooltip, TooltipContent } from "../ui/tooltip";
import { TooltipTrigger } from "@radix-ui/react-tooltip";

type AttachmentUploaderProps = {
    onChange: React.Dispatch<
        React.SetStateAction<Attachment[]>
    >;
    fileIds: string[];
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
    fileIds,
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
        if ((files.length + fileIds.length) > 5) {
            toast.error("You can only add upto 5 attachments");
            return;
        }
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
        <div className="flex items-center">
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button
                        type="button"
                        disabled={disabled}
                        variant="ghost"
                        className="h-9 w-9 p-0"
                        onClick={() => inputRef.current?.click()}
                    >
                        <Paperclip className="h-4 w-4" />
                    </Button>
                </TooltipTrigger>
                <TooltipContent className="bg-white text-black border border-[0.5]">
                    <p>Add Attachment</p>
                </TooltipContent>
            </Tooltip>

            <input
                ref={inputRef}
                accept='.pdf,image/*'
                type="file"
                hidden
                multiple={multiple}
                onChange={handleSelectFiles}
            />
        </div>
    );
}
