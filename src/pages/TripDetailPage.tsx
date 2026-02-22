import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Calendar, Plus, Plane, Train, Bus, Car, ChevronDown, Edit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { tripService, TripType } from "@/services/tripService";
import { formatDate } from "@/lib/utils";
import { JourneyModal } from "@/components/trip/JourneyModal";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { FormActionFooter } from "@/components/layout/FormActionFooter";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Journey {
  id?: string;
  travelMode: "flight" | "train" | "bus" | "cab";
  source: string;
  destination: string;
  startDate: string;
  endDate?: string;
  timePreference?: string;
  flightPreference?: string;
  mealPreference?: string;
  [key: string]: any;
}

function TripDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [trip, setTrip] = useState<TripType | null>(null);
  const [loading, setLoading] = useState(false);
  const [journeys, setJourneys] = useState<Journey[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingJourney, setEditingJourney] = useState<Journey | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [journeyToDelete, setJourneyToDelete] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [collapsedJourneys, setCollapsedJourneys] = useState<Set<string>>(new Set());

  const transformSegmentToJourney = (segment: any): Journey => {
    return {
      id: segment.id,
      travelMode: segment.travel_mode as "flight" | "train" | "bus" | "cab",
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
      checkInDate: segment.hotel_checkin || segment.additional_info?.hotel_checkin || "",
      checkOutDate: segment.hotel_checkout || segment.additional_info?.hotel_checkout || "",
      periodStart: segment.departure_time || "",
      periodEnd: segment.arrival_time || "",
    };
  };

  const refreshJourneys = async () => {
    if (!id) return;
    try {
      const segmentsResponse: any = await tripService.getTripSegments(id);
      if (segmentsResponse.data?.data && Array.isArray(segmentsResponse.data.data)) {
        const transformedJourneys: Journey[] = segmentsResponse.data.data.map(transformSegmentToJourney);
        setJourneys(transformedJourneys);
      }
    } catch (error: any) {
      console.error("Error refreshing journeys:", error);
    }
  };

  useEffect(() => {
    const fetchTrip = async () => {
      if (!id) return;
      setLoading(true);
      try {
        const response: any = await tripService.getTripRequestById(id);
        const tripData = response.data.data[0]; // Extract first item from data array
        if (tripData) {
          setTrip(tripData);
        } else {
          toast.error("Trip not found");
          setLoading(false);
          return;
        }
        await refreshJourneys();
      } catch (error: any) {
        console.error("Error fetching trip:", error);
        toast.error(error?.response?.data?.message || "Failed to load trip details");
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchTrip();
    }
  }, [id]);

  const transformFormDataToApiPayload = (data: any, segmentOrder: number) => {
    const formatDateTime = (dateStr: string, timeStr?: string) => {
      if (!dateStr) return null;

      if (timeStr && timeStr.includes(':')) {
        return `${dateStr}T${timeStr}:00`;
      }
      return `${dateStr}T00:00:00`;
    };

    const formatDateToDateTime = (dateStr: string) => {
      if (!dateStr) return null;
      return `${dateStr}T00:00:00`;
    };

    const payload: any = {
      trip_id: id,
      segment_order: segmentOrder,
      from_location: data.source || "",
      to_location: data.destination || "",
      departure_time: formatDateTime(data.startDate, data.departureTime) || formatDateTime(data.startDate) || formatDateTime(data.periodStart),
      arrival_time: formatDateTime(data.endDate) || formatDateTime(data.periodEnd) || null,
      travel_mode: data.travelMode,
      travel_booking_required: true,
      hotel_required: data.needsAccommodation || false,
      hotel_booking_required: data.needsAccommodation || false,
      cab_required: data.travelMode === "cab" || false,
      cab_booking_required: data.travelMode === "cab" || false,
      hotel_city: (data.needsAccommodation && (data.hotel_city || data.location)) ? (data.hotel_city || data.location) : null,
      hotel_checkin: (data.needsAccommodation && data.checkInDate) ? formatDateToDateTime(data.checkInDate) : null,
      hotel_checkout: (data.needsAccommodation && data.checkOutDate) ? formatDateToDateTime(data.checkOutDate) : null,
      additional_info: (data.timePreference || data.flightPreference || data.mealPreference || data.classPreference || data.location || data.preferredHotel1 || data.preferredHotel2 || data.preferredHotel3 || data.occupancy) ? {
        time_preference: data.timePreference || null,
        flight_preference: data.flightPreference || null,
        meal_preference: data.mealPreference || null,
        class_preference: data.classPreference || null,
        hotel_location: data.location || null,
        preferred_hotel_1: data.preferredHotel1 || null,
        preferred_hotel_2: data.preferredHotel2 || null,
        preferred_hotel_3: data.preferredHotel3 || null,
        occupancy: data.occupancy || null,
      } : false,
      description: data.flightPreference || data.classPreference || data.description || "",
    };

    return payload;
  };

  const handleSaveJourney = async (journeyData: any) => {
    if (!id) return;
    
    try {
      if (editingJourney?.id) {
        // Update existing journey
        await tripService.updateJourney(id, editingJourney.id, journeyData);
        setJourneys(journeys.map((j) => (j.id === editingJourney.id ? { ...journeyData, id: editingJourney.id } : j)));
      } else {
        // Add new journey - calculate segment_order
        const segmentOrder = journeys.length + 1;
        const payload = transformFormDataToApiPayload(journeyData, segmentOrder);
        await tripService.addJourney(id, payload);
      }
      
      // Refresh journey segments
      await refreshJourneys();
      
      setEditingJourney(null);
    } catch (error: any) {
      throw error;
    }
  };

  const handleDeleteClick = (segmentId: string) => {
    setJourneyToDelete(segmentId);
    setDeleteDialogOpen(true);
  };

  const handleDeleteJourney = async () => {
    if (!id || !journeyToDelete) return;
    
    try {
      await tripService.deleteJourney(journeyToDelete);
      
      // Refresh journey segments
      await refreshJourneys();
      
      toast.success("Journey deleted successfully");
      setDeleteDialogOpen(false);
      setJourneyToDelete(null);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to delete journey");
    }
  };

  const handleSubmitTrip = async () => {
    if (!id) return;
    
    try {
      setSubmitting(true);
      await tripService.submitTripRequest(id);
      toast.success("Trip request submitted successfully");
      navigate("/requests/trips");
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to submit trip request");
    } finally {
      setSubmitting(false);
    }
  };

  const getTravelModeIcon = (mode: string) => {
    switch (mode) {
      case "flight":
        return <Plane className="h-5 w-5 text-[#0D9C99]" />;
      case "train":
        return <Train className="h-5 w-5 text-[#0D9C99]" />;
      case "bus":
        return <Bus className="h-5 w-5 text-[#0D9C99]" />;
      case "cab":
        return <Car className="h-5 w-5 text-[#0D9C99]" />;
      default:
        return <Plane className="h-5 w-5 text-[#0D9C99]" />;
    }
  };

  const formatDateRange = () => {
    if (!trip?.start_date || !trip?.end_date) return "Not specified";
    try {
      const start = formatDate(trip.start_date);
      const end = formatDate(trip.end_date);
      return `${start} - ${end}`;
    } catch {
      return "Not specified";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-500">Loading trip details...</div>
      </div>
    );
  }

  if (!trip) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-500">Trip not found</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header Section with Background */}
      <div className="relative h-64 bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800 overflow-hidden">
        {/* Background Image - Travel themed image */}
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `url("https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=1920&q=80")`,
          }}
        ></div>
        {/* Dark overlay to ensure text readability */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900/70 via-blue-800/60 to-blue-900/70"></div>
        
        <div className="relative z-10 p-6 h-full flex flex-col justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(-1)}
            className="text-white hover:bg-white/20 w-fit bg-white/10 backdrop-blur-sm"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          
          <div className="mt-auto">
            <h1 className="text-4xl font-bold text-white mb-2">{trip.title}</h1>
            <div className="flex items-center gap-3 text-white/90">
              <Calendar className="h-4 w-4" />
              <span className="text-sm">{formatDateRange()}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Trip Information Section */}
      <div className="bg-white border-b px-6 py-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <div className="text-xs text-gray-500 mb-1 uppercase">Department</div>
              <div className="text-sm text-gray-900 font-semibold">
                {trip.additional_info?.department || "Not specified"}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500 mb-1 uppercase">Project Code</div>
              <div className="text-sm text-gray-900 font-semibold">
                {trip.additional_info?.project_code || "Not specified"}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500 mb-1 uppercase">Cost Center</div>
              <div className="text-sm text-gray-900 font-semibold">
                {trip.additional_info?.cost_center || "Not specified"}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Journey Itinerary Section */}
      <div className="bg-white px-6 py-6 flex-1 overflow-y-auto min-h-0">
        <div className="max-w-7xl mx-auto">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Journey Itinerary</h2>
            
            {/* Journey List */}
            {journeys.length > 0 && (
              <div className="space-y-4 mb-6">
                {journeys.map((journey, index) => {
                  const journeyId = journey.id || `journey-${index}`;
                  const isCollapsed = collapsedJourneys.has(journeyId);
                  const toggleCollapse = () => {
                    setCollapsedJourneys(prev => {
                      const newSet = new Set(prev);
                      if (newSet.has(journeyId)) {
                        newSet.delete(journeyId);
                      } else {
                        newSet.add(journeyId);
                      }
                      return newSet;
                    });
                  };

                  return (
                    <Card key={journeyId} className="border border-gray-200 rounded-lg shadow-sm">
                      <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-200">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-[#0D9C99] text-white font-semibold text-sm">
                          {index + 1}
                        </div>
                        {getTravelModeIcon(journey.travelMode)}
                        <h3 className="font-medium text-gray-900 flex-1">
                          {journey.source && journey.destination
                            ? `${journey.source} → ${journey.destination}`
                            : `Journey ${index + 1}`}
                        </h3>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={toggleCollapse}
                          className="text-gray-600 hover:text-gray-900 flex items-center gap-1"
                        >
                          <ChevronDown className="h-4 w-4" />
                          <span>{isCollapsed ? "Expand" : "Collapse"}</span>
                        </Button>
                        {trip.status === "DRAFT" && (
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setEditingJourney(journey);
                                setModalOpen(true);
                              }}
                            >
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => journey.id && handleDeleteClick(journey.id)}
                              className="text-red-600 hover:text-red-700"
                            >
                              Delete
                            </Button>
                          </div>
                        )}
                      </div>

                      {isCollapsed ? (
                        <div className="px-6 py-4">
                          <div className="grid grid-cols-4 gap-6">
                            <div>
                              <span className="text-gray-500 text-xs font-medium uppercase block mb-2">SOURCE</span>
                              <p className="text-sm font-medium text-gray-900">
                                {journey.source || "Not specified"}
                              </p>
                            </div>
                            <div>
                              <span className="text-gray-500 text-xs font-medium uppercase block mb-2">DESTINATION</span>
                              <p className="text-sm font-medium text-gray-900">
                                {journey.destination || "Not specified"}
                              </p>
                            </div>
                            <div>
                              <span className="text-gray-500 text-xs font-medium uppercase block mb-2">START DATE</span>
                              <p className="text-sm font-medium text-gray-900">
                                {journey.startDate ? formatDate(journey.startDate) : "Not specified"}
                              </p>
                            </div>
                            <div>
                              <span className="text-gray-500 text-xs font-medium uppercase block mb-2">END DATE</span>
                              <p className="text-sm font-medium text-gray-900">
                                {journey.endDate ? formatDate(journey.endDate) : "Not specified"}
                              </p>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="px-6 py-4">
                          <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-6">
                              <div>
                                <span className="text-gray-500 text-xs font-medium uppercase block mb-2">Source</span>
                                <p className="text-sm text-gray-900">{journey.source || "Not specified"}</p>
                              </div>
                              <div>
                                <span className="text-gray-500 text-xs font-medium uppercase block mb-2">Destination</span>
                                <p className="text-sm text-gray-900">{journey.destination || "Not specified"}</p>
                              </div>
                              <div>
                                <span className="text-gray-500 text-xs font-medium uppercase block mb-2">Start Date</span>
                                <p className="text-sm text-gray-900">{journey.startDate ? formatDate(journey.startDate) : "Not specified"}</p>
                              </div>
                              <div>
                                <span className="text-gray-500 text-xs font-medium uppercase block mb-2">End Date</span>
                                <p className="text-sm text-gray-900">{journey.endDate ? formatDate(journey.endDate) : "Not specified"}</p>
                              </div>
                            </div>
                            {(journey.timePreference || journey.flightPreference || journey.mealPreference) && (
                              <div className="pt-4 border-t border-gray-200">
                                <div className="grid grid-cols-3 gap-6">
                                  {journey.timePreference && (
                                    <div>
                                      <span className="text-gray-500 text-xs font-medium uppercase block mb-2">Time Preference</span>
                                      <p className="text-sm text-gray-900">{journey.timePreference}</p>
                                    </div>
                                  )}
                                  {journey.flightPreference && (
                                    <div>
                                      <span className="text-gray-500 text-xs font-medium uppercase block mb-2">Flight Preference</span>
                                      <p className="text-sm text-gray-900">{journey.flightPreference}</p>
                                    </div>
                                  )}
                                  {journey.mealPreference && (
                                    <div>
                                      <span className="text-gray-500 text-xs font-medium uppercase block mb-2">Meal Preference</span>
                                      <p className="text-sm text-gray-900">{journey.mealPreference}</p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </Card>
                  );
                })}
              </div>
            )}

            {/* Add Journey Button */}
            {trip.status === "DRAFT" && (
              <Button
                onClick={() => {
                  setEditingJourney(null);
                  setModalOpen(true);
                }}
                className="border-[#0D9C99] text-[#0D9C99] hover:bg-[#0D9C99] hover:text-white"
                variant="outline"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Journey
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Journey Modal */}
      <JourneyModal
        open={modalOpen}
        onOpenChange={(open) => {
          setModalOpen(open);
          if (!open) {
            setEditingJourney(null);
          }
        }}
        onSave={handleSaveJourney}
        journey={editingJourney}
        mode={editingJourney ? "edit" : "create"}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the journey from your trip.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setJourneyToDelete(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteJourney}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {trip?.status === "DRAFT" && (
        <FormActionFooter
          secondaryButton={{
            label: "Cancel",
            onClick: () => navigate("/requests/trips"),
          }}
          primaryButton={{
            label: "Submit Trip",
            onClick: handleSubmitTrip,
            disabled: submitting,
            loading: submitting,
            loadingText: "Submitting...",
          }}
        />
      )}
    </div>
  );
}

export default TripDetailPage;
