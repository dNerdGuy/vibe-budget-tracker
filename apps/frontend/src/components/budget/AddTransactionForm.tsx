import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useBudgetStore, useCategories } from "@/stores/budgetStore";
import { useToast } from "@/components/ui/toast";
import type { Transaction } from "@/stores/budgetStore";

interface AddTransactionFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
  initialData?: Transaction;
}

export function AddTransactionForm({
  onSuccess,
  onCancel,
  initialData,
}: AddTransactionFormProps) {
  const { createTransaction, updateTransaction } = useBudgetStore();
  const categories = useCategories();
  const { addToast } = useToast();
  const isEditing = !!initialData;
  const [formData, setFormData] = useState<{
    amount: string;
    description: string;
    type: "income" | "expense";
    category_id: string | undefined;
    date: string;
  }>({
    amount: initialData?.amount.toString() || "",
    description: initialData?.description || "",
    type: initialData?.type || "expense",
    category_id: initialData?.category_id || undefined,
    date: initialData?.date
      ? new Date(initialData.date).toISOString().split("T")[0]
      : new Date().toISOString().split("T")[0], // YYYY-MM-DD format
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.amount || !formData.description) {
      setError("Please fill in all required fields");
      return;
    }

    if (isNaN(Number(formData.amount)) || Number(formData.amount) <= 0) {
      setError("Please enter a valid positive amount");
      return;
    }

    setIsSubmitting(true);
    try {
      if (isEditing && initialData) {
        await updateTransaction(initialData.id, {
          amount: Number(formData.amount),
          description: formData.description,
          type: formData.type,
          category_id: formData.category_id || undefined,
          date: formData.date,
        });
      } else {
        await createTransaction({
          amount: Number(formData.amount),
          description: formData.description,
          type: formData.type,
          category_id: formData.category_id || undefined,
          date: formData.date, // This will be sent as YYYY-MM-DD to backend
        });
      }

      // Reset form only if creating new transaction
      if (!isEditing) {
        setFormData({
          amount: "",
          description: "",
          type: "expense",
          category_id: undefined,
          date: new Date().toISOString().split("T")[0],
        });
      }

      // Show success toast
      addToast({
        type: "success",
        title: isEditing ? "Transaction Updated" : "Transaction Created",
        description: `${
          formData.type === "income" ? "Income" : "Expense"
        } of $${formData.amount} ${
          isEditing ? "updated" : "created"
        } successfully.`,
      });

      onSuccess?.();
    } catch (error: any) {
      setError(
        error.message ||
          `Failed to ${isEditing ? "update" : "create"} transaction`
      );

      // Show error toast
      addToast({
        type: "error",
        title: `Failed to ${isEditing ? "Update" : "Create"} Transaction`,
        description: error.message || "An unexpected error occurred.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="text-sm text-red-400 bg-red-950/50 border border-red-800 p-2 rounded">
          {error}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="type" className="text-slate-200">
          Type
        </Label>
        <Select
          value={formData.type}
          onValueChange={(value: "income" | "expense") =>
            setFormData((prev) => ({ ...prev, type: value }))
          }
          disabled={isSubmitting}
        >
          <SelectTrigger className="bg-slate-800 border-slate-600 text-slate-100">
            <SelectValue placeholder="Select type" />
          </SelectTrigger>
          <SelectContent className="bg-slate-800 border-slate-600">
            <SelectItem
              value="income"
              className="text-slate-100 focus:bg-slate-700 focus:text-slate-100"
            >
              Income
            </SelectItem>
            <SelectItem
              value="expense"
              className="text-slate-100 focus:bg-slate-700 focus:text-slate-100"
            >
              Expense
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="amount" className="text-slate-200">
          Amount *
        </Label>
        <Input
          id="amount"
          type="number"
          step="0.01"
          placeholder="0.00"
          value={formData.amount}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, amount: e.target.value }))
          }
          required
          disabled={isSubmitting}
          className="bg-slate-800 border-slate-600 text-slate-100 placeholder:text-slate-400"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description" className="text-slate-200">
          Description *
        </Label>
        <Input
          id="description"
          placeholder="Enter description"
          value={formData.description}
          onChange={(e) =>
            setFormData((prev) => ({
              ...prev,
              description: e.target.value,
            }))
          }
          required
          disabled={isSubmitting}
          className="bg-slate-800 border-slate-600 text-slate-100 placeholder:text-slate-400"
        />
      </div>

      {formData.type === "expense" && categories.length > 0 && (
        <div className="space-y-2">
          <Label className="text-slate-200">Category (Optional)</Label>
          <Select
            value={formData.category_id || ""}
            onValueChange={(value) =>
              setFormData((prev) => ({
                ...prev,
                category_id: value || undefined,
              }))
            }
            disabled={isSubmitting}
          >
            <SelectTrigger className="bg-slate-800 border-slate-600 text-slate-100">
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 border-slate-600">
              {categories.map((category) => (
                <SelectItem
                  key={category.id}
                  value={category.id}
                  className="text-slate-100 focus:bg-slate-700 focus:text-slate-100"
                >
                  <div className="flex items-center space-x-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: category.color }}
                    />
                    <span>{category.name}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="date" className="text-slate-200">
          Date
        </Label>
        <Input
          id="date"
          type="date"
          value={formData.date}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, date: e.target.value }))
          }
          required
          disabled={isSubmitting}
          className="bg-slate-800 border-slate-600 text-slate-100"
        />
      </div>

      <div className="flex space-x-2 pt-4">
        <Button
          type="submit"
          className="flex-1 bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-700 hover:to-slate-800 text-white"
          disabled={isSubmitting}
        >
          {isSubmitting
            ? isEditing
              ? "Updating..."
              : "Creating..."
            : isEditing
            ? "Update Transaction"
            : "Create Transaction"}
        </Button>
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isSubmitting}
            className="border-slate-600 text-slate-300 hover:bg-slate-800 hover:text-slate-100"
          >
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}
