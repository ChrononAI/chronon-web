import * as z from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { useState, useEffect } from "react";
import { format } from "date-fns";
import { toast } from "sonner";

type TravelMode = "flight" | "train" | "bus" | "cab";

const journeySchema = z.object({
  travelMode: z.enum(["flight", "train", "bus", "cab"]),
  // Flight fields
  flightSource: z.string().optional(),
  flightDestination: z.string().optional(),
  flightStartDate: z.string().optional(),
  flightEndDate: z.string().optional(),
  // Train fields
  trainSource: z.string().optional(),
  trainDestination: z.string().optional(),
  trainStartDate: z.string().optional(),
  // Bus fields
  busSource: z.string().optional(),
  busDestination: z.string().optional(),
  busStartDate: z.string().optional(),
  // Cab fields
  cabSource: z.string().optional(),
  cabDestination: z.string().optional(),
  cabPeriodStart: z.string().optional(),
  cabPeriodEnd: z.string().optional(),
  // Common fields
  timePreference: z.string().optional(),
  flightPreference: z.string().optional(),
  mealPreference: z.string().optional(),
  classPreference: z.string().optional(),
  departureTime: z.string().optional(),
  needsAccommodation: z.boolean().optional(),
  checkInDate: z.string().optional(),
  checkOutDate: z.string().optional(),
  location: z.string().optional(),
  hotel_city: z.string().optional(),
  preferredHotel1: z.string().optional(),
  preferredHotel2: z.string().optional(),
  preferredHotel3: z.string().optional(),
  occupancy: z.enum(["single", "double"]).optional(),
}).refine((data) => {
  if (data.travelMode === "flight") {
    return !!(data.flightSource && data.flightDestination && data.flightStartDate);
  }
  if (data.travelMode === "train") {
    return !!(data.trainSource && data.trainDestination && data.trainStartDate);
  }
  if (data.travelMode === "bus") {
    return !!(data.busSource && data.busDestination && data.busStartDate);
  }
  if (data.travelMode === "cab") {
    return !!(data.cabSource && data.cabDestination && data.cabPeriodStart);
  }
  return true;
}, {
  message: "Required fields are missing for the selected travel mode",
}).refine((data) => {
  if (data.needsAccommodation && !data.checkInDate) {
    return false;
  }
  return true;
}, {
  message: "Check in date is required",
  path: ["checkInDate"],
}).refine((data) => {
  if (data.needsAccommodation && !data.checkOutDate) {
    return false;
  }
  return true;
}, {
  message: "Check out date is required",
  path: ["checkOutDate"],
}).refine((data) => {
  if (data.needsAccommodation && !data.location) {
    return false;
  }
  return true;
}, {
  message: "Location is required",
  path: ["location"],
});

type JourneyFormValues = z.infer<typeof journeySchema>;

interface JourneyModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (journey: JourneyFormValues) => Promise<void>;
  journey?: JourneyFormValues | null;
  mode?: "create" | "edit";
}

export function JourneyModal({
  open,
  onOpenChange,
  onSave,
  journey,
  mode = "create",
}: JourneyModalProps) {
  const [loading, setLoading] = useState(false);
  const today = format(new Date(), "yyyy-MM-dd");

  const defaultValues = {
    travelMode: "flight" as TravelMode,
    // Flight fields
    flightSource: "",
    flightDestination: "",
    flightStartDate: "",
    flightEndDate: "",
    // Train fields
    trainSource: "",
    trainDestination: "",
    trainStartDate: "",
    // Bus fields
    busSource: "",
    busDestination: "",
    busStartDate: "",
    cabSource: "",
    cabDestination: "",
    cabPeriodStart: "",
    cabPeriodEnd: "",
    timePreference: "",
    flightPreference: "",
    mealPreference: "",
    classPreference: "",
    departureTime: "",
    needsAccommodation: false,
    checkInDate: "",
    checkOutDate: "",
    location: "",
    hotel_city: "",
    preferredHotel1: "",
    preferredHotel2: "",
    preferredHotel3: "",
    occupancy: "single" as const,
  };

  const form = useForm<JourneyFormValues>({
    resolver: zodResolver(journeySchema),
    defaultValues: journey || defaultValues,
  });

  // Reset form when journey changes or modal opens
  useEffect(() => {
    if (open) {
      if (journey) {
        form.reset(journey);
      } else {
        form.reset(defaultValues);
      }
    }
  }, [journey, open, form]);

  const travelMode = form.watch("travelMode");
  const needsAccommodation = form.watch("needsAccommodation");


  const onSubmit = async (data: JourneyFormValues) => {
    try {
      setLoading(true);
      const transformedData: any = {
        ...data,
        source: data.travelMode === "flight" ? data.flightSource 
              : data.travelMode === "train" ? data.trainSource
              : data.travelMode === "bus" ? data.busSource
              : data.cabSource || "",
        destination: data.travelMode === "flight" ? data.flightDestination
                   : data.travelMode === "train" ? data.trainDestination
                   : data.travelMode === "bus" ? data.busDestination
                   : data.cabDestination || "",
        startDate: data.travelMode === "flight" ? data.flightStartDate
                : data.travelMode === "train" ? data.trainStartDate
                : data.travelMode === "bus" ? data.busStartDate
                : "",
        endDate: data.travelMode === "flight" ? data.flightEndDate : "",
        periodStart: data.travelMode === "cab" ? data.cabPeriodStart : "",
        periodEnd: data.travelMode === "cab" ? data.cabPeriodEnd : "",
      };
      await onSave(transformedData);
      form.reset();
      onOpenChange(false);
      toast.success(mode === "edit" ? "Journey updated successfully" : "Journey added successfully");
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to save journey");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === "edit" ? "Edit Journey" : "Add Journey"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Travel Mode Selection */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="block font-bold text-[12px] text-[#47536C] uppercase">
                  TRAVEL MODE
                </Label>
                <div className="flex items-center gap-2">
                  <Label className="text-xs text-gray-600 font-normal">Accommodation</Label>
                  <FormField
                    control={form.control}
                    name="needsAccommodation"
                    render={({ field }) => (
                      <FormControl>
                        <Switch
                          checked={field.value || false}
                          onCheckedChange={field.onChange}
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
                    onClick={() => form.setValue("travelMode", travelModeOption)}
                    disabled={mode === "edit" || loading}
                    className={`capitalize rounded-full ${
                      travelMode === travelModeOption
                        ? "bg-[#161B53] text-white hover:bg-[#161B53]"
                        : "bg-white text-gray-700 hover:bg-gray-50 border border-gray-300"
                    } ${mode === "edit" && travelMode !== travelModeOption ? "opacity-50 cursor-not-allowed" : ""}`}
                  >
                    {travelModeOption}
                  </Button>
                ))}
              </div>
            </div>

            {/* Flight Mode Fields */}
            {travelMode === "flight" && (
              <>
                <div className="grid grid-cols-4 gap-6">
                  <FormField
                    control={form.control}
                    name="flightSource"
                    render={({ field }) => (
                      <FormItem>
                        <Label className="block mb-2.5 font-bold text-[12px] text-[#47536C] uppercase">
                          SOURCE CITY
                        </Label>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="e.g. New York (JFK)"
                            className="h-[40px] border-0 border-b border-gray-300 rounded-none px-0 pt-2 pb-1 text-sm bg-transparent focus:outline-none focus:ring-0 focus:border-0 focus:border-b-2 focus:border-[#0D9C99] focus-visible:outline-none focus-visible:ring-0 focus-visible:border-0 focus-visible:border-b-2 focus-visible:border-[#0D9C99] shadow-none"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="flightDestination"
                    render={({ field }) => (
                      <FormItem>
                        <Label className="block mb-2.5 font-bold text-[12px] text-[#47536C] uppercase">
                          DESTINATION CITY
                        </Label>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="e.g. London (LHR)"
                            className="h-[40px] border-0 border-b border-gray-300 rounded-none px-0 pt-2 pb-1 text-sm bg-transparent focus:outline-none focus:ring-0 focus:border-0 focus:border-b-2 focus:border-[#0D9C99] focus-visible:outline-none focus-visible:ring-0 focus-visible:border-0 focus-visible:border-b-2 focus-visible:border-[#0D9C99] shadow-none"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="flightStartDate"
                    render={({ field }) => (
                      <FormItem>
                        <Label className="block mb-2.5 font-bold text-[12px] text-[#47536C] uppercase">
                          START DATE
                        </Label>
                        <FormControl>
                          <TripDateField
                            value={field.value || ""}
                            onChange={field.onChange}
                            minDate={today}
                            className="h-[40px] border-0 border-b border-gray-300 rounded-none pr-0 pt-2 pb-1 bg-transparent focus:outline-none focus:ring-0 focus:border-0 focus:border-b-2 focus:border-[#0D9C99] focus-visible:outline-none focus-visible:ring-0 focus-visible:border-0 focus-visible:border-b-2 focus-visible:border-[#0D9C99] shadow-none [&_input]:pr-10 [&_input]:pl-0 [&_input]:focus:border-0 [&_input]:focus:border-b-2 [&_input]:focus:border-[#0D9C99] [&_input]:focus-visible:outline-none [&_input]:focus-visible:ring-0 [&_input]:focus-visible:border-0 [&_input]:focus-visible:border-b-2 [&_input]:focus-visible:border-[#0D9C99]"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="flightEndDate"
                    render={({ field }) => (
                      <FormItem>
                        <Label className="block mb-2.5 font-bold text-[12px] text-[#47536C] uppercase">
                          END DATE (IF RETURN)
                        </Label>
                        <FormControl>
                          <TripDateField
                            value={field.value || ""}
                            onChange={field.onChange}
                            minDate={form.watch("flightStartDate") || today}
                            className="h-[40px] border-0 border-b border-gray-300 rounded-none pr-0 pt-2 pb-1 bg-transparent focus:outline-none focus:ring-0 focus:border-0 focus:border-b-2 focus:border-[#0D9C99] focus-visible:outline-none focus-visible:ring-0 focus-visible:border-0 focus-visible:border-b-2 focus-visible:border-[#0D9C99] shadow-none [&_input]:pr-10 [&_input]:pl-0 [&_input]:focus:border-0 [&_input]:focus:border-b-2 [&_input]:focus:border-[#0D9C99] [&_input]:focus-visible:outline-none [&_input]:focus-visible:ring-0 [&_input]:focus-visible:border-0 [&_input]:focus-visible:border-b-2 [&_input]:focus-visible:border-[#0D9C99]"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid grid-cols-3 gap-6">
                  <FormField
                    control={form.control}
                    name="timePreference"
                    render={({ field }) => (
                      <FormItem>
                        <Label className="block mb-2.5 font-bold text-[12px] text-[#47536C] uppercase">
                          TIME PREFERENCE
                        </Label>
                        <FormControl>
                          <Select value={field.value} onValueChange={field.onChange}>
                            <SelectTrigger className="h-[40px] border-0 border-b border-gray-300 rounded-none px-0 pt-2 pb-1 bg-transparent focus:outline-none focus:ring-0 focus:ring-offset-0 focus:border-0 focus:border-b-2 focus:border-[#0D9C99] focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-0 focus-visible:border-b-2 focus-visible:border-[#0D9C99] shadow-none">
                              <SelectValue placeholder="Select time" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="morning">Morning</SelectItem>
                              <SelectItem value="afternoon">Afternoon</SelectItem>
                              <SelectItem value="evening">Evening</SelectItem>
                              <SelectItem value="night">Night</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="flightPreference"
                    render={({ field }) => (
                      <FormItem>
                        <Label className="block mb-2.5 font-bold text-[12px] text-[#47536C] uppercase">
                          FLIGHT PREFERENCE
                        </Label>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="e.g. Window, Aisle, Extra Legroom"
                            className="h-[40px] border-0 border-b border-gray-300 rounded-none px-0 pt-2 pb-1 text-sm bg-transparent focus:outline-none focus:ring-0 focus:border-0 focus:border-b-2 focus:border-[#0D9C99] focus-visible:outline-none focus-visible:ring-0 focus-visible:border-0 focus-visible:border-b-2 focus-visible:border-[#0D9C99] shadow-none"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="mealPreference"
                    render={({ field }) => (
                      <FormItem>
                        <Label className="block mb-2.5 font-bold text-[12px] text-[#47536C] uppercase">
                          MEAL PREFERENCE
                        </Label>
                        <FormControl>
                          <Select value={field.value} onValueChange={field.onChange}>
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
              </>
            )}

            {/* Train Mode Fields */}
            {travelMode === "train" && (
              <div className="grid grid-cols-4 gap-6">
                <FormField
                  control={form.control}
                  name="trainSource"
                  render={({ field }) => (
                    <FormItem>
                      <Label className="block mb-2.5 font-bold text-[12px] text-[#47536C] uppercase">
                        SOURCE STATION
                      </Label>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="e.g. London St Pancras"
                          className="h-[40px] border-0 border-b border-gray-300 rounded-none px-0 pt-2 pb-1 text-sm bg-transparent focus:outline-none focus:ring-0 focus:border-0 focus:border-b-2 focus:border-[#0D9C99] focus-visible:outline-none focus-visible:ring-0 focus-visible:border-0 focus-visible:border-b-2 focus-visible:border-[#0D9C99] shadow-none"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="trainDestination"
                  render={({ field }) => (
                    <FormItem>
                      <Label className="block mb-2.5 font-bold text-[12px] text-[#47536C] uppercase">
                        DESTINATION STATION
                      </Label>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="e.g. Paris Gare du Nord"
                          className="h-[40px] border-0 border-b border-gray-300 rounded-none px-0 pt-2 pb-1 text-sm bg-transparent focus:outline-none focus:ring-0 focus:border-0 focus:border-b-2 focus:border-[#0D9C99] focus-visible:outline-none focus-visible:ring-0 focus-visible:border-0 focus-visible:border-b-2 focus-visible:border-[#0D9C99] shadow-none"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="trainStartDate"
                  render={({ field }) => (
                    <FormItem>
                      <Label className="block mb-2.5 font-bold text-[12px] text-[#47536C] uppercase">
                        TRAVEL DATE
                      </Label>
                      <FormControl>
                        <TripDateField
                          value={field.value || ""}
                          onChange={field.onChange}
                          minDate={today}
                          className="h-[40px] border-0 border-b border-gray-300 rounded-none pr-0 pt-2 pb-1 bg-transparent focus:outline-none focus:ring-0 focus:border-0 focus:border-b-2 focus:border-[#0D9C99] focus-visible:outline-none focus-visible:ring-0 focus-visible:border-0 focus-visible:border-b-2 focus-visible:border-[#0D9C99] shadow-none [&_input]:pr-10 [&_input]:pl-0 [&_input]:focus:border-0 [&_input]:focus:border-b-2 [&_input]:focus:border-[#0D9C99] [&_input]:focus-visible:outline-none [&_input]:focus-visible:ring-0 [&_input]:focus-visible:border-0 [&_input]:focus-visible:border-b-2 [&_input]:focus-visible:border-[#0D9C99]"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="classPreference"
                  render={({ field }) => (
                    <FormItem>
                      <Label className="block mb-2.5 font-bold text-[12px] text-[#47536C] uppercase">
                        CLASS PREFERENCE
                      </Label>
                      <FormControl>
                        <Select value={field.value} onValueChange={field.onChange}>
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
            )}

            {/* Bus Mode Fields */}
            {travelMode === "bus" && (
              <div className="grid grid-cols-4 gap-6">
                <FormField
                  control={form.control}
                  name="busSource"
                  render={({ field }) => (
                    <FormItem>
                      <Label className="block mb-2.5 font-bold text-[12px] text-[#47536C] uppercase">
                        FROM LOCATION
                      </Label>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="e.g. Paris City Center"
                          className="h-[40px] border-0 border-b border-gray-300 rounded-none px-0 pt-2 pb-1 text-sm bg-transparent focus:outline-none focus:ring-0 focus:border-0 focus:border-b-2 focus:border-[#0D9C99] focus-visible:outline-none focus-visible:ring-0 focus-visible:border-0 focus-visible:border-b-2 focus-visible:border-[#0D9C99] shadow-none"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="busDestination"
                  render={({ field }) => (
                    <FormItem>
                      <Label className="block mb-2.5 font-bold text-[12px] text-[#47536C] uppercase">
                        TO LOCATION
                      </Label>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="e.g. Brussels-Midi"
                          className="h-[40px] border-0 border-b border-gray-300 rounded-none px-0 pt-2 pb-1 text-sm bg-transparent focus:outline-none focus:ring-0 focus:border-0 focus:border-b-2 focus:border-[#0D9C99] focus-visible:outline-none focus-visible:ring-0 focus-visible:border-0 focus-visible:border-b-2 focus-visible:border-[#0D9C99] shadow-none"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="busStartDate"
                  render={({ field }) => (
                    <FormItem>
                      <Label className="block mb-2.5 font-bold text-[12px] text-[#47536C] uppercase">
                        TRAVEL DATE
                      </Label>
                      <FormControl>
                        <TripDateField
                          value={field.value || ""}
                          onChange={field.onChange}
                          minDate={today}
                          className="h-[40px] border-0 border-b border-gray-300 rounded-none pr-0 pt-2 pb-1 bg-transparent focus:outline-none focus:ring-0 focus:border-0 focus:border-b-2 focus:border-[#0D9C99] focus-visible:outline-none focus-visible:ring-0 focus-visible:border-0 focus-visible:border-b-2 focus-visible:border-[#0D9C99] shadow-none [&_input]:pr-10 [&_input]:pl-0 [&_input]:focus:border-0 [&_input]:focus:border-b-2 [&_input]:focus:border-[#0D9C99] [&_input]:focus-visible:outline-none [&_input]:focus-visible:ring-0 [&_input]:focus-visible:border-0 [&_input]:focus-visible:border-b-2 [&_input]:focus-visible:border-[#0D9C99]"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="departureTime"
                  render={({ field }) => (
                    <FormItem>
                      <Label className="block mb-2.5 font-bold text-[12px] text-[#47536C] uppercase">
                        DEPARTURE TIME
                      </Label>
                      <FormControl>
                        <Input
                          {...field}
                          type="time"
                          placeholder="09:00 AM"
                          className="h-[40px] border-0 border-b border-gray-300 rounded-none px-0 pt-2 pb-1 text-sm bg-transparent focus:outline-none focus:ring-0 focus:border-0 focus:border-b-2 focus:border-[#0D9C99] focus-visible:outline-none focus-visible:ring-0 focus-visible:border-0 focus-visible:border-b-2 focus-visible:border-[#0D9C99] shadow-none"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            {/* Cab Mode Fields */}
            {travelMode === "cab" && (
              <>
                <div className="grid grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="cabSource"
                    render={({ field }) => (
                      <FormItem>
                        <Label className="block mb-2.5 font-bold text-[12px] text-[#47536C] uppercase">
                          PICKUP LOCATION
                        </Label>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="e.g. Brussels-Midi Station"
                            className="h-[40px] border-0 border-b border-gray-300 rounded-none px-0 pt-2 pb-1 text-sm bg-transparent focus:outline-none focus:ring-0 focus:border-0 focus:border-b-2 focus:border-[#0D9C99] focus-visible:outline-none focus-visible:ring-0 focus-visible:border-0 focus-visible:border-b-2 focus-visible:border-[#0D9C99] shadow-none"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="cabDestination"
                    render={({ field }) => (
                      <FormItem>
                        <Label className="block mb-2.5 font-bold text-[12px] text-[#47536C] uppercase">
                          DROP LOCATION
                        </Label>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="e.g. Chronon HQ, Rue de la Loi"
                            className="h-[40px] border-0 border-b border-gray-300 rounded-none px-0 pt-2 pb-1 text-sm bg-transparent focus:outline-none focus:ring-0 focus:border-0 focus:border-b-2 focus:border-[#0D9C99] focus-visible:outline-none focus-visible:ring-0 focus-visible:border-0 focus-visible:border-b-2 focus-visible:border-[#0D9C99] shadow-none"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="mt-6">
                  <Label className="block mb-2.5 font-bold text-[12px] text-[#47536C] uppercase">
                    PERIOD (DATE/TIME RANGE)
                  </Label>
                  <div className="grid grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="cabPeriodStart"
                      render={({ field }) => (
                        <FormItem>
                          <Label className="block mb-2.5 text-xs text-gray-600">Start Date/Time</Label>
                          <FormControl>
                            <Input
                              {...field}
                              type="datetime-local"
                              className="h-[40px] border-0 border-b border-gray-300 rounded-none px-0 pt-2 pb-1 text-sm bg-transparent focus:outline-none focus:ring-0 focus:border-0 focus:border-b-2 focus:border-[#0D9C99] focus-visible:outline-none focus-visible:ring-0 focus-visible:border-0 focus-visible:border-b-2 focus-visible:border-[#0D9C99] shadow-none"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="cabPeriodEnd"
                      render={({ field }) => (
                        <FormItem>
                          <Label className="block mb-2.5 text-xs text-gray-600">End Date/Time</Label>
                          <FormControl>
                            <Input
                              {...field}
                              type="datetime-local"
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

            {/* Accommodation Fields */}
            {needsAccommodation && (
              <div className="space-y-4 mt-6">
                <h4 className="font-medium text-sm text-gray-900 mb-4">ACCOMMODATION</h4>
                
                <div className="grid grid-cols-3 gap-6">
                  <FormField
                    control={form.control}
                    name="checkInDate"
                    render={({ field }) => (
                      <FormItem>
                        <Label className="block mb-2.5 font-bold text-[12px] text-[#47536C] uppercase">
                          CHECK IN DATE <span className="text-red-500">*</span>
                        </Label>
                        <FormControl>
                          <TripDateField
                            value={field.value || ""}
                            onChange={field.onChange}
                            minDate={today}
                            className="h-[40px] border-0 border-b border-gray-300 rounded-none pr-0 pt-2 pb-1 bg-transparent focus:outline-none focus:ring-0 focus:border-0 focus:border-b-2 focus:border-[#0D9C99] focus-visible:outline-none focus-visible:ring-0 focus-visible:border-0 focus-visible:border-b-2 focus-visible:border-[#0D9C99] shadow-none [&_input]:pr-10 [&_input]:pl-0 [&_input]:focus:border-0 [&_input]:focus:border-b-2 [&_input]:focus:border-[#0D9C99] [&_input]:focus-visible:outline-none [&_input]:focus-visible:ring-0 [&_input]:focus-visible:border-0 [&_input]:focus-visible:border-b-2 [&_input]:focus-visible:border-[#0D9C99]"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="checkOutDate"
                    render={({ field }) => (
                      <FormItem>
                        <Label className="block mb-2.5 font-bold text-[12px] text-[#47536C] uppercase">
                          CHECK OUT DATE <span className="text-red-500">*</span>
                        </Label>
                        <FormControl>
                          <TripDateField
                            value={field.value || ""}
                            onChange={field.onChange}
                            minDate={form.watch("checkInDate") || today}
                            className="h-[40px] border-0 border-b border-gray-300 rounded-none pr-0 pt-2 pb-1 bg-transparent focus:outline-none focus:ring-0 focus:border-0 focus:border-b-2 focus:border-[#0D9C99] focus-visible:outline-none focus-visible:ring-0 focus-visible:border-0 focus-visible:border-b-2 focus-visible:border-[#0D9C99] shadow-none [&_input]:pr-10 [&_input]:pl-0 [&_input]:focus:border-0 [&_input]:focus:border-b-2 [&_input]:focus:border-[#0D9C99] [&_input]:focus-visible:outline-none [&_input]:focus-visible:ring-0 [&_input]:focus-visible:border-0 [&_input]:focus-visible:border-b-2 [&_input]:focus-visible:border-[#0D9C99]"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="location"
                    render={({ field }) => (
                      <FormItem>
                        <Label className="block mb-2.5 font-bold text-[12px] text-[#47536C] uppercase">
                          LOCATION <span className="text-red-500">*</span>
                        </Label>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="Enter location"
                            onChange={(e) => {
                              field.onChange(e);
                              form.setValue("hotel_city", e.target.value);
                            }}
                            className="h-[40px] border-0 border-b border-gray-300 rounded-none px-0 pt-2 pb-1 text-sm bg-transparent focus:outline-none focus:ring-0 focus:border-0 focus:border-b-2 focus:border-[#0D9C99] focus-visible:outline-none focus-visible:ring-0 focus-visible:border-0 focus-visible:border-b-2 focus-visible:border-[#0D9C99] shadow-none"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="block font-bold text-[12px] text-[#47536C] uppercase">
                    OCCUPANCY
                  </Label>
                  <FormField
                    control={form.control}
                    name="occupancy"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <div className="flex gap-4">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="radio"
                                value="single"
                                checked={field.value === "single"}
                                onChange={() => field.onChange("single")}
                                className="w-4 h-4 text-[#0D9C99] focus:ring-[#0D9C99]"
                              />
                              <span className="text-sm text-gray-700">Single</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="radio"
                                value="double"
                                checked={field.value === "double"}
                                onChange={() => field.onChange("double")}
                                className="w-4 h-4 text-[#0D9C99] focus:ring-[#0D9C99]"
                              />
                              <span className="text-sm text-gray-700">Double</span>
                            </label>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="space-y-4">
                  <Label className="block font-bold text-[12px] text-[#47536C] uppercase">
                    PREFERRED HOTELS (OPTIONAL)
                  </Label>
                  <div className="grid grid-cols-3 gap-6">
                    <FormField
                      control={form.control}
                      name="preferredHotel1"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="Hotel 1"
                              className="h-[40px] border-0 border-b border-gray-300 rounded-none px-0 pt-2 pb-1 text-sm bg-transparent focus:outline-none focus:ring-0 focus:border-0 focus:border-b-2 focus:border-[#0D9C99] focus-visible:outline-none focus-visible:ring-0 focus-visible:border-0 focus-visible:border-b-2 focus-visible:border-[#0D9C99] shadow-none"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="preferredHotel2"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="Hotel 2"
                              className="h-[40px] border-0 border-b border-gray-300 rounded-none px-0 pt-2 pb-1 text-sm bg-transparent focus:outline-none focus:ring-0 focus:border-0 focus:border-b-2 focus:border-[#0D9C99] focus-visible:outline-none focus-visible:ring-0 focus-visible:border-0 focus-visible:border-b-2 focus-visible:border-[#0D9C99] shadow-none"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="preferredHotel3"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="Hotel 3"
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
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="bg-[#0D9C99] hover:bg-[#0a7d7a] text-white"
              >
                {loading ? "Saving..." : mode === "edit" ? "Update Journey" : "Add Journey"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
