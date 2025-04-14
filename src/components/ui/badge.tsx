import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-vista-primary focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-vista-primary text-vista-dark hover:bg-vista-primary/80",
        secondary:
          "border-transparent bg-vista-secondary text-vista-light hover:bg-vista-secondary/80",
        destructive:
          "border-transparent bg-vista-error text-white hover:bg-vista-error/80",
        outline: "text-vista-light border-vista-secondary/30",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants } 