import { useEffect, useMemo, useState, useCallback, useRef } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Layout } from "@/components/layout/Layout"
import AdminLayout from "@/components/layout/AdminLayout"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { getTemplates } from "@/services/admin/templates"
import { getEntities } from "@/services/admin/entities"
import { Loader2, ChevronDown, Check } from "lucide-react"
import { Separator } from "@/components/ui/separator"
import api from "@/lib/api"
import { toast } from "sonner"
import { useNavigate } from "react-router-dom"
import { getOrgIdFromToken } from "@/lib/jwtUtils"
import { bulkUploadService } from "@/services/admin/bulkUploadService"

const MODULE_TYPE_USER = "user"
const FIELD_TYPE_SELECT = "SELECT"
const ROLE_OPTIONS = [
  { value: "ADMIN", label: "Admin" },
  { value: "USER", label: "User" },
] as const

interface EntityOption {
  id: string
  label: string
}

interface UserOption {
  id: string
  email: string
  firstName: string
  lastName: string
}

interface TemplateEntity {
  entity_id?: string
  id?: string
  display_name?: string
  field_name?: string
  field_type?: string
  is_mandatory?: boolean
  description?: string
}

interface EntityAttribute {
  id: string
  display_value?: string
  value?: string
}

interface EntityResponse {
  id?: string
  attributes?: EntityAttribute[]
}

interface ApiReportingUser {
  id?: string | number
  email?: string
  first_name?: string
  last_name?: string
}

type UserFormValues = {
  email: string
  firstName: string
  lastName: string
  phoneNumber: string
  role: string
  employeeCode?: string
  reportingManager?: string
  [key: string]: string | undefined
}

const getEntityId = (entity: TemplateEntity): string => {
  return entity.entity_id || entity.id || ""
}

const getFieldName = (entity: TemplateEntity): string => {
  return entity.display_name || entity.field_name || getEntityId(entity)
}

const createUserSchema = (templateEntities: TemplateEntity[]) => {
  const baseSchema = {
    email: z
      .string()
      .trim()
      .min(1, "Email is required")
      .email("Invalid email address"),
    firstName: z.string().trim().min(1, "First name is required"),
    lastName: z.string().trim().min(1, "Last name is required"),
    phoneNumber: z
      .string()
      .trim()
      .min(1, "Phone number is required")
      .regex(/^[\d\s()+-]{7,20}$/, "Invalid phone number format"),
    role: z.string().trim().min(1, "Role is required"),
    employeeCode: z.string().trim().optional(),
    reportingManager: z.string().trim().optional(),
  }

  const dynamicFields: Record<string, z.ZodTypeAny> = {}
  templateEntities.forEach((entity) => {
    const entityId = getEntityId(entity)
    if (entityId) {
      const fieldName = getFieldName(entity)
      if (entity.is_mandatory) {
        dynamicFields[entityId] = z
          .string()
          .trim()
          .min(1, `${fieldName} is required`)
      } else {
        dynamicFields[entityId] = z.string().trim().optional()
      }
    }
  })

  return z.object({ ...baseSchema, ...dynamicFields })
}

const createDefaultValues = (templateEntities: TemplateEntity[]): UserFormValues => {
  const defaults: UserFormValues = {
    email: "",
    firstName: "",
    lastName: "",
    phoneNumber: "",
    role: "",
    employeeCode: "",
    reportingManager: "",
  }

  templateEntities.forEach((entity) => {
    const entityId = getEntityId(entity)
    if (entityId) {
      defaults[entityId] = ""
    }
  })

  return defaults
}

interface CreateUserFormProps {
  templates: TemplateEntity[]
  entityOptions: Record<string, EntityOption[]>
  loadingEntityFields: boolean
}

const CreateUserForm = ({ templates, entityOptions, loadingEntityFields }: CreateUserFormProps) => {
  const navigate = useNavigate()
  const [reportingManagers, setReportingManagers] = useState<UserOption[]>([])
  const [loadingManagers, setLoadingManagers] = useState(false)
  const [managersLoaded, setManagersLoaded] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [reportingManagerOpen, setReportingManagerOpen] = useState(false)
  const isMounted = useRef(true)

  useEffect(() => {
    isMounted.current = true
    return () => {
      isMounted.current = false
    }
  }, [])

  const resolver = useMemo(() => zodResolver(createUserSchema(templates)), [templates])
  const defaultValues = useMemo(() => createDefaultValues(templates), [templates])
  const knownEntityIds = useMemo(
    () => new Set(templates.map((entity) => getEntityId(entity)).filter(Boolean)),
    [templates],
  )

  const form = useForm<UserFormValues>({
    resolver,
    defaultValues,
    mode: "onSubmit",
    reValidateMode: "onChange",
  })

  const loadReportingManagers = useCallback(async () => {
    if (loadingManagers || managersLoaded) return

    setLoadingManagers(true)
    try {
      const orgId = getOrgIdFromToken()
      if (!orgId) {
        console.error("Organization ID not found")
        return
      }

      const response = await api.get(`/auth/em/users?org_id=${orgId}`)
      const users: ApiReportingUser[] = response.data?.data || []
      const managers: UserOption[] = users
        .map((user) => ({
          id: user.id !== undefined && user.id !== null ? String(user.id) : "",
          email: user.email || "",
          firstName: user.first_name || "",
          lastName: user.last_name || "",
        }))
        .filter((user) => user.id)

      if (!isMounted.current) return

      setReportingManagers(managers)
      setManagersLoaded(true)
    } catch (error) {
      if (!isMounted.current) return
      console.error("Failed to load reporting managers:", error)
    } finally {
      if (isMounted.current) {
        setLoadingManagers(false)
      }
    }
  }, [loadingManagers, managersLoaded])

  const handleReportingManagerOpen = useCallback(
    (open: boolean) => {
      setReportingManagerOpen(open)
      if (open) {
        loadReportingManagers()
      }
    },
    [loadReportingManagers],
  )

  const onSubmit = useCallback(
    async (values: UserFormValues) => {
      const entityAssignments: { entity_id: string; value: string }[] = []
      templates.forEach((entity) => {
        const entityId = getEntityId(entity)
        const value = values[entityId]
        if (entityId && typeof value === "string" && value.trim().length > 0) {
          entityAssignments.push({
            entity_id: `user.${entityId}`,
            value: value.trim(),
          })
        }
      })

      const employeeCode = values.employeeCode?.trim()
      const reportingManager = values.reportingManager?.trim()

      const payload = {
        email: values.email,
        first_name: values.firstName,
        last_name: values.lastName,
        phone_number: values.phoneNumber,
        role: values.role,
        employee_code: employeeCode ? employeeCode : undefined,
        reporting_manager: reportingManager ? reportingManager : undefined,
        entity_assignments: entityAssignments,
      }

      setSubmitting(true)
      try {
        const response = await api.post(`/auth/em/users`, payload)
        toast.success(response.data.message || "User created successfully")

        if (isMounted.current) {
          form.reset(createDefaultValues(templates))
        }
        navigate("/admin/users")
      } catch (error: any) {
        console.error("Failed to create user:", error)

        const fieldNameMap: Record<string, string> = {
          last_name: "lastName",
          first_name: "firstName",
          phone_number: "phoneNumber",
          employee_code: "employeeCode",
          email: "email",
          role: "role",
          reporting_manager: "reportingManager",
        }

        const errorData = error?.response?.data
        const errors = errorData?.errors

        if (errors && typeof errors === "object" && !Array.isArray(errors)) {
          const allErrorMessages: string[] = []

          Object.keys(errors).forEach((apiFieldName) => {
            const errorMessages = errors[apiFieldName]
            if (errorMessages) {
              const errorMessage = Array.isArray(errorMessages)
                ? errorMessages[0]
                : typeof errorMessages === "string"
                  ? errorMessages
                  : String(errorMessages)

              if (errorMessage) {
                allErrorMessages.push(errorMessage)

                const formFieldName =
                  fieldNameMap[apiFieldName] || (knownEntityIds.has(apiFieldName) ? apiFieldName : undefined)

                if (formFieldName) {
                  form.setError(formFieldName as never, {
                    type: "server",
                    message: errorMessage,
                  })
                }
              }
            }
          })

          if (allErrorMessages.length > 0) {
            const firstError = allErrorMessages[0]
            toast.error(
              allErrorMessages.length > 1
                ? `${firstError} (and ${allErrorMessages.length - 1} more)`
                : firstError,
            )
          } else if (errorData?.message) {
            toast.error(errorData.message)
          } else {
            toast.error("Please fix the errors in the form")
          }
        } else {
          const errorMessage = errorData?.message || "Failed to create user"
          toast.error(errorMessage)
        }
      } finally {
        if (isMounted.current) {
          setSubmitting(false)
        }
      }
    },
    [form, knownEntityIds, navigate, templates],
  )

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <fieldset disabled={loadingEntityFields || submitting} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>User Information</CardTitle>
              <CardDescription>
                Enter the basic information for the new user.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel aria-required={true}>
                        Email <span className="text-destructive">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="user@example.com"
                          required
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel aria-required={true}>
                        First Name <span className="text-destructive">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="First Name" required {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel aria-required={true}>
                        Last Name <span className="text-destructive">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="Last Name" required {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="phoneNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel aria-required={true}>
                        Phone Number <span className="text-destructive">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="tel"
                          placeholder="+91 8292729271"
                          required
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel aria-required={true}>
                        Select Role <span className="text-destructive">*</span>
                      </FormLabel>
                      <Select onValueChange={(val) => field.onChange(val || undefined)} value={field.value || ""}>
                        <FormControl>
                          <SelectTrigger aria-required={true}>
                            <SelectValue placeholder="Select a role" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {ROLE_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="employeeCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Employee Code</FormLabel>
                      <FormControl>
                        <Input placeholder="EMP001" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="reportingManager"
                  render={({ field }) => {
                    const selectedManager = reportingManagers.find((m) => m.id === field.value)
                    return (
                      <FormItem>
                        <FormLabel>Reporting Manager</FormLabel>
                        <Popover open={reportingManagerOpen} onOpenChange={handleReportingManagerOpen}>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                role="combobox"
                                disabled={loadingManagers || loadingEntityFields}
                                className="w-full justify-between"
                              >
                                {selectedManager
                                  ? `${selectedManager.firstName} ${selectedManager.lastName} (${selectedManager.email})`
                                  : loadingManagers
                                  ? "Loading..."
                                  : "Select reporting manager"}
                                <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                            <Command>
                              <CommandInput placeholder="Search reporting manager..." />
                              <CommandList className="max-h-[180px] overflow-y-auto">
                                <CommandEmpty>
                                  {loadingManagers ? "Loading..." : "No reporting manager found."}
                                </CommandEmpty>
                                <CommandGroup>
                                  {reportingManagers.map((manager) => (
                                    <CommandItem
                                      key={manager.id}
                                      value={`${manager.firstName} ${manager.lastName} ${manager.email}`}
                                      onSelect={() => {
                                        field.onChange(manager.id)
                                        setReportingManagerOpen(false)
                                      }}
                                    >
                                      <Check
                                        className={`mr-2 h-4 w-4 ${
                                          field.value === manager.id ? "opacity-100" : "opacity-0"
                                        }`}
                                      />
                                      {manager.firstName} {manager.lastName} ({manager.email})
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )
                  }}
                />
              </div>

              {loadingEntityFields && (
                <div className="flex items-center justify-center gap-2 text-muted-foreground py-8">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Loading entity fields...</span>
                </div>
              )}

              {!loadingEntityFields && templates.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No entity fields available for this user template.
                </div>
              )}

              {!loadingEntityFields && templates.length > 0 && (
                <>
                  <Separator className="my-6" />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {templates.map((entity) => {
                      const entityId = getEntityId(entity)
                      const fieldName = getFieldName(entity)
                      return (
                        <FormField
                          key={entityId}
                          control={form.control}
                          name={entityId}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel
                                className="flex items-center gap-1"
                                aria-required={entity.is_mandatory ?? false}
                              >
                                {fieldName}
                                {entity.is_mandatory && (
                                  <span className="text-destructive">*</span>
                                )}
                              </FormLabel>
                              {entity.field_type?.toUpperCase() === FIELD_TYPE_SELECT ? (
                                <Select
                                  onValueChange={(val) => field.onChange(val || undefined)}
                                  value={field.value || ""}
                                >
                                  <FormControl>
                                    <SelectTrigger aria-required={entity.is_mandatory ?? false}>
                                      <SelectValue placeholder="Select" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {entityOptions[entityId]?.map((opt) => (
                                      <SelectItem key={opt.id} value={opt.id}>
                                        {opt.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              ) : (
                                <FormControl>
                                  <Input
                                    placeholder={`Enter ${fieldName}`}
                                    required={Boolean(entity.is_mandatory)}
                                    {...field}
                                  />
                                </FormControl>
                              )}
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )
                    })}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </fieldset>

        <div className="flex justify-end gap-4 mt-6">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate("/admin/users")}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button type="submit" className="min-w-[140px]" disabled={submitting}>
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              "Create"
            )}
          </Button>
        </div>
      </form>
    </Form>
  )
}

export const CreateUserPage = () => {
  const [templates, setTemplates] = useState<TemplateEntity[]>([])
  const [entityOptions, setEntityOptions] = useState<Record<string, EntityOption[]>>({})
  const [loading, setLoading] = useState(false)
  const [showBulkUpload, setShowBulkUpload] = useState(false)
  const [bulkFile, setBulkFile] = useState<File | null>(null)
  const [uploadingBulk, setUploadingBulk] = useState(false)
  const [bulkInputKey, setBulkInputKey] = useState(0)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const handleBulkDialogChange = useCallback((open: boolean) => {
    setShowBulkUpload(open)
    if (!open) {
      setBulkFile(null)
      setBulkInputKey((key) => key + 1)
      setUploadingBulk(false)
    }
  }, [])

  const handleDownloadTemplate = useCallback(async () => {
    try {
      const response = await bulkUploadService.downloadUserTemplate()

      const blob = new Blob([response.data], {
        type: response.headers["content-type"] || "application/octet-stream",
      })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.setAttribute("download", "user-bulk-upload-template.xlsx")
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error("Failed to download bulk upload template:", error)
      toast.error("Failed to download template")
    }
  }, [])

  const uploadBulkFile = useCallback(
    async (file: File) => {
      if (uploadingBulk) return

      setUploadingBulk(true)
      try {
        await bulkUploadService.uploadUsers(file)
        toast.success("Bulk upload submitted successfully")
        handleBulkDialogChange(false)
      } catch (error) {
        console.error("Failed to upload users in bulk:", error)
        toast.error("Failed to upload file")
      } finally {
        setUploadingBulk(false)
      }
    },
    [handleBulkDialogChange, uploadingBulk],
  )

  const handleBulkUpload = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault()
      if (!bulkFile) {
        toast.error("Please select a file to upload")
        return
      }

      await uploadBulkFile(bulkFile)
    },
    [bulkFile, uploadBulkFile],
  )

  const handleBulkFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null
    setBulkFile(file)
  }, [])

  const handleBrowseClick = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  const handleClearFile = useCallback(() => {
    setBulkFile(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
    setBulkInputKey((key) => key + 1)
  }, [])

  useEffect(() => {
    let cancelled = false

    const loadData = async () => {
      setLoading(true)
      try {
        const [templatesRes, entitiesRes] = await Promise.all([getTemplates(), getEntities()])
        const userTemplate = Array.isArray(templatesRes)
          ? templatesRes.find((t) => t.module_type === MODULE_TYPE_USER)
          : null

        if (!userTemplate?.entities?.length) {
          if (!cancelled) {
            setTemplates([])
            setEntityOptions({})
          }
          return
        }

        const templateEntities = userTemplate.entities as TemplateEntity[]
        if (!cancelled) {
          setTemplates(templateEntities)
        }

        const entityMap: Record<string, EntityOption[]> = {}
        entitiesRes.forEach((ent: EntityResponse) => {
          if (ent.id && Array.isArray(ent.attributes)) {
            entityMap[ent.id] = ent.attributes.map((attr) => ({
              id: attr.id,
              label: attr.display_value ?? attr.value ?? "—",
            }))
          }
        })

        const mappedOptions: Record<string, EntityOption[]> = {}
        templateEntities.forEach((templateEntity) => {
          const entityId = getEntityId(templateEntity)
          if (entityId) {
            mappedOptions[entityId] = entityMap[entityId] || []
          }
        })

        if (!cancelled) {
          setEntityOptions(mappedOptions)
        }
      } catch (error) {
        if (!cancelled) {
          console.error("Failed to load user template data:", error)
          toast.error("Failed to load form configuration")
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    loadData()

    return () => {
      cancelled = true
    }
  }, [])

  const templateKey = useMemo(
    () => templates.map((template) => getEntityId(template)).filter(Boolean).sort().join("|"),
    [templates],
  )

  return (
    <Layout noPadding>
      <AdminLayout>
        <div className="space-y-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Create User</h1>
              <p className="text-muted-foreground mt-2">
                Create a user and assign entity values.
              </p>
            </div>
            <Button
              type="button"
              className="self-start sm:self-auto bg-blue-600 text-white hover:bg-blue-700 px-6 py-2 text-base"
              onClick={() => handleBulkDialogChange(true)}
            >
              Bulk Upload
            </Button>
          </div>

          <CreateUserForm
            key={templateKey}
            templates={templates}
            entityOptions={entityOptions}
            loadingEntityFields={loading}
          />
        </div>
        <Dialog open={showBulkUpload} onOpenChange={handleBulkDialogChange}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Bulk Upload Users</DialogTitle>
              <DialogDescription>
                Upload an Excel file to create users in bulk. Use the template for the required format.
              </DialogDescription>
            </DialogHeader>
            <form className="space-y-6" onSubmit={handleBulkUpload}>
              <div className="flex flex-col gap-3">
                <input
                  key={bulkInputKey}
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleBulkFileSelect}
                  className="hidden"
                />
                <div className="rounded-lg border border-dashed border-muted-foreground/40 bg-muted/30 p-4">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-foreground">Upload spreadsheet</p>
                      <p className="text-xs text-muted-foreground">
                        {bulkFile ? bulkFile.name : "Supported formats: .xlsx, .xls, .csv"}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {bulkFile ? (
                        <Button type="button" variant="ghost" size="sm" onClick={handleClearFile} disabled={uploadingBulk}>
                          Clear
                        </Button>
                      ) : null}
                      <Button type="button" size="sm" onClick={handleBrowseClick} disabled={uploadingBulk}>
                        {bulkFile ? "Change file" : "Browse"}
                      </Button>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <Button type="button" variant="outline" onClick={handleDownloadTemplate} className="sm:w-auto">
                    Download Template
                  </Button>
                </div>
              </div>
              <DialogFooter className="gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleBulkDialogChange(false)}
                  disabled={uploadingBulk}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={!bulkFile || uploadingBulk}>
                  {uploadingBulk ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    "Upload"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </AdminLayout>
    </Layout>
  )
}

export default CreateUserPage
