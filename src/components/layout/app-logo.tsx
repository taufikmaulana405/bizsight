
"use client"; // Add this directive

import { Briefcase } from 'lucide-react';
import type { SVGProps } from 'react';
import { useSidebar } from '@/components/ui/sidebar'; // Import useSidebar
import { cn } from '@/lib/utils';

interface AppLogoProps extends SVGProps<SVGSVGElement> {
  iconOnly?: boolean;
}

export function AppLogo({ iconOnly = false, className, ...props }: AppLogoProps) {
  const { state: sidebarState } = useSidebar(); // Get sidebar state

  return (
    <div className="flex items-center gap-2">
      <Briefcase className={cn("h-7 w-7 text-primary", className)} {...props} />
      {/* Conditionally render text based on iconOnly prop and sidebar state */}
      {!iconOnly && sidebarState === 'expanded' && (
        <h1 className="text-xl font-bold text-primary">BizSight</h1>
      )}
    </div>
  );
}

// Helper cn function is already in @/lib/utils, so no need to redefine here if imported.
// const cn = (...classes: (string | undefined | null | false)[]) => classes.filter(Boolean).join(' ');
