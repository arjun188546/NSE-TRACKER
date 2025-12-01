import { Switch, Route, Redirect, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/lib/auth-context";
import { AppLayout } from "@/components/app-layout";
import LandingPage from "@/pages/landing";
import LoginPage from "@/pages/login";
import Dashboard from "@/pages/dashboard";
import CalendarPage from "@/pages/calendar";
import NSEStocksPage from "@/pages/nse-stocks";
import StockDetailPage from "@/pages/stock-detail";
import AdminPage from "@/pages/admin";
import NotFound from "@/pages/not-found";

function Router() {
  const [location] = useLocation();

  // Pages that should NOT have the layout (sidebar + header)
  const noLayoutPages = ["/", "/login"];
  const shouldUseLayout = !noLayoutPages.includes(location);

  const routes = (
    <Switch>
      <Route path="/" component={LandingPage} />
      <Route path="/login" component={LoginPage} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/calendar" component={CalendarPage} />
      <Route path="/nse-stocks" component={NSEStocksPage} />
      <Route path="/stock/:symbol" component={StockDetailPage} />
      <Route path="/admin" component={AdminPage} />
      <Route component={NotFound} />
    </Switch>
  );

  return shouldUseLayout ? <AppLayout>{routes}</AppLayout> : routes;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
