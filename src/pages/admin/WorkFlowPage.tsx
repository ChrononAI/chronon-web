import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { Layout } from '@/components/layout/Layout'
import AdminLayout from '@/components/layout/AdminLayout'
import { ReportTabs } from '@/components/reports/ReportTabs'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { ChevronDown, ChevronRight, Loader2 } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { createWorkflowConfig, getAllWorkflows, createPolicy, type WorkflowConfig } from '@/services/admin/workflows'
import { getEntities, type Entity } from '@/services/admin/entities'
import { toast } from 'sonner'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'

type TabKey = 'config' | 'rules' | 'all'
type StepType = 'direct' | 'parallel'
type ApproverIdentifier = 'REPORTING_MANAGER' | 'SKIP_LEVEL_MANAGER'
type WorkflowEvent = 'ADVANCE' | 'REPORT' | 'PRE_APPROVAL'
type Operator =
  | 'EQUALS'
  | 'NOT_EQUAL'
  | 'IN'
  | 'NOT_IN'
  | 'GREATER_THEN'
  | 'LESS_THEN'
interface Step {
  id: number
  stepName: string
  type?: StepType
  approveIdentifier?: ApproverIdentifier
  conditionEntityId: string
  conditionOperator?: Operator
  conditionAttributeId: string
}

interface RuleForm {
  name: string
  description: string
  workflowEvent?: WorkflowEvent
  workflow: string
  rule: {
    ifField: string
    operator?: Operator
    value: string
  }
}

interface FormValues {
  name: string
}

const STEP_TYPE_OPTIONS: { value: StepType; label: string }[] = [
  { value: 'direct', label: 'Direct' },
  { value: 'parallel', label: 'Parallel' },
]

const APPROVER_OPTIONS: { value: ApproverIdentifier; label: string }[] = [
  { value: 'REPORTING_MANAGER', label: 'Report manager' },
  { value: 'SKIP_LEVEL_MANAGER', label: 'Skip level manager' },
]

const OPERATOR_OPTIONS: { value: Operator; label: string }[] = [
  { value: 'EQUALS', label: 'EQUALS' },
  { value: 'NOT_EQUAL', label: 'NOT_EQUAL' },
  { value: 'IN', label: 'IN' },
  { value: 'NOT_IN', label: 'NOT_IN' },
  { value: 'GREATER_THEN', label: 'GREATER_THEN' },
  { value: 'LESS_THEN', label: 'LESS_THEN' },
]

const WORKFLOW_EVENT_OPTIONS: { value: WorkflowEvent; label: string }[] = [
  { value: 'ADVANCE', label: 'Advance' },
  { value: 'REPORT', label: 'Report' },
  { value: 'PRE_APPROVAL', label: 'Pre Approval' },
]

const HARDCODED_VALUES = {
  APPROVAL_STRATEGY: 'ANY',
  MIN_APPROVALS_REQUIRED: 1,
  TIMEOUT_HOURS: 24,
  POLICY_TYPE: 'COMPOSITE',
  ACTION_TYPE: 'require_approval',
} as const

const PREFIXES = {
  USER: 'user.',
} as const

const getErrorMessage = (error: unknown, defaultMessage: string): string => {
  if (error instanceof Error) return error.message
  if (typeof error === 'object' && error !== null && 'response' in error) {
    const response = (error as { response?: { data?: { message?: string } } }).response
    if (response?.data?.message) return response.data.message
  }
  return defaultMessage
}

const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString()
}

const getConditionValue = (step: Step): string => {
  return step.conditionAttributeId || ''
}

const WorkFlowPage = () => {
  const [activeTab, setActiveTab] = useState<TabKey>('config')
  const [steps, setSteps] = useState<Step[]>([])
  const [openSteps, setOpenSteps] = useState<Set<number>>(new Set())
  const [entities, setEntities] = useState<Entity[]>([])
  const [entitiesLoading, setEntitiesLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [workflows, setWorkflows] = useState<WorkflowConfig[]>([])
  const [workflowsLoading, setWorkflowsLoading] = useState(false)
  const [creatingRule, setCreatingRule] = useState(false)
  const isFetchingWorkflowsRef = useRef(false)
  const workflowsFetchedRef = useRef(false)
  const [ruleForm, setRuleForm] = useState<RuleForm>({
    name: '',
    description: '',
    workflowEvent: undefined,
    workflow: '',
    rule: {
      ifField: '',
      operator: undefined,
      value: '',
    },
  })

const { register, handleSubmit, reset } = useForm<FormValues>({
    defaultValues: {
      name: '',
    },
  })

  const hasParallelStep = useMemo(() => steps.some(s => s.type === 'parallel'), [steps])
  const needsEntities = useMemo(() => 
    activeTab === 'rules' || (activeTab === 'config' && hasParallelStep),
    [activeTab, hasParallelStep]
  )
  const needsWorkflows = useMemo(() => 
    activeTab === 'all' || activeTab === 'rules',
    [activeTab]
  )

  const fetchEntities = useCallback(async () => {
    if (entities.length > 0 || entitiesLoading) return
    
    setEntitiesLoading(true)
    try {
      const entitiesData = await getEntities()
      setEntities(entitiesData)
    } catch (error) {
      console.error('Error fetching entities:', error)
      toast.error('Failed to fetch entities')
    } finally {
      setEntitiesLoading(false)
    }
  }, [])

  const fetchWorkflows = useCallback(async (force = false) => {
    if (isFetchingWorkflowsRef.current) return
    if (!force && workflowsFetchedRef.current) return
    
    isFetchingWorkflowsRef.current = true
    workflowsFetchedRef.current = true
    setWorkflowsLoading(true)
    
    try {
      const workflowsData = await getAllWorkflows()
      setWorkflows(workflowsData)
    } catch (error) {
      console.error('Error fetching workflows:', error)
      toast.error('Failed to fetch workflows')
      workflowsFetchedRef.current = false
    } finally {
      setWorkflowsLoading(false)
      isFetchingWorkflowsRef.current = false
    }
  }, [])

  useEffect(() => {
    if (needsEntities) {
      fetchEntities()
    }
  }, [needsEntities, fetchEntities])

  useEffect(() => {
    if (needsWorkflows) {
      fetchWorkflows()
    }
  }, [needsWorkflows, fetchWorkflows])

  useEffect(() => {
    if (activeTab === 'all') {
      workflowsFetchedRef.current = false
      fetchWorkflows(true)
    }
  }, [activeTab, fetchWorkflows])

  const createEmptyStep = useCallback((): Step => ({
    id: 0,
    stepName: '',
    type: undefined,
    approveIdentifier: undefined,
        conditionEntityId: '',
    conditionOperator: undefined,
    conditionAttributeId: '',
  }), [])

  const resetWorkflowForm = useCallback(() => {
    setSteps([])
    setOpenSteps(new Set())
    reset({
      name: '',
    })
  }, [reset])

  const resetRuleForm = useCallback(() => {
    setRuleForm({
      name: '',
      description: '',
      workflowEvent: undefined,
      workflow: '',
      rule: {
        ifField: '',
        operator: undefined,
        value: '',
      },
    })
  }, [])

  const addStep = useCallback(() => {
    const newStepId = steps.length > 0 
      ? Math.max(...steps.map(s => s.id)) + 1 
      : 1
    const newStep: Step = { ...createEmptyStep(), id: newStepId }
    setSteps(prev => [...prev, newStep])
    setOpenSteps(prev => new Set([...prev, newStepId]))
  }, [steps, createEmptyStep])

  const updateStep = useCallback((stepId: number, field: keyof Step, value: string | StepType | ApproverIdentifier | Operator | undefined) => {
    setSteps(prev => prev.map((step) => {
      if (step.id !== stepId) return step
      
      const updated = { ...step, [field]: value }
      if (field === 'conditionEntityId') {
        updated.conditionAttributeId = ''
      }
      return updated
    }))
  }, [])

  const toggleStep = useCallback((stepId: number) => {
    setOpenSteps(prev => {
      const next = new Set(prev)
      if (next.has(stepId)) {
        next.delete(stepId)
      } else {
        next.add(stepId)
      }
      return next
    })
  }, [])

  const validateSteps = useCallback((): string | null => {
    if (steps.length === 0) {
      return 'Please add at least one step'
    }

    for (const step of steps) {
      if (!step.type) {
        return `Please select type for Step ${step.id}`
      }
      if (step.type === 'direct' && !step.approveIdentifier) {
        return `Please select approve identifier for Step ${step.id}`
      }
      if (step.type === 'parallel') {
        if (!step.conditionEntityId || !step.conditionOperator || !getConditionValue(step)) {
          return `Please fill in all condition fields for Step ${step.id}`
        }
      }
    }

    return null
  }, [steps])

  const validateRule = useCallback((): string | null => {
    if (!ruleForm.name) return 'Please enter rule name'
    if (!ruleForm.workflowEvent) return 'Please select a workflow event'
    if (!ruleForm.workflow) return 'Please select a workflow'
    if (!ruleForm.rule.ifField || !ruleForm.rule.operator || !ruleForm.rule.value) {
      return 'Please fill in all rule fields'
    }
    return null
  }, [ruleForm])

  const buildWorkflowSequence = useCallback((step: Step, index: number) => {
    const baseSequence = {
      step_order: index + 1,
      step_name: step.stepName || `Step ${step.id}`,
      relationship_type: step.type === 'direct' ? 'DIRECT_RELATIONSHIP' : 'PARALLEL_RELATIONSHIP',
      approval_strategy: HARDCODED_VALUES.APPROVAL_STRATEGY,
      min_approvals_required: HARDCODED_VALUES.MIN_APPROVALS_REQUIRED,
      timeout_hours: HARDCODED_VALUES.TIMEOUT_HOURS,
    } as const

    if (step.type === 'direct') {
      if (!step.approveIdentifier) {
        throw new Error(`Approver identifier is required for Step ${step.id}`)
      }
      return {
        ...baseSequence,
        approver_identifier: step.approveIdentifier,
      }
    }

    if (step.type === 'parallel') {
      const attributeId = getConditionValue(step)
      return {
        ...baseSequence,
        entity_criteria: [
          {
            field: step.conditionEntityId,
            operator: step.conditionOperator!,
            value: attributeId,
          }
        ],
      }
    }

    return baseSequence
  }, [])

  const handleCreateWorkflow = useCallback(async (data: FormValues) => {
    if (!data.name) {
      toast.error('Please fill in all required fields')
      return
    }

    const validationError = validateSteps()
    if (validationError) {
      toast.error(validationError)
      return
    }

    setSubmitting(true)
    try {
      const sequences = steps.map((step, index) => {
        try {
          return buildWorkflowSequence(step, index)
        } catch (err) {
          const errorMsg = getErrorMessage(err, 'Unknown error building sequence')
          toast.error(errorMsg)
          throw err
        }
      })

      const payload = {
        name: data.name,
        entity_type: 'EXPENSE',
        is_active: true,
        sequences,
      }

      const response = await createWorkflowConfig(payload)
      toast.success(response.message || 'Workflow configuration created successfully')
      
      resetWorkflowForm()
      await fetchWorkflows(true)
    } catch (error) {
      console.error('Error creating workflow config:', error)
      const errorMessage = getErrorMessage(error, 'Failed to create workflow configuration')
      toast.error(errorMessage)
    } finally {
      setSubmitting(false)
    }
  }, [steps, validateSteps, buildWorkflowSequence, fetchWorkflows, resetWorkflowForm])

  const handleCreateRule = useCallback(async () => {
    const validationError = validateRule()
    if (validationError) {
      toast.error(validationError)
      return
    }

    setCreatingRule(true)
    try {
      const payload = {
        name: ruleForm.name,
        description: ruleForm.description || '',
        policy_type: HARDCODED_VALUES.POLICY_TYPE,
        workflow_config_id: ruleForm.workflow,
        conditions: {
          rules: [
          {
            field: `${PREFIXES.USER}${ruleForm.rule.ifField}`,
            operator: ruleForm.rule.operator!,
            value: `${PREFIXES.USER}${ruleForm.rule.value}`,
          }
          ],
          action: {
            type: HARDCODED_VALUES.ACTION_TYPE,
          }
        },
        is_active: true,
      }

      const response = await createPolicy(payload)
      toast.success(response.message || 'Policy created successfully')
      
      resetRuleForm()
    } catch (error) {
      console.error('Error creating policy:', error)
      const errorMessage = getErrorMessage(error, 'Failed to create policy')
      toast.error(errorMessage)
    } finally {
      setCreatingRule(false)
    }
  }, [ruleForm, validateRule, resetRuleForm])

  const renderEntitySelect = useCallback((
    value: string,
    onValueChange: (value: string) => void,
    placeholder: string
  ) => (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className="w-full h-10">
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
  ), [entities, entitiesLoading])

  const renderAttributeSelect = useCallback((
    entityId: string,
    value: string,
    onValueChange: (value: string) => void,
    placeholder: string
  ) => {
    const selectedEntity = entities.find(e => e.id === entityId)
    const attributes = selectedEntity?.attributes?.filter(attr => attr.is_active) || []

    return (
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger className="w-full h-10">
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
    )
  }, [entities])

  const renderOperatorSelect = useCallback((
    value: Operator | undefined,
    onValueChange: (value: Operator) => void,
    placeholder: string
  ) => (
    <Select
      value={value || ''}
      onValueChange={(nextValue) => onValueChange(nextValue as Operator)}
    >
      <SelectTrigger className="w-full h-10">
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
  ), [])

  const renderWorkflowEventSelect = useCallback((
    value: WorkflowEvent | undefined,
    onValueChange: (value: WorkflowEvent) => void,
    placeholder: string
  ) => (
    <Select
      value={value || ''}
      onValueChange={(nextValue) => onValueChange(nextValue as WorkflowEvent)}
    >
      <SelectTrigger className="w-full h-10">
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
  ), [])

  const renderWorkflowSelect = useCallback((
    value: string,
    onValueChange: (value: string) => void,
    placeholder: string,
    workflowEvent?: WorkflowEvent
  ) => {
    const filteredWorkflows = workflowEvent
      ? workflows.filter(workflow => workflow.entity_type === workflowEvent)
      : workflows

    return (
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger className="w-full h-10">
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
              {workflowEvent ? 'No workflows found for this event' : 'No workflows found'}
            </SelectItem>
          )}
        </SelectContent>
      </Select>
    )
  }, [workflows, workflowsLoading])

  return (
   <Layout noPadding>
      <AdminLayout>
        <div className="flex flex-col gap-3 max-w-5xl">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">
              New Workflow
            </h1>
            <p className="text-sm text-muted-foreground mt-2">
              Create and configure a new workflow for your organization
            </p>
          </div>

          <ReportTabs
            activeTab={activeTab}
            onTabChange={(t) => setActiveTab(t as TabKey)}
            tabs={[
              { key: 'config', label: 'Workflow Config', count: 0 },
              { key: 'rules', label: 'Rules', count: 0 },
              { key: 'all', label: 'All Workflows', count: workflows.length },
            ]}
            className="mb-2"
          />

          {activeTab === 'config' && (
            <form onSubmit={handleSubmit(handleCreateWorkflow)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-sm font-medium">
                    NAME
                    </Label>
                    <Input
                      id="name"
                      placeholder="Enter workflow name"
                      className="h-10"
                      {...register('name')}
                    />
                  </div>

                  <div className="space-y-2">
                  {/* <Label htmlFor="workflowEvent" className="text-sm font-medium">
                      WORKFLOW EVENT
                    </Label> */}
                    {/* <Select
                    value={watch('workflowEvent') || ''}
                    onValueChange={(value) => setValue('workflowEvent', value as WorkflowEvent)}
                    >
                      <SelectTrigger id="workflowEvent" className="w-full h-10">
                        <SelectValue placeholder="Select workflow event" />
                      </SelectTrigger>
                      <SelectContent>
                      {WORKFLOW_EVENT_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                      </SelectContent>
                    </Select> */}
                  </div>
                </div>

              <div className="space-y-4 mt-6">
              {steps.map((step) => (
                  <div key={step.id} className="space-y-6">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-medium underline decoration-2 underline-offset-4 text-foreground">
                        Step {step.id}
                      </h3>
                        <Button
                          type="button"
                          variant="ghost"
                        onClick={() => toggleStep(step.id)}
                        className="h-auto p-0 hover:bg-transparent"
                        >
                          {openSteps.has(step.id) ? (
                            <ChevronDown className="h-5 w-5 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="h-5 w-5 text-muted-foreground" />
                          )}
                        </Button>
                    </div>
                    
                    {openSteps.has(step.id) && (
                      <div className="space-y-6 pt-2">
                        <div className="space-y-2">
                          <Label htmlFor={`step${step.id}Name`} className="text-sm font-medium">
                            Step Name
                          </Label>
                          <Input
                            id={`step${step.id}Name`}
                            placeholder="Enter step name"
                            className="h-10"
                            value={step.stepName}
                            onChange={(e) => updateStep(step.id, 'stepName', e.target.value)}
                          />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-2">
                            <Label htmlFor={`step${step.id}Type`} className="text-sm font-medium">
                              Type
                            </Label>
                            <Select
                              value={step.type || ''}
                              onValueChange={(value) => updateStep(step.id, 'type', value as StepType)}
                            >
                              <SelectTrigger id={`step${step.id}Type`} className="w-full h-10">
                                <SelectValue placeholder="Select type" />
                              </SelectTrigger>
                              <SelectContent>
                                {STEP_TYPE_OPTIONS.map((option) => (
                                  <SelectItem key={option.value} value={option.value}>
                                    {option.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          {step.type === 'direct' && (
                            <div className="space-y-2">
                              <Label htmlFor={`step${step.id}ApproveIdentifier`} className="text-sm font-medium">
                                Approve Identifier
                              </Label>
                              <Select
                                value={step.approveIdentifier || ''}
                                onValueChange={(value) => updateStep(step.id, 'approveIdentifier', value as ApproverIdentifier)}
                              >
                                <SelectTrigger id={`step${step.id}ApproveIdentifier`} className="w-full h-10">
                                  <SelectValue placeholder="Select approve identifier" />
                                </SelectTrigger>
                                <SelectContent>
                                  {APPROVER_OPTIONS.map((option) => (
                                    <SelectItem key={option.value} value={option.value}>
                                      {option.label}
                                  </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          )}
                        </div>

                        {step.type === 'parallel' && (
                          <div className="pt-4 border-t space-y-3">
                            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                              Condition
                            </Label>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                              {renderEntitySelect(
                                step.conditionEntityId,
                                (value) => updateStep(step.id, 'conditionEntityId', value),
                                'Select entity'
                              )}

                              {renderOperatorSelect(
                                step.conditionOperator,
                                (value) => updateStep(step.id, 'conditionOperator', value),
                                'Select operator'
                              )}

                              {renderAttributeSelect(
                                step.conditionEntityId,
                                getConditionValue(step),
                                (value) => updateStep(step.id, 'conditionAttributeId', value),
                                'Select value'
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
              ))}

              <Button
                type="button"
                variant="ghost"
                onClick={addStep}
                className="w-auto justify-start p-0 h-auto hover:bg-transparent -ml-2"
              >
                  <span className="text-sm font-medium underline decoration-2 underline-offset-4 cursor-pointer text-foreground hover:text-primary transition-colors">
                  Add Step {steps.length + 1}
                </span>
              </Button>
            </div>

              <div className="mt-6 text-right">
                <Button type="submit" className="min-w-[150px]" disabled={submitting}>
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    'Submit'
                  )}
                </Button>
              </div>
            </form>
          )}

          {activeTab === 'rules' && (
            <form className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="ruleName" className="text-sm font-medium">
                    Name
                  </Label>
                  <Input
                    id="ruleName"
                    placeholder="Enter rule name"
                    className="h-10"
                    value={ruleForm.name}
                    onChange={(e) => setRuleForm(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ruleWorkflowEvent" className="text-sm font-medium">
                    Workflow Event
                  </Label>
                  {renderWorkflowEventSelect(
                    ruleForm.workflowEvent,
                    (value) => setRuleForm(prev => ({
                      ...prev,
                      workflowEvent: value,
                      workflow: '',
                    })),
                    'Select workflow event'
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ruleWorkflow" className="text-sm font-medium">
                    Workflow
                  </Label>
                  {renderWorkflowSelect(
                    ruleForm.workflow,
                    (value) => setRuleForm(prev => ({ ...prev, workflow: value })),
                    'Select workflow',
                    ruleForm.workflowEvent
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
                  className="h-10"
                  value={ruleForm.description}
                  onChange={(e) => setRuleForm(prev => ({ ...prev, description: e.target.value }))}
                />
              </div>

              <div className="space-y-4">
                <Label className="text-sm font-medium">Rules</Label>
                <div className="flex items-center gap-4">
                  {renderEntitySelect(
                    ruleForm.rule.ifField,
                    (value) => setRuleForm(prev => ({
                      ...prev,
                      rule: { ...prev.rule, ifField: value, value: '' }
                    })),
                    'Select field'
                  )}

                  {renderOperatorSelect(
                    ruleForm.rule.operator,
                    (value) => setRuleForm(prev => ({
                      ...prev,
                      rule: { ...prev.rule, operator: value }
                    })),
                    'Select operator'
                  )}

                  {renderAttributeSelect(
                    ruleForm.rule.ifField,
                    ruleForm.rule.value,
                    (value) => setRuleForm(prev => ({
                      ...prev,
                      rule: { ...prev.rule, value }
                    })),
                    'Select value'
                  )}
                </div>
              </div>

              <div className="mt-6 text-right">
                <Button 
                  type="button" 
                  className="min-w-[150px]" 
                  disabled={creatingRule}
                  onClick={handleCreateRule}
                >
                  {creatingRule ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    'Create'
                  )}
                </Button>
              </div>
          </form>
          )}

          {activeTab === 'all' && (
            <div className="space-y-4">
              {workflowsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : workflows.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  No workflows found
                </div>
              ) : (
                <div className="border rounded-lg bg-white">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-100">
                        <TableHead>NAME</TableHead>
                        <TableHead>ENTITY TYPE</TableHead>
                        <TableHead>STATUS</TableHead>
                        <TableHead>CREATED AT</TableHead>
                        <TableHead>UPDATED AT</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {workflows.map((workflow) => (
                        <TableRow key={workflow.id} className="hover:bg-muted/50">
                          <TableCell className="font-medium">
                            {workflow.name}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {workflow.entity_type}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge className={workflow.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                              {workflow.is_active ? 'Active' : 'Inactive'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {formatDate(workflow.created_at)}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {formatDate(workflow.updated_at)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          )}
        </div>
      </AdminLayout>
   </Layout>
  )
}

export default WorkFlowPage
