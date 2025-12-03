import { useState } from 'react';
import { 
  Plus, 
  Trash2, 
  Settings,
  Save,
  RotateCcw
} from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';

interface ApprovalRule {
  id: string;
  name: string;
  conditions: Condition[];
  actions: Action[];
}

interface Condition {
  id: string;
  field: string;
  operator: string;
  value: string;
  logicalOperator?: 'AND' | 'OR';
}

interface Action {
  id: string;
  type: 'REQUIRE_APPROVAL' | 'AUTO_APPROVE';
  level?: number;
  approver?: string;
}

const departments = [
  'Business development',
  'Operations',
  'Sales',
  'Marketing',
  'HR',
  'Finance',
  'Any Department'
];

const approvers = [
  'Ankeet Kavalya',
  'Uploader\'s Manager',
  'Mohit Rangaraju',
  'Department Head',
  'Finance Manager'
];

const operators = [
  { value: '=', label: 'equals' },
  { value: '>', label: 'greater than' },
  { value: '<', label: 'less than' },
  { value: '>=', label: 'greater than or equal' },
  { value: '<=', label: 'less than or equal' },
  { value: '!=', label: 'not equal' }
];

export function ApprovalRulesPage() {
  const [rules, setRules] = useState<ApprovalRule[]>([
    {
      id: '1',
      name: 'Rule 1',
      conditions: [
        {
          id: '1-1',
          field: 'Department',
          operator: '=',
          value: 'Business development',
          logicalOperator: 'AND'
        },
        {
          id: '1-2',
          field: 'Amount',
          operator: '>=',
          value: '₹2,50,000.00'
        }
      ],
      actions: [
        {
          id: '1-a1',
          type: 'REQUIRE_APPROVAL',
          level: 1,
          approver: 'Ankeet Kavalya'
        }
      ]
    },
    {
      id: '2',
      name: 'Rule 2',
      conditions: [
        {
          id: '2-1',
          field: 'Department',
          operator: '=',
          value: 'Operations',
          logicalOperator: 'AND'
        },
        {
          id: '2-2',
          field: 'Amount',
          operator: '<=',
          value: '₹2,50,000.00'
        }
      ],
      actions: [
        {
          id: '2-a1',
          type: 'AUTO_APPROVE'
        }
      ]
    },
    {
      id: '3',
      name: 'Rule 3',
      conditions: [
        {
          id: '3-1',
          field: 'Department',
          operator: '=',
          value: 'Any Department',
          logicalOperator: 'AND'
        },
        {
          id: '3-2',
          field: 'Amount',
          operator: '>=',
          value: '₹2,50,000.00'
        }
      ],
      actions: [
        {
          id: '3-a1',
          type: 'REQUIRE_APPROVAL',
          level: 1,
          approver: 'Uploader\'s Manager'
        },
        {
          id: '3-a2',
          type: 'REQUIRE_APPROVAL',
          level: 2,
          approver: 'Mohit Rangaraju'
        }
      ]
    }
  ]);

  const addRule = () => {
    const newRule: ApprovalRule = {
      id: Date.now().toString(),
      name: `Rule ${rules.length + 1}`,
      conditions: [
        {
          id: `${Date.now()}-1`,
          field: 'Department',
          operator: '=',
          value: '',
          logicalOperator: 'AND'
        },
        {
          id: `${Date.now()}-2`,
          field: 'Amount',
          operator: '>=',
          value: ''
        }
      ],
      actions: [
        {
          id: `${Date.now()}-a1`,
          type: 'REQUIRE_APPROVAL',
          level: 1,
          approver: ''
        }
      ]
    };
    setRules([...rules, newRule]);
  };

  const deleteRule = (ruleId: string) => {
    setRules(rules.filter(rule => rule.id !== ruleId));
  };

  const updateCondition = (ruleId: string, conditionId: string, field: string, value: string) => {
    setRules(rules.map(rule => {
      if (rule.id === ruleId) {
        return {
          ...rule,
          conditions: rule.conditions.map(condition => {
            if (condition.id === conditionId) {
              return { ...condition, [field]: value };
            }
            return condition;
          })
        };
      }
      return rule;
    }));
  };

  const updateAction = (ruleId: string, actionId: string, field: string, value: string) => {
    setRules(rules.map(rule => {
      if (rule.id === ruleId) {
        return {
          ...rule,
          actions: rule.actions.map(action => {
            if (action.id === actionId) {
              return { ...action, [field]: value };
            }
            return action;
          })
        };
      }
      return rule;
    }));
  };

  const addApprovalLevel = (ruleId: string) => {
    setRules(rules.map(rule => {
      if (rule.id === ruleId) {
        const newLevel = rule.actions.filter(a => a.type === 'REQUIRE_APPROVAL').length + 1;
        const newAction: Action = {
          id: `${Date.now()}-a${newLevel}`,
          type: 'REQUIRE_APPROVAL',
          level: newLevel,
          approver: ''
        };
        return {
          ...rule,
          actions: [...rule.actions, newAction]
        };
      }
      return rule;
    }));
  };

  const removeApprovalLevel = (ruleId: string, actionId: string) => {
    setRules(rules.map(rule => {
      if (rule.id === ruleId) {
        return {
          ...rule,
          actions: rule.actions.filter(action => action.id !== actionId)
        };
      }
      return rule;
    }));
  };

  const saveRules = () => {
    toast.success('Approval rules saved successfully!');
  };

  const resetRules = () => {
    // Reset to default rules
    toast.info('Rules reset to default configuration');
  };

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Settings className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-3xl font-bold">Approval Rules Config</h1>
                <p className="text-muted-foreground">Configure approval workflows for expense reports</p>
              </div>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={resetRules}>
                <RotateCcw className="h-4 w-4 mr-2" />
                Reset
              </Button>
              <Button onClick={saveRules}>
                <Save className="h-4 w-4 mr-2" />
                Save Rules
              </Button>
            </div>
          </div>
        </div>

        {/* Rules */}
        <div className="space-y-6">
          {rules.map((rule) => (
            <Card key={rule.id} className="relative">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg text-muted-foreground">
                    {rule.name}
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteRule(rule.id)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Conditions */}
                <div className="space-y-4">
                  {rule.conditions.map((condition, conditionIndex) => (
                    <div key={condition.id} className="flex items-center gap-4 p-4 bg-muted/30 rounded-lg">
                      {conditionIndex === 0 && (
                        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground min-w-[40px]">
                          <div className="w-6 h-6 bg-primary/10 rounded flex items-center justify-center">
                            <span className="text-xs">If</span>
                          </div>
                        </div>
                      )}
                      {conditionIndex > 0 && (
                        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground min-w-[40px]">
                          <Badge variant="outline" className="text-xs">
                            {condition.logicalOperator}
                          </Badge>
                        </div>
                      )}
                      
                      <Select
                        value={condition.field}
                        onValueChange={(value) => updateCondition(rule.id, condition.id, 'field', value)}
                      >
                        <SelectTrigger className="w-[140px]">
                          <SelectValue placeholder="Field" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Department">Department</SelectItem>
                          <SelectItem value="Amount">Amount</SelectItem>
                          <SelectItem value="Category">Category</SelectItem>
                        </SelectContent>
                      </Select>

                      <Select
                        value={condition.operator}
                        onValueChange={(value) => updateCondition(rule.id, condition.id, 'operator', value)}
                      >
                        <SelectTrigger className="w-[120px]">
                          <SelectValue placeholder="Operator" />
                        </SelectTrigger>
                        <SelectContent>
                          {operators.map((op) => (
                            <SelectItem key={op.value} value={op.value}>
                              {op.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      {condition.field === 'Department' ? (
                        <Select
                          value={condition.value}
                          onValueChange={(value) => updateCondition(rule.id, condition.id, 'value', value)}
                        >
                          <SelectTrigger className="w-[200px]">
                            <SelectValue placeholder="Select department" />
                          </SelectTrigger>
                          <SelectContent>
                            {departments.map((dept) => (
                              <SelectItem key={dept} value={dept}>
                                {dept}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Input
                          value={condition.value}
                          onChange={(e) => updateCondition(rule.id, condition.id, 'value', e.target.value)}
                          placeholder="Enter value"
                          className="w-[200px]"
                        />
                      )}
                    </div>
                  ))}
                </div>

                <Separator />

                {/* Actions */}
                <div className="space-y-4">
                  {rule.actions.map((action) => (
                    <div key={action.id} className="flex items-center gap-4 p-4 bg-green-50/50  rounded-lg border border-green-200/50 ">
                      {action.type === 'REQUIRE_APPROVAL' ? (
                        <>
                          <div className="flex items-center gap-2 text-sm font-medium text-green-700  min-w-[80px]">
                            <div className="w-6 h-6 bg-green-100  rounded-full flex items-center justify-center">
                              <span className="text-xs">○</span>
                            </div>
                            Requires
                          </div>
                          
                          <span className="text-sm text-green-700 ">
                            Level {action.level} Approval from
                          </span>
                          
                          <span className="text-sm font-medium text-green-700 ">=</span>
                          
                          <Select
                            value={action.approver}
                            onValueChange={(value) => updateAction(rule.id, action.id, 'approver', value)}
                          >
                            <SelectTrigger className="w-[200px] border-green-200 ">
                              <SelectValue placeholder="Select approver" />
                            </SelectTrigger>
                            <SelectContent>
                              {approvers.map((approver) => (
                                <SelectItem key={approver} value={approver}>
                                  {approver}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>

                          {rule.actions.filter(a => a.type === 'REQUIRE_APPROVAL').length > 1 && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeApprovalLevel(rule.id, action.id)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </>
                      ) : (
                        <div className="flex items-center gap-2 text-sm font-medium text-green-700 ">
                          <div className="w-6 h-6 bg-green-100  rounded-full flex items-center justify-center">
                            <span className="text-xs">○</span>
                          </div>
                          <span className="text-green-600  font-medium cursor-pointer hover:underline">
                            Auto Approve
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                  
                  {/* Add approval level button */}
                  {rule.actions.some(a => a.type === 'REQUIRE_APPROVAL') && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => addApprovalLevel(rule.id)}
                      className="border-dashed"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Approval Level
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}

          {/* Add Rule Button */}
          <Card className="border-dashed border-2 hover:border-primary/50 transition-colors">
            <CardContent className="p-8">
              <Button
                variant="ghost"
                onClick={addRule}
                className="w-full h-16 border-dashed border-2 border-muted-foreground/25 hover:border-primary/50 hover:bg-primary/5"
              >
                <Plus className="h-6 w-6 mr-2" />
                Add New Rule
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}