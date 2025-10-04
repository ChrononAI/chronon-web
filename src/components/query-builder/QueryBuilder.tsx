import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { X, Plus, ArrowRight } from 'lucide-react';


interface Field {
  name: string;
  label: string;
  type: 'text' | 'number' | 'select';
  operators: string[];
  values?: string[];
}

interface Rule {
  id: string;
  field: string;
  operator: string;
  value: string;
}

interface ActionStep {
  id: string;
  type: 'SEND_TO';
  recipient: string;
}

interface QueryBuilderState {
  rules: Rule[];
  combinator: 'AND' | 'OR';
  actions: ActionStep[];
}

const fields: Field[] = [
  {
    name: 'employee.level',
    label: 'Employee Level',
    type: 'select',
    operators: ['==', '!='],
    values: ['L1', 'L2', 'L3', 'L4', 'L5']
  },
  {
    name: 'employee.role',
    label: 'Employee Role',
    type: 'select',
    operators: ['==', '!='],
    values: ['Developer', 'Manager', 'Director', 'VP']
  },
  {
    name: 'employee.department',
    label: 'Employee Department',
    type: 'select',
    operators: ['==', '!='],
    values: ['Engineering', 'Sales', 'Marketing', 'Finance']
  },
  {
    name: 'category',
    label: 'Category',
    type: 'select',
    operators: ['==', '!='],
    values: ['food', 'travel', 'office', 'software', 'hardware']
  },
  {
    name: 'expense.amount',
    label: 'Expense Amount',
    type: 'number',
    operators: ['<', '<=', '==', '>=', '>']
  },
  {
    name: 'expense.date',
    label: 'Expense Date',
    type: 'text',
    operators: ['==', '!=', '<', '>']
  }
];

const operatorLabels: Record<string, string> = {
  '==': 'equals',
  '!=': 'not equals',
  '<': 'less than',
  '<=': 'less than or equal',
  '>': 'greater than',
  '>=': 'greater than or equal'
};

const actionRecipients = [
  'ReportingManager',
  'ReportingManager.Manager',
  'Finance',
  'HR',
  'CEO',
  'Admin'
];

const QueryBuilder: React.FC = () => {
  const [query, setQuery] = useState<QueryBuilderState>({
    rules: [],
    combinator: 'AND',
    actions: []
  });

  const generateId = () => Math.random().toString(36).substr(2, 9);

  const addRule = () => {
    const newRule: Rule = {
      id: generateId(),
      field: '',
      operator: '',
      value: ''
    };
    setQuery(prev => ({
      ...prev,
      rules: [...prev.rules, newRule]
    }));
  };

  const removeRule = (id: string) => {
    setQuery(prev => ({
      ...prev,
      rules: prev.rules.filter(rule => rule.id !== id)
    }));
  };

  const updateRule = (id: string, updates: Partial<Rule>) => {
    setQuery(prev => ({
      ...prev,
      rules: prev.rules.map(rule => 
        rule.id === id ? { ...rule, ...updates } : rule
      )
    }));
  };

  const addAction = () => {
    const newAction: ActionStep = {
      id: generateId(),
      type: 'SEND_TO',
      recipient: ''
    };
    setQuery(prev => ({
      ...prev,
      actions: [...prev.actions, newAction]
    }));
  };

  const removeAction = (id: string) => {
    setQuery(prev => ({
      ...prev,
      actions: prev.actions.filter(action => action.id !== id)
    }));
  };

  const updateAction = (id: string, updates: Partial<ActionStep>) => {
    setQuery(prev => ({
      ...prev,
      actions: prev.actions.map(action => 
        action.id === id ? { ...action, ...updates } : action
      )
    }));
  };

  const getFieldOptions = (fieldName: string) => {
    return fields.find(f => f.name === fieldName);
  };

  const generateQueryString = () => {
    if (query.rules.length === 0) return '';
    
    const conditions = query.rules.map(rule => {
      return `(${rule.field} ${rule.operator} ${rule.value})`;
    }).join(` ${query.combinator} `);

    const actions = query.actions.map(action => 
      `(${action.recipient})`
    ).join(' THEN ');

    return `IF ${conditions}${actions.length > 0 ? ` THEN SEND TO ${actions}` : ''}`;
  };

  return (
    <div className="w-full">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span>Query Builder</span>
            <Badge variant="secondary">Advanced</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Query Preview */}
          <div className="bg-muted/50 p-4 rounded-lg">
            <h3 className="font-semibold mb-2">Query Preview:</h3>
            <code className="text-sm bg-background p-2 rounded border block">
              {generateQueryString() || 'Build your query below...'}
            </code>
          </div>

          {/* Conditions Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="font-bold text-primary">IF</span>
              <Select 
                value={query.combinator} 
                onValueChange={(value: 'AND' | 'OR') => 
                  setQuery(prev => ({ ...prev, combinator: value }))
                }
              >
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="AND">AND</SelectItem>
                  <SelectItem value="OR">OR</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Rules */}
            <div className="space-y-3">
              {query.rules.map((rule, index) => (
                <div key={rule.id} className="flex items-center gap-2 p-3 border rounded-lg">
                  {index > 0 && (
                    <Badge variant="outline" className="text-xs">
                      {query.combinator}
                    </Badge>
                  )}
                  <span className="text-sm font-medium">(</span>
                  
                  {/* Field Selector */}
                  <Select 
                    value={rule.field} 
                    onValueChange={(value) => updateRule(rule.id, { field: value, operator: '', value: '' })}
                  >
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Select field" />
                    </SelectTrigger>
                    <SelectContent>
                      {fields.map(field => (
                        <SelectItem key={field.name} value={field.name}>
                          {field.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* Operator Selector */}
                  {rule.field && (
                    <Select 
                      value={rule.operator} 
                      onValueChange={(value) => updateRule(rule.id, { operator: value })}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue placeholder="Operator" />
                      </SelectTrigger>
                      <SelectContent>
                        {getFieldOptions(rule.field)?.operators.map(op => (
                          <SelectItem key={op} value={op}>
                            {operatorLabels[op] || op}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}

                  {/* Value Input */}
                  {rule.field && rule.operator && (
                    <>
                      {getFieldOptions(rule.field)?.type === 'select' ? (
                        <Select 
                          value={rule.value} 
                          onValueChange={(value) => updateRule(rule.id, { value })}
                        >
                          <SelectTrigger className="w-40">
                            <SelectValue placeholder="Select value" />
                          </SelectTrigger>
                          <SelectContent>
                            {getFieldOptions(rule.field)?.values?.map(value => (
                              <SelectItem key={value} value={value}>
                                {value}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Input
                          type={getFieldOptions(rule.field)?.type === 'number' ? 'number' : 'text'}
                          value={rule.value}
                          onChange={(e) => updateRule(rule.id, { value: e.target.value })}
                          placeholder="Enter value"
                          className="w-40"
                        />
                      )}
                    </>
                  )}

                  <span className="text-sm font-medium">)</span>
                  
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => removeRule(rule.id)}
                    className="ml-2"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>

            <Button 
              variant="outline" 
              onClick={addRule}
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Add Condition
            </Button>
          </div>

          {/* Actions Section */}
          {query.rules.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="font-bold text-primary">THEN</span>
                <span className="font-semibold">SEND TO</span>
              </div>

              <div className="space-y-3">
                {query.actions.map((action, index) => (
                  <div key={action.id} className="flex items-center gap-2 p-3 border rounded-lg">
                    {index > 0 && (
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    )}
                    <span className="text-sm font-medium">(</span>
                    
                    <Select 
                      value={action.recipient} 
                      onValueChange={(value) => updateAction(action.id, { recipient: value })}
                    >
                      <SelectTrigger className="w-60">
                        <SelectValue placeholder="Select recipient" />
                      </SelectTrigger>
                      <SelectContent>
                        {actionRecipients.map(recipient => (
                          <SelectItem key={recipient} value={recipient}>
                            {recipient}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <span className="text-sm font-medium">)</span>
                    
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => removeAction(action.id)}
                      className="ml-2"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>

              <Button 
                variant="outline" 
                onClick={addAction}
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Add Action
              </Button>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 pt-4 border-t">
            <Button 
              onClick={() => setQuery({ rules: [], combinator: 'AND', actions: [] })}
              variant="outline"
            >
              Clear All
            </Button>
            <Button 
              onClick={() => {
                const queryString = generateQueryString();
                navigator.clipboard.writeText(queryString);
              }}
              variant="default"
            >
              Copy Query
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default QueryBuilder; 