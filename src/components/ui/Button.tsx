"use client";

import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';

export type ButtonVariant = 
  | 'primary'
  | 'secondary'
  | 'success'
  | 'danger'
  | 'warning'
  | 'info'
  | 'light'
  | 'dark'
  | 'outline'
  | 'ghost';

export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  loadingText?: string;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
  ripple?: boolean;
  feedbackDuration?: number;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  className,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  loadingText,
  icon,
  iconPosition = 'left',
  fullWidth = false,
  ripple = true,
  disabled,
  feedbackDuration = 200,
  onClick,
  ...props
}) => {
  const [isFeedback, setIsFeedback] = useState(false);
  const [rippleStyle, setRippleStyle] = useState<React.CSSProperties>({});

  // Variantes do botão
  const variantStyles = {
    primary: 'bg-blue-600 hover:bg-blue-700 text-white',
    secondary: 'bg-purple-600 hover:bg-purple-700 text-white',
    success: 'bg-green-600 hover:bg-green-700 text-white',
    danger: 'bg-red-600 hover:bg-red-700 text-white',
    warning: 'bg-yellow-500 hover:bg-yellow-600 text-white',
    info: 'bg-cyan-500 hover:bg-cyan-600 text-white',
    light: 'bg-gray-100 hover:bg-gray-200 text-gray-800',
    dark: 'bg-gray-800 hover:bg-gray-900 text-white',
    outline: 'bg-transparent border border-gray-300 hover:bg-gray-50 text-gray-700',
    ghost: 'bg-transparent hover:bg-gray-100 text-gray-700'
  };

  // Tamanhos do botão
  const sizeStyles = {
    xs: 'py-1 px-2 text-xs',
    sm: 'py-1.5 px-3 text-sm',
    md: 'py-2 px-4 text-sm',
    lg: 'py-2.5 px-5 text-base',
    xl: 'py-3 px-6 text-lg'
  };

  // Manipular o clique com feedback visual
  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (disabled || isLoading) return;

    // Feedback de clique
    setIsFeedback(true);
    setTimeout(() => setIsFeedback(false), feedbackDuration);

    // Efeito ripple se habilitado
    if (ripple) {
      const button = e.currentTarget;
      const rect = button.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height);
      const x = e.clientX - rect.left - size / 2;
      const y = e.clientY - rect.top - size / 2;

      setRippleStyle({
        width: `${size}px`,
        height: `${size}px`,
        top: `${y}px`,
        left: `${x}px`
      });

      // Reset ripple
      setTimeout(() => {
        setRippleStyle({});
      }, 600);
    }

    // Executar o onClick original
    onClick?.(e);
  };

  return (
    <button
      className={cn(
        // Base styles
        'relative inline-flex items-center justify-center rounded-lg font-medium transition-colors',
        // Variant
        variantStyles[variant],
        // Size
        sizeStyles[size],
        // State styles
        (disabled || isLoading) && 'opacity-70 cursor-not-allowed',
        isFeedback && 'scale-[0.98] transition-transform',
        fullWidth && 'w-full',
        // Custom classes
        className
      )}
      disabled={disabled || isLoading}
      onClick={handleClick}
      {...props}
    >
      {/* Ripple effect */}
      {ripple && Object.keys(rippleStyle).length > 0 && (
        <span
          className="absolute rounded-full bg-white/30 animate-ripple pointer-events-none"
          style={rippleStyle}
        />
      )}

      {/* Loading indicator */}
      {isLoading && (
        <Loader2 className={cn('animate-spin', loadingText ? 'mr-2' : '')} size={
          size === 'xs' ? 14 : size === 'sm' ? 16 : size === 'md' ? 18 : size === 'lg' ? 20 : 24
        } />
      )}

      {/* Icon on left */}
      {!isLoading && icon && iconPosition === 'left' && (
        <span className="mr-2">{icon}</span>
      )}

      {/* Button text */}
      {isLoading && loadingText ? loadingText : children}

      {/* Icon on right */}
      {!isLoading && icon && iconPosition === 'right' && (
        <span className="ml-2">{icon}</span>
      )}
    </button>
  );
}; 