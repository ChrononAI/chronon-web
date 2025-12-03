import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import AuthLayout from "@/components/layout/AuthLayout";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { authService } from "@/services/authService";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AlertCircle, CircleCheck } from "lucide-react";
import { DialogDescription } from "@radix-ui/react-dialog";

function ForgotPasswordPage() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [error, setError] = useState("");

  const dialogClose = () => {
    setShowDialog(false);
    navigate("/login");
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setError("");
    if (!email) toast.error("Please enter registered mail");
    setIsLoading(true);
    try {
      const res: any = await authService.resetPassword({ email });
      toast.error(res.data.message);
      if (
        res.data.message === "Email is not verified. Please verify email first"
      ) {
        navigate("/accounts/resend_verification");
      } else {
        setShowDialog(true);
      }
    } catch (error: any) {
      setError(
        error?.response?.data.message ||
          error.message ||
          "Failed to send password reset link"
      );
    } finally {
      setIsLoading(false);
    }
  };
  return (
    <AuthLayout>
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            Forgot Password?
          </h2>
          <p className="text-gray-600 text-base">
            Enter your registered email address to get a password reset link.
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
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors text-gray-900 text-sm"
              style={{ backgroundColor: "#f8fafc" }}
              required
            />
            <div className="flex justify-end mt-2">
              <button
                type="button"
                className="underline text-green-600 hover:text-green-700 text-[12px]"
                onClick={() => navigate("/login")}
              >
                Sign In
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
            className="w-full bg-green-600 hover:bg-green-700 text-white py-2.5 px-4 rounded-lg font-medium transition-colors text-sm"
            disabled={isLoading}
          >
            {isLoading ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                Sending...
              </div>
            ) : (
              "Send Reset Link"
            )}
          </Button>
        </form>
        <div className="mt-4 text-center">
          <p className="text-sm text-gray-500">
            Need help?{" "}
            <a
              href="#"
              className="text-green-600 hover:text-green-700 font-medium"
            >
              Contact your administrator
            </a>
          </p>
        </div>
        <Dialog open={showDialog} onOpenChange={dialogClose}>
          <DialogContent className="flex flex-col items-center p-10 gap-6 max-w-md text-center">
            <div
              className="flex justify-center items-center mb-4"
              style={{ width: 96, height: 96 }}
            >
              <CircleCheck
                size={96}
                className="text-green-600"
                strokeWidth={2.5}
              />
            </div>
            <div>
              <DialogTitle className="hidden">verify email</DialogTitle>
              <DialogHeader>
                <div className="text-2xl text-center font-bold mb-2">
                  Verification request sent to your email.
                </div>
              </DialogHeader>
              <DialogDescription>
                <div className="text-gray-700">
                  Please check your email
                </div>
              </DialogDescription>
            </div>
            <Button
              className="mt-2 w-40 mx-auto text-white bg-green-600 hover:bg-green-700 font-medium"
              onClick={() => {
                setShowDialog(false);
                navigate("/login");
              }}
            >
              Sign in
            </Button>
          </DialogContent>
        </Dialog>
      </div>
    </AuthLayout>
  );
}

export default ForgotPasswordPage;
