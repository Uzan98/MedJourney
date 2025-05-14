"use client";

import React, { ReactNode } from "react";

// Este é um arquivo stub criado automaticamente para o deploy no Vercel
export interface DialogProps {
  children?: ReactNode;
  [key: string]: any;
}

export const Dialog = React.forwardRef<HTMLDivElement, DialogProps>(
  ({ children, ...props }, ref) => {
    return (
      <div ref={ref} {...props}>
        {children}
      </div>
    );
  }
);

Dialog.displayName = "Dialog";

// Exportar componentes relacionados como stubs
export const DialogContent = (props: any) => <div {...props} />;
export const DialogTrigger = (props: any) => <div {...props} />;
export const DialogItem = (props: any) => <div {...props} />;
export const DialogHeader = (props: any) => <div {...props} />;
export const DialogFooter = (props: any) => <div {...props} />;
export const DialogTitle = (props: any) => <div {...props} />;
export const DialogDescription = (props: any) => <div {...props} />;
export const DialogSection = (props: any) => <div {...props} />;
export const DialogSeparator = (props: any) => <div {...props} />;
export const DialogValue = (props: any) => <div {...props} />;

export default Dialog;
