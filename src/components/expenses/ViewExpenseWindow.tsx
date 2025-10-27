import { Card, CardContent } from "../ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { Expense, Policy } from "@/types/expense";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { useEffect, useState } from "react";
import { Button } from "../ui/button";
import { FileText, Loader2, RefreshCw, RotateCw, ZoomIn, ZoomOut } from "lucide-react";
import { toast } from "sonner";
import { expenseService } from "@/services/expenseService";
import { getOrgIdFromToken } from "@/lib/jwtUtils";
import { calculateDays } from "@/pages/PerdiemPage";
import { Label } from "../ui/label";
import { getVehicleType } from "@/pages/MileagePage";
import { Switch } from "../ui/switch";

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
}

export function ViewExpenseWindow({ open, onOpenChange, data }: { open: boolean; data: Expense | null; onOpenChange: any }) {
    const orgId = getOrgIdFromToken();
    const [receiptUrl, setReceiptUrl] = useState<string | null>(null);
    const loading = false;
    const [days, setDays] = useState<number>();
    const [selectedPolicy, setSelectedPolicy] = useState<Policy | null>();

    const loadPoliciesWithCategories = async () => {
        try {
            const policiesData = await expenseService.getAllPolicies();
            const selPolicy = policiesData.find((policy) => policy.id === data?.expense_policy_id);
            if (selPolicy) {
                setSelectedPolicy(selPolicy);
            }
        } catch (error) {
            console.error("Error loading policies:", error);
        }
    };

    useEffect(() => {
        loadPoliciesWithCategories();
    }, [data])
    useEffect(() => {
        if (data?.start_date && data?.end_date) {
            const calcDays = calculateDays(data?.start_date, data?.end_date);
            setDays(calcDays);
        }
    }, [data?.start_date, data?.end_date])

    // const [isReceiptFullscreen, setIsReceiptFullscreen] = useState(false);
    const [receiptZoom, setReceiptZoom] = useState(1);
    const [receiptRotation, setReceiptRotation] = useState(0);

    const handleReceiptZoomIn = () => {
        setReceiptZoom((prev) => Math.min(prev + 0.25, 3));
    };

    const handleReceiptZoomOut = () => {
        setReceiptZoom((prev) => Math.max(prev - 0.25, 0.5));
    };

    const handleReceiptRotate = () => {
        setReceiptRotation((prev) => (prev + 90) % 360);
    };

    const handleReceiptReset = () => {
        setReceiptZoom(1);
        setReceiptRotation(0);
    };

    // const handleReceiptFullscreen = () => {
    //     setIsReceiptFullscreen(true);
    // };

    const fetchReceipt = async (id: string) => {
        if (!orgId) return;
        try {
            const response: any = await expenseService.fetchReceiptPreview(id, orgId);
            setReceiptUrl(response.data.data.signed_url);
        } catch (error) {
            console.log(error);
            toast.error("Error fetching receipt");
        }
    }

    useEffect(() => {
        if (open && data?.receipt_id) {
            fetchReceipt(data.receipt_id);
        }
    }, [open, data])

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="w-[80%] max-w-full max-h-[80%] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center justify-between">
                        <div>
                            View Expense
                        </div>
                        <div>
                            {/* <XCircle className="h-5 w-5" /> */}
                        </div>
                    </DialogTitle>
                </DialogHeader>
                {data?.expense_type === "RECEIPT_BASED" ? <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div>
                        <Card>
                            <CardContent className="p-6 space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-[14px] font-medium">Policy *</label>
                                        <Input value={selectedPolicy?.name} disabled />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[14px] font-medium">Category *</label>
                                        <Input value={data?.category} disabled />
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-[14px] font-medium">Receipt Number *</label>
                                        <Input value={data?.invoice_number || ""} disabled />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[14px] font-medium">Vendor *</label>
                                        <Input value={data?.vendor} disabled />
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-[14px] font-medium">Amount *</label>
                                        <Input value={data?.amount} disabled />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[14px] font-medium">Date *</label>
                                        <Input value={formatDate(data?.expense_date || "")} disabled />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[14px] font-medium">Description *</label>
                                    <Textarea value={data?.description} disabled />
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                    <div>
                        <Card>
                            <CardContent>
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between my-4">
                                        <h3 className="text-lg font-semibold text-gray-900">
                                            Receipt
                                        </h3>
                                        {receiptUrl && (
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs text-gray-500">
                                                    1
                                                </span>
                                                <span className="text-xs text-gray-400">•</span>
                                                <span className="text-xs text-gray-500">
                                                    {receiptUrl.toLowerCase().includes(".pdf")
                                                        ? "PDF"
                                                        : "Image"
                                                    }
                                                </span>
                                            </div>
                                        )}
                                    </div>

                                    {!!(receiptUrl) ? (
                                        <div className="space-y-4">
                                            {/* Interactive Receipt Viewer */}
                                            {loading ? (
                                                <div className="bg-gray-50 rounded-lg p-8 border-2 border-dashed border-gray-200">
                                                    <div className="text-center">
                                                        <Loader2 className="h-12 w-12 mx-auto text-gray-400 mb-3 animate-spin" />
                                                        <p className="text-sm text-gray-600 mb-2">
                                                            Loading receipt...
                                                        </p>
                                                        <p className="text-xs text-gray-500">Please wait</p>
                                                    </div>
                                                </div>
                                            ) : <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
                                                {/* Receipt Controls */}
                                                <div className="flex items-center justify-between p-3 bg-gray-50 border-b border-gray-200">
                                                    <div className="flex items-center gap-2">
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={handleReceiptZoomOut}
                                                            disabled={receiptZoom <= 0.5}
                                                            className="h-8 w-8 p-0"
                                                        >
                                                            <ZoomOut className="h-4 w-4" />
                                                        </Button>
                                                        <span className="text-xs text-gray-600 min-w-[3rem] text-center">
                                                            {Math.round(receiptZoom * 100)}%
                                                        </span>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={handleReceiptZoomIn}
                                                            disabled={receiptZoom >= 3}
                                                            className="h-8 w-8 p-0"
                                                        >
                                                            <ZoomIn className="h-4 w-4" />
                                                        </Button>
                                                        <div className="w-px h-6 bg-gray-300 mx-2" />
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={handleReceiptRotate}
                                                            className="h-8 w-8 p-0"
                                                        >
                                                            <RotateCw className="h-4 w-4" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={handleReceiptReset}
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
                                                                                    transform: `scale(${receiptZoom}) rotate(${receiptRotation}deg)`,
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
                                                                            transform: `scale(${receiptZoom}) rotate(${receiptRotation}deg)`,
                                                                            transformOrigin: "center",
                                                                            maxHeight: "100%",
                                                                            objectFit: "contain",
                                                                        }}
                                                                        // onClick={handleReceiptFullscreen}
                                                                        onError={(e) => {
                                                                            // Fallback: if image fails to load, show download option
                                                                            e.currentTarget.style.display = "none";
                                                                            const fallbackDiv =
                                                                                document.createElement("div");
                                                                            fallbackDiv.className =
                                                                                "flex flex-col items-center justify-center h-full text-center p-4";
                                                                            fallbackDiv.innerHTML = `<p class="text-gray-600 mb-4">Receipt preview not available.</p>
                                                                                <a href="${sourceUrl ?? "#"}" target="_blank" rel="noopener noreferrer" 
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
                                            </div>}
                                        </div>
                                    ) : (
                                        <div className="bg-gray-50 rounded-lg p-8 border-2 border-dashed border-gray-200">
                                            <div className="text-center">
                                                <FileText className="h-12 w-12 mx-auto text-gray-400 mb-3" />
                                                <p className="text-sm text-gray-600 mb-2">
                                                    No receipt uploaded
                                                </p>
                                                <p className="text-xs text-gray-500">Manual entry mode</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div> : data?.expense_type === "PER_DIEM" ?
                    <div>
                        <Card>
                            <CardContent className="p-6 space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-[14px] font-medium">Start Date *</label>
                                        <Input value={formatDate(data?.start_date || "")} disabled />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[14px] font-medium">End Date *</label>
                                        <Input value={formatDate(data?.end_date || "")} disabled />
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-[14px] font-medium">Location *</label>
                                        <Input value={data?.location || ""} disabled />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[14px] font-medium">Number of Days *</label>
                                        <Input value={days} disabled />
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-[14px] font-medium">Policy *</label>
                                        <Input value={selectedPolicy?.name} disabled />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[14px] font-medium">Category *</label>
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
                    :
                    <div>
                        <Card>
                            <CardContent className="p-6 space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-[14px] font-medium">Start Location *</label>
                                        <Input value={data?.start_location} disabled />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[14px] font-medium">End Location *</label>
                                        <Input value={data?.end_location} disabled />
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-[14px] font-medium">Vehicle *</label>
                                        <Input value={getVehicleType(data?.vehicle_type || "")} disabled />
                                    </div>
                                    <div className="space-y-4 flex flex-col">
                                        <label className="text-[14px] font-medium">Round Trip</label>
                                        <Switch
                                            checked={data?.is_round_trip}
                                            disabled
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-[14px] font-medium">Distance *</label>
                                        <Input value={data?.distance} disabled />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[14px] font-medium">Amount *</label>
                                        <Input value={data?.amount} disabled />
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-[14px] font-medium">Policy *</label>
                                        <Input value={selectedPolicy?.name} disabled />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[14px] font-medium">Category *</label>
                                        <Input value={data?.category} disabled />
                                    </div>
                                </div>
                                <div>
                                    <label>Date *</label>
                                    <Input value={formatDate(data?.expense_date || "")} disabled />
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
                }
            </DialogContent>
        </Dialog>
    )
}