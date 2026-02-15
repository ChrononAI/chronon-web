import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useNavigate, useParams } from "react-router-dom";
import { vendorService, CreateVendorPayload, UpdateVendorPayload } from "@/services/vendorService";
import { FormActionFooter } from "@/components/layout/FormActionFooter";

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
  type: z.string().trim().optional(),
});

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
          if (values.address?.trim()) updatePayload.address_line1 = values.address.trim();
          if (values.address2?.trim()) updatePayload.address_line2 = values.address2.trim();
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
            is_active: true,
            gstin: values.gstin.trim(),
          };

          if (values.pan?.trim()) createPayload.pan = values.pan.trim();
          if (values.phoneNumber?.trim()) createPayload.phone_number = values.phoneNumber.trim();
          if (values.email?.trim()) createPayload.email = values.email.trim();
          if (values.address?.trim()) createPayload.address_line1 = values.address.trim();
          if (values.address2?.trim()) createPayload.address_line2 = values.address2.trim();
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
          className="space-y-2 pb-24"
        >
            {loadingVendor && isEditMode && (
              <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 border border-gray-200 rounded text-gray-700 text-sm">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Loading vendor details...</span>
              </div>
            )}

            {/* Basic Information Section */}
            <div className="space-y-1.5">
              <h2 className="w-full max-w-[392px] h-[17px] text-sm font-semibold leading-none tracking-normal" style={{ fontFamily: 'Inter', fontSize: '14px', lineHeight: '100%', letterSpacing: '0%', color: '#47536C', fontWeight: 600 }}>
                Basic Information
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <FormField
                  control={form.control}
                  name="vendorCode"
                  render={({ field }) => (
                    <FormItem className="space-y-[4px] w-full max-w-[653px] min-h-[73px]">
                      <FormLabel className="h-[15px]" style={{ fontFamily: 'Inter', fontSize: '12px', fontWeight: 400, lineHeight: '100%', letterSpacing: '0%', color: '#47536C' }}>
                        Vendor Code <span className="text-red-500">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter vendor code"
                          className="h-[33px] border-[0.7px] border-[#E9EAEE] rounded-[4px] py-2 px-3"
                          style={{ borderWidth: '0.7px' }}
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
                    <FormItem className="space-y-[4px] w-full max-w-[653px] min-h-[73px]">
                      <FormLabel className="h-[15px]" style={{ fontFamily: 'Inter', fontSize: '12px', fontWeight: 400, lineHeight: '100%', letterSpacing: '0%', color: '#47536C' }}>
                        Vendor Name <span className="text-red-500">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Enter vendor name" 
                          className="h-[33px] border-[0.7px] border-[#E9EAEE] rounded-[4px] py-2 px-3"
                          style={{ borderWidth: '0.7px' }}
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
                    <FormItem className="space-y-[4px] w-full max-w-[653px] min-h-[73px]">
                      <FormLabel className="h-[15px]" style={{ fontFamily: 'Inter', fontSize: '12px', fontWeight: 400, lineHeight: '100%', letterSpacing: '0%', color: '#47536C' }}>
                        GSTIN <span className="text-red-500">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter GSTIN"
                          maxLength={15}
                          className="h-[33px] border-[0.7px] border-[#E9EAEE] rounded-[4px] py-2 px-3"
                          style={{ borderWidth: '0.7px' }}
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
                    <FormItem className="space-y-[4px] w-full max-w-[653px] min-h-[73px]">
                      <FormLabel className="h-[15px]" style={{ fontFamily: 'Inter', fontSize: '12px', fontWeight: 400, lineHeight: '100%', letterSpacing: '0%', color: '#47536C' }}>PAN</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter PAN"
                          maxLength={10}
                          className="h-[33px] border-[0.7px] border-[#E9EAEE] rounded-[4px] py-2 px-3"
                          style={{ borderWidth: '0.7px' }}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem className="space-y-[4px] w-full max-w-[653px] min-h-[73px]">
                      <FormLabel className="h-[15px]" style={{ fontFamily: 'Inter', fontSize: '12px', fontWeight: 400, lineHeight: '100%', letterSpacing: '0%', color: '#47536C' }}>Type</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Enter type" 
                          className="h-[33px] border-[0.7px] border-[#E9EAEE] rounded-[4px] py-2 px-3"
                          style={{ borderWidth: '0.7px' }}
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Contact Information Section */}
            <div className="space-y-1.5">
              <h2 className="w-full max-w-[392px] h-[17px] text-sm font-semibold leading-none tracking-normal" style={{ fontFamily: 'Inter', fontSize: '14px', lineHeight: '100%', letterSpacing: '0%', color: '#47536C', fontWeight: 600 }}>
                Contact Information
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem className="space-y-[4px] w-full max-w-[653px] min-h-[73px]">
                      <FormLabel className="h-[15px]" style={{ fontFamily: 'Inter', fontSize: '12px', fontWeight: 400, lineHeight: '100%', letterSpacing: '0%', color: '#47536C' }}>Email</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="Enter email"
                          className="h-[33px] border-[0.7px] border-[#E9EAEE] rounded-[4px] py-2 px-3"
                          style={{ borderWidth: '0.7px' }}
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
                    <FormItem className="space-y-[4px] w-full max-w-[653px] min-h-[73px]">
                      <FormLabel className="h-[15px]" style={{ fontFamily: 'Inter', fontSize: '12px', fontWeight: 400, lineHeight: '100%', letterSpacing: '0%', color: '#47536C' }}>Phone Number</FormLabel>
                      <FormControl>
                        <Input
                          type="tel"
                          placeholder="Enter phone number"
                          className="h-[33px] border-[0.7px] border-[#E9EAEE] rounded-[4px] py-2 px-3"
                          style={{ borderWidth: '0.7px' }}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Address Information Section */}
            <div className="space-y-1.5">
              <h2 className="w-full max-w-[392px] h-[17px] text-sm font-semibold leading-none tracking-normal" style={{ fontFamily: 'Inter', fontSize: '14px', lineHeight: '100%', letterSpacing: '0%', color: '#47536C', fontWeight: 600 }}>
                Address Information
              </h2>
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem className="space-y-[4px] w-full max-w-[653px] min-h-[73px]">
                      <FormLabel className="h-[15px]" style={{ fontFamily: 'Inter', fontSize: '12px', fontWeight: 400, lineHeight: '100%', letterSpacing: '0%', color: '#47536C' }}>Address</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter address"
                          className="h-[33px] border-[0.7px] border-[#E9EAEE] rounded-[4px] py-2 px-3"
                          style={{ borderWidth: '0.7px' }}
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
                    <FormItem className="space-y-[4px] w-full max-w-[653px] min-h-[73px]">
                      <FormLabel className="h-[15px]" style={{ fontFamily: 'Inter', fontSize: '12px', fontWeight: 400, lineHeight: '100%', letterSpacing: '0%', color: '#47536C' }}>Address 2</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter address line 2"
                          className="h-[33px] border-[0.7px] border-[#E9EAEE] rounded-[4px] py-2 px-3"
                          style={{ borderWidth: '0.7px' }}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                  <FormField
                    control={form.control}
                    name="city"
                    render={({ field }) => (
                      <FormItem className="space-y-[4px] w-full max-w-[653px] min-h-[73px]">
                        <FormLabel className="h-[15px]" style={{ fontFamily: 'Inter', fontSize: '12px', fontWeight: 400, lineHeight: '100%', letterSpacing: '0%', color: '#47536C' }}>City</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Enter city" 
                            className="h-[33px] border-[0.7px] border-[#E9EAEE] rounded-[4px] py-2 px-3"
                            style={{ borderWidth: '0.7px' }}
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
                      <FormItem className="space-y-[4px] w-full max-w-[653px] min-h-[73px]">
                        <FormLabel className="h-[15px]" style={{ fontFamily: 'Inter', fontSize: '12px', fontWeight: 400, lineHeight: '100%', letterSpacing: '0%', color: '#47536C' }}>
                          State <span className="text-red-500">*</span>
                        </FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Enter state" 
                            className="h-[33px] border-[0.7px] border-[#E9EAEE] rounded-[4px] py-2 px-3"
                            style={{ borderWidth: '0.7px' }}
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
                      <FormItem className="space-y-[4px] w-full max-w-[653px] min-h-[73px]">
                        <FormLabel className="h-[15px]" style={{ fontFamily: 'Inter', fontSize: '12px', fontWeight: 400, lineHeight: '100%', letterSpacing: '0%', color: '#47536C' }}>Post Code</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Enter post code"
                            maxLength={6}
                            className="h-[33px] border-[0.7px] border-[#E9EAEE] rounded-[4px] py-2 px-3"
                            style={{ borderWidth: '0.7px' }}
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
                      <FormItem className="space-y-[4px] w-full max-w-[653px] min-h-[73px]">
                        <FormLabel className="h-[15px]" style={{ fontFamily: 'Inter', fontSize: '12px', fontWeight: 400, lineHeight: '100%', letterSpacing: '0%', color: '#47536C' }}>Country</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Enter country" 
                            className="h-[33px] border-[0.7px] border-[#E9EAEE] rounded-[4px] py-2 px-3"
                            style={{ borderWidth: '0.7px' }}
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage className="text-xs" />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            </div>
        </fieldset>

        <FormActionFooter
          secondaryButton={{
            label: "Cancel",
            onClick: () => navigate("/flow/vendors"),
            disabled: submitting,
          }}
          primaryButton={{
            label: isEditMode ? "Update" : "Create",
            type: "submit",
            form: "vendor-details-form",
            onClick: () => {},
            disabled: submitting,
            loading: submitting,
            loadingText: isEditMode ? "Updating..." : "Creating...",
          }}
        />
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
            address: vendorData.address_line1 || "",
            address2: vendorData.address_line2 || "",
            city: vendorData.city || "",
            state: vendorData.state || "",
            postCode: vendorData.pincode || "",
            country: vendorData.country || "",
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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{pageTitle}</h1>
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

