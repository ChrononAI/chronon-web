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
import { Plus, Plane, Train, Bus, Car, ChevronDown, Eye, Upload } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { useState, useEffect, useRef } from "react";
import { tripService, TripType } from "@/services/tripService";
import { toast } from "sonner";
import { Currency } from "../advances/CreateAdvanceForm";
import { trackEvent } from "@/mixpanel";
import { FormActionFooter } from "../layout/FormActionFooter";
import { format, parseISO } from "date-fns";
import { formatDate } from "@/lib/utils";
import { useTripStore } from "@/store/tripStore";

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

interface CreateTripJourneyFormProps {
  mode?: "create" | "view" | "edit";
  showOnlyJourneys?: boolean;
  tripData?: TripType;
  tripId?: string;
  onViewAttachment?: (journeyId: string) => void;
  onUploadAttachment?: (journeyId: string) => void;
  journeySegmentIds?: Record<number, string>;
}

function CreateTripJourneyForm({
  mode = "create",
  showOnlyJourneys = false,
  tripData,
  tripId,
  onViewAttachment,
  onUploadAttachment,
  journeySegmentIds,
}: CreateTripJourneyFormProps) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { selectedTrip } = useTripStore();

  const [loading, setLoading] = useState(false);
  const [collapsedJourneys, setCollapsedJourneys] = useState<Set<number>>(new Set());
  const [selectedCurrency, setSelectedCurrency] = useState<Currency | null>(
    currencies.find((c) => c.code === "USD") || null
  );
  const segmentsFetchedRef = useRef<string | null>(null);
  const [segmentIdMap, setSegmentIdMap] = useState<Record<number, string>>({});

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

  useEffect(() => {
    const loadTripData = async () => {
      if ((showOnlyJourneys || mode === "view") && tripData) {
        let journeysData: any[] = [];
        
        if (tripId) {
          // Only fetch if not already loaded for this trip
          if (segmentsFetchedRef.current !== tripId) {
            try {
              const segmentsResponse: any = await tripService.getTripSegments(tripId);
              if (segmentsResponse.data?.data && Array.isArray(segmentsResponse.data.data)) {
                const idMap: Record<number, string> = {};
                journeysData = segmentsResponse.data.data.map((segment: any, idx: number) => {
                  idMap[idx] = segment.id;
                  return {
                    travelMode: segment.travel_mode || "flight",
                    source: segment.from_location || "",
                    destination: segment.to_location || "",
                    startDate: segment.departure_time ? segment.departure_time.split('T')[0] : "",
                    endDate: segment.arrival_time ? segment.arrival_time.split('T')[0] : "",
                    timePreference: segment.additional_info?.time_preference || "",
                    flightPreference: segment.additional_info?.flight_preference || "",
                    mealPreference: segment.additional_info?.meal_preference || "",
                    classPreference: segment.additional_info?.class_preference || "",
                    departureTime: segment.departure_time ? segment.departure_time.split('T')[1]?.split(':').slice(0, 2).join(':') : "",
                    needsAccommodation: segment.hotel_required || false,
                    location: segment.additional_info?.hotel_location || "",
                    preferredHotel1: segment.additional_info?.preferred_hotel_1 || "",
                    preferredHotel2: segment.additional_info?.preferred_hotel_2 || "",
                    preferredHotel3: segment.additional_info?.preferred_hotel_3 || "",
                    occupancy: segment.additional_info?.occupancy || "single",
                    checkInDate: segment.hotel_checkin ? segment.hotel_checkin.split('T')[0] : "",
                    checkOutDate: segment.hotel_checkout ? segment.hotel_checkout.split('T')[0] : "",
                  };
                });
                setSegmentIdMap(idMap);
              }
              segmentsFetchedRef.current = tripId;
            } catch (error) {
              console.error("Error loading journey segments:", error);
            }
          } else {
            // Use existing form data if already fetched
            const currentJourneys = form.getValues("journeys");
            if (currentJourneys && currentJourneys.length > 0) {
              journeysData = currentJourneys;
            }
          }
        }
        
        if (journeysData.length === 0) {
          journeysData = [{
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
          }];
        }
        
        form.reset({
          tripName: tripData.title || "",
          fromDate: tripData.start_date || "",
          toDate: tripData.end_date || "",
          purpose: tripData.purpose || "",
          department: tripData.additional_info?.department || "",
          projectCode: tripData.additional_info?.project_code || "",
          costCenter: tripData.additional_info?.cost_center || "",
          advanceAmount: tripData.advance_amount || "",
          currency: tripData.currency || "USD",
          journeys: journeysData,
        });
        if (journeysData.length > 0 && (mode === "view" || mode === "create")) {
          const allIndices = new Set(journeysData.map((_, index) => index));
          setCollapsedJourneys(allIndices);
        }
      } else if (mode === "edit" && selectedTrip) {
        form.reset({
          tripName: selectedTrip.title || "",
          fromDate: selectedTrip.start_date || "",
          toDate: selectedTrip.end_date || "",
          purpose: selectedTrip.purpose || "",
          department: "",
          projectCode: "",
          costCenter: "",
          advanceAmount: "",
          currency: "USD",
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
        });
      }
    };
    

    if (segmentsFetchedRef.current !== tripId && tripId) {
      segmentsFetchedRef.current = null;
    }
    
    loadTripData();
  }, [mode, selectedTrip, showOnlyJourneys, tripData, tripId]);

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "journeys",
  });

  useEffect(() => {
    if ((mode === "view" || mode === "create") && fields.length > 0) {
      const allIndices = new Set(fields.map((_, index) => index));
      setCollapsedJourneys(prev => {
        if (prev.size === 0 || prev.size !== allIndices.size) {
          return allIndices;
        }
        return prev;
      });
    } else if (mode === "create" && fields.length === 0) {
      setCollapsedJourneys(new Set());
    }
  }, [mode, fields.length]);

  const onSubmit = async (formData: TripFormValues) => {
    trackEvent("Create Trip Button Clicked", {
      button_name: "Create Trip",
    });
    setLoading(true);
    try {
      if (showOnlyJourneys && tripId) {
        const journeyPayload = {
          journeys: formData.journeys.map((journey) => ({
            travel_mode: journey.travelMode,
            source: journey.source,
            destination: journey.destination,
            start_date: journey.startDate,
            end_date: journey.endDate || null,
            time_preference: journey.timePreference || null,
            flight_preference: journey.flightPreference || null,
            meal_preference: journey.mealPreference || null,
            class_preference: journey.classPreference || null,
            departure_time: journey.departureTime || null,
            period_start: journey.periodStart || null,
            period_end: journey.periodEnd || null,
            needs_accommodation: journey.needsAccommodation || false,
            check_in_date: journey.checkInDate || null,
            check_out_date: journey.checkOutDate || null,
            location: journey.location || null,
            preferred_hotel_1: journey.preferredHotel1 || null,
            preferred_hotel_2: journey.preferredHotel2 || null,
            preferred_hotel_3: journey.preferredHotel3 || null,
            occupancy: journey.occupancy || null,
          })),
        };
        
        await tripService.updateTripWithJourneys(tripId, journeyPayload);
        toast.success("Journey itinerary saved successfully");
        window.location.reload();
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to save trip");
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    if (pathname.includes("/approvals")) {
      navigate("/approvals/trips");
    } else {
      navigate("/requests/trips");
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
    <div className={`flex flex-col ${showOnlyJourneys ? '' : 'min-h-screen bg-sky-100'}`}>

      <div className={`flex-1 ${showOnlyJourneys ? 'overflow-y-auto' : 'overflow-y-auto bg-white p-2'}`}>
        <div className={`${showOnlyJourneys ? 'pb-24' : 'w-full p-2 pb-20'}`}>
      <Form {...form}>
            <form id="trip-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              {!showOnlyJourneys && (
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
                            className="block mb-2.5 whitespace-nowrap"
                            style={{
                              fontFamily: "Inter",
                              fontSize: "12px",
                              fontWeight: 700,
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
                            className="block mb-2.5 whitespace-nowrap"
                            style={{
                              fontFamily: "Inter",
                              fontSize: "12px",
                              fontWeight: 700,
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
                            className="block mb-2.5 whitespace-nowrap"
                            style={{
                              fontFamily: "Inter",
                              fontSize: "12px",
                              fontWeight: 700,
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
                            className="block mb-2.5"
                            style={{
                              fontFamily: "Inter",
                              fontSize: "12px",
                              fontWeight: 700,
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
                            className="block mb-2.5"
                            style={{
                              fontFamily: "Inter",
                              fontSize: "12px",
                              fontWeight: 700,
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
                      minDate={form.watch("fromDate") || today}
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
                            className="block mb-2.5"
                            style={{
                              fontFamily: "Inter",
                              fontSize: "12px",
                              fontWeight: 700,
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
              )}

              {!showOnlyJourneys && (
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
                            className="block mb-2.5"
                            style={{
                              fontFamily: "Inter",
                              fontSize: "12px",
                              fontWeight: 700,
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
                            className="block mb-2.5"
                            style={{
                              fontFamily: "Inter",
                              fontSize: "12px",
                              fontWeight: 700,
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
                            className="block mb-2.5"
                            style={{
                              fontFamily: "Inter",
                              fontSize: "12px",
                              fontWeight: 700,
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
              )}

              <div className={`space-y-4 ${showOnlyJourneys ? '' : 'pt-6'}`}>
                            {!showOnlyJourneys && (
                            <div>
                  <div className="mb-2">
                    <h2 className="font-medium text-[12px] leading-[100%] tracking-wider text-[#0D9C99] uppercase">
                      03. JOURNEY ITINERARY
                    </h2>
                                </div>
                  <div className="h-[1px] bg-gray-200 mb-8"></div>
                                </div>
                            )}

                {fields.map((field, index) => {
                  const journey = form.watch(`journeys.${index}`);
                  const travelMode = journey?.travelMode || "flight";
                  const isCollapsed = collapsedJourneys.has(index);
                  const toggleCollapse = () => {
                    if (isCollapsed) {
                      const newSet = new Set<number>();
                      fields.forEach((_, idx) => {
                        if (idx !== index) {
                          newSet.add(idx);
                        }
                      });
                      setCollapsedJourneys(newSet);
                    } else {
                      const newSet = new Set<number>();
                      fields.forEach((_, idx) => {
                        newSet.add(idx);
                      });
                      setCollapsedJourneys(newSet);
                    }
                  };

                  return (
                    <div key={field.id} className="bg-white border border-gray-200 rounded-lg mb-2 shadow-sm">
                      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-gray-200">
                        <div className="flex items-center justify-center w-6 h-6 rounded-full bg-[#0D9C99] text-white font-semibold text-xs">
                          {index + 1}
                        </div>
                        <div className="scale-75">{getTravelModeIcon(travelMode as TravelMode)}</div>
                        <div className="flex items-center gap-2 flex-1">
                          <h3 className="font-medium text-gray-900 text-sm">
                            {journey.source && journey.destination 
                              ? getRouteLabel(journey, index)
                              : `Journey ${index + 1}`}
                          </h3>
                          {(onViewAttachment || onUploadAttachment) && (() => {
                            const segmentId = journeySegmentIds?.[index] || segmentIdMap[index];
                            if (!segmentId) return null;
                            return (
                              <div className="flex items-center gap-1.5">
                                {onViewAttachment && (
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => onViewAttachment(segmentId)}
                                    className="text-gray-600 hover:text-gray-900 flex items-center gap-1 h-7 px-2 text-xs"
                                  >
                                    <Eye className="h-3 w-3" />
                                    View
                                  </Button>
                                )}
                                {onUploadAttachment && (
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => onUploadAttachment(segmentId)}
                                    className="text-gray-600 hover:text-gray-900 flex items-center gap-1 h-7 px-2 text-xs"
                                  >
                                    <Upload className="h-3 w-3" />
                                    Upload
                                  </Button>
                                )}
                              </div>
                            );
                          })()}
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={toggleCollapse}
                          className="text-gray-600 hover:text-gray-900 flex items-center gap-1 h-7 px-2 text-xs"
                        >
                          <ChevronDown className="h-3 w-3" />
                          <span>{isCollapsed ? "Expand" : "Collapse"}</span>
                        </Button>
                        {fields.length > 1 && mode !== "view" && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => remove(index)}
                            className="text-red-600 hover:text-red-700 h-7 px-2 text-xs"
                          >
                            Remove
                          </Button>
                        )}
                      </div>

                      {isCollapsed ? (
                        <div className="px-4 py-2.5">
                          <div className="grid grid-cols-4 gap-4">
                            <div>
                              <span className="text-gray-500 text-xs font-semibold uppercase block mb-1">SOURCE</span>
                              <p className="text-sm font-medium text-gray-900">
                                {journey.source || "Not specified"}
                              </p>
                            </div>
                            <div>
                              <span className="text-gray-500 text-xs font-semibold uppercase block mb-1">DESTINATION</span>
                              <p className="text-sm font-medium text-gray-900">
                                {journey.destination || "Not specified"}
                              </p>
                            </div>
                            <div>
                              <span className="text-gray-500 text-xs font-semibold uppercase block mb-1">START DATE</span>
                              <p className="text-sm font-medium text-gray-900">
                                {journey.startDate ? (() => {
                                  try {
                                    const date = journey.startDate.includes('T') 
                                      ? parseISO(journey.startDate) 
                                      : new Date(journey.startDate);
                                    return format(date, "dd/MM/yyyy");
                                  } catch {
                                    return journey.startDate;
                                  }
                                })() : "Not specified"}
                              </p>
                            </div>
                            <div>
                              <span className="text-gray-500 text-xs font-semibold uppercase block mb-1">END DATE</span>
                              <p className="text-sm font-medium text-gray-900">
                                {journey.endDate ? (() => {
                                  try {
                                    const date = journey.endDate.includes('T') 
                                      ? parseISO(journey.endDate) 
                                      : new Date(journey.endDate);
                                    return format(date, "dd/MM/yyyy");
                                  } catch {
                                    return journey.endDate;
                                  }
                                })() : "Not specified"}
                              </p>
                            </div>
                          </div>
                        </div>
                      ) : mode === "view" ? (
                        <div className="px-4 py-3">
                          <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-5">
                              <div>
                                <span className="text-gray-500 text-xs font-semibold uppercase block mb-1.5">TRAVEL MODE</span>
                                <p className="text-sm font-medium text-gray-900 capitalize">{journey.travelMode || "Not specified"}</p>
                              </div>
                              <div>
                                <span className="text-gray-500 text-xs font-semibold uppercase block mb-1.5">SOURCE</span>
                                <p className="text-sm font-medium text-gray-900">{journey.source || "Not specified"}</p>
                              </div>
                              <div>
                                <span className="text-gray-500 text-xs font-semibold uppercase block mb-1.5">DESTINATION</span>
                                <p className="text-sm font-medium text-gray-900">{journey.destination || "Not specified"}</p>
                              </div>
                              <div>
                                <span className="text-gray-500 text-xs font-semibold uppercase block mb-1.5">START DATE</span>
                                <p className="text-sm font-medium text-gray-900">{journey.startDate ? formatDate(journey.startDate) : "Not specified"}</p>
                              </div>
                              <div>
                                <span className="text-gray-500 text-xs font-semibold uppercase block mb-1.5">END DATE</span>
                                <p className="text-sm font-medium text-gray-900">{journey.endDate ? formatDate(journey.endDate) : "Not specified"}</p>
                              </div>
                            </div>
                            {(journey.timePreference || journey.flightPreference || journey.mealPreference) && (
                              <div className="pt-3 border-t border-gray-200">
                                <div className="grid grid-cols-2 gap-5">
                                  {journey.timePreference && (
                                    <div>
                                      <span className="text-gray-500 text-xs font-semibold uppercase block mb-1.5">TIME PREFERENCE</span>
                                      <p className="text-sm font-medium text-gray-900">{journey.timePreference}</p>
                                    </div>
                                  )}
                                  {journey.flightPreference && (
                                    <div>
                                      <span className="text-gray-500 text-xs font-semibold uppercase block mb-1.5">FLIGHT PREFERENCE</span>
                                      <p className="text-sm font-medium text-gray-900">{journey.flightPreference}</p>
                                    </div>
                                  )}
                                  {journey.mealPreference && (
                                    <div>
                                      <span className="text-gray-500 text-xs font-semibold uppercase block mb-1.5">MEAL PREFERENCE</span>
                                      <p className="text-sm font-medium text-gray-900">{journey.mealPreference}</p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                            {journey.needsAccommodation && (
                              <div className="pt-4 mt-4 border-t-2 border-gray-300">
                                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                                  <h4 className="font-bold text-base text-gray-900 mb-4 flex items-center gap-2">
                                    <span className="w-1 h-5 bg-[#0D9C99] rounded"></span>
                                    ACCOMMODATION
                                  </h4>
                                  <div className="grid grid-cols-2 gap-5">
                                    {journey.checkInDate && (
                                      <div>
                                        <span className="text-gray-500 text-xs font-semibold uppercase block mb-1.5">CHECK IN DATE</span>
                                        <p className="text-sm font-medium text-gray-900">{formatDate(journey.checkInDate.includes('T') ? journey.checkInDate.split('T')[0] : journey.checkInDate)}</p>
                                      </div>
                                    )}
                                    {journey.checkOutDate && (
                                      <div>
                                        <span className="text-gray-500 text-xs font-semibold uppercase block mb-1.5">CHECK OUT DATE</span>
                                        <p className="text-sm font-medium text-gray-900">{formatDate(journey.checkOutDate.includes('T') ? journey.checkOutDate.split('T')[0] : journey.checkOutDate)}</p>
                                      </div>
                                    )}
                                    {journey.occupancy && (
                                      <div>
                                        <span className="text-gray-500 text-xs font-semibold uppercase block mb-1.5">OCCUPANCY</span>
                                        <p className="text-sm font-medium text-gray-900 capitalize">{journey.occupancy}</p>
                                      </div>
                                    )}
                                    {journey.location && (
                                      <div>
                                        <span className="text-gray-500 text-xs font-semibold uppercase block mb-1.5">LOCATION</span>
                                        <p className="text-sm font-medium text-gray-900">{journey.location}</p>
                                      </div>
                                    )}
                                  </div>
                                  {(journey.preferredHotel1 || journey.preferredHotel2 || journey.preferredHotel3) && (
                                    <div className="mt-4 pt-4 border-t border-gray-200">
                                      <span className="text-gray-500 text-xs font-semibold uppercase block mb-1.5">PREFERRED HOTELS</span>
                                      <div className="grid grid-cols-2 gap-3">
                                        {journey.preferredHotel1 && (
                                          <p className="text-sm font-medium text-gray-900">1. {journey.preferredHotel1}</p>
                                        )}
                                        {journey.preferredHotel2 && (
                                          <p className="text-sm font-medium text-gray-900">2. {journey.preferredHotel2}</p>
                                        )}
                                        {journey.preferredHotel3 && (
                                          <p className="text-sm font-medium text-gray-900">3. {journey.preferredHotel3}</p>
                                        )}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                            {!journey.needsAccommodation && (journey.preferredHotel1 || journey.preferredHotel2 || journey.preferredHotel3) && (
                              <div className="pt-4 mt-4 border-t-2 border-gray-300">
                                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                                  <h4 className="font-bold text-base text-gray-900 mb-4 flex items-center gap-2">
                                    <span className="w-1 h-5 bg-[#0D9C99] rounded"></span>
                                    PREFERRED HOTELS
                                  </h4>
                                  <div className="grid grid-cols-2 gap-3">
                                    {journey.preferredHotel1 && (
                                      <p className="text-sm font-medium text-gray-900">1. {journey.preferredHotel1}</p>
                                    )}
                                    {journey.preferredHotel2 && (
                                      <p className="text-sm font-medium text-gray-900">2. {journey.preferredHotel2}</p>
                                    )}
                                    {journey.preferredHotel3 && (
                                      <p className="text-sm font-medium text-gray-900">3. {journey.preferredHotel3}</p>
                                    )}
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      ) : (
                        <>

                      <div className="space-y-2 mb-4 px-4 py-2.5">
                        <div className="flex items-center justify-between">
                          <Label className="block font-bold text-[12px] text-[#47536C] uppercase">
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
                                    disabled={false}
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
                            disabled={false}
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

                      <div className="space-y-6">
                        {travelMode === "flight" && (
                          <>
                            <div className="grid grid-cols-4 gap-6">
                              <div>
                                <FormField
                                  control={form.control}
                                  name={`journeys.${index}.source`}
                                  render={({ field }) => (
                                    <FormItem>
                                      <Label className="block mb-2.5 font-bold text-[12px] text-[#47536C] uppercase">
                                        SOURCE CITY
                                      </Label>
                                      <FormControl>
                                        <Input
                                          {...field}
                                          placeholder="e.g. New York (JFK)"
                                          disabled={false}
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
                                      <Label className="block mb-2.5 font-bold text-[12px] text-[#47536C] uppercase">
                                        DESTINATION CITY
                                      </Label>
                                      <FormControl>
                                        <Input
                                          {...field}
                                          placeholder="e.g. London (LHR)"
                                          disabled={false}
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
                                      <Label className="block mb-2.5 font-bold text-[12px] text-[#47536C] uppercase">
                                        START DATE
                                      </Label>
                                      <FormControl>
                                        <TripDateField
                                          value={field.value || ""}
                                          onChange={field.onChange}
                                          disabled={false}
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
                                      <Label className="block mb-2.5 font-bold text-[12px] text-[#47536C] uppercase">
                                        END DATE (IF RETURN)
                                      </Label>
                                      <FormControl>
                                        <TripDateField
                                          value={field.value || ""}
                                          onChange={field.onChange}
                                          disabled={false}
                                          minDate={form.watch(`journeys.${index}.startDate`) || today}
                                          className="h-[40px] border-0 border-b border-gray-300 rounded-none pr-0 pt-2 pb-1 bg-transparent focus:outline-none focus:ring-0 focus:border-0 focus:border-b-2 focus:border-[#0D9C99] focus-visible:outline-none focus-visible:ring-0 focus-visible:border-0 focus-visible:border-b-2 focus-visible:border-[#0D9C99] shadow-none [&_input]:pr-10 [&_input]:pl-0 [&_input]:focus:border-0 [&_input]:focus:border-b-2 [&_input]:focus:border-[#0D9C99] [&_input]:focus-visible:outline-none [&_input]:focus-visible:ring-0 [&_input]:focus-visible:border-0 [&_input]:focus-visible:border-b-2 [&_input]:focus-visible:border-[#0D9C99]"
                                        />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                              </div>
                            </div>
                            <div className="grid grid-cols-3 gap-6">
                              <div>
                                <FormField
                                  control={form.control}
                                  name={`journeys.${index}.timePreference`}
                                  render={({ field }) => (
                                    <FormItem>
                                      <Label className="block mb-2.5 font-bold text-[12px] text-[#47536C] uppercase">
                                        TIME PREFERENCE
                                      </Label>
                                      <FormControl>
                                        <Select
                                          value={field.value}
                                          onValueChange={field.onChange}
                                          disabled={false}
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
                                      <Label className="block mb-2.5 font-bold text-[12px] text-[#47536C] uppercase">
                                        FLIGHT PREFERENCE
                                      </Label>
                                      <FormControl>
                                        <Input
                                          {...field}
                                          placeholder="e.g. Window, Aisle, Extra Legroom"
                                          disabled={false}
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
                                      <Label className="block mb-2.5 font-bold text-[12px] text-[#47536C] uppercase">
                                        MEAL PREFERENCE
                                      </Label>
                                      <FormControl>
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={false}
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
                          <div className="grid grid-cols-4 gap-6">
                            <div>
                              <FormField
                                control={form.control}
                                name={`journeys.${index}.source`}
                                render={({ field }) => (
                                  <FormItem>
                                    <Label className="block mb-2.5 font-bold text-[12px] text-[#47536C] uppercase">
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
                                    <Label className="block mb-2.5 font-bold text-[12px] text-[#47536C] uppercase">
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
                                    <Label className="block mb-2.5 font-bold text-[12px] text-[#47536C] uppercase">
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
                                    <Label className="block mb-2.5 font-bold text-[12px] text-[#47536C] uppercase">
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
                          <div className="grid grid-cols-4 gap-6">
                            <div>
            <FormField
              control={form.control}
                                name={`journeys.${index}.source`}
              render={({ field }) => (
                <FormItem>
                                    <Label className="block mb-2.5 font-bold text-[12px] text-[#47536C] uppercase">
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
                                    <Label className="block mb-2.5 font-bold text-[12px] text-[#47536C] uppercase">
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
                                    <Label className="block mb-2.5 font-bold text-[12px] text-[#47536C] uppercase">
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
                                    <Label className="block mb-2.5 font-bold text-[12px] text-[#47536C] uppercase">
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
                            <div className="grid grid-cols-2 gap-6">
                              <div>
            <FormField
              control={form.control}
                                  name={`journeys.${index}.source`}
              render={({ field }) => (
                <FormItem>
                                      <Label className="block mb-2.5 font-bold text-[12px] text-[#47536C] uppercase">
                                        PICKUP LOCATION
                                      </Label>
                  <FormControl>
                                        <Input
                                          {...field}
                                          placeholder="e.g. Brussels-Midi Station"
                                          disabled={false}
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
                                      <Label className="block mb-2.5 font-bold text-[12px] text-[#47536C] uppercase">
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
                              <Label className="block mb-2.5 font-bold text-[12px] text-[#47536C] uppercase">
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
                                          disabled={false}
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
                                          disabled={false}
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
                                    <Label className="block mb-2.5 font-bold text-[12px] text-[#47536C] uppercase">
                                      CHECK IN DATE
                                    </Label>
                  <FormControl>
                                      <TripDateField
                                        value={field.value || ""}
                                        onChange={field.onChange}
                                        disabled={false}
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
                                    <Label className="block mb-2.5 font-bold text-[12px] text-[#47536C] uppercase">
                                      CHECK OUT DATE
                                    </Label>
                                    <FormControl>
                                      <TripDateField
                                        value={field.value || ""}
                                        onChange={field.onChange}
                        disabled={false}
                                        minDate={form.watch(`journeys.${index}.checkInDate`) || today}
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
                                    <Label className="block mb-2.5 font-bold text-[12px] text-[#47536C] uppercase">
                                      LOCATION
                                    </Label>
                                    <FormControl>
                                      <Input
                                        {...field}
                                        placeholder="Enter location"
                                        disabled={false}
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
                            <Label className="block font-bold text-[12px] text-[#47536C] uppercase">
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
                                          disabled={false}
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
                                          disabled={false}
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

                          <div className="space-y-6">
                            <FormField
                              control={form.control}
                              name={`journeys.${index}.preferredHotel1`}
                              render={({ field }) => (
                                <FormItem>
                                  <Label className="block mb-2.5 font-bold text-[12px] text-[#47536C] uppercase">
                                    Preferred Hotel Option (1)
                                  </Label>
                                  <FormControl>
                                    <Input
                                      {...field}
                                      placeholder="Enter Preferred Hotel Option (1)"
                                      disabled={false}
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
                                  <Label className="block mb-2.5 font-bold text-[12px] text-[#47536C] uppercase">
                                    Preferred Hotel Option (2)
                                  </Label>
                                  <FormControl>
                                    <Input
                                      {...field}
                                      placeholder="Enter Preferred Hotel Option (2)"
                                      disabled={false}
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
                                  <Label className="block mb-2.5 font-bold text-[12px] text-[#47536C] uppercase">
                                    Preferred Hotel Option (3)
                                  </Label>
                                  <FormControl>
                                    <Input
                                      {...field}
                                      placeholder="Enter Preferred Hotel Option (3)"
                                      disabled={false}
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
                        </>
                      )}
                    </div>
                  );
                })}

            {mode !== "view" && (
              <div className="flex justify-center mt-6 mb-4">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const newIndex = fields.length;
                    append({
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
                    });
                    setCollapsedJourneys(prev => {
                      const newSet = new Set(prev);
                      newSet.add(newIndex);
                      return newSet;
                    });
                  }}
                  className="border-[#0D9C99] text-[#0D9C99] hover:bg-[#0D9C99] hover:text-white transition-colors"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Another Journey
                </Button>
              </div>
            )}
              </div>
        </form>
      </Form>
        </div>
      </div>

      {mode !== "view" && !showOnlyJourneys && (
        <FormActionFooter
          secondaryButton={{
            label: "Cancel",
            onClick: handleBack,
          }}
          primaryButton={{
            label: mode === "edit" ? "Save Changes" : "Submit for Approval",
            onClick: () => {
              const formElement = document.getElementById("trip-form") as HTMLFormElement;
              if (formElement) {
                formElement.requestSubmit();
              }
            },
            disabled: loading,
            loading: loading,
            loadingText: mode === "edit" ? "Saving..." : "Submitting...",
          }}
        />
      )}
      
      {showOnlyJourneys && mode !== "view" && (
        <FormActionFooter
          secondaryButton={{
            label: "Cancel",
            onClick: () => navigate(-1),
          }}
          primaryButton={{
            label: "Save Journey Itinerary",
            onClick: () => {
              const formElement = document.getElementById("trip-form") as HTMLFormElement;
              if (formElement) {
                formElement.requestSubmit();
              }
            },
            disabled: loading,
            loading: loading,
            loadingText: "Saving...",
          }}
        />
      )}
    </div>
  );
}

export default CreateTripJourneyForm;
