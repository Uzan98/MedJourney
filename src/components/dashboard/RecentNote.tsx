"use client";

import React from 'react';
import { Card } from '@/components/ui/card';
import { FileText, Edit, Calendar, Bookmark, ExternalLink, Tag } from 'lucide-react';
import { Note } from '../../lib/types/dashboard';
import { formatDate } from '../../lib/utils';

interface RecentNoteProps {
  note: Note | null;
}

const RecentNote = ({ note }: RecentNoteProps) => {
  if (!note) {
    return (
      <Card 
        title="Última Nota" 
        className="h-full bg-gradient-to-br from-teal-50 to-emerald-50 border-0 shadow-md"
        icon={<Bookmark className="h-5 w-5 text-teal-600" />}
        showOptions
      >
        <div className="flex flex-col items-center justify-center py-6 text-center">
          <div className="p-4 bg-white rounded-full shadow-sm mb-3">
            <FileText className="h-10 w-10 text-teal-300" />
          </div>
          <p className="text-gray-600 font-medium">Sem notas recentes</p>
          <p className="text-sm text-gray-500 mt-1">Capture suas ideias com anotações</p>
        </div>
      </Card>
    );
  }

  return (
    <Card 
      title="Última Nota" 
      className="h-full bg-gradient-to-br from-teal-50 to-emerald-50 border-0 shadow-md"
      icon={<Bookmark className="h-5 w-5 text-teal-600" />}
      showOptions
    >
      <div className="space-y-4">
        <div className="flex justify-between items-center bg-white p-3 rounded-lg shadow-sm">
          <h3 className="font-semibold text-gray-800 text-lg">{note.title}</h3>
          <button 
            className="text-teal-600 hover:text-teal-700 p-1.5 hover:bg-teal-50 rounded-full transition-colors"
            aria-label="Editar nota"
          >
            <Edit className="h-4 w-4" />
          </button>
        </div>
        
        <div className="flex flex-wrap gap-2 items-center">
          <div className="flex items-center gap-1 text-xs bg-white px-2.5 py-1 rounded-full shadow-sm text-gray-700">
            <Calendar className="h-3.5 w-3.5 text-teal-500" />
            <span>{formatDate(note.createdAt)}</span>
          </div>
          
          {note.disciplineName && (
            <div className="flex items-center gap-1 text-xs bg-teal-100 text-teal-800 px-2.5 py-1 rounded-full shadow-sm">
              <Tag className="h-3.5 w-3.5" />
              <span>{note.disciplineName}</span>
            </div>
          )}
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow-sm">
          <p className="text-gray-700 text-sm line-clamp-4 leading-relaxed">{note.content}</p>
        </div>
        
        <div className="pt-2 flex justify-end">
          <button 
            className="flex items-center gap-1.5 text-sm bg-teal-100 hover:bg-teal-200 text-teal-700 px-3 py-1.5 rounded-md transition-colors font-medium shadow-sm"
            aria-label="Ver nota completa"
          >
            Ver nota completa
            <ExternalLink className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </Card>
  );
};

export default RecentNote; 