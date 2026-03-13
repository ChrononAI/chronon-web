import React, { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { PolicyCategory } from "@/types/expense";
import { categoryService } from "@/services/admin/categoryService";
import { toast } from "sonner";
import {
  CreatePolicyPayload,
  policyService,
} from "@/services/admin/policyService";
import { FormActionFooter } from "@/components/layout/FormActionFooter";
import { DataGrid, GridColDef, GridPaginationModel } from "@mui/x-data-grid";
import { Badge } from "@/components/ui/badge";
import CategorySelectionDialog from "@/components/admin/policies/SelectCategoriesDialog";
export interface CreatePolicyForm {
  name: string;
  description: string;
  is_pre_approval_required: boolean;
}

const columns: GridColDef[] = [
  {
    field: "name",
    headerName: "TYPE",
    minWidth: 120,
    flex: 1,
  },
  {
    field: "is_active",
    headerName: "STATUS",
    flex: 1,
    minWidth: 120,
    renderCell: ({ value }) => (
      <Badge
        className={
          value
            ? "bg-green-100 text-green-800 hover:bg-green-100"
            : "bg-gray-100 hover:bg-gray-100 text-gray-800"
        }
      >
        {value ? "Active" : "Inactive"}
      </Badge>
    ),
  },
];

function CreateExpensePolicyPage() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const row = state;
  const mode = row ? "edit" : "create";
  const [selectedPolicy, setSelectedPolicy] = useState(row);
  const [categories, setCategories] = useState<PolicyCategory[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<CreatePolicyForm>({
    name: "",
    description: "",
    is_pre_approval_required: false,
  });
  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({
    page: 0,
    pageSize: 20,
  });
  const debounceRef = useRef<number | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const getAvailableCategories = (
    categories: PolicyCategory[],
    selectedCategories: string[],
  ) => {
    return categories.filter(
      (category: PolicyCategory) => !selectedCategories.includes(category.id),
    );
  };
  const availableCategories = getAvailableCategories(
    categories,
    selectedCategories,
  );

  const createPolicy = async (payload: CreatePolicyPayload) => {
    setLoading(true);
    try {
      await policyService.createPolicy(payload);
      toast.success("Policy created successfully");
      setTimeout(() => {
        navigate("/admin-settings/product-config/expense-policies");
      }, 100);
    } catch (error: any) {
      toast.error(
        error?.response?.data.message ||
          error.message ||
          "Failed to create policy",
      );
    } finally {
      setLoading(false);
    }
  };

  const getPolicyById = async () => {
    try {
      setLoading(true);
      const res = await policyService.getPolicies({ page: 1, perPage: 100 });
      const selectedPol = res.data.data.find(
        (cat: PolicyCategory) => cat.id === row.id,
      );
      if (selectedPol) {
        setSelectedPolicy(selectedPol);
      }
    } catch (error: any) {
      console.log(error);
      toast.error(
        error?.response?.data?.message ||
          error.message ||
          "Failed to get policy",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (row) {
      getPolicyById();
    }
  }, [row]);

  const handleChange = (field: string, value: string | boolean) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === "create") {
      const payload = { ...formData, category_ids: selectedCategories };
      createPolicy(payload);
    } else {
      console.log(formData);
      console.log(selectedCategories);
    }
  };

  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = window.setTimeout(async () => {
      if (abortRef.current) {
        abortRef.current.abort();
      }

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        let res;

        if (searchTerm.trim()) {
          const term = encodeURIComponent(searchTerm.trim());

          res = await categoryService.getFilteredCategories({
            query: `name=ilike.%${term}%`,
            signal: controller.signal,
          });
        } else {
          res = await categoryService.getFilteredCategories({
            query: "",
            limit: 20,
            offset: 0,
            signal: controller.signal,
          });
        }

        setCategories([...res.data.data]);
      } catch (err: any) {
        if (err.name !== "AbortError" && err.name !== "CanceledError") {
          console.error(err);
        }
      }
    }, 400);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [searchTerm]);

  const handleApply = async ({
    policy_id,
    categories,
  }: {
    policy_id: string;
    categories: string[];
  }) => {
    try {
      const payload = { policy_id, categories };
      await policyService.addCategoryToPolicy(payload);
      getPolicyById();
      toast.success("Categories added successfully");
    } catch (error: any) {
      console.log(error);
      toast.error(error?.response?.data?.message || error?.message);
    }
  };

  useEffect(() => {
    if (selectedPolicy) {
      setSelectedCategories(
        selectedPolicy.categories.map((cat: PolicyCategory) => cat.id),
      );
      setFormData({
        name: selectedPolicy.name,
        description: selectedPolicy.description,
        is_pre_approval_required: selectedPolicy.is_pre_approval_required,
      });
    }
  }, [selectedPolicy]);
  return (
    <>
      <div>
        <div className="flex items-center mb-6">
          <h1 className="text-2xl font-bold">
            {mode === "create"
              ? "Create Expense Policy"
              : "View Expense Policy"}
          </h1>
        </div>
        <div className="max-w-full">
          <form
            id="create-policy-form"
            onSubmit={handleSubmit}
            className="space-y-4 w-full"
          >
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-3">
                <Label>Name</Label>
                <Input
                  type="text"
                  value={formData.name}
                  disabled={mode !== "create"}
                  onChange={(e) => handleChange("name", e.target.value)}
                  placeholder="Enter name"
                />
              </div>
              <div className="space-y-3">
                <Label>Description</Label>
                <Input
                  type="text"
                  value={formData.description}
                  disabled={mode !== "create"}
                  onChange={(e) => handleChange("description", e.target.value)}
                  placeholder="Enter description"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <div className="flex flex-col gap-3 my-2">
                <Label>Pre Approval Required</Label>
                <div className="my-2">
                  <Switch
                    checked={formData.is_pre_approval_required}
                    disabled={mode !== "create"}
                    onCheckedChange={(checked) => {
                      handleChange("is_pre_approval_required", checked);
                    }}
                  />
                </div>
              </div>
            </div>
          </form>
        </div>
        {mode === "edit" && (
          <div>
            <div className="mb-2 flex items-center justify-between">
              <div className="-xl font-semibold">Selected Categories</div>
              <CategorySelectionDialog
                policy_id={row.id}
                handleApply={handleApply}
                categories={availableCategories}
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
              />
            </div>
            <DataGrid
              rows={selectedPolicy.categories}
              columns={columns}
              sx={{
                border: 0,
                "& .MuiDataGrid-columnHeaderTitle": {
                  color: "#9AA0A6",
                  fontWeight: "bold",
                  fontSize: "12px",
                },
                "& .MuiDataGrid-panel .MuiSelect-select": {
                  fontSize: "12px",
                },
                "& .MuiDataGrid-virtualScroller": {
                  overflow: loading ? "hidden" : "auto",
                },
                "& .MuiDataGrid-main": {
                  border: "0.2px solid #f3f4f6",
                },
                "& .MuiDataGrid-columnHeader": {
                  backgroundColor: "#f3f4f6",
                  border: "none",
                },
                "& .MuiDataGridToolbar-root": {
                  paddingX: "2px",
                  width: "100%",
                  justifyContent: "start",
                },
                "& .MuiDataGridToolbar": {
                  justifyContent: "start",
                  border: "none !important",
                },
                "& .MuiDataGrid-columnHeaders": {
                  border: "none",
                },
                "& .MuiDataGrid-row:hover": {
                  cursor: "pointer",
                  backgroundColor: "#f5f5f5",
                },
                "& .MuiDataGrid-cell": {
                  color: "#2E2E2E",
                  border: "0.2px solid #f3f4f6",
                },
                "& .MuiDataGrid-cell:focus, & .MuiDataGrid-columnHeader:focus":
                  {
                    outline: "none",
                  },
                "& .MuiDataGrid-cell:focus-within": {
                  outline: "none",
                },
                "& .MuiDataGrid-columnSeparator": {
                  color: "#f3f4f6",
                },
              }}
              density="compact"
              paginationModel={paginationModel}
              onPaginationModelChange={setPaginationModel}
            />
          </div>
        )}
      </div>
      <FormActionFooter
        secondaryButton={{
          label: "Back",
          onClick: () =>
            navigate("/admin-settings/product-config/expense-policies"),
          disabled: loading,
        }}
        primaryButton={
          mode === "create"
            ? {
                label: "Submit",
                onClick: () => {},
                type: "submit",
                form: "create-policy-form",
                disabled: loading,
                loading: loading,
                loadingText: "Submitting...",
              }
            : undefined
        }
      />
    </>
  );
}

export default CreateExpensePolicyPage;
