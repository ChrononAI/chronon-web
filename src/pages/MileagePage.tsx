import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
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
import { Loader2, Calendar } from "lucide-react";
import { LocationAutocomplete } from "@/components/ui/location-autocomplete";
import { placesService, PlaceSuggestion } from "@/services/placesService";
import { expenseService } from "@/services/expenseService";
import { getOrgIdFromToken } from "@/lib/jwtUtils";
import { Expense, Policy, PolicyCategory } from "@/types/expense";
import { toast } from "sonner";
import { format } from "date-fns";

interface MileagePageProps {
  mode?: "create" | "view" | "edit";
  expenseData?: Expense;
  isEditable?: boolean;
  onUpdate?: (data: any) => Promise<void>;
  isEditing?: boolean;
  saving?: boolean;
  onCancel?: () => void;
}

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
  console.log(expenseData);

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

  const getVehicleType = (type: "FOUR_WHEELERS" | "TWO_WHEELERS" | "PUBLIC_TRANSPORT" | string) => {
    if (type === "FOUR_WHEELERS") return "car";
    if (type === "TWO_WHEELERS") return "bike";
    if (type === "PUBLIC_TRANSPORT") return "public_transport"
    return "";
  }

  console.log(expenseData, formData);
  useEffect(() => {
    if (expenseData) {
      setFormData({
        startLocation: expenseData.start_location || "",
        startLocationId: "",
        endLocation: expenseData.end_location || "",
        endLocationId: "",
        distance: expenseData.distance?.toString() || "",
        amount: expenseData.amount.toString() || "",
        description: expenseData.description || "",
        vehiclesType: getVehicleType(expenseData.vehicle_type || ""),
        expenseDate: format(new Date(expenseData.expense_date), 'yyyy-MM-dd') || "", //format(new Date(expenseData.expense_date), 'yyyy-MM-dd')
        isRoundTrip: expenseData.is_round_trip,
        policyId: expenseData.expense_policy_id || "",
        categoryId: expenseData.category_id || ""
      });
    }
  }, [expenseData]);

  const [isCalculating, setIsCalculating] = useState(false);
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [categories, setCategories] = useState<PolicyCategory[]>([]);
  const [selectedPolicy, setSelectedPolicy] = useState<Policy | null>(null);
  const [loadingPolicies, setLoadingPolicies] = useState(false);
  const [editMode, setEditMode] = useState(false);

  // ✅ Fix duplicate useEffect closing braces
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
    console.log(field, value);
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
      } else if (field === "isRoundTrip") {
        calculateMileageCost(
          updatedData.startLocationId,
          updatedData.endLocationId,
          updatedData.vehiclesType,
          value as boolean
        );
      } else if (field === "policyId") {
        const policy = policies.find((p) => p.id === value);
        setSelectedPolicy(policy || null);
        if (policy?.categories && policy.categories.length > 0) {
          const firstCategory = policy.categories[0];
          setFormData((prev) => ({ ...prev, categoryId: firstCategory.id }));
        } else {
          setFormData((prev) => ({ ...prev, categoryId: "" }));
        }
      } else if (field === "categoryId") {
        // Category selection handled by form state
      }

      return updatedData;
    });
  };

  const handleStartLocationSelect = (place: PlaceSuggestion) => {
    setFormData((prev) => ({
      ...prev,
      startLocation: place.description,
      startLocationId: place.place_id,
    }));
  };

  const handleEndLocationSelect = (place: PlaceSuggestion) => {
    setFormData((prev) => ({
      ...prev,
      endLocation: place.description,
      endLocationId: place.place_id,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const orgId = getOrgIdFromToken();
    if (!orgId) return alert("Organization ID not found.");

    const submitData = {
      expense_policy_id: formData.policyId,
      category_id: formData.categoryId,
      amount: extractAmount(formData.amount),
      expense_date: formData.expenseDate,
      description: formData.description,
      start_location: formData.startLocation,
      end_location: formData.endLocation,
      distance: extractDistance(formData.distance),
      distance_unit: "KM",
      vehicle_type:
        vehicleTypeMapping[
          formData.vehiclesType as keyof typeof vehicleTypeMapping
        ] || "four_wheeler",
      is_round_trip: formData.isRoundTrip.toString(),
      mileage_meta: {
        trip_purpose: "business_travel",
        notes: formData.isRoundTrip ? "Round trip" : "",
      },
      vendor: expenseData?.vendor,
    };

    try {
      if (mode === "create") {
        await placesService.createMileageExpense(submitData, orgId);
      } else if (mode === "edit" && onUpdate) {
        await onUpdate(submitData);
      }
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
      setCategories(mileagePolicies[0].categories);

      // Auto-select first policy and category if available
      if (mileagePolicies.length > 0) {
        const firstPolicy = mileagePolicies[0];
        setSelectedPolicy(firstPolicy);
        setFormData((prev) => ({ ...prev, policyId: firstPolicy.id }));

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
      }
    } catch (error) {
      console.error("Error calculating mileage cost:", error);
    } finally {
      setIsCalculating(false);
    }
  };

  return (
    <div className="max-w-full mx-auto px-6 pt-1 pb-6">
      <div className="mb-3">
        <h1 className="text-2xl font-bold text-gray-800">
          {mode === "create"
            ? "Create New Mileage Expense"
            : "Mileage Expense Details"}
        </h1>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardContent className="px-6 py-4 space-y-4">
            {/* 🚗 Route Section */}
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-gray-700">Route</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Start Location *</Label>
                  <LocationAutocomplete
                    value={formData.startLocation}
                    onChange={(v) => handleInputChange("startLocation", v)}
                    onSelect={handleStartLocationSelect}
                    disabled={mode === "view" && !editMode}
                  />
                </div>
                <div>
                  <Label>End Location *</Label>
                  <LocationAutocomplete
                    value={formData.endLocation}
                    onChange={(v) => handleInputChange("endLocation", v)}
                    onSelect={handleEndLocationSelect}
                    disabled={mode === "view" && !editMode}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Vehicle Type *</Label>
                  <Select
                    value={formData.vehiclesType}
                    onValueChange={(v) => handleInputChange("vehiclesType", v)}
                    disabled={mode === "view" && !editMode}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select vehicle type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="car">Car</SelectItem>
                      <SelectItem value="bike">Bike</SelectItem>
                      <SelectItem value="public_transport">
                        Public Transport
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex flex-col justify-center space-y-1">
                  <Label>Round Trip</Label>
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={formData.isRoundTrip}
                      onCheckedChange={(v) =>
                        handleInputChange("isRoundTrip", v)
                      }
                      disabled={mode === "view" && !editMode}
                    />
                    <span>{formData.isRoundTrip ? "Yes" : "No"}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 🧾 Details Section */}
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-gray-700">Details</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label
                    htmlFor="distance"
                    className="text-sm font-medium text-gray-700"
                  >
                    Distance (km)
                  </Label>
                  <div className="relative">
                    <Input
                      id="distance"
                      type="text"
                      value={
                        isCalculating
                          ? "Calculating..."
                          : formData.distance || "Auto-calculated"
                      }
                      onChange={(e) =>
                        handleInputChange("distance", e.target.value)
                      }
                      className="bg-gray-50 text-gray-500"
                      disabled={isCalculating || (mode === "view" && !editMode)}
                    />
                    {isCalculating && (
                      <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4 animate-spin" />
                    )}
                  </div>
                  {mode === "create" && (
                    <p className="text-xs text-gray-500">
                      Manual adjustment is possible.
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="amount"
                    className="text-sm font-medium text-gray-700"
                  >
                    Amount
                  </Label>
                  <div className="relative">
                    <Input
                      id="amount"
                      type="text"
                      value={
                        isCalculating
                          ? "Calculating..."
                          : formData.amount || "₹ Auto-calculated"
                      }
                      onChange={(e) =>
                        handleInputChange("amount", e.target.value)
                      }
                      className="bg-gray-50 text-gray-500"
                      disabled={isCalculating || (mode === "view" && !editMode)}
                    />
                    {isCalculating && (
                      <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4 animate-spin" />
                    )}
                  </div>
                  {mode === "create" && (
                    <p className="text-xs text-gray-500">
                      Based on policy rate.
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Policy *</Label>
                  <Select
                    value={formData.policyId}
                    onValueChange={(v) => handleInputChange("policyId", v)}
                    disabled={loadingPolicies || (mode === "view" && !editMode)}
                  >
                    <SelectTrigger>
                      <SelectValue
                        placeholder={
                          loadingPolicies ? "Loading..." : "Select Policy"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {policies.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Category *</Label>
                  <Select
                    value={formData.categoryId}
                    onValueChange={(v) => handleInputChange("categoryId", v)}
                    disabled={!selectedPolicy || loadingPolicies}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories?.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="expenseDate"
                  className="text-sm font-medium text-gray-700"
                >
                  Expense Date *
                </Label>
                <div className="relative w-fit">
                  <Calendar className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    id="expenseDate"
                    type="date"
                    value={formData.expenseDate}
                    onChange={(e) =>
                      handleInputChange("expenseDate", e.target.value)
                    }
                    className="h-10 pl-8 w-40"
                    disabled={mode === "view" && !editMode}
                  />
                </div>
              </div>

              <div>
                <Label>Description *</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) =>
                    handleInputChange("description", e.target.value)
                  }
                  disabled={mode === "view" && !editMode}
                />
              </div>
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
                    : "Submit Expense"}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </form>
    </div>
  );
};

export default MileagePage;
