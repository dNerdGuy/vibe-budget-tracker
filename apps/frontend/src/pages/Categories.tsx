import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus } from "lucide-react";
import { useCategories } from "@/stores/budgetStore";
import { useEnsureData } from "@/stores/dataHooks";
import { CategoryList } from "@/components/budget/CategoryList";
import { AddCategoryForm } from "@/components/budget/AddCategoryForm";

export function Categories() {
  const categories = useCategories();
  useEnsureData(); // Ensure data is loaded
  const [showAddDialog, setShowAddDialog] = useState(false);

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
        className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
      >
        <div>
          {" "}
          <h1 className="text-4xl font-bold text-slate-200">Categories</h1>
          <p className="text-slate-400 mt-1">
            Organize your spending with custom categories and budgets
          </p>
        </div>

        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button
              className="bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-700 hover:to-slate-800 text-white shadow-lg hover:shadow-xl transition-all duration-300"
              size="lg"
            >
              <Plus className="mr-2 h-5 w-5" />
              Add Category
            </Button>
          </DialogTrigger>{" "}
          <DialogContent className="bg-slate-900 border-slate-700 text-slate-100 max-w-md">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-slate-100">
                Add Category
              </DialogTitle>
              <DialogDescription className="text-slate-400">
                Create a new category to track your spending
              </DialogDescription>
            </DialogHeader>
            <AddCategoryForm onSuccess={() => setShowAddDialog(false)} />
          </DialogContent>
        </Dialog>
      </motion.div>

      {/* Categories List */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <CategoryList
          categories={categories}
          emptyMessage="Create your first category to start organizing your expenses"
        />
      </motion.div>
    </motion.div>
  );
}
