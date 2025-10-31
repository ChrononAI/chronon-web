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
import { preApprovalService, PreApprovalType } from "@/services/preApprovalService";
import { AdvanceService, AdvanceType } from "@/services/advanceService";

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
    const [selectedPreApproval, setSelectedPreApproval] = useState<PreApprovalType | null>(null);
    const [selectedAdvance, setSelectedAdvance] = useState<AdvanceType | null>(null);
    console.log(data);

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
    }

    const fetchApprovedPreApproval = async () => {
        try {
            const res: any = await preApprovalService.getPreApprovalsByStatus({ status: 'APPROVED', page: 1, perPage: 100 });
            console.log(res);
            const selected = res.data.data.find((preApp: PreApprovalType) => preApp.id === data?.pre_approval_id)
            if (selected) setSelectedPreApproval(selected);
        } catch (error) {
            console.log(error);
            setSelectedPreApproval(null);
        }
    };

    const fetchAdvance = async () => {
        try {
            const res: any = await AdvanceService.getAdvancesByStatus({ status: 'APPROVED', page: 1, perPage: 100 });
            console.log(res);
            const selected = res.data.data.find((adv: AdvanceType) => adv.id === data?.advance_id);
            if (selected) setSelectedAdvance(selected);
        } catch (error) {
            console.log(error);
            setSelectedAdvance(null);
        }
    }

    useEffect(() => {
        if (open && data?.receipt_id) {
            fetchReceipt(data.receipt_id);
        }
        if (open && data?.pre_approval_id) {
            fetchApprovedPreApproval();
            fetchAdvance();
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
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {selectedAdvance && <div className="space-y-2">
                                        <label className="text-[14px] font-medium">Advance</label>
                                        <Input value={selectedAdvance?.title} disabled />
                                    </div>}
                                    {selectedPreApproval && <div className="space-y-2">
                                        <label className="text-[14px] font-medium">Pre Approval</label>
                                        <Input value={selectedPreApproval?.title} disabled />
                                    </div>}
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
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <div>
                            <Card>
                                <CardContent className="p-6 space-y-4">
                                <div className="relative">
                                    {data?.start_location && (
                                        <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 font-bold text-xs">A</span>
                                    )}
                                    <Input 
                                        value={data?.start_location || ""} 
                                        disabled 
                                        placeholder="A Start Location"
                                        className={`text-sm ${data?.start_location ? 'pl-8' : ''}`}
                                    />
                                </div>

                                {/* Display stops if they exist */}
                                {data?.mileage_meta?.stops && data.mileage_meta.stops.length > 0 && (
                                    <>
                                        {data.mileage_meta.stops.map((stop: any, index: number) => (
                                            <div key={stop.id} className="relative">
                                                {stop.location && (
                                                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 font-bold text-xs">{String.fromCharCode(66 + index)}</span>
                                                )}
                                                <Input 
                                                    value={stop.location || ""} 
                                                    disabled 
                                                    placeholder={`${String.fromCharCode(66 + index)} Stop ${index + 1}`}
                                                    className={`text-sm ${stop.location ? 'pl-8' : ''}`}
                                                />
                                            </div>
                                        ))}
                                    </>
                                )}

                                <div className="relative">
                                    {data?.end_location && (
                                        <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 font-bold text-xs">{String.fromCharCode(65 + (data?.mileage_meta?.stops?.length || 0) + 1)}</span>
                                    )}
                                    <Input 
                                        value={data?.end_location || ""} 
                                        disabled 
                                        placeholder={`${String.fromCharCode(65 + (data?.mileage_meta?.stops?.length || 0) + 1)} End Location`}
                                        className={`text-sm ${data?.end_location ? 'pl-8' : ''}`}
                                    />
                                </div>

                                <div className="flex items-center justify-end gap-3 my-2">
                                    <label className="text-[14px] font-medium">Round Trip</label>
                                    <Switch
                                        checked={data?.is_round_trip}
                                        disabled
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[14px] font-medium">Vehicle *</label>
                                    <Input value={getVehicleType(data?.vehicle_type || "")} disabled />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[14px] font-medium">Distance *</label>
                                    <Input value={data?.distance ? `${data.distance} km` : ""} disabled />
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
                                        <p className="text-sm text-gray-500">{data.distance} km</p>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                        </div>

                        {/* Map Display Card */}
                        {data?.mileage_meta?.map_url && (
                            <div>
                                <Card>
                                    <CardContent>
                                        <div className="space-y-4">
                                            <div className="flex items-center justify-between my-4">
                                                <h3 className="text-lg font-semibold text-gray-900">
                                                    Route Map
                                                </h3>
                                            </div>

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
                                                                const fallbackDiv = document.createElement("div");
                                                                fallbackDiv.className = "flex flex-col items-center justify-center h-full text-center p-4";
                                                                fallbackDiv.innerHTML = `<p class="text-gray-600 mb-4">Map preview not available.</p>`;
                                                                e.currentTarget.parentNode?.appendChild(fallbackDiv);
                                                            }}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        )}
                    </div>
                }
            </DialogContent>
        </Dialog>
    )
}