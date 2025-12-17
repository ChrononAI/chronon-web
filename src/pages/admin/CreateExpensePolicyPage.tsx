import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Loader2, Search } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { PolicyCategory } from "@/types/expense";
import { categoryService } from "@/services/admin/categoryService";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import {
  CreatePolicyPayload,
  policyService,
} from "@/services/admin/policyService";
import { FormFooter } from "@/components/layout/FormFooter";

export interface CreatePolicyForm {
  name: string;
  description: string;
  is_pre_approval_required: boolean;
}

function CreateExpensePolicyPage() {
  const navigate = useNavigate();

  const [categories, setCategories] = useState<PolicyCategory[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [formData, setFormData] = useState<CreatePolicyForm>({
    name: "",
    description: "",
    is_pre_approval_required: false,
  });
  const [loading, setLoading] = useState(false);

  const getAllCategories = async () => {
    try {
      const res = await categoryService.getAllCategories();
      setCategories(res.data.data);
    } catch (error: any) {
      console.log(error);
      toast.error(
        error?.response?.data?.message ||
          error.message ||
          "Failed to get categories"
      );
    }
  };

  const createPolicy = async (payload: CreatePolicyPayload) => {
    setLoading(true);
    try {
      await policyService.createPolicy(payload);
      toast.success("Policy created successfully");
      setTimeout(() => {
        navigate("/admin-settings/product-config/expense-policies");
      }, 100);
    } catch (error: any) {
      console.log(error);
      toast.error(
        error?.response?.data.message ||
          error.message ||
          "Failed to create policy"
      );
    } finally {
      setLoading(false);
    }
  };

  const filteredCategories = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return categories;

    return categories.filter((c) => c.name.toLowerCase().includes(q));
  }, [categories, searchTerm]);

  const handleChange = (field: string, value: string | boolean) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleCheckboxChange = (id: string) => {
    setSelectedCategories((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAllFiltered = () => {
    const ids = filteredCategories.map((c) => c.id);
    setSelectedCategories((prev) => Array.from(new Set([...prev, ...ids])));
  };

  const handleDeselectAllFiltered = () => {
    const filteredIds = new Set(filteredCategories.map((c) => c.id));
    setSelectedCategories((prev) => prev.filter((id) => !filteredIds.has(id)));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = { ...formData, category_ids: selectedCategories };
    createPolicy(payload);
  };

  useEffect(() => {
    getAllCategories();
  }, []);
  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center mb-6">
          <h1 className="text-2xl font-bold">Create Expense Policy</h1>
        </div>
        <div className="max-w-full">
          <div>
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
                    onChange={(e) => handleChange("name", e.target.value)}
                    placeholder="Enter name"
                  />
                </div>
                <div className="space-y-3">
                  <Label>Description</Label>
                  <Input
                    type="text"
                    value={formData.description}
                    onChange={(e) =>
                      handleChange("description", e.target.value)
                    }
                    placeholder="Enter description"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2">
                <div className="flex flex-col gap-3 my-2">
                  <Label>Pre Approval Required</Label>
                  <div>
                    <Switch
                      checked={formData.is_pre_approval_required}
                      onCheckedChange={(checked) => {
                        handleChange("is_pre_approval_required", checked);
                      }}
                    />
                  </div>
                </div>
              </div>
              {
                <div className="space-y-3">
                  <div className="flex items-center gap-4">
                    <Label>Select Categories</Label>
                    <div className="relative flex-1 flex items-center gap-4 max-w-full">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        placeholder="Search"
                        className="pl-9 bg-white max-w-60"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                      {selectedCategories.length !== filteredCategories.length && <Button
                        type="button"
                        className="w-32"
                        onClick={handleSelectAllFiltered}
                      >
                        Select all
                      </Button>}
                      {selectedCategories.length === filteredCategories.length && <Button
                        type="button"
                        className="w-32"
                        onClick={handleDeselectAllFiltered}
                      >
                        Deselect all
                      </Button>}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                    {filteredCategories.map((cat) => {
                      return (
                        <div key={cat.id} className="flex items-center gap-3">
                          <Checkbox
                            checked={selectedCategories.includes(cat.id)}
                            onCheckedChange={() => handleCheckboxChange(cat.id)}
                          />
                          <span className="text-[14px]">{cat.name}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              }
            </form>
          </div>
        </div>
      </div>
      <FormFooter>
        <Button
          variant="outline"
          onClick={() =>
            navigate("/admin-settings/product-config/expense-policies")
          }
          disabled={loading}
          className="px-6 py-2"
        >
          Back
        </Button>
        <Button form="create-policy-form" type="submit" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Submitting...
            </>
          ) : (
            "Submit"
          )}
        </Button>
      </FormFooter>
    </>
  );
}

export default CreateExpensePolicyPage;
