"use client";

import * as React from "react";
import { ChevronDownIcon, CheckIcon } from "@heroicons/react/24/outline";

import { cn } from "@/lib/utils";

const Select = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    value?: string;
    onValueChange?: (value: string) => void;
    defaultValue?: string;
    children: React.ReactNode;
  }
>(({ className, value, onValueChange, defaultValue, children, ...props }, ref) => {
  const [open, setOpen] = React.useState(false);
  const [selectedValue, setSelectedValue] = React.useState(value || defaultValue || "");

  React.useEffect(() => {
    if (value !== undefined && value !== selectedValue) {
      setSelectedValue(value);
    }
  }, [value, selectedValue]);

  const handleValueChange = (newValue: string) => {
    setSelectedValue(newValue);
    if (onValueChange) {
      onValueChange(newValue);
    }
    setOpen(false);
  };

  return (
    <div
      ref={ref}
      className={cn("relative", className)}
      {...props}
    >
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
          if (child.type === SelectTrigger) {
            return React.cloneElement(child as React.ReactElement<any>, {
              onClick: () => setOpen(!open),
              value: selectedValue,
            });
          }
          if (child.type === SelectContent) {
            return open
              ? React.cloneElement(child as React.ReactElement<any>, {
                  onValueChange: handleValueChange,
                  value: selectedValue,
                })
              : null;
          }
        }
        return child;
      })}
    </div>
  );
});
Select.displayName = "Select";

const SelectTrigger = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    value?: string;
    onClick?: () => void;
    children?: React.ReactNode;
  }
>(({ className, value, onClick, children, ...props }, ref) => {
  return (
    <div
      ref={ref}
      onClick={onClick}
      className={cn(
        "flex items-center justify-between rounded-md border border-vista-secondary/50 bg-vista-dark px-3 py-2 text-sm text-vista-light shadow-sm hover:bg-vista-secondary/20 cursor-pointer",
        className
      )}
      {...props}
    >
      {children}
      <ChevronDownIcon className="h-4 w-4 text-vista-light/70" />
    </div>
  );
});
SelectTrigger.displayName = "SelectTrigger";

const SelectValue = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    placeholder?: string;
    children?: React.ReactNode;
  }
>(({ className, placeholder, children, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn("flex-grow truncate", className)}
      {...props}
    >
      {children || placeholder}
    </div>
  );
});
SelectValue.displayName = "SelectValue";

const SelectContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    value?: string;
    onValueChange?: (value: string) => void;
    children?: React.ReactNode;
  }
>(({ className, value, onValueChange, children, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn(
        "absolute z-50 mt-1 w-full overflow-hidden rounded-md border border-vista-secondary/50 bg-vista-dark shadow-md",
        className
      )}
      {...props}
    >
      <div className="max-h-60 overflow-auto py-1">
        {React.Children.map(children, (child) => {
          if (React.isValidElement(child) && child.type === SelectItem) {
            return React.cloneElement(child as React.ReactElement<any>, {
              onSelect: onValueChange,
              selected: value === (child.props as any).value,
            });
          }
          return child;
        })}
      </div>
    </div>
  );
});
SelectContent.displayName = "SelectContent";

const SelectItem = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    value: string;
    onSelect?: (value: string) => void;
    selected?: boolean;
    children?: React.ReactNode;
  }
>(({ className, value, onSelect, selected, children, ...props }, ref) => {
  return (
    <div
      ref={ref}
      onClick={() => onSelect && onSelect(value)}
      className={cn(
        "flex cursor-pointer select-none items-center px-3 py-2 text-sm text-vista-light",
        selected ? "bg-vista-secondary/40" : "hover:bg-vista-secondary/20",
        className
      )}
      {...props}
    >
      <div className="flex-grow">{children}</div>
      {selected && <CheckIcon className="h-4 w-4 text-vista-primary" />}
    </div>
  );
});
SelectItem.displayName = "SelectItem";

export {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
}; 