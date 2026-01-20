import { useState, useEffect } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { DateField } from "@/components/ui/date-field";
import { Calendar, Copy, ExternalLink, Loader2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { placesService } from "@/services/placesService";
import { getOrgIdFromToken } from "@/lib/jwtUtils";
import {
  Expense,
  ExpenseComment,
  Policy,
  PolicyCategory,
} from "@/types/expense";
import { toast } from "sonner";
import { expenseService } from "@/services/expenseService";
import { ExpenseComments } from "@/components/expenses/ExpenseComments";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuthStore } from "@/store/authStore";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { trackEvent } from "@/mixpanel";
import ExpenseLogs from "@/components/expenses/ExpenseLogs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { format } from "date-fns";
import { AttachmentUploader } from "@/components/expenses/AttachmentUploader";
import { Attachment } from "@/components/expenses/ExpenseDetailsStep2";
import AttachmentViewer from "@/components/expenses/AttachmentViewer";

interface PerdiemPageProps {
  mode?: "create" | "view" | "edit";
  expenseData?: Expense;
}

export const calculateDays = (startDate: string, endDate: string): number => {
  if (!startDate || !endDate) return 0;

  const start = new Date(startDate);
  const end = new Date(endDate);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) return 0;

  const diffTime = end.getTime() - start.getTime();

  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

  return diffDays > 0 ? diffDays : 0;
};

const perdiemSchema = z.object({
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
  location: z.string().min(1, "Location is required"),
  purpose: z.string().min(1, "Purpose is required"),
  categoryId: z.string().min(1, "Category is required"),
});

type PerdiemFormValues = z.infer<typeof perdiemSchema>;

const PerdiemPage = ({ mode = "create", expenseData }: PerdiemPageProps) => {
  const { expenseId } = useParams<{ expenseId: string }>();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const { single_date_per_diem_settings } = useAuthStore(
    (state) => state.orgSettings
  );
  const singleDate = single_date_per_diem_settings;
  const { pathname } = useLocation();
  const form = useForm<PerdiemFormValues>({
    resolver: zodResolver(perdiemSchema),
    defaultValues: {
      startDate: "",
      endDate: "",
      location: "",
      purpose: "",
      categoryId: "",
    },
  });

  const [formData, setFormData] = useState<{
    startDate: string;
    endDate: string;
    location: string;
    purpose: string;
    totalAmount: string | number;
    policy: string;
    category: string;
    policyId: string;
    categoryId: string;
  }>({
    startDate: "",
    endDate: "",
    location: "",
    purpose: "",
    totalAmount: "0",
    policy: "",
    category: "",
    policyId: "",
    categoryId: "",
  });
  const [days, setDays] = useState<number>(0);
  const isAdmin = user?.role === "ADMIN" || user?.role === "SUPER_ADMIN";
  const [categories, setCategories] = useState<PolicyCategory[]>([]);
  const [selectedPolicy, setSelectedPolicy] = useState<Policy | null>(null);
  const [loadingPolicies, setLoadingPolicies] = useState(false);
  const [activePerdiemTab, setActivePerdiemTab] = useState<"attachment" | "comments" | "logs">(
    "attachment"
  );
  const [expenseLogs, setExpenseLogs] = useState<ExpenseComment[]>([]);
  const [commentError, setCommentError] = useState<string | null>(null);

  const [comments, setComments] = useState<ExpenseComment[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const today = format(new Date(), "yyyy-MM-dd");
  const [loading, setLoading] = useState(false);

  const [adminEditReason, setAdminEditReason] = useState("");
  const [showAdminEditConfirm, setShowAdminEditConfirm] = useState(false);
  const [pendingFormData, setPendingFormData] = useState<any>(null);

  const [newComment, setNewComment] = useState<string>();
  const [postingComment, setPostingComment] = useState(false);

  const [fileIds, setFileIds] = useState<string[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [attachmentLoading, setAttachmentLoading] = useState(true);

  const generateUploadUrl = async (file: File): Promise<{
    downloadUrl: string;
    uploadUrl: string;
    fileId: string;
  }> => {
    try {
      const res = await expenseService.getUploadUrl({ type: "RECEIPT", name: file.name });
      return { uploadUrl: res.data.data.upload_url, downloadUrl: res.data.data.download_url, fileId: res.data.data.id };
    } catch (error) {
      console.log(error);
      throw error;
    }
  };

  const handlePostComment = async () => {
    if (!expenseData?.id || !newComment?.trim() || postingComment) return;

    setPostingComment(true);
    setCommentError(null);

    try {
      await expenseService.postExpenseComment(
        expenseData?.id,
        newComment.trim(),
        false
      );
      // Refetch comments to get the updated list with the new comment
      const fetchedComments = await expenseService.getExpenseComments(
        expenseData?.id
      );
      // Sort comments by created_at timestamp (oldest first)
      const sortedComments = [...fetchedComments.filter((c) => !c.action)].sort(
        (a, b) => {
          const dateA = new Date(a.created_at).getTime();
          const dateB = new Date(b.created_at).getTime();
          return dateA - dateB;
        }
      );
      setComments(sortedComments);
      setNewComment("");
      toast.success("Comment posted successfully");
    } catch (error: any) {
      console.error("Error posting comment:", error);
      const errorMessage =
        error.response?.data?.message || "Failed to post comment";
      setCommentError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setPostingComment(false);
    }
  };

  const isAdminUpdatingExpense =
    isAdmin &&
    location.pathname.includes("/approvals") &&
    expenseData?.status !== "APPROVED" &&
    expenseData?.status !== "REJECTED";

  useEffect(() => {
    const { startDate, endDate } = formData;
    setDays(calculateDays(startDate, endDate));
  }, [formData.startDate, formData.endDate]);

  // Pre-fill form data when in view mode
  useEffect(() => {
    if (expenseData) {
      const formatDate = (dateString: string) => {
        try {
          return format(new Date(dateString), "yyyy-MM-dd");
        } catch {
          return format(new Date(), "yyyy-MM-dd");
        }
      };
      if (expenseData.file_ids) {
        setFileIds(expenseData.file_ids);
      }
      const data = {
        startDate: formatDate(
          expenseData.start_date ||
          expenseData.per_diem_info?.start_date ||
          expenseData.expense_date
        ),
        endDate: formatDate(
          expenseData.end_date ||
          expenseData.per_diem_info?.end_date ||
          expenseData.expense_date
        ),
        location:
          expenseData.location || expenseData.per_diem_info?.location || "",
        purpose: expenseData.description || "",
        totalAmount: parseFloat(String(expenseData.amount)) || 0,
        categoryId: expenseData.category_id || "",
        policyId: expenseData.expense_policy_id || "",
      };

      setFormData((prev) => ({
        ...prev,
        ...data,
      }));

      // Set form values
      form.setValue("startDate", data.startDate);
      form.setValue("endDate", data.endDate);
      form.setValue("location", data.location);
      form.setValue("purpose", data.purpose);
      form.setValue("categoryId", data.categoryId);
    }
  }, [mode, expenseData, form]);

  useEffect(() => {
    if (expenseData && categories.length > 0) {
      const category = categories.find(
        (cat) => cat.id === expenseData.category_id
      );
      if (category) {
        setFormData((prev) => ({
          ...prev,
          categoryId: category.id,
        }));
        form.setValue("categoryId", category.id);
      }
    }
  }, [expenseData?.category_id, categories, form]);

  const loadPerDiemPolicies = async () => {
    setLoadingPolicies(true);
    try {
      const allPolicies = await expenseService.getAllPoliciesWithCategories();
      const perDiemPolicies = allPolicies.filter(
        (policy: Policy) => policy.name.toLowerCase() === "per diem"
      );
      setSelectedPolicy(perDiemPolicies[0]);
      if (perDiemPolicies.length > 0) {
        setCategories(perDiemPolicies[0].categories);
        setFormData((prev) => ({ ...prev, policyId: perDiemPolicies[0].id }));
      }
    } catch (error) {
      console.log(error);
    } finally {
      setLoadingPolicies(false);
    }
  };

  useEffect(() => {
    loadPerDiemPolicies();
  }, []);

  const handleInputChange = (field: string, value: string | number) => {
    setFormData((prev) => ({
      ...prev,
      [field]: field === "totalAmount" ? Number(value) : value,
    }));

    if (field === "categoryId" && typeof value === "string") {
      form.setValue("categoryId", value);
    } else if (field === "location" && typeof value === "string") {
      form.setValue("location", value);
    } else if (field === "purpose" && typeof value === "string") {
      form.setValue("purpose", value);
    } else if (field === "startDate" && typeof value === "string") {
      form.setValue("startDate", value);
    } else if (field === "endDate" && typeof value === "string") {
      form.setValue("endDate", value);
    }
  };

  const handleSubmit = async (values: PerdiemFormValues) => {
    const orgId = getOrgIdFromToken();
    if (!orgId) {
      toast.error("Organization ID not found");
      return;
    }
    if (+formData.totalAmount === 0) {
      toast.error("Amount must be greater than 0");
      return;
    }
    setLoading(true);

    const submitData = {
      expense_policy_id: formData.policyId,
      category_id: values.categoryId,
      amount: formData.totalAmount,
      expense_date: values.startDate,
      description: values.purpose,
      file_ids: fileIds,
      per_diem_info: {
        start_date: values.startDate,
        end_date: values.endDate,
        location: values.location,
      },
    };

    try {
      if (mode === "create") {
        trackEvent("Create Per Diem Button Clicked", {
          button_name: "Create Per Diem",
        });
        await placesService.createPerDiemExpense(submitData, orgId);
      } else if (mode === "edit" && isAdminUpdatingExpense) {
        setPendingFormData(submitData);
        setShowAdminEditConfirm(true);
        setLoading(false);
        return;
      } else if (mode === "edit" && expenseId) {
        trackEvent("Edit Per Diem Button Clicked", {
          button_name: "Edit Per Diem",
        });
        await expenseService.updateExpense(expenseId, submitData);
      }
      if (mode === "create") {
        toast.success("Per diem expense created successfully!");
      } else if (mode === "edit") {
        toast.success("Per diem expense edited successfully!");
      }
      navigate(-1);
    } catch (error: any) {
      console.error("Error creating per diem expense:", error);
      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        "Failed to create per diem expense";
      toast.error(`Error: ${errorMessage}`);
      setLoading(false);
    }
  };

  const handleEditExpenseAsAdmin = async () => {
    try {
      if (expenseData?.id) {
        const newPayload = { ...pendingFormData, reason: adminEditReason };
        await expenseService.adminUpdateExpense({
          id: expenseData?.id,
          payload: newPayload,
        });
      }
      toast.success("Exopense uodated successfuylly");
      setShowAdminEditConfirm(false);
      navigate(-1);
    } catch (error: any) {
      console.log(error);
      toast.error(error?.response?.data?.message || error?.message);
    }
  };

  const calculatePerDiemAmount = async ({
    startDate,
    endDate,
    policyId,
    categoryId,
  }: any) => {
    try {
      const response = await expenseService.calculatePerDiemAmount({
        startDate,
        endDate,
        policyId,
        categoryId,
        orgId: user?.organization.id,
      });
      setFormData((prev) => ({
        ...prev,
        totalAmount: response?.data?.amount || 0,
      }));
      setDays(response.data.days);
    } catch (error: any) {
      console.log(error);
    }
  };

  useEffect(() => {
    if (
      formData.startDate &&
      formData.endDate &&
      formData.categoryId &&
      formData.policyId &&
      user?.organization.id
    ) {
      calculatePerDiemAmount({
        startDate: formData.startDate,
        endDate: formData.endDate,
        policyId: formData.policyId,
        categoryId: formData.categoryId,
      });
    }
  }, [
    formData.startDate,
    formData.endDate,
    formData.categoryId,
    formData.policyId,
  ]);

  useEffect(() => {
    const fetchComments = async () => {
      if (expenseData?.id) {
        setLoadingComments(true);
        setCommentError(null);
        try {
          const fetchedComments = await expenseService.getExpenseComments(
            expenseData?.id
          );
          // Sort comments by created_at timestamp (oldest first)
          const sortedComments = [
            ...fetchedComments.filter((c) => !c.action),
          ].sort((a, b) => {
            const dateA = new Date(a.created_at).getTime();
            const dateB = new Date(b.created_at).getTime();
            return dateA - dateB;
          });
          setComments(sortedComments);
          const sortedLogs = [...fetchedComments.filter((c) => c.action)].sort(
            (a, b) => {
              const dateA = new Date(a.created_at).getTime();
              const dateB = new Date(b.created_at).getTime();
              return dateA - dateB;
            }
          );
          setExpenseLogs(sortedLogs);
        } catch (error: any) {
          console.error("Error fetching comments:", error);
          setCommentError(
            error.response?.data?.message || "Failed to load comments"
          );
        } finally {
          setLoadingComments(false);
        }
      }
    };

    fetchComments();
  }, [expenseData?.id]);

  useEffect(() => {
    if (!fileIds.length) {
      setAttachmentLoading(false);
      return;
    }
  
    const existingMap = new Map(
      attachments.map((a) => [a.fileId, a.url])
    );
  
    const fileIdsToFetch = fileIds.filter(
      (id) => !existingMap.has(id) || !existingMap.get(id)
    );
  
    if (!fileIdsToFetch.length) return;
  
    let cancelled = false;
  
    const fetchUrls = async () => {
      try {
        const fetched = await Promise.all(
          fileIdsToFetch.map(async (fileId) => {
            const res = await expenseService.generatePreviewUrl(fileId);
            console.log(res);
            return { fileId, url: res.data.data.download_url };
          })
        );
  
        if (cancelled) return;
  
        setAttachments((prev) => {
          const map = new Map(prev.map((a) => [a.fileId, a]));
  
          fetched.forEach((a) => {
            map.set(a.fileId, a);
          });
  
          return Array.from(map.values());
        });
      } catch (err) {
        console.error("Failed to fetch attachment URLs", err);
      } finally {
        setAttachmentLoading(false);
      }
    };
  
    fetchUrls();
  
    return () => {
      cancelled = true;
    };
  }, [fileIds]);

  return (
    <>
      {/* Duplicate Expense Indicator */}
      {expenseData?.original_expense_id && (
        <Alert className="bg-yellow-50 border-yellow-200 mb-4">
          <Copy className="h-4 w-4 text-yellow-600" />
          <AlertTitle className="text-yellow-800">
            Duplicate Expense Detected
          </AlertTitle>
          <AlertDescription className="text-yellow-700">
            This expense has been flagged as a duplicate.
            <Button
              variant="link"
              className="p-0 h-auto text-yellow-700 underline ml-1"
              onClick={() =>
                navigate(`/expenses/${expenseData.original_expense_id}`)
              }
            >
              View original expense <ExternalLink className="ml-1 h-3 w-3" />
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <div
          className={`rounded-2xl border border-gray-200 bg-white shadow-sm min-h-full ${pathname.includes("create")
              ? "md:h-[calc(100vh-16rem)]"
              : "md:h-[calc(100vh-13rem)]"
            } md:overflow-y-auto`}
        >
          <div className="flex flex-col h-full">
            <div className="sticky top-0 z-10 bg-white border-b border-gray-200 p-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                {[
                  { key: "attachment", label: "Attachment" },
                  { key: "comments", label: "Comments" },
                  { key: "logs", label: "Logs" },
                ].map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() =>
                      setActivePerdiemTab(tab.key as "attachment" | "comments" | "logs")
                    }
                    className={cn(
                      "rounded-full px-4 py-2 text-sm font-medium transition-all",
                      activePerdiemTab === tab.key
                        ? "bg-primary/10 text-primary"
                        : "text-gray-500 hover:text-gray-900"
                    )}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="h-full flex-1 overflow-hidden">
              {activePerdiemTab === "attachment" ? (
                <AttachmentViewer activeTab={activePerdiemTab} attachments={attachments} isLoadingReceipt={attachmentLoading} />
              ) : activePerdiemTab === "comments" ? (
                <ExpenseComments
                  expenseId={expenseData?.id}
                  readOnly={false}
                  comments={comments}
                  commentError={commentError}
                  loadingComments={loadingComments}
                  postComment={handlePostComment}
                  postingComment={postingComment}
                  newComment={newComment || ""}
                  setNewComment={setNewComment}
                />
              ) : (
                <ExpenseLogs
                  logs={expenseLogs}
                  loading={loadingComments}
                  error={commentError || ""}
                />
              )}
            </div>
          </div>
        </div>
        <div>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(handleSubmit)}
              className={`rounded-2xl border border-gray-200 space-y-6 bg-white shadow-sm min-h-full ${pathname.includes("create")
                  ? "md:h-[calc(100vh-18rem)]"
                  : "md:h-[calc(100vh-13rem)]"
                } md:overflow-y-auto`}
            >
              <div className="overflow-y-auto pr-1 md:pr-2">
                <div className="px-6 py-6 space-y-6 pb-40 md:pb-48">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="startDate"
                      render={({ field }) => (
                        <FormItem
                          className={`${singleDate?.enabled ? "col-span-2" : "col-span-1"
                            }`}
                        >
                          <FormLabel>
                            {singleDate?.enabled ? "Date *" : "Start Date *"}
                          </FormLabel>
                          <FormControl>
                            <DateField
                              id="startDate"
                              value={formData.startDate}
                              onChange={(value) => {
                                handleInputChange("startDate", value);
                                field.onChange(value);
                                if (singleDate?.enabled) {
                                  handleInputChange("endDate", value);
                                }
                              }}
                              disabled={mode === "view"}
                              maxDate={today}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* <div className="space-y-2">
                      <Label
                        htmlFor="days"
                        className="text-sm font-medium text-gray-700"
                      >
                        Number of Days
                      </Label>
                      <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform text-gray-400" />
                        <Input
                          id="days"
                          type="text"
                          value={days}
                          readOnly
                          className="bg-gray-50 pl-10"
                          disabled={mode === "view"}
                        />
                      </div>
                    </div> */}

                    {!singleDate?.enabled && (
                      <FormField
                        control={form.control}
                        name="endDate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>End Date *</FormLabel>
                            <FormControl>
                              <DateField
                                id="endDate"
                                value={formData.endDate}
                                onChange={(value) => {
                                  handleInputChange("endDate", value);
                                  field.onChange(value);
                                }}
                                disabled={mode === "view"}
                                minDate={formData.startDate}
                                maxDate={new Date().toString()}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                  </div>

                  {!singleDate?.enabled && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label
                          htmlFor="days"
                          className="text-sm font-medium text-gray-700"
                        >
                          Number of Days
                        </Label>
                        <div className="relative">
                          <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform text-gray-400" />
                          <Input
                            id="days"
                            type="text"
                            value={days}
                            readOnly
                            className="bg-gray-50 pl-10"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label
                        htmlFor="policy"
                        className="text-sm font-medium text-gray-700"
                      >
                        Policy
                      </Label>
                      <Input
                        id="policy"
                        type="text"
                        value={selectedPolicy?.name}
                        className="bg-gray-50 text-gray-500"
                        disabled
                      />
                    </div>
                    <FormField
                      control={form.control}
                      name="categoryId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Category *</FormLabel>
                          <Select
                            value={field.value}
                            onValueChange={(value) => {
                              handleInputChange("categoryId", value);
                              field.onChange(value);
                            }}
                            disabled={
                              mode === "view" ||
                              !selectedPolicy ||
                              loadingPolicies
                            }
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue
                                  placeholder={
                                    !selectedPolicy
                                      ? "Select policy first"
                                      : "Select category"
                                  }
                                />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {categories.map((category) => (
                                <SelectItem
                                  key={category.id}
                                  value={category.id}
                                >
                                  {category.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="location"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Location *</FormLabel>
                          <FormControl>
                            <Input
                              type="text"
                              placeholder="e.g., Mumbai, Delhi, Bangalore"
                              value={formData.location}
                              onChange={(e) => {
                                handleInputChange("location", e.target.value);
                                field.onChange(e.target.value);
                              }}
                              disabled={mode === "view"}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-4">
                    <FormField
                      control={form.control}
                      name="purpose"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Purpose *</FormLabel>
                          <FormControl>
                            <Textarea
                              value={formData.purpose}
                              placeholder="e.g. Annual Sales Conference"
                              onChange={(e) => {
                                handleInputChange("purpose", e.target.value);
                                field.onChange(e.target.value);
                              }}
                              rows={4}
                              className="resize-none"
                              disabled={mode === "view"}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <AttachmentUploader
                    onChange={setAttachments}
                    setFileIds={setFileIds}
                    generateUploadUrl={generateUploadUrl}
                  />
                </div>
              </div>

              <>
                <div className="fixed inset-x-4 bottom-4 z-30 flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white/95 p-4 shadow-lg backdrop-blur supports-[backdrop-filter]:bg-white/80 md:hidden">
                  <div>
                    <Label className="text-sm font-medium text-gray-600">
                      Total Per Diem
                    </Label>
                    <div className="text-2xl font-bold text-blue-600 mt-1">
                      ₹{(Number(formData.totalAmount) || 0).toFixed(2)}
                    </div>
                    <p className="text-sm text-gray-500">
                      {days} {days === 1 ? "day" : "days"}
                    </p>
                  </div>
                  <Button
                    type="submit"
                    className="h-11 bg-blue-600 text-white hover:bg-blue-700"
                  >
                    {mode === "create" ? "Create" : "Update"} Expense
                  </Button>
                </div>

                <div className="pointer-events-none fixed bottom-0 right-0 left-0 md:left-64 z-30 hidden md:block">
                  <div className="pointer-events-auto flex w-full items-center justify-between gap-6 border-t border-gray-200 bg-white px-12 py-3">
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-600">
                          Total Per Diem Amount
                        </span>
                        <span className="text-sm text-gray-500">
                          ({days} {days === 1 ? "day" : "days"})
                        </span>
                      </div>
                      <span className="text-2xl font-bold text-blue-600">
                        ₹{(Number(formData.totalAmount) || 0).toFixed(2)}
                      </span>
                    </div>
                    <div className="flex items-center gap-4">
                      <Button
                        type="button"
                        variant="outline"
                        className="px-6 py-2"
                        onClick={() => navigate(-1)}
                      >
                        Back
                      </Button>

                      {mode !== "view" && (
                        <Button
                          type="submit"
                          className="min-w-[200px]"
                          disabled={loading}
                        >
                          {loading ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              {mode === "edit" ? "Updating..." : "Creating..."}
                            </>
                          ) : mode === "create" ? (
                            "Create Expense"
                          ) : (
                            "Update Expense"
                          )}{" "}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </>
            </form>
          </Form>
        </div>
      </div>
      <AlertDialog
        open={showAdminEditConfirm}
        onOpenChange={setShowAdminEditConfirm}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Edit expense?</AlertDialogTitle>
            <AlertDialogDescription>
              You are about to edit this expense as an admin. This will
              overwrite the existing data. Are you sure you want to continue?
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-2">
            <Label className="text-sm font-medium">Reason for editing</Label>
            <Textarea
              placeholder="Enter reason for editing this expense"
              value={adminEditReason}
              onChange={(e) => setAdminEditReason(e.target.value)}
              rows={3}
            />
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setShowAdminEditConfirm(false);
                setPendingFormData(null);
                setLoading(false);
              }}
            >
              Cancel
            </AlertDialogCancel>

            <AlertDialogAction
              onClick={() => {
                handleEditExpenseAsAdmin();
                setShowAdminEditConfirm(false);
              }}
            >
              Yes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default PerdiemPage;
