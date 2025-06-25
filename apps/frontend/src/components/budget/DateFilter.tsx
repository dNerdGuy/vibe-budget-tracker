import { useState } from "react";
import { Calendar, RotateCcw, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DateRangePicker } from "@/components/ui/date-picker";
import { DateRange } from "react-day-picker";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  subDays,
  subMonths,
} from "date-fns";

export interface DateFilter {
  from: Date | undefined;
  to: Date | undefined;
  preset?: string;
}

interface DateFilterComponentProps {
  dateFilter: DateFilter;
  onDateFilterChange: (filter: DateFilter) => void;
  className?: string;
}

export function DateFilterComponent({
  dateFilter,
  onDateFilterChange,
  className = "",
}: DateFilterComponentProps) {
  const [isOpen, setIsOpen] = useState(false);

  const presets = [
    {
      label: "Today",
      getValue: () => ({
        from: new Date(),
        to: new Date(),
        preset: "Today",
      }),
    },
    {
      label: "Yesterday",
      getValue: () => {
        const yesterday = subDays(new Date(), 1);
        return {
          from: yesterday,
          to: yesterday,
          preset: "Yesterday",
        };
      },
    },
    {
      label: "This Week",
      getValue: () => ({
        from: startOfWeek(new Date()),
        to: endOfWeek(new Date()),
        preset: "This Week",
      }),
    },
    {
      label: "Last 7 Days",
      getValue: () => ({
        from: subDays(new Date(), 6),
        to: new Date(),
        preset: "Last 7 Days",
      }),
    },
    {
      label: "This Month",
      getValue: () => ({
        from: startOfMonth(new Date()),
        to: endOfMonth(new Date()),
        preset: "This Month",
      }),
    },
    {
      label: "Last Month",
      getValue: () => {
        const lastMonth = subMonths(new Date(), 1);
        return {
          from: startOfMonth(lastMonth),
          to: endOfMonth(lastMonth),
          preset: "Last Month",
        };
      },
    },
    {
      label: "Last 3 Months",
      getValue: () => ({
        from: subMonths(new Date(), 3),
        to: new Date(),
        preset: "Last 3 Months",
      }),
    },
  ];

  const handlePresetSelect = (preset: (typeof presets)[0]) => {
    const filter = preset.getValue();
    onDateFilterChange(filter);
    setIsOpen(false);
  };
  const handleCustomRangeChange = (range: DateRange | undefined) => {
    if (range) {
      onDateFilterChange({
        from: range.from,
        to: range.to,
        preset: undefined,
      });
    }
  };

  const handleReset = () => {
    onDateFilterChange({
      from: undefined,
      to: undefined,
      preset: undefined,
    });
  };

  const hasFilter = dateFilter.from || dateFilter.to;

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className="flex items-center gap-2">
        <Calendar className="h-4 w-4 text-slate-400" />
        <span className="text-sm font-medium text-slate-300">Date Filter:</span>
      </div>

      <div className="flex items-center gap-2">
        <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="border-slate-600 bg-slate-800 hover:bg-slate-700 text-slate-200"
            >
              <Filter className="h-3 w-3 mr-1" />
              Quick Select
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-48 bg-slate-800 border-slate-600"
            align="start"
          >
            {presets.map((preset) => (
              <DropdownMenuItem
                key={preset.label}
                onClick={() => handlePresetSelect(preset)}
                className="text-slate-200 hover:bg-slate-700 focus:bg-slate-700"
              >
                {preset.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <DateRangePicker
          dateRange={{ from: dateFilter.from, to: dateFilter.to }}
          onDateRangeChange={handleCustomRangeChange}
          placeholder="Select custom range"
          className="w-[260px]"
        />

        {hasFilter && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleReset}
            className="text-slate-400 hover:text-slate-200 hover:bg-slate-700"
          >
            <RotateCcw className="h-3 w-3 mr-1" />
            Reset
          </Button>
        )}
      </div>

      {dateFilter.preset && (
        <Badge
          variant="secondary"
          className="bg-blue-900/50 text-blue-200 border-blue-700"
        >
          {dateFilter.preset}
        </Badge>
      )}
    </div>
  );
}
