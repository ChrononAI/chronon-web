import api from "@/lib/api";

export const bulkImportService = {
  async bulkImport({
    file,
    template_key,
  }: {
    file: File;
    template_key: string;
  }) {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("template_key", template_key);
    try {
      const response = await api.post(`/api/v1/bulk_import`, formData, {
        timeout: 120000,
      });
      return response;
    } catch (error) {
      throw error;
    }
  },

  async previewFile(fileid: string) {
    try {
      return await api.get(`/api/v1/bulk_import/${fileid}/preview`);
    } catch (error) {
      throw error;
    }
  },

  async getImportedFiles({ limit, offset }: { limit: number; offset: number }) {
    try {
      return await api.get("/api/v1/bulk_import", {
        params: {
          limit,
          offset,
        },
      });
    } catch (error) {
      throw error;
    }
  },

  async getFileDetailsById(fileid: string) {
    try {
      return await api.get("/api/v1/bulk_import", {
        params: {
          limit: 1,
          offset: 0,
          id: `eq.${fileid}`,
        },
      });
    } catch (error) {
      throw error;
    }
  },

  async mapColumns({
    fileid,
    mapping,
  }: {
    fileid: string;
    mapping: Record<string, string>;
  }) {
    try {
      return await api.post(`/api/v1/bulk_import/${fileid}/mapping`, {
        mapping,
      });
    } catch (error) {
      throw error;
    }
  },

  async validateFile(fileid: string) {
    try {
      return await api.post(`/api/v1/bulk_import/${fileid}/validate`);
    } catch (error) {
      throw error;
    }
  },

  async getMappedData(fileid: string, limit?: number, offset?: number) {
    try {
      const params = new URLSearchParams();

      if (limit !== undefined) params.append("limit", String(limit));
      if (offset !== undefined) params.append("offset", String(offset));

      const query = params.toString();
      const url = query
        ? `/api/v1/bulk_import/${fileid}/rows?${query}`
        : `/api/v1/bulk_import/${fileid}/rows`;

      return await api.get(url);
    } catch (error) {
      throw error;
    }
  },

  async getMappedRowIssues(fileid: string) {
    try {
      return await api.get(`/api/v1/bulk_import/${fileid}/row_issues`);
    } catch (error) {
      throw error;
    }
  },

  async updateMappedRow({
    rowId,
    fileid,
    data,
  }: {
    rowId: string;
    fileid: string;
    data: Record<string, Record<string, string>>;
  }) {
    try {
      return await api.post(
        `/api/v1/bulk_import/${fileid}/rows/${rowId}`,
        data
      );
    } catch (error) {
      throw error;
    }
  },

  async finalizeFile(fileid: string) {
    try {
      return await api.post(`/api/v1/bulk_import/${fileid}/finalize`);
    } catch (error) {
      throw error;
    }
  },
};
