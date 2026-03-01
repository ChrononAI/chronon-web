import React, { useState } from 'react';
import { Upload, X, CheckCircle, FileText, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { fileParseService, ParsedInvoiceData } from '@/services/fileParseService';
import { useExpenseStore } from '@/store/expenseStore';
import { FileSizeDialog } from './FileSizeDialog';

const MAX_FILE_SIZE_MB = 3;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

interface UploadReceiptStepProps {
  onNext: (data: {
    uploadedFile: File;
    parsedData: ParsedInvoiceData | null;
    previewUrl: string;
  }) => void;
  onBack: () => void;
  onDuplicateDetected?: (data: { parsedData: ParsedInvoiceData; uploadedFile: File; previewUrl: string }) => void;
  type?: "upload" | "reupload";
  setParsedDataO?: any;
}

export function UploadReceiptStep({ onNext, onDuplicateDetected }: UploadReceiptStepProps) {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  // const [parsedData, setParsedData] = useState<ParsedInvoiceData | null>(null);
  const { parsedData, setParsedData } = useExpenseStore();
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [showPotentialDuplicateAlert, setShowPotentialDuplicateAlert] = useState(false);
  const [duplicateIds, setDuplicateIds] = useState<number[]>([]);
  const [showSizeDialog, setShowSizeDialog] = useState(false);

  const handleFileUpload = async (file: File) => {
    if (file.size > MAX_FILE_SIZE_BYTES) {
      setShowSizeDialog(true);
      return;
    }
    try {
      setIsProcessing(true);
      setUploadedFile(file);
      setPreviewUrl(URL.createObjectURL(file));

      const parsedData = await fileParseService.parseInvoiceFile(file);
      setParsedData(parsedData);

      if (parsedData?.is_duplicate_receipt === true) {
        if (onDuplicateDetected) {
          onDuplicateDetected({
            parsedData,
            uploadedFile: file,
            previewUrl: URL.createObjectURL(file)
          });
        }
        return;
      }

      if (parsedData?.original_expense_id && !parsedData?.is_duplicate_receipt) {
        setDuplicateIds([parseInt(parsedData.original_expense_id)]);
        setShowPotentialDuplicateAlert(true);
      } else {
        setShowPotentialDuplicateAlert(false);
        setDuplicateIds([]);
      }
      onNext({
        uploadedFile: file,
        parsedData,
        previewUrl: URL.createObjectURL(file),
      });
    } catch (error) {
      console.error('Error uploading invoice:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileUpload(files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const removeUploadedFile = () => {
    setUploadedFile(null);
    setPreviewUrl(null);
    setParsedData(null);
    setShowPotentialDuplicateAlert(false);
    setDuplicateIds([]);
  };

  const handleAddManually = () => {
    setParsedData(null);
    setUploadedFile(null);
    setPreviewUrl(null);
    setShowPotentialDuplicateAlert(false);
    setDuplicateIds([]);
    onNext({
      uploadedFile: null as any,
      parsedData: null,
      previewUrl: '',
    });
  };

  return (
    <div className="space-y-6 h-[50vh]">
      {/* Potential Duplicate Alert */}
      {showPotentialDuplicateAlert && (
        <Alert className="border-yellow-200 bg-yellow-50">
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                <div className="w-5 h-5 rounded-full bg-yellow-100 flex items-center justify-center">
                  <span className="text-yellow-600 text-xs font-bold">!</span>
                </div>
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-semibold text-yellow-800 mb-1">Potential Duplicate Detected</h4>
                <AlertDescription className="text-yellow-700">
                  <span>
                    This invoice may be similar to existing expense(s). Similar IDs: <span className="font-semibold">{duplicateIds.join(', ')}</span>
                  </span>
                </AlertDescription>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-yellow-400 hover:text-yellow-600 hover:bg-yellow-100"
              onClick={() => setShowPotentialDuplicateAlert(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </Alert>
      )}

      <Card className="h-full">
        <CardContent className="p-8 h-full">
          {!uploadedFile ? (
            <div
              className="border-2 border-dashed border-primary/30 h-full rounded-lg p-12 text-center flex items-center justify-center hover:border-primary/50 transition-colors cursor-pointer"
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onClick={() => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = '.pdf,image/*';
                input.onchange = (e) => {
                  const file = (e.target as HTMLInputElement).files?.[0];
                  if (file) {
                    handleFileUpload(file);
                  }
                };
                input.click();
              }}
            >
              <div className="flex flex-col items-center justify-center space-y-4">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                  <Upload className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <p className="text-xl font-semibold text-gray-900 mb-2">Upload a receipt</p>
                  <p className="text-gray-600 mb-4">Drag and drop or click to upload</p>
                  <Button className="bg-primary hover:bg-primary/90">
                    <FileText className="h-4 w-4 mr-2" />
                    Browse files
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {isProcessing ? (
                <div className="text-center py-12">
                  <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-primary" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Processing receipt...</h3>
                  <p className="text-gray-600">Our OCR is extracting the details. Please wait...</p>
                </div>
              ) : (
                <>
                  <Card>
                    <CardContent className="p-6">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <FileText className="h-5 w-5 text-green-600" />
                            <span className="font-medium">{uploadedFile.name}</span>
                            {parsedData && (
                              <Badge variant="secondary" className="bg-green-100 text-green-800">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Processed
                              </Badge>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={removeUploadedFile}
                            className="text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>

                        {previewUrl && (
                          <img
                            src={previewUrl}
                            alt="Invoice preview"
                            className="w-full h-48 object-contain rounded-md border"
                          />
                        )}

                      </div>
                    </CardContent>
                  </Card>
                </>
              )}
            </div>
          )}
        </CardContent>
      </Card>
          <FileSizeDialog open={showSizeDialog} onClose={() => setShowSizeDialog(false)} />
      {/* Navigation Buttons */}
      {<div className="flex justify-end">
        <div className="flex gap-3">
          <Button 
            variant="outline" 
            onClick={handleAddManually}
            className="border-primary text-primary hover:bg-primary hover:text-white"
          >
            Add Manually
          </Button>
        </div>
      </div>}
    </div>
  );
}
