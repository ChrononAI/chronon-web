import api from "@/lib/api";
import { toast } from "sonner";

export interface TripType {
    id: string;
    sequence_number?: string;
    title: string;
    purpose: string;
    start_date: string;
    end_date: string;
    status: string;
    advance_amount: string | null;
    currency: string;
    additional_info: any;
    file_ids: string[] | null;
    total_cost: number | null;
    org_id: string;
    user_id: string;
    created_at: string;
    updated_at: string;
}

export interface CreateTripRequestPayloadType {
    title: string;
    purpose: string;
    advance_amount: number | null;
    currency: string;
    start_date: string;
    end_date: string;
    additional_info: any;
}

export interface TripRequestsResponse {
    count: number;
    data: TripType[];
    offset: number;
}

export const tripService = {
    createTripRequest: async (payload: CreateTripRequestPayloadType) => {
        try {
            return await api.post('/api/v1/trip_requests/create', payload);
        } catch (error) {
            console.log(error);
            toast.error('Error creating trip request');
            throw error;
        }
    },

    getTripRequests: async () => {
        try {
            return await api.get<TripRequestsResponse>('/api/v1/trip_requests/user');
        } catch (error) {
            console.log(error);
            throw error;
        }
    },

    getTripRequestById: async (id: string) => {
        try {
            return await api.get<TripRequestsResponse>(`/api/v1/trip_requests/user?id=eq.${id}`);
        } catch (error) {
            console.log(error);
            throw error;
        }
    },

    getTripRequestByIdForAdmin: async (id: string) => {
        try {
            return await api.get<TripRequestsResponse>(`/api/v1/trip_requests/admin?id=eq.${id}`);
        } catch (error) {
            console.log(error);
            throw error;
        }
    },

    updateTripWithJourneys: async (id: string, payload: { journeys: any[] }) => {
        try {
            return await api.put(`/api/v1/trip_requests/${id}/journeys`, payload);
        } catch (error) {
            console.log(error);
            toast.error('Error saving journey itinerary');
            throw error;
        }
    },

    addJourney: async (tripId: string, journey: any) => {
        try {
            return await api.post('/api/v1/trip_requests/segment', journey);
        } catch (error) {
            console.log(error);
            toast.error('Error adding journey');
            throw error;
        }
    },

    updateJourney: async (tripId: string, journeyId: string, journey: any) => {
        try {
            return await api.put(`/api/v1/trip_requests/${tripId}/journeys/${journeyId}`, journey);
        } catch (error) {
            console.log(error);
            toast.error('Error updating journey');
            throw error;
        }
    },

    deleteJourney: async (segmentId: string) => {
        try {
            return await api.delete('/api/v1/trip_requests/segment', {
                data: { id: segmentId }
            });
        } catch (error) {
            console.log(error);
            toast.error('Error deleting journey');
            throw error;
        }
    },

    getTripSegments: async (tripId: string) => {
        try {
            return await api.get(`/api/v1/trip_requests/segment/${tripId}`);
        } catch (error) {
            console.log(error);
            throw error;
        }
    },

    submitTripRequest: async (tripRequestId: string) => {
        try {
            return await api.post('/api/v1/trip_requests/submit', {
                trip_request_id: tripRequestId
            });
        } catch (error) {
            console.log(error);
            toast.error('Error submitting trip request');
            throw error;
        }
    },

    getTripRequestsForApproval: async ({
        query,
        limit,
        offset,
        signal,
    }: {
        query: string;
        limit: number;
        offset: number;
        signal: AbortSignal;
    }) => {
        try {
            return await api.get<TripRequestsResponse>(`/api/v1/trip_requests/approvals?${query}`, {
                params: {
                    limit,
                    offset,
                },
                signal,
            });
        } catch (error) {
            console.log(error);
            throw error;
        }
    },

    getTripApprovalWorkflow: async (tripId: string) => {
        try {
            return await api.get(`/api/v1/trip_requests/${tripId}/approvers`);
        } catch (error) {
            throw error;
        }
    },

    processTripAction: async (tripId: string, action: "approved" | "rejected") => {
        try {
            const payload = {
                action: action
            };
            return await api.post(`/api/v1/trip_requests/${tripId}/action`, payload);
        } catch (error) {
            console.log(error);
            throw error;
        }
    }
}
