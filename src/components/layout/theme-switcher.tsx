
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
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <Button variant="ghost" size="icon" aria-label="Toggle theme" className="h-6 w-6" disabled />;
  }

  const handleThemeChange = (newTheme: string) => {
    setIsTooltipOpen(false); // Close tooltip first
    triggerRef.current?.blur(); // Then blur the trigger
    setTheme(newTheme); // Finally, set the theme
  };

  return (
    <Tooltip open={isTooltipOpen} onOpenChange={setIsTooltipOpen}>
      <DropdownMenu
        onOpenChange={(dropdownOpenState) => {
          // If dropdown is opening or closing, ensure tooltip is closed
          if (dropdownOpenState) { // When dropdown opens
            setIsTooltipOpen(false); // Force close tooltip
          } else { // When dropdown closes (e.g. click outside, escape)
            setIsTooltipOpen(false); // Force close tooltip
            // If the dropdown closes for reasons other than an item click,
            // and the trigger button still has focus, blur it.
            // This handles cases like pressing 'Escape' or clicking outside the dropdown.
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
      {/* Conditionally render TooltipContent */}
      {isTooltipOpen && (
        <TooltipContent>
          <p>Toggle theme</p>
        </TooltipContent>
      )}
    </Tooltip>
  );
}
