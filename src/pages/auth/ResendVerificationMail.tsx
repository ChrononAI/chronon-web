import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import AuthLayout from "@/components/layout/AuthLayout";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { authService } from "@/services/authService";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { CircleCheck } from "lucide-react";

function ResendVerificationMail() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showDialog, setShowDialog] = useState(false);

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    if (!email) toast.error("Please enter registered mail");
    setIsLoading(true);
    try {
      await authService.resetPassword({ email });
      toast.success("Password reset link sent to mail");
    } catch (error: any) {
      toast.error(
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
        <div className="bg-white rounded-xl shadow-lg p-10 w-full">
          <div className="text-center mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              Email Verification Failed
            </h2>
            <p className="text-gray-600 text-base">
              Enter your email address to get a verification link.
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
            <Button
              type="submit"
              className="w-full bg-purple-600 hover:bg-purple-700 text-white py-2.5 px-4 rounded-lg font-medium transition-colors text-sm"
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
                className="text-purple-600 hover:text-purple-700 font-medium"
              >
                Contact your administrator
              </a>
            </p>
          </div>
        </div>
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
              <DialogContent className="flex flex-col items-center py-10 pt-5 gap-6 max-w-md text-center">
                <div className="flex justify-center items-center mb-4" style={{ width: 96, height: 96 }}>
            <CircleCheck size={96} className="text-green-600" strokeWidth={2.5} />
          </div>
          <div>
            <div className="text-2xl font-bold mb-2">Verification request sent to your email ID.</div>
            <div className="text-gray-700 text-lg">Please check your email</div>
          </div>
          <Button className="mt-2 w-40 mx-auto text-white bg-purple-600 hover:bg-purple-700 font-medium" onClick={() => { setShowDialog(false); navigate('/login'); }}>
            Sign in
          </Button>
              </DialogContent>
        </Dialog>
      </div>
    </AuthLayout>
  );
}

export default ResendVerificationMail;
