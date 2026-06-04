import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { setAuthTokenGetter } from "@workspace/api-client-react";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

import Login from "./pages/login";
import Signup from "./pages/signup";
import Profile from "./pages/member/profile";
import More from "./pages/member/more";
import DeveloperInfo from "./pages/developer-info";
import { ProtectedLayout } from "./components/layout/ProtectedLayout";

// Initialize auth token getter
setAuthTokenGetter(() => localStorage.getItem("sgma_auth_token"));

const queryClient = new QueryClient();

// Protected Route Wrapper
function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const [isChecking, setIsChecking] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [, setLocation] = useLocation();

  useEffect(() => {
    const token = localStorage.getItem("sgma_auth_token");
    if (!token) {
      setLocation("/login");
    } else {
      setIsAuthenticated(true);
    }
    setIsChecking(false);
  }, [setLocation]);

  if (isChecking) {
    return (
      <div className="min-h-[100dvh] w-full flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <ProtectedLayout>
      <Component />
    </ProtectedLayout>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={() => {
        const [, setLocation] = useLocation();
        useEffect(() => setLocation("/login"), [setLocation]);
        return null;
      }} />
      <Route path="/login" component={Login} />
      <Route path="/signup" component={Signup} />
      <Route path="/developer-info" component={DeveloperInfo} />
      
      {/* Protected Routes */}
      <Route path="/member/profile">
        <ProtectedRoute component={Profile} />
      </Route>
      <Route path="/member/more">
        <ProtectedRoute component={More} />
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <div dir="rtl" className="min-h-[100dvh] w-full bg-background font-sans text-foreground">
            <Router />
          </div>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
