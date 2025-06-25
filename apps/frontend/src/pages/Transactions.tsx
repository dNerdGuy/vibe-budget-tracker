import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus } from "lucide-react";
import { useTransactions } from "@/stores/budgetStore";
import { useEnsureData } from "@/stores/dataHooks";
import { AddTransactionForm } from "@/components/budget/AddTransactionForm";
import { TransactionList } from "@/components/budget/TransactionList";
import {
  DateFilterComponent,
  DateFilter,
} from "@/components/budget/DateFilter";
import { isWithinInterval, startOfDay, endOfDay } from "date-fns";

export function Transactions() {
  const transactions = useTransactions();
  useEnsureData(); // Ensure data is loaded
  const [filter, setFilter] = useState<"all" | "income" | "expense">("all");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [dateFilter, setDateFilter] = useState<DateFilter>({
    from: undefined,
    to: undefined,
    preset: undefined,
  });

  // Apply both type and date filters
  const filteredTransactions = transactions.filter((transaction) => {
    // Type filter
    const matchesType = filter === "all" || transaction.type === filter;

    // Date filter
    if (!dateFilter.from && !dateFilter.to) {
      return matchesType; // No date filter applied
    }

    const transactionDate = new Date(transaction.date);
    let matchesDate = true;

    if (dateFilter.from && dateFilter.to) {
      matchesDate = isWithinInterval(transactionDate, {
        start: startOfDay(dateFilter.from),
        end: endOfDay(dateFilter.to),
      });
    } else if (dateFilter.from) {
      matchesDate = transactionDate >= startOfDay(dateFilter.from);
    } else if (dateFilter.to) {
      matchesDate = transactionDate <= endOfDay(dateFilter.to);
    }

    return matchesType && matchesDate;
  });

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6 p-6 bg-slate-950"
    >
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-4xl font-bold text-slate-200">Transactions</h1>
            <p className="text-slate-400 mt-1">
              Manage and track all your financial transactions
            </p>
          </div>
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button
                className="bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-700 hover:to-slate-800 text-white shadow-lg hover:shadow-xl transition-all duration-300"
                size="lg"
              >
                <Plus className="mr-2 h-5 w-5" />
                Add Transaction
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-slate-900 border-slate-700 max-w-md">
              <DialogHeader>
                <DialogTitle className="text-xl font-bold text-slate-100">
                  Add New Transaction
                </DialogTitle>
                <DialogDescription className="text-slate-400">
                  Record a new income or expense transaction
                </DialogDescription>
              </DialogHeader>
              <AddTransactionForm onSuccess={() => setShowAddDialog(false)} />
            </DialogContent>
          </Dialog>
        </div>

        {/* Date and Type Filters */}
        <div className="space-y-4">
          {/* Date Filter */}
          <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-4">
            <DateFilterComponent
              dateFilter={dateFilter}
              onDateFilterChange={setDateFilter}
            />
          </div>

          {/* Type Filter */}
          <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-slate-300">
                Type Filter:
              </span>
              <div className="flex gap-2">
                <Button
                  variant={filter === "all" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilter("all")}
                  className={
                    filter === "all"
                      ? "bg-blue-600 hover:bg-blue-700 text-white"
                      : "border-slate-600 bg-slate-800 hover:bg-slate-700 text-slate-200"
                  }
                >
                  All
                </Button>
                <Button
                  variant={filter === "income" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilter("income")}
                  className={
                    filter === "income"
                      ? "bg-green-600 hover:bg-green-700 text-white"
                      : "border-slate-600 bg-slate-800 hover:bg-slate-700 text-slate-200"
                  }
                >
                  Income
                </Button>
                <Button
                  variant={filter === "expense" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilter("expense")}
                  className={
                    filter === "expense"
                      ? "bg-red-600 hover:bg-red-700 text-white"
                      : "border-slate-600 bg-slate-800 hover:bg-slate-700 text-slate-200"
                  }
                >
                  Expenses
                </Button>
              </div>
              {filteredTransactions.length !== transactions.length && (
                <Badge variant="secondary" className="ml-auto">
                  {filteredTransactions.length} of {transactions.length}{" "}
                  transactions
                </Badge>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Transaction List */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="space-y-4"
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="h-2 w-2 rounded-full bg-slate-500"></div>
          <h3 className="text-xl font-semibold text-slate-200">
            Transaction History
          </h3>
          <Badge
            variant="outline"
            className="text-xs text-blue-300 border-blue-600 bg-blue-900/20"
          >
            Filtered results
          </Badge>
        </div>
        <TransactionList transactions={filteredTransactions} />
      </motion.div>
    </motion.div>
  );
}
