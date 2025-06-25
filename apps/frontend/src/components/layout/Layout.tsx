import { ReactNode, useState, useEffect } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  CreditCard,
  FolderOpen,
  Settings,
  Menu,
  X,
  LogOut,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLogout, useUser } from "@/stores/authStore";
import { useBudgetStore } from "@/stores/budgetStore";

interface LayoutProps {
  children: ReactNode;
}

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Transactions", href: "/transactions", icon: CreditCard },
  { name: "Categories", href: "/categories", icon: FolderOpen },
  { name: "Settings", href: "/settings", icon: Settings },
];

export function Layout({ children }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const logout = useLogout();
  const user = useUser();
  const { loadDashboardData } = useBudgetStore();
  // Load data when layout mounts (when user is authenticated)
  useEffect(() => {
    if (user) {
      loadDashboardData();
    }
  }, [user, loadDashboardData]);

  // Remove the automatic refresh on navigation - let pages handle their own refresh needs
  return (
    <div className="h-screen bg-slate-950 flex overflow-hidden">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        >
          <div className="fixed inset-0 bg-black opacity-75" />
        </div>
      )}{" "}
      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-slate-900/95 backdrop-blur-sm border-r border-slate-700/50 shadow-xl transform transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0 lg:flex lg:flex-shrink-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <div className="flex h-full flex-col w-64">
          {/* Logo */}
          <div className="flex h-16 items-center justify-between px-6 border-b border-slate-700/50">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-br from-slate-600 to-slate-700 rounded-lg flex items-center justify-center shadow-sm">
                <LayoutDashboard className="w-5 h-5 text-slate-200" />
              </div>
              <span className="text-xl font-bold text-slate-200">
                Budget Tracker
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="lg:hidden text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-2">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <NavLink
                  key={item.name}
                  to={item.href}
                  className={`flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 ${
                    isActive
                      ? "bg-slate-700/80 text-slate-100 shadow-sm border border-slate-600/50"
                      : "text-slate-300 hover:bg-slate-800/50 hover:text-slate-200"
                  }`}
                  onClick={() => setSidebarOpen(false)}
                >
                  <item.icon
                    className={`w-5 h-5 mr-3 ${
                      isActive ? "text-slate-200" : "text-slate-400"
                    }`}
                  />
                  {item.name}
                </NavLink>
              );
            })}
          </nav>
          {/* User section */}
          <div className="border-t border-slate-800 p-4">
            {" "}
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-gradient-to-r from-slate-600 to-slate-700 rounded-full flex items-center justify-center">
                <User className="w-5 h-5 text-slate-200" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">
                  {user?.name || user?.email || "User"}
                </p>
                <p className="text-xs text-slate-400 truncate">{user?.email}</p>
              </div>
            </div>
            <Button
              onClick={logout}
              variant="outline"
              size="sm"
              className="w-full justify-start text-red-400 border-red-900/30 hover:bg-red-950/50 hover:text-red-300 hover:border-red-800"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>{" "}
        </div>
      </div>{" "}
      {/* Main content */}
      <div className="flex-1 flex flex-col">
        {/* Top bar - Mobile */}
        <div className="sticky top-0 z-30 bg-slate-900/95 backdrop-blur-sm border-b border-slate-800 lg:hidden">
          <div className="flex h-16 items-center justify-between px-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarOpen(true)}
              className="text-slate-400 hover:text-white hover:bg-slate-800"
            >
              <Menu className="w-5 h-5" />
            </Button>{" "}
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 bg-gradient-to-r from-slate-600 to-slate-700 rounded flex items-center justify-center">
                <LayoutDashboard className="w-4 h-4 text-slate-200" />
              </div>
              <span className="font-bold text-slate-200">Budget Tracker</span>
            </div>
            <div className="w-10" /> {/* Spacer for centering */}
          </div>
        </div>{" "}
        {/* Page content */}
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
