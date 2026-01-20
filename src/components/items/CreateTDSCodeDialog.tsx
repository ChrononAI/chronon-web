import { useState } from "react";
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
import { itemsCodeService } from "@/services/items/itemsCodeService";
import { toast } from "sonner";

const tdsCodeSchema = z.object({
  tds_code: z.string().min(1, "TDS code is required"),
  tds_percentage: z.coerce.number().min(0, "TDS percentage must be 0 or greater"),
  description: z.string().optional(),
});

type TDSCodeFormValues = z.infer<typeof tdsCodeSchema>;

interface CreateTDSCodeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function CreateTDSCodeDialog({
  open,
  onOpenChange,
  onSuccess,
}: CreateTDSCodeDialogProps) {
  const [loading, setLoading] = useState(false);

  const form = useForm<TDSCodeFormValues>({
    resolver: zodResolver(tdsCodeSchema),
    defaultValues: {
      tds_code: "",
      tds_percentage: 0,
      description: "",
    },
  });

  const onSubmit = async (data: TDSCodeFormValues) => {
    try {
      setLoading(true);
      const payload = {
        tds_code: data.tds_code,
        tds_percentage: data.tds_percentage,
        active_flag: true,
        description: data.description || "",
      };

      await itemsCodeService.createTDSCode(payload);
      toast.success("TDS code created successfully!");
      form.reset();
      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      console.error("Error creating TDS code:", error);
      toast.error(
        error?.response?.data?.message || "Failed to create TDS code"
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
            Create TDS Code
          </DialogTitle>
          <DialogDescription className="text-gray-600">
            Fill in the details to create a new TDS code. Tax Deducted at Source
            (TDS) codes are used for tax deduction purposes.
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
                        className="h-10 border-gray-300 focus:border-purple-500 focus:ring-purple-500"
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
                        {...field}
                        type="number"
                        step="0.01"
                        placeholder="e.g., 10.00"
                        className="h-10 border-gray-300 focus:border-purple-500 focus:ring-purple-500"
                        disabled={loading}
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
                    Description
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="e.g., TDS under section 2026 for contractors"
                      className="min-h-[100px] border-gray-300 focus:border-purple-500 focus:ring-purple-500 resize-none"
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
                className="bg-purple-600 hover:bg-purple-700 text-white"
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {loading ? "Creating..." : "Create TDS Code"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

