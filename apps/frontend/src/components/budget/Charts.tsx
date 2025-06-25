import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  BarElement,
} from "chart.js";
import { Line, Doughnut, Bar } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

interface SpendingTrendProps {
  data: {
    labels: string[];
    datasets: {
      label: string;
      data: number[];
      borderColor: string;
      backgroundColor: string;
      tension?: number;
    }[];
  };
  index: number;
}

export function SpendingTrendChart({ data, index }: SpendingTrendProps) {
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top" as const,
        labels: {
          font: {
            size: 12,
          },
          usePointStyle: true,
          color: "#e2e8f0", // slate-200
        },
      },
    },
    scales: {
      x: {
        grid: {
          display: false,
        },
        ticks: {
          font: {
            size: 11,
          },
          color: "#94a3b8", // slate-400
        },
      },
      y: {
        grid: {
          color: "rgba(148, 163, 184, 0.1)", // slate-400 with opacity
        },
        ticks: {
          font: {
            size: 11,
          },
          color: "#94a3b8", // slate-400
          callback: function (value: any) {
            return `$${value}`;
          },
        },
      },
    },
    elements: {
      point: {
        radius: 4,
        hoverRadius: 6,
      },
    },
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
    >
      <Card className="border-0 shadow-lg bg-slate-900 border-slate-800">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-semibold text-slate-100">
            Spending Trend
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <Line data={data} options={options} />
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

interface CategoryBreakdownProps {
  data: {
    labels: string[];
    datasets: {
      data: number[];
      backgroundColor: string[];
      borderWidth: number;
    }[];
  };
  index: number;
}

export function CategoryBreakdownChart({
  data,
  index,
}: CategoryBreakdownProps) {
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "right" as const,
        labels: {
          font: {
            size: 12,
          },
          usePointStyle: true,
          padding: 20,
          color: "#e2e8f0", // slate-200
        },
      },
    },
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
    >
      <Card className="border-0 shadow-lg bg-slate-900 border-slate-800">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-semibold text-slate-100">
            Category Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <Doughnut data={data} options={options} />
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

interface BudgetProgressProps {
  data: {
    labels: string[];
    datasets: {
      label: string;
      data: number[];
      backgroundColor: string[];
      borderRadius: number;
    }[];
  };
  index: number;
}

export function BudgetProgressChart({ data, index }: BudgetProgressProps) {
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: "y" as const,
    plugins: {
      legend: {
        display: false,
      },
    },
    scales: {
      x: {
        grid: {
          display: false,
        },
        ticks: {
          font: {
            size: 11,
          },
          color: "#94a3b8", // slate-400
          callback: function (value: any) {
            return `${value}%`;
          },
        },
        max: 100,
      },
      y: {
        grid: {
          display: false,
        },
        ticks: {
          font: {
            size: 11,
          },
          color: "#94a3b8", // slate-400
        },
      },
    },
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
    >
      <Card className="border-0 shadow-lg bg-slate-900 border-slate-800">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-semibold text-slate-100">
            Budget Progress
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <Bar data={data} options={options} />
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
