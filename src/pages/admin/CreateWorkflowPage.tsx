import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  ChevronDown,
  ChevronRight,
  Loader2,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { FormFooter } from "@/components/layout/FormFooter";
import { useCallback, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import {
  createWorkflowConfig,
  deleteWorkflow,
  updateWorkflowConfig,
} from "@/services/admin/workflows";
import { toast } from "sonner";
import { Entity, getEntities } from "@/services/admin/entities";
import { useLocation, useNavigate } from "react-router-dom";
import { DeleteConfirmDialog } from "@/components/shared/DeleteConfirmDialog";

const STEP_TYPE_OPTIONS: { value: StepType; label: string }[] = [
  { value: "direct", label: "Direct" },
  { value: "parallel", label: "Parallel" },
];

const APPROVER_OPTIONS: { value: ApproverIdentifier; label: string }[] = [
  { value: "REPORTING_MANAGER", label: "Reporting manager" },
  { value: "SKIP_LEVEL_MANAGER", label: "Skip level manager" },
];

interface FormValues {
  name: string;
}

type StepType = "direct" | "parallel";
type ApproverIdentifier = "REPORTING_MANAGER" | "SKIP_LEVEL_MANAGER";
type Operator =
  | "EQUALS"
  | "NOT_EQUAL"
  | "IN"
  | "NOT_IN"
  | "GREATER_THEN"
  | "LESS_THEN";

interface Step {
  id: number;
  stepName: string;
  type?: StepType;
  approveIdentifier?: ApproverIdentifier;
  conditionEntityId: string;
  conditionOperator?: Operator;
  conditionAttributeId: string;
}

const OPERATOR_OPTIONS: { value: Operator; label: string }[] = [
  { value: "EQUALS", label: "EQUALS" },
  { value: "NOT_EQUAL", label: "NOT_EQUAL" },
  { value: "IN", label: "IN" },
  { value: "NOT_IN", label: "NOT_IN" },
  { value: "GREATER_THEN", label: "GREATER_THEN" },
  { value: "LESS_THEN", label: "LESS_THEN" },
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

const getConditionValue = (step: Step): string => {
  return step.conditionAttributeId || "";
};

const getErrorMessage = (error: unknown, defaultMessage: string): string => {
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && error !== null && "response" in error) {
    const response = (error as { response?: { data?: { message?: string } } })
      .response;
    if (response?.data?.message) return response.data.message;
  }
  return defaultMessage;
};

function CreateWorkflowPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const workflowToEdit = location.state ?? null;
  const isEditMode = Boolean(workflowToEdit);

  const [steps, setSteps] = useState<Step[]>([]);
  const [openSteps, setOpenSteps] = useState<Set<number>>(new Set());
  const [entities, setEntities] = useState<Entity[]>([]);
  const [entitiesLoading, setEntitiesLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { register, handleSubmit, reset } = useForm<FormValues>({
    defaultValues: {
      name: "",
    },
  });

  const mapSequenceToStep = (sequence: any, index: number): Step => {
    const isDirect = sequence.relationship_type === "DIRECT_RELATIONSHIP";

    const isParallel = sequence.relationship_type === "PARALLEL_RELATIONSHIP";

    let conditionEntityId = "";
    let conditionOperator: Operator | undefined;
    let conditionAttributeId = "";

    if (isParallel && sequence.entity_criteria?.length) {
      const criteria = sequence.entity_criteria[0];
      conditionEntityId = criteria.field.replace(PREFIXES.USER, "");
      conditionOperator = criteria.operator;
      conditionAttributeId = criteria.value;
    }

    return {
      id: index + 1,
      stepName: sequence.step_name,
      type: isDirect ? "direct" : "parallel",
      approveIdentifier: isDirect ? sequence.approver_identifier : undefined,
      conditionEntityId,
      conditionOperator,
      conditionAttributeId,
    };
  };

  const createEmptyStep = useCallback(
    (): Step => ({
      id: 0,
      stepName: "",
      type: undefined,
      approveIdentifier: undefined,
      conditionEntityId: "",
      conditionOperator: undefined,
      conditionAttributeId: "",
    }),
    []
  );

  const resetWorkflowForm = useCallback(() => {
    setSteps([]);
    setOpenSteps(new Set());
    reset({
      name: "",
    });
  }, [reset]);

  const addStep = useCallback(() => {
    const newStepId =
      steps.length > 0 ? Math.max(...steps.map((s) => s.id)) + 1 : 1;
    const newStep: Step = { ...createEmptyStep(), id: newStepId };
    setSteps((prev) => [...prev, newStep]);
    setOpenSteps((prev) => new Set([...prev, newStepId]));
  }, [steps, createEmptyStep]);

  const updateStep = useCallback(
    (
      stepId: number,
      field: keyof Step,
      value: string | StepType | ApproverIdentifier | Operator | undefined
    ) => {
      setSteps((prev) =>
        prev.map((step) => {
          if (step.id !== stepId) return step;

          const updated = { ...step, [field]: value };
          if (field === "conditionEntityId") {
            updated.conditionAttributeId = "";
          }
          return updated;
        })
      );
    },
    []
  );

  const toggleStep = useCallback((stepId: number) => {
    setOpenSteps((prev) => {
      const next = new Set(prev);
      if (next.has(stepId)) {
        next.delete(stepId);
      } else {
        next.add(stepId);
      }
      return next;
    });
  }, []);

const removeStep = useCallback((id: number) => {
  setSteps((prev) => {
    const filtered = prev.filter((step) => step.id !== id)

    return filtered.map((step, index) => ({
      ...step,
      id: index + 1,
    }))
  })

  setOpenSteps((prev) => {
    const next = new Set<number>()
    Array.from(prev)
      .filter((stepId) => stepId !== id)
      .forEach((_, index) => {
        next.add(index + 1)
      })
    return next
  })
}, [])

  const validateSteps = useCallback((): string | null => {
    if (steps.length === 0) {
      return "Please add at least one step";
    }

    for (const step of steps) {
      if (!step.type) {
        return `Please select type for Step ${step.id}`;
      }
      if (step.type === "direct" && !step.approveIdentifier) {
        return `Please select approve identifier for Step ${step.id}`;
      }
      if (step.type === "parallel") {
        if (
          !step.conditionEntityId ||
          !step.conditionOperator ||
          !getConditionValue(step)
        ) {
          return `Please fill in all condition fields for Step ${step.id}`;
        }
      }
    }

    return null;
  }, [steps]);

  const buildWorkflowSequence = useCallback((step: Step, index: number) => {
    const baseSequence = {
      step_order: index + 1,
      step_name: step.stepName || `Step ${step.id}`,
      relationship_type:
        step.type === "direct"
          ? "DIRECT_RELATIONSHIP"
          : "PARALLEL_RELATIONSHIP",
      approval_strategy: HARDCODED_VALUES.APPROVAL_STRATEGY,
      min_approvals_required: HARDCODED_VALUES.MIN_APPROVALS_REQUIRED,
      timeout_hours: HARDCODED_VALUES.TIMEOUT_HOURS,
    } as const;

    if (step.type === "direct") {
      if (!step.approveIdentifier) {
        throw new Error(`Approver identifier is required for Step ${step.id}`);
      }
      return {
        ...baseSequence,
        approver_identifier: step.approveIdentifier,
      };
    }

    if (step.type === "parallel") {
      const attributeId = getConditionValue(step);
      const entityField = step.conditionEntityId
        ? `${PREFIXES.USER}${step.conditionEntityId}`
        : step.conditionEntityId;

      return {
        ...baseSequence,
        entity_criteria: [
          {
            field: entityField,
            operator: step.conditionOperator!,
            value: attributeId,
          },
        ],
      };
    }

    return baseSequence;
  }, []);

  const handleCreateWorkflow = useCallback(
    async (data: FormValues) => {
      if (!data.name) {
        toast.error("Please fill in all required fields");
        return;
      }

      const validationError = validateSteps();
      if (validationError) {
        toast.error(validationError);
        return;
      }

      setSubmitting(true);
      try {
        const sequences = steps.map((step, index) => {
          try {
            return buildWorkflowSequence(step, index);
          } catch (err) {
            const errorMsg = getErrorMessage(
              err,
              "Unknown error building sequence"
            );
            toast.error(errorMsg);
            throw err;
          }
        });

        const payload = {
          name: data.name,
          entity_type: "EXPENSE",
          is_active: true,
          sequences,
        };

        if (isEditMode) {
          await updateWorkflowConfig({ id: workflowToEdit.id, payload });
          toast.success("Workflow updated successfully");
        } else {
          const response = await createWorkflowConfig(payload);

          toast.success(
            response.message || "Workflow configuration created successfully"
          );
        }

        resetWorkflowForm();
        navigate("/admin-settings/product-config/workflow");
      } catch (error) {
        console.error("Error creating workflow config:", error);
        const errorMessage = getErrorMessage(
          error,
          "Failed to create workflow configuration"
        );
        toast.error(errorMessage);
      } finally {
        // setSubmitting(false);
      }
    },
    [steps, validateSteps, buildWorkflowSequence, resetWorkflowForm]
  );

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
        selectedEntity?.attributes?.filter((attr) => attr.is_active) || [];

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

  const handleDelete = async (id: string) => {
    try {
      await deleteWorkflow(id);
      navigate("/admin-settings/product-config/workflow");
    } catch (error: any) {
      toast.error(error?.response?.data?.message || error.message);
    }
  };

  useEffect(() => {
    fetchEntities();
  }, []);

  useEffect(() => {
    if (!isEditMode || !workflowToEdit) return;

    reset({
      name: workflowToEdit.name,
    });

    const mappedSteps: Step[] = workflowToEdit.sequences.map(mapSequenceToStep);

    setSteps(mappedSteps);

    setOpenSteps(new Set(mappedSteps.map((s) => s.id)));
  }, [isEditMode, workflowToEdit, reset]);

  return (
    <div className="flex flex-col gap-3 max-w-full">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">
          {isEditMode ? "Update Workflow" : "Create Workflow"}
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
            title="Delete Workflow"
            description="Are you sure you want to delete this workflow? This cannot be undone."
            onConfirm={() => handleDelete(workflowToEdit?.id)}
          />
        )}
      </div>
      <>
        <form
          id="workflow-config-form"
          onSubmit={handleSubmit(handleCreateWorkflow)}
          className="space-y-6"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm font-medium">
                Name
              </Label>
              <Input
                id="name"
                placeholder="Enter workflow name"
                {...register("name")}
              />
            </div>
          </div>

          <div className="space-y-4 mt-6">
            {steps.map((step) => (
              <div key={step.id} className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium underline decoration-2 underline-offset-4 text-foreground">
                    Step {step.id}
                  </h3>
                  <span className="flex items-center gap-4">
                    <Button
                      type="button"
                      variant="ghost"
                      className="h-auto p-0 hover:bg-transparent"
                      onClick={() => removeStep(step.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => toggleStep(step.id)}
                      className="h-auto p-0 hover:bg-transparent"
                    >
                      {openSteps.has(step.id) ? (
                        <ChevronDown className="h-5 w-5" />
                      ) : (
                        <ChevronRight className="h-5 w-5" />
                      )}
                    </Button>
                  </span>
                </div>

                {openSteps.has(step.id) && (
                  <div className="space-y-6 pt-2">
                    <div className="space-y-2">
                      <Label
                        htmlFor={`step${step.id}Name`}
                        className="text-sm font-medium"
                      >
                        Step Name
                      </Label>
                      <Input
                        id={`step${step.id}Name`}
                        placeholder="Enter step name"
                        value={step.stepName}
                        onChange={(e) =>
                          updateStep(step.id, "stepName", e.target.value)
                        }
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label
                          htmlFor={`step${step.id}Type`}
                          className="text-sm font-medium"
                        >
                          Type
                        </Label>
                        <Select
                          value={step.type || ""}
                          onValueChange={(value) =>
                            updateStep(step.id, "type", value as StepType)
                          }
                        >
                          <SelectTrigger
                            id={`step${step.id}Type`}
                            className="w-full"
                          >
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                          <SelectContent>
                            {STEP_TYPE_OPTIONS.map((option) => (
                              <SelectItem
                                key={option.value}
                                value={option.value}
                              >
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {step.type === "direct" && (
                        <div className="space-y-2">
                          <Label
                            htmlFor={`step${step.id}ApproveIdentifier`}
                            className="text-sm font-medium"
                          >
                            Approver Identifier
                          </Label>
                          <Select
                            value={step.approveIdentifier || ""}
                            onValueChange={(value) =>
                              updateStep(
                                step.id,
                                "approveIdentifier",
                                value as ApproverIdentifier
                              )
                            }
                          >
                            <SelectTrigger
                              id={`step${step.id}ApproveIdentifier`}
                              className="w-full"
                            >
                              <SelectValue placeholder="Select approve identifier" />
                            </SelectTrigger>
                            <SelectContent>
                              {APPROVER_OPTIONS.map((option) => (
                                <SelectItem
                                  key={option.value}
                                  value={option.value}
                                >
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </div>

                    {step.type === "parallel" && (
                      <div className="pt-4 border-t space-y-3">
                        <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Condition
                        </Label>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          {renderEntitySelect(
                            step.conditionEntityId,
                            (value) =>
                              updateStep(step.id, "conditionEntityId", value),
                            "Select entity"
                          )}

                          {renderOperatorSelect(
                            step.conditionOperator,
                            (value) =>
                              updateStep(step.id, "conditionOperator", value),
                            "Select operator"
                          )}

                          {renderAttributeSelect(
                            step.conditionEntityId,
                            getConditionValue(step),
                            (value) =>
                              updateStep(
                                step.id,
                                "conditionAttributeId",
                                value
                              ),
                            "Select value"
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}

            <Button type="button" variant="outline" onClick={addStep}>
              <Plus className="h-4 w-4 mr-2" />
              Add Step
            </Button>
          </div>
        </form>
        <FormFooter>
          <Button onClick={() => navigate(-1)} variant="outline">
            Back
          </Button>
          <Button
            type="submit"
            form="workflow-config-form"
            className="min-w-[150px]"
            disabled={submitting}
          >
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {isEditMode ? "Updating..." : "Submitting..."}
              </>
            ) : isEditMode ? (
              "Update"
            ) : (
              "Submit"
            )}
          </Button>
        </FormFooter>
      </>
    </div>
  );
}

export default CreateWorkflowPage;
