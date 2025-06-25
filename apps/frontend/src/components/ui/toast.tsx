import * as React from "react";
import { CheckCircle, XCircle, Info, AlertCircle, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ToastProps {
  id: string;
  title?: string;
  description?: string;
  type?: "success" | "error" | "info" | "warning";
  duration?: number;
  onClose: (id: string) => void;
}

const toastIcons = {
  success: CheckCircle,
  error: XCircle,
  info: Info,
  warning: AlertCircle,
};

const toastStyles = {
  success: "border-green-600/30 bg-green-950/50 text-green-100",
  error: "border-red-600/30 bg-red-950/50 text-red-100",
  info: "border-blue-600/30 bg-blue-950/50 text-blue-100",
  warning: "border-yellow-600/30 bg-yellow-950/50 text-yellow-100",
};

export function Toast({
  id,
  title,
  description,
  type = "info",
  duration = 5000,
  onClose,
}: ToastProps) {
  const Icon = toastIcons[type];

  React.useEffect(() => {
    const timer = setTimeout(() => {
      onClose(id);
    }, duration);

    return () => clearTimeout(timer);
  }, [id, duration, onClose]);

  return (
    <div
      className={cn(
        "relative flex w-full items-center space-x-3 rounded-lg border p-4 shadow-lg transition-all duration-300",
        toastStyles[type]
      )}
    >
      <Icon className="h-5 w-5 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        {title && <p className="text-sm font-medium leading-none">{title}</p>}
        {description && (
          <p className={cn("text-sm", title ? "mt-1" : "")}>{description}</p>
        )}
      </div>
      <button
        onClick={() => onClose(id)}
        className="flex-shrink-0 opacity-70 hover:opacity-100 transition-opacity"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

interface ToastState {
  toasts: Array<{
    id: string;
    title?: string;
    description?: string;
    type?: "success" | "error" | "info" | "warning";
    duration?: number;
  }>;
}

interface ToastActions {
  addToast: (toast: Omit<ToastState["toasts"][0], "id">) => void;
  removeToast: (id: string) => void;
}

const toastContext = React.createContext<(ToastState & ToastActions) | null>(
  null
);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<ToastState["toasts"]>([]);

  const addToast = React.useCallback(
    (toast: Omit<ToastState["toasts"][0], "id">) => {
      const id = Math.random().toString(36).substr(2, 9);
      setToasts((prev) => [...prev, { ...toast, id }]);
    },
    []
  );

  const removeToast = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  return (
    <toastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col space-y-3 max-w-sm w-full">
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            id={toast.id}
            title={toast.title}
            description={toast.description}
            type={toast.type}
            duration={toast.duration}
            onClose={removeToast}
          />
        ))}
      </div>
    </toastContext.Provider>
  );
}

export function useToast() {
  const context = React.useContext(toastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}
