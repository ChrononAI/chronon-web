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
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

interface CategoryItem {
  id: number;
  name: string;
  description: string;
  receipt_required: boolean;
}

function CreateExpenseCategoryPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<CategoryItem[]>([
    { id: Date.now(), name: "", description: "", receipt_required: false },
  ]);

  const handleAdd = () => {
    setItems((prev) => [
      ...prev,
      { id: Date.now(), name: "", description: "", receipt_required: false },
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
    console.log(payload);
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
    const payload: CreateCategoriesPayloadType = {
      categories: items.map((item) => {
        return {
          name: item.name,
          description: item.description,
          category_type: "EXPENSE",
          receipt_required: item.receipt_required,
        };
      }),
    };
    createCategories(payload);
  };
  return (
    <>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Create Expense Categories</h1>
        <div>
          <div className="w-full">
            <form
              onSubmit={handleSubmit}
              id="create-category-form"
              className="w-full space-y-2"
            >
              {items.map((item) => (
                <div className="flex items-end gap-4">
                  <div className="space-y-2">
                    <Label>Category</Label>
                    <Input
                      type="text"
                      value={item.name}
                      onChange={(e) =>
                        handleChange(item.id, "name", e.target.value)
                      }
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
                      className="w-80"
                      placeholder="Enter description"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label>Receipt Required</Label>
                    <Switch
                      checked={item.receipt_required}
                      className="my-[14px]"
                      onCheckedChange={(checked) => {
                        handleChange(item.id, "receipt_required", checked);
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
              <Button
                type="button"
                className="my-2"
                variant="outline"
                onClick={handleAdd}
              >
                + Add Another
              </Button>
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
        <Button
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
          ) : (
            "Submit All"
          )}
        </Button>
      </FormFooter>
    </>
  );
}

export default CreateExpenseCategoryPage;
