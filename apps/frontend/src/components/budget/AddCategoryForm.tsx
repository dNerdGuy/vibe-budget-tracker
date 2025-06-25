import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useBudgetStore } from "@/stores/budgetStore";
import { useToast } from "@/components/ui/toast";
import type { Category } from "@/stores/budgetStore";

interface AddCategoryFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
  initialData?: Category;
}

const colorOptions = [
  "#dc2626", // muted red
  "#ea580c", // muted orange
  "#ca8a04", // muted yellow
  "#16a34a", // muted green
  "#2563eb", // muted blue
  "#7c3aed", // muted violet
  "#be185d", // muted pink
  "#6b7280", // professional gray
];

export function AddCategoryForm({
  onSuccess,
  onCancel,
  initialData,
}: AddCategoryFormProps) {
  const [formData, setFormData] = useState({
    name: initialData?.name || "",
    budget: initialData?.budget.toString() || "",
    color: initialData?.color || colorOptions[0],
  });
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { createCategory, updateCategory } = useBudgetStore();
  const { addToast } = useToast();
  const isEditing = !!initialData;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrors({});

    try {
      const budget = parseFloat(formData.budget);

      if (isNaN(budget) || budget <= 0) {
        setErrors({ budget: "Budget must be a positive number" });
        setIsLoading(false);
        return;
      }
      if (isEditing && initialData) {
        await updateCategory(initialData.id, {
          name: formData.name.trim(),
          budget,
          color: formData.color,
        });
      } else {
        await createCategory({
          name: formData.name.trim(),
          budget,
          color: formData.color,
        });
      }
      onSuccess?.();
      // Reset form only if creating new category
      if (!isEditing) {
        setFormData({ name: "", budget: "", color: colorOptions[0] });
      }

      // Show success toast
      addToast({
        type: "success",
        title: isEditing ? "Category Updated" : "Category Created",
        description: `Category "${formData.name}" ${
          isEditing ? "updated" : "created"
        } successfully with $${formData.budget} budget.`,
      });
    } catch (error) {
      setErrors({
        general:
          error instanceof Error
            ? error.message
            : `Failed to ${isEditing ? "update" : "create"} category`,
      });

      // Show error toast
      addToast({
        type: "error",
        title: `Failed to ${isEditing ? "Update" : "Create"} Category`,
        description:
          error instanceof Error
            ? error.message
            : "An unexpected error occurred.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {errors.general && (
        <div className="text-red-400 text-sm text-center bg-red-950/50 border border-red-800 p-2 rounded">
          {errors.general}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="name" className="text-slate-200">
          Category Name
        </Label>
        <Input
          id="name"
          name="name"
          type="text"
          value={formData.name}
          onChange={handleChange}
          placeholder="e.g., Groceries, Entertainment"
          required
          disabled={isLoading}
          className="bg-slate-800 border-slate-600 text-slate-100 placeholder:text-slate-400"
        />
        {errors.name && (
          <div className="text-red-400 text-sm">{errors.name}</div>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="budget" className="text-slate-200">
          Monthly Budget
        </Label>
        <Input
          id="budget"
          name="budget"
          type="number"
          step="0.01"
          min="0"
          value={formData.budget}
          onChange={handleChange}
          placeholder="0.00"
          required
          disabled={isLoading}
          className="bg-slate-800 border-slate-600 text-slate-100 placeholder:text-slate-400"
        />
        {errors.budget && (
          <div className="text-red-400 text-sm">{errors.budget}</div>
        )}
      </div>

      <div className="space-y-2">
        <Label className="text-slate-200">Color</Label>
        <div className="flex space-x-2">
          {colorOptions.map((color) => (
            <button
              key={color}
              type="button"
              className={`w-8 h-8 rounded-full border-2 transition-all ${
                formData.color === color
                  ? "border-slate-300 scale-110 shadow-md"
                  : "border-slate-500 hover:border-slate-400"
              }`}
              style={{ backgroundColor: color }}
              onClick={() => setFormData((prev) => ({ ...prev, color }))}
              disabled={isLoading}
            />
          ))}
        </div>
      </div>

      <div className="flex space-x-2 pt-4">
        <Button
          type="submit"
          className="flex-1 bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-700 hover:to-slate-800 text-white"
          disabled={isLoading}
        >
          {isLoading
            ? isEditing
              ? "Updating..."
              : "Creating..."
            : isEditing
            ? "Update Category"
            : "Create Category"}
        </Button>
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isLoading}
            className="border-slate-600 text-slate-300 hover:bg-slate-800 hover:text-slate-100"
          >
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}
