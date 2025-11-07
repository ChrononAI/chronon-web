import { useEffect, useState, useMemo } from "react"
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
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { getTemplates } from "@/services/admin/templates"
import { getEntities } from "@/services/admin/entities"
import { Loader2 } from "lucide-react"
import { Separator } from "@/components/ui/separator"
import api from "@/lib/api"
import { toast } from "sonner"
import { useNavigate } from "react-router-dom"
import { getOrgIdFromToken } from "@/lib/jwtUtils"

const MODULE_TYPE_USER = "user"
const FIELD_TYPE_SELECT = "SELECT"

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

const getEntityId = (entity: TemplateEntity): string => {
  return entity.entity_id || entity.id || ""
}

const getFieldName = (entity: TemplateEntity): string => {
  return entity.display_name || entity.field_name || getEntityId(entity)
}

const createUserSchema = (templateEntities: TemplateEntity[]) => {
  const baseSchema = {
    email: z.string().email("Invalid email address").min(1, "Email is required"),
    firstName: z.string().min(1, "First name is required"),
    lastName: z.string().min(1, "Last name is required"),
    phoneNumber: z
      .string()
      .min(1, "Phone number is required")
      .regex(/^[\d\s\+\-\(\)]+$/, "Invalid phone number format"),
    role: z.string().min(1, "Role is required"),
    employeeCode: z.string().optional(),
    reportingManager: z.string().optional(),
  }

  const dynamicFields: Record<string, z.ZodTypeAny> = {}
  templateEntities.forEach((entity) => {
    const entityId = getEntityId(entity)
    if (entityId) {
      const fieldName = getFieldName(entity)
      if (entity.is_mandatory) {
        dynamicFields[entityId] = z.string().min(1, `${fieldName} is required`)
      } else {
        dynamicFields[entityId] = z.string().optional()
      }
    }
  })

  return z.object({ ...baseSchema, ...dynamicFields })
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

const UserPage = () => {
  const [templates, setTemplates] = useState<TemplateEntity[]>([])
  const [entityOptions, setEntityOptions] = useState<Record<string, EntityOption[]>>({})
  const [loading, setLoading] = useState(false)
  const [reportingManagers, setReportingManagers] = useState<UserOption[]>([])
  const [loadingManagers, setLoadingManagers] = useState(false)

  const navigate = useNavigate()
  const [submitting, setSubmitting] = useState(false)

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

  const formSchema = useMemo(() => createUserSchema(templates), [templates])

  const form = useForm<UserFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: createDefaultValues([]),
  })

  useEffect(() => {
    if (templates.length > 0) {
      form.clearErrors()
      const defaultValues = createDefaultValues(templates)
      form.reset(defaultValues)
    }
  }, [templates, form])

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      try {
        const [templatesRes, entitiesRes] = await Promise.all([getTemplates(), getEntities()])
        const userTemplate = Array.isArray(templatesRes)
          ? templatesRes.find((t) => t.module_type === MODULE_TYPE_USER)
          : null

        if (!userTemplate?.entities?.length) {
          setLoading(false)
          return
        }

        const templateEntities = userTemplate.entities as TemplateEntity[]
        setTemplates(templateEntities)

        const entityMap: Record<string, EntityOption[]> = {}

        entitiesRes.forEach((ent: EntityResponse) => {
          if (ent.id && Array.isArray(ent.attributes)) {
            entityMap[ent.id] = ent.attributes.map((attr) => ({
              id: attr.id,
              label: attr.display_value || attr.value || "",
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

        setEntityOptions(mappedOptions)
      } catch (error) {
        console.error("Failed to load user template data:", error)
        toast.error("Failed to load form configuration")
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  useEffect(() => {
    const loadReportingManagers = async () => {
      setLoadingManagers(true)
      try {
        const orgId = getOrgIdFromToken()
        if (!orgId) {
          console.error("Organization ID not found")
          setLoadingManagers(false)
          return
        }

        const response = await api.get(`/auth/em/users?org_id=${orgId}`)
        // Response structure: { data: { data: [...], pagination: {...} }, status: "success" }
        const users = response.data?.data?.data || []
        const managers: UserOption[] = users.map((user: any) => ({
          id: user.id?.toString() || "",
          email: user.email || "",
          firstName: user.first_name || "",
          lastName: user.last_name || "",
        })).filter((user: UserOption) => user.id)
        setReportingManagers(managers)
      } catch (error) {
        console.error("Failed to load reporting managers:", error)
        // Don't show error toast as this is optional
      } finally {
        setLoadingManagers(false)
      }
    }

    loadReportingManagers()
  }, [])

  const onSubmit = async (values: UserFormValues) => {
    const validationResult = formSchema.safeParse(values)
    if (!validationResult.success) {
      validationResult.error.errors.forEach((error) => {
        const fieldName = error.path[0]
        if (typeof fieldName === "string") {
          form.setError(fieldName as never, {
            type: "validation",
            message: error.message,
          })
        }
      })
      return
    }

    const entityAssignments: Record<string, string>[] = []
    templates.forEach((entity) => {
      const entityId = getEntityId(entity)
      const value = values[entityId]
      if (entityId && value && typeof value === "string") {
        entityAssignments.push({ [entityId]: value })
      }
    })

    const payload = {
      email: values.email,
      first_name: values.firstName,
      last_name: values.lastName,
      phone_number: values.phoneNumber,
      role: values.role.toUpperCase(),
      employee_code: values.employeeCode || undefined,
      reporting_manager_id: values.reportingManager || undefined,
      entity_assignments: entityAssignments,
    }

    setSubmitting(true)
    try {
      const response = await api.post(`/auth/em/users`, payload)
      toast.success(response.data.message || "User created successfully")

      const defaultValues = createDefaultValues(templates)
      form.reset(defaultValues)
    } catch (error) {
      console.error("Failed to create user:", error)
      const errorMessage =
        error && typeof error === "object" && "response" in error
          ? (error.response as { data?: { message?: string } })?.data?.message
          : undefined
      toast.error(errorMessage || "Failed to create user")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Layout noPadding>
      <AdminLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Create User</h1>
            <p className="text-muted-foreground mt-2">
              Create a user and assign entity values.
            </p>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
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
                          <FormLabel>
                            Email <span className="text-destructive">*</span>
                          </FormLabel>
                          <FormControl>
                            <Input
                              type="email"
                              placeholder="user@example.com"
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
                          <FormLabel>
                            First Name <span className="text-destructive">*</span>
                          </FormLabel>
                          <FormControl>
                            <Input placeholder="First Name" {...field} />
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
                          <FormLabel>
                            Last Name <span className="text-destructive">*</span>
                          </FormLabel>
                          <FormControl>
                            <Input placeholder="Last Name" {...field} />
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
                          <FormLabel>
                            Phone Number <span className="text-destructive">*</span>
                          </FormLabel>
                          <FormControl>
                            <Input
                              type="tel"
                              placeholder="+91 8292729271"
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
                          <FormLabel>
                            Select Role <span className="text-destructive">*</span>
                          </FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select a role" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="admin">Admin</SelectItem>
                              <SelectItem value="user">User</SelectItem>
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
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Reporting Manager</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value || ""}
                            disabled={loadingManagers}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder={loadingManagers ? "Loading..." : "Select reporting manager"} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {reportingManagers.map((manager) => (
                                <SelectItem key={manager.id} value={manager.id}>
                                  {manager.firstName} {manager.lastName} ({manager.email})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                {loading && (
                  <div className="flex items-center justify-center gap-2 text-muted-foreground py-8">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Loading entity fields...</span>
                  </div>
                )}

                {!loading && templates.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No entity fields available for this user template.
                  </div>
                )}

                {!loading && templates.length > 0 && (
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
                                  <FormLabel className="flex items-center gap-1">
                                    {fieldName}
                                    {entity.is_mandatory && (
                                      <span className="text-destructive">*</span>
                                    )}
                                  </FormLabel>
                                  {entity.field_type === FIELD_TYPE_SELECT ? (
                                    <Select
                                      onValueChange={field.onChange}
                                      value={field.value || ""}
                                    >
                                      <FormControl>
                                        <SelectTrigger>
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

              <div className="flex justify-end gap-4 mt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate("/admin/users")}
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
                    "Create User"
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </AdminLayout>
    </Layout>
  )
}

export default UserPage
