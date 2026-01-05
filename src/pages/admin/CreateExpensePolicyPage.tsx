import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { PolicyCategory } from "@/types/expense";
import { categoryService } from "@/services/admin/categoryService";
import { toast } from "sonner";
import {
  CreatePolicyPayload,
  policyService,
} from "@/services/admin/policyService";
import { FormFooter } from "@/components/layout/FormFooter";
import SearchableMultiSelect from "@/components/admin/SearchableMultiSelect";
import { AttributeValueField } from "./CreateRulePage";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Entity, getEntities } from "@/services/admin/entities";
import { z } from "zod";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

interface RuleCondition {
  id: string;
  field: string;
  value: string;
}
export interface CreatePolicyForm {
  name: string;
  description: string;
  is_pre_approval_required: boolean;
  policy_assignment_rules?: RuleCondition[];
  assign_to_all?: boolean;
}

const RuleConditionSchema = z.object({
  id: z.string(),
  field: z.string().min(1, "Field is required"),
  value: z.string().min(1, "Value is required"),
});

const CreatePolicySchema = z
  .object({
    name: z.string().min(1, "Name is required"),
    description: z.string().min(1, "Description is required"),
    is_pre_approval_required: z.boolean(),
    category_ids: z.array(z.string()).min(1, "Select at least one category"),

    assignmentMode: z.enum(["ALL", "CUSTOM"]),

    assign_to_all: z.boolean().optional(),
    policy_assignment_rules: z.array(RuleConditionSchema).optional(),
  })
  .superRefine((data, ctx) => {
    const rules = data.policy_assignment_rules;

    if (data.assignmentMode === "CUSTOM") {
      if (!Array.isArray(rules) || rules.length === 0) {
        ctx.addIssue({
          path: ["policy_assignment_rules"],
          message: "At least one rule is required for custom assignment",
          code: z.ZodIssueCode.custom,
        });
        return;
      }

      rules.forEach((rule, index) => {
        if (!rule.field) {
          ctx.addIssue({
            path: ["policy_assignment_rules", index, "field"],
            message: "Field is required",
            code: z.ZodIssueCode.custom,
          });
        }

        if (!rule.value) {
          ctx.addIssue({
            path: ["policy_assignment_rules", index, "value"],
            message: "Value is required",
            code: z.ZodIssueCode.custom,
          });
        }
      });
    }
  });

type CreatePolicyFormValues = z.infer<typeof CreatePolicySchema>;

function CreateExpensePolicyPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const row = location.state;
  const mode = row ? "edit" : "create";
  const [categories, setCategories] = useState<PolicyCategory[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [entities, setEntities] = useState<Entity[]>([]);
  const [entitiesLoading, setEntitiesLoading] = useState(false);

  const form = useForm<CreatePolicyFormValues>({
    resolver: zodResolver(CreatePolicySchema),
    defaultValues: {
      name: "",
      description: "",
      is_pre_approval_required: false,
      category_ids: [],
      assignmentMode: "ALL",
      policy_assignment_rules: [],
    },
  });

  const {
    register,
    control,
    watch,
    setValue,
    formState,
    handleSubmit,
    formState: { errors },
  } = form;

  const assignmentMode = useWatch({
    control: form.control,
    name: "assignmentMode",
  });
  const selectedCategories = watch("category_ids");

  const {
    fields: rules,
    append,
    remove,
    update,
  } = useFieldArray({
    control,
    name: "policy_assignment_rules",
  });

  const toggleCategory = (id: string) => {
    const current = watch("category_ids") ?? [];

    const next = current.includes(id)
      ? current.filter((c) => c !== id)
      : [...current, id];

    setValue("category_ids", next, { shouldValidate: true });
  };

  const updateRule = (index: number, patch: Partial<RuleCondition>) => {
    update(index, {
      ...rules[index],
      ...patch,
    });
  };

  const addRule = () => {
    append({
      id: crypto.randomUUID(),
      field: "",
      value: "",
    });
  };

  const removeRule = (index: number) => {
    remove(index);
  };

  const getAllCategories = async () => {
    try {
      const res = await categoryService.getAllCategories();
      setCategories(res.data.data);
    } catch (error: any) {
      console.log(error);
      toast.error(
        error?.response?.data?.message ||
          error.message ||
          "Failed to get categories"
      );
    }
  };

  const fetchEntities = useCallback(async () => {
    if (entities.length > 0 || entitiesLoading) return;

    setEntitiesLoading(true);
    try {
      const entitiesData = await getEntities();
      setEntities(entitiesData);
    } catch (error) {
      console.error("Error fetching entities:", error);
      toast.error("Failed to fetch entities");
    } finally {
      setEntitiesLoading(false);
    }
  }, []);

  const createPolicy = async (payload: CreatePolicyPayload) => {
    setLoading(true);
    try {
      await policyService.createPolicy(payload);
      toast.success("Policy created successfully");
      setTimeout(() => {
        navigate("/admin-settings/product-config/expense-policies");
      }, 100);
    } catch (error: any) {
      console.log(error);
      toast.error(
        error?.response?.data.message ||
          error.message ||
          "Failed to create policy"
      );
    } finally {
      setLoading(false);
    }
  };

  const filteredCategories = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return categories;

    return categories.filter((c) => c.name.toLowerCase().includes(q));
  }, [categories, searchTerm]);

  const handleSelectAllFiltered = () => {
    const ids = filteredCategories.map((c) => c.id);
    const current = watch("category_ids") ?? [];

    setValue("category_ids", Array.from(new Set([...current, ...ids])), {
      shouldValidate: true,
    });
  };

  const handleDeselectAllFiltered = () => {
    const filteredIds = new Set(filteredCategories.map((c) => c.id));
    const current = watch("category_ids") ?? [];

    setValue(
      "category_ids",
      current.filter((id) => !filteredIds.has(id)),
      { shouldValidate: true }
    );
  };

  const onSubmit = (data: CreatePolicyFormValues) => {
    const payload: any = {
      name: data.name,
      description: data.description,
      is_pre_approval_required: data.is_pre_approval_required,
      category_ids: data.category_ids,
    };

    if (data.assignmentMode === "ALL") {
      payload.assign_to_all = true;
    }

    if (data.assignmentMode === "CUSTOM") {
      const newRules = data.policy_assignment_rules?.map((rule) => {
        return { field: rule.field, value: rule.value };
      });
      payload.policy_assignment_rules = newRules;
    }
    createPolicy(payload);
  };

  const renderEntitySelect = useCallback(
    (
      value: string,
      onValueChange: (value: string) => void,
      placeholder: string
    ) => {
      const selectedEntityObj = entities.find((e) => e.id === value);
      return (
        <Select
          value={value}
          onValueChange={(val) => {
            onValueChange(val);
          }}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder={placeholder}>
              {value && selectedEntityObj
                ? selectedEntityObj.display_name || selectedEntityObj.name
                : placeholder}
            </SelectValue>
          </SelectTrigger>

          <SelectContent>
            {entitiesLoading ? (
              <div className="flex items-center justify-center p-2">
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
            ) : entities.length > 0 ? (
              entities.map((entity) => (
                <SelectItem key={entity.id} value={entity.id}>
                  {entity.display_name || entity.name}
                </SelectItem>
              ))
            ) : (
              <SelectItem value="no-entities" disabled>
                No entities found
              </SelectItem>
            )}
          </SelectContent>
        </Select>
      );
    },
    [entities, entitiesLoading]
  );

  const renderAttributeSelect = useCallback(
    (
      entityId: string,
      value: string,
      onValueChange: (value: string) => void,
      placeholder: string
    ) => {
      const selectedEntity = entities.find((e) => e.id === entityId);
      const attributes =
        selectedEntity?.attributes?.filter((a: any) => a.is_active) || [];

      return (
        <AttributeValueField
          entityId={entityId}
          value={value}
          onValueChange={onValueChange}
          placeholder={placeholder}
          attributes={attributes}
        />
      );
    },
    [entities]
  );

  useEffect(() => {
    getAllCategories();
    fetchEntities();
    if (!row) return;
    const assignmentMode =
      row.policy_assignment_rules?.length > 0 ? "CUSTOM" : "ALL";

    form.reset({
      name: row.name,
      description: row.description,
      is_pre_approval_required: row.is_pre_approval_required,
      category_ids: row.category_ids?.map((cat: string) => cat),
      assignmentMode,
      assign_to_all: assignmentMode === "ALL" ? true : false,
      policy_assignment_rules:
        assignmentMode === "CUSTOM"
          ? row.policy_assignment_rules.map((r: any) => ({
              id: crypto.randomUUID(),
              field: r.field,
              value: r.value,
            }))
          : undefined,
    });
  }, [row, fetchEntities]);

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center mb-6">
          <h1 className="text-2xl font-bold">
            {mode === "create"
              ? "Create Expense Policy"
              : "View Expense Policy"}
          </h1>
        </div>
        <div className="max-w-full">
          <div>
            <form
              id="create-policy-form"
              onSubmit={handleSubmit(onSubmit)}
              className="space-y-4 w-full"
            >
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <Label>Name</Label>
                  <Input {...register("name")} placeholder="Enter name" />
                </div>
                <div className="space-y-3">
                  <Label>Description</Label>
                  <Input
                    {...register("description")}
                    placeholder="Description"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <div className="space-y-3">
                  <Label>Select Categories</Label>
                  <SearchableMultiSelect
                    selectedCategories={selectedCategories}
                    setSearchTerm={setSearchTerm}
                    filteredCategories={filteredCategories}
                    handleDeselectAllFiltered={handleDeselectAllFiltered}
                    handleSelectAllFiltered={handleSelectAllFiltered}
                    toggleCategory={toggleCategory}
                  />

                  {formState.errors.category_ids && (
                    <p className="text-sm text-red-500">
                      {formState.errors.category_ids.message}
                    </p>
                  )}
                </div>
                <div className="flex flex-col gap-3 my-2">
                  <Label>Pre Approval Required</Label>
                  <div className="my-2">
                    <Switch
                      checked={watch("is_pre_approval_required")}
                      onCheckedChange={(v) =>
                        setValue("is_pre_approval_required", v)
                      }
                    />
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <div className="flex flex-col gap-3 my-2">
                  <Label>Assignment Rule</Label>
                  <Select
                    value={assignmentMode}
                    onValueChange={(val) => {
                      setValue("assignmentMode", val as "ALL" | "CUSTOM");
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select assignment">
                        {assignmentMode}
                      </SelectValue>
                    </SelectTrigger>

                    <SelectContent>
                      <SelectItem key="ALL" value="ALL">
                        Assign To All
                      </SelectItem>
                      <SelectItem key="CUSTOM" value="CUSTOM">
                        Custom
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {assignmentMode === "CUSTOM" && (
                <>
                {(watch("policy_assignment_rules") ?? []).length > 0 && <div className="text-sm font-medium">Rules</div>}
                  {watch("policy_assignment_rules")?.map((rule, index) => (
                    <div key={rule.id} className="flex gap-4 items-center">
                      {renderEntitySelect(
                        rule.field,
                        (val) => updateRule(index, { field: val, value: "" }),
                        "Select field"
                      )}

                      {renderAttributeSelect(
                        rule.field,
                        rule.value,
                        (val) => updateRule(index, { value: val }),
                        "Select value"
                      )}

                      <Button
                        type="button"
                        variant="destructive"
                        onClick={() => removeRule(index)}
                      >
                        Remove
                      </Button>
                    </div>
                  ))}

                  <Button type="button" variant="outline" onClick={addRule}>
                    + Add Rule
                  </Button>

                  {errors.policy_assignment_rules && (
                    <p className="text-sm text-red-500">
                      {errors.policy_assignment_rules.message}
                    </p>
                  )}
                </>
              )}
            </form>
          </div>
        </div>
      </div>
      <FormFooter>
        <Button
          variant="outline"
          onClick={() =>
            navigate("/admin-settings/product-config/expense-policies")
          }
          disabled={loading}
          className="px-6 py-2"
        >
          Back
        </Button>
        {mode === "create" && (
          <Button form="create-policy-form" type="submit" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Submitting...
              </>
            ) : (
              "Submit"
            )}
          </Button>
        )}
      </FormFooter>
    </>
  );
}

export default CreateExpensePolicyPage;
