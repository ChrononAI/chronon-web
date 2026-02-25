import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getTemplates } from "@/services/admin/templates";
import { getEntities } from "@/services/admin/entities";
import { Loader2, ChevronDown, Check } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import api from "@/lib/api";
import { toast } from "sonner";
import { useNavigate, useLocation, useParams } from "react-router-dom";
import { getOrgIdFromToken } from "@/lib/jwtUtils";
import { bulkUploadService } from "@/services/admin/bulkUploadService";
import { FormFooter } from "@/components/layout/FormFooter";

const MODULE_TYPE_USER = "user";
const FIELD_TYPE_SELECT = "SELECT";
const ROLE_OPTIONS = [
  { value: "ADMIN", label: "Admin" },
  { value: "USER", label: "User" },
] as const;

interface EntityOption {
  id: string;
  label: string;
}

interface UserOption {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
}

interface TemplateEntity {
  entity_id?: string;
  id?: string;
  display_name?: string;
  field_name?: string;
  field_type?: string;
  is_mandatory?: boolean;
  description?: string;
}

interface EntityAttribute {
  id: string;
  display_value?: string;
  value?: string;
}

interface EntityResponse {
  id?: string;
  attributes?: EntityAttribute[];
}

interface ApiReportingUser {
  id?: string | number;
  email?: string;
  first_name?: string;
  last_name?: string;
}

interface UserOption {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
}

type UserFormValues = {
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  role: string;
  employeeCode?: string;
  reportingManager?: string;
  [key: string]: string | undefined;
};

const getEntityId = (entity: TemplateEntity): string => {
  return entity.entity_id || entity.id || "";
};

const getFieldName = (entity: TemplateEntity): string => {
  return entity.display_name || entity.field_name || getEntityId(entity);
};

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
      .refine(
        (val) => val.replace(/\D/g, "").length === 10,
        "Phone number must be 10 digits long"
      ),
    role: z.string().trim().min(1, "Role is required"),
    employeeCode: z.string().trim().min(1, "EMP Code is required"),
    reportingManager: z.string().trim().optional(),
  };

  const dynamicFields: Record<string, z.ZodTypeAny> = {};
  templateEntities
    .filter((entity) => entity.field_type?.toUpperCase() === FIELD_TYPE_SELECT)
    .forEach((entity) => {
      const entityId = getEntityId(entity);
      if (entityId) {
        const fieldName = getFieldName(entity);
        if (entity.is_mandatory) {
          dynamicFields[entityId] = z
            .string()
            .trim()
            .min(1, `${fieldName} is required`);
        } else {
          dynamicFields[entityId] = z.string().trim().optional();
        }
      }
    });

  return z.object({ ...baseSchema, ...dynamicFields });
};

const createDefaultValues = (
  templateEntities: TemplateEntity[]
): UserFormValues => {
  const defaults: UserFormValues = {
    email: "",
    firstName: "",
    lastName: "",
    phoneNumber: "",
    role: "",
    employeeCode: "",
    reportingManager: "",
  };

  templateEntities
    .filter((entity) => entity.field_type?.toUpperCase() === FIELD_TYPE_SELECT)
    .forEach((entity) => {
      const entityId = getEntityId(entity);
      if (entityId) {
        defaults[entityId] = "";
      }
    });

  return defaults;
};

const parseEntityAssignments = (
  rawAssignments: unknown
): Record<string, string> => {
  const assignments: Record<string, string> = {};

  if (Array.isArray(rawAssignments)) {
    rawAssignments.forEach((item) => {
      if (item && typeof item === "object") {
        const maybeEntityId = (item as Record<string, unknown>).entity_id;
        const maybeValue = (item as Record<string, unknown>).value;
        if (
          typeof maybeEntityId === "string" &&
          typeof maybeValue === "string"
        ) {
          assignments[maybeEntityId] = maybeValue;
        }

        Object.entries(item as Record<string, unknown>).forEach(
          ([key, val]) => {
            if (typeof val === "string") {
              assignments[key] = val;
            }
          }
        );
      }
    });
    return assignments;
  }

  if (rawAssignments && typeof rawAssignments === "object") {
    Object.entries(rawAssignments as Record<string, unknown>).forEach(
      ([key, val]) => {
        if (typeof val === "string") {
          assignments[key] = val;
        }
      }
    );
  }

  return assignments;
};

interface CreateUserFormProps {
  templates: TemplateEntity[];
  entityOptions: Record<string, EntityOption[]>;
  loadingEntityFields: boolean;
  mode: "create" | "edit";
  initialValues?: Partial<UserFormValues> | null;
  userId?: string;
  loadingUser?: boolean;
  reportingManagers?: UserOption[];
  loadingManagers?: boolean;
}

const CreateUserForm = ({
  templates,
  entityOptions,
  loadingEntityFields,
  mode,
  initialValues,
  userId,
  loadingUser,
  reportingManagers = [],
  loadingManagers = false,
}: CreateUserFormProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const isRequests = location.pathname.includes("/requests/users");
  const isEditMode = mode === "edit";
  const basePath = isRequests ? "/requests/users" : "/admin-settings/users";
  const [submitting, setSubmitting] = useState(false);
  const [reportingManagerOpen, setReportingManagerOpen] = useState(false);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  const resolver = useMemo(
    () => zodResolver(createUserSchema(templates)),
    [templates]
  );
  const defaultValues = useMemo(
    () => createDefaultValues(templates),
    [templates]
  );
  const mergedInitialValues = useMemo(
    () => ({ ...defaultValues, ...(initialValues || {}) }),
    [defaultValues, initialValues]
  );
  const knownEntityIds = useMemo(
    () =>
      new Set(templates.map((entity) => getEntityId(entity)).filter(Boolean)),
    [templates]
  );

  const form = useForm<UserFormValues>({
    resolver,
    defaultValues: mergedInitialValues,
    mode: "onSubmit",
    reValidateMode: "onChange",
  });

  useEffect(() => {
    if (isEditMode && initialValues) {
      const values = { ...createDefaultValues(templates), ...initialValues };
      form.reset(values);
      if (initialValues.reportingManager && reportingManagers.length > 0) {
        const manager = reportingManagers.find(
          (m) => m.id === initialValues.reportingManager
        );
        if (!manager) {
          console.warn(
            "Reporting manager not found in list:",
            initialValues.reportingManager
          );
        }
      }
    }
  }, [form, initialValues, isEditMode, templates, reportingManagers]);

  const handleReportingManagerOpen = useCallback((open: boolean) => {
    setReportingManagerOpen(open);
  }, []);

  const onSubmit = useCallback(
    async (values: UserFormValues) => {
      if (isEditMode && !userId) {
        toast.error("User ID not found");
        return;
      }

      const entityAssignmentsObj: Record<string, string> = {};
      templates
        .filter(
          (entity) => entity.field_type?.toUpperCase() === FIELD_TYPE_SELECT
        )
        .forEach((entity) => {
          const entityId = getEntityId(entity);
          const value = values[entityId];
          if (
            entityId &&
            typeof value === "string" &&
            value.trim().length > 0
          ) {
            entityAssignmentsObj[entityId] = value.trim();
          }
        });

      const payload: any = {
        first_name: values.firstName,
        last_name: values.lastName,
        phone_number: values.phoneNumber,
        role: values.role,
        entity_assignments:
          Object.keys(entityAssignmentsObj).length > 0
            ? Object.entries(entityAssignmentsObj).map(([key, value]) => ({
                [key]: value,
              }))
            : [],
      };

      if (values.employeeCode?.trim())
        payload.employee_code = values.employeeCode.trim();
      if (values.reportingManager?.trim())
        payload.reporting_manager = values.reportingManager.trim();
      if (!isEditMode) payload.email = values.email;

      setSubmitting(true);
      try {
        const response = isEditMode
          ? await api.put(`/auth/em/users/${userId}`, payload)
          : await api.post(`/auth/em/users`, payload);
        toast.success(
          response.data?.message ||
            (isEditMode
              ? "User updated successfully"
              : "User created successfully")
        );
        if (isMounted.current) {
          if (isEditMode) navigate(basePath);
          else {
            form.reset(createDefaultValues(templates));
            navigate(basePath);
          }
        }
      } catch (error: any) {
        const errorData = error?.response?.data;
        const errors = errorData?.errors;
        const fieldMap: Record<string, string> = {
          last_name: "lastName",
          first_name: "firstName",
          phone_number: "phoneNumber",
          employee_code: "employeeCode",
          email: "email",
          role: "role",
          reporting_manager: "reportingManager",
        };
        if (errors && typeof errors === "object" && !Array.isArray(errors)) {
          const msgs: string[] = [];
          Object.keys(errors).forEach((key) => {
            const msg = Array.isArray(errors[key])
              ? errors[key][0]
              : typeof errors[key] === "string"
              ? errors[key]
              : String(errors[key]);
            if (msg) {
              msgs.push(msg);
              const field =
                fieldMap[key] || (knownEntityIds.has(key) ? key : undefined);
              if (field)
                form.setError(field as never, { type: "server", message: msg });
            }
          });
          toast.error(
            msgs.length > 1
              ? `${msgs[0]} (and ${msgs.length - 1} more)`
              : msgs[0] || errorData?.message || "Please fix the errors"
          );
        } else {
          toast.error(
            errorData?.message ||
              (isEditMode ? "Failed to update user" : "Failed to create user")
          );
        }
      } finally {
        if (isMounted.current) setSubmitting(false);
      }
    },
    [basePath, form, isEditMode, knownEntityIds, navigate, templates, userId]
  );

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} id="create-user-form">
        <fieldset
          disabled={loadingEntityFields || submitting || loadingUser}
          className="space-y-6"
        >
          {loadingUser && isEditMode && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Loading user details...</span>
            </div>
          )}
          <div>
            {/* <CardHeader>
              <CardTitle>User Information</CardTitle>
              <CardDescription>
                {isEditMode
                  ? "Update the user information below."
                  : "Enter the basic information for the new user."}
              </CardDescription>
            </CardHeader> */}
            <div className="space-y-6">
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
                          readOnly={isEditMode}
                          className={
                            isEditMode ? "bg-muted cursor-not-allowed" : ""
                          }
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
                    <FormLabel aria-required={true}>First Name *</FormLabel>
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
                    <FormLabel aria-required={true}>Last Name *</FormLabel>
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
                    <FormLabel aria-required={true}>Phone Number *</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="tel"
                        placeholder="Enter mobile number"
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
                    <FormLabel aria-required={true}>Select Role *</FormLabel>
                    <Select
                      onValueChange={(val) => field.onChange(val || undefined)}
                      value={field.value || ""}
                    >
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
                    <FormLabel>Employee Code *</FormLabel>
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
                  const selectedManager = reportingManagers.find(
                    (m) => m.id === field.value
                  );
                  return (
                    <FormItem>
                      <FormLabel>Reporting Manager</FormLabel>
                      <Popover
                        open={reportingManagerOpen}
                        onOpenChange={handleReportingManagerOpen}
                      >
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              role="combobox"
                              disabled={loadingManagers || loadingEntityFields}
                              className="w-full h-11 justify-between"
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
                                {loadingManagers
                                  ? "Loading..."
                                  : "No reporting manager found."}
                              </CommandEmpty>
                              <CommandGroup>
                                {reportingManagers.map((manager) => (
                                  <CommandItem
                                    key={manager.id}
                                    value={`${manager.firstName} ${manager.lastName} ${manager.email}`}
                                    onSelect={() => {
                                      field.onChange(manager.id);
                                      setReportingManagerOpen(false);
                                    }}
                                  >
                                    <Check
                                      className={`mr-2 h-4 w-4 ${
                                        field.value === manager.id
                                          ? "opacity-100"
                                          : "opacity-0"
                                      }`}
                                    />
                                    {manager.firstName} {manager.lastName} (
                                    {manager.email})
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />

              {/* <FormField
                  control={form.control}
                  name="store_id"
                  render={({ field }) => {
                    const selectedStore: any = stores.find(
                      (m: any) => m.id === field.value
                    );
                    return (
                      <FormItem>
                        <FormLabel>Store</FormLabel>
                        <Popover open={storeOpen} onOpenChange={setStoreOpen}>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                role="combobox"
                                disabled={
                                  loadingManagers || loadingEntityFields
                                }
                                className="w-full justify-between"
                              >
                                {selectedStore
                                  ? `${selectedStore.name}`
                                  : loadingManagers
                                  ? "Loading..."
                                  : "Select store"}
                                <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                            <Command>
                              <CommandInput placeholder="Search stores..." />
                              <CommandList className="max-h-[180px] overflow-y-auto">
                                <CommandEmpty>
                                  {loadingManagers
                                    ? "Loading..."
                                    : "No stores found."}
                                </CommandEmpty>
                                <CommandGroup>
                                  {stores.map((store: any) => (
                                    <CommandItem
                                      key={store.id}
                                      value={store.id}
                                      onSelect={() => {
                                        field.onChange(store.id);
                                        setStoreOpen(false);
                                      }}
                                    >
                                      <Check
                                        className={`mr-2 h-4 w-4 ${
                                          field.value === store.id
                                            ? "opacity-100"
                                            : "opacity-0"
                                        }`}
                                      />
                                      {store.name}
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    );
                  }}
                /> */}
            </div>

            {loadingEntityFields && (
              <div className="flex items-center justify-center gap-2 text-muted-foreground py-8">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Loading entity fields...</span>
              </div>
            )}

            {/* {!loadingEntityFields && templates.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No entity fields available for this user template.
                </div>
              )} */}

              {!loadingEntityFields && templates.length > 0 && (
                <>
                  <Separator className="my-6" />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {templates
                      .filter(
                        (entity) =>
                          entity.field_type?.toUpperCase() === FIELD_TYPE_SELECT
                      )
                      .map((entity) => {
                        const entityId = getEntityId(entity);
                        const fieldName = getFieldName(entity);
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
                                {entity.field_type?.toUpperCase() ===
                                FIELD_TYPE_SELECT ? (
                                  <Select
                                    onValueChange={(val) =>
                                      field.onChange(val || undefined)
                                    }
                                    value={field.value || ""}
                                  >
                                    <FormControl>
                                      <SelectTrigger
                                        aria-required={
                                          entity.is_mandatory ?? false
                                        }
                                      >
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
                        );
                      })}
                  </div>
                </>
              )}
            </div>
          </div>
        </fieldset>

        <FormFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate(basePath)}
            className="px-6 py-2"
            disabled={submitting}
          >
            Back
          </Button>
          <Button
            type="submit"
            form="create-user-form"
            className="min-w-[140px]"
            disabled={submitting || !initialValues?.is_active}
          >
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {isEditMode ? "Updating..." : "Creating..."}
              </>
            ) : isEditMode ? (
              "Update"
            ) : (
              "Create"
            )}
          </Button>
        </FormFooter>
      </form>
    </Form>
  );
};

export const CreateUserPage = () => {
  const { id: userId } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const isAdminSettings = location.pathname.includes("/admin-settings/users");
  const isEditMode = Boolean(userId);
  const [templates, setTemplates] = useState<TemplateEntity[]>([]);
  const [entityOptions, setEntityOptions] = useState<
    Record<string, EntityOption[]>
  >({});
  const [loading, setLoading] = useState(false);
  const [loadingUser, setLoadingUser] = useState(false);
  const [initialValues, setInitialValues] =
    useState<Partial<UserFormValues> | null>(null);
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const [bulkInputKey, setBulkInputKey] = useState(0);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [reportingManagers, setReportingManagers] = useState<UserOption[]>([]);
  const [loadingManagers, setLoadingManagers] = useState(false);
  const managersLoadedRef = useRef(false);

  const handleBulkDialogChange = useCallback((open: boolean) => {
    setShowBulkUpload(open);
    if (!open) {
      setBulkInputKey((key) => key + 1);
    }
  }, []);

  const handleDownloadTemplate = useCallback(async () => {
    try {
      const response = await bulkUploadService.downloadUserTemplate();
      const blob = new Blob([response.data], {
        type: response.headers["content-type"] || "application/octet-stream",
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "user-bulk-upload-template.xlsx");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Failed to download bulk upload template:", error);
      toast.error("Failed to download template");
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadData = async () => {
      setLoading(true);
      try {
        const [templatesRes, entitiesRes] = await Promise.all([
          getTemplates(),
          getEntities(),
        ]);
        const userTemplate = Array.isArray(templatesRes)
          ? templatesRes.find((t) => t.module_type === MODULE_TYPE_USER)
          : null;

        if (!userTemplate?.entities?.length) {
          if (!cancelled) {
            setTemplates([]);
            setEntityOptions({});
          }
          return;
        }

        const templateEntities = userTemplate.entities as TemplateEntity[];
        if (!cancelled) {
          setTemplates(templateEntities);
        }

        const entityMap: Record<string, EntityOption[]> = {};
        entitiesRes.forEach((ent: EntityResponse) => {
          if (ent.id && Array.isArray(ent.attributes)) {
            entityMap[ent.id] = ent.attributes.map((attr) => ({
              id: attr.id,
              label: attr.display_value ?? attr.value ?? "—",
            }));
          }
        });

        const mappedOptions: Record<string, EntityOption[]> = {};
        templateEntities.forEach((templateEntity) => {
          const entityId = getEntityId(templateEntity);
          if (entityId) {
            mappedOptions[entityId] = entityMap[entityId] || [];
          }
        });

        if (!cancelled) {
          setEntityOptions(mappedOptions);
        }
      } catch (error) {
        if (!cancelled) {
          console.error("Failed to load user template data:", error);
          toast.error("Failed to load form configuration");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadData();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (managersLoadedRef.current) return;
    if (loadingManagers) return;

    const loadReportingManagers = async () => {
      managersLoadedRef.current = true;
      setLoadingManagers(true);
      try {
        const orgId = getOrgIdFromToken();
        if (!orgId) {
          console.error("Organization ID not found");
          setLoadingManagers(false);
          managersLoadedRef.current = false;
          return;
        }

        const response = await api.get(`/auth/em/users?org_id=${orgId}`);
        const users: ApiReportingUser[] = response.data?.data || [];
        const managers: UserOption[] = users
          .map((user) => ({
            id:
              user.id !== undefined && user.id !== null ? String(user.id) : "",
            email: user.email || "",
            firstName: user.first_name || "",
            lastName: user.last_name || "",
          }))
          .filter((user) => user.id);

        setReportingManagers(managers);
      } catch (error) {
        console.error("Failed to load reporting managers:", error);
        managersLoadedRef.current = false;
      } finally {
        setLoadingManagers(false);
      }
    };

    loadReportingManagers();
  }, []);

  const [rawUserData, setRawUserData] = useState<any>(null);

  const processUserData = useCallback(
    (data: any) => {
      const rawAssignments = parseEntityAssignments(data.entity_assignments);
      const mappedAssignments: Record<string, string> = {};

      if (templates.length > 0 && Object.keys(entityOptions).length > 0) {
        Object.entries(rawAssignments).forEach(([key, value]) => {
          const trimmedKey = key.trim();
          const templateEntity = templates.find(
            (t) =>
              (getFieldName(t).trim() === trimmedKey ||
                getEntityId(t) === trimmedKey) &&
              t.field_type?.toUpperCase() === FIELD_TYPE_SELECT
          );
          if (templateEntity) {
            const entityId = getEntityId(templateEntity);
            const options = entityOptions[entityId] || [];
            const matchedOption = options.find(
              (opt) => opt.label === value || opt.id === value
            );
            if (matchedOption) {
              mappedAssignments[entityId] = matchedOption.id;
            }
          }
        });
      }

      let reportingManagerId: string | undefined;
      if (data.reporting_manager) {
        reportingManagerId = String(data.reporting_manager);
      } else if (data.reporting_manager_id) {
        reportingManagerId = String(data.reporting_manager_id);
      } else if (data.reporting_manager_email && reportingManagers.length > 0) {
        const managerEmail = (data.reporting_manager_email || "")
          .trim()
          .toLowerCase();
        const manager = reportingManagers.find(
          (m) => (m.email || "").trim().toLowerCase() === managerEmail
        );
        if (manager) {
          reportingManagerId = manager.id;
        }
      } else if (data.reporting_manager_name && reportingManagers.length > 0) {
        const managerName = (data.reporting_manager_name || "")
          .trim()
          .toLowerCase();
        const manager = reportingManagers.find((m) => {
          const fullName = `${m.firstName || ""} ${m.lastName || ""}`
            .trim()
            .toLowerCase();
          return fullName === managerName;
        });
        if (manager) {
          reportingManagerId = manager.id;
        }
      }

      return {
        email: data.email || "",
        firstName: data.first_name || "",
        lastName: data.last_name || "",
        phoneNumber: data.phone_number || "",
        is_active: data.is_active,
        role: data.role || "",
        employeeCode: data.employee_code || "",
        reportingManager: reportingManagerId,
        ...mappedAssignments,
      };
    },
    [templates, entityOptions, reportingManagers]
  );

  useEffect(() => {
    if (!userId) {
      setInitialValues(null);
      setRawUserData(null);
      return;
    }

    let cancelled = false;

    const loadUserDetails = async () => {
      setLoadingUser(true);
      try {
        const response = await api.get(`/auth/em/users/${userId}`);
        const data = response.data?.data;
        if (!data || cancelled) return;

        if (!cancelled) {
          setRawUserData(data);
        }
      } catch (error) {
        if (!cancelled) {
          console.error("Failed to load user details:", error);
          toast.error("Failed to load user details");
        }
      } finally {
        if (!cancelled) setLoadingUser(false);
      }
    };

    loadUserDetails();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  useEffect(() => {
    if (!rawUserData) {
      return;
    }

    const mappedValues = processUserData(rawUserData);
    setInitialValues(mappedValues);
  }, [rawUserData, templates, entityOptions, reportingManagers]);

  const templateKey = useMemo(
    () =>
      templates
        .map((template) => getEntityId(template))
        .filter(Boolean)
        .sort()
        .join("|"),
    [templates]
  );
  const formKey = useMemo(
    () => `${userId || "new"}|${templateKey}`,
    [templateKey, userId]
  );
  const pageTitle = isEditMode ? "Update User" : "Create User";
  const isLoading =
    isEditMode &&
    (loading || loadingUser || loadingManagers || (userId && !initialValues));

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <div className="text-muted-foreground">Loading user details...</div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-0">
        <div className="flex gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="mb-6">
            <h1 className="text-2xl font-bold">{pageTitle}</h1>
          </div>
          {isAdminSettings && !isEditMode && (
            <Button
              type="button"
              className="self-start sm:self-auto bg-blue-600 text-white hover:bg-blue-700 px-6 py-2 text-sm"
              onClick={() => handleBulkDialogChange(true)}
            >
              Bulk Upload
            </Button>
          )}
        </div>

        <CreateUserForm
          key={formKey}
          templates={templates}
          entityOptions={entityOptions}
          loadingEntityFields={loading}
          mode={isEditMode ? "edit" : "create"}
          initialValues={initialValues}
          userId={userId}
          loadingUser={loadingUser}
          reportingManagers={reportingManagers}
          loadingManagers={loadingManagers}
        />
      </div>
      {isAdminSettings && !isEditMode && (
        <Dialog open={showBulkUpload} onOpenChange={handleBulkDialogChange}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Bulk Upload Users</DialogTitle>
              <DialogDescription>
                Upload an Excel file to create users in bulk. Use the template
                for the required format.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-6">
              <div className="flex flex-col gap-3">
                <input
                  key={bulkInputKey}
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  // onChange={handleBulkFileSelect}
                  className="hidden"
                />
              </div>
              <DialogFooter className="gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleDownloadTemplate}
                  className="sm:w-auto"
                >
                  Download Template
                </Button>
                <Button
                  onClick={() =>
                    navigate("/admin-settings/product-config/bulk-uploads/user")
                  }
                >
                  Continue
                </Button>
              </DialogFooter>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
};

export default CreateUserPage;
