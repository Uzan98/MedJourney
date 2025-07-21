"use client";

import React from 'react';
import { Skeleton, CircleSkeleton, TextSkeleton } from '@/components/ui/skeleton';

// Esqueleto para os cards do resumo do plano
export const PlanMetricsSkeleton: React.FC = () => (
  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
    {[...Array(3)].map((_, i) => (
      <div 
        key={i} 
        className="bg-gradient-to-br from-gray-50 to-gray-100 p-6 rounded-xl border border-gray-200 shadow-sm"
      >
        <div className="flex justify-between items-start mb-4">
          <CircleSkeleton size={40} className="bg-gray-300" />
          <Skeleton className="w-24 h-6 rounded-full" />
        </div>
        <TextSkeleton lines={1} className="w-1/2 mb-2" />
        <Skeleton className="w-3/4 h-8" />
      </div>
    ))}
  </div>
);

// Esqueleto para o cronograma semanal
export const ScheduleSkeleton: React.FC = () => (
  <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden mb-8">
    <div className="border-b border-gray-100 bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-4 flex justify-between items-center">
      <div className="flex items-center gap-2">
        <CircleSkeleton size={28} className="bg-gray-300" />
        <Skeleton className="w-40 h-5" />
      </div>
      <div className="flex items-center gap-2">
        <Skeleton className="w-20 h-4" />
        <Skeleton className="w-24 h-4" />
      </div>
    </div>
    
    <div className="p-6">
      <div className="grid grid-cols-7 gap-3 mb-4">
        {[...Array(7)].map((_, i) => (
          <div key={i} className="text-center">
            <Skeleton className="w-16 h-5 mx-auto" />
          </div>
        ))}
      </div>
      
      <div className="grid grid-cols-7 gap-3">
        {[...Array(7)].map((_, i) => (
          <div key={i} className="min-h-[150px] bg-gray-50 rounded-lg p-2">
            {i % 2 === 0 && (
              <>
                <Skeleton className="mb-2 p-2 h-14 rounded-md w-full" />
                <Skeleton className="mb-2 p-2 h-14 rounded-md w-full" />
              </>
            )}
            {i % 3 === 0 && (
              <Skeleton className="mb-2 p-2 h-14 rounded-md w-full" />
            )}
          </div>
        ))}
      </div>
    </div>
  </div>
);

// Esqueleto para disciplinas e progresso
export const DisciplinesSkeleton: React.FC = () => (
  <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden h-full">
    <div className="border-b border-gray-100 bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-4 flex justify-between items-center">
      <div className="flex items-center gap-2">
        <CircleSkeleton size={28} className="bg-gray-300" />
        <Skeleton className="w-48 h-5" />
      </div>
      <Skeleton className="w-36 h-8 rounded-md" />
    </div>
    
    <div className="p-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {[...Array(4)].map((_, i) => (
          <div 
            key={i} 
            className="p-4 rounded-lg border border-gray-100 bg-white"
          >
            <div className="flex items-start justify-between">
              <div className="w-3/4">
                <Skeleton className="h-5 w-3/4 mb-2" />
                <Skeleton className="h-4 w-1/2" />
              </div>
              <Skeleton className="h-6 w-16 rounded-full" />
            </div>
            
            <div className="mt-4">
              <div className="flex justify-between mb-1">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-8" />
              </div>
              <Skeleton className="h-2 w-full rounded-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

// Esqueleto para próximos marcos
export const MilestonesSkeleton: React.FC = () => (
  <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden h-full">
    <div className="border-b border-gray-100 bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-4 flex justify-between items-center">
      <div className="flex items-center gap-2">
        <CircleSkeleton size={28} className="bg-gray-300" />
        <Skeleton className="w-36 h-5" />
      </div>
      <Skeleton className="w-20 h-6" />
    </div>
    
    <div className="p-6 divide-y divide-gray-100">
      {[...Array(3)].map((_, i) => (
        <div key={i} className={i === 0 ? "pb-4" : "py-4"}>
          <div className="flex justify-between">
            <div className="flex items-center gap-2">
              <CircleSkeleton size={24} />
              <Skeleton className="h-5 w-40" />
            </div>
            <Skeleton className="h-4 w-16" />
          </div>
          <Skeleton className="h-3 w-24 mt-1 ml-8" />
          <Skeleton className="h-1 w-full rounded-full mt-3" />
        </div>
      ))}
    </div>
  </div>
); 
