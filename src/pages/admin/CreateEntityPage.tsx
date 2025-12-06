import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { createEntity, createAttributes } from "@/services/admin/entities";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Loader2 } from "lucide-react";
import { FormFooter } from "@/components/layout/FormFooter";

const entitySchema = z.object({
  entityName: z.string().min(1, "Entity Name is required"),
  description: z.string().optional(),
  type: z.string().min(1, "Type is required"),
});

type EntityFormValues = z.infer<typeof entitySchema>;
type ValueRow = Record<string, string>;

export const CreateEntityPage = () => {
  const navigate = useNavigate();
  const [valueRows, setValueRows] = useState<ValueRow[]>([
    { value: "", accountCode: "" },
    { value: "", accountCode: "" },
  ]);
  const [tags, setTags] = useState<string[]>([]);
  const [popupIndex, setPopupIndex] = useState<number | null>(null);
  const [newTag, setNewTag] = useState("");
  const [loading, setLoading] = useState(false);
  const popupRef = useRef<HTMLDivElement | null>(null);

  const form = useForm<EntityFormValues>({
    resolver: zodResolver(entitySchema),
    defaultValues: { entityName: "", description: "", type: "" },
  });

  const selectedType = form.watch("type");

  const addValueRow = () =>
    setValueRows([...valueRows, { value: "", accountCode: "" }]);

  const updateValueRow = (index: number, field: string, value: string) => {
    const updated = [...valueRows];
    updated[index][field] = value;
    setValueRows(updated);
  };

  const handleCreateTag = () => {
    if (!newTag.trim()) return;
    if (tags.length > 0) {
      toast.error("Only one tag can be created");
      return;
    }
    setTags([newTag]);
    setNewTag("");
    setPopupIndex(null);
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        setPopupIndex(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const onSubmit = async (data: EntityFormValues) => {
    setLoading(true);
    const payload = {
      name: data.entityName,
      description: data.description || "",
      display_name: data.entityName,
      status: data.type,
      is_active: true,
    };
    try {
      const res = await createEntity(payload);
      if (res?.status === "success") {
        const entityId = res.data?.id;
        if (entityId && data.type === "SELECT" && valueRows.length > 0) {
          const attrs = valueRows
            .filter((v) => v.value.trim().length > 0)
            .map((v) => {
              const { value, accountCode = "", ...extra } = v;
              const trimmedValue = value.trim();
              const trimmedAccountCode = accountCode.trim();

              const metadata = Object.entries(extra).reduce<
                Record<string, string>
              >((acc, [key, val]) => {
                if (tags.includes(key)) {
                  const trimmed = val.trim();
                  if (trimmed.length > 0) {
                    acc[key] = trimmed;
                  }
                }
                return acc;
              }, {});

              return {
                value: trimmedValue,
                is_active: true,
                display_value: trimmedValue,
                ...(trimmedAccountCode
                  ? { account_code: trimmedAccountCode }
                  : {}),
                ...(Object.keys(metadata).length > 0 ? { metadata } : {}),
              };
            });

          if (attrs.length > 0) {
            try {
              const attrRes = await createAttributes({
                entity_id: entityId,
                attributes: attrs,
              });

              if (attrRes?.status !== "success") {
                toast.error(
                  attrRes?.message || "Failed to create entity attributes"
                );
                return;
              }
            } catch (error) {
              toast.error("Failed to create entity attributes");
              return;
            }
          }
        }
        toast.success("Entity created");
        navigate("/admin-settings/entities");
      } else {
        toast.error(res?.message || "Failed to create entity");
      }
    } catch (e) {
      toast.error("Failed to create entity");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl">
      <h1 className="text-2xl font-bold mb-6">Entities</h1>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <div className="bg-white border rounded-lg shadow-sm p-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
              <FormField
                control={form.control}
                name="entityName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Entity Name *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Enter entity name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Enter description" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type *</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="TEXT">Text</SelectItem>
                        <SelectItem value="BOOLEAN">Boolean</SelectItem>
                        <SelectItem value="SELECT">Select</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {selectedType === "SELECT" && (
              <div className="space-y-4">
                <div
                  className="grid gap-4"
                  style={{
                    gridTemplateColumns: `repeat(${
                      2 + tags.length
                    }, minmax(0, 1fr))`,
                  }}
                >
                  <Label className="text-sm font-medium">Values</Label>
                  <Label className="text-sm font-medium">ACCOUNT CODE</Label>
                  {tags.map((t, i) => (
                    <Label key={i} className="text-sm font-medium">
                      {t}
                    </Label>
                  ))}
                </div>

                {valueRows.map((row, index) => (
                  <div
                    key={index}
                    className="grid gap-4 items-center"
                    style={{
                      gridTemplateColumns: `repeat(${
                        2 + tags.length
                      }, minmax(0, 1fr))`,
                    }}
                  >
                    <Input
                      value={row.value}
                      onChange={(e) =>
                        updateValueRow(index, "value", e.target.value)
                      }
                      placeholder="Enter value"
                    />
                    <div className="flex items-center gap-2 relative">
                      <Input
                        value={row.accountCode}
                        onChange={(e) =>
                          updateValueRow(index, "accountCode", e.target.value)
                        }
                        placeholder="Enter account code"
                      />
                      {tags.length === 0 && (
                        <button
                          type="button"
                          onClick={() =>
                            setPopupIndex(popupIndex === index ? null : index)
                          }
                          className="font-semibold text-xs text-gray-700 hover:text-gray-900 underline underline-offset-2 whitespace-nowrap tracking-tight"
                        >
                          ADD TAG
                        </button>
                      )}

                      {popupIndex === index && (
                        <div
                          ref={popupRef}
                          className="absolute top-10 right-0 z-20 bg-white border border-gray-300 rounded-md shadow-md w-64 p-4"
                        >
                          <p className="text-sm font-semibold mb-2">
                            Add Tag name
                          </p>
                          <Input
                            placeholder="Enter tag name"
                            value={newTag}
                            onChange={(e) => setNewTag(e.target.value)}
                            className="mb-3"
                          />
                          <Button
                            onClick={handleCreateTag}
                            variant="secondary"
                            className="w-full text-black font-semibold bg-gray-200 hover:bg-gray-300"
                          >
                            CREATE
                          </Button>
                        </div>
                      )}
                    </div>
                    {tags.map((t, i) => (
                      <Input
                        key={i}
                        value={row[t] || ""}
                        placeholder={`Enter ${t}`}
                        onChange={(e) =>
                          updateValueRow(index, t, e.target.value)
                        }
                      />
                    ))}
                  </div>
                ))}

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={addValueRow}
                  className="text-sm text-gray-600 hover:text-gray-800"
                >
                  Add Value
                </Button>
              </div>
            )}

          </div>
            <FormFooter>
              <Button
                variant="outline"
                type="button"
                onClick={() => navigate("/admin-settings/entities")}
              >
                Back
              </Button>
              <Button type="submit" disabled={loading}>{ loading ? <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Submitting...
              </> : "SUBMIT"}</Button>
              </FormFooter>
        </form>
      </Form>
    </div>
  );
};
