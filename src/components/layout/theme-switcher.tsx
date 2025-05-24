
"use client";

import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Moon, Sun, Laptop } from 'lucide-react';
import { useEffect, useState, useRef } from 'react'; // Added useRef

export function ThemeSwitcher() {
  const { setTheme, theme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [isTooltipOpen, setIsTooltipOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null); // Ref for the trigger button

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <Button variant="ghost" size="icon" aria-label="Toggle theme" className="h-6 w-6" disabled />;
  }

  return (
    <Tooltip open={isTooltipOpen} onOpenChange={setIsTooltipOpen}>
      <DropdownMenu onOpenChange={(dropdownOpenState) => {
        // If dropdown is closing for any reason (selection, click outside), ensure tooltip also closes
        if (!dropdownOpenState) {
          setIsTooltipOpen(false);
        }
      }}>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <Button ref={triggerRef} variant="ghost" size="icon" aria-label="Toggle theme">
              {theme === 'light' ? <Sun className="h-5 w-5" /> : theme === 'dark' ? <Moon className="h-5 w-5" /> : <Laptop className="h-5 w-5" />}
              <span className="sr-only">Toggle theme</span>
            </Button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => { setTheme('light'); setIsTooltipOpen(false); triggerRef.current?.blur(); }}>
            <Sun className="mr-2 h-4 w-4" />
            <span>Light</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => { setTheme('dark'); setIsTooltipOpen(false); triggerRef.current?.blur(); }}>
            <Moon className="mr-2 h-4 w-4" />
            <span>Dark</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => { setTheme('system'); setIsTooltipOpen(false); triggerRef.current?.blur(); }}>
            <Laptop className="mr-2 h-4 w-4" />
            <span>System</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <TooltipContent>
        <p>Toggle theme</p>
      </TooltipContent>
    </Tooltip>
  );
}

