
import type { ReactNode } from 'react';
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarInset,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { AppLogo } from './app-logo';
import { MainNav } from './main-nav';
import { ThemeSwitcher } from './theme-switcher';
import { Button } from '@/components/ui/button';
import { UserCircle } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  return (
    <SidebarProvider defaultOpen>
      <Sidebar variant="sidebar" collapsible="icon" className="border-r">
        <SidebarHeader className="p-4 justify-between items-center">
          <AppLogo />
        </SidebarHeader>
        <SidebarContent>
          <MainNav />
        </SidebarContent>
      </Sidebar>
      <SidebarInset className="flex flex-col">
        <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b bg-background/80 px-4 backdrop-blur-md sm:px-6">
          <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <SidebarTrigger />
              </TooltipTrigger>
              <TooltipContent>
                <p>Toggle sidebar</p>
              </TooltipContent>
            </Tooltip>
             {/* Placeholder for breadcrumbs or page title */}
          </div>
          <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                {/* ThemeSwitcher already has a button as its root, so TooltipTrigger can wrap it directly if ThemeSwitcher itself is passed asChild or is a simple button.
                    If ThemeSwitcher's root is a DropdownMenuTrigger which is a Button, this should work.
                    Let's assume ThemeSwitcher's trigger can be wrapped or it itself is a button.
                    For simplicity, we wrap the ThemeSwitcher component directly.
                    If ThemeSwitcher's root element isn't a single focusable element, this might need adjustment in ThemeSwitcher itself.
                */}
                <div> {/* Extra div for TooltipTrigger if ThemeSwitcher root is complex, otherwise can be removed */}
                  <ThemeSwitcher />
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>Toggle theme</p>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="User profile">
                  <UserCircle className="h-6 w-6" />
                  <span className="sr-only">User profile</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>User profile</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
