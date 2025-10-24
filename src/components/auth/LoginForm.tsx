import React, { useState } from "react";
import {
  Eye,
  EyeOff,
  AlertCircle,
  Users,
  FileText,
  ShieldCheck,
  MapPin,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "@/store/authStore";
import { authService } from "@/services/authService";
import { toast } from "sonner";

interface LoginProps {
  onLogin?: () => void;
}

export function LoginForm({ onLogin }: LoginProps) {
  const navigate = useNavigate()
  const login = useAuthStore((state) => state.login);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedProfile, setLocalSelectedProfile] = useState<any | null>(null);
  const [showProfileSelection, setShowProfileSelection] = useState(false);
  const [availableProfiles] = useState([
    {
      role: "ADMIN",
      title: "Administrator",
      description: "Full access to all system features and user management",
      icon: "shield-check"
    },
    {
      role: "MANAGER",
      title: "Manager",
      description: "Manage team expenses and approve reports",
      icon: "users"
    },
    {
      role: "EMPLOYEE",
      title: "Employee",
      description: "Submit and track your expense reports",
      icon: "file-text"
    }
  ]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    
    try {
      const { user, token } = await authService.login({ email, password });
      login(user, token);
      setShowProfileSelection(true);
      toast.success("Login successful! Please select your profile.");
    } catch (error: any) {
      setError(error.message || "Login failed. Please try again.");
      toast.error(error.message || "Login failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleProfileSelection = (profile: any) => {
    setLocalSelectedProfile(profile);
    onLogin?.();
    console.log(profile);
    if (profile.role === "ADMIN") {
      console.log("inside !ADMIN")
      navigate("/");
    } else {
      console.log("inside /expenses")
      navigate("/expenses");
    }
    setShowProfileSelection(false);
  };

  return (
    <div
      className="min-h-screen flex justify-center"
      style={{ backgroundColor: "#F5F7FB" }}
    >
      <div className="w-full max-w-6xl flex flex-col lg:flex-row items-center justify-center p-8">
        <div
          className="w-full lg:w-1/2 flex flex-col justify-center px-12"
          style={{ backgroundColor: "#F5F7FB" }}
        >
          <div className="max-w-lg">
            <div className="w-16 h-16 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-2xl flex items-center justify-center mb-6 shadow-md">
              <span className="text-white text-3xl font-bold">∞</span>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 leading-tight mb-0">
            Chronon
            </h1>
            <h2 className="text-3xl font-bold text-purple-600 mb-2 leading-tight">
              Flow
            </h2>
            <p className="text-base text-gray-600 mb-6 leading-relaxed max-w-md">
              Streamline your business expenses with intelligent automation and real-time insights
            </p>
            <div className="grid grid-cols-2 gap-y-4 gap-x-8">
              <div className="flex items-center gap-3">
                <div className="w-2.5 h-2.5 bg-purple-600 rounded-full"></div>
                <span className="text-gray-700 text-sm">
                  Smart Receipt Processing
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-2.5 h-2.5 bg-purple-600 rounded-full"></div>
                <span className="text-gray-700 text-sm">
                  Real-time Approvals
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-2.5 h-2.5 bg-purple-600 rounded-full"></div>
                <span className="text-gray-700 text-sm">
                  Compliance Tracking
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-2.5 h-2.5 bg-purple-600 rounded-full"></div>
                <span className="text-gray-700 text-sm">
                  Financial Insights
                </span>
              </div>
            </div>
          </div>
        </div>
        <div className="w-full lg:w-1/2 flex items-center p-8">
          <div className="w-full max-w-md">
            {!showProfileSelection ? (
              // Login Form
              <div className="bg-white rounded-xl shadow-lg p-10 w-full">
                <div className="text-center mb-8">
                  <h2 className="text-xl font-bold text-gray-900 mb-2">
                    Welcome Back
                  </h2>
                  <p className="text-gray-600 text-base">
                    Sign in to access Chronon Flow
                  </p>
                </div>
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div>
                    <label
                      htmlFor="email"
                      className="block text-sm font-medium text-gray-700 mb-2"
                    >
                      Email Address
                    </label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors text-gray-900 text-sm"
                      style={{ backgroundColor: "#f8fafc" }}
                      required
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="password"
                      className="block text-sm font-medium text-gray-700 mb-2"
                    >
                      Password
                    </label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full px-3 py-2.5 pr-10 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors text-gray-900 text-sm"
                        style={{ backgroundColor: "#f8fafc" }}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showPassword ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                      />
                      <span className="text-sm text-gray-700">Remember me</span>
                    </label>
                    <a
                      href="#"
                      className="text-sm text-purple-600 hover:text-purple-700 font-medium"
                    >
                      Forgot password?
                    </a>
                  </div>
                  {error && (
                    <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                      <AlertCircle className="w-4 h-4 text-red-500" />
                      <span className="text-sm text-red-700">{error}</span>
                    </div>
                  )}
                  <Button
                    type="submit"
                    className="w-full bg-purple-600 hover:bg-purple-700 text-white py-2.5 px-4 rounded-lg font-medium transition-colors text-sm"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        Signing In...
                      </div>
                    ) : (
                      "Sign In"
                    )}
              </Button>
            </form>
                <div className="mt-4 text-center">
                  <p className="text-sm text-gray-500">
                    Need help?{" "}
                    <a
                      href="#"
                      className="text-purple-600 hover:text-purple-700 font-medium"
                    >
                      Contact your administrator
                    </a>
                  </p>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-lg p-10 w-full max-w-4xl">
                <div className="text-center mb-8">
                  <h2 className="text-xl font-semibold text-gray-900 mb-2">
                    Select Your Profile
                  </h2>
                  <p className="text-gray-600 ">
                    Choose your role to access the appropriate dashboard
                  </p>
                </div>

                <div className="space-y-4">
                  {availableProfiles.length > 0 ? (
                    availableProfiles.map((profile) => (
                      <div
                        key={profile.role}
                        className={`p-4 rounded-xl border-2 cursor-pointer transition-all hover:shadow-lg hover:border-purple-500 hover:bg-purple-50 ${
                          selectedProfile?.role === profile.role
                            ? "border-purple-500 bg-purple-50"
                            : "border-gray-200 bg-white"
                        }`}
                        onClick={() => handleProfileSelection(profile)}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                            {profile.icon === "users" && (
                              <Users className="w-5 h-5 text-purple-600" />
                            )}
                            {profile.icon === "file-text" && (
                              <FileText className="w-5 h-5 text-purple-600" />
                            )}
                            {profile.icon === "shield-check" && (
                              <ShieldCheck className="w-5 h-5 text-purple-600" />
                            )}
                            {profile.icon === "map-pin" && (
                              <MapPin className="w-5 h-5 text-purple-600" />
                            )}
                          </div>
                          <span
                            className={`px-3 py-1 rounded-full text-sm font-medium ${
                              selectedProfile?.role === profile.role
                                ? "bg-purple-100 text-purple-800"
                                : "bg-gray-100 text-gray-700"
                            }`}
                          >
                            {profile.title}
                          </span>
                        </div>
                        <h3 className="text-lg font-bold text-gray-900 mb-1">
                          {profile.title}
                        </h3>
                        <p className="text-gray-600 text-sm">
                          {profile.description}
                        </p>
                      </div>
                    ))
                  ) : (
                    <div className="p-4 rounded-xl border-2 border-gray-200 bg-white text-center">
                      <p className="text-gray-600">
                        No profiles available. Please contact your
                        administrator.
                      </p>
                    </div>
                  )}
                </div>

                <div className="mt-8 text-center">
                  <p className="text-sm text-gray-500">
                    Need different access?{" "}
                    <a
                      href="#"
                      className="text-purple-600 hover:text-purple-700 font-medium"
                    >
                      Contact your administrator
                    </a>
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}