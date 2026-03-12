import { userService } from "@/services/admin/userService";
import { Button } from "../ui/button";
import { Dialog, DialogContent, DialogTitle } from "../ui/dialog";
import { useEffect, useState } from "react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "../ui/command";
import { toast } from "sonner";
import { Checkbox } from "../ui/checkbox";
import { cardsUpiService } from "@/services/cardsUpiService";

function InitiateKYCDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (val: boolean) => void;
  handleSubmit: (payload: any) => void;
}) {
  const [users, setUsers] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);

  const toggleCategory = (id: string) => {
    setSelectedUsers((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id],
    );
  };

  const getAllUsers = async () => {
    try {
      const res = await userService.getAllUsers();
      setUsers(res.data.data);
    } catch (error) {
      console.log(error);
    }
  };

  const initiateKyc = async (payload: { user_id: string }[]) => {
    try {
      const res = await cardsUpiService.initiateKyc(payload);
      console.log(res);
      onOpenChange(false);
    } catch (error) {
      console.log(error);
      toast.error("Error initiating KYC");
    }
  };

  const handleSubmit = async () => {
    if (selectedUsers.length === 0) {
      toast.error("Select users first");
      return;
    }
    const payload: { user_id: string }[] = selectedUsers.map(id => {return { user_id: id.toString() }});
    initiateKyc(payload);
  };

  useEffect(() => {
    getAllUsers();
  }, [open]);

  return (
    <Dialog
      open={open}
      onOpenChange={(open) => {
        if (!open) {
          setSelectedUsers([]);
        }
        onOpenChange(open);
      }}
    >
      <DialogContent className="sm:max-w-4xl h-[50vh] overflow-auto w-full flex flex-col [&>button[aria-label='Close']]:hidden">
        <DialogTitle className="hidden" />
        <div className="space-y-4 flex flex-col flex-1">
          <h1 className="text-xl font-semibold">Select Users</h1>
          <div className="space-y-6 flex-1">
            <Command className="flex flex-col">
              <CommandInput placeholder={`Search user`} />
              <CommandList className="flex-1 overflow-y-auto">
                <CommandEmpty>No users found.</CommandEmpty>
                <CommandGroup>
                  {users?.map((opt: any) => (
                    <CommandItem
                      key={opt.id}
                      value={opt.label}
                      onSelect={() => {
                        toggleCategory(opt.id)
                      }}
                    >
                      <Checkbox checked={selectedUsers.includes(opt.id)} className="mr-2" />
                      {`${opt.first_name} ${opt.last_name} (${opt.email})`}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </div>
        </div>
        <div className="flex justify-end gap-4">
          <Button
            variant="outline"
            className="h-[31px]"
            onClick={() => {
              setSelectedUsers([]);
              onOpenChange(false);
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={() => {
              handleSubmit();
            }}
            style={{
              width: "163px",
              height: "31px",
              gap: "8px",
              borderRadius: "4px",
              paddingTop: "8px",
              paddingRight: "12px",
              paddingBottom: "8px",
              paddingLeft: "12px",
              backgroundColor: "#0D9C99",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: "none",
              cursor: "pointer",
            }}
            disabled={selectedUsers.length === 0}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "#0b8a87";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "#0D9C99";
            }}
          >
            Initiate KYC
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default InitiateKYCDialog;
