"use client";

import React from 'react';
import { Card } from '../ui/Card';
import { FileText, Edit, Calendar, Bookmark } from 'lucide-react';
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
        className="h-full"
        icon={<Bookmark className="h-5 w-5" />}
        showOptions
      >
        <div className="flex flex-col items-center justify-center py-6 text-center">
          <FileText className="h-12 w-12 text-blue-200 mb-2" />
          <p className="text-gray-500">Nenhuma nota encontrada</p>
        </div>
      </Card>
    );
  }

  return (
    <Card 
      title="Última Nota" 
      className="h-full"
      icon={<Bookmark className="h-5 w-5" />}
      showOptions
    >
      <div className="space-y-3">
        <div className="flex justify-between">
          <h3 className="font-medium text-gray-800 text-lg">{note.title}</h3>
          <button 
            className="text-gray-400 hover:text-gray-600 p-1 hover:bg-gray-100 rounded-full transition-colors"
            aria-label="Editar nota"
            tabIndex={0}
          >
            <Edit className="h-4 w-4" />
          </button>
        </div>
        
        <div className="text-sm text-gray-500 flex items-center">
          <Calendar className="h-4 w-4 mr-1 text-gray-400" />
          <span>{formatDate(note.createdAt)}</span>
          {note.disciplineName && (
            <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
              {note.disciplineName}
            </span>
          )}
        </div>
        
        <div className="mt-2 bg-gray-50 p-3 rounded-lg">
          <p className="text-gray-700 text-sm line-clamp-3">{note.content}</p>
        </div>
        
        <div className="pt-2 flex justify-end">
          <button 
            className="text-sm text-blue-600 hover:text-blue-800 transition-colors font-medium"
            aria-label="Ver nota completa"
            tabIndex={0}
          >
            Ver nota completa
          </button>
        </div>
      </div>
    </Card>
  );
};

export default RecentNote; 