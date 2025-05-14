import { Briefcase } from 'lucide-react';
import type { SVGProps } from 'react';

interface AppLogoProps extends SVGProps<SVGSVGElement> {
  iconOnly?: boolean;
}

export function AppLogo({ iconOnly = false, className, ...props }: AppLogoProps) {
  return (
    <div className="flex items-center gap-2">
      <Briefcase className={cn("h-7 w-7 text-primary", className)} {...props} />
      {!iconOnly && (
        <h1 className="text-xl font-bold text-primary">BizSight</h1>
      )}
    </div>
  );
}

// Helper cn function if not globally available, or import from "@/lib/utils"
const cn = (...classes: (string | undefined | null | false)[]) => classes.filter(Boolean).join(' ');
