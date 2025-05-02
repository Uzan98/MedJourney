"use client";

import React, { forwardRef } from 'react';
import { VariantProps, cva } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none",
  {
    variants: {
      variant: {
        default: "bg-blue-600 text-white hover:bg-blue-700 focus-visible:ring-blue-600",
        destructive: "bg-red-500 text-white hover:bg-red-600 focus-visible:ring-red-600",
        outline: "bg-transparent border border-gray-300 hover:bg-gray-100 text-gray-700",
        secondary: "bg-gray-100 text-gray-900 hover:bg-gray-200 focus-visible:ring-gray-600",
        ghost: "bg-transparent hover:bg-gray-100 text-gray-700",
        link: "underline-offset-4 hover:underline text-blue-600 bg-transparent",
      },
      size: {
        default: "h-10 py-2 px-4",
        sm: "h-9 px-3 rounded-md",
        lg: "h-11 px-8 rounded-md",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export type ButtonSize = "default" | "sm" | "lg";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  isLoading?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, isLoading, children, ...props }, ref) => {
  return (
    <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={isLoading || props.disabled}
      {...props}
    >
        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {children}
    </button>
  );
  }
);

Button.displayName = "Button";

export { Button, buttonVariants }; 