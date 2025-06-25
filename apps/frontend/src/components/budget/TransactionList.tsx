import { useState } from "react";
import { motion } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  MoreHorizontal,
  Edit,
  Trash2,
  TrendingUp,
  TrendingDown,
  Plus,
  Calendar,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "react-hot-toast";
import { AddTransactionForm } from "@/components/budget/AddTransactionForm";
import type { Transaction } from "@/stores/budgetStore";
import { useBudgetStore } from "@/stores/budgetStore";

interface TransactionListProps {
  transactions: Transaction[];
  emptyMessage?: string;
}

interface EditTransactionDialogProps {
  transaction: Transaction;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

interface DeleteTransactionDialogProps {
  transaction: Transaction;
  onConfirm: () => void;
  trigger: React.ReactNode;
}

function EditTransactionDialog({
  transaction,
  isOpen,
  onOpenChange,
}: EditTransactionDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white">Edit Transaction</DialogTitle>
        </DialogHeader>
        <AddTransactionForm
          onSuccess={() => onOpenChange(false)}
          onCancel={() => onOpenChange(false)}
          initialData={transaction}
        />
      </DialogContent>
    </Dialog>
  );
}

function DeleteTransactionDialog({
  transaction,
  onConfirm,
  trigger,
}: DeleteTransactionDialogProps) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>
      <AlertDialogContent className="bg-slate-900 border-slate-700">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-white">
            Delete Transaction
          </AlertDialogTitle>
          <AlertDialogDescription className="text-slate-400">
            Are you sure you want to delete this transaction? This action cannot
            be undone.
            <div className="mt-3 p-3 bg-slate-800 rounded-lg border border-slate-700">
              <div className="flex justify-between items-center">
                <span className="font-medium text-white">
                  {transaction.description}
                </span>
                <span
                  className={`font-semibold ${
                    transaction.type === "income"
                      ? "text-green-400"
                      : "text-red-400"
                  }`}
                >
                  {transaction.type === "income" ? "+" : "-"}$
                  {Math.abs(transaction.amount).toFixed(2)}
                </span>
              </div>
              <div className="text-sm text-slate-400 mt-1">
                {format(new Date(transaction.date), "MMM dd, yyyy")}
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="bg-slate-800 text-slate-300 border-slate-600 hover:bg-slate-700">
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-red-600 text-white hover:bg-red-700"
          >
            Delete Transaction
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function TransactionCard({ transaction }: { transaction: Transaction }) {
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const { removeTransaction } = useBudgetStore();

  const handleDelete = async () => {
    try {
      await removeTransaction(transaction.id);
      toast.success("Transaction deleted successfully");
    } catch (error) {
      console.error("Delete transaction error:", error);
      toast.error("Failed to delete transaction");
    }
  };

  const formatAmount = (amount: number, type: "income" | "expense") => {
    const prefix = type === "income" ? "+" : "-";
    return `${prefix}$${Math.abs(amount).toFixed(2)}`;
  };

  const getAmountColor = (type: "income" | "expense") => {
    return type === "income" ? "text-green-400" : "text-red-400";
  };

  return (
    <>
      <motion.div
        layout
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="group"
      >
        <Card className="border-0 shadow-lg bg-slate-900 border-slate-800 hover:bg-slate-800/50 transition-all duration-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3 flex-1 min-w-0">
                <div
                  className={`p-2 rounded-full ${
                    transaction.type === "income"
                      ? "bg-green-500/20 text-green-400"
                      : "bg-red-500/20 text-red-400"
                  }`}
                >
                  {transaction.type === "income" ? (
                    <TrendingUp className="h-4 w-4" />
                  ) : (
                    <TrendingDown className="h-4 w-4" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-white truncate">
                    {transaction.description}
                  </p>
                  <div className="flex items-center space-x-2 mt-1">
                    <p className="text-sm text-slate-400">
                      {format(new Date(transaction.date), "MMM dd, yyyy")}
                    </p>
                    {transaction.category_name && (
                      <Badge
                        variant="secondary"
                        className="text-xs bg-slate-800 text-slate-300 border-slate-700"
                        style={{
                          backgroundColor: transaction.category_color + "20",
                          color: transaction.category_color || "#94a3b8",
                          borderColor: transaction.category_color + "40",
                        }}
                      >
                        {transaction.category_name}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <p
                  className={`font-semibold text-lg ${getAmountColor(
                    transaction.type
                  )}`}
                >
                  {formatAmount(transaction.amount, transaction.type)}
                </p>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-slate-400 hover:text-white hover:bg-slate-700 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="end"
                    className="bg-slate-800 border-slate-700 text-slate-200"
                  >
                    <DropdownMenuItem
                      onClick={() => setEditDialogOpen(true)}
                      className="hover:bg-slate-700 focus:bg-slate-700"
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                    <DeleteTransactionDialog
                      transaction={transaction}
                      onConfirm={handleDelete}
                      trigger={
                        <DropdownMenuItem
                          className="hover:bg-slate-700 focus:bg-slate-700 text-red-400 focus:text-red-300"
                          onSelect={(e) => e.preventDefault()}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      }
                    />
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <EditTransactionDialog
        transaction={transaction}
        isOpen={editDialogOpen}
        onOpenChange={setEditDialogOpen}
      />
    </>
  );
}

export function TransactionList({
  transactions,
  emptyMessage,
}: TransactionListProps) {
  if (transactions.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center py-12"
      >
        <Card className="border-0 shadow-lg bg-slate-900 border-slate-800">
          <CardContent className="p-8">
            <div className="w-16 h-16 mx-auto mb-4 bg-slate-800 rounded-full flex items-center justify-center">
              <Calendar className="h-8 w-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-medium text-white mb-2">
              No transactions found
            </h3>
            <p className="text-slate-400 mb-4">
              {emptyMessage ||
                "Start tracking your finances by adding your first transaction."}
            </p>
            <Dialog>
              <DialogTrigger asChild>
                <Button className="bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-700 hover:to-slate-800">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Your First Transaction
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-md">
                <DialogHeader>
                  <DialogTitle className="text-white">
                    Add Transaction
                  </DialogTitle>
                </DialogHeader>
                <AddTransactionForm />
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  return (
    <div className="space-y-4">
      {transactions.map((transaction) => (
        <TransactionCard key={transaction.id} transaction={transaction} />
      ))}
    </div>
  );
}

export { EditTransactionDialog, DeleteTransactionDialog };
