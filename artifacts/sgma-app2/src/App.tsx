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
import VolunteerDelegations from "./pages/volunteer-delegations";
import AdminVolunteerDelegations from "./pages/admin/volunteer-delegations";
import Tasks from "./pages/tasks";
import TaskDetail from "./pages/task-detail";
import AdminTasks from "./pages/admin/tasks";
import AdminTaskNew from "./pages/admin/task-new";
import Board from "./pages/board";
import BoardCurrent from "./pages/board-current";
import BoardPrevious from "./pages/board-previous";
import BoardHistory from "./pages/board-history";
import Unauthorized from "./pages/unauthorized";
import Academy from "./pages/academy";
import AcademyAnnouncements from "./pages/academy-announcements";
import AcademyLectures from "./pages/academy-lectures";
import AcademyLectureDetail from "./pages/academy-lecture-detail";
import AdminAcademy from "./pages/admin/academy";
import { ProtectedLayout } from "./components/layout/ProtectedLayout";
import { getStoredUser, isStaffRole, isSyriaUser } from "./lib/auth";
import AdminDashboard from "./pages/admin/dashboard";
import AdminUsers from "./pages/admin/users";
import AdminArticles from "./pages/admin/articles";
import AdminNews from "./pages/admin/news";
import AdminBroadcasts from "./pages/admin/broadcasts";
import AdminAds from "./pages/admin/ads";

setAuthTokenGetter(() => localStorage.getItem("sgma_auth_token"));

const queryClient = new QueryClient();

function ProtectedRoute({
  component: Component,
  staffOnly = false,
  allowedRoles,
  fullAppOnly = false,
}: {
  component: React.ComponentType;
  staffOnly?: boolean;
  allowedRoles?: string[];
  fullAppOnly?: boolean;
}) {
  const [isChecking, setIsChecking] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [, setLocation] = useLocation();

  useEffect(() => {
    const token = localStorage.getItem("sgma_auth_token");
    const user = getStoredUser();
    const role = user?.role;
    if (!token) {
      setLocation("/login");
    } else if (fullAppOnly && isSyriaUser(user)) {
      setLocation("/unauthorized");
    } else if (staffOnly && !isStaffRole(role)) {
      setLocation("/unauthorized");
    } else if (allowedRoles && !(role && allowedRoles.includes(role))) {
      setLocation("/unauthorized");
    } else {
      setIsAuthenticated(true);
    }
    setIsChecking(false);
  }, [setLocation, staffOnly, allowedRoles, fullAppOnly]);

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
    if (!token) {
      setLocation("/login");
    } else {
      setLocation(isSyriaUser(getStoredUser()) ? "/academy" : "/home");
    }
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
        <ProtectedRoute component={Chat} fullAppOnly />
      </Route>
      <Route path="/chat/public">
        <ProtectedRoute component={ChatPublic} fullAppOnly />
      </Route>
      <Route path="/chat/admin">
        <ProtectedRoute component={ChatAdmin} fullAppOnly />
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
        <ProtectedRoute component={ArticleNew} fullAppOnly />
      </Route>
      <Route path="/articles/my">
        <ProtectedRoute component={ArticleMy} fullAppOnly />
      </Route>
      <Route path="/articles/:id/edit">
        <ProtectedRoute component={ArticleEdit} fullAppOnly />
      </Route>
      <Route path="/articles/:id">
        <ProtectedRoute component={ArticleDetail} />
      </Route>
      <Route path="/volunteer-delegations">
        <ProtectedRoute component={VolunteerDelegations} fullAppOnly />
      </Route>
      <Route path="/tasks">
        <ProtectedRoute component={Tasks} fullAppOnly />
      </Route>
      <Route path="/tasks/:id">
        <ProtectedRoute component={TaskDetail} fullAppOnly />
      </Route>
      <Route path="/board">
        <ProtectedRoute component={Board} fullAppOnly />
      </Route>
      <Route path="/board/current">
        <ProtectedRoute component={BoardCurrent} fullAppOnly />
      </Route>
      <Route path="/board/previous">
        <ProtectedRoute component={BoardPrevious} fullAppOnly />
      </Route>
      <Route path="/board/history">
        <ProtectedRoute component={BoardHistory} fullAppOnly />
      </Route>

      <Route path="/academy">
        <ProtectedRoute component={Academy} />
      </Route>
      <Route path="/academy/announcements">
        <ProtectedRoute component={AcademyAnnouncements} />
      </Route>
      <Route path="/academy/lectures">
        <ProtectedRoute component={AcademyLectures} />
      </Route>
      <Route path="/academy/lectures/:id">
        <ProtectedRoute component={AcademyLectureDetail} />
      </Route>
      <Route path="/admin/academy">
        <ProtectedRoute component={AdminAcademy} staffOnly fullAppOnly />
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
      <Route path="/admin/volunteer-delegations">
        <ProtectedRoute component={AdminVolunteerDelegations} staffOnly />
      </Route>
      <Route path="/admin/tasks/new">
        <ProtectedRoute component={AdminTaskNew} staffOnly />
      </Route>
      <Route path="/admin/tasks">
        <ProtectedRoute component={AdminTasks} staffOnly />
      </Route>
      <Route path="/admin/ads">
        <ProtectedRoute component={AdminAds} allowedRoles={["SUPER_ADMIN"]} />
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
