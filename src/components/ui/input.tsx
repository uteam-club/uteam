import * as React from "react";

import { cn } from "@/lib/utils";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-md border border-vista-secondary/30 bg-vista-dark px-3 py-2 text-sm text-vista-light placeholder:text-vista-light/50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-vista-primary disabled:cursor-not-allowed disabled:opacity-50 shadow-md hover:shadow-lg transition-shadow",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input }; 