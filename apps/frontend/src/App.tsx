import { Suspense, Component, ReactNode, useEffect, useRef } from "react";
import { Routes, Route } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { Dashboard } from "@/pages/Dashboard";
import { Transactions } from "@/pages/Transactions";
import { Categories } from "@/pages/Categories";
import { Settings } from "@/pages/Settings";
import { AuthPage } from "@/components/auth/AuthPage";
import { ToastProvider } from "@/components/ui/toast";
import {
  useIsAuthenticated,
  useIsLoading,
  useCheckAuth,
  useSetUser,
} from "@/stores/authStore";
import "./index.css";

// Custom Error Boundary class component for React v20
class ErrorBoundary extends Component<
  {
    children: ReactNode;
    fallback: React.ComponentType<{
      error: Error;
      resetErrorBoundary: () => void;
    }>;
  },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error("Error caught by boundary:", error, errorInfo);
  }

  resetErrorBoundary = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError && this.state.error) {
      const FallbackComponent = this.props.fallback;
      return (
        <FallbackComponent
          error={this.state.error}
          resetErrorBoundary={this.resetErrorBoundary}
        />
      );
    }

    return this.props.children;
  }
}

// Error boundary fallback component
function ErrorFallback({
  error,
  resetErrorBoundary,
}: {
  error: Error;
  resetErrorBoundary: () => void;
}) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center justify-center min-h-screen p-4"
    >
      <h2 className="text-2xl font-bold text-red-600 mb-4">
        Something went wrong
      </h2>
      <p className="text-gray-600 mb-4">{error.message}</p>
      <button
        onClick={resetErrorBoundary}
        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
      >
        Try again
      </button>
    </div>
  );
}

// Loading fallback component with React v20 concurrent features
function LoadingFallback() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
    </div>
  );
}

function App() {
  const isAuthenticated = useIsAuthenticated();
  const isLoading = useIsLoading();
  const checkAuth = useCheckAuth();
  const setUser = useSetUser();
  const hasCheckedAuth = useRef(false);

  useEffect(() => {
    // Only check auth once on app load
    if (!hasCheckedAuth.current) {
      hasCheckedAuth.current = true;
      checkAuth();
    }
  }, []); // Empty dependency array - only run once

  const handleAuthSuccess = (user: any) => {
    setUser(user);
  };

  if (isLoading) {
    return <LoadingFallback />;
  }

  if (!isAuthenticated) {
    return <AuthPage onSuccess={handleAuthSuccess} />;
  }
  return (
    <ErrorBoundary fallback={ErrorFallback}>
      <Suspense fallback={<LoadingFallback />}>
        <ToastProvider>
          <Layout>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/transactions" element={<Transactions />} />
              <Route path="/categories" element={<Categories />} />
              <Route path="/settings" element={<Settings />} />
            </Routes>
          </Layout>
        </ToastProvider>
      </Suspense>
    </ErrorBoundary>
  );
}

export default App;
