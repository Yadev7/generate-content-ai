import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 active:scale-[0.98]",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/70 active:scale-[0.98]",
        outline:
          "border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground",
        ghost: "hover:bg-secondary hover:text-accent-foreground",
        destructive:
          "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 [&_svg]:size-4",
        sm: "h-8 rounded-md px-3 text-xs [&_svg]:size-3.5",
        // Dense rows, e.g. the notes list and quiz controls.
        xs: "h-6 rounded-md px-2 text-[0.6875rem] [&_svg]:size-3",
        lg: "h-11 rounded-lg px-6 [&_svg]:size-4",
        icon: "h-9 w-9 [&_svg]:size-4",
        "icon-sm": "h-8 w-8 rounded-md [&_svg]:size-4",
        "icon-xs": "h-6 w-6 rounded-md [&_svg]:size-3",
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
  /**
   * Render the single child element instead of a `<button>`, keeping the
   * styling. Lets a Button wrap a `next/link` without nesting one interactive
   * element inside another.
   */
  asChild?: boolean;
}

/** Shared classes for a `next/link` styled as a button. */
export function buttonClassName({
  className,
  variant,
  size,
}: {
  className?: string;
  variant?: ButtonProps["variant"];
  size?: ButtonProps["size"];
} = {}): string {
  return cn(buttonVariants({ variant, size }), className);
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, type = "button", ...props }, ref) => {
    const classes = cn(buttonVariants({ variant, size }), className);

    if (asChild) {
      const child = React.Children.only(props.children as React.ReactElement);
      // Strip the button-only props so they do not leak onto an <a>.
      const { children, onClick, onMouseEnter, onMouseLeave, ...rest } = props;
      void children; // owned by `child`, not forwarded onto it
      return React.cloneElement(child, {
        ...rest,
        className: cn(classes, child.props.className),
        ref,
        onClick,
        onMouseEnter,
        onMouseLeave,
      });
    }

    return (
      <button
        ref={ref}
        type={type}
        className={classes}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
