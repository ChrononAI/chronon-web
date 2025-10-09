import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
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
import { Expense, Policy } from "@/types/expense";
import { toast } from "sonner";

interface MileagePageProps {
  mode?: "create" | "view";
  expenseData?: Expense;
  showLayout?: boolean;
  isEditable?: boolean;
  onUpdate?: (data: any) => Promise<void>;
  onCancel?: () => void;
  isEditing?: boolean;
  saving?: boolean;
}

const MileagePage = ({
  mode = "create",
  expenseData,
  showLayout = true,
  isEditable = false,
  onUpdate,
  onCancel,
  isEditing = false,
  saving = false,
}: MileagePageProps) => {
  const navigate = useNavigate();
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
  const [selectedPolicy, setSelectedPolicy] = useState<Policy | null>(null);
  const [loadingPolicies, setLoadingPolicies] = useState(false);
  const [editMode, setEditMode] = useState(false);

  useEffect(() => {
    if (mode === "view" && expenseData) {
      const formatDate = (dateString: string) => {
        try {
          return new Date(dateString).toISOString().split("T")[0];
        } catch {
          return new Date().toISOString().split("T")[0];
        }
      };

      const getVehicleTypeFromApi = (vehicleType: string) => {
        switch (vehicleType?.toLowerCase()) {
          case "four_wheelers":
            return "car";
          case "two_wheelers":
            return "bike";
          case "public_transport":
            return "public_transport";
          default:
            return "car";
        }
      };

      setFormData({
        startLocation: expenseData.start_location || "",
        startLocationId: "",
        endLocation: expenseData.end_location || "",
        endLocationId: "",
        distance: expenseData.distance
          ? `${expenseData.distance} ${expenseData.distance_unit || "KM"}`
          : "",
        amount: `₹${expenseData.amount}`,
        description: expenseData.description || "",
        vehiclesType: getVehicleTypeFromApi(expenseData.vehicle_type || ""),
        expenseDate: formatDate(expenseData.expense_date),
        isRoundTrip: false,
        policyId: (expenseData as any).expense_policy_id || "",
        categoryId: (expenseData as any).category_id || "",
      });
    }
  }, [mode, expenseData]);

  useEffect(() => {
    loadMileagePolicies();
  }, []);

  useEffect(() => {
    if (mode === "view" && isEditable && !isEditing) {
      setEditMode(false);
    } else if (mode === "view" && isEditable && isEditing) {
      setEditMode(true);
    }
  }, [mode, isEditable, isEditing]);

  const loadMileagePolicies = async () => {
    if (mode === "view" && !editMode) return;

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
    setFormData((prev) => {
      const updatedData = {
        ...prev,
        startLocation: place.description,
        startLocationId: place.place_id,
      };
      calculateMileageCost(
        place.place_id,
        updatedData.endLocationId,
        updatedData.vehiclesType,
        updatedData.isRoundTrip
      );
      return updatedData;
    });
  };

  const handleEndLocationSelect = (place: PlaceSuggestion) => {
    setFormData((prev) => {
      const updatedData = {
        ...prev,
        endLocation: place.description,
        endLocationId: place.place_id,
      };
      calculateMileageCost(
        updatedData.startLocationId,
        place.place_id,
        updatedData.vehiclesType,
        updatedData.isRoundTrip
      );
      return updatedData;
    });
  };

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
      const costData = await placesService.getMileageCost(
        originId,
        destinationId,
        mappedVehicle,
        orgId
      );
      if (costData) {
        const multiplier = isRoundTrip ? 2 : 1;
        const baseDistance =
          costData.distance?.distance ||
          parseFloat(costData.distance?.text?.replace(/[^\d.]/g, "") || "0");
        const calculatedDistance = baseDistance * multiplier;

        setFormData((prev) => ({
          ...prev,
          distance: `${calculatedDistance.toFixed(1)} km`,
          amount: `₹${(costData.cost * multiplier).toFixed(2)}`,
        }));
      }
    } catch (error) {
      console.error("Error calculating mileage cost:", error);
    } finally {
      setIsCalculating(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (
      !formData.startLocation ||
      !formData.endLocation ||
      !formData.vehiclesType ||
      !formData.description ||
      !formData.policyId ||
      !formData.categoryId
    ) {
      alert(
        "Please fill in all required fields: Start Location, End Location, Vehicle Type, Policy, Category, and Description"
      );
      return;
    }

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
      vendor: "Personal Vehicle",
    };

    try {
      if (mode === "view" && onUpdate) {
        await onUpdate(submitData);
        return;
      }

      const orgId = getOrgIdFromToken();
      if (!orgId) {
        alert("Organization ID not found. Please login again.");
        return;
      }

      await placesService.createMileageExpense(submitData, orgId);

      toast.success("Mileage expense created successfully!");
      setTimeout(() => {
        navigate("/expenses");
      }, 500);
    } catch (error: any) {
      console.error("Error creating mileage expense:", error);
      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        "Failed to create mileage expense";
      alert(`Error: ${errorMessage}`);
    }
  };

  const content = (
    <div className="max-w-full mx-auto px-6 pt-1 pb-6">
      <div className="mb-3">
        <h1 className="text-2xl font-bold text-gray-800">
          {mode === "view"
            ? "Mileage Expense Details"
            : "Create New Mileage Expense"}
        </h1>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardContent className="px-6 py-4 space-y-2">
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-gray-700">Route</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label
                    htmlFor="startLocation"
                    className="text-sm font-medium text-gray-700"
                  >
                    Start Location
                  </Label>
                  <LocationAutocomplete
                    value={formData.startLocation}
                    onChange={(value) =>
                      handleInputChange("startLocation", value)
                    }
                    onSelect={handleStartLocationSelect}
                    placeholder="e.g., 123 Main St, Anytown"
                    disabled={mode === "view" && !editMode}
                  />
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="endLocation"
                    className="text-sm font-medium text-gray-700"
                  >
                    End Location
                  </Label>
                  <LocationAutocomplete
                    value={formData.endLocation}
                    onChange={(value) =>
                      handleInputChange("endLocation", value)
                    }
                    onSelect={handleEndLocationSelect}
                    placeholder="e.g., 456 Oak Ave, Sometown"
                    disabled={mode === "view" && !editMode}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label
                    htmlFor="vehiclesType"
                    className="text-sm font-medium text-gray-700"
                  >
                    Vehicle Type
                  </Label>
                  <Select
                    value={formData.vehiclesType}
                    onValueChange={(value) =>
                      handleInputChange("vehiclesType", value)
                    }
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

                <div className="space-y-2">
                  <Label
                    htmlFor="roundTrip"
                    className="text-sm font-medium text-gray-700"
                  >
                    Round Trip
                  </Label>
                  <div className="flex items-center space-x-2 h-10">
                    <Switch
                      id="roundTrip"
                      checked={formData.isRoundTrip}
                      onCheckedChange={(checked) =>
                        handleInputChange("isRoundTrip", checked)
                      }
                      disabled={mode === "view" && !editMode}
                    />
                    <Label
                      htmlFor="roundTrip"
                      className="text-sm text-gray-600"
                    >
                      {formData.isRoundTrip ? "Yes" : "No"}
                    </Label>
                  </div>
                </div>
              </div>
            </div>

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
                <div className="space-y-2">
                  <Label
                    htmlFor="policy"
                    className="text-sm font-medium text-gray-700"
                  >
                    Policy
                  </Label>
                  <Input
                    id="policy"
                    type="text"
                    value={selectedPolicy?.name}
                    className="bg-gray-50 text-gray-500"
                    disabled
                  />
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="category"
                    className="text-sm font-medium text-gray-700"
                  >
                    Category
                  </Label>
                  <Select
                    value={formData.categoryId}
                    onValueChange={(value) =>
                      handleInputChange("categoryId", value)
                    }
                    disabled={
                      (mode === "view" && !editMode) ||
                      !selectedPolicy ||
                      loadingPolicies
                    }
                  >
                    <SelectTrigger>
                      <SelectValue
                        placeholder={
                          !selectedPolicy
                            ? "Select policy first"
                            : "Select category"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {selectedPolicy?.categories?.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
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
                  Expense Date
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

              <div className="space-y-2">
                <Label
                  htmlFor="description"
                  className="text-sm font-medium text-gray-700"
                >
                  Description
                </Label>
                <Textarea
                  id="description"
                  placeholder="Provide a brief description for this trip..."
                  value={formData.description}
                  onChange={(e) =>
                    handleInputChange("description", e.target.value)
                  }
                  className="min-h-[100px] resize-none"
                  disabled={mode === "view"}
                />
              </div>
            </div>

            {(mode === "create" || (mode === "view" && editMode)) && (
              <div className="flex justify-end gap-2 pt-2">
                {mode === "view" && editMode && onCancel && (
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
                    : mode === "view"
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

  if (mode === "view") {
    return content;
  }

  if (!showLayout) {
    return content;
  }

  return <Layout>{content}</Layout>;
};

export default MileagePage;
