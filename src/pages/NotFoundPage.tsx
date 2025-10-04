import { Link, useNavigate } from 'react-router-dom';
import { 
  Home, 
  ArrowLeft, 
  FileQuestion,
  Compass,
  RefreshCw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export function NotFoundPage() {
  const navigate = useNavigate();

  const handleGoBack = () => {
    navigate(-1);
  };

  const handleRefresh = () => {
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background flex items-center justify-center p-4">
      <div className="w-full max-w-2xl mx-auto text-center space-y-8">
        {/* Animated 404 */}
        <div className="relative">
          <div className="text-[12rem] md:text-[16rem] font-bold text-primary/20 leading-none select-none">
            404
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="p-6 bg-primary/10 rounded-full animate-pulse">
              <FileQuestion className="h-16 w-16 md:h-20 md:w-20 text-primary" />
            </div>
          </div>
        </div>

        {/* Content Card */}
        <Card className="border-0 shadow-2xl bg-card/80 backdrop-blur-sm">
          <CardContent className="p-8 md:p-12 space-y-6">
            <div className="space-y-4">
              <h1 className="text-3xl md:text-4xl font-bold text-foreground">
                Oops! Page Not Found
              </h1>
              <p className="text-lg text-muted-foreground max-w-md mx-auto leading-relaxed">
                The page you're looking for seems to have wandered off into the digital void. 
                Don't worry, it happens to the best of us!
              </p>
            </div>

            {/* Suggestions */}
            <div className="bg-muted/30 rounded-lg p-6 space-y-3">
              <h3 className="font-semibold text-foreground flex items-center gap-2">
                <Compass className="h-5 w-5 text-primary" />
                Here's what you can try:
              </h3>
              <ul className="text-sm text-muted-foreground space-y-2 text-left max-w-md mx-auto">
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-primary rounded-full"></div>
                  Check the URL for any typos
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-primary rounded-full"></div>
                  Go back to the previous page
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-primary rounded-full"></div>
                  Visit our homepage to start fresh
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-primary rounded-full"></div>
                  Try refreshing the page
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
            Need help? Contact our{' '}
            <span className="text-primary font-medium cursor-pointer hover:underline">
              support team
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}