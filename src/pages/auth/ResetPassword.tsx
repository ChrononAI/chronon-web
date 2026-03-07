import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertCircle, CircleCheckBig, Eye, EyeOff } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { authService } from "@/services/authService";

function ResetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  let email = searchParams.get("email");
  if (email) email = email.replace(/ /g, "+");
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const verifyResetPassword = async (payload: {
    email: string;
    token: string;
    password: string;
  }) => {
    setIsLoading(true);
    try {
      authService.verifyResetPassword(payload);
      toast.success("Password reset successful");
      navigate("/login");
    } catch (error: any) {
      console.log(error);
      setError(
        error?.response?.data?.message ||
          error.message ||
          "Failed to reset password"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setError("");
    if (password !== confirmPassword) {
      setError("Password and confirm password must match");
      return;
    }
    if (!email || !token) {
      setError("Eamil and token must be valid");
      return;
    }
    const payload = {
      password,
      token,
      email,
    };
    verifyResetPassword(payload);
  };

  useEffect(() => {
    if (!token || !email) {
      // Navigate to resend verification mail page
      navigate("/login");
      toast.error("Password or token not found");
      return;
    }
  }, []);

  return (
    <div className="w-full h-screen mx-auto flex items-center max-w-md">
      <div>
        <div className="text-center mb-8">
          <CircleCheckBig className="mx-auto w-16 h-16 my-4 text-[#5DC364]" />
          <h2 className="text-2xl font-bold text-[#1A1A1A] mb-2">
            Password Reset Successful!
          </h2>
          <p className="text-base font-medium text-[#64748B]">
            Enter and confirm your new password to continue.
          </p>
        </div>
        <div className="bg-white rounded-xl shadow-lg p-10 w-full">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-semibold text-[#64748B] mb-2"
              >
                New Password
              </label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-200 focus:ring-2 focus:ring-[#0D9C99] focus:border-[#0D9C99] transition-colors text-[#1A1A1A] text-sm font-medium"
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
            </div>
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-semibold text-[#64748B] mb-2"
              >
                Confirm Password
              </label>
              <div className="relative">
                <Input
                  id="confirm-password"
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-3 py-2.5 pr-10 border border-gray-200 focus:ring-2 focus:ring-[#0D9C99] focus:border-[#0D9C99] transition-colors text-[#1A1A1A] text-sm font-medium"
                  style={{ backgroundColor: "#f8fafc" }}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[#64748B] hover:text-[#1A1A1A]"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
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
                  Setting...
                </div>
              ) : (
                "Set Password"
              )}
            </Button>
          </form>
          <div className="mt-4 text-center">
            <p className="text-sm font-medium text-[#64748B]">
              Need help?{" "}
              <a
                href="#"
                className="text-[#0D9C99] hover:text-[#0a7d7a] font-semibold"
              >
                Contact your administrator
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ResetPassword;
