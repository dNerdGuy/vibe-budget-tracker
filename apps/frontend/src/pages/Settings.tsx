import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useState, useEffect } from "react";
import {
  User,
  Settings as SettingsIcon,
  LogOut,
  Shield,
  Bell,
  Palette,
} from "lucide-react";
import { useLogout, useUser, useSetUser } from "@/stores/authStore";
import { usersAPI } from "@/services/api";
import { toast } from "react-hot-toast";

export function Settings() {
  const user = useUser();
  const logout = useLogout();
  const setUser = useSetUser();
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [profileForm, setProfileForm] = useState({
    name: user?.name || "",
    email: user?.email || "",
  });
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  // Update profileForm when user data changes
  useEffect(() => {
    if (user) {
      setProfileForm({
        name: user.name || "",
        email: user.email || "",
      });
    }
  }, [user]);

  const handleLogout = () => {
    logout();
    toast.success("Logged out successfully");
  };
  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const updateData: { name?: string; email?: string } = {};
      if (profileForm.name !== user?.name) updateData.name = profileForm.name;
      if (profileForm.email !== user?.email)
        updateData.email = profileForm.email;

      if (Object.keys(updateData).length === 0) {
        toast("No changes detected", { icon: "ℹ️" });
        setEditProfileOpen(false);
        return;
      }

      const response = await usersAPI.updateProfile(updateData);

      // Update user data in the auth store with the response from API
      if (response.success && response.data?.user) {
        setUser(response.data.user);
      } else if (user) {
        // Fallback: update local user object with the changes
        const updatedUser = {
          ...user,
          ...updateData,
          updated_at: new Date().toISOString(),
        };
        setUser(updatedUser);
      }

      toast.success("Profile updated successfully");
      setEditProfileOpen(false);
    } catch (error: any) {
      console.error("Profile update error:", error);
      toast.error(error.response?.data?.error || "Failed to update profile");
    }
  };
  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error("New passwords don't match");
      return;
    }
    if (passwordForm.newPassword.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    try {
      await usersAPI.changePassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      toast.success("Password changed successfully");
      setChangePasswordOpen(false);
      setPasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    } catch (error: any) {
      console.error("Password change error:", error);
      toast.error(error.response?.data?.error || "Failed to change password");
    }
  };

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
        {" "}
        <div>
          {" "}
          <h1 className="text-4xl font-bold text-slate-200">Settings</h1>
          <p className="text-slate-400 mt-1">
            Manage your account and application preferences
          </p>
        </div>
      </motion.div>{" "}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Profile Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="border-0 shadow-lg bg-slate-900 border-slate-800">
            <CardHeader className="pb-4">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-r from-slate-600 to-slate-700 flex items-center justify-center">
                  <User className="w-6 h-6 text-white" />
                </div>
                <div>
                  <CardTitle className="text-lg text-slate-100">
                    Profile Information
                  </CardTitle>
                  <p className="text-sm text-slate-400">
                    Manage your personal details
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-300">
                  Email
                </label>
                <p className="text-slate-100 mt-1">
                  {user?.email || "Not available"}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-300">
                  Name
                </label>
                <p className="text-slate-100 mt-1">{user?.name || "Not set"}</p>
              </div>{" "}
              <Dialog open={editProfileOpen} onOpenChange={setEditProfileOpen}>
                <DialogTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full border-slate-600 text-slate-300 hover:bg-slate-800 hover:text-slate-100"
                  >
                    Edit Profile
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px] bg-slate-900 border-slate-700">
                  <DialogHeader>
                    <DialogTitle className="text-slate-100">
                      Edit Profile
                    </DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleProfileUpdate} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="name" className="text-slate-300">
                        Name
                      </Label>
                      <Input
                        id="name"
                        value={profileForm.name}
                        onChange={(e) =>
                          setProfileForm((prev) => ({
                            ...prev,
                            name: e.target.value,
                          }))
                        }
                        className="bg-slate-800 border-slate-600 text-slate-100"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-slate-300">
                        Email
                      </Label>
                      <Input
                        id="email"
                        type="email"
                        value={profileForm.email}
                        onChange={(e) =>
                          setProfileForm((prev) => ({
                            ...prev,
                            email: e.target.value,
                          }))
                        }
                        className="bg-slate-800 border-slate-600 text-slate-100"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button type="submit" className="flex-1">
                        Update
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setEditProfileOpen(false)}
                        className="flex-1"
                      >
                        Cancel
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>
        </motion.div>

        {/* Security Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="border-0 shadow-lg bg-slate-900 border-slate-800">
            <CardHeader className="pb-4">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-r from-emerald-700 to-emerald-800 flex items-center justify-center">
                  <Shield className="w-6 h-6 text-white" />
                </div>
                <div>
                  <CardTitle className="text-lg text-slate-100">
                    Security
                  </CardTitle>
                  <p className="text-sm text-slate-400">
                    Password and security settings
                  </p>
                </div>
              </div>
            </CardHeader>{" "}
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <Dialog
                  open={changePasswordOpen}
                  onOpenChange={setChangePasswordOpen}
                >
                  <DialogTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start border-slate-600 text-slate-300 hover:bg-slate-800 hover:text-slate-100"
                    >
                      Change Password
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[425px] bg-slate-900 border-slate-700">
                    <DialogHeader>
                      <DialogTitle className="text-slate-100">
                        Change Password
                      </DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handlePasswordChange} className="space-y-4">
                      <div className="space-y-2">
                        <Label
                          htmlFor="currentPassword"
                          className="text-slate-300"
                        >
                          Current Password
                        </Label>
                        <Input
                          id="currentPassword"
                          type="password"
                          value={passwordForm.currentPassword}
                          onChange={(e) =>
                            setPasswordForm((prev) => ({
                              ...prev,
                              currentPassword: e.target.value,
                            }))
                          }
                          className="bg-slate-800 border-slate-600 text-slate-100"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="newPassword" className="text-slate-300">
                          New Password
                        </Label>
                        <Input
                          id="newPassword"
                          type="password"
                          value={passwordForm.newPassword}
                          onChange={(e) =>
                            setPasswordForm((prev) => ({
                              ...prev,
                              newPassword: e.target.value,
                            }))
                          }
                          className="bg-slate-800 border-slate-600 text-slate-100"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label
                          htmlFor="confirmPassword"
                          className="text-slate-300"
                        >
                          Confirm New Password
                        </Label>
                        <Input
                          id="confirmPassword"
                          type="password"
                          value={passwordForm.confirmPassword}
                          onChange={(e) =>
                            setPasswordForm((prev) => ({
                              ...prev,
                              confirmPassword: e.target.value,
                            }))
                          }
                          className="bg-slate-800 border-slate-600 text-slate-100"
                          required
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button type="submit" className="flex-1">
                          Change Password
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setChangePasswordOpen(false)}
                          className="flex-1"
                        >
                          Cancel
                        </Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
                <Button
                  variant="outline"
                  className="w-full justify-start border-slate-600 text-slate-300 hover:bg-slate-800 hover:text-slate-100"
                  onClick={() =>
                    toast("Two-Factor Authentication coming soon!", {
                      icon: "🔐",
                    })
                  }
                >
                  Two-Factor Authentication
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start border-slate-600 text-slate-300 hover:bg-slate-800 hover:text-slate-100"
                  onClick={() =>
                    toast("Active Sessions management coming soon!", {
                      icon: "📱",
                    })
                  }
                >
                  Active Sessions
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Preferences Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="border-0 shadow-lg bg-slate-900 border-slate-800">
            <CardHeader className="pb-4">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-r from-amber-700 to-amber-800 flex items-center justify-center">
                  <SettingsIcon className="w-6 h-6 text-white" />
                </div>
                <div>
                  <CardTitle className="text-lg text-slate-100">
                    Preferences
                  </CardTitle>
                  <p className="text-sm text-slate-400">
                    Customize your experience
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Bell className="w-4 h-4 text-slate-400" />
                    <span className="text-sm text-slate-300">
                      Notifications
                    </span>
                  </div>{" "}
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-slate-600 text-slate-300 hover:bg-slate-800 hover:text-slate-100"
                    onClick={() =>
                      toast("Notification settings coming soon!", {
                        icon: "🔔",
                      })
                    }
                  >
                    Configure
                  </Button>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Palette className="w-4 h-4 text-slate-400" />
                    <span className="text-sm text-slate-300">Theme</span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-slate-600 text-slate-300 hover:bg-slate-800 hover:text-slate-100"
                    onClick={() =>
                      toast(
                        "Theme switching coming soon! Currently using Dark Mode.",
                        { icon: "🎨" }
                      )
                    }
                  >
                    Dark Mode
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Account Actions Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="border-0 shadow-lg bg-slate-900 border-slate-800">
            <CardHeader className="pb-4">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-r from-red-700 to-red-800 flex items-center justify-center">
                  <LogOut className="w-6 h-6 text-white" />
                </div>
                <div>
                  <CardTitle className="text-lg text-slate-100">
                    Account Actions
                  </CardTitle>
                  <p className="text-sm text-slate-400">
                    Manage your account status
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <Button
                  onClick={handleLogout}
                  variant="outline"
                  className="w-full justify-start text-red-400 border-red-800 hover:bg-red-950/50 hover:border-red-700"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign Out
                </Button>{" "}
                <Button
                  variant="outline"
                  className="w-full justify-start text-red-400 border-red-800 hover:bg-red-950/50 hover:border-red-700"
                  onClick={() => {
                    const confirmed = window.confirm(
                      "Are you sure you want to delete your account? This action cannot be undone."
                    );
                    if (confirmed) {
                      toast.error("Account deletion feature coming soon!");
                    }
                  }}
                >
                  Delete Account
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
      {/* App Information */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="mt-8"
      >
        <Card className="border-0 shadow-lg bg-slate-900 border-slate-800">
          <CardContent className="p-6">
            <div className="text-center space-y-2">
              <h3 className="text-lg font-semibold text-slate-100">
                Budget Tracker
              </h3>
              <p className="text-sm text-slate-400">Version 1.0.0</p>
              <p className="text-xs text-slate-500">
                Built with React 19, Bun.js, and modern web technologies
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
