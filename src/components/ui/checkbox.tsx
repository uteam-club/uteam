"use client";

import * as React from "react";
import { CheckIcon } from "@heroicons/react/24/outline";

import { cn } from "@/lib/utils";

const Checkbox = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    checked?: boolean;
    onCheckedChange?: (checked: boolean) => void;
    disabled?: boolean;
  }
>(({ className, checked, onCheckedChange, disabled, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn(
        "flex h-5 w-5 items-center justify-center rounded-md border border-vista-secondary/60 text-vista-light",
        checked && "bg-vista-primary border-vista-primary",
        disabled && "opacity-50 cursor-not-allowed",
        !disabled && "cursor-pointer hover:border-vista-primary",
        className
      )}
      onClick={() => {
        if (!disabled && onCheckedChange) {
          onCheckedChange(!checked);
        }
      }}
      {...props}
    >
      {checked && <CheckIcon className="h-3 w-3 text-vista-dark" />}
    </div>
  );
});

Checkbox.displayName = "Checkbox";

export { Checkbox }; 