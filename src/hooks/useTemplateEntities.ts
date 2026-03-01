import { useEffect, useState, useCallback } from "react";
import { UseFormReturn } from "react-hook-form";
import { getTemplates } from "@/services/admin/templates";
import { getEntities, type Entity } from "@/services/admin/entities";

interface TemplateEntity {
  entity_id?: string;
  id?: string;
  display_name?: string;
  field_name?: string;
  field_type?: string;
  is_mandatory?: boolean;
}

const getEntityId = (entity: TemplateEntity): string => {
  return entity?.entity_id || entity?.id || "";
};

export function useTemplateEntities(
  form: UseFormReturn<any>,
  moduleType: "expense" | "mileage" | "per_diem",
  expenseData?: any
) {
  const [templateEntities, setTemplateEntities] = useState<TemplateEntity[]>(
    []
  );
  const [entityOptions, setEntityOptions] = useState<
    Record<string, Array<{ id: string; label: string }>>
  >({});
  const [entityDropdownOpen, setEntityDropdownOpen] = useState<
    Record<string, boolean>
  >({});

  useEffect(() => {
    const loadTemplates = async () => {
      try {
        const [templatesRes, entitiesRes] = await Promise.all([
          getTemplates(),
          getEntities(),
        ]);

        const template = Array.isArray(templatesRes)
          ? templatesRes.find((t) => t.module_type === moduleType)
          : null;

        if (template?.entities) {
          setTemplateEntities(template.entities);

          template.entities.forEach((entity) => {
            const entityId = getEntityId(entity);
            if (entityId) {
              const currentValue = form.getValues(entityId as any);
              if (currentValue === undefined || currentValue === null) {
                form.setValue(entityId as any, "");
              }
            }
          });
        }

        const entityMap: Record<
          string,
          Array<{ id: string; label: string }>
        > = {};
        entitiesRes.forEach((ent: Entity) => {
          if (ent.id && Array.isArray(ent.attributes)) {
            entityMap[ent.id] = ent.attributes.map((attr) => ({
              id: attr.id,
              label: attr.display_value ?? attr.value ?? "—",
            }));
          }
        });

        const mappedOptions: Record<
          string,
          Array<{ id: string; label: string }>
        > = {};
        template?.entities?.forEach((entity) => {
          const entityId = getEntityId(entity);
          if (entityId) {
            mappedOptions[entityId] = entityMap[entityId] || [];
          }
        });

        setEntityOptions(mappedOptions);
      } catch (error) {
        console.error("Failed to load templates:", error);
      }
    };

    loadTemplates();
  }, [form, moduleType]);

  useEffect(() => {
    if (expenseData && templateEntities.length > 0 && expenseData.custom_attributes) {
      Object.entries(expenseData.custom_attributes).forEach(
        ([entityId, value]) => {
          if (
            entityId &&
            value !== null &&
            value !== undefined &&
            value !== ""
          ) {
            const entityExists = templateEntities.some(
              (entity) => getEntityId(entity) === entityId
            );
            if (entityExists) {
              form.setValue(entityId as any, String(value));
            }
          }
        }
      );
    }
  }, [expenseData, templateEntities, form]);

  const extractCustomAttributes = useCallback(
    async (): Promise<Record<string, string>> => {
      let entitiesToUse = templateEntities;
      if (!entitiesToUse || entitiesToUse.length === 0) {
        try {
          const templates = await getTemplates();
          const template = Array.isArray(templates)
            ? templates.find((t) => t.module_type === moduleType)
            : null;
          if (template?.entities) {
            entitiesToUse = template.entities;
          }
        } catch (error) {
          console.error("Failed to load template entities:", error);
        }
      }

      const customAttributes: Record<string, string> = {};
      if (entitiesToUse && entitiesToUse.length > 0) {
        const entityIdSet = new Set(
          entitiesToUse.map((entity) => getEntityId(entity)).filter(Boolean)
        );

        const allFormValues = form.getValues() as Record<string, any>;
        Object.keys(allFormValues).forEach((key) => {
          if (entityIdSet.has(key) && allFormValues[key]) {
            const value = String(allFormValues[key]).trim();
            if (value) {
              customAttributes[key] = value;
            }
          }
        });
      }

      return customAttributes;
    },
    [templateEntities, form, moduleType]
  );

  return {
    templateEntities,
    entityOptions,
    entityDropdownOpen,
    setEntityDropdownOpen,
    extractCustomAttributes,
  };
}
