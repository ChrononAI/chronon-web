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

interface PreApprovalState {
    selectedPreApproval: PreApprovalType | null;
    selectedPreApprovalToApprove: PreApprovalType | null;

    // Methods
    setSelectedPreApproval: (data: PreApprovalType | null) => void;
    setSelectedPreApprovalToApprove: (data: PreApprovalType | null) => void;
}

export const usePreApprovalStore = create<PreApprovalState>()(
    devtools(
        persist(
            (set) => ({
                selectedPreApprovalToApprove: null,
                selectedPreApproval: null,

                setSelectedPreApproval: (data) =>
                    set({ selectedPreApproval: data }, false, 'pre-approval/setSelectedPreApproval'),

                setSelectedPreApprovalToApprove: (data) =>
                    set({ selectedPreApprovalToApprove: data }, false, 'pre-approval/setPreApprovalToApprove'),
            }),
            {
                name: 'pre_approval-storage',
            }
        ),
        {
            name: 'PreApprovalStore',
        }
    )
);
