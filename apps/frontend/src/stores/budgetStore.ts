import { create } from "zustand";
import { devtools, subscribeWithSelector } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";

export interface Transaction {
  id: string;
  amount: number;
  description: string;
  category_id?: string;
  type: "income" | "expense";
  date: string;
  user_id: string;
  // Fields populated by backend joins
  category_name?: string;
  category_color?: string;
}

export interface Category {
  id: string;
  name: string;
  budget: number;
  color: string;
  user_id?: string;
  // Calculated fields from backend
  spent?: number;
  transaction_count?: number;
}

export interface BudgetState {
  transactions: Transaction[];
  categories: Category[];
  totalBalance: number;
  totalIncome: number;
  totalExpenses: number;
  isLoading: boolean;
  error: string | null;
}

export interface BudgetActions {
  addTransaction: (transaction: Omit<Transaction, "id">) => void;
  updateTransaction: (id: string, transaction: Partial<Transaction>) => void;
  deleteTransaction: (id: string) => void;
  addCategory: (category: Omit<Category, "id" | "spent">) => void;
  updateCategory: (id: string, category: Partial<Category>) => void;
  deleteCategory: (id: string) => void;
  setTransactions: (transactions: Transaction[]) => void;
  setCategories: (categories: Category[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  calculateTotals: () => void;
  reset: () => void;
  // API integration methods  loadTransactions: () => Promise<void>;
  loadCategories: () => Promise<void>;
  loadDashboardData: () => Promise<void>;
  refreshAllData: () => Promise<void>;
  createTransaction: (
    transaction: Omit<Transaction, "id" | "user_id">
  ) => Promise<void>;
  createCategory: (
    category: Omit<Category, "id" | "spent" | "user_id">
  ) => Promise<void>;
  removeTransaction: (id: string) => Promise<void>;
  removeCategory: (id: string) => Promise<void>;
}

export type BudgetStore = BudgetState & BudgetActions;

const initialState: BudgetState = {
  transactions: [],
  categories: [],
  totalBalance: 0,
  totalIncome: 0,
  totalExpenses: 0,
  isLoading: false,
  error: null,
};

// Helper function to normalize transaction data from API
const normalizeTransaction = (transaction: any): Transaction => ({
  ...transaction,
  amount:
    typeof transaction.amount === "string"
      ? parseFloat(transaction.amount) || 0
      : Number(transaction.amount) || 0,
});

// Helper function to normalize category data from API
const normalizeCategory = (category: any): Category => ({
  ...category,
  budget:
    typeof category.budget === "string"
      ? parseFloat(category.budget) || 0
      : Number(category.budget) || 0,
  spent:
    typeof category.spent === "string"
      ? parseFloat(category.spent) || 0
      : Number(category.spent) || 0,
});

// Helper function to normalize transactions array
const normalizeTransactions = (transactions: any[]): Transaction[] => {
  if (!Array.isArray(transactions)) return [];
  return transactions.map(normalizeTransaction);
};

// Helper function to normalize categories array
const normalizeCategories = (categories: any[]): Category[] => {
  if (!Array.isArray(categories)) return [];
  return categories.map(normalizeCategory);
};

// Enhanced Zustand v5 store with immer and subscribeWithSelector
export const useBudgetStore = create<BudgetStore>()(
  subscribeWithSelector(
    devtools(
      immer((set, get) => ({
        ...initialState,
        addTransaction: (transaction) => {
          set((state) => {
            const newTransaction: Transaction = normalizeTransaction({
              ...transaction,
              id: crypto.randomUUID(),
            });
            state.transactions.push(newTransaction);
          });
          get().calculateTotals();
        },
        updateTransaction: (id, updatedTransaction) => {
          set((state) => {
            const index = state.transactions.findIndex(
              (t: Transaction) => t.id === id
            );
            if (index !== -1) {
              const normalizedUpdate = normalizeTransaction({
                ...state.transactions[index],
                ...updatedTransaction,
              });
              state.transactions[index] = normalizedUpdate;
            }
          });
          get().calculateTotals();
        },

        deleteTransaction: (id) => {
          set((state) => {
            const index = state.transactions.findIndex(
              (t: Transaction) => t.id === id
            );
            if (index !== -1) {
              state.transactions.splice(index, 1);
            }
          });
          get().calculateTotals();
        },
        addCategory: (category) => {
          set((state) => {
            const newCategory: Category = normalizeCategory({
              ...category,
              id: crypto.randomUUID(),
              spent: 0,
            });
            state.categories.push(newCategory);
          });
        },
        updateCategory: (id, updatedCategory) => {
          set((state) => {
            const index = state.categories.findIndex(
              (c: Category) => c.id === id
            );
            if (index !== -1) {
              const normalizedUpdate = normalizeCategory({
                ...state.categories[index],
                ...updatedCategory,
              });
              state.categories[index] = normalizedUpdate;
            }
          });
        },

        deleteCategory: (id) => {
          set((state) => {
            const index = state.categories.findIndex(
              (c: Category) => c.id === id
            );
            if (index !== -1) {
              state.categories.splice(index, 1);
            }
          });
        },
        setTransactions: (transactions) => {
          set((state) => {
            state.transactions = normalizeTransactions(transactions);
          });
          get().calculateTotals();
        },
        setCategories: (categories) => {
          set((state) => {
            state.categories = normalizeCategories(
              Array.isArray(categories) ? categories : []
            );
          });
        },

        setLoading: (loading) => {
          set((state) => {
            state.isLoading = loading;
          });
        },

        setError: (error) => {
          set((state) => {
            state.error = error;
          });
        },
        calculateTotals: () => {
          set((state) => {
            const totalIncome = state.transactions
              .filter((t: Transaction) => t.type === "income")
              .reduce(
                (sum: number, t: Transaction) => sum + Number(t.amount),
                0
              );
            const totalExpenses = state.transactions
              .filter((t: Transaction) => t.type === "expense")
              .reduce(
                (sum: number, t: Transaction) => sum + Number(t.amount),
                0
              );
            const totalBalance = totalIncome - totalExpenses;

            state.totalIncome = totalIncome;
            state.totalExpenses = totalExpenses;
            state.totalBalance = totalBalance;
          });
        },
        reset: () => {
          set((state) => {
            Object.assign(state, initialState);
          });
        },

        // API integration methods
        loadTransactions: async () => {
          try {
            set((state) => {
              state.isLoading = true;
              state.error = null;
            });
            const { transactionsAPI } = await import("@/services/api");
            const transactions = await transactionsAPI.getAll();
            set((state) => {
              state.transactions = normalizeTransactions(transactions);
              state.isLoading = false;
            });

            get().calculateTotals();
          } catch (error) {
            set((state) => {
              state.error =
                error instanceof Error
                  ? error.message
                  : "Failed to load transactions";
              state.isLoading = false;
            });
          }
        },
        loadCategories: async () => {
          try {
            set((state) => {
              state.isLoading = true;
              state.error = null;
            });

            const { categoriesAPI } = await import("@/services/api");
            const categories = await categoriesAPI.getAll();
            set((state) => {
              state.categories = normalizeCategories(
                Array.isArray(categories) ? categories : []
              );
              state.isLoading = false;
            });
          } catch (error) {
            set((state) => {
              state.error =
                error instanceof Error
                  ? error.message
                  : "Failed to load categories";
              state.isLoading = false;
            });
          }
        },

        loadDashboardData: async () => {
          try {
            set((state) => {
              state.isLoading = true;
              state.error = null;
            });

            const { transactionsAPI, categoriesAPI } = await import(
              "@/services/api"
            );
            const [transactions, categories] = await Promise.all([
              transactionsAPI.getAll(),
              categoriesAPI.getAll(),
            ]);
            set((state) => {
              state.transactions = normalizeTransactions(transactions);
              state.categories = normalizeCategories(
                Array.isArray(categories) ? categories : []
              );
              state.isLoading = false;
            });

            get().calculateTotals();
          } catch (error) {
            set((state) => {
              state.error =
                error instanceof Error
                  ? error.message
                  : "Failed to load dashboard data";
              state.isLoading = false;
            });
          }
        },

        createTransaction: async (transaction) => {
          try {
            set((state) => {
              state.isLoading = true;
              state.error = null;
            });
            const { transactionsAPI } = await import("@/services/api");
            const newTransaction = await transactionsAPI.create(transaction);
            const normalizedTransaction = normalizeTransaction(newTransaction);
            set((state) => {
              if (Array.isArray(state.transactions)) {
                state.transactions.push(normalizedTransaction);
              } else {
                state.transactions = [normalizedTransaction];
              }
              state.isLoading = false;
            });

            get().calculateTotals();
          } catch (error) {
            set((state) => {
              state.error =
                error instanceof Error
                  ? error.message
                  : "Failed to create transaction";
              state.isLoading = false;
            });
          }
        },
        createCategory: async (category) => {
          try {
            set((state) => {
              state.isLoading = true;
              state.error = null;
            });

            const { categoriesAPI } = await import("@/services/api");
            const newCategory = await categoriesAPI.create(category);
            const normalizedCategory = normalizeCategory(newCategory);
            set((state) => {
              if (Array.isArray(state.categories)) {
                state.categories.push(normalizedCategory);
              } else {
                state.categories = [normalizedCategory];
              }
              state.isLoading = false;
            });
          } catch (error) {
            set((state) => {
              state.error =
                error instanceof Error
                  ? error.message
                  : "Failed to create category";
              state.isLoading = false;
            });
          }
        },
        removeTransaction: async (id) => {
          try {
            set((state) => {
              state.isLoading = true;
              state.error = null;
            });

            const { transactionsAPI } = await import("@/services/api");
            await transactionsAPI.delete(id);

            // Remove from local state
            set((state) => {
              const index = state.transactions.findIndex(
                (t: Transaction) => t.id === id
              );
              if (index !== -1) {
                state.transactions.splice(index, 1);
              }
              state.isLoading = false;
            });

            get().calculateTotals();
          } catch (error) {
            set((state) => {
              state.error =
                error instanceof Error
                  ? error.message
                  : "Failed to delete transaction";
              state.isLoading = false;
            });
            throw error; // Re-throw so UI can handle it
          }
        },

        removeCategory: async (id) => {
          try {
            set((state) => {
              state.isLoading = true;
              state.error = null;
            });

            const { categoriesAPI } = await import("@/services/api");
            await categoriesAPI.delete(id);

            // Remove from local state
            set((state) => {
              const index = state.categories.findIndex(
                (c: Category) => c.id === id
              );
              if (index !== -1) {
                state.categories.splice(index, 1);
              }
              state.isLoading = false;
            });
          } catch (error) {
            set((state) => {
              state.error =
                error instanceof Error
                  ? error.message
                  : "Failed to delete category";
              state.isLoading = false;
            });
            throw error; // Re-throw so UI can handle it
          }
        },

        refreshAllData: async () => {
          try {
            set((state) => {
              state.isLoading = true;
              state.error = null;
            });

            const { transactionsAPI, categoriesAPI } = await import(
              "@/services/api"
            );
            const [transactions, categories] = await Promise.all([
              transactionsAPI.getAll(),
              categoriesAPI.getAll(),
            ]);

            set((state) => {
              state.transactions = normalizeTransactions(transactions);
              state.categories = normalizeCategories(
                Array.isArray(categories) ? categories : []
              );
              state.isLoading = false;
            });

            get().calculateTotals();
          } catch (error) {
            set((state) => {
              state.error =
                error instanceof Error
                  ? error.message
                  : "Failed to refresh data";
              state.isLoading = false;
            });
          }
        },
      })),
      { name: "budget-store" }
    )
  )
);

// Selectors for optimized re-renders (React v19 compatible)
export const useTransactions = () => {
  const transactions = useBudgetStore((state) => state.transactions);
  return Array.isArray(transactions) ? transactions : [];
};
export const useCategories = () => {
  const categories = useBudgetStore((state) => state.categories);
  return Array.isArray(categories) ? categories : [];
};

// Fixed: Use individual selectors instead of object creation to prevent infinite loops
export const useTotalBalance = () =>
  useBudgetStore((state) => state.totalBalance);
export const useTotalIncome = () =>
  useBudgetStore((state) => state.totalIncome);
export const useTotalExpenses = () =>
  useBudgetStore((state) => state.totalExpenses);

export const useIsLoading = () => useBudgetStore((state) => state.isLoading);
export const useError = () => useBudgetStore((state) => state.error);
