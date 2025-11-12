import api from "@/lib/api";

interface CategoryItem {
  name: string;
  description: string;
  category_type: string;
}

export interface CreateCategoriesPayloadType {
    categories: CategoryItem[]
}

export const categoryService = {
    async createCategories(payload: CreateCategoriesPayloadType) {
        try {
            const response = await api.post('api/v1/categories/bulk', payload);
            return response;
        } catch (error) {
            throw error;
        }
    },

    async getCategories({ page = 1, perPage = 10 }: { page: number, perPage: number }) {
        try {
            const response = api.get(`/api/v1/categories?page=${page}&per_page=${perPage}`);
            return response;
        } catch (error) {
            throw error;
        }
    },

    async getAllCategories() {
        try {
            const response = api.get('/api/v1/categories?page=1&per_page=100');
            return response;
        } catch (error) {
            throw error;
        }
    }
}