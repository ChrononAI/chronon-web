import { useEffect, useState } from "react";
import AuthLayout from "@/components/layout/AuthLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Eye, EyeOff } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { authService } from "@/services/authService";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

function ResetPassword() {
    const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const email = searchParams.get("email") || "def";
  const token = searchParams.get("token") || "abc";
  const [emailVerified, setEmailVerified] = useState(true);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(true);
  console.log(email, token);

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    try {
      console.log("trying..");
    } catch (error) {
      console.log(error);
    } finally {
      setIsLoading(false);
    }
  };

  const verifyEmail = async (payload: { token: string; email: string }) => {
    setLoading(true);
    try {
      const res = await authService.verifyEmail(payload);
      console.log(res);
      setEmailVerified(true);
      setShowDialog(false);
    } catch (error: any) {
      setEmailVerified(false);
      toast.error(
        error?.response?.data?.message ||
          error.message ||
          "Failed to verify email. Try again"
      );
      navigate('accounts/ema');
    } finally {
      setLoading(false);
      setShowDialog(false);
    }
  };

  useEffect(() => {
    if (token && email) {
      verifyEmail({ token, email });
    }
  }, []);

  return (
    <AuthLayout>
      <div className="w-full max-w-md">
        <div className="bg-white rounded-xl shadow-lg p-10 w-full">
          <div className="text-center mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              Set New Password
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
                New Password
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
                  Setting...
                </div>
              ) : (
                "Set Password"
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
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent className="flex flex-col items-center py-10 pt-5 gap-6 max-w-md text-center [&>button[aria-label='Close']]:hidden">
            <DialogTitle className="hidden">
                Verifying email
            </DialogTitle>
            <div className="w-20 h-20 border-8 border-gray border-t-white rounded-full animate-spin"></div>
            <div>
              <div className="text-2xl font-bold mb-2">Please wait!</div>
              <div className="text-gray-700 text-lg">
                Verifying your email address.
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AuthLayout>
  );
}

export default ResetPassword;
