import axios, { AxiosInstance, AxiosResponse } from "axios";
import { Transaction, Category } from "@/stores/budgetStore";

const API_BASE_URL = import.meta.env.VITE_API_URL;

// Configure axios to use fetch instead of XHR
const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
  // Use fetch adapter instead of XHR
  adapter: "fetch",
  // Include credentials (cookies) in requests
  withCredentials: true,
});

// Response interceptor for error handling and token refresh
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: any) => void;
  reject: (error?: any) => void;
}> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) {
      reject(error);
    } else {
      resolve(token);
    }
  });

  failedQueue = [];
};

api.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error) => {
    const originalRequest = error.config;

    // Prevent infinite loops: don't retry refresh endpoints or already retried requests
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url?.includes("/auth/refresh") &&
      !originalRequest.url?.includes("/auth/login") &&
      !originalRequest.url?.includes("/auth/register")
    ) {
      if (isRefreshing) {
        // If already refreshing, queue this request
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(() => {
            return api(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Try to refresh the token
        const refreshResponse = await api.post("/auth/refresh");

        if (refreshResponse.data.success) {
          processQueue(null, "refreshed");
          return api(originalRequest);
        } else {
          throw new Error("Refresh failed");
        }
      } catch (refreshError) {
        // Refresh failed, clear everything but DON'T redirect
        processQueue(refreshError, null);
        console.error("Token refresh failed:", refreshError);

        // Let the auth store handle the logout state
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    // Just reject the error, don't redirect here
    return Promise.reject(error);
  }
);

// Base response interface
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Auth API
export const authAPI = {
  login: async (email: string, password: string) => {
    const response = await api.post<ApiResponse<{ user: any }>>("/auth/login", {
      email,
      password,
    });
    return response.data;
  },

  register: async (email: string, password: string, name: string) => {
    const response = await api.post<ApiResponse<{ user: any }>>(
      "/auth/register",
      { email, password, name }
    );
    return response.data;
  },

  logout: async () => {
    const response = await api.post<ApiResponse<null>>("/auth/logout");
    return response.data;
  },

  verifyToken: async () => {
    const response = await api.get<ApiResponse<{ user: any }>>("/auth/me");
    return response.data;
  },
};

// Transactions API
export const transactionsAPI = {
  getAll: async (): Promise<Transaction[]> => {
    const response = await api.get<
      ApiResponse<{ transactions: Transaction[]; total: number }>
    >("/transactions");
    const transactions = response.data.data?.transactions || [];
    // Normalize the transaction data to ensure amounts are numbers
    return transactions.map((transaction: any) => ({
      ...transaction,
      amount:
        typeof transaction.amount === "string"
          ? parseFloat(transaction.amount) || 0
          : Number(transaction.amount) || 0,
    }));
  },

  create: async (
    transaction: Omit<Transaction, "id" | "user_id">
  ): Promise<Transaction> => {
    const response = await api.post<ApiResponse<Transaction>>(
      "/transactions",
      transaction
    );
    const newTransaction = response.data.data!;
    // Normalize the response data
    return {
      ...newTransaction,
      amount:
        typeof newTransaction.amount === "string"
          ? parseFloat(newTransaction.amount) || 0
          : Number(newTransaction.amount) || 0,
    };
  },
  update: async (
    id: string,
    transaction: Partial<Transaction>
  ): Promise<Transaction> => {
    const response = await api.put<ApiResponse<Transaction>>(
      `/transactions/${id}`,
      transaction
    );
    const updatedTransaction = response.data.data!;
    // Normalize the response data
    return {
      ...updatedTransaction,
      amount:
        typeof updatedTransaction.amount === "string"
          ? parseFloat(updatedTransaction.amount) || 0
          : Number(updatedTransaction.amount) || 0,
    };
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/transactions/${id}`);
  },

  getSummary: async (startDate?: string, endDate?: string) => {
    const params = new URLSearchParams();
    if (startDate) params.append("start_date", startDate);
    if (endDate) params.append("end_date", endDate);

    const response = await api.get<ApiResponse<any>>(
      `/transactions/summary?${params.toString()}`
    );
    return response.data.data;
  },
};

// Categories API
export const categoriesAPI = {
  getAll: async (): Promise<Category[]> => {
    const response = await api.get<ApiResponse<Category[]>>("/categories");
    const categories = response.data.data || [];
    // Normalize the category data to ensure budget and spent are numbers
    return categories.map((category: any) => ({
      ...category,
      budget:
        typeof category.budget === "string"
          ? parseFloat(category.budget) || 0
          : Number(category.budget) || 0,
      spent:
        typeof category.spent === "string"
          ? parseFloat(category.spent) || 0
          : Number(category.spent) || 0,
    }));
  },

  create: async (
    category: Omit<Category, "id" | "spent" | "user_id">
  ): Promise<Category> => {
    const response = await api.post<ApiResponse<Category>>(
      "/categories",
      category
    );
    const newCategory = response.data.data!;
    // Normalize the response data
    return {
      ...newCategory,
      budget:
        typeof newCategory.budget === "string"
          ? parseFloat(newCategory.budget) || 0
          : Number(newCategory.budget) || 0,
      spent:
        typeof newCategory.spent === "string"
          ? parseFloat(newCategory.spent) || 0
          : Number(newCategory.spent) || 0,
    };
  },

  update: async (
    id: string,
    category: Partial<Category>
  ): Promise<Category> => {
    const response = await api.put<ApiResponse<Category>>(
      `/categories/${id}`,
      category
    );
    const updatedCategory = response.data.data!;
    // Normalize the response data
    return {
      ...updatedCategory,
      budget:
        typeof updatedCategory.budget === "string"
          ? parseFloat(updatedCategory.budget) || 0
          : Number(updatedCategory.budget) || 0,
      spent:
        typeof updatedCategory.spent === "string"
          ? parseFloat(updatedCategory.spent) || 0
          : Number(updatedCategory.spent) || 0,
    };
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/categories/${id}`);
  },

  getWithSpending: async (startDate?: string, endDate?: string) => {
    const params = new URLSearchParams();
    if (startDate) params.append("start_date", startDate);
    if (endDate) params.append("end_date", endDate);

    const response = await api.get<ApiResponse<any[]>>(
      `/categories/with-spending?${params.toString()}`
    );
    return response.data.data || [];
  },

  getBudgetComparison: async () => {
    const response = await api.get<ApiResponse<any[]>>(
      "/categories/budget-comparison"
    );
    return response.data.data || [];
  },
};

// Users API
export const usersAPI = {
  getProfile: async () => {
    const response = await api.get<ApiResponse<{ user: any }>>(
      "/users/profile"
    );
    return response.data;
  },

  updateProfile: async (data: { name?: string; email?: string }) => {
    const response = await api.put<ApiResponse<{ user: any }>>(
      "/users/profile",
      data
    );
    return response.data;
  },

  changePassword: async (data: {
    currentPassword: string;
    newPassword: string;
  }) => {
    const response = await api.post<ApiResponse<null>>(
      "/users/change-password",
      data
    );
    return response.data;
  },
};

export default api;
