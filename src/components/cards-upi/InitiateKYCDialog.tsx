import { userService } from "@/services/admin/userService";
import { Button } from "../ui/button";
import { Dialog, DialogContent, DialogTitle } from "../ui/dialog";
import { useEffect, useState } from "react";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { format } from "date-fns";
import { cn, parseLocalDate } from "@/lib/utils";
import { Calendar, ChevronDown } from "lucide-react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "../ui/command";
import { Label } from "../ui/label";
import { toast } from "sonner";

interface InitiateKycPayload {
    mobile_number: string;
    email: string;
    customer_name: string;
    date_of_birth: string;
}

function InitiateKYCDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (val: boolean) => void;
  handleSubmit: (payload: any) => void;
}) {
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState<any>();
  const [dob, setDob] = useState<string>();
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  const getAllUsers = async () => {
    try {
      const res = await userService.getAllUsers();
      setUsers(res.data.data);
    } catch (error) {
      console.log(error);
    }
  };

  const initiateKyc = async (payload: {
    mobile_number: string;
    email: string;
    customer_name: string;
    date_of_birth: string;
  }) => {
    try {
      // const res = initiateKyc
      console.log(payload);
    } catch (error) {
      console.log(error);
    }
  };

  const handleSubmit = async () => {
    if (!selectedUser) {
        toast.error("Select user first");
        return;
    }
    if (!dob) {
        toast.error("Select date of birth");
        return;
    }
    const payload: InitiateKycPayload = {
      mobile_number: selectedUser.phone_number,
      email: selectedUser.email,
      customer_name: `${selectedUser.first_name} ${selectedUser.last_name}`,
      date_of_birth: dob 
    };
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
          setSelectedUser(null);
          setDob(undefined);
          setUserDropdownOpen(false);
        }
        onOpenChange(open);
      }}
    >
      <DialogContent className="sm:max-w-4xl h-[50vh] overflow-auto w-full flex flex-col [&>button[aria-label='Close']]:hidden">
        <DialogTitle className="hidden" />
        <div className="space-y-4 flex flex-col h-full flex-1">
          <h1 className="text-xl font-semibold">Initiate KYC</h1>
          <div className="space-y-6">
            <div className="flex items-center gap-6">
              <Label className="w-1/3">User</Label>
              <span className="w-2/3">
                <Popover
                  open={userDropdownOpen}
                  onOpenChange={(open) => setUserDropdownOpen(open)}
                >
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={userDropdownOpen}
                      className="h-11 w-full justify-between"
                    >
                      <span className="truncate max-w-[85%] overflow-hidden text-ellipsis text-left">
                        {selectedUser
                          ? `${selectedUser?.first_name} ${selectedUser?.last_name} (${selectedUser?.email})`
                          : `Select user`}
                      </span>
                      <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent
                    className="w-[--radix-popover-trigger-width] p-0"
                    onWheel={(e) => e.stopPropagation()}
                  >
                    <Command>
                      <CommandInput placeholder={`Search user`} />
                      <CommandList className="max-h-[200px] overflow-y-auto">
                        <CommandEmpty>No users found.</CommandEmpty>
                        <CommandGroup>
                          {users?.map((opt: any) => (
                            <CommandItem
                              key={opt.id}
                              value={opt.label}
                              onSelect={() => {
                                setSelectedUser(opt);
                                setUserDropdownOpen(false);
                              }}
                            >
                              {`${opt.first_name} ${opt.last_name} (${opt.email})`}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </span>
            </div>
            <div className="flex items-center gap-6">
              <Label className="w-1/3">Date Of Birth</Label>
              <span className="w-2/3">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "h-11 w-full justify-between pl-3 text-left font-normal",
                      )}
                    >
                      {dob ? (
                        format(parseLocalDate(String(dob)), "PPP")
                      ) : (
                        <span>Pick a date</span>
                      )}
                      <Calendar className="h-4 w-4 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={dob ? parseLocalDate(String(dob)) : undefined}
                      onSelect={(date) => {
                        if (!date) return;
                        setDob(format(date, "yyyy-MM-dd"));
                      }}
                      disabled={(date) =>
                        date > new Date() || date < new Date("1900-01-01")
                      }
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </span>
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-4">
          <Button
            variant="outline"
            className="h-[31px]"
            onClick={() => {
              setSelectedUser(null);
              setDob(undefined);
              setUserDropdownOpen(false);
              onOpenChange(false);
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={() => {
              handleSubmit()
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
            disabled={!selectedUser || !dob}
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
