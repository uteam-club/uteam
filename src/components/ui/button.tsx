import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 disabled:opacity-50 disabled:pointer-events-none shadow-md hover:shadow-lg transition-shadow",
  {
    variants: {
      variant: {
        default: "bg-vista-primary text-vista-dark hover:bg-vista-primary/90",
        destructive: "bg-vista-error text-white hover:bg-vista-error/90",
        outline: "border border-vista-secondary bg-transparent hover:bg-vista-secondary/20 text-vista-light",
        secondary: "bg-vista-secondary text-vista-light hover:bg-vista-secondary/80",
        ghost: "hover:bg-vista-secondary/20 text-vista-light shadow-none hover:shadow-none",
        link: "underline-offset-4 hover:underline text-vista-light shadow-none hover:shadow-none",
      },
      size: {
        default: "h-10 py-2 px-4",
        sm: "h-9 px-3 rounded-md",
        lg: "h-11 px-8 rounded-md",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants }; 