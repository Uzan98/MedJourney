"use client";

import React, { ReactNode } from "react";

// Este é um arquivo stub criado automaticamente para o deploy no Vercel
export interface CardProps {
  children?: ReactNode;
  [key: string]: any;
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ children, ...props }, ref) => {
    return (
      <div ref={ref} {...props}>
        {children}
      </div>
    );
  }
);

Card.displayName = "Card";

// Exportar componentes relacionados como stubs
export const CardContent = (props: any) => <div {...props} />;
export const CardTrigger = (props: any) => <div {...props} />;
export const CardItem = (props: any) => <div {...props} />;
export const CardHeader = (props: any) => <div {...props} />;
export const CardFooter = (props: any) => <div {...props} />;
export const CardTitle = (props: any) => <div {...props} />;
export const CardDescription = (props: any) => <div {...props} />;
export const CardSection = (props: any) => <div {...props} />;
export const CardSeparator = (props: any) => <div {...props} />;
export const CardValue = (props: any) => <div {...props} />;

export default Card;
