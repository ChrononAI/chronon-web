import { FormFooter } from "@/components/layout/FormFooter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  categoryService,
  CreateCategoriesPayloadType,
} from "@/services/admin/categoryService";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";

interface CategoryItem {
  id: number;
  name: string;
  description: string;
  is_receipt_required: boolean;
}

function CreateExpenseCategoryPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const row = location.state;
  const mode = row ? "edit" : "create";
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<CategoryItem[]>([
    { id: Date.now(), name: "", description: "", is_receipt_required: false },
  ]);

  useEffect(() => {
    if (row) {
      console.log(row);
      setItems([row]);
    }
  }, []);

  const handleAdd = () => {
    setItems((prev) => [
      ...prev,
      { id: Date.now(), name: "", description: "", is_receipt_required: false },
    ]);
  };

  const handleRemove = (id: number) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleChange = (
    id: number,
    field: keyof CategoryItem,
    value: string | boolean
  ) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  const createCategories = async (payload: CreateCategoriesPayloadType) => {
    setLoading(true);
    try {
      await categoryService.createCategories(payload);
      toast.success("Successfully created categories");
      navigate("/admin-settings/product-config/expense-categories");
    } catch (error: any) {
      console.log(error);
      toast.error(
        error?.response?.data?.message ||
          error.message ||
          "Failed to create categories"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === "create") {
      const payload: CreateCategoriesPayloadType = {
        categories: items.map((item) => {
          return {
            name: item.name,
            description: item.description,
            category_type: "EXPENSE",
            is_receipt_required: item.is_receipt_required,
          };
        }),
      };
      createCategories(payload);
    } else {
      console.log(items);
    }
  };
  return (
    <>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">{mode === "create" ? "Create Expense Categories" : "View Expense Category"}</h1>
        <div>
          <div className="w-full">
            <form
              onSubmit={handleSubmit}
              id="create-category-form"
              className="w-full space-y-2"
            >
              {items.map((item) => (
                <div key={item.id} className="flex items-end gap-4">
                  <div className="space-y-2">
                    <Label>Category</Label>
                    <Input
                      type="text"
                      value={item.name}
                      onChange={(e) =>
                        handleChange(item.id, "name", e.target.value)
                      }
                      disabled={mode !== "create"}
                      className="w-80"
                      placeholder="Enter category"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Input
                      type="text"
                      value={item.description}
                      onChange={(e) =>
                        handleChange(item.id, "description", e.target.value)
                      }
                      disabled={mode !== "create"}
                      className="w-80"
                      placeholder="Enter description"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label>Receipt Required</Label>
                    <Switch
                      checked={item.is_receipt_required}
                      className="my-[14px]"
                      disabled={mode !== "create"}
                      onCheckedChange={(checked) => {
                        handleChange(item.id, "is_receipt_required", checked);
                      }}
                    />
                  </div>
                  {items.length > 1 && (
                    <Button
                      type="button"
                      variant="destructive"
                      className="py-4"
                      onClick={() => handleRemove(item.id)}
                    >
                      Remove
                    </Button>
                  )}
                </div>
              ))}
              {!row && (
                <Button
                  type="button"
                  className="my-2"
                  variant="outline"
                  onClick={handleAdd}
                >
                  + Add Another
                </Button>
              )}
            </form>
          </div>
        </div>
      </div>
      <FormFooter>
        <Button
          variant="outline"
          onClick={() =>
            navigate("/admin-settings/product-config/expense-categories")
          }
          disabled={loading}
          className="px-6 py-2"
        >
          Back
        </Button>
        {mode === "create" && <Button
          type="submit"
          form="create-category-form"
          disabled={loading}
          variant="default"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Submitting...
            </>
          ) : 
            "Submit All"
          }
        </Button>}
      </FormFooter>
    </>
  );
}

export default CreateExpenseCategoryPage;
