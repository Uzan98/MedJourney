"use client";

import React from 'react';

interface LoadingProps {
  message?: string;
}

export default function Loading({ message = "Carregando..." }: LoadingProps) {
  return (
    <div className="flex flex-col items-center justify-center h-64">
      <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mb-4"></div>
      <p className="text-gray-600 font-medium">{message}</p>
    </div>
  );
} 