import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { setAuthTokenGetter } from "@workspace/api-client-react";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

import Login from "./pages/login";
import Register from "./pages/register";
import Home from "./pages/home";
import More from "./pages/more";
import Chat from "./pages/chat";
import ChatPublic from "./pages/chat-public";
import ChatAdmin from "./pages/chat-admin";
import News from "./pages/news";
import NewsDetail from "./pages/news-detail";
import Articles from "./pages/articles";
import ArticleNew from "./pages/article-new";
import ArticleMy from "./pages/article-my";
import ArticleEdit from "./pages/article-edit";
import ArticleDetail from "./pages/article-detail";
import Broadcast from "./pages/broadcast";
import DeveloperInfo from "./pages/developer-info";
import StaticPage from "./pages/static-page";
import Unauthorized from "./pages/unauthorized";
import { ProtectedLayout } from "./components/layout/ProtectedLayout";
import { getStoredUser, isStaffRole } from "./lib/auth";
import AdminDashboard from "./pages/admin/dashboard";
import AdminUsers from "./pages/admin/users";
import AdminArticles from "./pages/admin/articles";
import AdminNews from "./pages/admin/news";
import AdminBroadcasts from "./pages/admin/broadcasts";

setAuthTokenGetter(() => localStorage.getItem("sgma_auth_token"));

const queryClient = new QueryClient();

function ProtectedRoute({
  component: Component,
  staffOnly = false,
  allowedRoles,
}: {
  component: React.ComponentType;
  staffOnly?: boolean;
  allowedRoles?: string[];
}) {
  const [isChecking, setIsChecking] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [, setLocation] = useLocation();

  useEffect(() => {
    const token = localStorage.getItem("sgma_auth_token");
    const role = getStoredUser()?.role;
    if (!token) {
      setLocation("/login");
    } else if (staffOnly && !isStaffRole(role)) {
      setLocation("/unauthorized");
    } else if (allowedRoles && !(role && allowedRoles.includes(role))) {
      setLocation("/unauthorized");
    } else {
      setIsAuthenticated(true);
    }
    setIsChecking(false);
  }, [setLocation, staffOnly, allowedRoles]);

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

function RootRedirect() {
  const [, setLocation] = useLocation();
  useEffect(() => {
    const token = localStorage.getItem("sgma_auth_token");
    setLocation(token ? "/home" : "/login");
  }, [setLocation]);
  return null;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={RootRedirect} />
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/developer-info" component={DeveloperInfo} />
      <Route path="/privacy-policy">
        <StaticPage slug="privacy-policy" />
      </Route>
      <Route path="/terms">
        <StaticPage slug="terms" />
      </Route>
      <Route path="/about-sgma">
        <StaticPage slug="about-sgma" />
      </Route>
      <Route path="/unauthorized" component={Unauthorized} />

      <Route path="/home">
        <ProtectedRoute component={Home} />
      </Route>
      <Route path="/more">
        <ProtectedRoute component={More} />
      </Route>
      <Route path="/chat">
        <ProtectedRoute component={Chat} />
      </Route>
      <Route path="/chat/public">
        <ProtectedRoute component={ChatPublic} />
      </Route>
      <Route path="/chat/admin">
        <ProtectedRoute component={ChatAdmin} />
      </Route>
      <Route path="/news">
        <ProtectedRoute component={News} />
      </Route>
      <Route path="/news/:id">
        <ProtectedRoute component={NewsDetail} />
      </Route>
      <Route path="/articles">
        <ProtectedRoute component={Articles} />
      </Route>
      <Route path="/articles/new">
        <ProtectedRoute component={ArticleNew} />
      </Route>
      <Route path="/articles/my">
        <ProtectedRoute component={ArticleMy} />
      </Route>
      <Route path="/articles/:id/edit">
        <ProtectedRoute component={ArticleEdit} />
      </Route>
      <Route path="/articles/:id">
        <ProtectedRoute component={ArticleDetail} />
      </Route>
      <Route path="/broadcast">
        <ProtectedRoute component={Broadcast} allowedRoles={["ADMIN", "SUPER_ADMIN"]} />
      </Route>

      <Route path="/admin">
        <ProtectedRoute component={AdminDashboard} staffOnly />
      </Route>
      <Route path="/admin/users">
        <ProtectedRoute component={AdminUsers} allowedRoles={["ADMIN", "SUPER_ADMIN"]} />
      </Route>
      <Route path="/admin/articles">
        <ProtectedRoute component={AdminArticles} staffOnly />
      </Route>
      <Route path="/admin/news">
        <ProtectedRoute component={AdminNews} staffOnly />
      </Route>
      <Route path="/admin/broadcasts">
        <ProtectedRoute component={AdminBroadcasts} allowedRoles={["ADMIN", "SUPER_ADMIN"]} />
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
