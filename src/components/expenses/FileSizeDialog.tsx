import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

type FileSizeDialogProps = {
  open: boolean;
  onClose: () => void;
};

export function FileSizeDialog({ open, onClose }: FileSizeDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>File too large</DialogTitle>
          <DialogDescription>
            File size cannot exceed <strong>3 MB</strong>.
            <br />
            Please select a smaller image or PDF.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button onClick={onClose}>Okay</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
