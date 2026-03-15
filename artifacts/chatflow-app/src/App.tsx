import React from "react";
import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";

import { Login, Register } from "@/pages/auth/Login";
import { Conversations } from "@/pages/Conversations";
import { Contacts } from "@/pages/Contacts";
import { Settings } from "@/pages/Settings";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    }
  }
});

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const [, navigate] = useLocation();
  const token = localStorage.getItem('chatflow_token');

  React.useLayoutEffect(() => {
    if (!token) navigate('/login');
  }, []); // run once on mount — token is read synchronously from localStorage

  if (!token) return null;
  return <Component />;
}

/* Stable component references — defined OUTSIDE render to avoid Wouter remount loops */
const ConversationsPage = () => <ProtectedRoute component={Conversations} />;
const ContactsPage      = () => <ProtectedRoute component={Contacts} />;
const SettingsPage      = () => <ProtectedRoute component={Settings} />;
const RootRedirect      = () => {
  const [, navigate] = useLocation();
  React.useLayoutEffect(() => { navigate('/conversations'); }, []);
  return null;
};

function Router() {
  return (
    <Switch>
      <Route path="/login"             component={Login} />
      <Route path="/register"          component={Register} />
      <Route path="/"                  component={RootRedirect} />
      <Route path="/conversations"     component={ConversationsPage} />
      <Route path="/conversations/:id" component={ConversationsPage} />
      <Route path="/contacts"          component={ContactsPage} />
      <Route path="/settings"          component={SettingsPage} />
      <Route                           component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
