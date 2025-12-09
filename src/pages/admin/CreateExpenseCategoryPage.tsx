import { FormFooter } from "@/components/layout/FormFooter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
}

function CreateExpenseCategoryPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<CategoryItem[]>([
    { id: Date.now(), name: "", description: "" },
  ]);

  const handleAdd = () => {
    setItems((prev) => [
      ...prev,
      { id: Date.now(), name: "", description: "" },
    ]);
  };

  const handleRemove = (id: number) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

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
        };
      }),
    };
    createCategories(payload);
  };
  return (
    <>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Create Expense Categories</h1>
        <Card>
          <CardContent className="p-6 w-full">
            <form onSubmit={handleSubmit} id="create-category-form" className="space-y-4 p-3 w-full">
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
            </form>
          </CardContent>
        </Card>
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
        <Button type="submit" form="create-category-form" disabled={loading} variant="default">
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
