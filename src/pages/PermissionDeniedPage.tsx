import { Link, useNavigate } from 'react-router-dom';
import { 
  Home, 
  ArrowLeft, 
  Shield, 
  ShieldX,
  Lock,
  AlertTriangle,
  RefreshCw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuthStore } from '@/store/authStore';

export function PermissionDeniedPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const handleGoBack = () => {
    navigate(-1);
  };

  const handleRefresh = () => {
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50/50 via-background to-orange-50/50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl mx-auto text-center space-y-8">
        {/* Animated Shield */}
        <div className="relative">
          <div className="text-[8rem] md:text-[10rem] font-bold text-red-500/20 leading-none select-none">
            403
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="relative">
              <div className="p-6 bg-red-100  rounded-full animate-pulse">
                <ShieldX className="h-16 w-16 md:h-20 md:w-20 text-red-600 " />
              </div>
              <div className="absolute -top-2 -right-2">
                <div className="p-2 bg-red-500 rounded-full animate-bounce">
                  <Lock className="h-4 w-4 text-white" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Content Card */}
        <Card className="border-0 shadow-2xl bg-card/80 backdrop-blur-sm border-red-200/50 ">
          <CardContent className="p-8 md:p-12 space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-center gap-2 mb-4">
                <AlertTriangle className="h-6 w-6 text-red-600 " />
                <Badge variant="destructive" className="px-3 py-1">
                  Access Denied
                </Badge>
              </div>
              
              <h1 className="text-3xl md:text-4xl font-bold text-foreground">
                Permission Denied
              </h1>
              <p className="text-lg text-muted-foreground max-w-md mx-auto leading-relaxed">
                You don't have the necessary permissions to access this resource. 
                This area is restricted to authorized personnel only.
              </p>
            </div>

            {/* User Info */}
            {user && (
              <div className="bg-muted/30 rounded-lg p-6 space-y-3">
                <h3 className="font-semibold text-foreground flex items-center gap-2">
                  <Shield className="h-5 w-5 text-primary" />
                  Current Access Level:
                </h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-center gap-4 text-sm">
                    <span className="text-muted-foreground">User:</span>
                    <span className="font-medium">{user.firstName} {user.lastName}</span>
                  </div>
                  <div className="flex items-center justify-center gap-4 text-sm">
                    <span className="text-muted-foreground">Role:</span>
                    <Badge variant="secondary">{user.role}</Badge>
                  </div>
                  <div className="flex items-center justify-center gap-4 text-sm">
                    <span className="text-muted-foreground">Department:</span>
                    <span className="font-medium">{user.department}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Suggestions */}
            <div className="bg-amber-50/50  border border-amber-200/50  rounded-lg p-6 space-y-3">
              <h3 className="font-semibold text-amber-800  flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                What you can do:
              </h3>
              <ul className="text-sm text-amber-700  space-y-2 text-left max-w-md mx-auto">
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-amber-600  rounded-full"></div>
                  Contact your administrator for access
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-amber-600  rounded-full"></div>
                  Verify you're logged in with the correct account
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-amber-600  rounded-full"></div>
                  Check if your permissions have been updated
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-amber-600  rounded-full"></div>
                  Return to an area you have access to
                </li>
              </ul>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <Button 
                onClick={handleGoBack}
                variant="outline" 
                className="flex items-center gap-2 px-6 py-3 text-base"
              >
                <ArrowLeft className="h-4 w-4" />
                Go Back
              </Button>
              
              <Button 
                asChild
                className="flex items-center gap-2 px-6 py-3 text-base bg-primary hover:bg-primary/90"
              >
                <Link to="/expenses">
                  <Home className="h-4 w-4" />
                  Go Home
                </Link>
              </Button>
              
              <Button 
                onClick={handleRefresh}
                variant="ghost" 
                className="flex items-center gap-2 px-6 py-3 text-base"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-sm text-muted-foreground">
          <p>
            If you believe this is an error, please contact your{' '}
            <span className="text-primary font-medium cursor-pointer hover:underline">
              system administrator
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}