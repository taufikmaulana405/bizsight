
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
import { useEffect, useState, useRef } from 'react';

export function ThemeSwitcher() {
  const { setTheme, theme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [isTooltipOpen, setIsTooltipOpen] = useState(false);
  const [tooltipLockedClosed, setTooltipLockedClosed] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const lockTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setMounted(true);
    return () => {
      // Clear timeout on unmount
      if (lockTimeoutRef.current) {
        clearTimeout(lockTimeoutRef.current);
      }
    };
  }, []);

  const applyTooltipLock = () => {
    setTooltipLockedClosed(true);
    if (lockTimeoutRef.current) {
      clearTimeout(lockTimeoutRef.current);
    }
    lockTimeoutRef.current = setTimeout(() => {
      setTooltipLockedClosed(false);
    }, 150); // A brief lock duration
  };

  const handleThemeChange = (newTheme: string) => {
    applyTooltipLock();
    setIsTooltipOpen(false);
    triggerRef.current?.blur();
    setTheme(newTheme);
  };

  if (!mounted) {
    return <Button variant="ghost" size="icon" aria-label="Toggle theme" className="h-6 w-6" disabled />;
  }

  return (
    <Tooltip
      open={isTooltipOpen}
      onOpenChange={(newOpenState) => {
        if (tooltipLockedClosed && newOpenState) {
          // If locked and trying to open, do nothing, keep it closed
          return;
        }
        setIsTooltipOpen(newOpenState);
      }}
    >
      <DropdownMenu
        onOpenChange={(dropdownOpenState) => {
          if (dropdownOpenState) {
            // Dropdown is opening, ensure tooltip is closed and prepare lock if needed
            setIsTooltipOpen(false);
          } else {
            // Dropdown is closing
            applyTooltipLock(); // Apply lock as dropdown closes
            setIsTooltipOpen(false);
            if (document.activeElement === triggerRef.current) {
              triggerRef.current?.blur();
            }
          }
        }}
      >
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <Button ref={triggerRef} variant="ghost" size="icon" aria-label="Toggle theme">
              {theme === 'light' ? <Sun className="h-5 w-5" /> : theme === 'dark' ? <Moon className="h-5 w-5" /> : <Laptop className="h-5 w-5" />}
              <span className="sr-only">Toggle theme</span>
            </Button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => handleThemeChange('light')}>
            <Sun className="mr-2 h-4 w-4" />
            <span>Light</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleThemeChange('dark')}>
            <Moon className="mr-2 h-4 w-4" />
            <span>Dark</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleThemeChange('system')}>
            <Laptop className="mr-2 h-4 w-4" />
            <span>System</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      {isTooltipOpen && !tooltipLockedClosed && ( // Also check lock here for rendering
        <TooltipContent>
          <p>Toggle theme</p>
        </TooltipContent>
      )}
    </Tooltip>
  );
}
