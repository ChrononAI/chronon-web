import * as z from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "../ui/input";
import { TripDateField } from "./TripDateField";
import { Label } from "../ui/label";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { useState } from "react";
import { tripService, TripType } from "@/services/tripService";
import { toast } from "sonner";
import { FormActionFooter } from "../layout/FormActionFooter";
import { format } from "date-fns";

const basicTripSchema = z.object({
  tripName: z.string().min(1, "Trip name is required"),
  fromDate: z.string().min(1, "From date is required"),
  toDate: z.string().min(1, "To date is required"),
  purpose: z.string().min(1, "Purpose is required"),
  advanceAmount: z.string().optional(),
  currency: z.string().optional(),
  department: z.string().optional(),
  projectCode: z.string().optional(),
  costCenter: z.string().optional(),
});

type BasicTripFormValues = z.infer<typeof basicTripSchema>;

interface CreateTripBasicFormProps {
  mode?: "create" | "view" | "edit";
  data?: TripType;
}

function CreateTripBasicForm({
  mode = "create",
}: CreateTripBasicFormProps) {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const [loading, setLoading] = useState(false);

  const today = format(new Date(), "yyyy-MM-dd");

  const [selectedCurrency, setSelectedCurrency] = useState<string>("INR");

  const form = useForm<BasicTripFormValues>({
    resolver: zodResolver(basicTripSchema),
    defaultValues: {
      tripName: "",
      fromDate: "",
      toDate: "",
      purpose: "",
      advanceAmount: "",
      currency: "INR",
      department: "",
      projectCode: "",
      costCenter: "",
    },
  });

  const onSubmit = async (formData: BasicTripFormValues) => {
    setLoading(true);
    try {
      const payload = {
        title: formData.tripName,
        purpose: formData.purpose,
        advance_amount: formData.advanceAmount ? parseFloat(formData.advanceAmount) : null,
        currency: formData.currency || "INR",
        start_date: formData.fromDate,
        end_date: formData.toDate,
        additional_info: {
          department: formData.department || null,
          project_code: formData.projectCode || null,
          cost_center: formData.costCenter || null,
        },
      };

      const response: any = await tripService.createTripRequest(payload);
      
      toast.success("Trip created successfully");
      const tripId = response?.data?.data?.id || response?.data?.id || response?.id;
      if (tripId) {
        if (pathname.includes("/approvals")) {
          navigate(`/approvals/pre-approvals/${tripId}`);
        } else {
          navigate(`/requests/pre-approvals/${tripId}`);
        }
      } else {
        navigate("/requests/trips");
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to create trip");
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    if (pathname.includes("/approvals")) {
      navigate("/approvals/trips");
    } else {
      navigate("/requests/trips");
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-white">
      <div className="bg-white border-b pl-4 pr-6 pt-4 pb-4 sticky top-0 z-10">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Create Trip Request</h1>
          <p className="text-sm text-gray-600">
            Fill in the basic trip details. You can add journey details later.
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto bg-white p-6">
        <div className="max-w-4xl">
          <Form {...form}>
            <form id="trip-basic-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <div className="space-y-4">
                <div>
                  <h2 className="font-medium text-[12px] leading-[100%] tracking-wider text-[#0D9C99] uppercase mb-2 text-left">
                    01. BASIC TRIP DETAILS
                  </h2>
                  <div className="h-[1px] bg-gray-200 mb-8"></div>
                </div>
                <div className="grid grid-cols-1 gap-6">
                  <div>
                    <FormField
                      control={form.control}
                      name="tripName"
                      render={({ field }) => (
                        <FormItem>
                          <Label
                            htmlFor="trip-name"
                            className="block mb-1.5 whitespace-nowrap"
                            style={{
                              fontFamily: "Inter",
                              fontSize: "12px",
                              fontWeight: 700,
                              lineHeight: "100%",
                              letterSpacing: "0%",
                              color: "#47536C",
                            }}
                          >
                            TRIP NAME
                          </Label>
                          <FormControl>
                            <Input
                              id="trip-name"
                              {...field}
                              placeholder="e.g. Europe Business Tour"
                              disabled={mode !== "create"}
                              className="h-[40px] border-0 border-b border-gray-300 rounded-none px-0 pt-2 pb-1 text-sm bg-transparent focus:outline-none focus:ring-0 focus:border-0 focus:border-b-2 focus:border-[#0D9C99] focus-visible:outline-none focus-visible:ring-0 focus-visible:border-0 focus-visible:border-b-2 focus-visible:border-[#0D9C99] shadow-none"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <FormField
                        control={form.control}
                        name="fromDate"
                        render={({ field }) => (
                          <FormItem>
                            <Label
                              htmlFor="from-date"
                              className="block mb-1.5"
                              style={{
                                fontFamily: "Inter",
                                fontSize: "12px",
                                fontWeight: 700,
                                lineHeight: "100%",
                                letterSpacing: "0%",
                                color: "#47536C",
                              }}
                            >
                              FROM DATE
                            </Label>
                            <FormControl>
                              <TripDateField
                                id="from-date"
                                value={field.value}
                                onChange={(value) => field.onChange(value)}
                                disabled={mode !== "create"}
                                minDate={today}
                                className="h-[40px] border-0 border-b border-gray-300 rounded-none pr-0 pt-2 pb-1 bg-transparent focus:outline-none focus:ring-0 focus:border-0 focus:border-b-2 focus:border-[#0D9C99] focus-visible:outline-none focus-visible:ring-0 focus-visible:border-0 focus-visible:border-b-2 focus-visible:border-[#0D9C99] shadow-none [&_input]:pr-10 [&_input]:pl-0 [&_input]:focus:border-0 [&_input]:focus:border-b-2 [&_input]:focus:border-[#0D9C99] [&_input]:focus-visible:outline-none [&_input]:focus-visible:ring-0 [&_input]:focus-visible:border-0 [&_input]:focus-visible:border-b-2 [&_input]:focus-visible:border-[#0D9C99]"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <div>
                      <FormField
                        control={form.control}
                        name="toDate"
                        render={({ field }) => (
                          <FormItem>
                            <Label
                              htmlFor="to-date"
                              className="block mb-1.5"
                              style={{
                                fontFamily: "Inter",
                                fontSize: "12px",
                                fontWeight: 700,
                                lineHeight: "100%",
                                letterSpacing: "0%",
                                color: "#47536C",
                              }}
                            >
                              TO DATE
                            </Label>
                            <FormControl>
                              <TripDateField
                                id="to-date"
                                value={field.value}
                                onChange={(value) => field.onChange(value)}
                                disabled={mode !== "create"}
                                minDate={form.watch("fromDate") || today}
                                className="h-[40px] border-0 border-b border-gray-300 rounded-none pr-0 pt-2 pb-1 bg-transparent focus:outline-none focus:ring-0 focus:border-0 focus:border-b-2 focus:border-[#0D9C99] focus-visible:outline-none focus-visible:ring-0 focus-visible:border-0 focus-visible:border-b-2 focus-visible:border-[#0D9C99] shadow-none [&_input]:pr-10 [&_input]:pl-0 [&_input]:focus:border-0 [&_input]:focus:border-b-2 [&_input]:focus:border-[#0D9C99] [&_input]:focus-visible:outline-none [&_input]:focus-visible:ring-0 [&_input]:focus-visible:border-0 [&_input]:focus-visible:border-b-2 [&_input]:focus-visible:border-[#0D9C99]"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <FormField
                        control={form.control}
                        name="advanceAmount"
                        render={({ field }) => (
                          <FormItem>
                            <Label
                              htmlFor="advance-amount"
                              className="block mb-1.5"
                              style={{
                                fontFamily: "Inter",
                                fontSize: "12px",
                                fontWeight: 700,
                                lineHeight: "100%",
                                letterSpacing: "0%",
                                color: "#47536C",
                              }}
                            >
                              ADVANCE AMOUNT
                            </Label>
                            <FormControl>
                              <div className="relative">
                                <span className="absolute left-0 top-[calc(50%+1px)] transform -translate-y-1/2 text-sm text-gray-700 z-0 pointer-events-none">
                                  {selectedCurrency === "INR" ? "₹" : selectedCurrency === "USD" ? "$" : selectedCurrency === "EUR" ? "€" : selectedCurrency}
                                </span>
                                <Input
                                  id="advance-amount"
                                  placeholder="0.00"
                                  className="h-[40px] pl-5 pr-0 border-0 border-b border-gray-300 rounded-none pt-2 pb-1 text-sm bg-transparent focus:outline-none focus:ring-0 focus:border-0 focus:border-b-2 focus:border-[#0D9C99] focus-visible:outline-none focus-visible:ring-0 focus-visible:border-0 focus-visible:border-b-2 focus-visible:border-[#0D9C99] shadow-none"
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  {...field}
                                  disabled={mode !== "create"}
                                />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <div>
                      <FormField
                        control={form.control}
                        name="currency"
                        render={({ field }) => (
                          <FormItem>
                            <Label
                              htmlFor="currency"
                              className="block mb-1.5"
                              style={{
                                fontFamily: "Inter",
                                fontSize: "12px",
                                fontWeight: 700,
                                lineHeight: "100%",
                                letterSpacing: "0%",
                                color: "#47536C",
                              }}
                            >
                              CURRENCY
                            </Label>
                            <FormControl>
                              <Select
                                onValueChange={(val) => {
                                  field.onChange(val);
                                  setSelectedCurrency(val);
                                }}
                                value={field.value}
                                disabled={mode !== "create"}
                              >
                                <SelectTrigger
                                  className="h-[40px] border-0 border-b border-gray-300 rounded-none px-0 pt-2 pb-1 bg-transparent focus:outline-none focus:ring-0 focus:ring-offset-0 focus:border-0 focus:border-b-2 focus:border-[#0D9C99] focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-0 focus-visible:border-b-2 focus-visible:border-[#0D9C99] shadow-none"
                                >
                                  <SelectValue placeholder="Select currency" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="INR">INR - Indian Rupee</SelectItem>
                                  <SelectItem value="USD">USD - US Dollar</SelectItem>
                                  <SelectItem value="EUR">EUR - Euro</SelectItem>
                                </SelectContent>
                              </Select>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                  <div>
                    <FormField
                      control={form.control}
                      name="purpose"
                      render={({ field }) => (
                        <FormItem>
                          <Label
                            htmlFor="purpose"
                            className="block mb-1.5"
                            style={{
                              fontFamily: "Inter",
                              fontSize: "12px",
                              fontWeight: 700,
                              lineHeight: "100%",
                              letterSpacing: "0%",
                              color: "#47536C",
                            }}
                          >
                            PURPOSE OF TRIP
                          </Label>
                          <FormControl>
                            <textarea
                              id="purpose"
                              {...field}
                              placeholder="Provide a detailed business justification..."
                              disabled={mode !== "create"}
                              className="w-full border-0 border-b border-gray-300 rounded-none px-0 pt-2 pb-1 text-sm bg-transparent focus:outline-none focus:ring-0 focus:border-0 focus:border-b-2 focus:border-[#0D9C99] focus-visible:outline-none focus-visible:ring-0 focus-visible:border-0 focus-visible:border-b-2 focus-visible:border-[#0D9C99] shadow-none resize-none"
                              style={{
                                minHeight: '40px',
                                paddingTop: '0.5rem',
                                paddingBottom: '0.25rem',
                                lineHeight: '1.25rem',
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4 pt-6">
                <div>
                  <h2 className="font-medium text-[12px] leading-[100%] tracking-wider text-[#0D9C99] uppercase mb-2 text-left">
                    02. COST ATTRIBUTION
                  </h2>
                  <div className="h-[1px] bg-gray-200 mb-8"></div>
                </div>
                <div className="grid grid-cols-3 gap-6">
                  <div>
                    <FormField
                      control={form.control}
                      name="department"
                      render={({ field }) => (
                        <FormItem>
                          <Label
                            htmlFor="department"
                            className="block mb-1.5"
                            style={{
                              fontFamily: "Inter",
                              fontSize: "12px",
                              fontWeight: 700,
                              lineHeight: "100%",
                              letterSpacing: "0%",
                              color: "#47536C",
                            }}
                          >
                            DEPARTMENT
                          </Label>
                          <FormControl>
                            <Select
                              value={field.value}
                              onValueChange={field.onChange}
                              disabled={mode !== "create"}
                            >
                              <SelectTrigger
                                className="h-[40px] border-0 border-b border-gray-300 rounded-none px-0 pt-2 pb-1 bg-transparent focus:outline-none focus:ring-0 focus:ring-offset-0 focus:border-0 focus:border-b-2 focus:border-[#0D9C99] focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-0 focus-visible:border-b-2 focus-visible:border-[#0D9C99] shadow-none"
                              >
                                <SelectValue placeholder="Select department" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="sales">Sales</SelectItem>
                                <SelectItem value="engineering">Engineering</SelectItem>
                                <SelectItem value="marketing">Marketing</SelectItem>
                                <SelectItem value="hr">Human Resources</SelectItem>
                              </SelectContent>
                            </Select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div>
                    <FormField
                      control={form.control}
                      name="projectCode"
                      render={({ field }) => (
                        <FormItem>
                          <Label
                            htmlFor="project-code"
                            className="block mb-1.5"
                            style={{
                              fontFamily: "Inter",
                              fontSize: "12px",
                              fontWeight: 700,
                              lineHeight: "100%",
                              letterSpacing: "0%",
                              color: "#47536C",
                            }}
                          >
                            PROJECT CODE
                          </Label>
                          <FormControl>
                            <Input
                              id="project-code"
                              {...field}
                              placeholder="e.g. PRJ-2024-001"
                              disabled={mode !== "create"}
                              className="h-[40px] border-0 border-b border-gray-300 rounded-none px-0 pt-2 pb-1 text-sm bg-transparent focus:outline-none focus:ring-0 focus:border-0 focus:border-b-2 focus:border-[#0D9C99] focus-visible:outline-none focus-visible:ring-0 focus-visible:border-0 focus-visible:border-b-2 focus-visible:border-[#0D9C99] shadow-none"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div>
                    <FormField
                      control={form.control}
                      name="costCenter"
                      render={({ field }) => (
                        <FormItem>
                          <Label
                            htmlFor="cost-center"
                            className="block mb-1.5"
                            style={{
                              fontFamily: "Inter",
                              fontSize: "12px",
                              fontWeight: 700,
                              lineHeight: "100%",
                              letterSpacing: "0%",
                              color: "#47536C",
                            }}
                          >
                            COST CENTER
                          </Label>
                          <FormControl>
                            <Input
                              id="cost-center"
                              {...field}
                              placeholder="e.g. CC-GLOBAL-500"
                              disabled={mode !== "create"}
                              className="h-[40px] border-0 border-b border-gray-300 rounded-none px-0 pt-2 pb-1 text-sm bg-transparent focus:outline-none focus:ring-0 focus:border-0 focus:border-b-2 focus:border-[#0D9C99] focus-visible:outline-none focus-visible:ring-0 focus-visible:border-0 focus-visible:border-b-2 focus-visible:border-[#0D9C99] shadow-none"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              </div>
            </form>
          </Form>
        </div>
      </div>

      {mode !== "view" && (
        <FormActionFooter
          secondaryButton={{
            label: "Cancel",
            onClick: handleBack,
          }}
          primaryButton={{
            label: "Create Trip",
            onClick: () => {
              const formElement = document.getElementById("trip-basic-form") as HTMLFormElement;
              if (formElement) {
                formElement.requestSubmit();
              }
            },
            disabled: loading,
            loading: loading,
            loadingText: "Creating...",
          }}
        />
      )}
    </div>
  );
}

export default CreateTripBasicForm;
