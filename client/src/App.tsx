import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch, Redirect } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import DashboardLayout from "./components/DashboardLayout";
import { PostHogProvider } from "./components/PostHogProvider";
import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import Agents from "./pages/Agents";
import AgentDetail from "./pages/AgentDetail";
import Chat from "./pages/Chat";
import AuditLogs from "./pages/AuditLogs";
import ScheduledTasks from "./pages/ScheduledTasks";
import Skills from "./pages/Skills";
import Marketplace from "./pages/Marketplace";
import Integrations from "./pages/Integrations";
import Configuration from "./pages/Configuration";
import CustomLogin from "./pages/CustomLogin";

function DashboardPage({ component: Component }: { component: React.ComponentType }) {
  return (
    <DashboardLayout>
      <Component />
    </DashboardLayout>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/login" component={CustomLogin} />
      <Route path="/dashboard">{() => <DashboardPage component={Dashboard} />}</Route>
      <Route path="/agents">{() => <DashboardPage component={Agents} />}</Route>
      <Route path="/agents/:id">{(params) => <DashboardLayout><AgentDetail id={Number(params.id)} /></DashboardLayout>}</Route>
      <Route path="/chat">{() => <DashboardPage component={Chat} />}</Route>
      <Route path="/chat/:agentId">{(params) => <DashboardLayout><Chat agentId={Number(params.agentId)} /></DashboardLayout>}</Route>
      <Route path="/audit">{() => <DashboardPage component={AuditLogs} />}</Route>
      <Route path="/tasks">{() => <DashboardPage component={ScheduledTasks} />}</Route>
      {/* <Route path="/skills">{() => <DashboardPage component={Skills} />}</Route> */}
      {/* <Route path="/marketplace">{() => <DashboardPage component={Marketplace} />}</Route> */}
      <Route path="/integrations">{() => <DashboardPage component={Integrations} />}</Route>
      <Route path="/config">{() => <DashboardPage component={Configuration} />}</Route>
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <PostHogProvider />
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
