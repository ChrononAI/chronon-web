import React, { useState } from 'react';
import { Upload, X, CheckCircle, FileText, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { fileParseService, ParsedInvoiceData } from '@/services/fileParseService';
import { useExpenseStore } from '@/store/expenseStore';


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


  const handleFileUpload = async (file: File) => {
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

  // const handleNext = () => {
  //   if (uploadedFile && previewUrl) {
  //     onNext({
  //       uploadedFile,
  //       parsedData,
  //       previewUrl,
  //     });
  //   }
  // };

  // const handleAddManually = () => {
  //   setParsedData(null);
  //   setUploadedFile(null);
  //   setPreviewUrl(null);
  //   setShowPotentialDuplicateAlert(false);
  //   setDuplicateIds([]);
  //   onNext({
  //     uploadedFile: null as any,
  //     parsedData: null,
  //     previewUrl: '',
  //   });
  // };

  return (
    <div className="space-y-6 h-[50vh]">
      {/* Potential Duplicate Alert */}
      {showPotentialDuplicateAlert && (
        <Alert className="border-yellow-200 bg-yellow-50">
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                <div className="w-6 h-6 rounded-full bg-yellow-100 flex items-center justify-center">
                  <span className="text-yellow-600 text-sm font-bold">!</span>
                </div>
              </div>
              <div className="flex-1">
                <h4 className="text-base font-bold text-yellow-800 mb-1">Potential Duplicate Detected</h4>
                <AlertDescription className="text-sm font-medium text-yellow-700">
                  <span>
                    This invoice may be similar to existing expense(s). Similar IDs: <span className="font-bold">{duplicateIds.join(', ')}</span>
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
              className="border-2 border-dashed border-[#0D9C99]/30 h-full rounded-lg p-12 text-center flex items-center justify-center hover:border-[#0D9C99]/50 transition-colors cursor-pointer"
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
                <div className="w-20 h-20 bg-[#0D9C99]/10 rounded-full flex items-center justify-center">
                  <Upload className="h-10 w-10 text-[#0D9C99]" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-[#1A1A1A] mb-2">Upload a receipt</p>
                  <p className="text-base font-medium text-[#64748B] mb-4">Drag and drop or click to upload</p>
                  <Button className="bg-[#0D9C99] hover:bg-[#0D9C99]/90 text-white font-semibold text-base px-6 py-2.5">
                    <FileText className="h-5 w-5 mr-2" />
                    Browse files
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {isProcessing ? (
                <div className="text-center py-12">
                  <Loader2 className="h-14 w-14 animate-spin mx-auto mb-4 text-[#0D9C99]" />
                  <h3 className="text-xl font-bold text-[#1A1A1A] mb-2">Processing receipt...</h3>
                  <p className="text-base font-medium text-[#64748B]">Our OCR is extracting the details. Please wait...</p>
                </div>
              ) : (
                <>
                  <Card>
                      <CardContent className="p-6">
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <FileText className="h-6 w-6 text-[#0D9C99]" />
                              <span className="text-base font-semibold text-[#1A1A1A]">{uploadedFile.name}</span>
                              {parsedData && (
                                <Badge variant="secondary" className="bg-[#0D9C99]/10 text-[#0D9C99] font-semibold text-sm px-3 py-1">
                                  <CheckCircle className="h-4 w-4 mr-1" />
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

      {/* Navigation Buttons */}
      {/* {type === "upload" && <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          Back
        </Button>
        <div className="flex gap-3">
          <Button 
            variant="outline" 
            onClick={handleAddManually}
            className="border-primary text-primary hover:bg-primary hover:text-white"
          >
            Add Manually
          </Button>
          <Button 
            onClick={handleNext} 
            disabled={!uploadedFile || isProcessing}
            className="bg-primary hover:bg-primary/90"
          >
            {isProcessing ? 'Processing...' : 'Next'}
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </div>} */}
    </div>
  );
}
