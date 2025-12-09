import { useState, useEffect, useMemo, useCallback } from "react";
import { ReportTabs } from "@/components/reports/ReportTabs";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  getTemplates,
  assignEntity,
  type Template,
} from "@/services/admin/templates";
import { getEntities, type Entity } from "@/services/admin/entities";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { FormFooter } from "@/components/layout/FormFooter";

const CORE_FIELDS = [
  "Name",
  "Description",
  "Address",
  "City",
  "Opening Date",
  "Store Code",
  "Store Manager",
  "Area Manager"
];

const MANDATORY_OPTIONS = [
  { value: "MANDATORY", label: "Mandatory" },
  { value: "NOT_MANDATORY", label: "Not mandatory" },
];

const getEntityId = (e: any): string | undefined => {
  return e?.entity_id ?? e?.id;
};

const getEntityDisplayName = (
  assignedEntity: any,
  entityInfo: Entity | null
): string => {
  return (
    assignedEntity.display_name ||
    assignedEntity.field_name ||
    entityInfo?.display_name ||
    entityInfo?.name ||
    "Unknown Entity"
  );
};

const getEmptyStateMessage = (
  entitiesLoading: boolean,
  assignedCount: number,
  totalCount: number
): string => {
  if (entitiesLoading) {
    return "Loading entities...";
  }
  if (assignedCount === totalCount && totalCount > 0) {
    return "All entities are already assigned";
  }
  return "No entities found";
};

interface AssignedEntitiesListProps {
  assignedEntities: Template["entities"];
  entities: Entity[];
}

const AssignedEntitiesList = ({
  assignedEntities,
  entities,
}: AssignedEntitiesListProps) => {
  if (!assignedEntities || assignedEntities.length === 0) {
    return null;
  }
  console.log(entities, assignedEntities);

  return (
    <div className="mt-6 pt-6 border-t">
      <h3 className="text-md font-semibold mb-4">Assigned Entities</h3>
      <div className="space-y-2">
        {assignedEntities.map((assignedEntity, idx: number) => {
          const entityId = getEntityId(assignedEntity);
          const entityInfo = entities.find((e) => e?.id === entityId) || null;

          if (!assignedEntity) return null;

          const displayName = getEntityDisplayName(assignedEntity, entityInfo);
          const key = `${entityId ?? "unknown"}-${idx}`;

          return (
            <div
              key={key}
              className="flex items-center justify-between p-3 bg-gray-50 rounded border"
            >
              <div className="flex items-center gap-3">
                <div>
                  <div className="font-medium text-sm">{displayName}</div>
                  {assignedEntity.description && (
                    <div className="text-xs text-gray-500">
                      {assignedEntity.description}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`text-xs px-2 py-1 rounded ${
                    assignedEntity.is_mandatory
                      ? "bg-red-100 text-red-700"
                      : "bg-gray-100 text-gray-700"
                  }`}
                >
                  {assignedEntity.is_mandatory ? "Mandatory" : "Not Mandatory"}
                </span>
                {assignedEntity.field_type && (
                  <span className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-700">
                    {assignedEntity.field_type}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

interface CustomField {
  entityId: string;
  mandatory: string;
  categories: string[];
}

const StoreMaster = () => {
  const [activeTab, setActiveTab] = useState<"core" | "custom">("core");
  const [fieldSettings, setFieldSettings] = useState<Record<string, string>>(
    {}
  );
  const [templates, setTemplates] = useState<Template[]>([]);
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [loading, setLoading] = useState(false);
  const [entities, setEntities] = useState<Entity[]>([]);
  const [entitiesLoading, setEntitiesLoading] = useState(false);

  const handleSelectChange = useCallback((field: string, value: string) => {
    setFieldSettings((prev) => ({ ...prev, [field]: value }));
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await getTemplates();
        setTemplates(res);
      } catch (e) {
        console.error("Error loading templates:", e);
        setTemplates([]);
      }
    };
    load();
  }, []);

  useEffect(() => {
    if (activeTab !== "custom") return;
    if (entities.length > 0) return;
    if (entitiesLoading) return;
    if (templates.length === 0) return;

    const loadEntities = async () => {
      setEntitiesLoading(true);
      try {
        const entitiesData = await getEntities();
        setEntities(entitiesData);
      } catch (e) {
        console.error("Error fetching entities:", e);
        toast.error("Failed to fetch entities");
        setEntities([]);
      } finally {
        setEntitiesLoading(false);
      }
    };
    loadEntities();
  }, [activeTab, entities.length, entitiesLoading, templates.length]);
  console.log(templates);
  const storeTemplate = useMemo(() => {
    return templates.find((t) => t.module_type === "store");
  }, [templates]);

  const assignedEntities = useMemo(() => {
    if (
      !storeTemplate?.entities ||
      !Array.isArray(storeTemplate.entities)
    ) {
      return [];
    }
    return storeTemplate.entities;
  }, [storeTemplate]);

  const assignedEntityIds = useMemo(() => {
    return assignedEntities
      .map((e) => getEntityId(e))
      .filter((id): id is string => Boolean(id));
  }, [assignedEntities]);

  const availableEntities = useMemo(() => {
    if (!Array.isArray(entities) || entities.length === 0) {
      return [];
    }
    return entities.filter(
      (entity) => entity?.id && !assignedEntityIds.includes(entity.id)
    );
  }, [entities, assignedEntityIds]);

  const addCustomField = useCallback(() => {
    setCustomFields((prev) => [
      ...prev,
      { entityId: "", mandatory: "NOT_MANDATORY", categories: [] },
    ]);
  }, []);

  const removeCustomField = useCallback((index: number) => {
    setCustomFields((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const updateCustomField = useCallback(
    (index: number, field: Partial<CustomField>) => {
      setCustomFields((prev) =>
        prev.map((row, i) => (i === index ? { ...row, ...field } : row))
      );
    },
    []
  );

  const reloadData = useCallback(async () => {
    try {
      const [templatesRes, entitiesRes] = await Promise.all([
        getTemplates(),
        getEntities(),
      ]);
      setTemplates(templatesRes);
      setEntities(entitiesRes);
    } catch (error) {
      console.error("Error reloading data:", error);
    }
  }, []);

  const handleSubmitCustom = async () => {
    if (customFields.length === 0) {
      toast.error("Add at least one custom field before submitting");
      return;
    }

    const invalidFields = customFields.filter((field) => !field.entityId);
    if (invalidFields.length > 0) {
      toast.error("Please select an entity for all custom fields");
      return;
    }

    if (!storeTemplate?.id) {
      toast.error(
        "Expense template not found. Please ensure templates are loaded."
      );
      return;
    }

    setLoading(true);
    const results: Array<{
      success: boolean;
      entityId: string;
      error?: string;
    }> = [];

    try {
      const assignments = customFields.map(async (row) => {
        if (!row.entityId)
          return { success: false, entityId: "", error: "No entity ID" };

        try {
          await assignEntity({
            module_template_id: storeTemplate.id,
            entity_id: row.entityId,
            is_mandatory: row.mandatory === "MANDATORY",
          });
          return { success: true, entityId: row.entityId };
        } catch (err: any) {
          const errorMsg =
            err?.response?.data?.message || err?.message || "Unknown error";
          toast.error(`Failed to assign entity ${row.entityId}: ${errorMsg}`);
          return { success: false, entityId: row.entityId, error: errorMsg };
        }
      });

      const assignmentResults = await Promise.all(assignments);
      results.push(...assignmentResults);

      if (results.every((r) => !r.success)) {
        toast.error("Failed to assign any entities");
        setLoading(false);
        return;
      }

      const successful = results.filter((r) => r.success);
      const failed = results.filter((r) => !r.success);

      if (failed.length > 0) {
        toast.error(
          `Failed to assign ${failed.length} of ${results.length} entities`
        );
      }

      if (successful.length > 0) {
        toast.success(
          `Successfully assigned ${successful.length} ${
            successful.length === 1 ? "entity" : "entities"
          }`
        );
        setCustomFields([]);
        await reloadData();
        setActiveTab("core");
      }
    } catch (err: any) {
      console.error("Error assigning entities:", err);
      toast.error(
        err?.response?.data?.message || "Failed to assign custom fields"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSaveCoreConfig = async () => {
    setLoading(true);
    try {
      toast.success("Core configuration saved successfully");
      await reloadData();
    } catch (err: any) {
      console.error("Error saving core configuration:", err);
      toast.error(
        err?.response?.data?.message || "Failed to save core configuration"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = useCallback(() => {
    setCustomFields([]);
    setActiveTab("core");
  }, []);

  const emptyStateMessage = getEmptyStateMessage(
    entitiesLoading,
    assignedEntityIds.length,
    entities.length
  );

  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Store Masters</h1>
      </div>

      <ReportTabs
        activeTab={activeTab}
        onTabChange={(t) => setActiveTab(t as any)}
        tabs={[
          { key: "core", label: "Core Values", count: 0 },
          { key: "custom", label: "Custom Values", count: 0 },
        ]}
        className="mb-6"
      />

      {activeTab === "core" ? (
        <>
          <Card className="p-6">
            <div className="mb-6">
              <h2 className="text-lg font-semibold">Core Values</h2>
              <p className="text-sm text-muted-foreground">
                Configure which core expense fields are mandatory.
              </p>
            </div>

            {templates.length === 0 ? (
              <p className="text-sm text-gray-600 py-4">
                No templates found. Please refresh the page.
              </p>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                <div className="grid grid-cols-2 gap-4 bg-gray-50 p-3 rounded text-sm font-medium text-gray-600">
                  <div>Field</div>
                  <div>Mandatory</div>
                </div>

                {CORE_FIELDS.map((label) => (
                  <div
                    key={label}
                    className="grid grid-cols-2 gap-4 items-center p-3 rounded bg-white"
                  >
                    <div className="text-sm">{label}</div>
                    <Select
                      value={fieldSettings[label]}
                      onValueChange={(v) => handleSelectChange(label, v)}
                    >
                      <SelectTrigger className="w-full h-10">
                        <SelectValue placeholder="Select mandatory status" />
                      </SelectTrigger>
                      <SelectContent>
                        {MANDATORY_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            )}
          </Card>
          <FormFooter>
            <Button onClick={handleSaveCoreConfig} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Configuration"
              )}
            </Button>
          </FormFooter>
        </>
      ) : (
        <>
          <Card className="p-6">
            <div className="mb-6">
              <h2 className="text-lg font-semibold">Custom Values</h2>
              <p className="text-sm text-muted-foreground">
                Add or manage custom expense fields here.
              </p>
            </div>

            {templates.length === 0 ? (
              <p className="text-sm text-gray-600 py-4">
                No templates found. Please refresh the page.
              </p>
            ) : (
              <div className="flex flex-col gap-4">
                <div className="space-y-3">
                  {customFields.length === 0 && (
                    <p className="text-sm text-gray-600">
                      No custom values added.
                    </p>
                  )}

                  {customFields.map((row, idx) => (
                    <div
                      key={idx}
                      className="grid grid-cols-3 gap-4 items-center border-b pb-3 pt-3"
                    >
                      <div>
                        {entitiesLoading ? (
                          <div className="flex items-center gap-2 p-2">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span className="text-sm text-gray-500">
                              Loading entities...
                            </span>
                          </div>
                        ) : (
                          <Select
                            value={row.entityId}
                            onValueChange={(v) =>
                              updateCustomField(idx, { entityId: v })
                            }
                            disabled={entitiesLoading}
                          >
                            <SelectTrigger className="w-full h-10">
                              <SelectValue placeholder="Select entity" />
                            </SelectTrigger>
                            <SelectContent>
                              {availableEntities.length > 0 ? (
                                availableEntities.map((entity) => (
                                  <SelectItem key={entity.id} value={entity.id}>
                                    {entity.display_name || entity.name}
                                  </SelectItem>
                                ))
                              ) : (
                                <SelectItem value="no-entities" disabled>
                                  {emptyStateMessage}
                                </SelectItem>
                              )}
                            </SelectContent>
                          </Select>
                        )}
                      </div>

                      <div>
                        <Select
                          value={row.mandatory}
                          onValueChange={(v) =>
                            updateCustomField(idx, { mandatory: v })
                          }
                        >
                          <SelectTrigger className="w-full h-10">
                            <SelectValue placeholder="Mandatory" />
                          </SelectTrigger>
                          <SelectContent>
                            {MANDATORY_OPTIONS.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex gap-2 flex-wrap">
                          {row.categories.length > 0 ? (
                            row.categories.map((c, i) => (
                              <div
                                key={i}
                                className="px-3 py-1 rounded bg-gray-200 text-sm"
                              >
                                {c}
                              </div>
                            ))
                          ) : (
                            <span className="text-xs text-gray-400 italic">
                              Categories (read-only)
                            </span>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          onClick={() => removeCustomField(idx)}
                        >
                          Remove
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-4">
                  <Button
                    variant="link"
                    onClick={addCustomField}
                    className="text-sm text-blue-600"
                  >
                    Add Custom Field
                  </Button>
                </div>

                <AssignedEntitiesList
                  assignedEntities={assignedEntities}
                  entities={entities}
                />
              </div>
            )}
          </Card>
          <FormFooter>
            <Button
              variant="outline"
              className="px-6 py-2"
              onClick={handleCancel}
              disabled={loading}
            >
              Back
            </Button>
            <Button onClick={handleSubmitCustom} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                "Submit"
              )}
            </Button>
          </FormFooter>
        </>
      )}
    </>
  );
};

export default StoreMaster;
