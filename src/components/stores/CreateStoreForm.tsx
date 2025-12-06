import { useEffect, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { ChevronDown, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "../ui/command";
import { userService } from "@/services/admin/userService";
import { storesService } from "@/services/storeService";
import { toast } from "sonner";
import { trackEvent } from "@/mixpanel";
import { FormFooter } from "../layout/FormFooter";

export interface Currency {
  code: string;
  name: string;
  symbol: string;
}

// Form schema
const storeSchema = z.object({
  description: z.string().optional(),
  name: z.string().min(1, "Title is required"),
  address: z.string().min(1, "Address is required"),
  city: z.string().min(1, "City is required"),
  area_manager_id: z.string().min(1, "Area manager is required").nullable(),
  store_manager_id: z.string().min(1, "Store manager is required").nullable(),
  store_code: z.string().min(1, "Store code is required"),
});

type StoreFormValues = z.infer<typeof storeSchema> & Record<string, any>;

export function CreateStoreForm({
  mode = "create",
  showHeader = true,
  maxWidth,
}: {
  mode?: "create" | "view" | "edit";
  showHeader?: boolean;
  maxWidth?: string;
}) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { id } = useParams<{ id: string }>();

  const [selectedStore, setSelectedStore] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState([]);
  const [areaManagerDropdown, setAreaManagerDropdown] = useState(false);
  const [storeManagerDropdown, setStoreManagerDropdown] = useState(false);
  const [selectedStoreManager, setSelectedStoreManager] = useState<any | null>(
    null
  );
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const form = useForm<StoreFormValues>({
    resolver: zodResolver(storeSchema),
    defaultValues: {
      name: "",
      address: "",
      city: "",
      description: "",
      area_manager_id: null,
      store_manager_id: null,
    },
  });

  const getAllUsers = async () => {
    try {
      const response = await userService.getAllUsers();
      setUsers(response.data.data);
    } catch (error) {
      console.log(error);
    }
  };

  const getStoreById = async (id: string) => {
    try {
      const res: any = await storesService.getStoreById(id);
      const selectedStore = res.data.data;
      if (selectedStore) {
        form.reset(selectedStore);
        setSelectedStore(selectedStore);
        const areaManager = users.find(
          (user: any) => user.id === +selectedStore.area_manager_id
        );
        if (areaManager) setSelectedUser(areaManager);
        const storeManager = users.find(
          (user: any) => user.id === +selectedStore.store_manager_id
        );
        if (storeManager) setSelectedStoreManager(storeManager);
      }
    } catch (error) {
      console.log(error);
    }
  };

  useEffect(() => {
    if (id) {
      getStoreById(id);
    }
  }, [users]);

  const handleCancel = () => {
      navigate("/requests/stores");
  };

  const onSubmit = async (values: StoreFormValues) => {
    setLoading(true);
    if (selectedStore && selectedStore?.status === "COMPLETE") {
      try {
        trackEvent("Submit Store Button Clicked", {
          button_name: "Submit Store",
        });
        await storesService.submitStore(selectedStore.id);
        toast.success("Store resubmitted successfully");
        navigate("/requests/stores");
      } catch (error: any) {
        toast.error(
          error.response?.data?.message ||
            error.message ||
            "Failed to resubmit store"
        );
      } finally {
        setLoading(false);
      }
    } else {
      try {
        trackEvent("Create Store Button Clicked", {
          button_name: "Create Store",
        });
        const payload: any = values;
        const response: any = await storesService.createStore(payload);
        await storesService.submitStore(response.data.data.id);
        toast.success("Store created successfully");
        setTimeout(() => {
          navigate("/requests/stores");
        }, 200);
      } catch (error: any) {
        toast.error(error.response?.data?.message || error.message);
      } finally {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    getAllUsers();
  }, []);

  return (
    <div className={maxWidth ? `space-y-6 ${maxWidth}` : "space-y-6 max-w-4xl"}>
      {/* Header */}
      {showHeader && <h1 className="text-2xl font-bold">Create Store</h1>}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Name *</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    placeholder="Name"
                    disabled={mode === "view"}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Amount Field */}
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Description"
                    {...field}
                    disabled={mode === "view"}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="address"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Address *</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Address"
                    {...field}
                    disabled={mode === "view"}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="city"
            render={({ field }) => (
              <FormItem>
                <FormLabel>City *</FormLabel>
                <FormControl>
                  <Input
                    placeholder="City"
                    {...field}
                    disabled={mode === "view"}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="store_code"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Store Code *</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Store code"
                    {...field}
                    disabled={mode === "view"}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {!(mode === "view" && !selectedStore?.store_manager_id) && (
              <FormField
                control={form.control}
                name="store_manager_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Store Manager</FormLabel>
                    <Popover
                      open={storeManagerDropdown}
                      onOpenChange={setStoreManagerDropdown}
                    >
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={storeManagerDropdown}
                            className="h-11 w-full justify-between"
                            disabled={mode === "view"}
                          >
                            <>
                              <span className="truncate max-w-[85%] overflow-hidden text-ellipsis text-left">
                                {selectedStoreManager
                                  ? `${selectedStoreManager?.first_name} ${selectedStoreManager?.last_name}`
                                  : "Select a manager"}
                              </span>
                              <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </>
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                        <Command>
                          <CommandInput placeholder="Search users..." />
                          <CommandList>
                            <CommandEmpty>No users found.</CommandEmpty>
                            <CommandGroup>
                              {users.map((user: any) => (
                                <CommandItem
                                  key={user.id}
                                  value={user.id}
                                  onSelect={() => {
                                    field.onChange(user.id.toString());
                                    setSelectedStoreManager(user);
                                    setStoreManagerDropdown(false);
                                  }}
                                >
                                  {`${user.first_name} ${user.last_name}`}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            {!(mode === "view" && !selectedStore?.area_manager_id) && (
              <FormField
                control={form.control}
                name="area_manager_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Area Manager</FormLabel>
                    <Popover
                      open={areaManagerDropdown}
                      onOpenChange={setAreaManagerDropdown}
                    >
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={areaManagerDropdown}
                            className="h-11 w-full justify-between"
                            disabled={mode === "view"}
                          >
                            <>
                              <span className="truncate max-w-[85%] overflow-hidden text-ellipsis text-left">
                                {selectedUser
                                  ? `${selectedUser?.first_name} ${selectedUser?.last_name}`
                                  : "Select a manager"}
                              </span>
                              <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </>
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                        <Command>
                          <CommandInput placeholder="Search users..." />
                          <CommandList>
                            <CommandEmpty>No users found.</CommandEmpty>
                            <CommandGroup>
                              {users.map((user: any) => (
                                <CommandItem
                                  key={user.id}
                                  value={user.id}
                                  onSelect={() => {
                                    field.onChange(user.id.toString());
                                    setSelectedUser(user);
                                    setAreaManagerDropdown(false);
                                  }}
                                >
                                  {`${user.first_name} ${user.last_name}`}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
          </div>

          {!pathname.includes("approvals") && <FormFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={loading}
              className="px-6 py-2"
            >
              Back
            </Button>
            {(selectedStore?.status === "COMPLETE" || mode !== "view") && (
              <Button
                type="submit"
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {selectedStore?.status === "COMPLETE" || mode !== "view"
                      ? "Submitting..."
                      : "Creating..."}
                  </>
                ) : selectedStore?.status === "COMPLETE" ? (
                  "Resubmit Store"
                ) : (
                  "Create Store"
                )}
              </Button>
            )}
          </FormFooter>}
        </form>
      </Form>
    </div>
  );
}
