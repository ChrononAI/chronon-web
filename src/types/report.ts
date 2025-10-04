export interface AdditionalFieldMeta {
  id: string;
  name: string;
  type: string;
  metadata: {
    label: string;
    placeholder: string;
    options: Array<{
      key: string;
      value: string;
    }>;
  };
}

export interface OrganizationMeta {
  additionalFieldsMeta?: {
    expense_reports_fields?: AdditionalFieldMeta[];
  };
}

export interface CreateReportData {
  title: string;
  description: string;
  additionalFields: {
    fields: Array<{
      attr_id: string;
      attr_name: string;
      selected_value: Array<{
        key: string;
        value: string;
      }>;
      attr_type: string;
    }>;
  };
  expenseIds: string[];
}

export interface CustomAttribute {
  id: string;
  name: string;
  display_name: string;
  attribute_type: 'DROPDOWN' | 'TEXT' | 'NUMBER' | 'DATE' | 'BOOLEAN';
  description: string;
  is_required: boolean;
  is_active: boolean;
  dropdown_values?: string[];
  org_id: string;
  created_at: string;
  updated_at: string;
}

export interface CustomAttributesResponse {
  status: string;
  message: string;
  data: {
    custom_attributes: CustomAttribute[];
    org_id: string;
    total_count: number;
  };
}