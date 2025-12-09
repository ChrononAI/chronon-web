import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { policyRulesService } from "@/services/admin/policyRulesService";
import { expenseService } from "@/services/expenseService";
import { Policy } from "@/types/expense";
import { ArrowLeft } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useCategoryLimitStore } from "@/store/admin/categoryLimitStore";
import { Rule } from "./CreateCategoryLimitPage";

const operators = [
  { name: "Equals", value: "EQUALS" },
  { name: "Not Equals", value: "NOT_EQUAL" },
  { name: "In", value: "IN" },
  { name: "Not In", value: "NOT_IN" },
  { name: "Greater Than", value: "GREATER_THEN" },
  { name: "Less Than", value: "LESS_THEN" },
];

const limitTypes = [
  { name: "Daily", value: "DAILY" },
  { name: "Monthly", value: "MONTHLY" },
  { name: "Annual", value: "ANNUAL" },
  { name: "As Per Actuals", value: "AS_PER_ACTUALS" },
];

function ConditionRow({ i, r, updateCondition, entities }: any) {
  const selectedEntity = entities.find((ent: any) => r.field === ent.id);
  const selectedAttribute = selectedEntity?.attributes?.find(
    (attr: any) => attr.id === r.value
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 my-4" key={i}>
      <Select
        value={r?.field || ""}
        onValueChange={(value) => updateCondition(i, "field", value)}
      >
        <SelectTrigger>
          <SelectValue placeholder="Select an entity">
            {selectedEntity?.name ?? "Select an entity"}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {entities.map((entity: any) => (
            <SelectItem key={entity.id} value={entity.id}>
              <div>
                <div className="font-medium">{entity.name}</div>
                {entity.description && (
                  <div className="text-sm text-muted-foreground">
                    {entity.description}
                  </div>
                )}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={r.operator || ""}
        onValueChange={(value: string) => updateCondition(i, "operator", value)}
      >
        <SelectTrigger>
          <SelectValue placeholder="Select an operator">
            {r.operator}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {operators.map((operator) => (
            <SelectItem key={operator.value} value={operator.value}>
              {operator.value}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={r?.value || ""}
        onValueChange={(value: string) => updateCondition(i, "value", value)}
      >
        <SelectTrigger>
          <SelectValue placeholder="Select a value">
            {selectedAttribute?.display_value ?? "Select a value"}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {selectedEntity?.attributes?.length ? (
            selectedEntity.attributes.map((attr: any) => (
              <SelectItem key={attr.id} value={attr.id}>
                {attr.display_value}
              </SelectItem>
            ))
          ) : (
            <SelectItem disabled value="none">
              Select an entity
            </SelectItem>
          )}
        </SelectContent>
      </Select>
    </div>
  );
}

export default function EditCategoryLimitPage() {
  const navigate = useNavigate();
  const { selectedLimit } = useCategoryLimitStore();

  // Clean rule before loading
  const stripUserPrefix = (policy: any) => ({
    ...policy,
    conditions: {
      ...policy.conditions,
      rules: policy.conditions.rules?.map((rule: any) => ({
        ...rule,
        field: rule.field.startsWith("user.")
          ? rule.field.replace(/^user\./, "")
          : rule.field,
      })),
    },
  });

  const cleanedPolicy = stripUserPrefix(selectedLimit);

  const [entities, setEntities] = useState<any[]>([]);
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [rules, setRules] = useState<any>(cleanedPolicy);
  const [loading, setLoading] = useState(true);

  const getData = async () => {
    try {
      const [entitiesRes, policiesRes] = await Promise.all([
        policyRulesService.getEntities(),
        expenseService.getAllPolicies(),
      ]);
      setEntities(entitiesRes.data.data);
      setPolicies(policiesRes);
    } catch (error) {
      console.error(error);
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getData();
  }, []);

  const addCondition = () => {
    setRules((prev: any) => ({
      ...prev,
      conditions: {
        ...prev.conditions,
        rules: [
          ...prev?.conditions?.rules,
          {
            field: "",
            operator: "EQUALS",
            value: "",
          },
        ],
      },
    }));
  };

  const updateCondition = (index: number, key: string, value: any) => {
    setRules((prev: any) => {
      const updated = [...prev.conditions.rules];
      updated[index] = { ...updated[index], [key]: value };
      return {
        ...prev,
        conditions: { ...prev.conditions, rules: updated },
      };
    });
  };

  const togglePolicy = (policyId: string) => {
    setRules((prev: Rule) => {
      const current = { ...prev.rule_limits };
      if (current[policyId]) delete current[policyId];
      else current[policyId] = {};
      return { ...prev, rule_limits: current };
    });
  };

  const handleLimitChange = (
    policyId: string,
    categoryId: string,
    key: string,
    value: any
  ) => {
    setRules((prev: any) => ({
      ...prev,
      rule_limits: {
        ...prev.rule_limits,
        [policyId]: {
          ...prev.rule_limits[policyId],
          [categoryId]: {
            ...prev.rule_limits[policyId]?.[categoryId],
            [key]: value,
          },
        },
      },
    }));
  };

  const removeSystemFields = (data: any): unknown => {
    if (Array.isArray(data)) {
      return data.map(removeSystemFields);
    } else if (data && typeof data === "object") {
      const cleaned: any = {};
      for (const key in data) {
        if (
          ![
            "created_at",
            "created_by",
            "updated_at",
            "updated_by",
            "id",
            "org_id",
          ].includes(key)
        ) {
          cleaned[key] = removeSystemFields(data[key]);
        }
      }
      return cleaned;
    }
    return data;
  };

  function removeLimitValuesForPerDiem(rule: any, policies: Policy[]) {
    // Find the Per Diem policy
    const perDiemPolicy = policies.find((p) => p.name === "Per Diem");
    if (!perDiemPolicy) return rule; // no such policy

    const policyId = perDiemPolicy.id;

    // If rule_limits or this policy id doesn't exist, just return the original rule
    if (!rule.rule_limits || !rule.rule_limits[policyId]) return rule;

    // Deep clone the rule to avoid mutation
    const updatedRule = structuredClone(rule);

    const limits = updatedRule.rule_limits[policyId];
    for (const catId in limits) {
      if (limits[catId]?.hasOwnProperty("limit_value")) {
        delete limits[catId].limit_value;
      }
    }

    return updatedRule;
  }

  const handleSave = async () => {
    try {
      const newRules = removeLimitValuesForPerDiem(rules, policies);
      setRules(newRules);
      const payload = {
        ...rules,
        conditions: {
          ...rules.conditions,
          rules: rules.conditions.rules.map((rule: any) => ({
            ...rule,
            field: `user.${rule.field}`,
          })),
        },
      };
      const newPayload = removeSystemFields(payload);
      await policyRulesService.updatePolicyRule(rules.id, newPayload);
      toast.success("Policy rule updated successfully");
      setTimeout(() => {
        navigate("/admin-settings/product-config/category-limits");
      }, 100);
    } catch (error: any) {
      console.error(error);
      toast.error(error?.response?.data?.message || "Update failed");
    }
  };

  if (loading || !rules) {
    return (
      <div className="flex items-center justify-center py-20">
        <div>Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center mb-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(-1)}
          className="mr-4"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-bold flex-1">Edit Policy Rule</h1>
        <Button onClick={handleSave}>Save</Button>
      </div>

      {/* === Rule name & description === */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Input
          placeholder="Enter name"
          value={rules.name}
          onChange={(e) => setRules({ ...rules, name: e.target.value })}
        />
        <Input
          placeholder="Enter description"
          value={rules.description}
          onChange={(e) => setRules({ ...rules, description: e.target.value })}
        />
      </div>

      {/* === Conditions === */}
      <h2 className="text-xl font-medium mt-6">Conditions</h2>
      {rules.conditions.rules?.map((r: any, i: number) => (
        <ConditionRow
          key={i}
          i={i}
          r={r}
          updateCondition={updateCondition}
          entities={entities}
        />
      ))}
      <Button type="button" variant="outline" onClick={addCondition}>
        + Add Condition
      </Button>

      <div className="flex flex-wrap gap-2 mb-3">
        {policies.map((p) => {
          const isSelected = !!rules.rule_limits[p.id];
          return (
            <Button
              key={p.id}
              color={isSelected ? "primary" : "inherit"}
              className={`${
                isSelected
                  ? "bg-primary text-white"
                  : "bg-white text-primary hover:bg-primary hover:text-white"
              }`}
              onClick={() => togglePolicy(p.id)}
            >
              {p.name}
            </Button>
          );
        })}
      </div>

      {/* === Category limits === */}
      <h2 className="text-xl font-medium mt-6">Category Limits</h2>
      {Object.keys(rules.rule_limits || {}).map((policyId) => {
        const policy = policies.find((p: any) => p.id === policyId);
        if (!policy) return null;

        return (
          <Card className="p-6 mb-3" key={policy.id}>
            <span className="mb-2 block font-medium">{policy.name}</span>
            {policy.categories.map((cat) => {
              const current = rules.rule_limits[policyId]?.[cat.id] || {};
              return (
                <div
                  key={cat.id}
                  className="grid grid-cols-1 lg:grid-cols-3 gap-6 my-3"
                >
                  <Label className="flex items-center">{cat.name}</Label>
                  <div>
                    <Select
                      value={current.limit_type || ""}
                      onValueChange={(value) =>
                        handleLimitChange(policyId, cat.id, "limit_type", value)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a limit">
                          {current.limit_type ?? "Select a limit"}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {limitTypes.map((limit) => (
                          <SelectItem key={limit.value} value={limit.value}>
                            {limit.value}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {current.limit_type !== "AS_PER_ACTUALS" && (
                    <Input
                      type="number"
                      value={
                        (policy.name === "Per Diem"
                          ? current.per_diem_rate
                          : current.limit_value) || ""
                      }
                      placeholder="Enter value"
                      onChange={(e) =>
                        handleLimitChange(
                          policyId,
                          cat.id,
                          policy.name === "Per Diem"
                            ? "per_diem_rate"
                            : "limit_value",
                          Number(e.target.value)
                        )
                      }
                    />
                  )}
                </div>
              );
            })}
          </Card>
        );
      })}
    </div>
  );
}
