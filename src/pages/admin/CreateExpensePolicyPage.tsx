import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CardContent } from "@mui/material";
import { ArrowLeft } from "lucide-react";
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

export interface CreatePolicyForm {
  name: string;
  description: string;
  is_pre_approval_required: boolean;
}

function CreateExpensePolicyPage() {
  const navigate = useNavigate();

  const [categories, setCategories] = useState<PolicyCategory[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [formData, setFormData] = useState<CreatePolicyForm>({
    name: "",
    description: "",
    is_pre_approval_required: false,
  });

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
    try {
      await policyService.createPolicy(payload);
      toast.success("Policy created successfully");
      setTimeout(() => {
        navigate("/admin/product-config/expense-policies");
      }, 100);
    } catch (error: any) {
      console.log(error);
      toast.error(
        error?.response?.data.message ||
          error.message ||
          "Failed to create policy"
      );
    }
  };

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = { ...formData, category_ids: selectedCategories };
    createPolicy(payload);
  };

  useEffect(() => {
    getAllCategories();
  }, []);
  return (
    <div className="space-y-6">
      <div className="flex items-center mb-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(-1)}
          className="mr-4"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-bold">Create Expense Policy</h1>
      </div>
      <Card className="max-w-4xl">
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4 p-3 w-full">
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
                  onChange={(e) => handleChange("description", e.target.value)}
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
                <div>
                  <Label>Select Categories</Label>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-3">
                  {categories.map((cat) => {
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
            <div className="flex justify-end">
              <Button type="submit">Submit</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default CreateExpensePolicyPage;
