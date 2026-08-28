import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { ButtonHTMLAttributes, forwardRef } from "react";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-full text-sm font-medium transition disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest-400",
  {
    variants: {
      variant: {
        primary: "bg-forest-600 text-white hover:bg-forest-700 shadow-lift",
        secondary: "bg-forest-100 text-forest-700 hover:bg-forest-200 dark:bg-forest-800 dark:text-forest-100",
        ghost: "hover:bg-forest-50 dark:hover:bg-forest-800/60",
        outline: "border border-forest-200 hover:bg-forest-50 dark:border-forest-700",
        clay: "bg-clay text-white hover:opacity-90",
      },
      size: {
        sm: "h-9 px-3",
        md: "h-11 px-5",
        lg: "h-12 px-6 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export const Button = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof buttonVariants>
>(({ className, variant, size, ...props }, ref) => (
  <button ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...props} />
));
Button.displayName = "Button";
