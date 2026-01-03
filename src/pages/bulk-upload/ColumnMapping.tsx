import { FormFooter } from "@/components/layout/FormFooter";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { bulkImportService } from "@/services/bulkImportService";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";

const DetectedHeaderDropdown = ({
  options,
  mapping,
  templateKey,
  onChange,
}: {
  options: string[];
  mapping: Record<string, string>;
  templateKey: string;
  onChange: (key: string, value: string) => void;
}) => {
  const selectTriggerClass =
    "border border-gray-200 bg-white px-4 text-sm shadow-none focus:outline-none focus:ring-1 focus:ring-primary focus-visible:ring-1 focus-visible:ring-primary focus-visible:ring-offset-0";

  const isHeaderAlreadyMapped = (
    header: string,
    currentTemplateKey: string
  ) => {
    return Object.entries(mapping).some(
      ([templateKey, mappedHeader]) =>
        templateKey !== currentTemplateKey && mappedHeader === header
    );
  };

  return (
    <Select
      value={mapping[templateKey]}
      onValueChange={(value) => {
        onChange(templateKey, value);
      }}
    >
      <SelectTrigger className={selectTriggerClass}>
        <SelectValue placeholder="Select header">
          {mapping[templateKey] || "Select header"}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="No Mapping" className="font-medium">
          No Mapping
        </SelectItem>
        {options
          .filter((header) => header && header)
          .map((header) => (
            <SelectItem
              key={header}
              value={header}
              disabled={isHeaderAlreadyMapped(header, templateKey)}
            >
              <div className="font-medium">{header}</div>
            </SelectItem>
          ))}
      </SelectContent>
    </Select>
  );
};

function ColumnMapping() {
  const navigate = useNavigate();
  const { fileid, type } = useParams();
  const [detectedHeaders, setDetectedHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [templateHeaders, setTemplateHeaders] = useState([]);
  const [loading, setLoading] = useState(false);

const getFileDetails = async (fileid: string) => {
  try {
    const res = await bulkImportService.getFileDetailsById(fileid);
    const data = res.data.data[0];

    setDetectedHeaders(data.detected_headers);
    setTemplateHeaders(data.template_headers);

    if (data.mappings) {
      const hydratedMapping: Record<string, string> = {};

      data.template_headers.forEach((header: any) => {
        hydratedMapping[header.field_key] =
          data.mappings[header.field_key] ?? "";
      });

      setMapping(hydratedMapping);
    } else {
      const autoMapping: Record<string, string> = {};

      data.template_headers.forEach((header: any) => {
        const matchedHeader = data.detected_headers.find(
          (detected: string) =>
            detected.trim().toLowerCase() ===
            header.display_name.trim().toLowerCase()
        );

        autoMapping[header.field_key] = matchedHeader || "";
      });

      setMapping(autoMapping);
    }
  } catch (error) {
    console.log(error);
    toast.error("Failed to load file details");
  }
};

  const validateMapping = (mapping: Record<string, string>) => {
    return templateHeaders
      .filter((header: any) => header.required)
      .every((header: any) => {
        const value = mapping[header.field_key];
        return value !== undefined && value !== "" && value !== "No Mapping";
      });
  };

  const formatMappingForPayload = (mapping: Record<string, string>) => {
    return Object.fromEntries(
      Object.entries(mapping).map(([key, value]) => [
        key,
        value === "No Mapping" ? "" : value,
      ])
    );
  };

  const mapColumns = async () => {
    if (!validateMapping(mapping)) {
      toast.error("Please map headers for all mandatory fields");
    } else {
      if (fileid && mapping) {
        setLoading(true);
        const cleanedMapping = formatMappingForPayload(mapping);
        try {
          await bulkImportService.mapColumns({
            fileid,
            mapping: cleanedMapping,
          });
          toast.success("Successfully mapped columns");
          navigate(
            `/admin-settings/product-config/bulk-uploads/validate-file/${type}/${fileid}`
          );
        } catch (error) {
          console.log(error);
        } finally {
          setLoading(false);
        }
      } else {
        toast.error("Cannot find file to map columns");
      }
    }
  };

  useEffect(() => {
    if (fileid) {
      getFileDetails(fileid);
    }
  }, []);

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold capitalize">Column Mapping</h1>
      </div>
      <div>
        {templateHeaders.map((header: any) => (
          <div
            key={header.field_key}
            className="flex items-center gap-6 my-6 *:w-1/2"
          >
            <div className="h-11 text-sm bg-gray-100 rounded-md flex items-center pl-4">
              {header.display_name}
              {header.required && <span className="ml-1">*</span>}
            </div>
            <DetectedHeaderDropdown
              mapping={mapping}
              templateKey={header.field_key}
              options={detectedHeaders || []}
              onChange={(key, value) => {
                setMapping((prev) => ({
                  ...prev,
                  [key]: value,
                }));
              }}
            />
          </div>
        ))}
      </div>
      <FormFooter>
        <Button variant="outline" onClick={() => navigate(-1)}>
          Back
        </Button>
        <Button disabled={loading} onClick={mapColumns}>
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Mapping...
            </>
          ) : (
            "Map Columns"
          )}
        </Button>
      </FormFooter>
    </div>
  );
}

export default ColumnMapping;
