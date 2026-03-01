import { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Loader2,
  ZoomIn,
  ZoomOut,
  RotateCw,
  RefreshCw,
  Download,
  X,
  Copy,
  ExternalLink,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { LocationAutocomplete } from "@/components/ui/location-autocomplete";
import { placesService, PlaceSuggestion } from "@/services/placesService";
import { expenseService } from "@/services/expenseService";
import { getOrgIdFromToken } from "@/lib/jwtUtils";
import {
  Expense,
  ExpenseComment,
  Policy,
  PolicyCategory,
} from "@/types/expense";
import { toast } from "sonner";
import { format } from "date-fns";
import { DateField } from "@/components/ui/date-field";
import { ExpenseComments } from "@/components/expenses/ExpenseComments";
import {
  cn,
  formatCurrency,
  formatDistance,
  getDistanceUnit,
  usesMetricSystem,
  parseLocalDate,
} from "@/lib/utils";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useAuthStore } from "@/store/authStore";
import { trackEvent } from "@/mixpanel";
import ExpenseLogs from "@/components/expenses/ExpenseLogs";
import { Attachment } from "@/components/expenses/ExpenseDetailsStep2";
import AttachmentViewer from "@/components/expenses/AttachmentViewer";
import { FormActionFooter } from "@/components/layout/FormActionFooter";
import { useTemplateEntities } from "@/hooks/useTemplateEntities";
import { TemplateEntityField } from "@/components/expenses/TemplateEntityField";

interface MileagePageProps {
  mode?: "create" | "view" | "edit";
  expenseData?: Expense;
  isEditable?: boolean;
  onUpdate?: (data: any) => Promise<void>;
  isEditing?: boolean;
  saving?: boolean;
  onCancel?: () => void;
}

export const getVehicleType = (
  type: "FOUR_WHEELERS" | "TWO_WHEELERS" | "PUBLIC_TRANSPORT" | string
) => {
  if (type === "FOUR_WHEELERS") return "car";
  if (type === "TWO_WHEELERS") return "bike";
  if (type === "PUBLIC_TRANSPORT") return "public_transport";
  return "";
};

const mileageSchema = z.object({
  startLocation: z.string().min(1, "Start location is required"),
  endLocation: z.string().min(1, "End location is required"),
  distance: z.string().min(1, "Distance is required"),
  chargeableDistance: z.string().optional(),
  amount: z.string().min(1, "Amount is required"),
  description: z.string().min(1, "Purpose of travel is required"),
  vehiclesType: z.string().min(1, "Vehicle type is required"),
  expenseDate: z.string().min(1, "Date is required"),
  isRoundTrip: z.boolean(),
  policyId: z.string().min(1, "Policy is required"),
  categoryId: z.string().min(1, "Category is required"),
  stops: z.array(z.string()).optional(),
});

type MileageFormValues = z.infer<typeof mileageSchema>;

const MileagePage = ({
  mode = "create",
  expenseData,
  isEditable = false,
  onUpdate,
  isEditing = false,
  saving = false,
  onCancel,
}: MileagePageProps) => {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const form = useForm<MileageFormValues>({
    resolver: zodResolver(mileageSchema),
    defaultValues: {
      startLocation: "",
      endLocation: "",
      distance: "",
      chargeableDistance: "",
      amount: "",
      description: "",
      vehiclesType: "",
      expenseDate: format(new Date(), "yyyy-MM-dd"),
      isRoundTrip: false,
      policyId: "",
      categoryId: "",
    },
  });

  const [formData, setFormData] = useState({
    startLocation: "",
    startLocationId: "",
    endLocation: "",
    endLocationId: "",
    distance: "",
    chargeableDistance: "",
    amount: "",
    description: "",
    vehiclesType: "",
    expenseDate: format(new Date(), "yyyy-MM-dd"),
    isRoundTrip: false,
    policyId: "",
    categoryId: "",
    stops: [] as { id: string; location: string; locationId: string }[],
  });
  const { orgSettings } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [categories, setCategories] = useState<PolicyCategory[]>([]);
  const [selectedPolicy, setSelectedPolicy] = useState<Policy | null>(null);
  const [mileagePrice, setMileagePrice] = useState<number | null>(null);
  const [chargeableDistanceValue, setChargeableDistanceValue] = useState<
    number | null
  >(null);
  const [loadingPolicies, setLoadingPolicies] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [startLocation, setStartLocation] = useState<PlaceSuggestion | null>();
  const [endLocation, setEndLocation] = useState<PlaceSuggestion | null>();
  const [hasPrefilledLocations, setHasPrefilledLocations] = useState(false);
  const [isLoadingExistingData, setIsLoadingExistingData] = useState(false);
  const [mapUrl, setMapUrl] = useState<string | null>(null);
  const [mapZoom, setMapZoom] = useState(1);
  const [mapRotation, setMapRotation] = useState(0);
  const [isMapFullscreen, setIsMapFullscreen] = useState(false);
  const [activeMapTab, setActiveMapTab] = useState<"map" | "comments" | "logs" | "attachment">("map");
  const [lastAddedStopId, setLastAddedStopId] = useState<string | null>(null);
  const today = format(new Date(), "yyyy-MM-dd");
  const stopRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [mileageRates, setMileageRates] = useState([]);
  const [expenseLogs, setExpenseLogs] = useState<ExpenseComment[]>([]);
  const [commentError, setCommentError] = useState<string | null>(null);

  const [comments, setComments] = useState<ExpenseComment[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);

  const abortControllerRef = useRef<AbortController | null>(null);

  const isUpdateFlow = mode === "edit" || editMode;

  const [newComment, setNewComment] = useState<string>();
  const [postingComment, setPostingComment] = useState(false);

  const [fileIds, setFileIds] = useState<string[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [attachmentLoading, setAttachmentLoading] = useState(true);

  const {
    templateEntities,
    entityOptions,
    entityDropdownOpen,
    setEntityDropdownOpen,
    extractCustomAttributes,
  } = useTemplateEntities(form, "mileage", expenseData);
  
  const generateUploadUrl = async (file: File): Promise<{
    downloadUrl: string;
    uploadUrl: string;
    fileId: string;
  }> => {
    try {
      const res = await expenseService.getUploadUrl({ type: "RECEIPT", name: file.name });
      return { uploadUrl: res.data.data.upload_url, downloadUrl: res.data.data.download_url, fileId: res.data.data.id };
    } catch (error) {
      console.log(error);
      throw error;
    }
  };

  const handlePostComment = async () => {
    if (!expenseData?.id || !newComment?.trim() || postingComment) return;

    setPostingComment(true);
    setCommentError(null);

    try {
      await expenseService.postExpenseComment(
        expenseData?.id,
        newComment.trim(),
        false
      );
      // Refetch comments to get the updated list with the new comment
      const fetchedComments = await expenseService.getExpenseComments(
        expenseData?.id
      );
      // Sort comments by created_at timestamp (oldest first)
      const sortedComments = [...fetchedComments.filter((c) => !c.action)].sort(
        (a, b) => {
          const dateA = new Date(a.created_at).getTime();
          const dateB = new Date(b.created_at).getTime();
          return dateA - dateB;
        }
      );
      setComments(sortedComments);
      setNewComment("");
      toast.success("Comment posted successfully");
    } catch (error: any) {
      console.error("Error posting comment:", error);
      const errorMessage =
        error.response?.data?.message || "Failed to post comment";
      setCommentError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setPostingComment(false);
    }
  };

  const isStartEndLocationLocked =
    (mode === "view" && !editMode) || hasPrefilledLocations;
  const renderPrimaryButtonContent = () => {
    if (loading) {
      return (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          {mode === "create" ? "Creating..." : "Updating..."}
        </>
      );
    }

    if (isCalculating) {
      return (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Calculating...
        </>
      );
    }

    if (saving) {
      return (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Saving...
        </>
      );
    }

    return isUpdateFlow ? "Update Expense" : "Create Expense";
  };

  const getMileageRates = async () => {
    try {
      const res = await expenseService.getMileageRates();
      setMileageRates(res.data.data);
    } catch (error) {
      throw error;
    }
  };

  const extractDistance = (distanceStr: string) => {
    const match = distanceStr.match(/(\d+\.?\d*)/);
    return match ? parseFloat(match[1]) : 0;
  };

  const extractAmount = (amountStr: string) => {
    // Remove currency symbols, commas, and parse number
    const cleaned = amountStr.replace(/[\$€₹,\s]/g, "");
    const match = cleaned.match(/(\d+\.?\d*)/);
    return match ? parseFloat(match[1]) : 0;
  };

  const calculateMileageCost = async (
    originId: string,
    destinationId: string,
    vehicle: string,
    isRoundTrip: boolean = false,
    stopsOverride?: { id: string; location: string; locationId: string }[]
  ) => {
    if (!originId || !destinationId || !vehicle) return;

    const orgId = getOrgIdFromToken();
    if (!orgId) return;

    setIsCalculating(true);
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // 🔸 Create a new controller for this request
    const controller = new AbortController();
    abortControllerRef.current = controller;
    try {
      const destinations: string[] = [];
      const stopsToUse = stopsOverride || formData.stops;

      stopsToUse.forEach((stop) => {
        if (stop.locationId) {
          destinations.push(stop.locationId);
        }
      });

      if (destinationId) {
        destinations.push(destinationId);
      }
      const costData = await placesService.getMileageCost({
        originPlaceId: originId,
        destinationPlaceIds:
          destinations.length > 0 ? destinations : destinationId,
        vehicle: vehicle,
        isRoundTrip,
        signal: controller.signal,
      });

      if (costData) {
        const calculatedDistance = costData.total_distance || 0;
        // Use distance_unit from API response (already in correct unit - MILES for USD/EUR, KM for INR)
        const formattedDistance = formatDistance(
          calculatedDistance,
          costData.distance_unit
        );
        const formattedAmount = formatCurrency(
          costData.cost,
          orgSettings.currency
        );
        const formattedChargeableDistance = costData.chargeable_distance
          ? formatDistance(costData.chargeable_distance, costData.distance_unit)
          : formatDistance(0, costData.distance_unit);

        setMileagePrice(costData.mileage_info?.price || null);
        setChargeableDistanceValue(costData.chargeable_distance || null);

        setFormData((prev) => ({
          ...prev,
          distance: formattedDistance,
          chargeableDistance: formattedChargeableDistance,
          amount: formattedAmount,
        }));
        console.log(formattedChargeableDistance);
        form.setValue("distance", formattedDistance);
        form.setValue("chargeableDistance", formattedChargeableDistance);
        form.setValue("amount", formattedAmount);

        if (costData.map_url) {
          setMapUrl(costData.map_url);
        }
      }
      setIsCalculating(false);
    } catch (error: any) {
      if (error.name === "CanceledError") {
        return;
      }
      setIsCalculating(false);
    }
  };

  const loadMileagePolicies = async () => {
    setLoadingPolicies(true);
    try {
      const allPolicies = await expenseService.getAllPoliciesWithCategories();

      const mileagePolicies = allPolicies.filter((policy: Policy) => {
        const policyName = policy.name?.toLowerCase() || "";
        const policyDescription = policy.description?.toLowerCase() || "";
        const policyType = policy.policy_type?.toLowerCase() || "";

        return (
          policyName.includes("mileage") ||
          policyName.includes("mile") ||
          policyDescription.includes("mileage") ||
          policyDescription.includes("mile") ||
          policyType.includes("mileage") ||
          policyType.includes("mile") ||
          policy.categories?.some((category) => {
            const categoryName = category.name?.toLowerCase() || "";
            const categoryType = category.category_type?.toLowerCase() || "";
            return (
              categoryName.includes("mileage") ||
              categoryName.includes("mile") ||
              categoryType.includes("mileage") ||
              categoryType.includes("mile")
            );
          })
        );
      });

      setPolicies(mileagePolicies);
      setCategories(mileagePolicies[0]?.categories || []);

      if (mileagePolicies.length > 0) {
        const firstPolicy = mileagePolicies[0];
        setSelectedPolicy(firstPolicy);
        setFormData((prev) => ({ ...prev, policyId: firstPolicy.id }));

        form.setValue("policyId", firstPolicy.id);

        if (firstPolicy.categories && firstPolicy.categories.length > 0) {
          const firstCategory = firstPolicy.categories[0];
          setFormData((prev) => ({ ...prev, categoryId: firstCategory.id }));
        }
      }
    } catch (error) {
      console.error("Error loading mileage policies:", error);
      toast.error("Failed to load policies");
    } finally {
      setLoadingPolicies(false);
    }
  };

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

  const handleMapFullscreen = () => {
    setIsMapFullscreen(true);
  };

  const handleMapDownload = () => {
    if (mapUrl) {
      const a = document.createElement("a");
      a.href = mapUrl;
      a.download = "mileage-route-map.png";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData((prev) => {
      const updatedData = {
        ...prev,
        [field]: value,
      };

      if (field === "vehiclesType" || field === "isRoundTrip") {
        const originId = startLocation?.place_id || updatedData.startLocationId;
        const destId = endLocation?.place_id || updatedData.endLocationId;
        const selectedVehicleId =
          field === "vehiclesType"
            ? (value as string)
            : updatedData.vehiclesType;
        const triggerCalculation = (
          oid: string,
          did: string,
          vehicleId: string
        ) => {
          calculateMileageCost(
            oid,
            did,
            vehicleId,
            field === "vehiclesType"
              ? updatedData.isRoundTrip
              : (value as boolean)
          );
        };

        if (originId && destId) {
          triggerCalculation(originId, destId, selectedVehicleId);
        } else if (updatedData.startLocation && updatedData.endLocation) {
          (async () => {
            try {
              const [startSuggestions, endSuggestions] = await Promise.all([
                placesService.getSuggestions(updatedData.startLocation),
                placesService.getSuggestions(updatedData.endLocation),
              ]);

              const startPlace =
                startSuggestions.find(
                  (s) => s.description === updatedData.startLocation
                ) || startSuggestions[0];
              const endPlace =
                endSuggestions.find(
                  (s) => s.description === updatedData.endLocation
                ) || endSuggestions[0];

              if (startPlace && endPlace) {
                setStartLocation(startPlace);
                setEndLocation(endPlace);
                setFormData((prev) => ({
                  ...prev,
                  startLocationId: startPlace.place_id,
                  endLocationId: endPlace.place_id,
                }));
                triggerCalculation(
                  startPlace.place_id,
                  endPlace.place_id,
                  selectedVehicleId
                );
              } else {
                toast.error(
                  "Unable to find location place IDs. Please reselect locations."
                );
              }
            } catch (error) {
              console.error("Error looking up locations:", error);
              toast.error(
                "Unable to calculate: Please ensure both locations are properly selected"
              );
            }
          })();
        } else {
          toast.error("Please select both start and end locations");
        }

        form.setValue(field as keyof MileageFormValues, value);
      } else if (field === "policyId") {
        const policy = policies.find((p) => p.id === value);
        if (policy?.categories && policy.categories.length > 0) {
          const firstCategory = policy.categories[0];
          setFormData((prev) => ({ ...prev, categoryId: firstCategory.id }));
          form.setValue("categoryId", firstCategory.id);
        } else {
          setFormData((prev) => ({ ...prev, categoryId: "" }));
          form.setValue("categoryId", "");
        }
        form.setValue("policyId", value as string);
      } else if (field === "categoryId") {
        form.setValue("categoryId", value as string);
      } else {
        form.setValue(field as keyof MileageFormValues, value);
      }

      return updatedData;
    });
  };

  const handleSubmit = async (values: MileageFormValues) => {
    const orgId = getOrgIdFromToken();
    if (!orgId) {
      toast.error("Organization ID not found");
      return;
    }
    if (isCalculating) {
      toast.info(
        "Please wait for distance and amount calculation to complete..."
      );
      return;
    }
    setLoading(true);
    const mileage_meta: any = {
      trip_purpose: "business_travel",
      notes: values.isRoundTrip ? "Round trip" : "",
    };

    if (formData.stops && formData.stops.length > 0) {
      mileage_meta.stops = formData.stops.map((stop) => ({
        id: stop.id,
        location: stop.location,
        locationId: stop.locationId,
      }));
    }

    if (mapUrl) {
      mileage_meta.map_url = mapUrl;
    }

    const customAttributes = await extractCustomAttributes();

    const submitData = {
      expense_policy_id: values.policyId,
      category_id: values.categoryId,
      amount: extractAmount(values.amount),
      expense_date: values.expenseDate,
      description: values.description,
      start_location: values.startLocation,
      end_location: values.endLocation,
      distance: chargeableDistanceValue ?? extractDistance(values.distance),
      mileage_rate_id: values.vehiclesType,
      is_round_trip: values.isRoundTrip.toString(),
      mileage_meta: mileage_meta,
      vendor: expenseData?.vendor || "Mileage Reimbursement",
      ...(fileIds && { file_ids: fileIds }),
      ...(Object.keys(customAttributes).length > 0 && { custom_attributes: customAttributes })
    };

    try {
      if (mode === "create") {
        trackEvent("Create Mileage Button Clicked", {
          button_name: "Create Mileage",
        });
        await placesService.createMileageExpense(submitData, orgId);
        toast.success("Successfully created mileage expense");
        navigate("/expenses");
      } else if (mode === "edit" && onUpdate) {
        trackEvent("Update Mileage Button Clicked", {
          button_name: "Update Mileage",
        });
        await onUpdate(submitData);
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to save mileage expense");
      setLoading(false);
    } finally {
      setLoading(false);
    }
  };

  const handleStartLocationSelect = (place: PlaceSuggestion) => {
    setStartLocation(place);
    setFormData((prev) => ({
      ...prev,
      startLocation: place.description,
      startLocationId: place.place_id,
    }));
    form.setValue("startLocation", place.description);
  };

  const handleStartLocationChange = (value: string) => {
    if (!value || value.trim() === "") {
      setStartLocation(null);
      setFormData((prev) => ({
        ...prev,
        startLocation: "",
        startLocationId: "",
        distance: "0 km",
        amount: "₹0.00",
      }));
      form.setValue("startLocation", "");
      form.setValue("distance", "0 km");
      form.setValue("amount", "₹0.00");
      setMapUrl(null);
    }
  };

  const handleEndLocationSelect = (place: PlaceSuggestion) => {
    setEndLocation(place);
    setFormData((prev) => ({
      ...prev,
      endLocation: place.description,
      endLocationId: place.place_id,
    }));
    form.setValue("endLocation", place.description);
  };

  const handleEndLocationChange = (value: string) => {
    if (!value || value.trim() === "") {
      setEndLocation(null);
      setFormData((prev) => ({
        ...prev,
        endLocation: "",
        endLocationId: "",
        distance: "0 km",
        amount: "₹0.00",
      }));
      form.setValue("endLocation", "");
      form.setValue("distance", "0 km");
      form.setValue("amount", "₹0.00");
      setMapUrl(null);
    }
  };

  const handleStopLocationSelect = (stopId: string, place: PlaceSuggestion) => {
    setFormData((prev) => ({
      ...prev,
      stops: prev.stops.map((stop) =>
        stop.id === stopId
          ? { ...stop, location: place.description, locationId: place.place_id }
          : stop
      ),
    }));

    if (startLocation && endLocation && formData.vehiclesType) {
      setTimeout(() => {
        calculateMileageCost(
          startLocation.place_id,
          endLocation.place_id,
          formData.vehiclesType,
          formData.isRoundTrip
        );
      }, 100);
    }
  };

  const handleAddStop = (insertAtIndex?: number) => {
    const newStop = {
      id: `stop-${Date.now()}`,
      location: "",
      locationId: "",
    };
    setFormData((prev) => {
      const stops = [...prev.stops];
      if (insertAtIndex !== undefined) {
        stops.splice(insertAtIndex, 0, newStop);
      } else {
        stops.push(newStop);
      }
      const isRoundTrip = stops.length > 0 ? false : prev.isRoundTrip;
      return { ...prev, stops, isRoundTrip };
    });
    form.setValue("isRoundTrip", false);
    setLastAddedStopId(newStop.id);
  };

  const handleRemoveStop = (stopId: string) => {
    delete stopRefs.current[stopId];
    setFormData((prev) => {
      const updatedStops = prev.stops.filter((stop) => stop.id !== stopId);
      const originId = startLocation?.place_id || prev.startLocationId;
      const destId = endLocation?.place_id || prev.endLocationId;

      if (originId && destId && prev.vehiclesType) {
        setTimeout(() => {
          calculateMileageCost(
            originId,
            destId,
            prev.vehiclesType,
            prev.isRoundTrip,
            updatedStops
          );
        }, 100);
      }

      return {
        ...prev,
        stops: updatedStops,
      };
    });
  };

  const handleStopLocationChange = (stopId: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      stops: prev.stops.map((stop) =>
        stop.id === stopId ? { ...stop, location: value } : stop
      ),
    }));
  };

  useEffect(() => {
    if (expenseData && policies.length > 0) {
      setIsLoadingExistingData(true);

      const stops =
        expenseData.mileage_meta?.stops?.map((stop: any) => ({
          id: stop.id || `stop-${Date.now()}`,
          location: stop.location || "",
          locationId: stop.locationId || "",
        })) || [];

      if (expenseData.file_ids) {
        setFileIds(expenseData.file_ids);
      }

      const data = {
        startLocation: expenseData.start_location || "",
        startLocationId: "",
        endLocation: expenseData.end_location || "",
        endLocationId: "",
        distance: expenseData.distance
          ? formatDistance(
              typeof expenseData.distance === "string"
                ? parseFloat(expenseData.distance) || 0
                : expenseData.distance,
              expenseData.distance_unit || getDistanceUnit().toUpperCase()
            )
          : "",
        chargeableDistance: (expenseData as any).chargeable_distance || "",
        amount:
          formatCurrency(expenseData.amount, orgSettings.currency) ||
          formatCurrency(0, orgSettings.currency),
        description: expenseData.description || "",
        vehiclesType: expenseData.mileage_rate_id,
        expenseDate:
          expenseData.expense_date
            ? format(parseLocalDate(expenseData.expense_date), "yyyy-MM-dd")
            : "",
        isRoundTrip: expenseData.is_round_trip,
        policyId: expenseData.expense_policy_id || "",
        categoryId: expenseData.category_id || "",
        stops: stops,
      };
      // const sel = mileageRates.find((rate: any) => rate.id === +expenseData.mileage_rate_id )
      // setSelectedVehicle(sel);
      setFormData(data);
      if (expenseData.mileage_meta?.map_url) {
        setMapUrl(expenseData.mileage_meta.map_url);
      }

      form.setValue("startLocation", data.startLocation);
      form.setValue("endLocation", data.endLocation);
      form.setValue("distance", data.distance);
      form.setValue("amount", data.amount);
      form.setValue("description", data.description);
      form.setValue("vehiclesType", data.vehiclesType);
      form.setValue("expenseDate", data.expenseDate);
      form.setValue("isRoundTrip", data.isRoundTrip);
      form.setValue("policyId", data.policyId);
      form.setValue("categoryId", data.categoryId);

      const policy = policies.find((p) => p.id === data.policyId);
      if (policy) {
        setSelectedPolicy(policy);
        if (policy.categories) {
          setCategories(policy.categories);
        }
      }

      setTimeout(() => setIsLoadingExistingData(false), 100);
    }
  }, [expenseData, policies, form, mileageRates]);

  useEffect(() => {
    const fetchComments = async () => {
      if (expenseData?.id) {
        setLoadingComments(true);
        setCommentError(null);
        try {
          const fetchedComments = await expenseService.getExpenseComments(
            expenseData?.id
          );
          // Sort comments by created_at timestamp (oldest first)
          const sortedComments = [
            ...fetchedComments.filter((c) => !c.action),
          ].sort((a, b) => {
            const dateA = new Date(a.created_at).getTime();
            const dateB = new Date(b.created_at).getTime();
            return dateA - dateB;
          });
          setComments(sortedComments);
          const sortedLogs = [...fetchedComments.filter((c) => c.action)].sort(
            (a, b) => {
              const dateA = new Date(a.created_at).getTime();
              const dateB = new Date(b.created_at).getTime();
              return dateA - dateB;
            }
          );
          setExpenseLogs(sortedLogs);
        } catch (error: any) {
          console.error("Error fetching comments:", error);
          setCommentError(
            error.response?.data?.message || "Failed to load comments"
          );
        } finally {
          setLoadingComments(false);
        }
      }
    };

    fetchComments();
  }, [expenseData?.id]);

  useEffect(() => {
    let isMounted = true;

    const preloadDefaultLocations = async () => {
      try {
        const defaults = await placesService.getDefaultStartEndLocations();

        if (!isMounted) {
          return;
        }

        const startLabel = defaults?.start_location_name ?? "";
        const endLabel = defaults?.end_location_name ?? "";
        const hasDefaults = Boolean(
          defaults?.start_location &&
            defaults?.end_location &&
            startLabel &&
            endLabel
        );

        setHasPrefilledLocations(hasDefaults);

        if (hasDefaults && defaults && mode === "create" && !expenseData) {
          const startPlace: PlaceSuggestion = {
            place_id: defaults.start_location,
            description: startLabel,
            main_text: startLabel,
            secondary_text: "",
            types: [],
          };

          const endPlace: PlaceSuggestion = {
            place_id: defaults.end_location,
            description: endLabel,
            main_text: endLabel,
            secondary_text: "",
            types: [],
          };

          setStartLocation(startPlace);
          setEndLocation(endPlace);
          setFormData((prev) => ({
            ...prev,
            startLocation: startLabel,
            startLocationId: defaults.start_location,
            endLocation: endLabel,
            endLocationId: defaults.end_location,
          }));

          form.setValue("startLocation", startLabel);
          form.setValue("endLocation", endLabel);
        }
      } catch (error) {
        if (isMounted) {
          setHasPrefilledLocations(false);
        }
        console.error("Error preloading default mileage locations:", error);
      }
    };

    preloadDefaultLocations();

    return () => {
      isMounted = false;
    };
  }, [mode, expenseData, form]);

  useEffect(() => {
    if (
      startLocation &&
      endLocation &&
      !isLoadingExistingData &&
      mode === "create"
    ) {
      calculateMileageCost(
        startLocation?.place_id,
        endLocation?.place_id,
        formData.vehiclesType,
        formData.isRoundTrip
      );
    }
  }, [
    startLocation,
    endLocation,
    isLoadingExistingData,
    mode,
    formData.stops.map((s) => s.locationId).join(","),
    formData.vehiclesType,
  ]);

  useEffect(() => {
    if (mode === "view" && isEditable && !isEditing) {
      setEditMode(false);
    } else if (mode === "view" && isEditable && isEditing) {
      setEditMode(true);
    }
  }, [mode, isEditable, isEditing]);

  useEffect(() => {
    if (lastAddedStopId) {
      const stopElement = stopRefs.current[lastAddedStopId];
      if (stopElement) {
        stopElement.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      setLastAddedStopId(null);
    }
  }, [formData.stops, lastAddedStopId]);

    useEffect(() => {
      if (!fileIds.length) {
        setAttachmentLoading(false);
        return;
      }
    
      const existingMap = new Map(
        attachments.map((a) => [a.fileId, a.url])
      );
    
      const fileIdsToFetch = fileIds.filter(
        (id) => !existingMap.has(id) || !existingMap.get(id)
      );
    
      if (!fileIdsToFetch.length) return;
    
      let cancelled = false;
    
      const fetchUrls = async () => {
        try {
          const fetched = await Promise.all(
            fileIdsToFetch.map(async (fileId) => {
              const res = await expenseService.generatePreviewUrl(fileId);
              return { fileId, url: res.data.data.download_url };
            })
          );
    
          if (cancelled) return;
    
          setAttachments((prev) => {
            const map = new Map(prev.map((a) => [a.fileId, a]));
    
            fetched.forEach((a) => {
              map.set(a.fileId, a);
            });
    
            return Array.from(map.values());
          });
        } catch (err) {
          console.error("Failed to fetch attachment URLs", err);
        } finally {
          setAttachmentLoading(false);
        }
      };
    
      fetchUrls();
    
      return () => {
        cancelled = true;
      };
    }, [fileIds]);

  useEffect(() => {
    loadMileagePolicies();
    getMileageRates();
  }, []);

  return (
    <>
      {expenseData?.original_expense_id && (
        <Alert className="bg-yellow-50 border-yellow-200 mb-4">
          <Copy className="h-4 w-4 text-yellow-600" />
          <AlertTitle className="text-yellow-800">
            Duplicate Expense Detected
          </AlertTitle>
          <AlertDescription className="text-yellow-700">
            This expense has been flagged as a duplicate.
            <Button
              variant="link"
              className="p-0 h-auto text-yellow-700 underline ml-1"
              onClick={() =>
                navigate(`/expenses/${expenseData.original_expense_id}`)
              }
            >
              View original expense <ExternalLink className="ml-1 h-3 w-3" />
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <div
          className={`rounded-2xl border border-[#EBEBEB] bg-white shadow-sm min-h-full ${
            pathname.includes("create")
              ? "md:h-[calc(100vh-18rem)]"
              : "md:h-[calc(100vh-13rem)]"
          } md:overflow-y-auto`}
        >
          <div className="flex flex-col h-full">
            <div className="sticky top-0 z-10 bg-white border-b border-[#EBEBEB] p-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                {[
                  { key: "map", label: "Map" },
                  { key: "attachment", label: "Attachment" },
                  { key: "comments", label: "Comments" },
                  { key: "logs", label: "Logs" },
                ].map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() =>
                      setActiveMapTab(tab.key as "map" | "comments")
                    }
                    className={cn(
                      "rounded-full px-4 py-2 text-sm font-semibold transition-all",
                      activeMapTab === tab.key
                        ? "bg-[#0D9C99]/10 text-[#0D9C99]"
                        : "text-[#64748B] hover:text-[#1A1A1A]"
                    )}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="h-full flex-1 overflow-hidden flex flex-col">
              {activeMapTab === "map" ? (
                <div className="flex-1 md:overflow-hidden">
                  {isCalculating ? (
                    <div className="flex flex-col items-center justify-center gap-3 rounded-b-2xl bg-gray-50 p-16 text-center md:h-full">
                      <div className="mx-auto h-16 w-16 text-gray-300">
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
                      <div>
                        <p className="text-sm font-medium text-gray-700">
                          Loading Map View...
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Route visualization will appear here
                        </p>
                      </div>
                    </div>
                  ) : mapUrl ? (
                    <div className="flex items-start justify-center rounded-b-2xl bg-gray-50 pt-4 px-6 pb-6 overflow-auto md:h-full">
                      <img
                        src={mapUrl}
                        alt="Route Map"
                        className="w-full rounded-xl object-contain cursor-pointer"
                        onClick={handleMapFullscreen}
                      />
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center gap-3 rounded-b-2xl bg-gray-50 p-16 text-center h-[100%]">
                      <div className="mx-auto h-16 w-16 text-gray-300">
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
                      <div>
                        <p className="text-sm font-medium text-gray-700">
                          Map View
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Route visualization will appear here
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              ) : activeMapTab === "attachment" ?
                <AttachmentViewer
                  activeTab={activeMapTab}
                  attachments={attachments}
                  isLoadingReceipt={attachmentLoading}
                  setAttachments={setAttachments}
                  fileIds={fileIds}
                  setFileIds={setFileIds}
                  generateUploadUrl={generateUploadUrl}
                />
              : activeMapTab === "comments" ? (
                <ExpenseComments
                  expenseId={expenseData?.id}
                  readOnly={false}
                  comments={comments}
                  commentError={commentError}
                  loadingComments={loadingComments}
                  postComment={handlePostComment}
                  postingComment={postingComment}
                  newComment={newComment || ""}
                  setNewComment={setNewComment}
                />
              ) : (
                <ExpenseLogs
                  logs={expenseLogs}
                  loading={loadingComments}
                  error={commentError || ""}
                />
              )}
            </div>
          </div>
        </div>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)}>
            <div
              className={`rounded-2xl border border-[#EBEBEB] bg-white shadow-sm min-h-full ${
                pathname.includes("create")
                  ? "md:h-[calc(100vh-16rem)]"
                  : "md:h-[calc(100vh-13rem)]"
              } md:overflow-y-auto`}
            >
              <div className="px-6 py-4 space-y-6">
                {/* 🚗 Route Section */}
                <div className="space-y-2">
                  <FormField
                    control={form.control}
                    name="startLocation"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <LocationAutocomplete
                            value={formData.startLocation}
                            onChange={(v) => {
                              handleStartLocationChange(v);
                              handleInputChange("startLocation", v);
                              field.onChange(v);
                            }}
                            onSelect={handleStartLocationSelect}
                            disabled={isStartEndLocationLocked}
                            placeholder="Start Location"
                            customIcon={
                              formData.startLocation ? (
                                <span className="text-gray-400 font-bold text-xs">
                                  A
                                </span>
                              ) : null
                            }
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Add Stop button after start location - always available */}
                  <div className="flex justify-end">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => handleAddStop(0)}
                      disabled={mode === "view" && !editMode}
                      className="text-[#0D9C99] border-[#0D9C99]/30 hover:bg-[#0D9C99]/10 px-2 py-0.5 text-xs h-7 font-semibold"
                    >
                      + ADD
                    </Button>
                  </div>

                  {/* Stops */}
                  {formData.stops.map((stop, index) => (
                    <div
                      key={stop.id}
                      ref={(el) => {
                        stopRefs.current[stop.id] = el;
                      }}
                      className="space-y-2"
                    >
                      <LocationAutocomplete
                        value={stop.location}
                        onChange={(v) => handleStopLocationChange(stop.id, v)}
                        onSelect={(place) =>
                          handleStopLocationSelect(stop.id, place)
                        }
                        disabled={mode === "view" && !editMode}
                        placeholder={`Stop ${index + 1}`}
                        customIcon={
                          stop.location ? (
                            <span className="text-gray-400 font-bold text-xs">
                              {String.fromCharCode(66 + index)}
                            </span>
                          ) : null
                        }
                      />
                      <div className="flex items-center gap-2 justify-end">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleAddStop(index + 1)}
                          disabled={mode === "view" && !editMode}
                          className="text-xs text-blue-600 border-blue-300 hover:bg-blue-50 px-2 py-0.5 h-7"
                        >
                          + ADD
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleRemoveStop(stop.id)}
                          disabled={mode === "view" && !editMode}
                          className="text-xs text-red-600 border-red-300 hover:bg-red-50 px-2 py-0.5 h-7 font-semibold"
                        >
                          X REMOVE
                        </Button>
                      </div>
                    </div>
                  ))}

                  <FormField
                    control={form.control}
                    name="endLocation"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <LocationAutocomplete
                            value={formData.endLocation}
                            onChange={(v) => {
                              handleEndLocationChange(v);
                              handleInputChange("endLocation", v);
                              field.onChange(v);
                            }}
                            onSelect={handleEndLocationSelect}
                            disabled={isStartEndLocationLocked}
                            placeholder="End Location"
                            customIcon={
                              formData.endLocation ? (
                                <span className="text-gray-400 font-bold text-xs">
                                  {String.fromCharCode(
                                    65 + formData.stops.length + 1
                                  )}
                                </span>
                              ) : null
                            }
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Round Trip Toggle */}
                  <div className="flex items-center justify-end gap-3 my-2">
                    <Label
                      className={`text-sm font-medium ${
                        formData.stops.length > 0
                          ? "text-gray-400"
                          : "text-gray-700"
                      }`}
                    >
                      Round Trip
                    </Label>
                    <Switch
                      checked={formData.isRoundTrip}
                      onCheckedChange={(checked) => {
                        handleInputChange("isRoundTrip", checked);
                        form.setValue("isRoundTrip", checked);
                      }}
                      disabled={
                        (mode === "view" && !editMode) ||
                        formData.stops.length > 0
                      }
                    />
                  </div>
                </div>

                {/* Vehicle and Distance Section */}
                <FormField
                  control={form.control}
                  name="vehiclesType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Vehicle *</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={(v) => {
                          handleInputChange("vehiclesType", v);
                          // const sel = mileageRates.find(
                          //   (rate: any) => rate.id === +v
                          // );
                          // setSelectedVehicle(sel);
                          field.onChange(v);
                        }}
                        disabled={mode === "view" && !editMode}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select vehicle type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {mileageRates?.map((v: any) => (
                            <SelectItem key={v.id} value={String(v.id)}>
                              {v.vehicle_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="categoryId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category *</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={(v) => {
                          handleInputChange("categoryId", v);
                          field.onChange(v);
                        }}
                        disabled={
                          loadingPolicies || (mode === "view" && !editMode)
                        }
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select Category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {categories?.map((c) => (
                            <SelectItem key={c.id} value={c.id}>
                              {c.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="distance"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Distance *</FormLabel>
                      <div className="relative">
                        <FormControl>
                          <Input
                            type="text"
                            value={
                              isCalculating
                                ? "Calculating..."
                                : formData.distance || "Auto-calculated"
                            }
                            onChange={(e) => {
                              handleInputChange("distance", e.target.value);
                              field.onChange(e.target.value);
                            }}
                            className="bg-gray-50 text-gray-500"
                            disabled={true}
                          />
                        </FormControl>
                        {isCalculating && (
                          <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4 animate-spin" />
                        )}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {!usesMetricSystem() && mode === "create" && (
                  <FormField
                    control={form.control}
                    name="chargeableDistance"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Chargeable Distance</FormLabel>
                        <div className="relative">
                          <FormControl>
                            <Input
                              type="text"
                              value={
                                isCalculating
                                  ? "Calculating..."
                                  : formData.chargeableDistance ||
                                    "Auto-calculated"
                              }
                              onChange={(e) => {
                                handleInputChange(
                                  "chargeableDistance",
                                  e.target.value
                                );
                                field.onChange(e.target.value);
                              }}
                              className="bg-gray-50 text-gray-500"
                              disabled={true}
                            />
                          </FormControl>
                          {isCalculating && (
                            <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4 animate-spin" />
                          )}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                <div className="space-y-2">
                  <FormLabel>Policy</FormLabel>
                  <Input
                    type="text"
                    value={selectedPolicy?.name || ""}
                    className="bg-gray-50 text-gray-500"
                    disabled
                  />
                </div>

                <FormField
                  control={form.control}
                  name="expenseDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date *</FormLabel>
                      <FormControl>
                        <DateField
                          id="startDate"
                          value={field.value}
                          onChange={(value) => {
                            handleInputChange("expenseDate", value);
                            field.onChange(value);
                          }}
                          disabled={mode === "view"}
                          maxDate={today}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Purpose *</FormLabel>
                      <FormControl>
                        <Textarea
                          value={field.value}
                          onChange={(e) => {
                            handleInputChange("description", e.target.value);
                            field.onChange(e.target.value);
                          }}
                          rows={4}
                          disabled={mode === "view" && !editMode}
                          className="resize-none"
                          placeholder="Enter purpose of travel"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {templateEntities?.map((entity) => {
                  const entityId = entity?.entity_id || entity?.id || "";
                  if (!entityId) return null;

                  return (
                    <TemplateEntityField
                      key={entityId}
                      control={form.control}
                      entity={entity}
                      entityOptions={entityOptions[entityId] || []}
                      dropdownOpen={entityDropdownOpen[entityId] || false}
                      onDropdownOpenChange={(open) =>
                        setEntityDropdownOpen((prev) => ({
                          ...prev,
                          [entityId]: open,
                        }))
                      }
                      disabled={mode === "view" && !editMode}
                    />
                  );
                })}
              </div>
            </div>

            <>
              <div className="fixed inset-x-4 bottom-4 z-30 flex flex-col gap-3 rounded-2xl border border-[#EBEBEB] bg-white/95 p-4 shadow-lg backdrop-blur supports-[backdrop-filter]:bg-white/80 md:hidden">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <Label className="text-sm font-semibold text-[#64748B]">
                      Total Amount
                    </Label>
                    <div className="text-2xl font-bold text-[#0D9C99] mt-1">
                      {formData.amount ||
                        formatCurrency(0, orgSettings.currency)}
                    </div>
                    {chargeableDistanceValue &&
                    mileagePrice &&
                    !usesMetricSystem() ? (
                      <p className="text-sm font-semibold text-gray-600 mt-1">
                        {chargeableDistanceValue.toFixed(2)} {getDistanceUnit()}{" "}
                        × {formatCurrency(mileagePrice, orgSettings.currency)}{" "}
                        per {getDistanceUnit()}
                      </p>
                    ) : (
                      formData.distance && (
                        <p className="text-sm text-gray-500">
                          {formData.distance}
                        </p>
                      )
                    )}
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={onCancel}
                    style={{
                      width: "auto",
                      minWidth: "65px",
                      height: "31px",
                      paddingTop: "8px",
                      paddingRight: "12px",
                      paddingBottom: "8px",
                      paddingLeft: "12px",
                      gap: "8px",
                      borderRadius: "4px",
                      border: "1px solid #0D9C99",
                      fontFamily: "Inter",
                      fontWeight: 600,
                      fontSize: "12px",
                      lineHeight: "100%",
                      letterSpacing: "0%",
                      color: "#0D9C99",
                      backgroundColor: "transparent",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = "#f5f5f5";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = "transparent";
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={saving || isCalculating}
                    style={{
                      width: "auto",
                      minWidth: "65px",
                      height: "31px",
                      paddingTop: "8px",
                      paddingRight: "12px",
                      paddingBottom: "8px",
                      paddingLeft: "12px",
                      gap: "8px",
                      borderRadius: "4px",
                      border: "1px solid #0D9C99",
                      fontFamily: "Inter",
                      fontWeight: 600,
                      fontSize: "12px",
                      lineHeight: "100%",
                      letterSpacing: "0%",
                      color: "#FFFFFF",
                      backgroundColor: "#0D9C99",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = "#0a7d7a";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = "#0D9C99";
                    }}
                  >
                    {renderPrimaryButtonContent()}
                  </Button>
                </div>
              </div>

              {(mode === "create" || mode === "edit" || editMode) && (
                <FormActionFooter
                  secondaryButton={{
                    label: "Back",
                    onClick: onCancel || (() => navigate(-1)),
                    disabled: loading || saving || isCalculating,
                  }}
                  primaryButton={{
                    label: isUpdateFlow ? "Update Expense" : "Create Expense",
                    onClick: () => {
                      if (!isCalculating) {
                        form.handleSubmit(handleSubmit)();
                      }
                    },
                    type: "button",
                    disabled: loading || saving || isCalculating,
                    loading: loading || saving,
                    loadingText: loading 
                      ? (isUpdateFlow ? "Updating..." : "Creating...")
                      : saving 
                        ? "Saving..." 
                        : undefined,
                  }}
                  totalAmount={formData.amount || formatCurrency(0, orgSettings.currency)}
                  calculationDetails={
                    chargeableDistanceValue &&
                    mileagePrice &&
                    !usesMetricSystem()
                      ? `${chargeableDistanceValue.toFixed(2)} ${getDistanceUnit()} × ${formatCurrency(mileagePrice, orgSettings.currency)} per ${getDistanceUnit()}`
                      : formData.distance || undefined
                  }
                />
              )}
            </>
          </form>
        </Form>
        {/* Fullscreen Map Modal */}
        {isMapFullscreen && mapUrl && (
          <div className="fixed inset-0 z-50 bg-black bg-opacity-90 flex items-center justify-center p-4">
            <div className="relative w-full h-full flex flex-col">
              {/* Fullscreen Header */}
              <div className="flex items-center justify-between p-4 bg-white border-b border-gray-200">
                <div className="flex items-center gap-4">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Route Map
                  </h3>
                </div>
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
                  <span className="text-sm text-gray-600 min-w-[3rem] text-center">
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
                  <div className="w-px h-6 bg-gray-300 mx-2" />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleMapDownload}
                    className="h-8 px-3 text-xs"
                  >
                    <Download className="h-4 w-4 mr-1" />
                    Download
                  </Button>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsMapFullscreen(false)}
                  className="h-8 w-8 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Fullscreen Content */}
              <div className="flex-1 overflow-auto bg-gray-100 flex items-center justify-center p-4">
                <img
                  src={mapUrl}
                  alt="Route Map Fullscreen"
                  className="max-w-full max-h-full object-contain"
                  style={{
                    transform: `scale(${mapZoom}) rotate(${mapRotation}deg)`,
                    transformOrigin: "center",
                  }}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default MileagePage;
