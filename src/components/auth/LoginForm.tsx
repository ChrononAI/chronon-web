import { useState } from "react";
import { AlertCircle, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuthStore } from "@/store/authStore";
import { authService } from "@/services/authService";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { identifyUser, setUserProfile, trackEvent } from "@/mixpanel";

export function LoginForm() {
  const login = useAuthStore((state) => state.login);
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    trackEvent("Login Button Clicked", {
      button_name: "Login",
    });
    setIsLoading(true);
    setError("");

    try {
      const { user, token } = await authService.login({ email, password });
      login(user, token);
      identifyUser(user.id.toString());
      setUserProfile(user);
      
      // Fetch organization data after login
      try {
        const orgResponse = await authService.getOrgData();
        if (orgResponse?.data) {
          const setOrgSettings = useAuthStore.getState().setOrgSettings;
          setOrgSettings(orgResponse.data);
        }
      } catch (orgError) {
        console.warn("Failed to fetch organization data:", orgError);
        // Don't block login if org data fetch fails
      }
      
      toast.success("Login successful!");
    } catch (error: any) {
      setError(
        error?.response?.data?.message ||
          error?.message ||
          "Login failed. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md">
      <div className="text-center mb-8">
        <h2 className="text-xl font-bold text-gray-900 mb-2">Welcome Back</h2>
        <p className="text-gray-600 text-base">Sign in to access Chronon Flow</p>
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
            className="w-full px-3 py-2.5 border border-gray-200 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors text-gray-900 text-sm"
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
              className="w-full px-3 py-2.5 pr-10 border border-gray-200 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors text-gray-900 text-sm"
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
          <div className="flex justify-end mt-2">
            <button
              type="button"
              className="underline text-blue-600 hover:text-blue-700 text-[12px]"
              onClick={() => navigate("/accounts/forgot_password")}
            >
              Forgot Password?
            </button>
          </div>
        </div>
        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
            <AlertCircle className="w-4 h-4 text-red-500" />
            <span className="text-sm text-red-700 capitalize">{error}</span>
          </div>
        )}
        <Button
          type="submit"
          className="w-full bg-blue-600 hover:bg-blue-600 text-white py-2.5 px-4 rounded-lg font-medium transition-colors text-sm"
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
          <a href="#" className="text-blue-600 hover:blue-purple-700 font-medium">
            Contact your administrator
          </a>
        </p>
      </div>
    </div>
  );
}
