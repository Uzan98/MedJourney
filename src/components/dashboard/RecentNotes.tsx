"use client";

import React from 'react';
import { Card } from '@/components/ui/card';
import { FileText, Calendar, ChevronRight, StickyNote } from 'lucide-react';
import { StudyNote } from '../../lib/types/dashboard';
import Link from 'next/link';

interface RecentNotesProps {
  notes?: StudyNote[];
}

const RecentNotes: React.FC<RecentNotesProps> = ({ 
  notes = [
    {
      id: '1',
      title: 'Vias metabólicas',
      content: 'Ciclo de Krebs: Na matriz mitocondrial, o piruvato é transformado em acetil-CoA. Este é o ponto de entrada no ciclo de Krebs. A reação libera CO2 e produz NADH. A acetil-CoA combina-se com oxaloacetato formando citrato...',
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      disciplineName: 'Bioquímica'
    },
    {
      id: '2',
      title: 'Sistema Nervoso Central',
      content: 'O sistema nervoso central (SNC) consiste no cérebro e na medula espinhal. O cérebro é dividido em várias regiões, incluindo o córtex cerebral, o tronco cerebral e o cerebelo...',
      createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      disciplineName: 'Anatomia'
    }
  ] 
}) => {
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  return (
    <Card className="overflow-hidden bg-white border">
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-800">Notas Recentes</h3>
          <Link 
            href="/notas"
            className="text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
          >
            Ver todas <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
        
        {notes.length === 0 ? (
          <div className="py-8 text-center">
            <div className="flex justify-center mb-3">
              <StickyNote className="h-10 w-10 text-gray-300" />
            </div>
            <p className="text-gray-600 font-medium">Nenhuma nota recente</p>
            <p className="text-sm text-gray-500 mt-1">
              Crie suas primeiras notas durante as sessões de estudo
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {notes.map((note) => (
              <div key={note.id} className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 hover:bg-blue-50 transition-colors cursor-pointer">
                <div className="flex justify-between items-start">
                  <div className="flex items-start gap-3">
                    <div className="bg-blue-100 p-2 rounded-md text-blue-700">
                      <FileText className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-800 mb-1">{note.title}</h4>
                      <div className="flex items-center gap-2 mb-2">
                        {note.disciplineName && (
                          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                            {note.disciplineName}
                          </span>
                        )}
                        <span className="text-xs text-gray-500 flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatDate(note.createdAt)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 line-clamp-2">
                        {note.content}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
};

export default RecentNotes; 
