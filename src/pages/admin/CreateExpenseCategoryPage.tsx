import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  categoryService,
  CreateCategoriesPayloadType,
} from "@/services/admin/categoryService";
import { ArrowLeft } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

interface CategoryItem {
  id: number;
  name: string;
  description: string;
}

function CreateExpenseCategoryPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<CategoryItem[]>([
    { id: Date.now(), name: "", description: "" },
  ]);

  // Add a new category-description pair
  const handleAdd = () => {
    setItems((prev) => [
      ...prev,
      { id: Date.now(), name: "", description: "" },
    ]);
  };

  // Remove a specific pair
  const handleRemove = (id: number) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  // Update input values
  const handleChange = (
    id: number,
    field: keyof CategoryItem,
    value: string
  ) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  const createCategories = async (payload: CreateCategoriesPayloadType) => {
    try {
      const res: any = await categoryService.createCategories(payload);
      console.log(res);
      toast.message("Successfully created categories");
      navigate("/admin/product-config/expense-categories");
    } catch (error: any) {
      console.log(error);
      toast.error(
        error?.response?.data?.message ||
          error.message ||
          "Failed to create categories"
      );
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
        };
      }),
    };
    createCategories(payload);
  };
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
        <h1 className="text-2xl font-bold">Create Expense Categories</h1>
      </div>
      <Card>
        <CardContent className="p-6 w-full">
          <form onSubmit={handleSubmit} className="space-y-4 p-3 w-full">
            <div className="flex justify-end">
              <Button type="button" variant="outline" onClick={handleAdd}>
                + Add Another
              </Button>
            </div>
            {items.map((item) => (
              <div
                key={item.id}
                className="flex flex-col gap-3 border p-4 w-full rounded-lg bg-card relative"
              >
                <div className="flex items-center gap-6 w-full">
                  <div className="space-y-3">
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

                  <div className="space-y-3">
                    <Label>Description</Label>
                    <div className="flex items-center gap-6">
                      <Input
                        type="text"
                        value={item.description}
                        onChange={(e) =>
                          handleChange(item.id, "description", e.target.value)
                        }
                        className="w-80"
                        placeholder="Enter description"
                      />
                      {items.length > 1 && (
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          onClick={() => handleRemove(item.id)}
                        >
                          Remove
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}

            <div className="flex justify-end mt-4">
              <Button type="submit" variant="default">
                Submit All
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default CreateExpenseCategoryPage;
