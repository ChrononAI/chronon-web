import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";

interface UsersState {
  selectedUsers: any | null;

  // Methods
  setSelectedUsers: (data: any | null) => void;
}

export const useUsersStore = create<UsersState>()(
  devtools(
    persist(
      (set) => ({
        selectedUsers: null,
        setSelectedUsers: (data) =>
          set(
            { selectedUsers: data },
            false,
            "users/setSelectedUsers"
          ),
      }),
      {
        name: "users-storage",
      }
    ),
    {
      name: "UsersStore",
    }
  )
);
