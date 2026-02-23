import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Calendar, Plus, Plane, Train, Bus, Car, ChevronDown, Edit, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { tripService, TripType } from "@/services/tripService";
import { formatDate } from "@/lib/utils";
import { JourneyModal } from "@/components/trip/JourneyModal";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { FormActionFooter } from "@/components/layout/FormActionFooter";
import { WorkflowTimeline } from "@/components/expenses/WorkflowTimeline";
import { ApprovalWorkflow } from "@/types/expense";
import { cn } from "@/lib/utils";
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
import { Attachment } from "@/components/trip/JourneyAttachmentModal";
import { AttachmentFullscreenViewer } from "@/components/trip/AttachmentFullscreenViewer";

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
  const [activeTab, setActiveTab] = useState<"details" | "history">("details");
  const [approvalWorkflow, setApprovalWorkflow] = useState<ApprovalWorkflow | null>(null);
  const workflowFetchedRef = useRef<string | null>(null);
  const [selectedJourneyId, setSelectedJourneyId] = useState<string | null>(null);
  const [journeyAttachments, setJourneyAttachments] = useState<Record<string, Attachment[]>>({});
  const [fullscreenViewerOpen, setFullscreenViewerOpen] = useState(false);
  const [viewerInitialIndex, setViewerInitialIndex] = useState(0);

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
      checkInDate: segment.hotel_checkin ? (segment.hotel_checkin.split('T')[0] || segment.hotel_checkin) : (segment.additional_info?.hotel_checkin ? (segment.additional_info.hotel_checkin.split('T')[0] || segment.additional_info.hotel_checkin) : ""),
      checkOutDate: segment.hotel_checkout ? (segment.hotel_checkout.split('T')[0] || segment.hotel_checkout) : (segment.additional_info?.hotel_checkout ? (segment.additional_info.hotel_checkout.split('T')[0] || segment.additional_info.hotel_checkout) : ""),
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
        const allJourneyIds = new Set(transformedJourneys.map(j => j.id || "").filter(Boolean));
        setCollapsedJourneys(allJourneyIds);
      }
    } catch (error: any) {
      console.error("Error refreshing journeys:", error);
    }
  };

  const getApprovalWorkflow = async (tripId: string) => {
    if (workflowFetchedRef.current === tripId) {
      return;
    }
    try {
      const approvalWorkflowRes: any = await tripService.getTripApprovalWorkflow(tripId);
      if (approvalWorkflowRes.data && approvalWorkflowRes.data.data && approvalWorkflowRes.data.data.length > 0) {
        const workflowData = approvalWorkflowRes.data.data[0];
        setApprovalWorkflow({
          report_id: tripId,
          approval_steps: workflowData.approval_steps || [],
          current_step: workflowData.current_step || 1,
          total_steps: workflowData.total_steps || 0,
          workflow_status: workflowData.workflow_status || "RUNNING",
          workflow_execution_id: workflowData.workflow_execution_id || "",
        });
        workflowFetchedRef.current = tripId;
      }
    } catch (error) {
      console.log("Error fetching approval workflow:", error);
    }
  };

  const loadAllAttachments = async (tripId: string) => {
    try {
      const response = await tripService.getAttachedDocuments(tripId);
      if (response.data?.data && Array.isArray(response.data.data)) {
        const allAttachments: Record<string, Attachment[]> = {};
        
        for (const doc of response.data.data) {
          const segmentId = doc.trip_segment_id;
          if (!segmentId) continue;
          
          if (!allAttachments[segmentId]) {
            allAttachments[segmentId] = [];
          }
          
          if (doc.file_ids && Array.isArray(doc.file_ids) && doc.file_ids.length > 0) {
            for (const fileId of doc.file_ids) {
              try {
                const fileUrlResponse = await tripService.generateFileUrl(fileId);
                if (fileUrlResponse.data?.data?.download_url) {
                  allAttachments[segmentId].push({
                    fileId: fileId,
                    url: fileUrlResponse.data.data.download_url,
                    name: fileUrlResponse.data.data.name || `Attachment ${allAttachments[segmentId].length + 1}`,
                  });
                }
              } catch (error) {
                console.error(`Error fetching URL for file ${fileId}:`, error);
                allAttachments[segmentId].push({
                  fileId: fileId,
                  url: "",
                  name: `Attachment ${allAttachments[segmentId].length + 1}`,
                });
              }
            }
          }
        }
        
        setJourneyAttachments(allAttachments);
      }
    } catch (error) {
      console.error("Error loading attachments:", error);
    }
  };

  useEffect(() => {
    const fetchTrip = async () => {
      if (!id) return;
      // Reset workflow ref when trip ID changes
      if (workflowFetchedRef.current !== id) {
        workflowFetchedRef.current = null;
      }
      setLoading(true);
      try {
        const response = await tripService.getTripRequestById(id);
        const tripData = response.data.data[0]; // Extract first item from data array
        if (tripData) {
          setTrip(tripData);
        } else {
          toast.error("Trip not found");
          setLoading(false);
          return;
        }
        await refreshJourneys();
        // Fetch workflow separately, it will check if already loaded
        await getApprovalWorkflow(id);
        // Load all attachments in the background
        loadAllAttachments(id);
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
      
      // Reload attachments after journey changes
      if (id) {
        await loadAllAttachments(id);
      }
      
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


  const handleViewClick = (journeyId: string) => {
    if (!id) return;
    setSelectedJourneyId(journeyId);
    
    const attachments = journeyAttachments[journeyId] || [];
    
    if (attachments.length > 0) {
      setViewerInitialIndex(0);
      setFullscreenViewerOpen(true);
    } else {
      toast.info("No attachments found for this journey segment");
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
          {/* Tabs */}
          <div className="mb-6">
            <div className="flex gap-8 border-b border-gray-200">
              {[
                { key: "details", label: "Trip Details" },
                { key: "history", label: "Audit History" },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as "details" | "history")}
                  className={cn(
                    "relative flex items-center gap-2 font-medium transition-colors pb-2",
                    activeTab === tab.key
                      ? "text-blue-600 border-b-2 border-blue-600"
                      : "text-gray-500 hover:text-gray-700"
                  )}
                  style={{ fontFamily: 'Inter, sans-serif' }}
                >
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>
          </div>

          {activeTab === "details" && (
            <div className="mb-6">
            {/* Journey List */}
            {journeys.length > 0 && (
              <div className="space-y-2 mb-6">
                {journeys.map((journey, index) => {
                  const journeyId = journey.id || `journey-${index}`;
                  const isCollapsed = collapsedJourneys.has(journeyId);
                  const toggleCollapse = () => {
                    if (isCollapsed) {
                      const newSet = new Set<string>();
                      journeys.forEach((j) => {
                        const jId = j.id || "";
                        if (jId && jId !== journeyId) {
                          newSet.add(jId);
                        }
                      });
                      setCollapsedJourneys(newSet);
                    } else {
                      const newSet = new Set<string>();
                      journeys.forEach((j) => {
                        const jId = j.id || "";
                        if (jId) {
                          newSet.add(jId);
                        }
                      });
                      setCollapsedJourneys(newSet);
                    }
                  };

                  return (
                    <Card key={journeyId} className="border border-gray-200 rounded-lg shadow-sm">
                      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-gray-200">
                        <div className="flex items-center justify-center w-6 h-6 rounded-full bg-[#0D9C99] text-white font-semibold text-xs">
                          {index + 1}
                        </div>
                        <div className="scale-75">{getTravelModeIcon(journey.travelMode)}</div>
                        <div className="flex items-center gap-2 flex-1">
                          <h3 className="font-medium text-gray-900 text-sm">
                            {journey.source && journey.destination
                              ? `${journey.source} → ${journey.destination}`
                              : `Journey ${index + 1}`}
                          </h3>
                          <div className="flex items-center gap-1.5">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => journey.id && handleViewClick(journey.id)}
                              className="text-gray-600 hover:text-gray-900 flex items-center gap-1 h-7 px-2 text-xs"
                            >
                              <Eye className="h-3 w-3" />
                              View
                            </Button>
                          </div>
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
                        {trip.status === "DRAFT" && (
                          <div className="flex items-center gap-1.5">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setEditingJourney(journey);
                                setModalOpen(true);
                              }}
                              disabled
                              className="h-7 px-2 text-xs"
                            >
                              <Edit className="h-3 w-3 mr-1" />
                              Edit
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => journey.id && handleDeleteClick(journey.id)}
                              className="text-red-600 hover:text-red-700 h-7 px-2 text-xs"
                            >
                              Delete
                            </Button>
                          </div>
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
                                {journey.startDate ? formatDate(journey.startDate) : "Not specified"}
                              </p>
                            </div>
                            <div>
                              <span className="text-gray-500 text-xs font-semibold uppercase block mb-1">END DATE</span>
                              <p className="text-sm font-medium text-gray-900">
                                {journey.endDate ? formatDate(journey.endDate) : "Not specified"}
                              </p>
                            </div>
                          </div>
                        </div>
                      ) : (
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
                                        <p className="text-sm font-medium text-gray-900">{formatDate(journey.checkInDate)}</p>
                                      </div>
                                    )}
                                    {journey.checkOutDate && (
                                      <div>
                                        <span className="text-gray-500 text-xs font-semibold uppercase block mb-1.5">CHECK OUT DATE</span>
                                        <p className="text-sm font-medium text-gray-900">{formatDate(journey.checkOutDate)}</p>
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
          )}

          {activeTab === "history" && (
            <div className="w-full">
              {approvalWorkflow && approvalWorkflow.approval_steps && approvalWorkflow.approval_steps.length > 0 ? (
                <div className="mt-6">
                  <WorkflowTimeline approvalWorkflow={approvalWorkflow} />
                </div>
              ) : (
                <div className="flex items-center justify-center py-12">
                  <p className="text-sm text-gray-500">No workflow timeline available</p>
                </div>
              )}
            </div>
          )}
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


      {/* Fullscreen Attachment Viewer */}
      {selectedJourneyId && (
        <AttachmentFullscreenViewer
          attachments={journeyAttachments[selectedJourneyId] || []}
          isOpen={fullscreenViewerOpen}
          onClose={() => setFullscreenViewerOpen(false)}
          initialIndex={viewerInitialIndex}
        />
      )}

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
