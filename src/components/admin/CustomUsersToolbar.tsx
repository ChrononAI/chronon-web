import { useUsersStore } from "@/store/admin/usersStore";
import { Button } from "../ui/button";
import { Toolbar } from "@mui/x-data-grid";
import { userService } from "@/services/admin/userService";
import { toast } from "sonner";

function CustomUsersToolbar() {
  const { selectedUsers } = useUsersStore();
  const handleDisableUser = async () => {
    const payload = selectedUsers?.map((user: any) => {
        return {
            email: user.email,
            is_active: false
        }
    });
    try {
        await userService.disableUsers(payload);
        toast.success("Successfully disabled users");
    } catch (error: any) {
        console.log(error);
        toast.error(error?.response?.data?.message || error?.message);
    }
  }
  return (
    <Toolbar className="flex items-center !justify-start !px-[1px] !gap-2 !my-3 !border-0 bg-white">
      <Button variant="outline" disabled={selectedUsers?.length === 0} onClick={handleDisableUser}>
        Disable Users
      </Button>
    </Toolbar>
  );
}

export default CustomUsersToolbar;
