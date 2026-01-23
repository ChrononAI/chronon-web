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
  cgst_amount: string | null;
  cost_center_id: string | null;
  description: string | null;
  discount: string | null;
  gl_code: string | null;
  hsn_sac: string | null;
  igst_amount: string | null;
  line_num: number;
  project_id: string | null;
  quantity: string | null;
  sgst_amount: string | null;
  subtotal: string | null;
  total: string | null;
  unit_price: string | null;
  utgst_amount: string | null;
}

export interface InvoiceResponse {
  billing_address: string | null;
  cgst_amount: string | null;
  currency: string;
  discount_amount: string | null;
  due_date: string | null;
  file_ids: string[];
  grn_number: string | null;
  id: string;
  igst_amount: string | null;
  invoice_date: string | null;
  invoice_lineitems: InvoiceLineItem[];
  invoice_number: string | null;
  org_id: string;
  ocr_status?: string;
  po_number: string | null;
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

export const getAllInvoices = async (): Promise<GetAllInvoicesResponse> => {
  const response = await baseAPI.get("/v1/invoices");
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

export interface UpdateInvoiceRequest {
  invoice_number: string;
  type: string;
  invoice_date: string;
  currency: string;
  billing_address: string;
  shipping_address: string;
  invoice_lineitems: Array<{
    id?: string;
    description: string;
    line_num: string;
    hsn_sac?: string;
    gl_code?: string;
    unit_of_measure?: string;
    total_tax_amount?: number;
    discount?: number;
  }>;
}

export const updateInvoice = async (
  invoiceId: string,
  data: UpdateInvoiceRequest
): Promise<any> => {
  const response = await baseAPI.put(`/v1/invoice/${invoiceId}`, data);
  return response.data;
};
