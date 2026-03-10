import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import * as Dialog from "@radix-ui/react-dialog";
import { Plus, X } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { useState } from "react";
import { CreatePolicyForm } from "@/pages/admin/CreateExpensePolicyPage";
import { CreatePolicyPayload, policyService } from "@/services/admin/policyService";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

function CreatePolicyDialog({
  open,
  setOpen,
  mode,
  onSubmitSuccessful
}: {
  open: boolean;
  setOpen: (val: boolean) => void;
  mode: "create" | "edit";
  onSubmitSuccessful: () => void
}) {
const navigate = useNavigate();
  const [formData, setFormData] = useState<CreatePolicyForm>({
    name: "",
    description: "",
    is_pre_approval_required: false,
  });
  const handleChange = (field: string, value: string | boolean) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

    const createPolicy = async (payload: CreatePolicyPayload) => {
      try {
        await policyService.createPolicy(payload);
        toast.success("Policy created successfully");
        setOpen(false);
        setFormData({
            name: "",
            description: "",
            is_pre_approval_required: false
        })
        setTimeout(() => {
          navigate("/admin-settings/product-config/expense-policies");
        }, 100);
        onSubmitSuccessful();
      } catch (error: any) {
        toast.error(
          error?.response?.data.message ||
            error.message ||
            "Failed to create policy",
        );
      }
    };

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (mode === "create") {
        const payload = { ...formData };
        createPolicy(payload);
      } else {
        console.log(formData);
      }
    };

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <Button
          style={{
            backgroundColor: "#0D9C99",
            color: "#FFFFFF",
            fontFamily: "Inter",
            fontWeight: 600,
            fontSize: "12px",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = "#0b8a87";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "#0D9C99";
          }}
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Policy
        </Button>
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[90vw] max-w-4xl -translate-x-1/2 -translate-y-1/2 bg-white rounded-xl p-6 shadow-lg focus:outline-none">
          <div className="flex items-center justify-between mb-6">
            <Dialog.Title className="text-lg font-semibold">
              Create Policy
            </Dialog.Title>
            <Dialog.Close asChild>
              <button className="p-2 rounded-md hover:bg-gray-100">
                <X className="h-4 w-4" />
              </button>
            </Dialog.Close>
          </div>

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
                    onCheckedChange={(checked) =>
                      handleChange("is_pre_approval_required", checked)
                    }
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Dialog.Close asChild>
                <Button type="button" variant="outline" className="border rounded-md">
                  Cancel
                </Button>
              </Dialog.Close>

              <Button
                type="submit"
                style={{
                  backgroundColor: "#0D9C99",
                  color: "#FFFFFF",
                  fontFamily: "Inter",
                  fontWeight: 600,
                  fontSize: "12px",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "#0b8a87";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "#0D9C99";
                }}
              >
                Save Policy
              </Button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export default CreatePolicyDialog;
