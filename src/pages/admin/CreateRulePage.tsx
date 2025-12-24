import { FormFooter } from "@/components/layout/FormFooter";
import { DeleteConfirmDialog } from "@/components/shared/DeleteConfirmDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Entity, getEntities } from "@/services/admin/entities";
import {
  createPolicyRule,
  deletePolicyRule,
  getAllWorkflows,
  updatePolicyRule,
  WorkflowConfig,
} from "@/services/admin/workflows";
import { Loader2, Trash2 } from "lucide-react";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";

type WorkflowEvent = "ADVANCE" | "REPORT" | "PREAPPROVAL" | "STORE";
type Operator =
  | "EQUALS"
  | "NOT_EQUAL"
  | "IN"
  | "NOT_IN"
  | "GREATER_THAN"
  | "LESS_THAN";
interface RuleCondition {
  id: string;
  ifField: string;
  operator?: Operator;
  value: string;
}
interface RuleForm {
  name: string;
  description: string;
  workflowEvent?: WorkflowEvent;
  workflow: string;
  rules: RuleCondition[];
}

const OPERATOR_OPTIONS: { value: Operator; label: string }[] = [
  { value: "EQUALS", label: "EQUALS" },
  { value: "NOT_EQUAL", label: "NOT_EQUAL" },
  { value: "IN", label: "IN" },
  { value: "NOT_IN", label: "NOT_IN" },
  { value: "GREATER_THAN", label: "GREATER_THAN" },
  { value: "LESS_THAN", label: "LESS_THAN" },
];

const WORKFLOW_EVENT_OPTIONS: { value: WorkflowEvent; label: string }[] = [
  { value: "ADVANCE", label: "Advance" },
  { value: "REPORT", label: "Report" },
  { value: "PREAPPROVAL", label: "Pre Approval" },
  { value: "STORE", label: "Store" },
];

const HARDCODED_VALUES = {
  APPROVAL_STRATEGY: "ANY",
  MIN_APPROVALS_REQUIRED: 1,
  TIMEOUT_HOURS: 24,
  POLICY_TYPE: "COMPOSITE",
  ACTION_TYPE: "require_approval",
} as const;

// const PREFIXES = {
//   USER: "user.",
//   REPORT: "report.",
// } as const;

const getErrorMessage = (error: unknown, defaultMessage: string): string => {
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && error !== null && "response" in error) {
    const response = (error as { response?: { data?: { message?: string } } })
      .response;
    if (response?.data?.message) return response.data.message;
  }
  return defaultMessage;
};

const AttributeValueField = React.memo(
  ({
    entityId,
    value,
    onValueChange,
    placeholder,
    attributes,
  }: {
    entityId: string;
    value: string;
    onValueChange: (v: string) => void;
    placeholder: string;
    attributes: any[];
  }) => {
    if (entityId === "amount") {
      return (
        <Input
          type="number"
          value={value}
          placeholder={placeholder}
          onChange={(e) => onValueChange(e.target.value)}
        />
      );
    }

    return (
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {!entityId ? (
            <SelectItem value="no-entity-selected" disabled>
              Select entity first
            </SelectItem>
          ) : attributes.length === 0 ? (
            <SelectItem value="no-attributes" disabled>
              No attributes found
            </SelectItem>
          ) : (
            attributes.map((attr) => (
              <SelectItem key={attr.id} value={attr.id}>
                {attr.display_value}
              </SelectItem>
            ))
          )}
        </SelectContent>
      </Select>
    );
  }
);

function CreateRulePage() {
  const location = useLocation();
  const navigate = useNavigate();

  const ruleToEdit = location.state ?? null;
  const isEditMode = Boolean(ruleToEdit);
  const [hydrated, setHydrated] = useState(false);
  const [entities, setEntities] = useState<Entity[]>([]);
  const [entitiesLoading, setEntitiesLoading] = useState(false);
  const [workflows, setWorkflows] = useState<WorkflowConfig[]>([]);
  const [workflowsLoading, setWorkflowsLoading] = useState(false);
  const [creatingRule, setCreatingRule] = useState(false);
  const isFetchingWorkflowsRef = useRef(false);
  const workflowsFetchedRef = useRef(false);

  const createEmptyRule = (): RuleCondition => ({
    id: crypto.randomUUID(), // ✅ browser-native
    ifField: "",
    operator: undefined,
    value: "",
  });

  // const emptyRule: RuleCondition = {
  //   id: crypto.randomUUID(),
  //   ifField: "",
  //   operator: undefined,
  //   value: "",
  // };

  const [ruleForm, setRuleForm] = useState<RuleForm>({
    name: "",
    description: "",
    workflowEvent: undefined,
    workflow: "",
    rules: [createEmptyRule()],
  });

  console.log(ruleForm);
  const extractId = (value: string) => {
    if (!value.includes(".")) return value;
    return value.split(".")[1];
  };

  const mapRuleToForm = (rule: any): RuleForm => ({
    name: rule?.name ?? "",
    description: rule?.description ?? "",
    workflowEvent: rule?.approval_type,
    workflow: rule?.workflow_config_id,
    rules: rule?.conditions?.rules?.map((r: any) => ({
      id: crypto.randomUUID(), // ✅ generate once
      ifField: extractId(r.field),
      operator: r.operator,
      value: r.value,
    })) ?? [createEmptyRule()],
  });

  const resetRuleForm = useCallback(() => {
    setRuleForm({
      name: "",
      description: "",
      workflowEvent: undefined,
      workflow: "",
      rules: [createEmptyRule()],
    });
  }, []);

  const fetchEntities = useCallback(async () => {
    if (entities.length > 0 || entitiesLoading) return;

    setEntitiesLoading(true);
    try {
      const entitiesData = await getEntities();
      const newEntities = [
        ...entitiesData,
        { id: "amount", display_name: "Report Amount", name: "Report Amount" },
      ];
      setEntities(newEntities);
    } catch (error) {
      console.error("Error fetching entities:", error);
      toast.error("Failed to fetch entities");
    } finally {
      setEntitiesLoading(false);
    }
  }, []);

  const fetchWorkflows = useCallback(async (force = false) => {
    if (isFetchingWorkflowsRef.current) return;
    if (!force && workflowsFetchedRef.current) return;

    isFetchingWorkflowsRef.current = true;
    workflowsFetchedRef.current = true;
    setWorkflowsLoading(true);

    try {
      const workflowsData = await getAllWorkflows();
      setWorkflows(workflowsData.data.data);
    } catch (error) {
      console.error("Error fetching workflows:", error);
      toast.error("Failed to fetch workflows");
      workflowsFetchedRef.current = false;
    } finally {
      setWorkflowsLoading(false);
      isFetchingWorkflowsRef.current = false;
    }
  }, []);

  const validateRule = (): string | null => {
    if (!ruleForm.name) return "Please enter rule name";
    if (!ruleForm.workflowEvent) return "Please select a workflow event";
    if (!ruleForm.workflow) return "Please select a workflow";

    const invalid = ruleForm.rules.some(
      (r) => !r.ifField || !r.operator || !r.value
    );

    if (invalid) return "Please fill in all rule fields";
    return null;
  };

  const handleCreateRule = useCallback(async () => {
    const validationError = validateRule();
    if (validationError) {
      toast.error(validationError);
      return;
    }

    setCreatingRule(true);
    try {
      const payload = {
        name: ruleForm.name,
        description: ruleForm.description || "",
        policy_type: HARDCODED_VALUES.POLICY_TYPE,
        workflow_config_id: ruleForm.workflow,
        approval_type: ruleForm.workflowEvent,
        conditions: {
          rules: ruleForm.rules.map((r) => ({
            field: extractId(r.ifField),
            operator: r.operator!,
            value: r.value,
          })),
          action: {
            type: HARDCODED_VALUES.ACTION_TYPE,
          },
        },
        is_active: true,
      };
      if (isEditMode) {
        await updatePolicyRule({ id: ruleToEdit?.id, payload });
        toast.success("Policy updated successfully");
      } else {
        const response = await createPolicyRule(payload);
        toast.success(response.message || "Policy created successfully");
      }

      resetRuleForm();
      navigate("/admin-settings/product-config/workflow");
    } catch (error) {
      console.error("Error creating policy:", error);
      const errorMessage = getErrorMessage(error, "Failed to create policy");
      toast.error(errorMessage);
    } finally {
      setCreatingRule(false);
    }
  }, [ruleForm, validateRule, resetRuleForm]);

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

  const renderOperatorSelect = useCallback(
    (
      value: Operator | undefined,
      onValueChange: (value: Operator) => void,
      placeholder: string
    ) => (
      <Select
        value={value || ""}
        onValueChange={(nextValue) => onValueChange(nextValue as Operator)}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {OPERATOR_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    ),
    []
  );

  const renderWorkflowEventSelect = useCallback(
    (
      value: WorkflowEvent | undefined,
      onValueChange: (value: WorkflowEvent) => void,
      placeholder: string
    ) => (
      <Select
        value={value || ""}
        onValueChange={(nextValue) => onValueChange(nextValue as WorkflowEvent)}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {WORKFLOW_EVENT_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    ),
    []
  );

  const renderWorkflowSelect = useCallback(
    (
      value: string,
      onValueChange: (value: string) => void,
      placeholder: string
    ) => {
      const filteredWorkflows = workflows;

      return (
        <Select value={value} onValueChange={onValueChange}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder={placeholder} />
          </SelectTrigger>
          <SelectContent>
            {workflowsLoading ? (
              <div className="flex items-center justify-center p-2">
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
            ) : filteredWorkflows.length > 0 ? (
              filteredWorkflows.map((workflow) => (
                <SelectItem key={workflow.id} value={workflow.id}>
                  {workflow.name}
                </SelectItem>
              ))
            ) : (
              <SelectItem value="no-workflows" disabled>
                No workflows found
              </SelectItem>
            )}
          </SelectContent>
        </Select>
      );
    },
    [workflows, workflowsLoading]
  );

  const handleDelete = async (id: string) => {
    try {
      await deletePolicyRule(id);
      navigate("/admin-settings/product-config/workflow");
    } catch (error: any) {
      toast.error(error?.response?.data?.message || error.message);
    }
  };

  const addRule = () => {
    setRuleForm((prev) => ({
      ...prev,
      rules: [...prev.rules, createEmptyRule()],
    }));
  };

  const removeRule = (id: number) => {
    setRuleForm((prev) => ({
      ...prev,
      rules: prev.rules.filter((r) => r.id.toString() !== id.toString()),
    }));
  };

  const updateRule = (index: number, patch: Partial<RuleCondition>) => {
    setRuleForm((prev) => ({
      ...prev,
      rules: prev.rules.map((r, i) => (i === index ? { ...r, ...patch } : r)),
    }));
  };

  useEffect(() => {
    fetchEntities();
    fetchWorkflows();
  }, []);

  useEffect(() => {
    if (
      !isEditMode ||
      !ruleToEdit ||
      hydrated ||
      entities.length === 0 ||
      workflows.length === 0
    ) {
      return;
    }

    setRuleForm(mapRuleToForm(ruleToEdit));
    setHydrated(true);
  }, [isEditMode, ruleToEdit, entities, workflows, hydrated]);

  // useEffect(() => {
  //   if (!isEditMode || !ruleToEdit) return;
  //   if (entities.length === 0) return;

  //   const condition = ruleToEdit.conditions?.rules?.[0];
  //   if (!condition?.field) return;
  // }, [isEditMode, ruleToEdit, entities]);

  return (
    <div className="flex flex-col gap-3 max-w-full">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">
          {isEditMode ? "Rule Details" : "Create Rule"}
        </h1>
        {isEditMode && (
          <DeleteConfirmDialog
            trigger={
              <Button
                variant="outline"
                className="px-6 py-2 border-red-500 text-red-600 hover:bg-red-50"
                onClick={(e) => {
                  e.stopPropagation();
                  // setShowDeleteDialog(true);
                }}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            }
            title="Delete Rule"
            description="Are you sure you want to delete this rule? This cannot be undone."
            onConfirm={() => handleDelete(ruleToEdit?.id)}
          />
        )}
      </div>
      <>
        <form id="create-rule-form" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <Label htmlFor="ruleName" className="text-sm font-medium">
                Name
              </Label>
              <Input
                id="ruleName"
                placeholder="Enter rule name"
                value={ruleForm.name}
                onChange={(e) =>
                  setRuleForm((prev) => ({ ...prev, name: e.target.value }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="ruleWorkflowEvent"
                className="text-sm font-medium"
              >
                Workflow Event
              </Label>
              {renderWorkflowEventSelect(
                ruleForm.workflowEvent,
                (value) =>
                  setRuleForm((prev) => ({
                    ...prev,
                    workflowEvent: value,
                    workflow: "",
                  })),
                "Select workflow event"
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="ruleWorkflow" className="text-sm font-medium">
                Workflow
              </Label>
              {renderWorkflowSelect(
                ruleForm.workflow,
                (value) =>
                  setRuleForm((prev) => ({ ...prev, workflow: value })),
                "Select workflow"
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="ruleDescription" className="text-sm font-medium">
              Description
            </Label>
            <Input
              id="ruleDescription"
              placeholder="Enter rule description"
              value={ruleForm.description}
              onChange={(e) =>
                setRuleForm((prev) => ({
                  ...prev,
                  description: e.target.value,
                }))
              }
            />
          </div>
          <div className="space-y-4">
            <Label className="text-sm font-medium">New Rules</Label>
            {ruleForm.rules.map((rule: any, index: number) => {
              return (
                <div
                  className="flex items-center gap-6"
                  key={rule.id}
                >
                  {renderEntitySelect(
                    rule.ifField,
                    (value) => updateRule(index, { ifField: value, value: "" }),
                    "Select field"
                  )}

                  {renderOperatorSelect(
                    rule.operator,
                    (value) => updateRule(index, { operator: value }),
                    "Select operator"
                  )}

                  {renderAttributeSelect(
                    rule.ifField,
                    rule.value || rule.value,
                    (value) => updateRule(index, { value }),
                    rule.ifField === "amount" ? "Enter value" : "Select value"
                  )}
                  <Button onClick={() => removeRule(rule.id)} variant="destructive">Remove</Button>
                </div>
              );
            })}
          </div>
          <div>
            <Button
              type="button"
              className="my-2"
              variant="outline"
              onClick={addRule}
            >
              + Add Another
            </Button>
          </div>
        </form>
        <FormFooter>
          <Button variant="outline" onClick={() => navigate(-1)}>
            Back
          </Button>
          <Button
            type="button"
            className="min-w-[150px]"
            form="create-rule-form"
            disabled={creatingRule}
            onClick={handleCreateRule}
          >
            {creatingRule ? (
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
      </>
    </div>
  );
}

export default CreateRulePage;
