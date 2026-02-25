import { useUsersStore } from "@/store/admin/usersStore";
import { Button } from "../ui/button";
import { Toolbar } from "@mui/x-data-grid";
import { GridToolbarProps } from "@mui/x-data-grid/internals";
import { ToolbarPropsOverrides } from "@mui/x-data-grid";

export interface CustomUsersToolbarProps {
 handleDisableUser: () => void
}

type Props = GridToolbarProps &
  ToolbarPropsOverrides &
  Partial<CustomUsersToolbarProps>;

function CustomUsersToolbar({ handleDisableUser }: Props) {
  const { selectedUsers } = useUsersStore();
  return (
    <Toolbar className="flex items-center !justify-end !px-[1px] !gap-2 !my-3 !border-0 bg-white">
      <Button variant="outline" disabled={selectedUsers?.length === 0} onClick={handleDisableUser}>
        Disable Users
      </Button>
    </Toolbar>
  );
}

export default CustomUsersToolbar;
