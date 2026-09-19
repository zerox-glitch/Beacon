import * as React from "react";
import { cn } from "@/lib/utils";

export const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => (
    <input
      type={type}
      ref={ref}
      className={cn(
        "flex h-11 w-full min-w-0 rounded-md border border-border bg-elevated px-3 text-sm text-fg shadow-none outline-none transition-colors placeholder:text-subtle focus-visible:border-border-strong focus-visible:ring-2 focus-visible:ring-accent/30 disabled:opacity-50",
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = "Input";
