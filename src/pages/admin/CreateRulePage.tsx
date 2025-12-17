import { FormFooter } from "@/components/layout/FormFooter";
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
  createPolicy,
  getAllWorkflows,
  WorkflowConfig,
} from "@/services/admin/workflows";
import { Loader2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

type WorkflowEvent = "ADVANCE" | "REPORT" | "PREAPPROVAL" | "STORE";
type Operator =
  | "EQUALS"
  | "NOT_EQUAL"
  | "IN"
  | "NOT_IN"
  | "GREATER_THEN"
  | "LESS_THEN";

interface RuleForm {
  name: string;
  description: string;
  workflowEvent?: WorkflowEvent;
  workflow: string;
  rule: {
    ifField: string;
    operator?: Operator;
    value: string;
  };
}

const OPERATOR_OPTIONS: { value: Operator; label: string }[] = [
  { value: "EQUALS", label: "EQUALS" },
  { value: "NOT_EQUAL", label: "NOT_EQUAL" },
  { value: "IN", label: "IN" },
  { value: "NOT_IN", label: "NOT_IN" },
  { value: "GREATER_THEN", label: "GREATER_THEN" },
  { value: "LESS_THEN", label: "LESS_THEN" },
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

const PREFIXES = {
  USER: "user.",
} as const;

const getErrorMessage = (error: unknown, defaultMessage: string): string => {
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && error !== null && "response" in error) {
    const response = (error as { response?: { data?: { message?: string } } })
      .response;
    if (response?.data?.message) return response.data.message;
  }
  return defaultMessage;
};

function CreateRulePage() {
  const [entities, setEntities] = useState<Entity[]>([]);
  const [entitiesLoading, setEntitiesLoading] = useState(false);
  const [workflows, setWorkflows] = useState<WorkflowConfig[]>([]);
  const [workflowsLoading, setWorkflowsLoading] = useState(false);
  const [creatingRule, setCreatingRule] = useState(false);
  const isFetchingWorkflowsRef = useRef(false);
  const workflowsFetchedRef = useRef(false);

  const [ruleForm, setRuleForm] = useState<RuleForm>({
    name: "",
    description: "",
    workflowEvent: undefined,
    workflow: "",
    rule: {
      ifField: "",
      operator: undefined,
      value: "",
    },
  });

  const resetRuleForm = useCallback(() => {
    setRuleForm({
      name: "",
      description: "",
      workflowEvent: undefined,
      workflow: "",
      rule: {
        ifField: "",
        operator: undefined,
        value: "",
      },
    });
  }, []);

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

  const fetchWorkflows = useCallback(async (force = false) => {
    if (isFetchingWorkflowsRef.current) return;
    if (!force && workflowsFetchedRef.current) return;

    isFetchingWorkflowsRef.current = true;
    workflowsFetchedRef.current = true;
    setWorkflowsLoading(true);

    try {
      const workflowsData = await getAllWorkflows();
      setWorkflows(workflowsData);
    } catch (error) {
      console.error("Error fetching workflows:", error);
      toast.error("Failed to fetch workflows");
      workflowsFetchedRef.current = false;
    } finally {
      setWorkflowsLoading(false);
      isFetchingWorkflowsRef.current = false;
    }
  }, []);

  const validateRule = useCallback((): string | null => {
    if (!ruleForm.name) return "Please enter rule name";
    if (!ruleForm.workflowEvent) return "Please select a workflow event";
    if (!ruleForm.workflow) return "Please select a workflow";
    if (
      !ruleForm.rule.ifField ||
      !ruleForm.rule.operator ||
      !ruleForm.rule.value
    ) {
      return "Please fill in all rule fields";
    }
    return null;
  }, [ruleForm]);

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
          rules: [
            {
              field: `${PREFIXES.USER}${ruleForm.rule.ifField}`,
              operator: ruleForm.rule.operator!,
              value: ruleForm.rule.value,
            },
          ],
          action: {
            type: HARDCODED_VALUES.ACTION_TYPE,
          },
        },
        is_active: true,
      };

      const response = await createPolicy(payload);
      toast.success(response.message || "Policy created successfully");

      resetRuleForm();
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
    ) => (
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder={placeholder} />
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
    ),
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
        selectedEntity?.attributes?.filter((attr: any) => attr.is_active) || [];

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
              attributes.map((attr: any) => (
                <SelectItem key={attr.id} value={attr.id}>
                  {attr.display_value}
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
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

  useEffect(() => {
    fetchEntities();
    fetchWorkflows()
  }, [])

  return (
    <div className="flex flex-col gap-3 max-w-full">
      <h1 className="text-2xl font-bold mb-3">Create Rule</h1>
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
            <Label className="text-sm font-medium">Rules</Label>
            <div className="flex items-center gap-4">
              {renderEntitySelect(
                ruleForm.rule.ifField,
                (value) =>
                  setRuleForm((prev) => ({
                    ...prev,
                    rule: { ...prev.rule, ifField: value, value: "" },
                  })),
                "Select field"
              )}

              {renderOperatorSelect(
                ruleForm.rule.operator,
                (value) =>
                  setRuleForm((prev) => ({
                    ...prev,
                    rule: { ...prev.rule, operator: value },
                  })),
                "Select operator"
              )}

              {renderAttributeSelect(
                ruleForm.rule.ifField,
                ruleForm.rule.value,
                (value) =>
                  setRuleForm((prev) => ({
                    ...prev,
                    rule: { ...prev.rule, value },
                  })),
                "Select value"
              )}
            </div>
          </div>
        </form>
        <FormFooter>
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
                Creating...
              </>
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
