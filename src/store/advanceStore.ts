import { PreApprovalType } from "@/services/preApprovalService";
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

interface AdvanceState {
    selectedAdvance: PreApprovalType | null;
    selectedAdvanceToApprove: PreApprovalType | null;

    // Methods
    setSelectedAdvance: (data: PreApprovalType | null) => void;
    setSelectedAdvanceToApprove: (data: PreApprovalType | null) => void;
}

export const useAdvanceStore = create<AdvanceState>()(
    devtools(
        persist(
            (set) => ({
                selectedAdvanceToApprove: null,
                selectedAdvance: null,

                setSelectedAdvance: (data) =>
                    set({ selectedAdvance: data }, false, 'advance/setSelectedAdvance'),

                setSelectedAdvanceToApprove: (data) =>
                    set({ selectedAdvanceToApprove: data }, false, 'advance/setAdvanceToApprove'),
            }),
            {
                name: 'advance-storage',
            }
        ),
        {
            name: 'AdvanceStore',
        }
    )
);
