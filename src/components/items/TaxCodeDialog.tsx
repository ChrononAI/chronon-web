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
import { Loader2 } from "lucide-react";
import { itemsCodeService, TaxCodeData } from "@/services/items/itemsCodeService";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const taxCodeSchema = z.object({
  tax_code: z.string().min(1, "Tax code is required"),
  tax_percentage: z.preprocess(
    (val) => {
      if (val === "" || val === null || val === undefined) return undefined;
      const num = Number(val);
      return isNaN(num) ? undefined : num;
    },
    z.union([z.number().min(0, "Tax percentage is required"), z.undefined()]).refine(
      (val) => val !== undefined,
      {
        message: "Tax percentage is required",
      }
    )
  ),
  cgst_percentage: z.preprocess(
    (val) => {
      if (val === "" || val === null || val === undefined) return undefined;
      const num = Number(val);
      return isNaN(num) ? undefined : num;
    },
    z.union([z.number().min(0), z.undefined()]).refine((val) => val !== undefined, {
      message: "CGST is required",
    })
  ),
  sgst_percentage: z.preprocess(
    (val) => {
      if (val === "" || val === null || val === undefined) return undefined;
      const num = Number(val);
      return isNaN(num) ? undefined : num;
    },
    z.union([z.number().min(0), z.undefined()]).refine((val) => val !== undefined, {
      message: "SGST is required",
    })
  ),
  igst_percentage: z.preprocess(
    (val) => {
      if (val === "" || val === null || val === undefined) return undefined;
      const num = Number(val);
      return isNaN(num) ? undefined : num;
    },
    z.union([z.number().min(0), z.undefined()]).refine((val) => val !== undefined, {
      message: "IGST is required",
    })
  ),
  utgst_percentage: z.preprocess(
    (val) => {
      if (val === "" || val === null || val === undefined) return undefined;
      const num = Number(val);
      return isNaN(num) ? undefined : num;
    },
    z.union([z.number().min(0), z.undefined()]).refine((val) => val !== undefined, {
      message: "UTGST is required",
    })
  ),
  description: z.string().min(1, "Description is required"),
  hsn_sac_code: z.string().optional(),
});

type TaxCodeFormValues = z.infer<typeof taxCodeSchema>;

interface TaxCodeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  taxCode?: TaxCodeData | null;
}

export function TaxCodeDialog({
  open,
  onOpenChange,
  onSuccess,
  taxCode,
}: TaxCodeDialogProps) {
  const [loading, setLoading] = useState(false);
  const isEditMode = Boolean(taxCode?.id);

  const form = useForm<TaxCodeFormValues>({
    resolver: zodResolver(taxCodeSchema),
    defaultValues: {
      tax_code: "",
      tax_percentage: undefined,
      cgst_percentage: 0,
      sgst_percentage: 0,
      igst_percentage: 0,
      utgst_percentage: 0,
      description: "",
      hsn_sac_code: "",
    },
  });

  useEffect(() => {
    if (taxCode && open && isEditMode) {
      form.reset({
        tax_code: taxCode.tax_code || "",
        tax_percentage: parseFloat(taxCode.tax_percentage) || undefined,
        cgst_percentage: parseFloat(taxCode.cgst_percentage) || 0,
        sgst_percentage: parseFloat(taxCode.sgst_percentage) || 0,
        igst_percentage: parseFloat(taxCode.igst_percentage) || 0,
        utgst_percentage: parseFloat(taxCode.utgst_percentage) || 0,
        description: taxCode.description || "",
        hsn_sac_code: taxCode.hsn_sac_code || "",
      });
    } else if (!taxCode && open) {
      // Reset to defaults for create mode
      form.reset({
        tax_code: "",
        tax_percentage: undefined,
        cgst_percentage: 0,
        sgst_percentage: 0,
        igst_percentage: 0,
        utgst_percentage: 0,
        description: "",
        hsn_sac_code: "",
      });
    }
  }, [taxCode, open, isEditMode, form]);

  const onSubmit = async (data: TaxCodeFormValues) => {
    if (isEditMode && !taxCode?.id) return;

    try {
      setLoading(true);
      const payload = {
        tax_code: data.tax_code,
        tax_percentage: data.tax_percentage,
        cgst_percentage: data.cgst_percentage,
        sgst_percentage: data.sgst_percentage,
        igst_percentage: data.igst_percentage,
        utgst_percentage: data.utgst_percentage,
        description: data.description,
        hsn_sac_code: data.hsn_sac_code || undefined,
      };

      if (isEditMode) {
        await itemsCodeService.updateTaxCode(taxCode!.id, {
          ...payload,
          is_active: true,
        });
        toast.success("Tax code updated successfully!");
      } else {
        await itemsCodeService.createTaxCode({
          ...payload,
          is_active: true,
        });
        toast.success("Tax code created successfully!");
      }

      form.reset();
      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      console.error(`Error ${isEditMode ? "updating" : "creating"} tax code:`, error);
      toast.error(
        error?.response?.data?.message || `Failed to ${isEditMode ? "update" : "create"} tax code`
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
            {isEditMode ? "Update Tax Code" : "Create Tax Code"}
          </DialogTitle>
          <DialogDescription className="text-gray-600">
            {isEditMode
              ? "Update the details for this tax code."
              : "Fill in the details to create a new tax code. All fields are required."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="tax_code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-semibold text-gray-700">
                      Tax Code <span className="text-red-500">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="e.g., GST_20"
                        className={cn(
                          "h-10 border-gray-300 focus:border-[#0D9C99] focus:ring-[#0D9C99]",
                          form.formState.errors.tax_code && "border-red-500 focus:border-red-500 focus:ring-red-500"
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
                name="tax_percentage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-semibold text-gray-700">
                      Tax Percentage <span className="text-red-500">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="text"
                        inputMode="decimal"
                        step="0.01"
                        placeholder="e.g., 11.00"
                        className={cn(
                          "h-10 border-gray-300 focus:border-[#0D9C99] focus:ring-[#0D9C99]",
                          form.formState.errors.tax_percentage && "border-red-500 focus:border-red-500 focus:ring-red-500"
                        )}
                        disabled={loading}
                        value={
                          field.value === 0 ||
                          field.value === undefined ||
                          field.value === null
                            ? ""
                            : String(field.value)
                        }
                        onChange={(e) => {
                          const value = e.target.value;

                          if (value === "" || value === null || value === undefined) {
                            field.onChange(undefined);
                            return;
                          }

                          if (/^\d*\.?\d*$/.test(value)) {
                            let cleanedValue = value;
                            if (
                              cleanedValue.length > 1 &&
                              cleanedValue[0] === "0" &&
                              cleanedValue[1] !== "."
                            ) {
                              cleanedValue = cleanedValue.replace(/^0+/, "");
                              if (cleanedValue === "") {
                                field.onChange(undefined);
                                return;
                              }
                            }

                            field.onChange(cleanedValue);
                          }
                        }}
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
                name="cgst_percentage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-semibold text-gray-700">
                      CGST Percentage <span className="text-red-500">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="text"
                        inputMode="decimal"
                        step="0.01"
                        placeholder="e.g., 13.0"
                        className={cn(
                          "h-10 border-gray-300 focus:border-[#0D9C99] focus:ring-[#0D9C99]",
                          form.formState.errors.cgst_percentage && "border-red-500 focus:border-red-500 focus:ring-red-500"
                        )}
                        disabled={loading}
                        value={
                          field.value === 0 ||
                          field.value === undefined ||
                          field.value === null
                            ? ""
                            : String(field.value)
                        }
                        onChange={(e) => {
                          const value = e.target.value;
                          if (value === "" || value === null || value === undefined) {
                            field.onChange(undefined);
                            return;
                          }
                          if (/^\d*\.?\d*$/.test(value)) {
                            let cleanedValue = value;
                            if (
                              cleanedValue.length > 1 &&
                              cleanedValue[0] === "0" &&
                              cleanedValue[1] !== "."
                            ) {
                              cleanedValue = cleanedValue.replace(/^0+/, "");
                              if (cleanedValue === "") {
                                field.onChange(undefined);
                                return;
                              }
                            }
                            field.onChange(cleanedValue);
                          }
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="sgst_percentage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-semibold text-gray-700">
                      SGST Percentage <span className="text-red-500">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="text"
                        inputMode="decimal"
                        step="0.01"
                        placeholder="e.g., 30.0"
                        className={cn(
                          "h-10 border-gray-300 focus:border-[#0D9C99] focus:ring-[#0D9C99]",
                          form.formState.errors.sgst_percentage && "border-red-500 focus:border-red-500 focus:ring-red-500"
                        )}
                        disabled={loading}
                        value={
                          field.value === 0 ||
                          field.value === undefined ||
                          field.value === null
                            ? ""
                            : String(field.value)
                        }
                        onChange={(e) => {
                          const value = e.target.value;
                          if (value === "" || value === null || value === undefined) {
                            field.onChange(undefined);
                            return;
                          }
                          if (/^\d*\.?\d*$/.test(value)) {
                            let cleanedValue = value;
                            if (
                              cleanedValue.length > 1 &&
                              cleanedValue[0] === "0" &&
                              cleanedValue[1] !== "."
                            ) {
                              cleanedValue = cleanedValue.replace(/^0+/, "");
                              if (cleanedValue === "") {
                                field.onChange(undefined);
                                return;
                              }
                            }
                            field.onChange(cleanedValue);
                          }
                        }}
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
                name="igst_percentage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-semibold text-gray-700">
                      IGST Percentage <span className="text-red-500">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="text"
                        inputMode="decimal"
                        step="0.01"
                        placeholder="e.g., 23.3"
                        className={cn(
                          "h-10 border-gray-300 focus:border-[#0D9C99] focus:ring-[#0D9C99]",
                          form.formState.errors.igst_percentage && "border-red-500 focus:border-red-500 focus:ring-red-500"
                        )}
                        disabled={loading}
                        value={
                          field.value === 0 ||
                          field.value === undefined ||
                          field.value === null
                            ? ""
                            : String(field.value)
                        }
                        onChange={(e) => {
                          const value = e.target.value;
                          if (value === "" || value === null || value === undefined) {
                            field.onChange(undefined);
                            return;
                          }
                          if (/^\d*\.?\d*$/.test(value)) {
                            let cleanedValue = value;
                            if (
                              cleanedValue.length > 1 &&
                              cleanedValue[0] === "0" &&
                              cleanedValue[1] !== "."
                            ) {
                              cleanedValue = cleanedValue.replace(/^0+/, "");
                              if (cleanedValue === "") {
                                field.onChange(undefined);
                                return;
                              }
                            }
                            field.onChange(cleanedValue);
                          }
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="utgst_percentage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-semibold text-gray-700">
                      UTGST Percentage <span className="text-red-500">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="text"
                        inputMode="decimal"
                        step="0.01"
                        placeholder="e.g., 46.0"
                        className={cn(
                          "h-10 border-gray-300 focus:border-[#0D9C99] focus:ring-[#0D9C99]",
                          form.formState.errors.utgst_percentage && "border-red-500 focus:border-red-500 focus:ring-red-500"
                        )}
                        disabled={loading}
                        value={
                          field.value === 0 ||
                          field.value === undefined ||
                          field.value === null
                            ? ""
                            : String(field.value)
                        }
                        onChange={(e) => {
                          const value = e.target.value;
                          if (value === "" || value === null || value === undefined) {
                            field.onChange(undefined);
                            return;
                          }
                          if (/^\d*\.?\d*$/.test(value)) {
                            let cleanedValue = value;
                            if (
                              cleanedValue.length > 1 &&
                              cleanedValue[0] === "0" &&
                              cleanedValue[1] !== "."
                            ) {
                              cleanedValue = cleanedValue.replace(/^0+/, "");
                              if (cleanedValue === "") {
                                field.onChange(undefined);
                                return;
                              }
                            }
                            field.onChange(cleanedValue);
                          }
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="hsn_sac_code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-semibold text-gray-700">
                    HSN/SAC Code
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="e.g., 998314"
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
                      placeholder="e.g., GST 20 percent applicable on goods and services"
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
                  ? "Update Tax Code"
                  : "Create Tax Code"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

