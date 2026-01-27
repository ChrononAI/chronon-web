import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Loader2, ChevronDown, Check } from "lucide-react";
import { itemsCodeService, ItemData, TDSCodeData, TaxCodeData } from "@/services/items/itemsCodeService";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const itemSchema = z.object({
  item_code: z.string().min(1, "Item code is required"),
  description: z.string().min(1, "Description is required"),
  tax_code: z.string().min(1, "Tax code is required"),
  tds_code: z.string().min(1, "TDS code is required"),
  hsn_sac_code: z.string().min(1, "HSN/SAC code is required"),
});

type ItemFormValues = z.infer<typeof itemSchema>;

interface ItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  item?: ItemData | null;
}

export function ItemDialog({
  open,
  onOpenChange,
  onSuccess,
  item,
}: ItemDialogProps) {
  const [loading, setLoading] = useState(false);
  const [tdsCodes, setTdsCodes] = useState<TDSCodeData[]>([]);
  const [taxCodes, setTaxCodes] = useState<TaxCodeData[]>([]);
  const [loadingCodes, setLoadingCodes] = useState(false);
  const [tdsOpen, setTdsOpen] = useState(false);
  const [taxOpen, setTaxOpen] = useState(false);
  const isEditMode = Boolean(item?.id);

  const form = useForm<ItemFormValues>({
    resolver: zodResolver(itemSchema),
    defaultValues: {
      item_code: "",
      description: "",
      tax_code: "",
      tds_code: "",
      hsn_sac_code: "",
    },
  });

  useEffect(() => {
    if (item && open && isEditMode) {
      form.reset({
        item_code: item.item_code || "",
        description: item.description || "",
        tax_code: item.tax_code || "",
        tds_code: item.tds_code || "",
        hsn_sac_code: item.hsn_sac_code || "",
      });
    } else if (!item && open) {
      // Reset to defaults for create mode
      form.reset({
        item_code: "",
        description: "",
        tax_code: "",
        tds_code: "",
        hsn_sac_code: "",
      });
    }
  }, [item, open, isEditMode, form]);

  useEffect(() => {
    const fetchCodes = async () => {
      if (open) {
        try {
          setLoadingCodes(true);
          const [tdsResponse, taxResponse] = await Promise.all([
            itemsCodeService.getTDSCodes(),
            itemsCodeService.getTaxCodes(),
          ]);
          setTdsCodes(tdsResponse.data || []);
          setTaxCodes(taxResponse.data || []);
        } catch (error: any) {
          console.error("Error fetching codes:", error);
          toast.error("Failed to load TDS and Tax codes");
        } finally {
          setLoadingCodes(false);
        }
      }
    };

    fetchCodes();
  }, [open]);

  const onSubmit = async (data: ItemFormValues) => {
    if (isEditMode && !item?.id) return;

    try {
      setLoading(true);
      const payload = {
        item_code: data.item_code,
        description: data.description,
        tax_code: data.tax_code,
        tds_code: data.tds_code,
        hsn_sac_code: data.hsn_sac_code,
      };

      if (isEditMode) {
        await itemsCodeService.updateItem(item!.id, payload);
        toast.success("Item updated successfully!");
      } else {
        await itemsCodeService.createItem(payload);
        toast.success("Item created successfully!");
      }

      form.reset();
      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      console.error(`Error ${isEditMode ? "updating" : "creating"} item:`, error);
      toast.error(
        error?.response?.data?.message || `Failed to ${isEditMode ? "update" : "create"} item`
      );
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      form.reset();
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-gray-900">
            {isEditMode ? "Update Item" : "Create Item"}
          </DialogTitle>
          <DialogDescription className="text-gray-600">
            {isEditMode
              ? "Update the details for this item."
              : "Fill in the details to create a new item. All fields are required."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="item_code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-semibold text-gray-700">
                      Item Code <span className="text-red-500">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="Enter Item Code"
                        className={cn(
                          "h-10 border-gray-300 focus:border-[#0D9C99] focus:ring-[#0D9C99]",
                          form.formState.errors.item_code && "border-red-500 focus:border-red-500 focus:ring-red-500"
                        )}
                        disabled={loading}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="hsn_sac_code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-semibold text-gray-700">
                      HSN/SAC Code <span className="text-red-500">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="Enter HSN/SAC Code"
                        className={cn(
                          "h-10 border-gray-300 focus:border-[#0D9C99] focus:ring-[#0D9C99]",
                          form.formState.errors.hsn_sac_code && "border-red-500 focus:border-red-500 focus:ring-red-500"
                        )}
                        disabled={loading}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="tds_code"
                render={({ field }) => {
                  const selectedTdsCode = tdsCodes.find(
                    (code) => code.tds_code === field.value
                  );
                  return (
                    <FormItem>
                      <FormLabel className="text-sm font-semibold text-gray-700">
                        TDS Code <span className="text-red-500">*</span>
                      </FormLabel>
                      <Popover open={tdsOpen} onOpenChange={setTdsOpen}>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              role="combobox"
                              aria-expanded={tdsOpen}
                              disabled={loading || loadingCodes}
                              className={cn(
                                "h-10 w-full justify-between border-gray-300 focus:border-[#0D9C99] focus:ring-[#0D9C99]",
                                !field.value && "text-muted-foreground",
                                form.formState.errors.tds_code && "border-red-500 focus:border-red-500 focus:ring-red-500"
                              )}
                            >
                              <span className="truncate">
                                {selectedTdsCode
                                  ? selectedTdsCode.tds_code
                                  : "Select TDS Code"}
                              </span>
                              <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent
                          className="w-[--radix-popover-trigger-width] p-0"
                          align="start"
                        >
                          <Command>
                            <CommandInput placeholder="Search TDS Code..." />
                            <CommandList className="max-h-[200px] overflow-y-auto">
                              {loadingCodes ? (
                                <CommandEmpty>Loading...</CommandEmpty>
                              ) : tdsCodes.length === 0 ? (
                                <CommandEmpty>No TDS codes available</CommandEmpty>
                              ) : (
                                <>
                                  <CommandEmpty>No TDS code found.</CommandEmpty>
                                  <CommandGroup>
                                    {tdsCodes.map((tdsCode) => (
                                      <CommandItem
                                        key={tdsCode.id}
                                        value={tdsCode.tds_code}
                                        onSelect={() => {
                                          field.onChange(tdsCode.tds_code);
                                          setTdsOpen(false);
                                        }}
                                      >
                                        <Check
                                          className={cn(
                                            "mr-2 h-4 w-4",
                                            field.value === tdsCode.tds_code
                                              ? "opacity-100"
                                              : "opacity-0"
                                          )}
                                        />
                                        {tdsCode.tds_code}
                                      </CommandItem>
                                    ))}
                                  </CommandGroup>
                                </>
                              )}
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />

              <FormField
                control={form.control}
                name="tax_code"
                render={({ field }) => {
                  const selectedTaxCode = taxCodes.find(
                    (code) => code.tax_code === field.value
                  );
                  return (
                    <FormItem>
                      <FormLabel className="text-sm font-semibold text-gray-700">
                        Tax Code <span className="text-red-500">*</span>
                      </FormLabel>
                      <Popover open={taxOpen} onOpenChange={setTaxOpen}>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              role="combobox"
                              aria-expanded={taxOpen}
                              disabled={loading || loadingCodes}
                              className={cn(
                                "h-10 w-full justify-between border-gray-300 focus:border-[#0D9C99] focus:ring-[#0D9C99]",
                                !field.value && "text-muted-foreground",
                                form.formState.errors.tax_code && "border-red-500 focus:border-red-500 focus:ring-red-500"
                              )}
                            >
                              <span className="truncate">
                                {selectedTaxCode
                                  ? selectedTaxCode.tax_code
                                  : "Select Tax Code"}
                              </span>
                              <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent
                          className="w-[--radix-popover-trigger-width] p-0"
                          align="start"
                        >
                          <Command>
                            <CommandInput placeholder="Search Tax Code..." />
                            <CommandList className="max-h-[200px] overflow-y-auto">
                              {loadingCodes ? (
                                <CommandEmpty>Loading...</CommandEmpty>
                              ) : taxCodes.length === 0 ? (
                                <CommandEmpty>No Tax codes available</CommandEmpty>
                              ) : (
                                <>
                                  <CommandEmpty>No Tax code found.</CommandEmpty>
                                  <CommandGroup>
                                    {taxCodes.map((taxCode) => (
                                      <CommandItem
                                        key={taxCode.id}
                                        value={taxCode.tax_code}
                                        onSelect={() => {
                                          field.onChange(taxCode.tax_code);
                                          setTaxOpen(false);
                                        }}
                                      >
                                        <Check
                                          className={cn(
                                            "mr-2 h-4 w-4",
                                            field.value === taxCode.tax_code
                                              ? "opacity-100"
                                              : "opacity-0"
                                          )}
                                        />
                                        {taxCode.tax_code}
                                      </CommandItem>
                                    ))}
                                  </CommandGroup>
                                </>
                              )}
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-semibold text-gray-700">
                    Description <span className="text-red-500">*</span>
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="Enter Description"
                      className={cn(
                        "min-h-[100px] border-gray-300 focus:border-[#0D9C99] focus:ring-[#0D9C99] resize-none",
                        form.formState.errors.description && "border-red-500 focus:border-red-500 focus:ring-red-500"
                      )}
                      disabled={loading}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={loading}
                className="border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="bg-[#0D9C99] hover:bg-[#0b8a87] text-white"
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {loading
                  ? isEditMode
                    ? "Updating..."
                    : "Creating..."
                  : isEditMode
                  ? "Update Item"
                  : "Create Item"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

