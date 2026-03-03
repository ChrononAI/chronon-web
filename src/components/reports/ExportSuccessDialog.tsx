import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { CheckCircle2 } from 'lucide-react';

interface ExportSuccessDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  email: string;
}

export function ExportSuccessDialog({
  open,
  onOpenChange,
  email,
}: ExportSuccessDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm p-3">
        <DialogHeader className="pb-1.5 pt-1">
          <div className="flex items-start gap-2.5">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 flex-shrink-0">
              <CheckCircle2 className="h-4 w-4 text-blue-600" strokeWidth={2.5} />
            </div>
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-sm font-semibold text-gray-900 leading-tight mb-1 pr-6">
                Your export is being processed
              </DialogTitle>
              <DialogDescription className="text-xs text-gray-600 leading-relaxed">
                <p className="mb-0.5">Your export request has been submitted successfully.</p>
                <p>
                  You'll get an email with the download link at <strong className="font-semibold text-gray-900">{email}</strong> once your export is ready.
                </p>
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <div className="flex justify-end pt-2">
          <Button
            onClick={() => onOpenChange(false)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-3 h-7 text-xs font-medium rounded-md"
          >
            Okay
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

