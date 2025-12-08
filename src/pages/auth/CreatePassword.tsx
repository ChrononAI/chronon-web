import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertCircle, CircleCheckBig, Eye, EyeOff } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { authService } from "@/services/authService";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

function CreatePassword() {
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
  const [verifying, setVerifying] = useState(true);
  const [tokens, setTokens] = useState<{
    access_token: string;
    refresh_token: string;
    user_details: any;
  } | null>(null);

  const verifyEmail = async (payload: { token: string; email: string }) => {
    setVerifying(true);
    try {
      const res: any = await authService.verifyEmail(payload);
      toast.success(res.data.message || "Email verified");
      setTokens(res.data.data);
    } catch (error: any) {
      console.log(error);
      if (error?.response?.data.message === "Email already verified") {
        navigate("/login");
      } else {
        navigate("/accounts/resend_verification");
      }
      toast.error(
        error?.response?.data?.message ||
          error.message ||
          "Failed to verify email"
      );
    } finally {
      setVerifying(false);
    }
  };

  const createPassword = async (payload: {
    password: string;
    token: string;
  }) => {
    setIsLoading(true);
    try {
      const res: any = await authService.createPassword(payload);
      console.log(res);
      toast.success(res.data.message || "Password created successfully");
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
    if (password !== confirmPassword) {
      setError("Password and confirm password must match");
      return;
    }
    if (!email || !token) {
      setError("Email and token must be valid");
      return;
    }
    const payload = {
      password,
      token: tokens?.access_token || "",
    };
    createPassword(payload);
  };

  useEffect(() => {
    if (!token || !email) {
      // Navigate to resend verification mail page
      navigate("/accounts/resend_verification");
      return;
    }
    verifyEmail({ token, email });
  }, []);

  return (
    <div className="w-full h-screen mx-auto flex items-center max-w-md">
      <div>
        <div className="text-center mb-8">
          <CircleCheckBig className="mx-auto w-16 h-16 my-4 text-green-500" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            Email Verified Successfully!
          </h2>
          <p className="text-gray-600 text-base">
            Enter and confirm your new password to continue.
          </p>
        </div>
        <div className="bg-white rounded-xl shadow-lg p-10 w-full">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                New Password
              </label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-200 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors text-gray-900 text-sm"
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
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Confirm Password
              </label>
              <div className="relative">
                <Input
                  id="confirm-password"
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-3 py-2.5 pr-10 border border-gray-200 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors text-gray-900 text-sm"
                  style={{ backgroundColor: "#f8fafc" }}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
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
            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                <AlertCircle className="w-4 h-4 text-red-500" />
                <span className="text-sm text-red-700 capitalize">{error}</span>
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
                  Creating...
                </div>
              ) : (
                "Create Password"
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
      </div>
      <Dialog open={verifying}>
        <DialogContent className="flex flex-col items-center p-10 gap-6 max-w-md text-center">
          {/* Hidden title for accessibility */}
          <DialogTitle className="hidden">Verifying email</DialogTitle>

          {/* Spinner */}
          <div className="w-20 h-20 border-8 border-gray-300 border-t-white rounded-full animate-spin"></div>

          {/* Header + Description */}
          <DialogHeader className="space-y-2">
            <div className="text-2xl text-center font-bold">Please wait!</div>
            <DialogDescription className="text-gray-700">
              Verifying your email.
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default CreatePassword;
