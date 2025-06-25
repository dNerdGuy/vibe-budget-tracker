import { useBudgetStore, useTransactions, useCategories } from "./budgetStore";

/**
 * Custom hook to ensure data is loaded for components that need it
 * This is now just a status checker - Layout handles the actual loading
 */
export function useEnsureData() {
  const { isLoading } = useBudgetStore();
  const transactions = useTransactions();
  const categories = useCategories();

  // No longer triggers loading - just returns status
  // Layout component handles the initial data loading
  return {
    hasData: transactions.length > 0 || categories.length > 0,
    isEmpty: transactions.length === 0 && categories.length === 0,
    isLoading,
  };
}

/**
 * Custom hook to force refresh data
 * Useful for pull-to-refresh or manual refresh scenarios
 */
export function useRefreshData() {
  const { refreshAllData } = useBudgetStore();

  return {
    refreshData: refreshAllData,
  };
}
