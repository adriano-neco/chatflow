import React, { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { motion } from 'framer-motion';
import { cn, getInitials } from '@/lib/utils';
import { MessageSquare, Users, Settings, PieChart, Bell, Search, LogOut, Menu } from 'lucide-react';
import { Avatar } from '@/components/ui';
import { useAuth } from '@/hooks/use-app-data';

const NAV_ITEMS = [
  { icon: MessageSquare, label: 'Conversas', href: '/conversations' },
  { icon: Users, label: 'Contatos', href: '/contacts' },
  { icon: PieChart, label: 'Relatórios', href: '/reports' },
  { icon: Settings, label: 'Configurações', href: '/settings' },
];

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { user } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  return (
    <div className="flex flex-col h-screen w-full bg-background overflow-hidden">
      {/* Full-width Header */}
      <header className="h-16 flex items-center justify-between px-6 border-b border-border/60 bg-card dark:bg-zinc-800/90 backdrop-blur-md sticky top-0 z-20 w-full shrink-0">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="relative hidden md:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar conversas, contatos..."
              className="h-10 pl-10 pr-4 rounded-full bg-muted/50 border-none focus:ring-2 focus:ring-primary/20 w-64 lg:w-96 text-sm transition-all focus:bg-background"
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button className="relative p-2 rounded-full hover:bg-muted text-muted-foreground transition-colors">
            <Bell className="w-5 h-5" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-destructive rounded-full border-2 border-card"></span>
          </button>

          <div className="w-px h-6 bg-border mx-1"></div>

          {/* User area */}
          <div className="flex items-center gap-2.5">
            <Avatar initials={user ? getInitials(user.name) : 'U'} status="online" className="w-8 h-8 text-xs" />
            <div className="hidden sm:flex flex-col leading-none">
              <span className="text-sm font-semibold text-foreground truncate max-w-[120px]">{user?.name}</span>
              <span className="text-xs text-muted-foreground capitalize">{user?.role}</span>
            </div>
          </div>

          <div className="w-px h-6 bg-border mx-1"></div>

          <button
            onClick={() => {
              localStorage.removeItem('chatflow_token');
              localStorage.removeItem('chatflow_user');
              window.location.href = '/login';
            }}
            className="flex items-center gap-2 p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span className="text-sm font-medium hidden sm:block">Sair</span>
          </button>
        </div>
      </header>

      {/* Sidebar + Content row */}
      <div className="flex flex-1 min-h-0">
        {/* Sidebar */}
        <aside
          className={cn(
            'flex flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-all duration-300 z-10 shrink-0',
            isSidebarOpen ? 'w-64' : 'w-[72px]',
          )}
        >
          <div className="flex h-14 items-center px-4 border-b border-sidebar-border/50 gap-3">
            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-primary shadow-lg shadow-primary/20 shrink-0">
              <MessageSquare className="w-5 h-5 text-primary-foreground" />
            </div>
            {isSidebarOpen && <span className="font-display font-bold text-xl tracking-tight text-white">ChatFlow</span>}
          </div>

          <nav className="flex-1 py-6 px-3 space-y-2 overflow-y-auto">
            {NAV_ITEMS.map((item) => {
              const isActive = location === item.href || (item.href !== '/' && location.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 group relative',
                    isActive
                      ? 'bg-sidebar-accent text-white font-medium'
                      : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-white',
                  )}
                  title={!isSidebarOpen ? item.label : undefined}
                >
                  {isActive && (
                    <motion.div
                      layoutId="sidebar-active"
                      className="absolute left-0 w-1 h-8 bg-primary rounded-r-full"
                    />
                  )}
                  <item.icon className={cn('w-5 h-5 shrink-0 transition-transform group-hover:scale-110', isActive ? 'text-primary' : '')} />
                  {isSidebarOpen && <span className="truncate">{item.label}</span>}
                </Link>
              );
            })}
          </nav>

          <div className="p-4 border-t border-sidebar-border/50">
            <div className="flex items-center gap-3">
              <Avatar initials={user ? getInitials(user.name) : 'U'} status="online" className="ring-sidebar-border border border-sidebar-border" />
              {isSidebarOpen && (
                <div className="flex flex-col overflow-hidden">
                  <span className="text-sm font-medium text-white truncate">{user?.name}</span>
                  <span className="text-xs text-sidebar-foreground/60 truncate">{user?.role}</span>
                </div>
              )}
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 flex flex-col min-w-0 bg-background relative overflow-hidden">
          <div className="flex-1 overflow-hidden relative">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
