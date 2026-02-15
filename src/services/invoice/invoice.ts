import { baseAPI } from "@/lib/api";
import axios from "axios";

export interface CreateFileResponse {
    data: {
        id: string;
        upload_url: string;
        download_url: string;
        name: string;
        content_type: string;
    };
}

export const createFileMetadata = async (name: string): Promise<CreateFileResponse> => {
    const response = await baseAPI.post("/v1/files/create",{
        type: "INVOICES",
        name: name,
    });
    return response.data;
}

export const uploadFileToS3 = async (uploadUrl:string,file:File): Promise<void> => {
    const fileBlob = await file.arrayBuffer();
    await axios.put(uploadUrl,fileBlob,{
        headers:{
            "Content-Type": file.type,
        }
    })
}

export interface InvoiceLineItem {
  id?: string;
  cgst_amount: string | null;
  cost_center_id: string | null;
  description: string | null;
  discount: string | null;
  gl_code: string | null;
  hsn_sac?: string | null;
  igst_amount: string | null;
  line_num: number;
  project_id: string | null;
  quantity: string | null;
  rate?: string | null;
  sgst_amount: string | null;
  subtotal: string | null;
  tax_code?: string | null;
  tds_amount?: string | null;
  tds_code?: string | null;
  total: string | null;
  unit_price: string | null;
  utgst_amount: string | null;
}

export interface RawOcrPayload {
  billing_address?: string | null;
  cgst_amount?: number | null;
  currency?: string;
  discount_amount?: number | null;
  due_date?: string | null;
  grn_number?: string | null;
  gst_number?: string | null;
  igst_amount?: number | null;
  invoice_date?: string | null;
  invoice_lineitems?: Array<{
    cgst_amount?: number | null;
    description?: string | null;
    discount?: number | null;
    igst_amount?: number | null;
    quantity?: number | null;
    sgst_amount?: number | null;
    subtotal?: number | null;
    total?: number | null;
    unit_price?: number | null;
  }>;
  invoice_number?: string | null;
  org_id?: string | null;
  po_number?: string | null;
  sgst_amount?: number | null;
  shipping_address?: string | null;
  subtotal_amount?: number | null;
  total_amount?: number | null;
  vendor_id?: string | null;
}

export interface InvoiceResponse {
  billing_address: string | null;
  cgst_amount: string | null;
  currency: string;
  discount_amount: string | null;
  due_date: string | null;
  file_ids: string[];
  grn_number: string | null;
  gst_number: string | null;
  id: string;
  igst_amount: string | null;
  invoice_date: string | null;
  invoice_lineitems: InvoiceLineItem[];
  invoice_number: string | null;
  org_id: string;
  ocr_status?: string;
  po_number: string | null;
  raw_ocr_payload?: RawOcrPayload;
  sequence_number?: string | null;
  sgst_amount: string | null;
  shipping_address: string | null;
  source_type: string;
  status: string;
  subtotal_amount: string | null;
  total_amount: string | null;
  type: string | null;
  user_id: string;
  vendor_id: string | null;
}

export interface CreateInvoiceResponse {
    data: InvoiceResponse[];
}

export interface GetAllInvoicesResponse {
    count: number;
    data: InvoiceResponse[];
    offset: number;
}

export interface GetInvoiceByIdResponse {
    count: number;
    data: InvoiceResponse[];
    offset: number;
}

export const createInvoiceFromFile = async (
  fileId: string
): Promise<CreateInvoiceResponse> => {
  const response = await baseAPI.post("/v1/invoices/create_from_file", [
    {
      file_id: fileId,
      source: "WEB",
    },
  ]);
  return response.data;
};

export const getAllInvoices = async (queryParams?: string): Promise<GetAllInvoicesResponse> => {
  const url = queryParams ? `/v1/invoices?${queryParams}` : "/v1/invoices";
  const response = await baseAPI.get(url);
  return response.data;
};

export const getInvoiceById = async (
  invoiceId: string
): Promise<GetInvoiceByIdResponse> => {
  const response = await baseAPI.get(`/v1/invoices?id=eq.${invoiceId}`);
  return response.data;
};

export interface GetFileDownloadUrlResponse {
  data: {
    download_url: string;
  };
}

export const getFileDownloadUrl = async (
  fileId: string
): Promise<GetFileDownloadUrlResponse> => {
  const response = await baseAPI.post(`/v1/files/generate_upload_url?id=${fileId}`);
  return response.data;
};

export interface InvoiceFileItem {
  created_at: string;
  file_name: string;
  invoice_id: string;
  ocr_status: string;
}

export interface GetInvoiceFilesResponse {
  count: number;
  data: InvoiceFileItem[];
  offset: number;
}

export const getInvoiceFiles = async (offset: number = 0, limit: number = 100): Promise<GetInvoiceFilesResponse> => {
  const response = await baseAPI.get(`/v1/invoices/files?offset=${offset}&limit=${limit}`);
  return response.data;
};

export const getApprovalInvoices = async (status?: string): Promise<GetAllInvoicesResponse> => {
  const url = status 
    ? `/v1/invoices/approvals?status=${status}`
    : "/v1/invoices/approvals";
  const response = await baseAPI.get(url);
  return response.data;
};

export const getApprovalInvoiceById = async (
  invoiceId: string
): Promise<GetInvoiceByIdResponse> => {
  const response = await baseAPI.get(`/v1/invoices/admin?id=eq.${invoiceId}`);
  return response.data;
};

export interface InvoiceActionRequest {
  action: "approve" | "reject";
  notes?: string;
}

export interface InvoiceActionResponse {
  message: string;
}

export const approveOrRejectInvoice = async (
  invoiceId: string,
  data: InvoiceActionRequest
): Promise<InvoiceActionResponse> => {
  const response = await baseAPI.post(`/v1/invoices/${invoiceId}/action`, data);
  return response.data;
};

export interface SubmitInvoiceRequest {
  invoice_id: string;
}

export interface SubmitInvoiceResponse {
  message: string;
}

export const submitInvoice = async (
  invoiceId: string
): Promise<SubmitInvoiceResponse> => {
  const response = await baseAPI.post("/v1/invoices/submit", {
    invoice_id: invoiceId,
  });
  return response.data;
};

export interface UpdateInvoiceLineItem {
  id?: string;
  cgst_amount?: string | null;
  description?: string | null;
  discount?: string | null;
  igst_amount?: string | null;
  line_num: number;
  quantity?: string | null;
  sgst_amount?: string | null;
  subtotal?: string | null;
  tax_code?: string | null;
  tds_amount?: string | null;
  tds_code?: string | null;
  total?: string | null;
  utgst_amount?: string | null;
}

export interface UpdateInvoiceData {
  invoice_number?: string | null;
  type?: string | null;
  invoice_date?: string | null;
  vendor_id?: string | null;
  gst_number?: string | null;
  billing_address?: string | null;
  shipping_address?: string | null;
  currency?: string;
  invoice_lineitems?: UpdateInvoiceLineItem[];
}

export interface UpdateInvoiceResponse {
  message: string;
  data?: InvoiceResponse[];
}

export const updateInvoice = async (
  invoiceId: string,
  data: UpdateInvoiceData
): Promise<UpdateInvoiceResponse> => {
  const response = await baseAPI.put(`/v1/invoices/${invoiceId}`, data);
  return response.data;
};
