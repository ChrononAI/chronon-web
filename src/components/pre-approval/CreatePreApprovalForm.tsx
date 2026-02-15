import * as z from "zod";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { TripDateField } from "./TripDateField";
import { Label } from "../ui/label";
import { Switch } from "../ui/switch";
import { Plus, Plane, Train, Bus, Car } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { useState } from "react";
import {
  preApprovalService,
  PreApprovalType,
} from "@/services/preApprovalService";
import { toast } from "sonner";
import { Currency } from "../advances/CreateAdvanceForm";
import { trackEvent } from "@/mixpanel";
import { FormActionFooter } from "../layout/FormActionFooter";
import { format } from "date-fns";

type TravelMode = "flight" | "train" | "bus" | "cab";

const journeySchema = z.object({
  travelMode: z.enum(["flight", "train", "bus", "cab"]),
  source: z.string().min(1, "Source is required"),
  destination: z.string().min(1, "Destination is required"),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().optional(),
  timePreference: z.string().optional(),
  flightPreference: z.string().optional(),
  mealPreference: z.string().optional(),
  classPreference: z.string().optional(),
  departureTime: z.string().optional(),
  periodStart: z.string().optional(),
  periodEnd: z.string().optional(),
  needsAccommodation: z.boolean().optional(),
  checkInDate: z.string().optional(),
  checkOutDate: z.string().optional(),
  location: z.string().optional(),
  preferredHotel1: z.string().optional(),
  preferredHotel2: z.string().optional(),
  preferredHotel3: z.string().optional(),
  occupancy: z.enum(["single", "double"]).optional(),
});

const tripSchema = z.object({
  tripName: z.string().min(1, "Trip name is required"),
  advanceAmount: z.string().optional(),
  currency: z.string().optional(),
  fromDate: z.string().min(1, "From date is required"),
  toDate: z.string().min(1, "To date is required"),
  purpose: z.string().min(1, "Purpose is required"),
  department: z.string().optional(),
  projectCode: z.string().optional(),
  costCenter: z.string().optional(),
  journeys: z.array(journeySchema).min(1, "At least one journey is required"),
});

const currencies: Currency[] = [
  { code: "INR", name: "Indian Rupee", symbol: "₹" },
  { code: "USD", name: "United States Dollar", symbol: "$" },
  { code: "EUR", name: "European Euro", symbol: "€" },
];

type TripFormValues = z.infer<typeof tripSchema>;

interface CreatePreApprovalFormProps {
  mode?: "create" | "view" | "edit";
  data?: PreApprovalType;
}

function CreatePreApprovalForm({
  mode = "create",
}: CreatePreApprovalFormProps) {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const [loading, setLoading] = useState(false);
  const [selectedCurrency, setSelectedCurrency] = useState<Currency | null>(
    currencies.find((c) => c.code === "USD") || null
  );

  const today = format(new Date(), "yyyy-MM-dd");

  const form = useForm<TripFormValues>({
    resolver: zodResolver(tripSchema),
    defaultValues: {
      tripName: "",
      advanceAmount: "",
      currency: "USD",
      fromDate: "",
      toDate: "",
      purpose: "",
      department: "",
      projectCode: "",
      costCenter: "",
      journeys: [
        {
          travelMode: "flight",
          source: "",
          destination: "",
          startDate: "",
          endDate: "",
          timePreference: "",
          flightPreference: "",
          mealPreference: "",
          needsAccommodation: false,
          checkInDate: "",
          checkOutDate: "",
          location: "",
          preferredHotel1: "",
          preferredHotel2: "",
          preferredHotel3: "",
          occupancy: "single",
        },
      ],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "journeys",
  });

  const onSubmit = async (formData: TripFormValues) => {
    trackEvent("Create Trip Button Clicked", {
      button_name: "Create Trip",
    });
    setLoading(true);
    try {
      const payload = {
        title: formData.tripName,
        start_date: formData.fromDate,
        end_date: formData.toDate,
        description: formData.purpose,
        amount: formData.advanceAmount || undefined,
        currency: formData.currency || undefined,
      };

      const response: any = await preApprovalService.createPreApproval(payload);
      await preApprovalService.submitPreApproval(response.data.data.id);
      toast.success("Trip created successfully");
        navigate("/requests/pre-approvals");
      } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to create trip");
      } finally {
        setLoading(false);
    }
  };

  const handleBack = () => {
    if (pathname.includes("/approvals")) {
      navigate("/approvals/pre-approvals");
    } else {
      navigate("/requests/pre-approvals");
    }
  };

  const getTravelModeIcon = (mode: TravelMode) => {
    switch (mode) {
      case "flight":
        return <Plane className="h-5 w-5 text-[#0D9C99]" />;
      case "train":
        return <Train className="h-5 w-5 text-[#0D9C99]" />;
      case "bus":
        return <Bus className="h-5 w-5 text-[#0D9C99]" />;
      case "cab":
        return <Car className="h-5 w-5 text-[#0D9C99]" />;
    }
  };

  const getRouteLabel = (journey: any, index: number) => {
    if (journey.source && journey.destination) {
      const source = journey.source.replace(/\s*\([^)]*\)/g, '').trim();
      const destination = journey.destination.replace(/\s*\([^)]*\)/g, '').trim();
      return `${source} → ${destination}`;
    }
    return `Journey ${index + 1}`;
  };

  return (
    <div className="flex flex-col min-h-screen bg-sky-100">
      <div className="bg-white border-b px-6 pt-3 pb-4 sticky top-0 z-10">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Trip Details</h1>
          <p className="text-sm text-gray-600">
            Submit a new multi-journey travel request for approval.
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto bg-white">
        <div className="w-full p-6 pb-20">
      <Form {...form}>
            <form id="trip-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <div className="space-y-4">
                <div>
                  <h2 className="font-medium text-[12px] leading-[100%] tracking-wider text-[#0D9C99] uppercase mb-2">
                    01. BASIC TRIP DETAILS
                  </h2>
                  <div className="h-[1px] bg-gray-200 mb-8"></div>
                </div>
                <div className="grid grid-cols-3 gap-6">
          <div>
            <FormField
              control={form.control}
                      name="tripName"
              render={({ field }) => (
                <FormItem>
                          <Label
                            htmlFor="trip-name"
                            className="block mb-1.5"
                            style={{
                              fontFamily: "Inter",
                              fontSize: "12px",
                              fontWeight: 500,
                              lineHeight: "100%",
                              letterSpacing: "0%",
                              color: "#47536C",
                            }}
                          >
                            TRIP NAME
                          </Label>
                  <FormControl>
                    <Input
                              id="trip-name"
                      {...field}
                              placeholder="e.g. Q4 Global Strategy Tour"
                      disabled={mode !== "create"}
                              className="h-[40px] border-0 border-b border-gray-300 rounded-none px-0 pt-2 pb-1 text-sm bg-transparent focus:outline-none focus:ring-0 focus:border-0 focus:border-b-2 focus:border-[#0D9C99] focus-visible:outline-none focus-visible:ring-0 focus-visible:border-0 focus-visible:border-b-2 focus-visible:border-[#0D9C99] shadow-none"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <div>
            <FormField
              control={form.control}
                      name="advanceAmount"
              render={({ field }) => (
                <FormItem>
                          <Label
                            htmlFor="advance-amount"
                            className="block mb-1.5"
                            style={{
                              fontFamily: "Inter",
                              fontSize: "12px",
                              fontWeight: 500,
                              lineHeight: "100%",
                              letterSpacing: "0%",
                              color: "#47536C",
                            }}
                          >
                            ADVANCE AMOUNT REQUESTED
                          </Label>
                  <FormControl>
                            <div className="relative">
                              <span className="absolute left-0 top-[calc(50%+1px)] transform -translate-y-1/2 text-sm text-gray-700 z-0 pointer-events-none">
                                {selectedCurrency?.symbol || "$"}
                              </span>
                              <Input
                                id="advance-amount"
                                placeholder="0.00"
                                className="h-[40px] pl-5 pr-0 border-0 border-b border-gray-300 rounded-none pt-2 pb-1 text-sm bg-transparent focus:outline-none focus:ring-0 focus:border-0 focus:border-b-2 focus:border-[#0D9C99] focus-visible:outline-none focus-visible:ring-0 focus-visible:border-0 focus-visible:border-b-2 focus-visible:border-[#0D9C99] shadow-none"
                                type="number"
                                step="0.01"
                                min="0"
                                {...field}
                      disabled={mode !== "create"}
                    />
                            </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <div>
            <FormField
              control={form.control}
                      name="currency"
                      render={({ field }) => (
                        <FormItem>
                          <Label
                            htmlFor="currency"
                            className="block mb-1.5"
                            style={{
                              fontFamily: "Inter",
                              fontSize: "12px",
                              fontWeight: 500,
                              lineHeight: "100%",
                              letterSpacing: "0%",
                              color: "#47536C",
                            }}
                          >
                            CURRENCY
                          </Label>
                          <Select
                            onValueChange={(val) => {
                              field.onChange(val);
                              const curr = currencies.find((c) => c.code === val);
                              if (curr) setSelectedCurrency(curr);
                            }}
                      value={field.value}
                            disabled={mode !== "create"}
                          >
                            <FormControl>
                              <SelectTrigger
                                className="h-[40px] border-0 border-b border-gray-300 rounded-none px-0 pt-2 pb-1 bg-transparent focus:outline-none focus:ring-0 focus:ring-offset-0 focus:border-0 focus:border-b-2 focus:border-[#0D9C99] focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-0 focus-visible:border-b-2 focus-visible:border-[#0D9C99] shadow-none"
                              >
                                <SelectValue placeholder="Select currency">
                                  {selectedCurrency
                                    ? `${selectedCurrency.code} - ${selectedCurrency.name}`
                                    : "Select currency"}
                                </SelectValue>
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {currencies.map((currency) => (
                                <SelectItem key={currency.code} value={currency.code}>
                                  {currency.code} - {currency.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
          </div>
                  <div>
            <FormField
              control={form.control}
                      name="fromDate"
              render={({ field }) => (
                <FormItem>
                          <Label
                            htmlFor="from-date"
                            className="block mb-1.5"
                            style={{
                              fontFamily: "Inter",
                              fontSize: "12px",
                              fontWeight: 500,
                              lineHeight: "100%",
                              letterSpacing: "0%",
                              color: "#47536C",
                            }}
                          >
                            FROM DATE
                          </Label>
                  <FormControl>
                    <TripDateField
                              id="from-date"
                      value={field.value}
                              onChange={(value) => field.onChange(value)}
                      disabled={mode !== "create"}
                      minDate={today}
                              className="h-[40px] border-0 border-b border-gray-300 rounded-none pr-0 pt-2 pb-1 bg-transparent focus:outline-none focus:ring-0 focus:border-0 focus:border-b-2 focus:border-[#0D9C99] focus-visible:outline-none focus-visible:ring-0 focus-visible:border-0 focus-visible:border-b-2 focus-visible:border-[#0D9C99] shadow-none [&_input]:pr-10 [&_input]:pl-0 [&_input]:focus:border-0 [&_input]:focus:border-b-2 [&_input]:focus:border-[#0D9C99] [&_input]:focus-visible:outline-none [&_input]:focus-visible:ring-0 [&_input]:focus-visible:border-0 [&_input]:focus-visible:border-b-2 [&_input]:focus-visible:border-[#0D9C99]"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <div>
            <FormField
              control={form.control}
                      name="toDate"
              render={({ field }) => (
                <FormItem>
                          <Label
                            htmlFor="to-date"
                            className="block mb-1.5"
                            style={{
                              fontFamily: "Inter",
                              fontSize: "12px",
                              fontWeight: 500,
                              lineHeight: "100%",
                              letterSpacing: "0%",
                              color: "#47536C",
                            }}
                          >
                            TO DATE
                          </Label>
                  <FormControl>
                            <TripDateField
                              id="to-date"
                      value={field.value}
                              onChange={(value) => field.onChange(value)}
                      disabled={mode !== "create"}
                      minDate={today}
                              className="h-[40px] border-0 border-b border-gray-300 rounded-none pr-0 pt-2 pb-1 bg-transparent focus:outline-none focus:ring-0 focus:border-0 focus:border-b-2 focus:border-[#0D9C99] focus-visible:outline-none focus-visible:ring-0 focus-visible:border-0 focus-visible:border-b-2 focus-visible:border-[#0D9C99] shadow-none [&_input]:pr-10 [&_input]:pl-0 [&_input]:focus:border-0 [&_input]:focus:border-b-2 [&_input]:focus:border-[#0D9C99] [&_input]:focus-visible:outline-none [&_input]:focus-visible:ring-0 [&_input]:focus-visible:border-0 [&_input]:focus-visible:border-b-2 [&_input]:focus-visible:border-[#0D9C99]"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
                  <div className="col-span-2">
                    <FormField
                      control={form.control}
                      name="purpose"
                      render={({ field }) => (
                        <FormItem>
                          <Label
                            htmlFor="purpose"
                            className="block mb-1.5"
                            style={{
                              fontFamily: "Inter",
                              fontSize: "12px",
                              fontWeight: 500,
                              lineHeight: "100%",
                              letterSpacing: "0%",
                              color: "#47536C",
                            }}
                          >
                            PURPOSE OF TRIP
                          </Label>
                          <FormControl>
                            <Input
                              id="purpose"
                              {...field}
                              placeholder="Provide a detailed business justification..."
                              disabled={mode !== "create"}
                              className="h-[40px] border-0 border-b border-gray-300 rounded-none px-0 pt-2 pb-1 text-sm bg-transparent focus:outline-none focus:ring-0 focus:border-0 focus:border-b-2 focus:border-[#0D9C99] focus-visible:outline-none focus-visible:ring-0 focus-visible:border-0 focus-visible:border-b-2 focus-visible:border-[#0D9C99] shadow-none"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4 pt-6">
                <div>
                  <h2 className="font-medium text-[12px] leading-[100%] tracking-wider text-[#0D9C99] uppercase mb-2">
                    02. COST ATTRIBUTION
                  </h2>
                  <div className="h-[1px] bg-gray-200 mb-8"></div>
                </div>
                <div className="grid grid-cols-3 gap-6">
          <div>
            <FormField
              control={form.control}
                      name="department"
              render={({ field }) => (
                <FormItem>
                            <Label
                            htmlFor="department"
                            className="block mb-1.5"
                            style={{
                              fontFamily: "Inter",
                              fontSize: "12px",
                              fontWeight: 500,
                              lineHeight: "100%",
                              letterSpacing: "0%",
                              color: "#47536C",
                            }}
                          >
                            DEPARTMENT
                          </Label>
                  <FormControl>
                    <Select
                      value={field.value}
                              onValueChange={field.onChange}
                      disabled={mode !== "create"}
                    >
                              <SelectTrigger
                                className="h-[40px] border-0 border-b border-gray-300 rounded-none px-0 pt-2 pb-1 bg-transparent focus:outline-none focus:ring-0 focus:ring-offset-0 focus:border-0 focus:border-b-2 focus:border-[#0D9C99] focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-0 focus-visible:border-b-2 focus-visible:border-[#0D9C99] shadow-none"
                              >
                                <SelectValue placeholder="Select department" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="sales">Sales & Business Development</SelectItem>
                                <SelectItem value="engineering">Engineering</SelectItem>
                                <SelectItem value="marketing">Marketing</SelectItem>
                                <SelectItem value="hr">Human Resources</SelectItem>
                              </SelectContent>
                            </Select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div>
                    <FormField
                      control={form.control}
                      name="projectCode"
                      render={({ field }) => (
                        <FormItem>
                            <Label
                            htmlFor="project-code"
                            className="block mb-1.5"
                            style={{
                              fontFamily: "Inter",
                              fontSize: "12px",
                              fontWeight: 500,
                              lineHeight: "100%",
                              letterSpacing: "0%",
                              color: "#47536C",
                            }}
                          >
                            PROJECT CODE
                          </Label>
                      <FormControl>
                            <Input
                              id="project-code"
                              {...field}
                              placeholder="e.g. PRJ-2024-001"
                      disabled={mode !== "create"}
                              className="h-[40px] border-0 border-b border-gray-300 rounded-none px-0 pt-2 pb-1 text-sm bg-transparent focus:outline-none focus:ring-0 focus:border-0 focus:border-b-2 focus:border-[#0D9C99] focus-visible:outline-none focus-visible:ring-0 focus-visible:border-0 focus-visible:border-b-2 focus-visible:border-[#0D9C99] shadow-none"
                            />
                      </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                            <div>
                    <FormField
                      control={form.control}
                      name="costCenter"
                      render={({ field }) => (
                        <FormItem>
                            <Label
                            htmlFor="cost-center"
                            className="block mb-1.5"
                            style={{
                              fontFamily: "Inter",
                              fontSize: "12px",
                              fontWeight: 500,
                              lineHeight: "100%",
                              letterSpacing: "0%",
                              color: "#47536C",
                            }}
                          >
                            COST CENTER
                          </Label>
                      <FormControl>
                            <Input
                              id="cost-center"
                              {...field}
                              placeholder="e.g. CC-GLOBAL-500"
                              disabled={mode !== "create"}
                              className="h-[40px] border-0 border-b border-gray-300 rounded-none px-0 pt-2 pb-1 text-sm bg-transparent focus:outline-none focus:ring-0 focus:border-0 focus:border-b-2 focus:border-[#0D9C99] focus-visible:outline-none focus-visible:ring-0 focus-visible:border-0 focus-visible:border-b-2 focus-visible:border-[#0D9C99] shadow-none"
                            />
                      </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4 pt-6">
                            <div>
                  <div className="flex items-center justify-between mb-2">
                    <h2 className="font-medium text-[12px] leading-[100%] tracking-wider text-[#0D9C99] uppercase">
                      03. JOURNEY ITINERARY
                    </h2>
                    <p className="text-xs text-gray-500">Add legs chronologically</p>
                                </div>
                  <div className="h-[1px] bg-gray-200 mb-8"></div>
                                </div>

                {fields.map((field, index) => {
                  const journey = form.watch(`journeys.${index}`);
                  const travelMode = journey?.travelMode || "flight";

                  return (
                    <div key={field.id} className="space-y-4 pb-6 border-b border-gray-200 last:border-b-0">
                      <div className="flex items-center gap-2">
                        {getTravelModeIcon(travelMode as TravelMode)}
                        <h3 className="font-semibold text-gray-900">
                          {journey.source && journey.destination 
                            ? getRouteLabel(journey, index)
                            : `Journey ${index + 1}: ${getRouteLabel(journey, index)}`}
                        </h3>
                        {fields.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => remove(index)}
                            className="ml-auto text-red-600 hover:text-red-700"
                          >
                            Remove
                          </Button>
                              )}
                            </div>

                      <div className="space-y-2 mb-6">
                        <div className="flex items-center justify-between">
                          <Label className="block font-medium text-[12px] text-[#47536C] uppercase">
                            TRAVEL MODE
                          </Label>
                          <div className="flex items-center gap-2">
                            <Label className="text-xs text-gray-600 font-normal">Accommodation</Label>
                            <FormField
                              control={form.control}
                              name={`journeys.${index}.needsAccommodation`}
                              render={({ field }) => (
                                <FormControl>
                                  <Switch
                                    checked={field.value || false}
                                    onCheckedChange={field.onChange}
                                    disabled={mode === "view"}
                                  />
                                </FormControl>
                              )}
                            />
                          </div>
                        </div>
                        <div className="flex gap-2">
                          {(["flight", "train", "bus", "cab"] as TravelMode[]).map((travelModeOption) => (
                          <Button
                            key={travelModeOption}
                            type="button"
                            variant={travelMode === travelModeOption ? "default" : "outline"}
                            size="sm"
                            onClick={() => form.setValue(`journeys.${index}.travelMode`, travelModeOption)}
                            disabled={mode === "view"}
                            className={`capitalize rounded-full ${
                              travelMode === travelModeOption
                                ? "bg-[#161B53] text-white hover:bg-[#161B53]"
                                : "bg-white text-gray-700 hover:bg-gray-50 border border-gray-300"
                            }`}
                          >
                            {travelModeOption}
                          </Button>
                        ))}
                        </div>
                      </div>

                      <div className="space-y-4">
                        {travelMode === "flight" && (
                          <>
                            <div className="grid grid-cols-4 gap-4">
                              <div>
                                <FormField
                                  control={form.control}
                                  name={`journeys.${index}.source`}
                                  render={({ field }) => (
                                    <FormItem>
                                      <Label className="block mb-1.5 font-medium text-[12px] text-[#47536C] uppercase">
                                        SOURCE CITY
                                      </Label>
                                      <FormControl>
                                        <Input
                                          {...field}
                                          placeholder="e.g. New York (JFK)"
                                          disabled={mode !== "create"}
                                          className="h-[40px] border-0 border-b border-gray-300 rounded-none px-0 pt-2 pb-1 text-sm bg-transparent focus:outline-none focus:ring-0 focus:border-0 focus:border-b-2 focus:border-[#0D9C99] focus-visible:outline-none focus-visible:ring-0 focus-visible:border-0 focus-visible:border-b-2 focus-visible:border-[#0D9C99] shadow-none"
                                        />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                              </div>
                              <div>
                                <FormField
                                  control={form.control}
                                  name={`journeys.${index}.destination`}
                                  render={({ field }) => (
                                    <FormItem>
                                      <Label className="block mb-1.5 font-medium text-[12px] text-[#47536C] uppercase">
                                        DESTINATION CITY
                                      </Label>
                                      <FormControl>
                                        <Input
                                          {...field}
                                          placeholder="e.g. London (LHR)"
                                          disabled={mode !== "create"}
                                          className="h-[40px] border-0 border-b border-gray-300 rounded-none px-0 pt-2 pb-1 text-sm bg-transparent focus:outline-none focus:ring-0 focus:border-0 focus:border-b-2 focus:border-[#0D9C99] focus-visible:outline-none focus-visible:ring-0 focus-visible:border-0 focus-visible:border-b-2 focus-visible:border-[#0D9C99] shadow-none"
                                        />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                              </div>
                              <div>
                                <FormField
                                  control={form.control}
                                  name={`journeys.${index}.startDate`}
                                  render={({ field }) => (
                                    <FormItem>
                                      <Label className="block mb-1.5 font-medium text-[12px] text-[#47536C] uppercase">
                                        START DATE
                                      </Label>
                                      <FormControl>
                                        <TripDateField
                                          value={field.value || ""}
                                          onChange={field.onChange}
                                          disabled={mode !== "create"}
                                          minDate={today}
                                          className="h-[40px] border-0 border-b border-gray-300 rounded-none pr-0 pt-2 pb-1 bg-transparent focus:outline-none focus:ring-0 focus:border-0 focus:border-b-2 focus:border-[#0D9C99] focus-visible:outline-none focus-visible:ring-0 focus-visible:border-0 focus-visible:border-b-2 focus-visible:border-[#0D9C99] shadow-none [&_input]:pr-10 [&_input]:pl-0 [&_input]:focus:border-0 [&_input]:focus:border-b-2 [&_input]:focus:border-[#0D9C99] [&_input]:focus-visible:outline-none [&_input]:focus-visible:ring-0 [&_input]:focus-visible:border-0 [&_input]:focus-visible:border-b-2 [&_input]:focus-visible:border-[#0D9C99]"
                                        />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                              </div>
                              <div>
                                <FormField
                                  control={form.control}
                                  name={`journeys.${index}.endDate`}
                                  render={({ field }) => (
                                    <FormItem>
                                      <Label className="block mb-1.5 font-medium text-[12px] text-[#47536C] uppercase">
                                        END DATE (IF RETURN)
                                      </Label>
                                      <FormControl>
                                        <TripDateField
                                          value={field.value || ""}
                                          onChange={field.onChange}
                                          disabled={mode !== "create"}
                                          minDate={today}
                                          className="h-[40px] border-0 border-b border-gray-300 rounded-none pr-0 pt-2 pb-1 bg-transparent focus:outline-none focus:ring-0 focus:border-0 focus:border-b-2 focus:border-[#0D9C99] focus-visible:outline-none focus-visible:ring-0 focus-visible:border-0 focus-visible:border-b-2 focus-visible:border-[#0D9C99] shadow-none [&_input]:pr-10 [&_input]:pl-0 [&_input]:focus:border-0 [&_input]:focus:border-b-2 [&_input]:focus:border-[#0D9C99] [&_input]:focus-visible:outline-none [&_input]:focus-visible:ring-0 [&_input]:focus-visible:border-0 [&_input]:focus-visible:border-b-2 [&_input]:focus-visible:border-[#0D9C99]"
                                        />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                              </div>
                            </div>
                            <div className="grid grid-cols-3 gap-4">
                              <div>
                                <FormField
                                  control={form.control}
                                  name={`journeys.${index}.timePreference`}
                                  render={({ field }) => (
                                    <FormItem>
                                      <Label className="block mb-1.5 font-medium text-[12px] text-[#47536C] uppercase">
                                        TIME PREFERENCE
                                      </Label>
                                      <FormControl>
                                        <Select
                                          value={field.value}
                                          onValueChange={field.onChange}
                                          disabled={mode !== "create"}
                                        >
                                          <SelectTrigger className="h-[40px] border-0 border-b border-gray-300 rounded-none px-0 pt-2 pb-1 bg-transparent focus:outline-none focus:ring-0 focus:ring-offset-0 focus:border-0 focus:border-b-2 focus:border-[#0D9C99] focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-0 focus-visible:border-b-2 focus-visible:border-[#0D9C99] shadow-none">
                                            <SelectValue placeholder="Select time" />
                                          </SelectTrigger>
                                          <SelectContent>
                                            <SelectItem value="morning">Morning (06:00 - 12:00)</SelectItem>
                                            <SelectItem value="afternoon">Afternoon (12:00 - 18:00)</SelectItem>
                                            <SelectItem value="evening">Evening (18:00 - 24:00)</SelectItem>
                                            <SelectItem value="night">Night (00:00 - 06:00)</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
                              <div>
            <FormField
              control={form.control}
                                  name={`journeys.${index}.flightPreference`}
              render={({ field }) => (
                <FormItem>
                                      <Label className="block mb-1.5 font-medium text-[12px] text-[#47536C] uppercase">
                                        FLIGHT PREFERENCE
                                      </Label>
                                      <FormControl>
                                        <Input
                                          {...field}
                                          placeholder="e.g. Window, Aisle, Extra Legroom"
                                          disabled={mode !== "create"}
                                          className="h-[40px] border-0 border-b border-gray-300 rounded-none px-0 pt-2 pb-1 text-sm bg-transparent focus:outline-none focus:ring-0 focus:border-0 focus:border-b-2 focus:border-[#0D9C99] focus-visible:outline-none focus-visible:ring-0 focus-visible:border-0 focus-visible:border-b-2 focus-visible:border-[#0D9C99] shadow-none"
                                        />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                              </div>
                              <div>
            <FormField
              control={form.control}
                                  name={`journeys.${index}.mealPreference`}
              render={({ field }) => (
                <FormItem>
                                      <Label className="block mb-1.5 font-medium text-[12px] text-[#47536C] uppercase">
                                        MEAL PREFERENCE
                                      </Label>
                                      <FormControl>
                  <Select
                    value={field.value}
                                          onValueChange={field.onChange}
                    disabled={mode !== "create"}
                  >
                                          <SelectTrigger className="h-[40px] border-0 border-b border-gray-300 rounded-none px-0 pt-2 pb-1 bg-transparent focus:outline-none focus:ring-0 focus:ring-offset-0 focus:border-0 focus:border-b-2 focus:border-[#0D9C99] focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-0 focus-visible:border-b-2 focus-visible:border-[#0D9C99] shadow-none">
                                            <SelectValue placeholder="Select meal" />
                                          </SelectTrigger>
                                          <SelectContent>
                                            <SelectItem value="veg">Veg</SelectItem>
                                            <SelectItem value="non-veg">Non Veg</SelectItem>
                                          </SelectContent>
                                        </Select>
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                              </div>
                            </div>
                          </>
                        )}

                        {travelMode === "train" && (
                          <div className="grid grid-cols-4 gap-4">
                            <div>
                              <FormField
                                control={form.control}
                                name={`journeys.${index}.source`}
                                render={({ field }) => (
                                  <FormItem>
                                    <Label className="block mb-1.5 font-medium text-[12px] text-[#47536C] uppercase">
                                      SOURCE STATION
                                    </Label>
                    <FormControl>
                                      <Input
                                        {...field}
                                        placeholder="e.g. London St Pancras"
                                        disabled={mode !== "create"}
                                        className="h-[40px] border-0 border-b border-gray-300 rounded-none px-0 pt-2 pb-1 text-sm bg-transparent focus:outline-none focus:ring-0 focus:border-0 focus:border-b-2 focus:border-[#0D9C99] focus-visible:outline-none focus-visible:ring-0 focus-visible:border-0 focus-visible:border-b-2 focus-visible:border-[#0D9C99] shadow-none"
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>
                            <div>
                              <FormField
                                control={form.control}
                                name={`journeys.${index}.destination`}
                                render={({ field }) => (
                                  <FormItem>
                                    <Label className="block mb-1.5 font-medium text-[12px] text-[#47536C] uppercase">
                                      DESTINATION STATION
                                    </Label>
                    <FormControl>
                                      <Input
                                        {...field}
                                        placeholder="e.g. Paris Gare du Nord"
                                        disabled={mode !== "create"}
                                        className="h-[40px] border-0 border-b border-gray-300 rounded-none px-0 pt-2 pb-1 text-sm bg-transparent focus:outline-none focus:ring-0 focus:border-0 focus:border-b-2 focus:border-[#0D9C99] focus-visible:outline-none focus-visible:ring-0 focus-visible:border-0 focus-visible:border-b-2 focus-visible:border-[#0D9C99] shadow-none"
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                        </div>
                            <div>
                              <FormField
                                control={form.control}
                                name={`journeys.${index}.startDate`}
                                render={({ field }) => (
                                  <FormItem>
                                    <Label className="block mb-1.5 font-medium text-[12px] text-[#47536C] uppercase">
                                      TRAVEL DATE
                                    </Label>
                                    <FormControl>
                                      <TripDateField
                                        value={field.value || ""}
                                        onChange={field.onChange}
                                        disabled={mode !== "create"}
                                        minDate={today}
                                        className="h-[40px] border-0 border-b border-gray-300 rounded-none pr-0 pt-2 pb-1 bg-transparent focus:outline-none focus:ring-0 focus:border-0 focus:border-b-2 focus:border-[#0D9C99] focus-visible:outline-none focus-visible:ring-0 focus-visible:border-0 focus-visible:border-b-2 focus-visible:border-[#0D9C99] shadow-none [&_input]:pr-10 [&_input]:pl-0 [&_input]:focus:border-0 [&_input]:focus:border-b-2 [&_input]:focus:border-[#0D9C99] [&_input]:focus-visible:outline-none [&_input]:focus-visible:ring-0 [&_input]:focus-visible:border-0 [&_input]:focus-visible:border-b-2 [&_input]:focus-visible:border-[#0D9C99]"
                                      />
                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                          </div>
                            <div>
                              <FormField
                                control={form.control}
                                name={`journeys.${index}.classPreference`}
                                render={({ field }) => (
                                  <FormItem>
                                    <Label className="block mb-1.5 font-medium text-[12px] text-[#47536C] uppercase">
                                      CLASS PREFERENCE
                                    </Label>
                                    <FormControl>
                                      <Select
                                        value={field.value}
                                        onValueChange={field.onChange}
                                        disabled={mode !== "create"}
                                      >
                                        <SelectTrigger className="h-[40px] border-0 border-b border-gray-300 rounded-none px-0 pt-2 pb-1 bg-transparent focus:outline-none focus:ring-0 focus:ring-offset-0 focus:border-0 focus:border-b-2 focus:border-[#0D9C99] focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-0 focus-visible:border-b-2 focus-visible:border-[#0D9C99] shadow-none">
                                          <SelectValue placeholder="Select class" />
                      </SelectTrigger>
                    <SelectContent>
                                          <SelectItem value="first">First Class (AC)</SelectItem>
                                          <SelectItem value="second">Second Class</SelectItem>
                                          <SelectItem value="sleeper">Sleeper</SelectItem>
                    </SelectContent>
                  </Select>
                                    </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
                            </div>
                          </div>
                        )}

                        {travelMode === "bus" && (
                          <div className="grid grid-cols-4 gap-4">
                            <div>
            <FormField
              control={form.control}
                                name={`journeys.${index}.source`}
              render={({ field }) => (
                <FormItem>
                                    <Label className="block mb-1.5 font-medium text-[12px] text-[#47536C] uppercase">
                                      FROM LOCATION
                                    </Label>
                  <FormControl>
                      <Input
                        {...field}
                                        placeholder="e.g. Paris City Center"
                        disabled={mode !== "create"}
                                        className="h-[40px] border-0 border-b border-gray-300 rounded-none px-0 pt-2 pb-1 text-sm bg-transparent focus:outline-none focus:ring-0 focus:border-0 focus:border-b-2 focus:border-[#0D9C99] focus-visible:outline-none focus-visible:ring-0 focus-visible:border-0 focus-visible:border-b-2 focus-visible:border-[#0D9C99] shadow-none"
                      />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
                      />
                    </div>
          <div>
            <FormField
              control={form.control}
                                name={`journeys.${index}.destination`}
              render={({ field }) => (
                <FormItem>
                                    <Label className="block mb-1.5 font-medium text-[12px] text-[#47536C] uppercase">
                                      TO LOCATION
                                    </Label>
                  <FormControl>
                    <Input
                      {...field}
                                        placeholder="e.g. Brussels-Midi"
                      disabled={mode !== "create"}
                                        className="h-[40px] border-0 border-b border-gray-300 rounded-none px-0 pt-2 pb-1 text-sm bg-transparent focus:outline-none focus:ring-0 focus:border-0 focus:border-b-2 focus:border-[#0D9C99] focus-visible:outline-none focus-visible:ring-0 focus-visible:border-0 focus-visible:border-b-2 focus-visible:border-[#0D9C99] shadow-none"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <div>
            <FormField
              control={form.control}
                                name={`journeys.${index}.startDate`}
              render={({ field }) => (
                <FormItem>
                                    <Label className="block mb-1.5 font-medium text-[12px] text-[#47536C] uppercase">
                                      TRAVEL DATE
                                    </Label>
                  <FormControl>
                                      <TripDateField
                                        value={field.value || ""}
                                        onChange={field.onChange}
                        disabled={mode !== "create"}
                                        minDate={today}
                                        className="h-[40px] border-0 border-b border-gray-300 rounded-none pr-0 pt-2 pb-1 bg-transparent focus:outline-none focus:ring-0 focus:border-0 focus:border-b-2 focus:border-[#0D9C99] focus-visible:outline-none focus-visible:ring-0 focus-visible:border-0 focus-visible:border-b-2 focus-visible:border-[#0D9C99] shadow-none [&_input]:pr-10 [&_input]:pl-0 [&_input]:focus:border-0 [&_input]:focus:border-b-2 [&_input]:focus:border-[#0D9C99] [&_input]:focus-visible:outline-none [&_input]:focus-visible:ring-0 [&_input]:focus-visible:border-0 [&_input]:focus-visible:border-b-2 [&_input]:focus-visible:border-[#0D9C99]"
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                      />
                    </div>
                    <div>
                              <FormField
                                control={form.control}
                                name={`journeys.${index}.departureTime`}
                                render={({ field }) => (
                                  <FormItem>
                                    <Label className="block mb-1.5 font-medium text-[12px] text-[#47536C] uppercase">
                                      DEPARTURE TIME
                                    </Label>
                  <FormControl>
                    <Input
                      {...field}
                                        type="time"
                                        placeholder="09:00 AM"
                      disabled={mode !== "create"}
                                        className="h-[40px] border-0 border-b border-gray-300 rounded-none px-0 pt-2 pb-1 text-sm bg-transparent focus:outline-none focus:ring-0 focus:border-0 focus:border-b-2 focus:border-[#0D9C99] focus-visible:outline-none focus-visible:ring-0 focus-visible:border-0 focus-visible:border-b-2 focus-visible:border-[#0D9C99] shadow-none"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
                          </div>
                        )}

                        {travelMode === "cab" && (
                          <>
                            <div className="grid grid-cols-2 gap-4">
                              <div>
            <FormField
              control={form.control}
                                  name={`journeys.${index}.source`}
              render={({ field }) => (
                <FormItem>
                                      <Label className="block mb-1.5 font-medium text-[12px] text-[#47536C] uppercase">
                                        PICKUP LOCATION
                                      </Label>
                  <FormControl>
                                        <Input
                                          {...field}
                                          placeholder="e.g. Brussels-Midi Station"
                                          disabled={mode !== "create"}
                                          className="h-[40px] border-0 border-b border-gray-300 rounded-none px-0 pt-2 pb-1 text-sm bg-transparent focus:outline-none focus:ring-0 focus:border-0 focus:border-b-2 focus:border-[#0D9C99] focus-visible:outline-none focus-visible:ring-0 focus-visible:border-0 focus-visible:border-b-2 focus-visible:border-[#0D9C99] shadow-none"
                                        />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
                              </div>
                    <div>
            <FormField
              control={form.control}
                                  name={`journeys.${index}.destination`}
              render={({ field }) => (
                <FormItem>
                                      <Label className="block mb-1.5 font-medium text-[12px] text-[#47536C] uppercase">
                                        DROP LOCATION
                                      </Label>
                  <FormControl>
                                        <Input
                                          {...field}
                                          placeholder="e.g. Chronon HQ, Rue de la Loi"
                        disabled={mode !== "create"}
                                          className="h-[40px] border-0 border-b border-gray-300 rounded-none px-0 pt-2 pb-1 text-sm bg-transparent focus:outline-none focus:ring-0 focus:border-0 focus:border-b-2 focus:border-[#0D9C99] focus-visible:outline-none focus-visible:ring-0 focus-visible:border-0 focus-visible:border-b-2 focus-visible:border-[#0D9C99] shadow-none"
                                        />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                      />
                    </div>
                            </div>
                            <div>
                              <Label className="block mb-1.5 font-medium text-[12px] text-[#47536C] uppercase">
                                PERIOD (DATE/TIME RANGE)
                              </Label>
                              <div className="flex items-center gap-2">
                                <FormField
                                  control={form.control}
                                  name={`journeys.${index}.periodStart`}
                                  render={({ field }) => (
                                    <FormItem className="flex-1">
                                      <FormControl>
                                        <Input
                                          {...field}
                                          type="datetime-local"
                                          placeholder="11/20/2023, 02:30 PM"
                                          disabled={mode !== "create"}
                                          className="h-[40px] border-0 border-b border-gray-300 rounded-none px-0 pt-2 pb-1 text-sm bg-transparent focus:outline-none focus:ring-0 focus:border-0 focus:border-b-2 focus:border-[#0D9C99] focus-visible:outline-none focus-visible:ring-0 focus-visible:border-0 focus-visible:border-b-2 focus-visible:border-[#0D9C99] shadow-none"
                                        />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
                                <span className="text-gray-400">-</span>
            <FormField
              control={form.control}
                                  name={`journeys.${index}.periodEnd`}
                                  render={({ field }) => (
                                    <FormItem className="flex-1">
                                      <FormControl>
                                        <Input
                                          {...field}
                                          type="datetime-local"
                                          placeholder="11/20/2023, 03:30 PM"
                                          disabled={mode !== "create"}
                                          className="h-[40px] border-0 border-b border-gray-300 rounded-none px-0 pt-2 pb-1 text-sm bg-transparent focus:outline-none focus:ring-0 focus:border-0 focus:border-b-2 focus:border-[#0D9C99] focus-visible:outline-none focus-visible:ring-0 focus-visible:border-0 focus-visible:border-b-2 focus-visible:border-[#0D9C99] shadow-none"
                                        />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
                            </div>
                          </>
                        )}

                      {journey?.needsAccommodation && (
                        <div className="space-y-4 mt-6">
                          <h4 className="font-medium text-sm text-gray-900 mb-4">ACCOMMODATION</h4>
                          
                          <div className="grid grid-cols-3 gap-6">
                            <div>
                              <FormField
                                control={form.control}
                                name={`journeys.${index}.checkInDate`}
              render={({ field }) => (
                <FormItem>
                                    <Label className="block mb-1.5 font-medium text-[12px] text-[#47536C] uppercase">
                                      CHECK IN DATE
                                    </Label>
                  <FormControl>
                                      <TripDateField
                                        value={field.value || ""}
                                        onChange={field.onChange}
                                        disabled={mode !== "create"}
                                        minDate={today}
                                        className="h-[40px] border-0 border-b border-gray-300 rounded-none pr-0 pt-2 pb-1 bg-transparent focus:outline-none focus:ring-0 focus:border-0 focus:border-b-2 focus:border-[#0D9C99] focus-visible:outline-none focus-visible:ring-0 focus-visible:border-0 focus-visible:border-b-2 focus-visible:border-[#0D9C99] shadow-none [&_input]:pr-10 [&_input]:pl-0 [&_input]:focus:border-0 [&_input]:focus:border-b-2 [&_input]:focus:border-[#0D9C99] [&_input]:focus-visible:outline-none [&_input]:focus-visible:ring-0 [&_input]:focus-visible:border-0 [&_input]:focus-visible:border-b-2 [&_input]:focus-visible:border-[#0D9C99]"
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>
                    <div>
                              <FormField
                                control={form.control}
                                name={`journeys.${index}.checkOutDate`}
                                render={({ field }) => (
                                  <FormItem>
                                    <Label className="block mb-1.5 font-medium text-[12px] text-[#47536C] uppercase">
                                      CHECK OUT DATE
                                    </Label>
                                    <FormControl>
                                      <TripDateField
                                        value={field.value || ""}
                                        onChange={field.onChange}
                        disabled={mode !== "create"}
                                        minDate={today}
                                        className="h-[40px] border-0 border-b border-gray-300 rounded-none pr-0 pt-2 pb-1 bg-transparent focus:outline-none focus:ring-0 focus:border-0 focus:border-b-2 focus:border-[#0D9C99] focus-visible:outline-none focus-visible:ring-0 focus-visible:border-0 focus-visible:border-b-2 focus-visible:border-[#0D9C99] shadow-none [&_input]:pr-10 [&_input]:pl-0 [&_input]:focus:border-0 [&_input]:focus:border-b-2 [&_input]:focus:border-[#0D9C99] [&_input]:focus-visible:outline-none [&_input]:focus-visible:ring-0 [&_input]:focus-visible:border-0 [&_input]:focus-visible:border-b-2 [&_input]:focus-visible:border-[#0D9C99]"
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                      />
                    </div>
                            <div>
                              <FormField
                                control={form.control}
                                name={`journeys.${index}.location`}
                                render={({ field }) => (
                                  <FormItem>
                                    <Label className="block mb-1.5 font-medium text-[12px] text-[#47536C] uppercase">
                                      LOCATION
                                    </Label>
                                    <FormControl>
                                      <Input
                                        {...field}
                                        placeholder="Enter location"
                                        disabled={mode !== "create"}
                                        className="h-[40px] border-0 border-b border-gray-300 rounded-none px-0 pt-2 pb-1 text-sm bg-transparent focus:outline-none focus:ring-0 focus:border-0 focus:border-b-2 focus:border-[#0D9C99] focus-visible:outline-none focus-visible:ring-0 focus-visible:border-0 focus-visible:border-b-2 focus-visible:border-[#0D9C99] shadow-none"
                                      />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
                          </div>

                          <div className="space-y-2">
                            <Label className="block font-medium text-[12px] text-[#47536C] uppercase">
                              OCCUPANCY
                            </Label>
                            <FormField
                              control={form.control}
                              name={`journeys.${index}.occupancy`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormControl>
                                    <div className="flex gap-4">
                                      <div className="flex items-center gap-2">
                                        <input
                                          type="radio"
                                          id={`occupancy-single-${index}`}
                                          value="single"
                                          checked={field.value === "single"}
                                          onChange={() => field.onChange("single")}
                                          disabled={mode === "view"}
                                          className="w-4 h-4 text-[#0D9C99] focus:ring-[#0D9C99]"
                                        />
                                        <Label htmlFor={`occupancy-single-${index}`} className="text-sm font-normal text-gray-700 cursor-pointer">
                                          SINGLE
                                        </Label>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <input
                                          type="radio"
                                          id={`occupancy-double-${index}`}
                                          value="double"
                                          checked={field.value === "double"}
                                          onChange={() => field.onChange("double")}
                                          disabled={mode === "view"}
                                          className="w-4 h-4 text-[#0D9C99] focus:ring-[#0D9C99]"
                                        />
                                        <Label htmlFor={`occupancy-double-${index}`} className="text-sm font-normal text-gray-700 cursor-pointer">
                                          DOUBLE
                                        </Label>
                                      </div>
                                    </div>
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>

                          <div className="space-y-4">
                            <FormField
                              control={form.control}
                              name={`journeys.${index}.preferredHotel1`}
                              render={({ field }) => (
                                <FormItem>
                                  <Label className="block mb-1.5 font-medium text-[12px] text-[#47536C] uppercase">
                                    Preferred Hotel Option (1)
                                  </Label>
                                  <FormControl>
                                    <Input
                                      {...field}
                                      placeholder="Enter Preferred Hotel Option (1)"
                                      disabled={mode !== "create"}
                                      className="h-[40px] border-0 border-b border-gray-300 rounded-none px-0 pt-2 pb-1 text-sm bg-transparent focus:outline-none focus:ring-0 focus:border-0 focus:border-b-2 focus:border-[#0D9C99] focus-visible:outline-none focus-visible:ring-0 focus-visible:border-0 focus-visible:border-b-2 focus-visible:border-[#0D9C99] shadow-none"
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name={`journeys.${index}.preferredHotel2`}
                              render={({ field }) => (
                                <FormItem>
                                  <Label className="block mb-1.5 font-medium text-[12px] text-[#47536C] uppercase">
                                    Preferred Hotel Option (2)
                                  </Label>
                                  <FormControl>
                                    <Input
                                      {...field}
                                      placeholder="Enter Preferred Hotel Option (2)"
                                      disabled={mode !== "create"}
                                      className="h-[40px] border-0 border-b border-gray-300 rounded-none px-0 pt-2 pb-1 text-sm bg-transparent focus:outline-none focus:ring-0 focus:border-0 focus:border-b-2 focus:border-[#0D9C99] focus-visible:outline-none focus-visible:ring-0 focus-visible:border-0 focus-visible:border-b-2 focus-visible:border-[#0D9C99] shadow-none"
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name={`journeys.${index}.preferredHotel3`}
                              render={({ field }) => (
                                <FormItem>
                                  <Label className="block mb-1.5 font-medium text-[12px] text-[#47536C] uppercase">
                                    Preferred Hotel Option (3)
                                  </Label>
                                  <FormControl>
                                    <Input
                                      {...field}
                                      placeholder="Enter Preferred Hotel Option (3)"
                                      disabled={mode !== "create"}
                                      className="h-[40px] border-0 border-b border-gray-300 rounded-none px-0 pt-2 pb-1 text-sm bg-transparent focus:outline-none focus:ring-0 focus:border-0 focus:border-b-2 focus:border-[#0D9C99] focus-visible:outline-none focus-visible:ring-0 focus-visible:border-0 focus-visible:border-b-2 focus-visible:border-[#0D9C99] shadow-none"
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                        </div>
                      )}
                      </div>
                    </div>
                  );
                })}

            <Button
              type="button"
              variant="outline"
                  onClick={() =>
                    append({
                      travelMode: "flight",
                      source: "",
                      destination: "",
                      startDate: "",
                      endDate: "",
                      timePreference: "",
                      flightPreference: "",
                      mealPreference: "",
                    })
                  }
                  disabled={mode !== "create"}
                  className="w-full border-[#0D9C99] text-[#0D9C99] hover:bg-[#0D9C99] hover:text-white"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  ADD ANOTHER JOURNEY
            </Button>
              </div>
        </form>
      </Form>
        </div>
      </div>

      {mode !== "view" && (
        <FormActionFooter
          secondaryButton={{
            label: "Cancel",
            onClick: handleBack,
          }}
          primaryButton={{
            label: "Submit for Approval",
            onClick: () => {
              const formElement = document.getElementById("trip-form") as HTMLFormElement;
              if (formElement) {
                formElement.requestSubmit();
              }
            },
            disabled: loading,
            loading: loading,
            loadingText: "Submitting...",
          }}
        />
      )}
    </div>
  );
}

export default CreatePreApprovalForm;
