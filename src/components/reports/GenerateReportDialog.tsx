import { useState } from 'react';
import { format as dateFormat } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { reportService } from '@/services/reportService';
import { toast } from 'sonner';

interface GenerateReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onReportGenerated: (jobId: number) => void;
  selectedTemplateId?: number | null;
}

type ReportStatus = 'idle' | 'generating' | 'error';

export function GenerateReportDialog({ open, onOpenChange, onReportGenerated, selectedTemplateId }: GenerateReportDialogProps) {
  const [reportName, setReportName] = useState('');
  const today = new Date();
  const lastMonth = new Date();
  lastMonth.setMonth(today.getMonth() - 1);
  const [fromDate, setFromDate] = useState<Date | undefined>(lastMonth);
  const [toDate, setToDate] = useState<Date | undefined>(today);
  const [reportFormat, setReportFormat] = useState<'excel' | 'csv'>('excel');
  const [status, setStatus] = useState<ReportStatus>('idle');
  const [fromDateOpen, setFromDateOpen] = useState(false);
  const [toDateOpen, setToDateOpen] = useState(false);

  const handleFromDateSelect = (date: Date | undefined) => {
    setFromDate(date);
    setFromDateOpen(false); // Close the popover
  };

  const handleToDateSelect = (date: Date | undefined) => {
    setToDate(date);
    setToDateOpen(false); // Close the popover
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!reportName || !fromDate || !toDate) {
      toast.error('Please fill in all fields');
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0); // Set to start of day for comparison
    
    const fromDateOnly = new Date(fromDate);
    fromDateOnly.setHours(0, 0, 0, 0);
    
    const toDateOnly = new Date(toDate);
    toDateOnly.setHours(0, 0, 0, 0);

    // Validate dates
    if (fromDateOnly > today) {
      toast.error('From date cannot be in the future');
      return;
    }

    if (toDateOnly > today) {
      toast.error('To date cannot be in the future');
      return;
    }

    if (fromDateOnly > toDateOnly) {
      toast.error('From date cannot be after to date');
      return;
    }

    if (!selectedTemplateId) {
      toast.error('Please select a template first');
      return;
    }

    try {
      setStatus('generating');
      
      // Format dates to YYYY-MM-DD
      const formattedFromDate = dateFormat(fromDate, 'yyyy-MM-dd');
      const formattedToDate = dateFormat(toDate, 'yyyy-MM-dd');
      
      // Generate report with template
      const response = await reportService.generateReportWithTemplate({
        report_template_id: selectedTemplateId,
        start_date: formattedFromDate,
        end_date: formattedToDate,
        report_name: reportName
      });
      if (response.success && response.data) {
        toast.success(response.message || 'Report generated successfully!');
        
        try {
          // Auto-download the file
          toast.info('Downloading report...');
          
          await reportService.downloadGeneratedReport(response.data.report_id);
          
          toast.success(`Report "${response.data.filename}" downloaded successfully! Check your Downloads folder.`);
        } catch (downloadError) {
          console.error('Auto-download failed:', downloadError);
          toast.error('Report generated but download failed. You can download it from the reports list below.');
        }
        
        // Close dialog and refresh reports list
        onReportGenerated(response.data.report_id);
        setTimeout(() => {
          onOpenChange(false);
        }, 300);
        resetForm();
      } else {
        setStatus('error');
        toast.error(response.message || 'Failed to generate report');
      }
    } catch (error) {
      console.error('Error generating report:', error);
      setStatus('error');
      toast.error('Failed to generate report');
    }
  };

  const resetForm = () => {
    setReportName('');
    const today = new Date();
    const lastMonth = new Date();
    lastMonth.setMonth(today.getMonth() - 1);
    setFromDate(lastMonth);
    setToDate(today);
    setStatus('idle');
  };

  const handleOpenChange = (open: boolean) => {
    if (!open && status === 'generating') {
      // Prevent closing while generating
      toast.info('Please wait while we generate your report');
      return;
    }
    
    if (!open) {
      resetForm();
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {status === 'generating' 
              ? 'Generating Report...' 
              : 'Generate Expense Report'}
          </DialogTitle>
          <DialogDescription>
            {status === 'generating' ? (
              'Starting report generation...'
            ) : (
              'Fill in the details below to generate a new expense report.'
            )}
          </DialogDescription>
        </DialogHeader>

        {status === 'generating' && (
          <div className="space-y-2">
            <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary transition-all duration-300 animate-pulse"
                style={{ width: '30%' }}
              />
            </div>
            <p className="text-sm text-center text-muted-foreground">
              Starting report generation...
            </p>
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="reportName">Report Name</Label>
            <Input
              id="reportName"
              placeholder="Enter report name"
              value={reportName}
              onChange={(e) => setReportName(e.target.value)}
              disabled={status === 'generating'}
            />
          </div>

          <div className="space-y-2">
            <Label>Report Format</Label>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <input
                  type="radio"
                  id="excel-format"
                  name="report-format"
                  value="excel"
                  checked={reportFormat === 'excel'}
                  onChange={() => setReportFormat('excel')}
                  className="h-4 w-4 text-primary focus:ring-primary border-gray-300"
                  disabled={status === 'generating'}
                />
                <Label htmlFor="excel-format" className="font-normal">
                  Excel (.xlsx)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="radio"
                  id="csv-format"
                  name="report-format"
                  value="csv"
                  checked={reportFormat === 'csv'}
                  onChange={() => setReportFormat('csv')}
                  className="h-4 w-4 text-primary focus:ring-primary border-gray-300"
                  disabled={status === 'generating'}
                />
                <Label htmlFor="csv-format" className="font-normal">
                  CSV (.csv)
                </Label>
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>From Date</Label>
              <Popover open={fromDateOpen} onOpenChange={setFromDateOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !fromDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {fromDate ? dateFormat(fromDate, 'PPP') : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={fromDate}
                    onSelect={handleFromDateSelect}
                    initialFocus
                    disabled={(date) => {
                      const today = new Date();
                      today.setHours(23, 59, 59, 999); // Set to end of today
                      const isAfterToday = date > today;
                      const isAfterToDate = toDate ? date > toDate : false;
                      return isAfterToday || isAfterToDate;
                    }}
                  />
                </PopoverContent>
              </Popover>
              <p className="text-xs text-muted-foreground">
                Cannot be in the future or after to date
              </p>
            </div>
            
            <div className="space-y-2">
              <Label>To Date</Label>
              <Popover open={toDateOpen} onOpenChange={setToDateOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !toDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {toDate ? dateFormat(toDate, 'PPP') : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={toDate}
                    onSelect={handleToDateSelect}
                    initialFocus
                    disabled={(date) => {
                      const today = new Date();
                      today.setHours(23, 59, 59, 999); // Set to end of today
                      const isAfterToday = date > today;
                      const isBeforeFromDate = fromDate ? date < fromDate : false;
                      return isAfterToday || isBeforeFromDate;
                    }}
                  />
                </PopoverContent>
              </Popover>
              <p className="text-xs text-muted-foreground">
                Cannot be in the future or before from date
              </p>
            </div>
          </div>
          
          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={status === 'generating'}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={status === 'generating'}
            >
              {status === 'generating' ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Starting...
                </>
              ) : (
                'Generate Report'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
