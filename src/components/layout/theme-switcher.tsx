
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
      if (lockTimeoutRef.current) {
        clearTimeout(lockTimeoutRef.current);
      }
    };
  }, []);

  const applyTooltipLockAndBlur = () => {
    // 1. Immediately try to close the tooltip's state
    setIsTooltipOpen(false);
    // 2. Attempt to remove focus from the trigger
    triggerRef.current?.blur();
    // 3. Activate the lock to prevent reopening for a short duration
    setTooltipLockedClosed(true);

    if (lockTimeoutRef.current) {
      clearTimeout(lockTimeoutRef.current);
    }
    lockTimeoutRef.current = setTimeout(() => {
      setTooltipLockedClosed(false);
    }, 200); // Increased duration slightly
  };

  const handleThemeChange = (newTheme: string) => {
    applyTooltipLockAndBlur();
    setTheme(newTheme);
  };

  if (!mounted) {
    // Render a disabled button or a placeholder during server rendering / before mount
    // This ensures TooltipTrigger asChild has a valid child.
    return <Button variant="ghost" size="icon" aria-label="Toggle theme" className="h-6 w-6" disabled />;
  }

  return (
    <Tooltip
      open={isTooltipOpen}
      onOpenChange={(newOpenState) => {
        if (tooltipLockedClosed && newOpenState) {
          // If lock is active and tooltip tries to open, force our state to remain closed.
          setIsTooltipOpen(false);
          return;
        }
        setIsTooltipOpen(newOpenState);
      }}
    >
      <DropdownMenu
        onOpenChange={(dropdownOpenState) => {
          if (dropdownOpenState) {
            // Dropdown is opening, ensure tooltip is explicitly closed.
            setIsTooltipOpen(false);
          } else {
            // Dropdown is closing, apply lock and blur.
            applyTooltipLockAndBlur();
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
      {/* Conditionally render TooltipContent based on isTooltipOpen AND NOT tooltipLockedClosed */}
      {isTooltipOpen && !tooltipLockedClosed && (
        <TooltipContent>
          <p>Toggle theme</p>
        </TooltipContent>
      )}
    </Tooltip>
  );
}
