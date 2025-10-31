import * as z from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "../ui/input";
import { Card, CardContent } from "../ui/card";
import { Switch } from "../ui/switch";
import { Button } from "../ui/button";
import { DateField } from "../ui/date-field";
import { ArrowLeft } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { useEffect, useState } from "react";
import { Policy } from "@/types/expense";
import { expenseService } from "@/services/expenseService";
import { preApprovalService, PreApprovalType } from "@/services/preApprovalService";
import { toast } from "sonner";

// Form schema
const preApprovalSchema = z.object({
  title: z.string().min(1, "Title is required"),
  start_date: z.string().min(1, "From date is required"),
  end_date: z.string().min(1, "To date is required"),
  policy_id: z.string().min(1, "Policy is required"),
  description: z.string().min(1, 'Purpose is required'),
  flightRequired: z.boolean(),
  hotelRequired: z.boolean()
  // amount: z.string().min(1, "Amount is required"),
});

type PreApprovalFormValues = z.infer<typeof preApprovalSchema>;

interface CreatePreApprovalFormProps {
  mode?: 'create' | 'view' | 'edit';
  data?: PreApprovalType;
  showHeader?: boolean;
}

function CreatePreApprovalForm({ mode = "create", showHeader = true }: CreatePreApprovalFormProps) {
  const navigate = useNavigate();

  const { id } = useParams<{ id: string }>();

  const [policies, setPolicies] = useState<Policy[]>([]);
  const [selectedPolicy, setSelectedPolicy] = useState<Policy | null>(null);

  const today = new Date().toISOString().split('T')[0];

  const loadPoliciesWithCategories = async () => {
    try {
      const policiesData = await expenseService.getAllPoliciesWithCategories();
      const expensePolicies = policiesData.filter((pol) => {
        if (pol.name !== 'Mileage' && pol.name !== 'Per Diem') {
          return pol;
        }
      })
      setPolicies(expensePolicies);
    } catch (error) {
      console.error("Error loading policies:", error);
    }
  };

  const form = useForm<PreApprovalFormValues>({
    resolver: zodResolver(preApprovalSchema),
    defaultValues: {
      policy_id: "",
      title: "",
      start_date: "",
      end_date: "",
      description: "",
      flightRequired: false,
      hotelRequired: false
      // amount: "",
    },
  });

  const onSubmit = async (formData: PreApprovalFormValues) => {
    const { hotelRequired, flightRequired, ...rest } = formData;
    try {
      const response: any = await preApprovalService.createPreApproval(rest);
      const submit = await preApprovalService.submitPreApproval(response.data.data.id);
      console.log('submit response', submit)
      toast.success('Pre approval created successfully');
      setTimeout(() => {
        navigate('/pre-approvals')
      }, 200)
    } catch (error) {
      console.log(error);
    }
  };

  const getPreApprovalById = async (id: string) => {
    try {
      const res: any = await preApprovalService.getPreApprovalById(id);
      form.reset(res.data.data[0]);
      const selectedPol = policies.find((pol) => pol.id === res.data.data[0].policy_id);
      if (selectedPol) setSelectedPolicy(selectedPol);
    } catch (error) {
      console.log(error);
    }
  }

  useEffect(() => {
    if (id && policies.length > 0) {
      getPreApprovalById(id);
    };
  }, [id, policies]);

  useEffect(() => {
    loadPoliciesWithCategories()
  }, []);

  return (
    <div className="space-y-6 max-w-4xl">
      {showHeader && <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-bold">
          {mode === "create" ? "Create Pre Approval" : mode === "edit" ? "Edit Pre Approval" : "Pre Approval Details"}
        </h1>
      </div>}
      <Card>
        <CardContent className="p-6">
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="space-y-6"
            >
              <div>
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Title
                      </FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="Title"
                          // readOnly={readOnly}
                          disabled={mode === "view"}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="start_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        From
                      </FormLabel>
                      <FormControl>
                        <DateField
                          id="from"
                          value={field.value}
                          onChange={(value) => {
                            field.onChange(value);
                          }}
                          disabled={mode === "view"}
                          minDate={today}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="end_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        To
                      </FormLabel>
                      <FormControl>
                        <DateField
                          id="to"
                          value={field.value}
                          onChange={(value) => {
                            // handleInputChange("expenseDate", value);
                            field.onChange(value);
                          }}
                          disabled={mode === "view"}
                          minDate={today}
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
                  name="policy_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Policy
                      </FormLabel>
                      <FormControl>
                        <Select
                          value={field.value}
                          onValueChange={(value) => {
                            field.onChange(value);
                            const policy = policies.find(
                              (p) => p.id === value
                            );
                            setSelectedPolicy(policy || null);
                          }}
                          disabled={mode === "view"}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a policy">
                                {field.value && selectedPolicy
                                  ? selectedPolicy.name
                                  : "Select a policy"}
                              </SelectValue>
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {policies.map((policy) => (
                              <SelectItem key={policy.id} value={policy.id}>
                                <div>
                                  <div className="font-medium">
                                    {policy.name}
                                  </div>
                                  {policy.description && (
                                    <div className="text-sm text-muted-foreground">
                                      {policy.description}
                                    </div>
                                  )}
                                </div>
                              </SelectItem>
                            ))}
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
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Purpose
                      </FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="Purpose"
                          disabled={mode === 'view'}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="flightRequired"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Flight Required
                      </FormLabel>
                      <FormControl>
                        <div>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            disabled={mode === 'view'}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="hotelRequired"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Hotel Required
                      </FormLabel>
                      <FormControl>
                        <div>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            disabled={mode === 'view'}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              {/* TO BE INTEGRATED LATER */}
              {/* <div>
                <FormField
                  control={form.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Amount
                      </FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="Amount"
                          type="number"
                          disabled={mode === 'view'}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div> */}
              <div className="flex justify-end gap-2 pt-4">
                {mode === "edit" && <Button
                  type="button"
                  variant="outline"
                  // onClick={onCancel}
                  className="px-6 py-2"
                >
                  Cancel
                </Button>}
                {mode !== "view" && <Button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2"
                >
                  {mode === "create" ? "Create" : "Update"}
                </Button>}
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  )
}

export default CreatePreApprovalForm