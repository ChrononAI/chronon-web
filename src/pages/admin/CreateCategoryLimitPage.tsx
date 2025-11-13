import AdminLayout from "@/components/layout/AdminLayout";
import { Layout } from "@/components/layout/Layout";
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

interface Operator {
  name: string;
  value: string;
}

export type RuleCondition = {
  field: string;
  value: string | number | boolean;
  operator: string;
};

export type RuleAction = {
  type: string;
};

export type CategoryLimit = {
  limit_type: string;
  limit_value?: number;
  per_diem_rate?: number;
};

export type RuleLimits = {
  [policyId: string]: {
    [categoryId: string]: CategoryLimit;
  };
};

export type Rule = {
  name: string;
  description: string;
  conditions: {
    rules: RuleCondition[];
    action: RuleAction;
  };
  rule_limits: RuleLimits;
};

const operators: Operator[] = [
  {
    name: "Equals",
    value: "EQUALS",
  },
  {
    name: "Not Equals",
    value: "NOT_EQUAL",
  },
  {
    name: "In",
    value: "IN",
  },
  {
    name: "Not In",
    value: "NOT_IN",
  },
  {
    name: "Greater Than",
    value: "GREATER_THEN",
  },
  {
    name: "Less Than",
    value: "LESS_THEN",
  },
];

interface Limit {
  name: string;
  value: string;
}

const limitTypes: Limit[] = [
  {
    name: "Daily",
    value: "DAILY",
  },
  {
    name: "Monthly",
    value: "MONTHLY",
  },
  {
    name: "Annual",
    value: "ANNUAL",
  },
  {
    name: "As Per Actuals",
    value: "AS_PER_ACTUALS",
  },
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
        onValueChange={(value) => {
          updateCondition(i, "field", value);
        }}
      >
        <SelectTrigger>
          <SelectValue placeholder="Select an entity">
            {selectedEntity?.name ? selectedEntity.name : "Select an entity"}
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
        onValueChange={(value: string) => {
          updateCondition(i, "operator", value);
        }}
      >
        <SelectTrigger>
          <SelectValue placeholder="Select an operator">
            {r.operator ? r.operator : "Select an operator"}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {operators.map((operator: Operator) => (
            <SelectItem key={operator.value} value={operator.value}>
              <div>
                <div className="font-medium">{operator.value}</div>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={r?.value || ""}
        onValueChange={(value: string) => {
          updateCondition(i, "value", value);
        }}
      >
        <SelectTrigger>
          <SelectValue placeholder="Select a value">
            {selectedAttribute?.display_value
              ? selectedAttribute?.display_value
              : "Select a value"}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {selectedEntity?.attributes.length > 0 ? (
            selectedEntity?.attributes?.map((operator: any) => (
              <SelectItem key={operator.value} value={operator.id}>
                <div className="font-medium">{operator.display_value}</div>
              </SelectItem>
            ))
          ) : (
            <SelectItem key="nothing-here" disabled value="nothing-here">
              <div>Select an entity</div>
            </SelectItem>
          )}
        </SelectContent>
      </Select>
    </div>
  );
}

function CreateCategoryLimitPage() {
  const navigate = useNavigate();

  const [entities, setEntities] = useState([]);
  const [policies, setPolicies] = useState<Policy[]>([]);

  const getEntitites = async () => {
    try {
      const res = await policyRulesService.getEntities();
      setEntities(res.data.data);
    } catch (error) {
      console.log(error);
    }
  };

  const getPolicies = async () => {
    try {
      const res = await expenseService.getAllPolicies();
      setPolicies(res);
    } catch (error) {
      console.log(error);
    }
  };

  useEffect(() => {
    getEntitites();
    getPolicies();
  }, []);

  const [rules, setRules] = useState<Rule>({
    name: "",
    description: "",
    conditions: {
      rules: [
        {
          field: "",
          value: "",
          operator: "",
        },
      ],
      action: { type: "require_approval" },
    },
    rule_limits: {},
  });

  const addCondition = () => {
    setRules((prev: Rule) => ({
      ...prev,
      conditions: {
        ...prev.conditions,
        rules: [
          ...prev.conditions.rules,
          {
            field: "",
            value: "",
            operator: "EQUALS" as RuleCondition["operator"],
          },
        ],
      },
    }));
  };

  const updateCondition = <K extends keyof RuleCondition>(
    index: number,
    key: K,
    value: RuleCondition[K]
  ) => {
    setRules((prev: Rule) => {
      const updated = [...prev.conditions.rules];
      updated[index] = { ...updated[index], [key]: value };
      return {
        ...prev,
        conditions: { ...prev.conditions, rules: updated },
      };
    });
  };

  const togglePolicy = (policyId: string) => {
    setRules((prev) => {
      const current = { ...prev.rule_limits };
      if (current[policyId]) {
        delete current[policyId];
        return { ...prev, rule_limits: current };
      } else {
        const newRuleLimits = { [policyId]: {}, ...current };
        return { ...prev, rule_limits: newRuleLimits };
      }
    });
  };

  // 💰 Change limit for specific policy/category
  const handleLimitChange = (
    policyId: string,
    categoryId: string,
    key: string,
    value: string | number
  ) => {
    setRules((prev) => ({
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

  const submitRule = async () => {
    try {
      const newRules = {
        ...rules,
        conditions: {
          action: rules.conditions.action,
          rules: rules.conditions.rules.map((rule) => {
            return {
              ...rule,
              field: "user." + rule.field,
            };
          }),
        },
      };
      await policyRulesService.createPolicyRule(newRules);
      toast.success('Policy rule created successfully');
      navigate('/admin/product-config/category-limits')
    } catch (error: any) {
      console.log(error);
      toast.error(error?.response?.data?.message || error.message);
    }
  };

  return (
    <Layout noPadding>
      <AdminLayout>
        <div className="space-y-6">
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
              <h1 className="text-2xl font-bold">Create Policy Rules</h1>
            </div>
            <h2 className="text-xl font-medium">Description</h2>
            {/* === Policy name + description === */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Input
                placeholder="Enter name"
                value={rules.name}
                onChange={(e) => setRules({ ...rules, name: e.target.value })}
              />
              <Input
                placeholder="Enter description"
                value={rules.description}
                onChange={(e) =>
                  setRules({ ...rules, description: e.target.value })
                }
              />
            </div>

            {/* === Conditions === */}
            <h2 className="text-xl font-medium">Conditions</h2>

            {rules.conditions.rules.map((r, i) => (
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

            {/* === Policy selection === */}
            {policies && policies.length > 0 && (
              <h2 className="text-xl font-medium">
                Apply Rule Limits To Policies
              </h2>
            )}

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

            {/* === Category limits for each selected policy === */}
            {Object.keys(rules.rule_limits).map((policyId) => {
              const policy = policies.find((p: Policy) => p.id === policyId);
              if (!policy) return null;

              return (
                <Card className="p-6 mb-3" key={policy.id}>
                  <span className="mb-2">{policy.name}</span>

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
                              handleLimitChange(
                                policyId,
                                cat.id,
                                "limit_type",
                                value
                              )
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select a limit">
                                {current.limit_type
                                  ? current.limit_type
                                  : "Select a limit"}
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                              {limitTypes?.map((limit: Limit) => (
                                  <SelectItem
                                    key={limit.value}
                                    value={limit.value}
                                  >
                                    <div>
                                      <div className="font-medium">
                                        {limit.value}
                                      </div>
                                    </div>
                                  </SelectItem>
                                ))
                              }
                            </SelectContent>
                          </Select>
                        </div>
                        {current.limit_type !== "AS_PER_ACTUALS" && (
                          <div>
                            <Input
                              type="number"
                              value={(policy.name === "Per Diem" ? current.per_diem_rate : current.limit_value) || ""}
                              placeholder="Enter value"
                              onChange={(e) =>
                                handleLimitChange(
                                  policyId,
                                  cat.id,
                                  policy.name === "Per Diem" ? 'per_diem_rate' : "limit_value",
                                  Number(e.target.value)
                                )
                              }
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </Card>
              );
            })}
          </div>
          <div className="flex items-center justify-end">
            <Button onClick={submitRule}>Create</Button>
          </div>
        </div>
      </AdminLayout>
    </Layout>
  );
}

export default CreateCategoryLimitPage;
