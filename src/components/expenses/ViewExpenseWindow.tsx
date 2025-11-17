import { Card, CardContent } from "../ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { Expense, Policy } from "@/types/expense";
import { ExpenseComments } from "./ExpenseComments";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { useEffect, useState } from "react";
import { Button } from "../ui/button";
import {
  Calendar,
  FileText,
  Loader2,
  RefreshCw,
  RotateCw,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { toast } from "sonner";
import { expenseService } from "@/services/expenseService";
import { getOrgIdFromToken } from "@/lib/jwtUtils";
import { calculateDays } from "@/pages/PerdiemPage";
import { Label } from "../ui/label";
import { getVehicleType } from "@/pages/MileagePage";
import { Switch } from "../ui/switch";
import {
  preApprovalService,
  PreApprovalType,
} from "@/services/preApprovalService";
import { AdvanceService, AdvanceType } from "@/services/advanceService";
import { formatCurrency, cn } from "@/lib/utils";
import { ParsedInvoiceData } from "@/services/fileParseService";
import api from "@/lib/api";

const formatDate = (date: string) => {
  if (date) {
    const genDate = new Date(date);
    if (!genDate) return date;
    if (date) {
      const formattedDate = new Date(date).toISOString().split("T")[0];
      if (formattedDate) return formattedDate;
    }
    return date;
  } else {
    return date;
  }
};

export function ViewExpenseWindow({
  open,
  onOpenChange,
  data,
}: {
  open: boolean;
  data: Expense | null;
  onOpenChange: any;
}) {
  const orgId = getOrgIdFromToken();
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);
  const loading = false;
  const [days, setDays] = useState<number>();
  const [selectedPolicy, setSelectedPolicy] = useState<Policy | null>();
  const [selectedPreApproval, setSelectedPreApproval] =
    useState<PreApprovalType | null>(null);
  const [selectedAdvance, setSelectedAdvance] = useState<AdvanceType | null>(
    null
  );
  const [parsedData, setParsedData] = useState<ParsedInvoiceData | null>(null);
  const [policies, setPolicies] = useState<Policy[]>([]);

  // Comments states
  const [activeTab, setActiveTab] = useState<"receipt" | "comments" | "validation">("receipt");
  const [activeMileageTab, setActiveMileageTab] = useState<"map" | "comments" | "validation">("map");
  const [activePerDiemTab, setActivePerDiemTab] = useState<"info" | "comments" | "validation">("info");

  const loadPoliciesWithCategories = async () => {
    try {
      const policiesData = await expenseService.getAllPolicies();
      setPolicies(policiesData);
      const selPolicy = policiesData.find(
        (policy) => policy.id === data?.expense_policy_id
      );
      if (selPolicy) {
        setSelectedPolicy(selPolicy);
      }
    } catch (error) {
      console.error("Error loading policies:", error);
    }
  };

  // Fetch receipt parsing data for validation (demo solution)
  const fetchReceiptParsingData = async (receiptId: string, expense: Expense) => {
    const orgId = getOrgIdFromToken();
    if (!orgId) return;

    // First, try to get OCR amount from localStorage (stored during expense creation)
    const storedOcrAmountByReceipt = localStorage.getItem(`ocr_amount_${receiptId}`);
    const storedOcrAmountByExpense = expense.id ? localStorage.getItem(`ocr_amount_expense_${expense.id}`) : null;
    const storedOcrAmount = storedOcrAmountByReceipt || storedOcrAmountByExpense;

    if (storedOcrAmount) {
      // Create parsedData from stored OCR amount
      const parsedData: ParsedInvoiceData = {
        id: receiptId,
        extracted_amount: storedOcrAmount,
        extracted_date: expense.expense_date,
        extracted_vendor: expense.vendor,
        file_key: "",
        invoice_number: expense.invoice_number || null,
        ocr_result: {
          amount: storedOcrAmount,
          date: expense.expense_date,
          vendor: expense.vendor,
          invoice_number: expense.invoice_number || "",
        },
        is_invoice_flagged: false,
        is_duplicate_receipt: !!expense.original_expense_id,
        original_expense_id: expense.original_expense_id || null,
        recommended_policy_id: expense.expense_policy_id,
        recommended_category: {
          category_id: expense.category_id,
          confidence: "0.8",
          reasoning: "Based on stored OCR data",
        },
      };
      setParsedData(parsedData);
      return;
    }

    // If not in localStorage, try to fetch from API
    try {
      const response = await api.get(
        `/em/expenses/receipt/${receiptId}/parse-data?org_id=${orgId}`
      );
      if (response.data?.data) {
        setParsedData(response.data.data);
        // Store it for future use
        const ocrAmount = response.data.data.extracted_amount || response.data.data.ocr_result?.amount;
        if (ocrAmount) {
          localStorage.setItem(`ocr_amount_${receiptId}`, ocrAmount);
        }
        return;
      }
    } catch (error) {
      // API endpoint not available - no fallback, just don't show validation
      console.log("Receipt parsing data not available");
    }
  };

  // Validation errors function
  const getValidationErrors = () => {
    const errors: Array<{ message: string; link?: { text: string; onClick: () => void } }> = [];

    if (!data) return errors;

    // 1. Check for duplicate expense
    const duplicateExpenseId = data?.original_expense_id || parsedData?.original_expense_id;
    if (duplicateExpenseId) {
      errors.push({
        message: "This expense is a duplicate",
        link: {
          text: "View original expense",
          onClick: () => window.open(`/expenses/${duplicateExpenseId}`, '_blank'),
        },
      });
    }

    // 2. Check if OCR amount doesn't match expense amount (only for receipt-based expenses)
    if (data.expense_type === "RECEIPT_BASED" && parsedData && (parsedData.ocr_result?.amount || parsedData.extracted_amount)) {
      const ocrAmount = parsedData.extracted_amount || parsedData.ocr_result?.amount || "";
      if (ocrAmount && data.amount) {
        const cleanOcrAmount = ocrAmount.toString().replace(/[^\d.,]/g, "").replace(/,/g, "");
        const cleanExpenseAmount = data.amount.toString().replace(/[^\d.,]/g, "").replace(/,/g, "");
        
        // Only validate if both amounts are valid numbers
        const ocrNum = parseFloat(cleanOcrAmount);
        const expenseNum = parseFloat(cleanExpenseAmount);
        
        if (!isNaN(ocrNum) && !isNaN(expenseNum) && Math.abs(ocrNum - expenseNum) > 0.01) {
          // Format amounts for display
          const displayOcrAmount = ocrNum.toLocaleString('en-IN', { 
            minimumFractionDigits: 2, 
            maximumFractionDigits: 2 
          });
          const displayExpenseAmount = expenseNum.toLocaleString('en-IN', { 
            minimumFractionDigits: 2, 
            maximumFractionDigits: 2 
          });
          
          errors.push({
            message: `Amount changed from original OCR amount ₹${displayOcrAmount} to ₹${displayExpenseAmount}`,
          });
        }
      }
    }

    // 3. Check if policy changed from recommended
    if (parsedData?.recommended_policy_id && data?.expense_policy_id && parsedData.recommended_policy_id !== data.expense_policy_id) {
      const recommendedPolicy = policies.find((p) => p.id === parsedData.recommended_policy_id);
      const currentPolicy = policies.find((p) => p.id === data.expense_policy_id);
      if (recommendedPolicy && currentPolicy) {
        errors.push({
          message: `Policy changed from recommended "${recommendedPolicy.name}" to "${currentPolicy.name}"`,
        });
      }
    }

    return errors;
  };

  useEffect(() => {
    loadPoliciesWithCategories();
  }, [data]);
  useEffect(() => {
    if (data?.start_date && data?.end_date) {
      const calcDays = calculateDays(data?.start_date, data?.end_date);
      setDays(calcDays);
    }
  }, [data?.start_date, data?.end_date]);

  const [mapZoom, setMapZoom] = useState(1);
  const [mapRotation, setMapRotation] = useState(0);

  const handleMapZoomIn = () => {
    setMapZoom((prev) => Math.min(prev + 0.25, 3));
  };

  const handleMapZoomOut = () => {
    setMapZoom((prev) => Math.max(prev - 0.25, 0.5));
  };

  const handleMapRotate = () => {
    setMapRotation((prev) => (prev + 90) % 360);
  };

  const handleMapReset = () => {
    setMapZoom(1);
    setMapRotation(0);
  };

  const fetchReceipt = async (id: string) => {
    if (!orgId) return;
    try {
      const response: any = await expenseService.fetchReceiptPreview(id, orgId);
      setReceiptUrl(response.data.data.signed_url);
    } catch (error) {
      console.log(error);
      toast.error("Error fetching receipt");
    }
  };

  const fetchPreApproval = async (id: string) => {
    try {
      const res: any = await preApprovalService.getPreApprovalById(id);
      const selected = res.data.data.find(
        (preApp: PreApprovalType) => preApp.id === data?.pre_approval_id
      );
      if (selected) setSelectedPreApproval(selected);
    } catch (error) {
      console.log(error);
      setSelectedPreApproval(null);
    }
  };

  const fetchAdvance = async (id: string) => {
    try {
      const res: any = await AdvanceService.getAdvanceById(id);
      const selected = res.data.data.find(
        (adv: AdvanceType) => adv.id === data?.advance_id
      );
      if (selected) setSelectedAdvance(selected);
    } catch (error) {
      console.log(error);
      setSelectedAdvance(null);
    }
  };

  useEffect(() => {
    if (open && data?.receipt_id) {
      fetchReceipt(data.receipt_id);
      // Fetch receipt parsing data for validation
      if (data) {
        fetchReceiptParsingData(data.receipt_id, data);
      }
    }
    if (open && data?.pre_approval_id) {
      fetchPreApproval(data.pre_approval_id);
    }
    if (open && data?.advance_id) {
      fetchAdvance(data.advance_id);
    }
    // Reset parsedData when modal closes
    if (!open) {
      setParsedData(null);
    }
  }, [open, data]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[80%] max-w-full max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center justify-between">
            <div>View Expense</div>
          </DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto min-h-0">
        {data?.expense_type === "RECEIPT_BASED" ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div>
              <Card>
                <CardContent className="p-6 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[14px] font-medium">
                        Policy *
                      </label>
                      <Input value={selectedPolicy?.name} disabled />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[14px] font-medium">
                        Category *
                      </label>
                      <Input value={data?.category} disabled />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[14px] font-medium">
                        Receipt Number *
                      </label>
                      <Input value={data?.invoice_number || ""} disabled />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[14px] font-medium">
                        Vendor *
                      </label>
                      <Input value={data?.vendor} disabled />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[14px] font-medium">
                        Amount *
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        <Input
                          value={data?.foreign_currency === 'USD' ? 'USD ($)' : data?.foreign_currency === 'EUR' ? 'EUR (€)' : 'INR (₹)'}
                          disabled
                        />
                        <Input
                        className="col-span-2"
                          value={data?.foreign_amount || data?.amount}
                          disabled
                        />
                      </div>
                      <p className="text-[12px] text-gray-500 ml-2">
                        {formatCurrency(data?.amount)}
                      </p>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[14px] font-medium">Date *</label>
                      <Input
                        value={formatDate(data?.expense_date || "")}
                        disabled
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {selectedAdvance && (
                      <div className="space-y-2">
                        <label className="text-[14px] font-medium">
                          Advance
                        </label>
                        <Input value={selectedAdvance?.title} disabled />
                      </div>
                    )}
                    {selectedPreApproval && (
                      <div className="space-y-2">
                        <label className="text-[14px] font-medium">
                          Pre Approval
                        </label>
                        <Input value={selectedPreApproval?.title} disabled />
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <label className="text-[14px] font-medium">
                      Description *
                    </label>
                    <Textarea value={data?.description} disabled />
                  </div>
                </CardContent>
              </Card>
            </div>
            <div>
              <Card className="flex flex-col h-full">
                <CardContent className="flex flex-col flex-1 p-0">
                  <div className="flex items-center justify-between border-b border-gray-100 px-6 pt-6 pb-4">
                    <div className="flex items-center gap-3">
                      {[
                        { key: "receipt", label: "Receipt" },
                        { key: "comments", label: "Comments" },
                        { key: "validation", label: "Validation" },
                      ].map((tab) => (
                        <button
                          key={tab.key}
                          type="button"
                          onClick={() =>
                            setActiveTab(tab.key as "receipt" | "comments" | "validation")
                          }
                          className={cn(
                            "rounded-full px-4 py-2 text-sm font-medium transition-all",
                            activeTab === tab.key
                              ? "bg-primary/10 text-primary"
                              : "text-gray-500 hover:text-gray-900"
                          )}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>
                    {receiptUrl && activeTab === "receipt" && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500">1</span>
                        <span className="text-xs text-gray-400">•</span>
                        <span className="text-xs text-gray-500">
                          {receiptUrl.toLowerCase().includes(".pdf")
                            ? "PDF"
                            : "Image"}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-h-[520px] px-6 pb-6">
                    {activeTab === "receipt" ? (
                      <>
                    {!!receiptUrl ? (
                      <div className="space-y-4">
                        {/* Interactive Receipt Viewer */}
                        {loading ? (
                          <div className="bg-gray-50 rounded-lg p-8 border-2 border-dashed border-gray-200">
                            <div className="text-center">
                              <Loader2 className="h-12 w-12 mx-auto text-gray-400 mb-3 animate-spin" />
                              <p className="text-sm text-gray-600 mb-2">
                                Loading receipt...
                              </p>
                              <p className="text-xs text-gray-500">
                                Please wait
                              </p>
                            </div>
                          </div>
                        ) : (
                          <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
                            {/* Receipt Controls */}
                            <div className="flex items-center justify-between p-3 bg-gray-50 border-b border-gray-200">
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={handleMapZoomOut}
                                  disabled={mapZoom <= 0.5}
                                  className="h-8 w-8 p-0"
                                >
                                  <ZoomOut className="h-4 w-4" />
                                </Button>
                                <span className="text-xs text-gray-600 min-w-[3rem] text-center">
                                  {Math.round(mapZoom * 100)}%
                                </span>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={handleMapZoomIn}
                                  disabled={mapZoom >= 3}
                                  className="h-8 w-8 p-0"
                                >
                                  <ZoomIn className="h-4 w-4" />
                                </Button>
                                <div className="w-px h-6 bg-gray-300 mx-2" />
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={handleMapRotate}
                                  className="h-8 w-8 p-0"
                                >
                                  <RotateCw className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={handleMapReset}
                                  className="h-8 w-8 p-0"
                                >
                                  <RefreshCw className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>

                            {/* Receipt Display */}
                            <div className="relative overflow-auto max-h-96 bg-gray-100">
                              <div className="flex items-center justify-center p-4">
                                {(() => {
                                  // Determine the source URL and file type
                                  let sourceUrl: string | null;
                                  sourceUrl = receiptUrl;
                                  // Show loading state if we're fetching the duplicate receipt URL

                                  // Check if this is a PDF by looking at the URL
                                  const isPdf = sourceUrl
                                    ?.toLowerCase()
                                    .includes(".pdf");

                                  if (isPdf) {
                                    // For PDFs, use embed tag with simple styling to avoid PDF viewer interface
                                    return (
                                      <div className="w-full h-80 border border-gray-200 rounded bg-white flex flex-col">
                                        <div className="flex-1 flex items-center justify-center">
                                          <embed
                                            src={`${sourceUrl}#toolbar=0&navpanes=0&scrollbar=0&statusbar=0&messages=0&scrollbar=0`}
                                            type="application/pdf"
                                            className="w-full h-full border-0 rounded"
                                            style={{
                                              transform: `scale(${mapZoom}) rotate(${mapRotation}deg)`,
                                              transformOrigin: "center",
                                            }}
                                          />
                                        </div>
                                      </div>
                                    );
                                  } else {
                                    // For regular images, use img tag
                                    return (
                                      <img
                                        src={sourceUrl || ""}
                                        alt="Receipt preview"
                                        className="max-w-full h-auto cursor-pointer hover:opacity-90 transition-opacity"
                                        style={{
                                          transform: `scale(${mapZoom}) rotate(${mapRotation}deg)`,
                                          transformOrigin: "center",
                                          maxHeight: "100%",
                                          objectFit: "contain",
                                        }}
                                        // onClick={handleReceiptFullscreen}
                                        onError={(e) => {
                                          // Fallback: if image fails to load, show download option
                                          e.currentTarget.style.display =
                                            "none";
                                          const fallbackDiv =
                                            document.createElement("div");
                                          fallbackDiv.className =
                                            "flex flex-col items-center justify-center h-full text-center p-4";
                                          fallbackDiv.innerHTML = `<p class="text-gray-600 mb-4">Receipt preview not available.</p>
                                                                                <a href="${
                                                                                  sourceUrl ??
                                                                                  "#"
                                                                                }" target="_blank" rel="noopener noreferrer" 
                                                                                class="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">
                                                                                <svg class="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                                                                d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                                                                                </svg>Download Receipt</a>`;
                                          e.currentTarget.parentNode?.appendChild(
                                            fallbackDiv
                                          );
                                        }}
                                      />
                                    );
                                  }
                                })()}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="bg-gray-50 rounded-lg p-8 border-2 border-dashed border-gray-200">
                        <div className="text-center">
                          <FileText className="h-12 w-12 mx-auto text-gray-400 mb-3" />
                          <p className="text-sm text-gray-600 mb-2">
                            No receipt uploaded
                          </p>
                          <p className="text-xs text-gray-500">
                            Manual entry mode
                          </p>
                        </div>
                      </div>
                    )}
                      </>
                    ) : activeTab === "comments" ? (
                      <ExpenseComments
                        expenseId={data?.id}
                        readOnly={false}
                        autoFetch={activeTab === "comments"}
                      />
                    ) : (
                      <div className="rounded-b-2xl bg-gray-50 p-6 md:h-full md:overflow-y-auto">
                        <div className="space-y-4">
                          {(() => {
                            const validationErrors = getValidationErrors();
                            return validationErrors.length > 0 ? (
                              <div className="space-y-3">
                                <ul className="space-y-2.5">
                                  {validationErrors.map((error, index) => (
                                    <li key={index} className="flex items-center gap-2 text-sm text-gray-700">
                                      <span className="text-red-500">•</span>
                                      <span className="flex-1">
                                        {error.message}
                                        {error.link && (
                                          <button
                                            onClick={error.link.onClick}
                                            className="text-blue-600 hover:text-blue-700 underline font-medium ml-1"
                                          >
                                            {error.link.text}
                                          </button>
                                        )}
                                      </span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            ) : (
                              <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
                                <FileText className="h-14 w-14 text-gray-300" />
                                <div>
                                  <p className="text-sm font-medium text-gray-700">
                                    No Validation Issues
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    This expense has passed all validation checks
                                  </p>
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        ) : data?.expense_type === "PER_DIEM" ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div>
              <Card>
                <CardContent className="p-6 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[14px] font-medium">
                        Start Date *
                      </label>
                      <Input
                        value={formatDate(data?.start_date || "")}
                        disabled
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[14px] font-medium">
                        End Date *
                      </label>
                      <Input value={formatDate(data?.end_date || "")} disabled />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[14px] font-medium">
                        Location *
                      </label>
                      <Input value={data?.location || ""} disabled />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[14px] font-medium">
                        Number of Days *
                      </label>
                      <Input value={days} disabled />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[14px] font-medium">Policy *</label>
                      <Input value={selectedPolicy?.name} disabled />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[14px] font-medium">
                        Category *
                      </label>
                      <Input value={data?.category} disabled />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[14px] font-medium">Purpose *</label>
                    <Textarea value={data?.description} disabled />
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-700">
                      Total Per Diem
                    </Label>
                    <div className="text-2xl font-bold text-blue-600 mt-1">
                      ₹{(Number(data?.amount) || 0).toFixed(2)}
                    </div>
                    <p className="text-sm text-gray-500">{days} days</p>
                  </div>
                </CardContent>
              </Card>
            </div>
            <div>
              <Card className="flex flex-col h-full">
                <CardContent className="flex flex-col flex-1 p-0">
                  <div className="flex items-center justify-between border-b border-gray-100 px-6 pt-6 pb-4">
                    <div className="flex items-center gap-3">
                      {[
                        { key: "info", label: "Info" },
                        { key: "comments", label: "Comments" },
                        { key: "validation", label: "Validation" },
                      ].map((tab) => (
                        <button
                          key={tab.key}
                          type="button"
                          onClick={() =>
                            setActivePerDiemTab(tab.key as "info" | "comments" | "validation")
                          }
                          className={cn(
                            "rounded-full px-4 py-2 text-sm font-medium transition-all",
                            activePerDiemTab === tab.key
                              ? "bg-primary/10 text-primary"
                              : "text-gray-500 hover:text-gray-900"
                          )}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex-1 min-h-[520px] px-6 pb-6">
                    {activePerDiemTab === "info" ? (
                      <div className="flex flex-col items-center justify-center gap-3 rounded-b-2xl bg-gray-50 p-16 text-center h-full">
                        <Calendar className="h-14 w-14 text-gray-300" />
                        <div>
                          <p className="text-sm font-medium text-gray-700">
                            Per Diem Information
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Expense details will appear here
                          </p>
                        </div>
                      </div>
                    ) : activePerDiemTab === "comments" ? (
                      <ExpenseComments
                        expenseId={data?.id}
                        readOnly={false}
                        autoFetch={activePerDiemTab === "comments"}
                      />
                    ) : (
                      <div className="rounded-b-2xl bg-gray-50 p-6 md:h-full md:overflow-y-auto">
                        <div className="space-y-4">
                          {(() => {
                            const validationErrors = getValidationErrors();
                            return validationErrors.length > 0 ? (
                              <div className="space-y-3">
                                <ul className="space-y-2.5">
                                  {validationErrors.map((error, index) => (
                                    <li key={index} className="flex items-center gap-2 text-sm text-gray-700">
                                      <span className="text-red-500">•</span>
                                      <span className="flex-1">
                                        {error.message}
                                        {error.link && (
                                          <button
                                            onClick={error.link.onClick}
                                            className="text-blue-600 hover:text-blue-700 underline font-medium ml-1"
                                          >
                                            {error.link.text}
                                          </button>
                                        )}
                                      </span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            ) : (
                              <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
                                <Calendar className="h-14 w-14 text-gray-300" />
                                <div>
                                  <p className="text-sm font-medium text-gray-700">
                                    No Validation Issues
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    This expense has passed all validation checks
                                  </p>
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
            {/* Map Display Card */}
            <div>
              <Card className="flex flex-col h-full">
                <CardContent className="flex flex-col flex-1 p-0">
                  <div className="flex items-center justify-between border-b border-gray-100 px-6 pt-6 pb-4">
                    <div className="flex items-center gap-3">
                      {[
                        { key: "map", label: "Route Map" },
                        { key: "comments", label: "Comments" },
                        { key: "validation", label: "Validation" },
                      ].map((tab) => (
                          <button
                            key={tab.key}
                            type="button"
                            onClick={() =>
                              setActiveMileageTab(tab.key as "map" | "comments" | "validation")
                            }
                            className={cn(
                              "rounded-full px-4 py-2 text-sm font-medium transition-all",
                              activeMileageTab === tab.key
                                ? "bg-primary/10 text-primary"
                                : "text-gray-500 hover:text-gray-900"
                            )}
                          >
                            {tab.label}
                          </button>
                        ))}
                      </div>
                    </div>

                  <div className="flex-1 min-h-[520px] px-6 pb-6">
                    {activeMileageTab === "map" ? (
                      <>
                        {data?.mileage_meta?.map_url ? (
                          <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
                            {/* Map Controls */}
                            <div className="flex items-center justify-between p-3 bg-gray-50 border-b border-gray-200">
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={handleMapZoomOut}
                                  disabled={mapZoom <= 0.5}
                                  className="h-8 w-8 p-0"
                                >
                                  <ZoomOut className="h-4 w-4" />
                                </Button>
                                <span className="text-xs text-gray-600 min-w-[3rem] text-center">
                                  {Math.round(mapZoom * 100)}%
                                </span>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={handleMapZoomIn}
                                  disabled={mapZoom >= 3}
                                  className="h-8 w-8 p-0"
                                >
                                  <ZoomIn className="h-4 w-4" />
                                </Button>
                                <div className="w-px h-6 bg-gray-300 mx-2" />
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={handleMapRotate}
                                  className="h-8 w-8 p-0"
                                >
                                  <RotateCw className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={handleMapReset}
                                  className="h-8 w-8 p-0"
                                >
                                  <RefreshCw className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>

                            {/* Map Display */}
                            <div className="relative overflow-auto max-h-96 bg-gray-100">
                              <div className="flex items-center justify-center p-4">
                                <img
                                  src={data.mileage_meta.map_url}
                                  alt="Route map"
                                  className="max-w-full h-auto cursor-pointer hover:opacity-90 transition-opacity"
                                  style={{
                                    transform: `scale(${mapZoom}) rotate(${mapRotation}deg)`,
                                    transformOrigin: "center",
                                    maxHeight: "100%",
                                    objectFit: "contain",
                                  }}
                                  onError={(e) => {
                                    e.currentTarget.style.display = "none";
                                    const fallbackDiv =
                                      document.createElement("div");
                                    fallbackDiv.className =
                                      "flex flex-col items-center justify-center h-full text-center p-4";
                                    fallbackDiv.innerHTML = `<p class="text-gray-600 mb-4">Map preview not available.</p>`;
                                    e.currentTarget.parentNode?.appendChild(
                                      fallbackDiv
                                    );
                                  }}
                                />
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="bg-gray-50 rounded-lg border-2 border-dashed border-gray-200 h-full flex items-center justify-center">
                            <div className="text-center">
                              <div className="mx-auto mb-4 h-16 w-16 text-gray-300">
                                <svg
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="1.5"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  className="h-full w-full"
                                >
                                  <path d="M12 21s-8-5.058-8-11a8 8 0 1 1 16 0c0 5.942-8 11-8 11z" />
                                  <circle cx="12" cy="10" r="3" />
                                </svg>
                              </div>
                              <p className="text-base font-medium text-gray-700">Map View</p>
                              <p className="text-sm text-gray-400 mt-1">
                                Route visualization will appear here
                              </p>
                            </div>
                          </div>
                        )}
                      </>
                    ) : activeMileageTab === "comments" ? (
                      <ExpenseComments
                        expenseId={data?.id}
                        readOnly={false}
                        autoFetch={activeMileageTab === "comments"}
                      />
                    ) : (
                      <div className="rounded-b-2xl bg-gray-50 p-6 md:h-full md:overflow-y-auto">
                        <div className="space-y-4">
                          {(() => {
                            const validationErrors = getValidationErrors();
                            return validationErrors.length > 0 ? (
                              <div className="space-y-3">
                                <ul className="space-y-2.5">
                                  {validationErrors.map((error, index) => (
                                    <li key={index} className="flex items-center gap-2 text-sm text-gray-700">
                                      <span className="text-red-500">•</span>
                                      <span className="flex-1">
                                        {error.message}
                                        {error.link && (
                                          <button
                                            onClick={error.link.onClick}
                                            className="text-blue-600 hover:text-blue-700 underline font-medium ml-1"
                                          >
                                            {error.link.text}
                                          </button>
                                        )}
                                      </span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            ) : (
                              <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
                                <FileText className="h-14 w-14 text-gray-300" />
                                <div>
                                  <p className="text-sm font-medium text-gray-700">
                                    No Validation Issues
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    This expense has passed all validation checks
                                  </p>
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
            <div>
              <Card className="flex flex-col h-full">
                <CardContent className="p-6 space-y-4 overflow-y-auto flex-1">
                  <div className="relative">
                    {data?.start_location && (
                      <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 font-bold text-xs">
                        A
                      </span>
                    )}
                    <Input
                      value={data?.start_location || ""}
                      disabled
                      placeholder="A Start Location"
                      className={`text-sm ${
                        data?.start_location ? "pl-8" : ""
                      }`}
                    />
                  </div>

                  {/* Display stops if they exist */}
                  {data?.mileage_meta?.stops &&
                    data.mileage_meta.stops.length > 0 && (
                      <>
                        {data.mileage_meta.stops.map(
                          (stop: any, index: number) => (
                            <div key={stop.id} className="relative">
                              {stop.location && (
                                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 font-bold text-xs">
                                  {String.fromCharCode(66 + index)}
                                </span>
                              )}
                              <Input
                                value={stop.location || ""}
                                disabled
                                placeholder={`${String.fromCharCode(
                                  66 + index
                                )} Stop ${index + 1}`}
                                className={`text-sm ${
                                  stop.location ? "pl-8" : ""
                                }`}
                              />
                            </div>
                          )
                        )}
                      </>
                    )}

                  <div className="relative">
                    {data?.end_location && (
                      <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 font-bold text-xs">
                        {String.fromCharCode(
                          65 + (data?.mileage_meta?.stops?.length || 0) + 1
                        )}
                      </span>
                    )}
                    <Input
                      value={data?.end_location || ""}
                      disabled
                      placeholder={`${String.fromCharCode(
                        65 + (data?.mileage_meta?.stops?.length || 0) + 1
                      )} End Location`}
                      className={`text-sm ${data?.end_location ? "pl-8" : ""}`}
                    />
                  </div>

                  <div className="flex items-center justify-end gap-3 my-2">
                    <label className="text-[14px] font-medium">
                      Round Trip
                    </label>
                    <Switch checked={data?.is_round_trip} disabled />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[14px] font-medium">Vehicle *</label>
                    <Input
                      value={getVehicleType(data?.vehicle_type || "")}
                      disabled
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[14px] font-medium">
                      Distance *
                    </label>
                    <Input
                      value={data?.distance ? `${data.distance} km` : ""}
                      disabled
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[14px] font-medium">
                        Policy *
                      </label>
                      <Input value={selectedPolicy?.name} disabled />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[14px] font-medium">
                        Category *
                      </label>
                      <Input value={data?.category} disabled />
                    </div>
                  </div>
                  <div>
                    <label>Date *</label>
                    <Input
                      value={formatDate(data?.expense_date || "")}
                      disabled
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[14px] font-medium">Purpose *</label>
                    <Textarea value={data?.description} disabled />
                  </div>

                  {/* Display notes if available */}
                  {data?.mileage_meta?.notes && (
                    <div className="space-y-2">
                      <label className="text-[14px] font-medium">Notes</label>
                      <Textarea value={data.mileage_meta.notes} disabled />
                    </div>
                  )}

                  <div>
                    <Label className="text-sm font-medium text-gray-700">
                      Total Amount
                    </Label>
                    <div className="text-2xl font-bold text-blue-600 mt-1">
                      ₹{(Number(data?.amount) || 0).toFixed(2)}
                    </div>
                    {data?.distance && (
                      <p className="text-sm text-gray-500">
                        {data.distance} km
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
