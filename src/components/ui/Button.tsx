"use client";

import React, { forwardRef } from 'react';

// Stub simples com export do buttonVariants
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg';
  isLoading?: boolean;
}

// Função que simula o comportamento do cva
export const buttonVariants = (options: any) => {
  const { variant = 'default', size = 'default', className = '' } = options || {};
  let classes = 'inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ';
  
  // Adicionar classes com base na variante
  switch (variant) {
    case 'destructive':
      classes += 'bg-red-500 text-white hover:bg-red-600 focus-visible:ring-red-600 ';
      break;
    case 'outline':
      classes += 'bg-transparent border border-gray-300 hover:bg-gray-100 text-gray-700 ';
      break;
    case 'secondary':
      classes += 'bg-gray-100 text-gray-900 hover:bg-gray-200 focus-visible:ring-gray-600 ';
      break;
    case 'ghost':
      classes += 'bg-transparent hover:bg-gray-100 text-gray-700 ';
      break;
    case 'link':
      classes += 'underline-offset-4 hover:underline text-blue-600 bg-transparent ';
      break;
    default:
      classes += 'bg-blue-600 text-white hover:bg-blue-700 focus-visible:ring-blue-600 ';
  }
  
  // Adicionar classes com base no tamanho
  switch (size) {
    case 'sm':
      classes += 'h-9 px-3 rounded-md ';
      break;
    case 'lg':
      classes += 'h-11 px-8 rounded-md ';
      break;
    default:
      classes += 'h-10 py-2 px-4 ';
  }
  
  // Adicionar classes personalizadas
  classes += className;
  
  return classes.trim();
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', isLoading, children, ...props }, ref) => {
  return (
    <button
        className={buttonVariants({ variant, size, className })}
        ref={ref}
        disabled={isLoading || props.disabled}
      {...props}
    >
        {isLoading && <span className="mr-2 h-4 w-4 animate-spin">⏳</span>}
        {children}
    </button>
  );
  }
);

Button.displayName = "Button";

export { Button };
