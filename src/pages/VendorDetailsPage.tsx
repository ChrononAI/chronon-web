import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Building2, Mail, Phone, MapPin, FileText, Hash } from "lucide-react";
import { toast } from "sonner";
import { useNavigate, useParams } from "react-router-dom";
import { FormFooter } from "@/components/layout/FormFooter";
import { Separator } from "@/components/ui/separator";
import { vendorService, CreateVendorPayload, UpdateVendorPayload } from "@/services/vendorService";

type VendorFormValues = {
  vendorCode: string;
  vendorName: string;
  gstin: string;
  pan: string;
  email: string;
  phoneNumber: string;
  address: string;
  address2: string;
  city: string;
  state: string;
  postCode: string;
  country: string;
  status: string;
  type: string;
};

const vendorSchema = z.object({
  vendorCode: z.string().trim().min(1, "Vendor code is required"),
  vendorName: z.string().trim().min(1, "Vendor name is required"),
  gstin: z
    .string()
    .trim()
    .min(15, "GSTIN must be 15 characters")
    .max(15, "GSTIN must be 15 characters"),
  pan: z
    .string()
    .trim()
    .min(10, "PAN must be 10 characters")
    .max(10, "PAN must be 10 characters")
    .optional(),
  email: z.string().trim().email("Invalid email address").optional(),
  phoneNumber: z
    .string()
    .trim()
    .refine(
      (val) => !val || val.replace(/\D/g, "").length === 10,
      "Phone number must be 10 digits long"
    )
    .optional(),
  address: z.string().trim().optional(),
  address2: z.string().trim().optional(),
  city: z.string().trim().optional(),
  state: z.string().trim().min(1, "State is required"),
  postCode: z
    .string()
    .trim()
    .refine(
      (val) => !val || val.replace(/\D/g, "").length === 6,
      "Post code must be 6 digits"
    )
    .optional(),
  country: z.string().trim().optional(),
  status: z.string().trim().min(1, "Status is required"),
  type: z.string().trim().optional(),
});

const STATUS_OPTIONS = [
  { value: "ACTIVE", label: "Active" },
  { value: "INACTIVE", label: "Inactive" },
] as const;

const createDefaultValues = (): VendorFormValues => ({
  vendorCode: "",
  vendorName: "",
  gstin: "",
  pan: "",
  email: "",
  phoneNumber: "",
  address: "",
  address2: "",
  city: "",
  state: "",
  postCode: "",
  country: "",
  status: "ACTIVE",
  type: "",
});

interface VendorDetailsFormProps {
  mode: "create" | "edit";
  initialValues?: Partial<VendorFormValues> | null;
  vendorId?: string;
  loadingVendor?: boolean;
}

const VendorDetailsForm = ({
  mode,
  initialValues,
  vendorId,
  loadingVendor,
}: VendorDetailsFormProps) => {
  const navigate = useNavigate();
  const isEditMode = mode === "edit";
  const [submitting, setSubmitting] = useState(false);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  const defaultValues = useMemo(() => createDefaultValues(), []);
  const mergedInitialValues = useMemo(
    () => ({ ...defaultValues, ...(initialValues || {}) }),
    [defaultValues, initialValues]
  );

  const form = useForm<VendorFormValues>({
    resolver: zodResolver(vendorSchema),
    defaultValues: mergedInitialValues,
    mode: "onSubmit",
    reValidateMode: "onChange",
  });

  useEffect(() => {
    if (isEditMode && initialValues) {
      const values = { ...createDefaultValues(), ...initialValues };
      form.reset(values);
    }
  }, [form, initialValues, isEditMode]);

  const onSubmit = useCallback(
    async (values: VendorFormValues) => {
      if (isEditMode && !vendorId) {
        toast.error("Vendor ID not found");
        return;
      }

      setSubmitting(true);
      try {
        if (isEditMode) {
          if (!vendorId) {
            toast.error("Vendor ID not found");
            return;
          }

          const updatePayload: UpdateVendorPayload = {
            vendor_name: values.vendorName.trim(),
            vendor_code: values.vendorCode.trim(),
            gstin: values.gstin.trim(),
          };

          if (values.pan?.trim()) updatePayload.pan = values.pan.trim();
          if (values.phoneNumber?.trim()) updatePayload.phone_number = values.phoneNumber.trim();
          if (values.address?.trim()) updatePayload.address = values.address.trim();
          if (values.address2?.trim()) updatePayload.address2 = values.address2.trim();
          if (values.type?.trim()) updatePayload.vendor_type = values.type.trim();

          await vendorService.updateVendor(vendorId, updatePayload);
          toast.success("Vendor updated successfully");
          if (isMounted.current) {
            navigate("/flow/vendors");
          }
        } else {
          const createPayload: CreateVendorPayload = {
            vendor_name: values.vendorName.trim(),
            vendor_code: values.vendorCode.trim(),
            status: values.status,
            gstin: values.gstin.trim(),
          };

          if (values.pan?.trim()) createPayload.pan = values.pan.trim();
          if (values.phoneNumber?.trim()) createPayload.phone_number = values.phoneNumber.trim();
          if (values.email?.trim()) createPayload.email = values.email.trim();
          if (values.address?.trim()) createPayload.address = values.address.trim();
          if (values.address2?.trim()) createPayload.address2 = values.address2.trim();
          if (values.city?.trim()) createPayload.city = values.city.trim();
          if (values.state?.trim()) createPayload.state = values.state.trim();
          if (values.postCode?.trim()) createPayload.pincode = values.postCode.trim();
          if (values.country?.trim()) createPayload.country = values.country.trim();
          if (values.type?.trim()) createPayload.vendor_type = values.type.trim();

          await vendorService.createVendor(createPayload);
          toast.success("Vendor created successfully");
          if (isMounted.current) {
            form.reset(createDefaultValues());
            navigate("/flow/vendors");
          }
        }
      } catch (error: any) {
        const errorMessage = error?.response?.data?.message || (isEditMode ? "Failed to update vendor" : "Failed to create vendor");
        toast.error(errorMessage);
      } finally {
        if (isMounted.current) setSubmitting(false);
      }
    },
    [form, isEditMode, navigate, vendorId]
  );

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} id="vendor-details-form">
        <fieldset
          disabled={submitting || loadingVendor}
          className="space-y-4"
        >
            {loadingVendor && isEditMode && (
              <div className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200/60 rounded-lg text-blue-700 mb-3 text-xs">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span className="font-medium">Loading vendor details...</span>
              </div>
            )}

            {/* Basic Information Section */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 pb-2 border-b border-gray-200/80">
                <div className="p-1.5 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-md shadow-blue-500/20">
                  <Building2 className="h-4 w-4 text-white" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-gray-900">Basic Information</h2>
                  <p className="text-xs text-gray-500">Essential vendor details</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              <FormField
                control={form.control}
                name="vendorCode"
                render={({ field }) => (
                  <FormItem className="space-y-1.5">
                    <FormLabel className="text-xs font-semibold text-gray-700 flex items-center gap-1" aria-required={true}>
                      <Hash className="h-3 w-3 text-blue-600" />
                      Vendor Code <span className="text-red-500">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="VENCODE123"
                        required
                        className="h-9 text-sm transition-all border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 bg-white hover:border-gray-400"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="vendorName"
                render={({ field }) => (
                  <FormItem className="space-y-1.5">
                    <FormLabel className="text-xs font-semibold text-gray-700 flex items-center gap-1" aria-required={true}>
                      <Building2 className="h-3 w-3 text-blue-600" />
                      Vendor Name <span className="text-red-500">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Enter vendor name" 
                        className="h-9 text-sm transition-all border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 bg-white hover:border-gray-400" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="gstin"
                render={({ field }) => (
                  <FormItem className="space-y-1.5">
                    <FormLabel className="text-xs font-semibold text-gray-700 flex items-center gap-1" aria-required={true}>
                      <span className="w-3 h-3"></span>
                      GSTIN <span className="text-red-500">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="15 character GSTIN"
                        maxLength={15}
                        className="h-9 text-sm transition-all border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 bg-white hover:border-gray-400"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="pan"
                render={({ field }) => (
                  <FormItem className="space-y-1.5">
                    <FormLabel className="text-xs font-semibold text-gray-700">PAN</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="10 character PAN"
                        maxLength={10}
                        className="h-9 text-sm transition-all border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 bg-white hover:border-gray-400"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem className="space-y-1.5">
                    <FormLabel className="text-xs font-semibold text-gray-700" aria-required={true}>
                      STATUS <span className="text-red-500">*</span>
                    </FormLabel>
                    <Select
                      onValueChange={(val) => field.onChange(val || undefined)}
                      value={field.value || ""}
                    >
                      <FormControl>
                        <SelectTrigger className="h-9 text-sm transition-all border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 bg-white hover:border-gray-400" aria-required={true}>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {STATUS_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem className="space-y-1.5">
                    <FormLabel className="text-xs font-semibold text-gray-700 flex items-center gap-1">
                      <FileText className="h-3 w-3 text-blue-600" />
                      Type
                    </FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Enter type" 
                        className="h-9 text-sm transition-all border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 bg-white hover:border-gray-400" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />
            </div>
          </div>

          <Separator className="my-3 bg-gradient-to-r from-transparent via-gray-200 to-transparent" />

          {/* Contact Information Section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b border-gray-200/80">
              <div className="p-1.5 bg-gradient-to-br from-cyan-500 to-cyan-600 rounded-lg shadow-md shadow-cyan-500/20">
                <Phone className="h-4 w-4 text-white" />
              </div>
              <div>
                <h2 className="text-base font-bold text-gray-900">Contact Information</h2>
                <p className="text-xs text-gray-500">Communication details</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem className="space-y-1.5">
                    <FormLabel className="text-xs font-semibold text-gray-700 flex items-center gap-1">
                      <Mail className="h-3 w-3 text-cyan-600" />
                      Email
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="vendor@example.com"
                        className="h-9 text-sm transition-all border-gray-300 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 bg-white hover:border-gray-400"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phoneNumber"
                render={({ field }) => (
                  <FormItem className="space-y-1.5">
                    <FormLabel className="text-xs font-semibold text-gray-700 flex items-center gap-1">
                      <Phone className="h-3 w-3 text-cyan-600" />
                      Mobile Phone No.
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="tel"
                        placeholder="Enter mobile number"
                        className="h-9 text-sm transition-all border-gray-300 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 bg-white hover:border-gray-400"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />
            </div>
          </div>

          <Separator className="my-3 bg-gradient-to-r from-transparent via-gray-200 to-transparent" />

          {/* Address Information Section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b border-gray-200/80">
              <div className="p-1.5 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-lg shadow-md shadow-emerald-500/20">
                <MapPin className="h-4 w-4 text-white" />
              </div>
              <div>
                <h2 className="text-base font-bold text-gray-900">Address Information</h2>
                <p className="text-xs text-gray-500">Location details</p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3">
              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem className="space-y-1.5">
                    <FormLabel className="text-xs font-semibold text-gray-700 flex items-center gap-1">
                      <MapPin className="h-3 w-3 text-emerald-600" />
                      Address
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter address"
                        className="h-9 text-sm transition-all border-gray-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 bg-white hover:border-gray-400"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="address2"
                render={({ field }) => (
                  <FormItem className="space-y-1.5">
                    <FormLabel className="text-xs font-semibold text-gray-700">Address 2</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter address line 2"
                        className="h-9 text-sm transition-all border-gray-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 bg-white hover:border-gray-400"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              <FormField
                control={form.control}
                name="city"
                render={({ field }) => (
                  <FormItem className="space-y-1.5">
                    <FormLabel className="text-xs font-semibold text-gray-700">City</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="City" 
                        className="h-9 text-sm transition-all border-gray-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 bg-white hover:border-gray-400" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="state"
                render={({ field }) => (
                  <FormItem className="space-y-1.5">
                    <FormLabel className="text-xs font-semibold text-gray-700" aria-required={true}>
                      State <span className="text-red-500">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="State" 
                        className="h-9 text-sm transition-all border-gray-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 bg-white hover:border-gray-400" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="postCode"
                render={({ field }) => (
                  <FormItem className="space-y-1.5">
                    <FormLabel className="text-xs font-semibold text-gray-700">Post Code</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="6 digit post code"
                        maxLength={6}
                        className="h-9 text-sm transition-all border-gray-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 bg-white hover:border-gray-400"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="country"
                render={({ field }) => (
                  <FormItem className="space-y-1.5">
                    <FormLabel className="text-xs font-semibold text-gray-700">Country/Region</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Country" 
                        className="h-9 text-sm transition-all border-gray-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 bg-white hover:border-gray-400" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />
            </div>
          </div>
        </fieldset>

        <FormFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate("/flow/vendors")}
            className="px-5 h-9 text-sm border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400 transition-all font-medium"
            disabled={submitting}
          >
            Back
          </Button>
          <Button
            type="submit"
            form="vendor-details-form"
            className="min-w-[120px] h-9 text-sm bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-md hover:shadow-lg transition-all font-medium"
            disabled={submitting}
          >
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {isEditMode ? "Updating..." : "Creating..."}
              </>
            ) : isEditMode ? (
              "Update"
            ) : (
              "Create"
            )}
          </Button>
        </FormFooter>
      </form>
    </Form>
  );
};

export const VendorDetailsPage = () => {
  const { id: vendorId } = useParams<{ id?: string }>();
  const isCreateMode = vendorId === "new" || !vendorId;
  const isEditMode = Boolean(vendorId) && !isCreateMode;
  const [loadingVendor, setLoadingVendor] = useState(false);
  const [initialValues, setInitialValues] =
    useState<Partial<VendorFormValues> | null>(null);

  useEffect(() => {
    if (isCreateMode || !vendorId) {
      setInitialValues(null);
      return;
    }

    let cancelled = false;

    const loadVendorDetails = async () => {
      setLoadingVendor(true);
      try {
        if (!vendorId) {
          toast.error("Vendor ID not found");
          return;
        }

        const response = await vendorService.getVendorById(vendorId);
        const vendorData = response?.data?.[0];
        
        if (cancelled) return;

        if (vendorData) {
          setInitialValues({
            vendorCode: vendorData.vendor_code || "",
            vendorName: vendorData.vendor_name || "",
            gstin: vendorData.gstin || "",
            pan: vendorData.pan || "",
            email: vendorData.email || "",
            phoneNumber: vendorData.phone_number || "",
            address: vendorData.address || "",
            address2: vendorData.address2 || "",
            city: vendorData.city || "",
            state: vendorData.state || "",
            postCode: vendorData.pincode || "",
            country: vendorData.country || "",
            status: vendorData.status || "ACTIVE",
            type: vendorData.vendor_type || "",
          });
        } else {
          toast.error("Vendor not found");
          setInitialValues(null);
        }
      } catch (error: any) {
        if (!cancelled) {
          console.error("Failed to load vendor details:", error);
          toast.error(error?.response?.data?.message || "Failed to load vendor details");
        }
      } finally {
        if (!cancelled) setLoadingVendor(false);
      }
    };

    loadVendorDetails();

    return () => {
      cancelled = true;
    };
  }, [vendorId, isCreateMode]);

  const pageTitle = isEditMode ? "Update Vendor" : "Create Vendor";
  const isLoading = isEditMode && (loadingVendor || (vendorId && !initialValues));

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <div className="text-muted-foreground">Loading vendor details...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-0">
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-1">
          <div className="p-1.5 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-md shadow-blue-500/20">
            <Building2 className="h-4 w-4 text-white" />
          </div>
          <h1 className="text-xl font-bold text-gray-900">{pageTitle}</h1>
        </div>
        <p className="text-gray-500 ml-8 text-xs">
          {isEditMode ? "Update vendor information and details" : "Create a new vendor profile"}
        </p>
      </div>

      <VendorDetailsForm
        mode={isEditMode ? "edit" : "create"}
        initialValues={initialValues}
        vendorId={isEditMode ? vendorId : undefined}
        loadingVendor={loadingVendor}
      />
    </div>
  );
};

export default VendorDetailsPage;

