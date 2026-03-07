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
      const { user, token, products } = await authService.login({ email, password });
      login(user, token, products);
      identifyUser(user.id.toString());
      setUserProfile(user);  
      toast.success("Login successful!");
      
      if (products.length === 0) {
        navigate("/expenses");
      } else if (products.length === 1) {
        const product = products[0];
        if (product === "Expense Management") {
          navigate("/expenses");
        } else if (product === "Invoice Payments") {
          navigate("/flow/invoice");
        } else {
          navigate("/expenses");
        }
      } else {
        navigate("/select-product");
      }
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
        <h2 className="text-2xl font-bold text-[#1A1A1A] mb-2">Welcome Back</h2>
        <p className="text-base font-medium text-[#64748B]">Sign in to access Chronon Flow</p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label
            htmlFor="email"
            className="block text-sm font-semibold text-[#64748B] mb-2"
          >
            Email Address
          </label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3 py-2.5 border border-gray-200 focus:ring-2 focus:ring-[#0D9C99] focus:border-[#0D9C99] transition-colors text-[#1A1A1A] text-sm font-medium"
            style={{ backgroundColor: "#f8fafc" }}
            required
          />
        </div>
        <div>
          <label
            htmlFor="password"
            className="block text-sm font-semibold text-[#64748B] mb-2"
          >
            Password
          </label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2.5 pr-10 border border-gray-200 focus:ring-2 focus:ring-[#0D9C99] focus:border-[#0D9C99] transition-colors text-[#1A1A1A] text-sm font-medium"
              style={{ backgroundColor: "#f8fafc" }}
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[#64748B] hover:text-[#1A1A1A]"
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
              className="underline text-[#0D9C99] hover:text-[#0a7d7a] text-[12px] font-medium"
              onClick={() => navigate("/accounts/forgot_password")}
            >
              Forgot Password?
            </button>
          </div>
        </div>
        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
            <AlertCircle className="w-4 h-4 text-red-500" />
            <span className="text-sm font-medium text-red-700 capitalize">{error}</span>
          </div>
        )}
        <Button
          type="submit"
          className="w-full bg-[#0D9C99] hover:bg-[#0a7d7a] text-white py-2.5 px-4 rounded-lg font-semibold transition-colors text-sm"
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
        <p className="text-sm font-medium text-[#64748B]">
          Need help?{" "}
          <a href="#" className="text-[#0D9C99] hover:text-[#0a7d7a] font-semibold">
            Contact your administrator
          </a>
        </p>
      </div>
    </div>
  );
}
