import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Card, CardContent } from "@/components/ui/card";
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
import { Loader2, ZoomIn, ZoomOut, RotateCw, RefreshCw, Maximize2, Download, X, Copy, ExternalLink } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { LocationAutocomplete } from "@/components/ui/location-autocomplete";
import { placesService, PlaceSuggestion } from "@/services/placesService";
import { expenseService } from "@/services/expenseService";
import { getOrgIdFromToken } from "@/lib/jwtUtils";
import { Expense, Policy, PolicyCategory } from "@/types/expense";
import { toast } from "sonner";
import { format } from "date-fns";
import { DateField } from "@/components/ui/date-field";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

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

  const form = useForm<MileageFormValues>({
    resolver: zodResolver(mileageSchema),
    defaultValues: {
      startLocation: "",
      endLocation: "",
      distance: "",
      amount: "",
      description: "",
      vehiclesType: "",
      expenseDate: new Date().toISOString().split("T")[0],
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
    amount: "",
    description: "",
    vehiclesType: "",
    expenseDate: new Date().toISOString().split("T")[0],
    isRoundTrip: false,
    policyId: "",
    categoryId: "",
    stops: [] as { id: string; location: string; locationId: string }[],
  });

  const [isCalculating, setIsCalculating] = useState(false);
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [categories, setCategories] = useState<PolicyCategory[]>([]);
  const [selectedPolicy, setSelectedPolicy] = useState<Policy | null>(null);
  const [loadingPolicies, setLoadingPolicies] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [startLocation, setStartLocation] = useState<PlaceSuggestion | null>();
  const [endLocation, setEndLocation] = useState<PlaceSuggestion | null>();
  const [isLoadingExistingData, setIsLoadingExistingData] = useState(false);
  const [mapUrl, setMapUrl] = useState<string | null>(null);
  const [mapZoom, setMapZoom] = useState(1);
  const [mapRotation, setMapRotation] = useState(0);
  const [isMapFullscreen, setIsMapFullscreen] = useState(false);
  const today = new Date().toISOString().split("T")[0];

  useEffect(() => {
    if (expenseData && policies.length > 0) {
      setIsLoadingExistingData(true);
      
      const stops = expenseData.mileage_meta?.stops?.map((stop: any) => ({
        id: stop.id || `stop-${Date.now()}`,
        location: stop.location || "",
        locationId: stop.locationId || "",
      })) || [];
      
      const data = {
        startLocation: expenseData.start_location || "",
        startLocationId: "",
        endLocation: expenseData.end_location || "",
        endLocationId: "",
        distance: expenseData.distance ? `${expenseData.distance} km` : "",
        amount: `₹${expenseData.amount.toString()}` || "₹0.00",
        description: expenseData.description || "",
        vehiclesType: getVehicleType(expenseData.vehicle_type || ""),
        expenseDate:
          format(new Date(expenseData.expense_date), "yyyy-MM-dd") || "",
        isRoundTrip: expenseData.is_round_trip,
        policyId: expenseData.expense_policy_id || "",
        categoryId: expenseData.category_id || "",
        stops: stops,
      };
      
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
      
      const policy = policies.find(p => p.id === data.policyId);
      if (policy) {
        setSelectedPolicy(policy);
        if (policy.categories) {
          setCategories(policy.categories);
        }
      }
      
      setTimeout(() => setIsLoadingExistingData(false), 100);
    }
  }, [expenseData, policies, form]);

  useEffect(() => {
    if (mode === "view" && isEditable && !isEditing) {
      setEditMode(false);
    } else if (mode === "view" && isEditable && isEditing) {
      setEditMode(true);
    }
  }, [mode, isEditable, isEditing]);

  const vehicleTypeMapping = {
    car: "FOUR_WHEELERS",
    bike: "TWO_WHEELERS",
    public_transport: "PUBLIC_TRANSPORT",
  };

  const vehicleTypeMappingForCost = {
    car: "four_wheeler",
    bike: "two_wheeler",
    public_transport: "public_transport",
  };

  const extractDistance = (distanceStr: string) => {
    const match = distanceStr.match(/(\d+\.?\d*)/);
    return match ? parseFloat(match[1]) : 0;
  };

  const extractAmount = (amountStr: string) => {
    const match = amountStr.match(/₹?(\d+\.?\d*)/);
    return match ? parseFloat(match[1]) : 0;
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
        
        const triggerCalculation = (oid: string, did: string) => {
          calculateMileageCost(
            oid,
            did,
            field === "vehiclesType" ? (value as string) : updatedData.vehiclesType,
            field === "vehiclesType" ? updatedData.isRoundTrip : (value as boolean)
          );
        };

        if (originId && destId) {
          triggerCalculation(originId, destId);
        } else if (updatedData.startLocation && updatedData.endLocation) {
          (async () => {
            try {
              const [startSuggestions, endSuggestions] = await Promise.all([
                placesService.getSuggestions(updatedData.startLocation),
                placesService.getSuggestions(updatedData.endLocation)
              ]);
              
              const startPlace = startSuggestions.find(s => s.description === updatedData.startLocation) || startSuggestions[0];
              const endPlace = endSuggestions.find(s => s.description === updatedData.endLocation) || endSuggestions[0];
              
              if (startPlace && endPlace) {
                setStartLocation(startPlace);
                setEndLocation(endPlace);
                setFormData((prev) => ({
                  ...prev,
                  startLocationId: startPlace.place_id,
                  endLocationId: endPlace.place_id
                }));
                triggerCalculation(startPlace.place_id, endPlace.place_id);
              } else {
                toast.error("Unable to find location place IDs. Please reselect locations.");
              }
            } catch (error) {
              console.error("Error looking up locations:", error);
              toast.error("Unable to calculate: Please ensure both locations are properly selected");
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
  };

  const handleRemoveStop = (stopId: string) => {
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
    if (startLocation && endLocation && !isLoadingExistingData && mode === "create") {
      calculateMileageCost(
        startLocation?.place_id,
        endLocation?.place_id,
        formData.vehiclesType,
        formData.isRoundTrip
      );
    }
  }, [startLocation, endLocation, isLoadingExistingData, mode, formData.stops, formData.vehiclesType]);

  const handleSubmit = async (values: MileageFormValues) => {
    const orgId = getOrgIdFromToken();
    if (!orgId) {
      toast.error("Organization ID not found");
      return;
    }

    if (isCalculating) {
      toast.info("Please wait for distance and amount calculation to complete...");
      return;
    }
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

    const submitData = {
      expense_policy_id: values.policyId,
      category_id: values.categoryId,
      amount: extractAmount(values.amount),
      expense_date: values.expenseDate,
      description: values.description,
      start_location: values.startLocation,
      end_location: values.endLocation,
      distance: extractDistance(values.distance),
      distance_unit: "KM",
      vehicle_type:
        vehicleTypeMapping[
        values.vehiclesType as keyof typeof vehicleTypeMapping
        ] || "four_wheeler",
      is_round_trip: values.isRoundTrip.toString(),
      mileage_meta: mileage_meta,
      vendor: expenseData?.vendor || "Mileage Reimbursement",
    };

    try {
      if (mode === "create") {
        await placesService.createMileageExpense(submitData, orgId);
        toast.success("Successfully created mileage expense");
        navigate("/expenses");
      } else if (mode === "edit" && onUpdate) {
        await onUpdate(submitData);
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to save mileage expense");
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

  useEffect(() => {
    loadMileagePolicies();
  }, []);

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

    const mappedVehicle =
      vehicleTypeMappingForCost[
      vehicle as keyof typeof vehicleTypeMappingForCost
      ] || vehicle;

    setIsCalculating(true);
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
        destinationPlaceIds: destinations.length > 0 ? destinations : destinationId,
        vehicle: mappedVehicle,
        orgId,
        isRoundTrip,
      });
      
      if (costData) {
        const calculatedDistance = costData.total_distance || 0;

        setFormData((prev) => ({
          ...prev,
          distance: `${calculatedDistance.toFixed(1)} km`,
          amount: `₹${costData.cost.toFixed(2)}`,
        }));
        form.setValue("distance", `${calculatedDistance.toFixed(1)} km`);
        form.setValue("amount", `₹${costData.cost.toFixed(2)}`);
        
        if (costData.map_url) {
          setMapUrl(costData.map_url);
        }
      }
    } catch (error) {
      console.error("Error calculating mileage cost:", error);
    } finally {
      setIsCalculating(false);
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

  return (
    <div className="max-w-full mx-auto pt-1 pb-6">
      {/* {mode === "view" && <div className="mb-3">
        <h1 className="text-2xl font-bold text-gray-800">
          Mileage Expense Details
        </h1>
      </div>} */}

      {expenseData?.original_expense_id && (
        <Alert className="bg-yellow-50 border-yellow-200 mb-4">
          <Copy className="h-4 w-4 text-yellow-600" />
          <AlertTitle className="text-yellow-800">Duplicate Expense Detected</AlertTitle>
          <AlertDescription className="text-yellow-700">
            This expense has been flagged as a duplicate. 
            <Button
              variant="link"
              className="p-0 h-auto text-yellow-700 underline ml-1"
              onClick={() => navigate(`/expenses/${expenseData.original_expense_id}`)}
            >
              View original expense <ExternalLink className="ml-1 h-3 w-3" />
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Section - Form */}
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)}>
            <Card>
              <CardContent className="px-6 py-4 space-y-4">
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
                            disabled={mode === "view" && !editMode}
                            placeholder="Start Location"
                            customIcon={formData.startLocation ? <span className="text-gray-400 font-bold text-xs">A</span> : null}
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
                      className="text-blue-600 border-blue-300 hover:bg-blue-50 px-2 py-0.5 text-xs h-7"
                    >
                      + ADD
                    </Button>
                  </div>

                  {/* Stops */}
                  {formData.stops.map((stop, index) => (
                    <div key={stop.id} className="space-y-2">
                      <LocationAutocomplete
                        value={stop.location}
                        onChange={(v) => handleStopLocationChange(stop.id, v)}
                        onSelect={(place) => handleStopLocationSelect(stop.id, place)}
                        disabled={mode === "view" && !editMode}
                        placeholder={`Stop ${index + 1}`}
                        customIcon={stop.location ? <span className="text-gray-400 font-bold text-xs">{String.fromCharCode(66 + index)}</span> : null}
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
                          className="text-xs text-red-600 border-red-300 hover:bg-red-50 px-2 py-0.5 h-7"
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
                            disabled={mode === "view" && !editMode}
                            placeholder="End Location"
                            customIcon={formData.endLocation ? <span className="text-gray-400 font-bold text-xs">{String.fromCharCode(65 + formData.stops.length + 1)}</span> : null}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Round Trip Toggle */}
                  <div className="flex items-center justify-end gap-3 my-2">
                    <Label className={`text-sm font-medium ${formData.stops.length > 0 ? 'text-gray-400' : 'text-gray-700'}`}>
                      Round Trip
                    </Label>
                    <Switch
                      checked={formData.isRoundTrip}
                      onCheckedChange={(checked) => {
                        handleInputChange("isRoundTrip", checked);
                        form.setValue("isRoundTrip", checked);
                      }}
                      disabled={(mode === "view" && !editMode) || formData.stops.length > 0}
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
                          <SelectItem value="car">Car</SelectItem>
                          <SelectItem value="bike">Bike</SelectItem>
                          <SelectItem value="public_transport">
                            Public Transport
                          </SelectItem>
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

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                          disabled={loadingPolicies || (mode === "view" && !editMode)}
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
                      <FormLabel>Purpose of Travel *</FormLabel>
                      <FormControl>
                        <Textarea
                          value={field.value}
                          onChange={(e) => {
                            handleInputChange("description", e.target.value);
                            field.onChange(e.target.value);
                          }}
                          disabled={mode === "view" && !editMode}
                          placeholder="Enter purpose of travel"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

            {/* 💾 Actions */}
            {(mode === "create" || mode === "edit" || editMode) && (
              <div className="flex justify-between items-end pt-4">
                <div>
                  <Label className="text-sm font-medium text-gray-700">
                    Total Amount
                  </Label>
                  <div className="text-2xl font-bold text-blue-600 mt-1">
                    {formData.amount || "₹0.00"}
                  </div>
                  {formData.distance && (
                    <p className="text-sm text-gray-500">{formData.distance}</p>
                  )}
                </div>

                <div className="flex gap-2">
                  {editMode && onCancel && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={onCancel}
                      className="px-6 py-2"
                    >
                      Cancel
                    </Button>
                  )}
                  <Button
                    type="submit"
                    disabled={saving || isCalculating}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2"
                  >
                    {isCalculating ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Calculating...
                      </>
                    ) : saving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : mode === "edit" || editMode ? (
                      "Update Expense"
                    ) : (
                      "Create Expense"
                    )}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
        </form>
      </Form>
      
      {/* Right Section - Map */}
      <Card className="h-full p-2">
        {mapUrl ? (
          <div className="space-y-2">
            {/* Map Display */}
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
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleMapDownload}
                    className="h-8 px-3 text-xs"
                  >
                    <Download className="h-4 w-4 mr-1" />
                    Download
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleMapFullscreen}
                    className="h-8 px-3 text-xs"
                  >
                    <Maximize2 className="h-4 w-4 mr-1" />
                    Fullscreen
                  </Button>
                </div>
              </div>

              {/* Map Display */}
              <div className="relative overflow-auto bg-gray-100">
                <div className="flex items-center justify-center p-4">
                  <img 
                    src={mapUrl} 
                    alt="Route Map" 
                    className="max-w-full h-auto cursor-pointer hover:opacity-90 transition-opacity"
                    onClick={handleMapFullscreen}
                    style={{
                      transform: `scale(${mapZoom}) rotate(${mapRotation}deg)`,
                      transformOrigin: "center",
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-gray-100 rounded-lg h-[600px] flex items-center justify-center border-2 border-dashed border-gray-300">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 opacity-50">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                  <circle cx="12" cy="10" r="3"></circle>
                </svg>
              </div>
              <p className="text-gray-500 font-medium">Map View</p>
              <p className="text-sm text-gray-400 mt-1">
                {startLocation && endLocation
                  ? "Calculating route..."
                  : "Route visualization will appear here"}
              </p>
            </div>
          </div>
        )}
      </Card>

      {/* Fullscreen Map Modal */}
      {isMapFullscreen && mapUrl && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-90 flex items-center justify-center p-4">
          <div className="relative w-full h-full flex flex-col">
            {/* Fullscreen Header */}
            <div className="flex items-center justify-between p-4 bg-white border-b border-gray-200">
              <div className="flex items-center gap-4">
                <h3 className="text-lg font-semibold text-gray-900">Route Map</h3>
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
    </div>
  );
};

export default MileagePage;
