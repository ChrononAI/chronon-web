import api from "@/lib/api";

const USER_TEMPLATE_ACCEPT_HEADER =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

export const bulkUploadService = {
  async uploadUsers(file: File) {
    const formData = new FormData();
    formData.append("file", file);

    const response = await api.post("/api/v1/bulk_upload", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });

    return response;
  },

  async downloadUserTemplate() {
    const response = await api.get(
      "/api/v1/bulk_upload/user_template_download",
      {
        responseType: "blob",
        headers: {
          Accept: USER_TEMPLATE_ACCEPT_HEADER,
        },
      }
    );

    return response;
  },

  async downloadUsersData() {
    try {
      const res = await api.get("/api/v1/bulk_upload/user_data_download", {
        responseType: "blob",
        headers: {
          Accept: USER_TEMPLATE_ACCEPT_HEADER,
        },
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement("a");
      a.href = url;
      a.download = "users_data.xlsx";
      a.click();
      a.remove();
    } catch (error) {
      throw error;
    }
  },
};
