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
import { MoreHorizontal, Edit, Trash2, Plus, Folder } from "lucide-react";
import { AddCategoryForm } from "@/components/budget/AddCategoryForm";
import { useBudgetStore } from "@/stores/budgetStore";
import { toast } from "react-hot-toast";
import type { Category } from "@/stores/budgetStore";

interface CategoryListProps {
  categories: Category[];
  emptyMessage?: string;
}

interface EditCategoryDialogProps {
  category: Category;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

interface DeleteCategoryDialogProps {
  category: Category;
  onConfirm: () => void;
  trigger: React.ReactNode;
}

function EditCategoryDialog({
  category,
  isOpen,
  onOpenChange,
}: EditCategoryDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white">Edit Category</DialogTitle>
        </DialogHeader>
        <AddCategoryForm
          onSuccess={() => onOpenChange(false)}
          onCancel={() => onOpenChange(false)}
          initialData={category}
        />
      </DialogContent>
    </Dialog>
  );
}

function DeleteCategoryDialog({
  category,
  onConfirm,
  trigger,
}: DeleteCategoryDialogProps) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>
      <AlertDialogContent className="bg-slate-900 border-slate-700">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-white">
            Delete Category
          </AlertDialogTitle>
          <AlertDialogDescription className="text-slate-400">
            Are you sure you want to delete this category? This action cannot be
            undone.
            <div className="mt-3 p-3 bg-slate-800 rounded-lg border border-slate-700">
              <div className="flex items-center space-x-3">
                <div
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: category.color }}
                />
                <div>
                  <div className="font-medium text-white">{category.name}</div>
                  <div className="text-sm text-slate-400">
                    Budget: ${category.budget.toFixed(2)}
                  </div>
                </div>
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
            Delete Category
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function CategoryCard({ category }: { category: Category }) {
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const { removeCategory } = useBudgetStore();

  // Calculate spent amount and percentage
  const spent = category.spent || 0;
  const percentage = Math.min((spent / category.budget) * 100, 100);
  const remaining = Math.max(category.budget - spent, 0);

  const handleDelete = async () => {
    try {
      await removeCategory(category.id);
      toast.success("Category deleted successfully");
    } catch (error) {
      console.error("Delete category error:", error);
      toast.error("Failed to delete category");
    }
  };

  const getProgressColor = (percentage: number) => {
    if (percentage < 50) return "bg-green-500";
    if (percentage < 80) return "bg-yellow-500";
    return "bg-red-500";
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
          <CardContent className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: category.color }}
                />
                <div>
                  <h3 className="font-semibold text-white">{category.name}</h3>
                  <p className="text-sm text-slate-400">
                    ${category.budget.toFixed(2)} budget
                  </p>
                </div>
              </div>
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
                  <DeleteCategoryDialog
                    category={category}
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

            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Spent</span>
                <span className="text-white font-medium">
                  ${spent.toFixed(2)} of ${category.budget.toFixed(2)}
                </span>
              </div>

              <div className="w-full bg-slate-700 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all duration-300 ${getProgressColor(
                    percentage
                  )}`}
                  style={{ width: `${percentage}% ` }}
                />
              </div>

              <div className="flex justify-between items-center">
                <div className="text-sm">
                  <span
                    className={`font-medium ${
                      percentage < 80 ? "text-green-400" : "text-red-400"
                    }`}
                  >
                    {percentage.toFixed(1)}% used
                  </span>
                </div>
                <div className="text-sm">
                  <span
                    className={`font-medium ${
                      remaining > 0 ? "text-slate-300" : "text-red-400"
                    }`}
                  >
                    ${remaining.toFixed(2)} left
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <EditCategoryDialog
        category={category}
        isOpen={editDialogOpen}
        onOpenChange={setEditDialogOpen}
      />
    </>
  );
}

export function CategoryList({ categories, emptyMessage }: CategoryListProps) {
  if (categories.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center py-12"
      >
        <Card className="border-0 shadow-lg bg-slate-900 border-slate-800">
          <CardContent className="p-8">
            <div className="w-16 h-16 mx-auto mb-4 bg-slate-800 rounded-full flex items-center justify-center">
              <Folder className="h-8 w-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-medium text-white mb-2">
              No categories found
            </h3>
            <p className="text-slate-400 mb-4">
              {emptyMessage ||
                "Create categories to organize your spending and set budgets."}
            </p>
            <Dialog>
              <DialogTrigger asChild>
                <Button className="bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-700 hover:to-slate-800">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Your First Category
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-md">
                <DialogHeader>
                  <DialogTitle className="text-white">Add Category</DialogTitle>
                </DialogHeader>
                <AddCategoryForm />
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {categories.map((category) => (
        <CategoryCard key={category.id} category={category} />
      ))}
    </div>
  );
}

export { EditCategoryDialog, DeleteCategoryDialog };
