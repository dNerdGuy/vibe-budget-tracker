import { useState } from "react";
import { motion } from "framer-motion";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  TrendingUp,
  TrendingDown,
  X,
  Folder,
  Wallet,
  PiggyBank,
} from "lucide-react";
import {
  useTransactions,
  useCategories,
  useIsLoading,
} from "@/stores/budgetStore";

import { AddTransactionForm } from "./AddTransactionForm";
import { AddCategoryForm } from "./AddCategoryForm";
import { StatCard } from "./StatCard";
import {
  SpendingTrendChart,
  CategoryBreakdownChart,
  BudgetProgressChart,
} from "./Charts";
import { RecentTransactions, QuickStats } from "./TransactionWidgets";
import { DateFilterComponent, DateFilter } from "./DateFilter";
import { isWithinInterval, startOfDay, endOfDay } from "date-fns";

interface BudgetAnalysis {
  id: string;
  name: string;
  budget: number;
  spent: number;
  remaining: number;
  percentageUsed: number;
  color: string;
}

export function BudgetDashboard() {
  const transactions = useTransactions();
  const categories = useCategories();
  const isLoading = useIsLoading();
  const [showAddForm, setShowAddForm] = useState<
    "transaction" | "category" | null
  >(null);
  const [dateFilter, setDateFilter] = useState<DateFilter>({
    from: undefined,
    to: undefined,
    preset: undefined,
  });
  // Calculate budget analysis from existing categories data
  const budgetAnalysis: BudgetAnalysis[] = categories.map((category) => {
    const spent = category.spent || 0;
    const budget = category.budget || 0;
    const remaining = budget - spent;
    const percentageUsed = budget > 0 ? (spent / budget) * 100 : 0;

    return {
      id: category.id,
      name: category.name,
      budget,
      spent,
      remaining,
      percentageUsed,
      color: category.color,
    };
  });

  // Get recent transactions (last 5) - ensure transactions is always an array
  const safeTransactions = (() => {
    if (Array.isArray(transactions)) {
      return transactions;
    }
    return [];
  })();

  // Filter transactions based on date filter
  const filteredTransactions = safeTransactions.filter((transaction) => {
    if (!dateFilter.from && !dateFilter.to) {
      return true; // No filter applied
    }

    const transactionDate = new Date(transaction.date);

    if (dateFilter.from && dateFilter.to) {
      return isWithinInterval(transactionDate, {
        start: startOfDay(dateFilter.from),
        end: endOfDay(dateFilter.to),
      });
    }

    if (dateFilter.from) {
      return transactionDate >= startOfDay(dateFilter.from);
    }

    if (dateFilter.to) {
      return transactionDate <= endOfDay(dateFilter.to);
    }

    return true;
  });

  // Calculate filtered totals for date-dependent sections
  const filteredIncome = filteredTransactions
    .filter((t) => t.type === "income")
    .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

  const filteredExpenses = filteredTransactions
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

  const filteredBalance = filteredIncome - filteredExpenses;

  // Generate chart data based on filtered transactions
  const generateSpendingTrendData = () => {
    // Use filtered transactions for chart data
    const transactionsToUse = filteredTransactions;

    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - i));
      return {
        label: date.toLocaleDateString("en-US", { weekday: "short" }),
        date: date.toISOString().split("T")[0],
      };
    });

    const expenseData = last7Days.map((day) => {
      const dayExpenses = transactionsToUse.filter((t) => {
        // Normalize transaction date to YYYY-MM-DD format for comparison
        const transactionDate = t.date.includes("T")
          ? t.date.split("T")[0]
          : t.date;
        return t.type === "expense" && transactionDate === day.date;
      });
      return dayExpenses.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
    });

    const incomeData = last7Days.map((day) => {
      const dayIncome = transactionsToUse.filter((t) => {
        // Normalize transaction date to YYYY-MM-DD format for comparison
        const transactionDate = t.date.includes("T")
          ? t.date.split("T")[0]
          : t.date;
        return t.type === "income" && transactionDate === day.date;
      });
      return dayIncome.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
    });

    return {
      labels: last7Days.map((day) => day.label),
      datasets: [
        {
          label: "Expenses",
          data: expenseData,
          borderColor: "#ef4444",
          backgroundColor: "rgba(239, 68, 68, 0.1)",
          tension: 0.4,
        },
        {
          label: "Income",
          data: incomeData,
          borderColor: "#22c55e",
          backgroundColor: "rgba(34, 197, 94, 0.1)",
          tension: 0.4,
        },
      ],
    };
  };
  const generateCategoryBreakdownData = () => {
    // Calculate actual spending per category using filtered transactions
    const categorySpending = categories
      .map((cat) => {
        const spent = filteredTransactions
          .filter((t) => t.category_id === cat.id && t.type === "expense")
          .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

        return {
          name: cat.name,
          value: spent,
          color: cat.color || "#6b7280",
        };
      })
      .filter((cat) => cat.value > 0); // Only show categories with spending

    // If no spending data, show placeholder
    if (categorySpending.length === 0) {
      return {
        labels: ["No Data"],
        datasets: [
          {
            data: [1],
            backgroundColor: ["#6b7280"],
            borderWidth: 0,
          },
        ],
      };
    }

    return {
      labels: categorySpending.map((cat) => cat.name),
      datasets: [
        {
          data: categorySpending.map((cat) => cat.value),
          backgroundColor: categorySpending.map((cat) => cat.color),
          borderWidth: 0,
        },
      ],
    };
  };

  const generateBudgetProgressData = () => {
    return {
      labels: budgetAnalysis.slice(0, 5).map((item) => item.name),
      datasets: [
        {
          label: "Budget Used (%)",
          data: budgetAnalysis
            .slice(0, 5)
            .map((item) => Math.min(item.percentageUsed, 100)),
          backgroundColor: budgetAnalysis.slice(0, 5).map((item) => {
            const percentage = item.percentageUsed;
            if (percentage < 50) return "#22c55e";
            if (percentage < 80) return "#f59e0b";
            return "#ef4444";
          }),
          borderRadius: 8,
        },
      ],
    };
  };

  const recentTransactions = [...filteredTransactions]
    .sort((a, b) => {
      // Normalize dates to handle different formats
      const dateA = new Date(
        a.date.includes("T") ? a.date : a.date + "T00:00:00"
      );
      const dateB = new Date(
        b.date.includes("T") ? b.date : b.date + "T00:00:00"
      );

      // If dates are invalid, fallback to string comparison (newest first)
      if (isNaN(dateA.getTime()) || isNaN(dateB.getTime())) {
        return b.date.localeCompare(a.date);
      }

      return dateB.getTime() - dateA.getTime();
    })
    .slice(0, 5);
  if (isLoading) {
    return (
      <div className="space-y-8 p-6 bg-slate-950">
        <div className="flex justify-between items-center">
          {" "}
          <h2 className="text-3xl font-bold text-slate-200">Dashboard</h2>
        </div>

        {/* Loading skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <Card
              key={i}
              className="border-0 shadow-lg bg-slate-900 border-slate-800"
            >
              <CardContent className="h-32 animate-pulse bg-gradient-to-br from-slate-800 to-slate-700 rounded-lg" />
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <Card
              key={i}
              className="border-0 shadow-lg bg-slate-900 border-slate-800"
            >
              <CardContent className="h-64 animate-pulse bg-gradient-to-br from-slate-800 to-slate-700 rounded-lg" />
            </Card>
          ))}
        </div>
      </div>
    );
  }
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-8 p-6 bg-slate-950"
    >
      {" "}
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            {" "}
            <h2 className="text-4xl font-bold text-slate-200">Dashboard</h2>
            <p className="text-slate-400 mt-1">
              Welcome back! Here's your financial overview.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button
              onClick={() =>
                setShowAddForm(
                  showAddForm === "transaction" ? null : "transaction"
                )
              }
              className="bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-700 hover:to-slate-800 text-white shadow-lg hover:shadow-xl transition-all duration-300"
              size="lg"
            >
              <Plus className="mr-2 h-5 w-5" />
              Add Transaction
            </Button>
            <Button
              onClick={() =>
                setShowAddForm(showAddForm === "category" ? null : "category")
              }
              variant="outline"
              className="border-2 border-slate-600/30 hover:border-slate-500/50 hover:bg-slate-800/30 shadow-md text-slate-300 hover:text-slate-200"
              size="lg"
            >
              <Folder className="mr-2 h-5 w-5" />
              Add Category
            </Button>
          </div>
        </div>

        {/* Date Filter Section */}
        <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-4">
          <DateFilterComponent
            dateFilter={dateFilter}
            onDateFilterChange={setDateFilter}
          />
        </div>
      </motion.div>{" "}
      {/* Financial Overview - Unified Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="space-y-4"
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="h-2 w-2 rounded-full bg-green-500"></div>
          <h3 className="text-xl font-semibold text-slate-200">
            Financial Overview
          </h3>
          {(dateFilter.from || dateFilter.to) && (
            <Badge variant="secondary" className="text-xs">
              {filteredTransactions.length} filtered transactions
            </Badge>
          )}
        </div>

        {/* Unified Stats Cards - All affected by date filter */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Balance"
            value={`$${filteredBalance.toFixed(2)}`}
            change={
              filteredBalance >= 0 ? "Positive balance" : "Negative balance"
            }
            changeType={filteredBalance >= 0 ? "positive" : "negative"}
            icon={Wallet}
            color="from-slate-500 to-slate-600"
            index={0}
          />
          <StatCard
            title="Income"
            value={`$${filteredIncome.toFixed(2)}`}
            change={`${
              filteredTransactions.filter((t) => t.type === "income").length
            } transactions`}
            changeType="positive"
            icon={TrendingUp}
            color="from-emerald-600 to-emerald-700"
            index={1}
          />
          <StatCard
            title="Expenses"
            value={`$${filteredExpenses.toFixed(2)}`}
            change={`${
              filteredTransactions.filter((t) => t.type === "expense").length
            } transactions`}
            changeType="negative"
            icon={TrendingDown}
            color="from-red-600 to-red-700"
            index={2}
          />
          <StatCard
            title="Categories"
            value={categories.length.toString()}
            change={`${filteredTransactions.length} total transactions`}
            changeType="neutral"
            icon={PiggyBank}
            color="from-amber-600 to-amber-700"
            index={3}
          />
        </div>
      </motion.div>{" "}
      {/* Visual Analytics */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="space-y-4"
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="h-2 w-2 rounded-full bg-slate-500"></div>
          <h3 className="text-xl font-semibold text-slate-200">
            Visual Analytics
          </h3>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SpendingTrendChart data={generateSpendingTrendData()} index={7} />
          <CategoryBreakdownChart
            data={generateCategoryBreakdownData()}
            index={8}
          />
        </div>
      </motion.div>{" "}
      {/* Recent Activity and Quick Stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="space-y-4"
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="h-2 w-2 rounded-full bg-amber-500"></div>
          <h3 className="text-xl font-semibold text-slate-200">
            Recent Activity
          </h3>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <QuickStats
              totalIncome={filteredIncome}
              totalExpenses={filteredExpenses}
              totalBalance={filteredBalance}
              transactionCount={filteredTransactions.length}
              index={9}
            />
          </div>
          <div className="lg:col-span-2">
            <RecentTransactions transactions={recentTransactions} index={10} />
          </div>
        </div>
      </motion.div>{" "}
      {/* Budget Analysis */}
      {budgetAnalysis.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="space-y-4"
        >
          {" "}
          <div className="flex items-center gap-3 mb-4">
            <div className="h-2 w-2 rounded-full bg-orange-500"></div>
            <h3 className="text-xl font-semibold text-slate-200">
              Budget Analysis
            </h3>
            <Badge
              variant="outline"
              className="text-xs text-slate-400 border-slate-600"
            >
              Not affected by date filter
            </Badge>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <BudgetProgressChart
              data={generateBudgetProgressData()}
              index={11}
            />

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
            >
              <Card className="border-0 shadow-lg bg-slate-900 border-slate-800">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg font-semibold text-slate-100">
                    Budget Overview
                  </CardTitle>
                  <CardDescription className="text-slate-400">
                    How you're tracking against your budgets
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {budgetAnalysis.slice(0, 4).map((item, i) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.6 + i * 0.1 }}
                      className="flex items-center justify-between p-3 rounded-lg bg-slate-800/50 border border-slate-700"
                    >
                      <div className="flex items-center space-x-3">
                        <div
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: item.color }}
                        />
                        <div>
                          <p className="font-medium text-slate-100">
                            {item.name}
                          </p>
                          <p className="text-sm text-slate-400">
                            ${item.spent.toFixed(2)} of $
                            {item.budget.toFixed(2)}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p
                          className={`font-semibold ${
                            item.percentageUsed < 80
                              ? "text-green-400"
                              : "text-red-400"
                          }`}
                        >
                          {item.percentageUsed.toFixed(1)}%
                        </p>
                        <p className="text-sm text-slate-400">
                          ${item.remaining.toFixed(2)} left
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </motion.div>
      )}
      {/* Add Forms - Enhanced with animations */}
      {showAddForm && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50"
          onClick={() => setShowAddForm(null)}
        >
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="bg-slate-900 rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto border border-slate-700"
            onClick={(e) => e.stopPropagation()}
          >
            {" "}
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold text-white">
                  {showAddForm === "transaction"
                    ? "Add Transaction"
                    : "Add Category"}
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAddForm(null)}
                  className="h-8 w-8 p-0 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {showAddForm === "transaction" ? (
                <AddTransactionForm onSuccess={() => setShowAddForm(null)} />
              ) : (
                <AddCategoryForm onSuccess={() => setShowAddForm(null)} />
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </motion.div>
  );
}
