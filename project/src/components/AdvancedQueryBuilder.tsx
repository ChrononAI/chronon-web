import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { X, Plus, Copy, Play, Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import AutocompleteField from './AutocompleteField';

interface FieldSchema {
  name: string;
  type: string;
  attributes: string[];
  values?: Record<string, string[]>;
}

interface ParsedCondition {
  field: string;
  operator: string;
  value: string;
}

interface ParsedAction {
  recipient: string;
}

const fieldSchemas: FieldSchema[] = [
  {
    name: 'employee',
    type: 'object',
    attributes: ['level', 'role', 'department', 'manager', 'salary'],
    values: {
      level: ['L1', 'L2', 'L3', 'L4', 'L5'],
      role: ['Developer', 'Senior Developer', 'Tech Lead', 'Manager', 'Director'],
      department: ['Engineering', 'Sales', 'Marketing', 'Finance', 'HR']
    }
  },
  {
    name: 'expense',
    type: 'object',
    attributes: ['amount', 'category', 'date', 'description'],
    values: {
      category: ['food', 'travel', 'office', 'software', 'hardware', 'training']
    }
  },
  {
    name: 'project',
    type: 'object',
    attributes: ['name', 'status', 'priority', 'deadline'],
    values: {
      status: ['active', 'completed', 'on-hold', 'cancelled'],
      priority: ['low', 'medium', 'high', 'critical']
    }
  }
];

const operators = ['==', '!=', '<', '<=', '>', '>=', 'contains', 'startsWith', 'endsWith'];

const recipients = [
  'ReportingManager',
  'ReportingManager.Manager',
  'Finance',
  'HR',
  'CEO',
  'Admin',
  'SecurityTeam',
  'ComplianceTeam'
];

const AdvancedQueryBuilder: React.FC = () => {
  const [queryText, setQueryText] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const { toast } = useToast();

  const generateFieldOptions = () => {
    const options: Array<{ value: string; label: string; description?: string }> = [];
    
    fieldSchemas.forEach(schema => {
      schema.attributes.forEach(attr => {
        const fieldName = `${schema.name}.${attr}`;
        options.push({
          value: fieldName,
          label: fieldName,
          description: `${schema.name} ${attr}`
        });
      });
    });

    return options;
  };

  const getFieldValues = (fieldPath: string) => {
    const [objectName, attribute] = fieldPath.split('.');
    const schema = fieldSchemas.find(s => s.name === objectName);
    return schema?.values?.[attribute] || [];
  };

  const parseQuery = (query: string) => {
    const conditions: ParsedCondition[] = [];
    const actions: ParsedAction[] = [];

    // Simple regex parsing for demo purposes
    const conditionRegex = /\(([^)]+)\)/g;
    const matches = query.match(conditionRegex);
    
    if (matches) {
      matches.forEach(match => {
        const content = match.slice(1, -1); // Remove parentheses
        
        if (content.includes('==') || content.includes('!=') || content.includes('<') || content.includes('>')) {
          const parts = content.split(/\s*(==|!=|<=|>=|<|>)\s*/);
          if (parts.length >= 3) {
            conditions.push({
              field: parts[0].trim(),
              operator: parts[1].trim(),
              value: parts[2].trim()
            });
          }
        } else if (recipients.includes(content)) {
          actions.push({ recipient: content });
        }
      });
    }

    return { conditions, actions };
  };

  const buildQuery = () => {
    // This would be called when user wants to build visually
    const sampleQuery = `IF (employee.level == L1) AND (category == food) AND (expense.amount < 5000) THEN SEND TO (ReportingManager) THEN (Finance)`;
    setQueryText(sampleQuery);
    setIsEditing(true);
  };

  const executeQuery = () => {
    if (!queryText.trim()) {
      toast({
        title: "Empty Query",
        description: "Please enter a query to execute.",
        variant: "destructive"
      });
      return;
    }

    const { conditions, actions } = parseQuery(queryText);
    
    toast({
      title: "Query Executed",
      description: `Parsed ${conditions.length} conditions and ${actions.length} actions.`,
    });

    console.log('Parsed Query:', { conditions, actions });
  };

  const saveQuery = () => {
    if (!queryText.trim()) {
      toast({
        title: "Empty Query",
        description: "Please enter a query to save.",
        variant: "destructive"
      });
      return;
    }

    // Here you would save to backend/local storage
    localStorage.setItem('savedQuery', queryText);
    
    toast({
      title: "Query Saved",
      description: "Your query has been saved successfully.",
    });
  };

  const copyQuery = () => {
    if (!queryText.trim()) {
      toast({
        title: "Empty Query",
        description: "No query to copy.",
        variant: "destructive"
      });
      return;
    }

    navigator.clipboard.writeText(queryText);
    toast({
      title: "Query Copied",
      description: "Query copied to clipboard.",
    });
  };

  return (
    <div className="w-full max-w-6xl mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span>Advanced Query Builder</span>
              <Badge variant="secondary">Professional</Badge>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={buildQuery}
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Build Query
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={executeQuery}
                className="flex items-center gap-2"
              >
                <Play className="h-4 w-4" />
                Execute
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={saveQuery}
                className="flex items-center gap-2"
              >
                <Save className="h-4 w-4" />
                Save
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={copyQuery}
                className="flex items-center gap-2"
              >
                <Copy className="h-4 w-4" />
                Copy
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Query Input */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Query Expression</label>
            <Textarea
              placeholder="Enter your query here... e.g., IF (employee.level == L1) AND (category == food) THEN SEND TO (ReportingManager)"
              value={queryText}
              onChange={(e) => setQueryText(e.target.value)}
              className="min-h-32 font-mono text-sm"
            />
          </div>

          {/* Query Builder Helper */}
          <Card className="bg-muted/50">
            <CardContent className="p-4">
              <h3 className="font-semibold mb-3">Quick Builder</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">
                    Available Fields
                  </label>
                  <AutocompleteField
                    placeholder="e.g., employee.level"
                    options={generateFieldOptions()}
                    onChange={(value) => {
                      const cursorPos = document.querySelector('textarea')?.selectionStart || 0;
                      const newText = queryText.slice(0, cursorPos) + value + queryText.slice(cursorPos);
                      setQueryText(newText);
                    }}
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">
                    Operators
                  </label>
                  <AutocompleteField
                    placeholder="Select operator"
                    options={operators.map(op => ({ value: op, label: op }))}
                    onChange={(value) => {
                      const cursorPos = document.querySelector('textarea')?.selectionStart || 0;
                      const newText = queryText.slice(0, cursorPos) + ` ${value} ` + queryText.slice(cursorPos);
                      setQueryText(newText);
                    }}
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">
                    Recipients
                  </label>
                  <AutocompleteField
                    placeholder="Select recipient"
                    options={recipients.map(r => ({ value: r, label: r }))}
                    onChange={(value) => {
                      const cursorPos = document.querySelector('textarea')?.selectionStart || 0;
                      const newText = queryText.slice(0, cursorPos) + `(${value})` + queryText.slice(cursorPos);
                      setQueryText(newText);
                    }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Syntax Guide */}
          <Card>
            <CardContent className="p-4">
              <h3 className="font-semibold mb-3">Syntax Guide</h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <Badge variant="outline">IF</Badge>
                  <span>Start condition block</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">AND / OR</Badge>
                  <span>Logical operators</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">THEN</Badge>
                  <span>Start action block</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">SEND TO</Badge>
                  <span>Send to recipient</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">(field operator value)</Badge>
                  <span>Condition format</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">(recipient)</Badge>
                  <span>Action format</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Field Reference */}
          <Card>
            <CardContent className="p-4">
              <h3 className="font-semibold mb-3">Field Reference</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                {fieldSchemas.map(schema => (
                  <div key={schema.name} className="space-y-2">
                    <h4 className="font-medium text-primary">{schema.name}</h4>
                    <div className="space-y-1">
                      {schema.attributes.map(attr => (
                        <div key={attr} className="flex items-center gap-2">
                          <code className="text-xs bg-muted px-1 rounded">
                            {schema.name}.{attr}
                          </code>
                          {schema.values?.[attr] && (
                            <div className="flex flex-wrap gap-1">
                              {schema.values[attr].slice(0, 3).map(value => (
                                <Badge key={value} variant="secondary" className="text-xs">
                                  {value}
                                </Badge>
                              ))}
                              {schema.values[attr].length > 3 && (
                                <Badge variant="secondary" className="text-xs">
                                  +{schema.values[attr].length - 3} more
                                </Badge>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdvancedQueryBuilder;