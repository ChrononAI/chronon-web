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
import { itemsCodeService, TDSCodeData } from "@/services/items/itemsCodeService";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const tdsCodeSchema = z.object({
  tds_code: z.string().min(1, "TDS code is required"),
  tds_percentage: z.preprocess(
    (val) => {
      if (val === "" || val === null || val === undefined) return undefined;
      const num = Number(val);
      return isNaN(num) ? undefined : num;
    },
    z.union([z.number().min(0.01, "TDS Percentage is required"), z.undefined()]).refine((val) => val !== undefined, {
      message: "TDS Percentage is required",
    })
  ),
  description: z.string().min(1, "Description is required"),
});

type TDSCodeFormValues = z.infer<typeof tdsCodeSchema>;

interface TDSCodeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  tdsCode?: TDSCodeData | null;
}

export function TDSCodeDialog({
  open,
  onOpenChange,
  onSuccess,
  tdsCode,
}: TDSCodeDialogProps) {
  const [loading, setLoading] = useState(false);
  const isEditMode = Boolean(tdsCode?.id);

  const form = useForm<TDSCodeFormValues>({
    resolver: zodResolver(tdsCodeSchema),
    defaultValues: {
      tds_code: "",
      tds_percentage: undefined,
      description: "",
    },
  });

  useEffect(() => {
    if (tdsCode && open && isEditMode) {
      form.reset({
        tds_code: tdsCode.tds_code || "",
        tds_percentage: parseFloat(tdsCode.tds_percentage) || undefined,
        description: tdsCode.description || "",
      });
    } else if (!tdsCode && open) {
      // Reset to defaults for create mode
      form.reset({
        tds_code: "",
        tds_percentage: undefined,
        description: "",
      });
    }
  }, [tdsCode, open, isEditMode, form]);

  const onSubmit = async (data: TDSCodeFormValues) => {
    if (isEditMode && !tdsCode?.id) return;

    try {
      setLoading(true);
      const payload = {
        tds_code: data.tds_code,
        tds_percentage: data.tds_percentage,
        description: data.description,
      };

      if (isEditMode) {
        await itemsCodeService.updateTDSCode(tdsCode!.id, payload);
        toast.success("TDS code updated successfully!");
      } else {
        await itemsCodeService.createTDSCode({
          ...payload,
          is_active: true,
        });
        toast.success("TDS code created successfully!");
      }

      form.reset();
      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      console.error(`Error ${isEditMode ? "updating" : "creating"} TDS code:`, error);
      toast.error(
        error?.response?.data?.message || `Failed to ${isEditMode ? "update" : "create"} TDS code`
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
            {isEditMode ? "Update TDS Code" : "Create TDS Code"}
          </DialogTitle>
          <DialogDescription className="text-gray-600">
            {isEditMode
              ? "Update the details for this TDS code."
              : "Fill in the details to create a new TDS code. All fields are required."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="tds_code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-semibold text-gray-700">
                      TDS Code <span className="text-red-500">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="e.g., TDS_06z"
                        className={cn(
                          "h-10 border-gray-300 focus:border-[#0D9C99] focus:ring-[#0D9C99]",
                          form.formState.errors.tds_code && "border-red-500 focus:border-red-500 focus:ring-red-500"
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
                name="tds_percentage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-semibold text-gray-700">
                      TDS Percentage <span className="text-red-500">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="text"
                        inputMode="decimal"
                        step="0.01"
                        placeholder="e.g., 10.00"
                        className={cn(
                          "h-10 border-gray-300 focus:border-[#0D9C99] focus:ring-[#0D9C99]",
                          form.formState.errors.tds_percentage && "border-red-500 focus:border-red-500 focus:ring-red-500"
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

                          // Allow empty value
                          if (value === "" || value === null || value === undefined) {
                            field.onChange(undefined);
                            return;
                          }

                          // Only allow numbers and a single decimal point
                          if (/^\d*\.?\d*$/.test(value)) {
                            // Remove leading zeros except for "0." pattern
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

                            // Keep the cleaned string in the field so user can type "10." etc.
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
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-semibold text-gray-700">
                    Description <span className="text-red-500">*</span>
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="e.g., TDS under section 2026 for contractors"
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
                  ? "Update TDS Code"
                  : "Create TDS Code"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

