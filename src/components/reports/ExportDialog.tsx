import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

interface ExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onExport: (includeReceipts: boolean) => Promise<void>;
  selectedCount: number;
}

export function ExportDialog({
  open,
  onOpenChange,
  onExport,
  selectedCount,
}: ExportDialogProps) {
  const [includeReceipts, setIncludeReceipts] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      await onExport(includeReceipts);
      onOpenChange(false);
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-4">
        <DialogHeader className="pb-3">
          <DialogTitle className="text-base font-semibold text-gray-900">Export Reports</DialogTitle>
          <DialogDescription className="text-sm text-gray-600 mt-1.5">
            Export {selectedCount} {selectedCount === 1 ? 'report' : 'reports'} as PDF. The export will be processed and sent to your email once ready.
          </DialogDescription>
        </DialogHeader>
        <div className="py-2 space-y-3">
          <div className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
            <Checkbox
              id="include-receipts"
              checked={includeReceipts}
              onCheckedChange={(checked) => setIncludeReceipts(checked === true)}
              className="mt-0.5"
            />
            <div className="flex-1">
              <Label
                htmlFor="include-receipts"
                className="text-sm font-medium text-gray-900 cursor-pointer block mb-1"
              >
                Include receipts
              </Label>
              <p className="text-xs text-gray-500 leading-relaxed">
                Attach receipt images to the exported PDF for each expense in the report.
              </p>
            </div>
          </div>
        </div>
        <div className="flex justify-end space-x-2 pt-3 border-t border-gray-100">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isExporting}
            className="h-9 px-4 text-sm"
          >
            Cancel
          </Button>
          <Button
            onClick={handleExport}
            disabled={isExporting}
            className="bg-blue-600 hover:bg-blue-700 text-white h-9 px-4 text-sm font-medium rounded-md"
          >
            {isExporting ? (
              <>
                <span className="mr-2">Exporting...</span>
              </>
            ) : (
              'Export'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

