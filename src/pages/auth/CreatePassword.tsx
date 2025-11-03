import AuthLayout from "@/components/layout/AuthLayout";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Eye, EyeOff } from "lucide-react";
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
import { decodeJwtToken } from "@/lib/jwtUtils";
import { User } from "@/types/auth";
import { useAuthStore } from "@/store/authStore";

function CreatePassword() {
  const login = useAuthStore((state) => state.login);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  let email = searchParams.get("email");
  if (email) email = email.replace(/ /g, "+");
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
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

  const createPassword = async (payload: { password: string; token: string; }) => {
    setIsLoading(true);
    try {
      const res: any = await authService.createPassword(payload);
      console.log(res);
      if (tokens) {
        const { access_token, user_details } = tokens;
        const jwtData = decodeJwtToken(tokens?.access_token);

        const user: User = {
          id: parseInt(jwtData.user_id),
          username: user_details.username,
          email: user_details.email,
          firstName: user_details.first_name,
          lastName: user_details.last_name,
          role: jwtData.role,
          phone: "",
          department: "",
          location: "",
          organization: {
            id: parseInt(jwtData.org_id),
            name: "",
            orgCode: "",
          },
        };
        login(user, access_token);
      }
      toast.success("Password reset successful");
      navigate("/login");
    } catch (error: any) {
      console.log(error);
      toast.error(
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
    console.log(password, confirmPassword);
    if (password !== confirmPassword) {
      toast.error("Password and confirm password must match");
      return;
    }
    if (!email || !token) {
      toast.error("Eamil and token must be valid");
      return;
    }
    const payload = {
      password,
      token: tokens?.access_token || ""
    };
    console.log(payload);
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
    <AuthLayout>
      <div className="w-full max-w-md">
        <div className="bg-white rounded-xl shadow-lg p-10 w-full">
          <div className="text-center mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              Create Password
            </h2>
            <p className="text-gray-600 text-base">
              Enter and confirm your new password to continue.
            </p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label
                htmlFor="email"
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
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors text-gray-900 text-sm"
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
                  className="w-full px-3 py-2.5 pr-10 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors text-gray-900 text-sm"
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
        <Dialog open={verifying}>
          <DialogContent className="[&>button[aria-label='Close']]:hidden flex flex-col items-center py-10 pt-5 gap-6 max-w-md text-center">
            {/* Hidden title for accessibility */}
            <DialogTitle className="hidden">Verifying email</DialogTitle>

            {/* Spinner */}
            <div className="w-20 h-20 border-8 border-gray-300 border-t-white rounded-full animate-spin"></div>

            {/* Header + Description */}
            <DialogHeader className="space-y-2">
              <div className="text-2xl font-bold">Please wait!</div>
              <DialogDescription className="text-gray-700 text-lg">
                Verifying your email.
              </DialogDescription>
            </DialogHeader>
          </DialogContent>
        </Dialog>
      </div>
    </AuthLayout>
  );
}

export default CreatePassword;
