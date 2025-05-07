"use client";

import React from 'react';

interface PillProps {
  text: string;
  color?: string;
  className?: string;
}

export default function Pill({ text, color = "bg-blue-100 text-blue-800", className = "" }: PillProps) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${color} ${className}`}>
      {text}
    </span>
  );
} 