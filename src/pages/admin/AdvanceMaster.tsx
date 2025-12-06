import { useState, useEffect, useMemo } from "react";
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
import { getTemplates, assignEntity } from "@/services/admin/templates";
import { getEntities } from "@/services/admin/entities";
import { toast } from "sonner";
import { FormFooter } from "@/components/layout/FormFooter";

const CORE_FIELDS = ["Advance ID"];

const MANDATORY_OPTIONS = [
  { value: "MANDATORY", label: "Mandatory" },
  { value: "NOT_MANDATORY", label: "Not mandatory" },
];

type Entity = {
  id: string;
  name: string;
  display_name?: string;
  description?: string;
  status?: string;
  is_active?: boolean;
};

const ExpenseMasterPage = () => {
  const [activeTab, setActiveTab] = useState<"core" | "custom">("core");
  const [fieldSettings, setFieldSettings] = useState<Record<string, string>>(
    {}
  );
  const [templates, setTemplates] = useState<any[]>([]);
  const [customFields, setCustomFields] = useState<
    Array<{ entityId: string; mandatory: string; categories: string[] }>
  >([]);
  const [loading, setLoading] = useState(false);
  const [entities, setEntities] = useState<Entity[]>([]);
  const [entitiesLoading, setEntitiesLoading] = useState(false);

  const handleSelectChange = (field: string, value: string) => {
    setFieldSettings((prev) => ({ ...prev, [field]: value }));
  };

  useEffect(() => {
    const load = async () => {
      try {
        const res = await getTemplates();
        setTemplates(res || []);
      } catch (e) {
        setTemplates([]);
      }
    };
    load();
  }, []);

  useEffect(() => {
    const loadEntities = async () => {
      if (activeTab === "custom") {
        setEntitiesLoading(true);
        try {
          const res = await getEntities();
          const entitiesData: Entity[] = res || [];
          setEntities(entitiesData);
        } catch (e) {
          console.error("Error fetching entities:", e);
          toast.error("Failed to fetch entities");
          setEntities([]);
        } finally {
          setEntitiesLoading(false);
        }
      }
    };
    loadEntities();
  }, [activeTab]);

  const addCustomField = () => {
    setCustomFields((prev) => [
      ...prev,
      { entityId: "", mandatory: "NOT_MANDATORY", categories: [] },
    ]);
  };

  const updateCustomField = (
    index: number,
    field: Partial<{
      entityId: string;
      mandatory: string;
      categories: string[];
    }>
  ) => {
    setCustomFields((prev) =>
      prev.map((row, i) => (i === index ? { ...row, ...field } : row))
    );
  };

  const advanceTemplate = useMemo(() => {
    return templates.find((t) => t.module_type === "advance");
  }, [templates]);

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

    if (!advanceTemplate?.id) {
      toast.error(
        "Advance template not found. Please ensure templates are loaded."
      );
      return;
    }

    setLoading(true);
    try {
      await Promise.all(
        customFields.map(async (row) => {
          if (!row.entityId) return;
          await assignEntity({
            module_template_id: advanceTemplate.id, // Use advanceTemplate.id instead of searching
            entity_id: row.entityId,
            is_mandatory: row.mandatory === "MANDATORY",
          });
        })
      );
      toast.success("Custom fields assigned successfully");
      setCustomFields([]);
      setTemplates([]);
      setActiveTab("core");
    } catch (err) {
      toast.error("Failed to assign custom fields");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Advance Masters</h1>
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

            <div className="grid grid-cols-1 gap-4">
              <div className="grid grid-cols-2 gap-4 bg-gray-50 p-3 rounded text-sm font-medium text-gray-600">
                <div>Field</div>
                <div>Mandatory</div>
              </div>

              {CORE_FIELDS.map((label) => (
                <div
                  key={label}
                  className="grid grid-cols-2 gap-4 items-center p-3 border rounded bg-white"
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
          </Card>
          <FormFooter>
            <Button>Save Configuration</Button>
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
                      <Select
                        value={row.entityId}
                        onValueChange={(v) =>
                          updateCustomField(idx, { entityId: v })
                        }
                        disabled={entitiesLoading}
                      >
                        <SelectTrigger className="w-full h-10">
                          <SelectValue
                            placeholder={
                              entitiesLoading
                                ? "Loading entities..."
                                : "Select entity"
                            }
                          />
                        </SelectTrigger>
                        <SelectContent>
                          {entities.length > 0 ? (
                            entities.map((entity) => (
                              <SelectItem key={entity.id} value={entity.id}>
                                {entity.display_name || entity.name}
                              </SelectItem>
                            ))
                          ) : (
                            <SelectItem value="no-entities" disabled>
                              {entitiesLoading
                                ? "Loading..."
                                : "No entities found"}
                            </SelectItem>
                          )}
                        </SelectContent>
                      </Select>
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
                        {row.categories.map((c, i) => (
                          <div
                            key={i}
                            className="px-3 py-1 rounded bg-gray-200 text-sm"
                          >
                            {c}
                          </div>
                        ))}
                      </div>
                      <Button
                        variant="ghost"
                        onClick={() =>
                          setCustomFields((prev) =>
                            prev.filter((_, i) => i !== idx)
                          )
                        }
                      >
                        Remove
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4">
                <a
                  className="text-sm text-blue-600 underline cursor-pointer"
                  onClick={addCustomField}
                >
                  Add
                </a>
              </div>
            </div>
          </Card>
          <FormFooter>
            <Button
              variant="outline"
              onClick={() => {
                setCustomFields([]);
                setTemplates([]);
                setActiveTab("core");
              }}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button onClick={handleSubmitCustom} disabled={loading}>
              {loading ? "Submitting..." : "Submit"}
            </Button>
          </FormFooter>
        </>
      )}
    </>
  );
};

export default ExpenseMasterPage;
