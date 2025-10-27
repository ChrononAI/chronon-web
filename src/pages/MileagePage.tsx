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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Loader2 } from "lucide-react";
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
  const today = new Date().toISOString().split("T")[0];

  useEffect(() => {
    if (expenseData && policies.length > 0) {
      setIsLoadingExistingData(true);
      const data = {
        startLocation: expenseData.start_location || "",
        startLocationId: "",
        endLocation: expenseData.end_location || "",
        endLocationId: "",
        distance: expenseData.distance?.toString() || "",
        amount: expenseData.amount.toString() || "",
        description: expenseData.description || "",
        vehiclesType: getVehicleType(expenseData.vehicle_type || ""),
        expenseDate:
          format(new Date(expenseData.expense_date), "yyyy-MM-dd") || "",
        isRoundTrip: expenseData.is_round_trip,
        policyId: expenseData.expense_policy_id || "",
        categoryId: expenseData.category_id || "",
      };
      
      setFormData(data);
      
      // Set form values
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
      
      // Update categories based on selected policy
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

      if (field === "vehiclesType") {
        calculateMileageCost(
          updatedData.startLocationId,
          updatedData.endLocationId,
          value as string,
          updatedData.isRoundTrip
        );
        form.setValue("vehiclesType", value as string);
      } else if (field === "isRoundTrip") {
        calculateMileageCost(
          updatedData.startLocationId,
          updatedData.endLocationId,
          updatedData.vehiclesType,
          value as boolean
        );
        form.setValue("isRoundTrip", value as boolean);
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

  const handleEndLocationSelect = (place: PlaceSuggestion) => {
    setEndLocation(place);
    setFormData((prev) => ({
      ...prev,
      endLocation: place.description,
      endLocationId: place.place_id,
    }));
    form.setValue("endLocation", place.description);
  };

  useEffect(() => {
    // Only calculate if we're creating a new expense, not loading existing data
    if (startLocation && endLocation && !isLoadingExistingData && mode === "create") {
      calculateMileageCost(
        startLocation?.place_id,
        endLocation?.place_id,
        formData.vehiclesType,
        formData.isRoundTrip
      );
    }
  }, [startLocation, endLocation, isLoadingExistingData, mode]);

  const handleSubmit = async (values: MileageFormValues) => {
    const orgId = getOrgIdFromToken();
    if (!orgId) {
      toast.error("Organization ID not found");
      return;
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
      mileage_meta: {
        trip_purpose: "business_travel",
        notes: values.isRoundTrip ? "Round trip" : "",
      },
      vendor: expenseData?.vendor,
    };

    try {
      if (mode === "create") {
        await placesService.createMileageExpense(submitData, orgId);
      } else if (mode === "edit" && onUpdate) {
        await onUpdate(submitData);
      }
      toast.success("Successfully created mileage expense");
      navigate("/expenses");
    } catch (error) {
      console.error(error);
      toast.error("Failed to save mileage expense");
    }
  };

  const loadMileagePolicies = async () => {
    setLoadingPolicies(true);
    try {
      const allPolicies = await expenseService.getAllPoliciesWithCategories();

      // Filter for mileage policies only
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
    isRoundTrip: boolean = false
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
      const costData: any = await placesService.getMileageCost({
        originPlaceId: originId,
        destinationPlaceIds: destinationId,
        vehicle: mappedVehicle,
        orgId,
        isRoundTrip,
      });
      if (costData) {
        const baseDistance =
          costData.total_distance ||
          parseFloat(
            costData.total_distance?.text?.replace(/[^\d.]/g, "") || "0"
          );
        const calculatedDistance = baseDistance;

        setFormData((prev) => ({
          ...prev,
          distance: `${calculatedDistance.toFixed(1)} km`,
          amount: `₹${costData.cost.toFixed(2)}`,
        }));
        form.setValue("distance", `${calculatedDistance.toFixed(1)} km`);
        form.setValue("amount", `₹${costData.cost.toFixed(2)}`);
      }
    } catch (error) {
      console.error("Error calculating mileage cost:", error);
    } finally {
      setIsCalculating(false);
    }
  };

  return (
    <div className="max-w-full mx-auto pt-1 pb-6">
      {mode === "view" && <div className="mb-3">
        <h1 className="text-2xl font-bold text-gray-800">
          Mileage Expense Details
        </h1>
      </div>}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)}>
        <Card>
          <CardContent className="px-6 py-4 space-y-4">
            {/* 🚗 Route Section */}
            <div className="space-y-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="startLocation"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Start Location *</FormLabel>
                      <FormControl>
                        <LocationAutocomplete
                          value={formData.startLocation}
                          onChange={(v) => {
                            handleInputChange("startLocation", v);
                            field.onChange(v);
                          }}
                          onSelect={handleStartLocationSelect}
                          disabled={mode === "view" && !editMode}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="endLocation"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>End Location *</FormLabel>
                      <FormControl>
                        <LocationAutocomplete
                          value={formData.endLocation}
                          onChange={(v) => {
                            handleInputChange("endLocation", v);
                            field.onChange(v);
                          }}
                          onSelect={handleEndLocationSelect}
                          disabled={mode === "view" && !editMode}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

                <div className="flex flex-col justify-center space-y-3">
                  <Label>Round Trip</Label>
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={formData.isRoundTrip}
                      onCheckedChange={(v) =>
                        handleInputChange("isRoundTrip", v)
                      }
                      disabled={mode === "view" && !editMode}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* 🧾 Details Section */}
            <div className="space-y-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="distance"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Distance (km) *</FormLabel>
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
                      {mode === "create" && (
                        <p className="text-xs text-gray-500">
                          Auto-calculated based on location.
                        </p>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Amount *</FormLabel>
                      <div className="relative">
                        <FormControl>
                          <Input
                            type="text"
                            value={
                              isCalculating
                                ? "Calculating..."
                                : formData.amount || "₹ Auto-calculated"
                            }
                            onChange={(e) => {
                              handleInputChange("amount", e.target.value);
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
                      {mode === "create" && (
                        <p className="text-xs text-gray-500">
                          Auto-calculated based on policy rate.
                        </p>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">
                    Policy
                  </Label>
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

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
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
              </div>

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
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* 💾 Actions */}
            {(mode === "create" || mode === "edit" || editMode) && (
              <div className="flex justify-end gap-2 pt-4">
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
                  disabled={saving}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2"
                >
                  {saving
                    ? "Saving..."
                    : mode === "edit" || editMode
                      ? "Update Expense"
                      : "Create Expense"}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
        </form>
      </Form>
    </div>
  );
};

export default MileagePage;
