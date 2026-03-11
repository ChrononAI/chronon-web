import { TripType } from "@/services/tripService";
import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";

export interface PaginationInfo {
    has_next: boolean;
    has_prev: boolean;
    page: number;
    pages: number;
    per_page: number;
    total: number;
}

interface TripState {
    selectedTrip: TripType | null;
    selectedTripToApprove: TripType | null;

    // Methods
    setSelectedTrip: (data: TripType | null) => void;
    setSelectedTripToApprove: (data: TripType | null) => void;
}

export const useTripStore = create<TripState>()(
    devtools(
        persist(
            (set) => ({
                selectedTripToApprove: null,
                selectedTrip: null,

                setSelectedTrip: (data) =>
                    set({ selectedTrip: data }, false, 'trip/setSelectedTrip'),

                setSelectedTripToApprove: (data) =>
                    set({ selectedTripToApprove: data }, false, 'trip/setSelectedTripToApprove'),
            }),
            {
                name: 'trip-storage',
            }
        ),
        {
            name: 'TripStore',
        }
    )
);

// Legacy alias for backward compatibility during migration
export const usePreApprovalStore = useTripStore;
