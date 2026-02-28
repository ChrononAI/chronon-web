import api from "@/lib/api";

export type Chat = {
  id: string;
  org_id: string;
  user_id: string;
  title: string;
  created_at: string;
  updated_at: string;
};

export type ChatMessage = {
  id: string;
  chat_id: string;
  author: "SYSTEM" | "USER";
  message: string | null;
  metadata: LineGraphMetadata;
  created_at: string;   // ISO timestamp
  updated_at: string;   // ISO timestamp
};

export type LineGraphMetadata = {
  type: "line_graph";
  axis_info: {
    x_axis: string;
    y_axis: string;
  };
  data_points: {
    x_axis: string[];  // dates as ISO strings
    y_axis: number[];
  };
  query_params: {
    resource: string;
    filters: QueryFilter[];
    order: unknown[];
    limit: number | null;
  };
  summary: {
    heading: string;
    content: string[];
  };
};

export type QueryFilter = {
  field: string;
  op: "eq" | "gte" | "lte" | "lt" | "gt" | string;
  value: string | number | boolean;
};

export const copilotService = {
    getChats: async () => {
        try {
            return await api.get('/api/v1/finance_agent/chats');
        } catch (error) {
            throw error;
        }
    },

    getMessages: async (chatId: string) => {
        try {
            return await api.get(`/api/v1/finance_agent/messages?chat_id=eq.${chatId}`);
        } catch (error) {
            throw error;
        }
    },

    sendMessage: async (payload: Record<string, string | undefined>) => {
      try {
        return await api.post("/api/v1/finance_agent/messages", payload);
      } catch (error) {
        throw error;
      }
    }
}