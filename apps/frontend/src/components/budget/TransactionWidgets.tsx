import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  MoreHorizontal,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import { format } from "date-fns";
import type { Transaction } from "@/stores/budgetStore";

interface RecentTransactionsProps {
  transactions: Transaction[];
  index: number;
}

export function RecentTransactions({
  transactions,
  index,
}: RecentTransactionsProps) {
  const formatAmount = (amount: number, type: "income" | "expense") => {
    const prefix = type === "income" ? "+" : "-";
    return `${prefix}$${Math.abs(amount).toFixed(2)}`;
  };
  const getAmountColor = (type: "income" | "expense") => {
    return type === "income" ? "text-green-400" : "text-red-400";
  };
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
    >
      <Card className="border-0 shadow-lg bg-slate-900 border-slate-800">
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <CardTitle className="text-lg font-semibold text-slate-100">
            Recent Transactions
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 hover:bg-slate-800 text-slate-400"
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {transactions.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 mx-auto mb-4 bg-slate-800 rounded-full flex items-center justify-center">
                <Calendar className="h-8 w-8 text-slate-400" />
              </div>
              <p className="text-slate-400">No transactions yet</p>
              <p className="text-sm text-slate-500">
                Add your first transaction to get started
              </p>
            </div>
          ) : (
            transactions.map((transaction, i) => (
              <motion.div
                key={transaction.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 + i * 0.05 }}
                className="flex items-center justify-between p-3 rounded-lg bg-slate-800/50 hover:bg-slate-800 transition-colors border border-slate-700"
              >
                <div className="flex items-center space-x-3">
                  <div
                    className={`p-2 rounded-full ${
                      transaction.type === "income"
                        ? "bg-green-900/50 text-green-400"
                        : "bg-red-900/50 text-red-400"
                    }`}
                  >
                    {transaction.type === "income" ? (
                      <ArrowUpRight className="h-4 w-4" />
                    ) : (
                      <ArrowDownRight className="h-4 w-4" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-slate-100">
                      {transaction.description}
                    </p>
                    <div className="flex items-center space-x-2">
                      <p className="text-sm text-slate-400">
                        {format(new Date(transaction.date), "MMM dd, yyyy")}
                      </p>
                      {transaction.category_name && (
                        <Badge
                          variant="secondary"
                          className="text-xs bg-slate-700 text-slate-300 border-slate-600"
                          style={{
                            backgroundColor: transaction.category_color + "20",
                            color: transaction.category_color || "#94a3b8",
                          }}
                        >
                          {transaction.category_name}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p
                    className={`font-semibold ${getAmountColor(
                      transaction.type
                    )}`}
                  >
                    {formatAmount(transaction.amount, transaction.type)}
                  </p>
                </div>
              </motion.div>
            ))
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

interface QuickStatsProps {
  totalIncome: number;
  totalExpenses: number;
  totalBalance: number;
  transactionCount: number;
  index: number;
}

export function QuickStats({
  totalIncome,
  totalExpenses,
  totalBalance,
  transactionCount,
  index,
}: QuickStatsProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
    >
      <Card className="border-0 shadow-lg bg-slate-900 border-slate-800">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-semibold text-slate-100">
            Quick Stats
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <TrendingUp className="h-4 w-4 text-green-400" />
                <span className="text-sm text-slate-400">Income</span>
              </div>{" "}
              <p className="text-2xl font-bold text-green-400">
                ${(totalIncome || 0).toFixed(2)}
              </p>{" "}
              <p className="text-xs text-slate-400">Total earnings</p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <TrendingDown className="h-4 w-4 text-red-400" />
                <span className="text-sm text-slate-400">Expenses</span>
              </div>{" "}
              <p className="text-2xl font-bold text-red-400">
                ${(totalExpenses || 0).toFixed(2)}
              </p>{" "}
              <p className="text-xs text-slate-400">Total spending</p>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-700">
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-400">Net Balance</span>{" "}
              <span
                className={`text-lg font-bold ${
                  (totalBalance || 0) >= 0 ? "text-green-400" : "text-red-400"
                }`}
              >
                ${(totalBalance || 0).toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between items-center mt-2">
              <span className="text-sm text-slate-400">Total Transactions</span>
              <span className="text-lg font-bold text-slate-100">
                {transactionCount}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
