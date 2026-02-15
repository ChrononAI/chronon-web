import { baseAPI } from "@/lib/api";

export interface InvoiceComment {
  id: string;
  invoice_id: string;
  comment: string;
  creator_user_id?: string;
  creator_type?: "USER" | "SYSTEM" | string;
  creator_user?: {
    id: string;
    email: string;
    full_name: string;
  };
  created_at: string;
  updated_at: string;
  org_id?: string;
}

export interface CreateInvoiceCommentRequest {
  invoice_id: string;
  comment: string;
}

export interface CreateInvoiceCommentResponse {
  data: {};
  message: string;
}

export interface GetInvoiceCommentsResponse {
  data: InvoiceComment[];
  count?: number;
  offset?: number;
}

export const invoiceCommentService = {
  async createComment(
    invoiceId: string,
    comment: string
  ): Promise<CreateInvoiceCommentResponse> {
    const response = await baseAPI.post("/v1/invoice_comments", {
      invoice_id: invoiceId,
      comment: comment,
    });
    return response.data;
  },
  async getComments(
    invoiceId: string
  ): Promise<GetInvoiceCommentsResponse> {
    const response = await baseAPI.get(
      `/v1/invoice_comments?invoice_id=${invoiceId}`
    );
    return response.data;
  },
};

