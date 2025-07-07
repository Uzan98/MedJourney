import React, { useState, useRef } from 'react';
import { Upload, AlertCircle, FileSpreadsheet, Check, X } from 'lucide-react';
import * as XLSX from 'xlsx';
import { Button } from '@/components/ui/button';
import { FlashcardsService } from '@/services/flashcards.service';
import { toast } from '@/components/ui/toast-interface';
import { useAuth } from '@/contexts/AuthContext';

interface ImportFromExcelProps {
  deckId: string;
  onSuccess?: () => void;
}

interface FlashcardImport {
  front: string;
  back: string;
  tags?: string;
}

export default function ImportFromExcel({ deckId, onSuccess }: ImportFromExcelProps) {
  const { user } = useAuth();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [importedCards, setImportedCards] = useState<FlashcardImport[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setIsUploading(true);
    setUploadProgress(10);

    try {
      // Ler o arquivo Excel
      const data = await readExcelFile(file);
      setUploadProgress(50);

      // Validar os dados
      const validatedData = validateExcelData(data);
      setImportedCards(validatedData);
      setUploadProgress(100);
      setShowPreview(true);
    } catch (err) {
      console.error('Erro ao processar arquivo Excel:', err);
      setError(err instanceof Error ? err.message : 'Erro ao processar o arquivo');
    } finally {
      setIsUploading(false);
      // Limpar o input para permitir selecionar o mesmo arquivo novamente
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const readExcelFile = (file: File): Promise<any[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const data = e.target?.result;
          if (!data) {
            reject(new Error('Falha ao ler o arquivo'));
            return;
          }

          const workbook = XLSX.read(data, { type: 'binary' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet);
          
          resolve(jsonData);
        } catch (error) {
          reject(new Error('Formato de arquivo inválido'));
        }
      };

      reader.onerror = () => {
        reject(new Error('Erro ao ler o arquivo'));
      };

      reader.readAsBinaryString(file);
    });
  };

  const validateExcelData = (data: any[]): FlashcardImport[] => {
    if (!data || data.length === 0) {
      throw new Error('O arquivo não contém dados');
    }

    // Verificar se as colunas necessárias existem
    const firstRow = data[0];
    if (!firstRow.frente && !firstRow.front) {
      throw new Error('Coluna "frente" ou "front" não encontrada');
    }

    if (!firstRow.verso && !firstRow.back) {
      throw new Error('Coluna "verso" ou "back" não encontrada');
    }

    // Mapear os dados para o formato esperado
    return data.map(row => ({
      front: row.frente || row.front || '',
      back: row.verso || row.back || '',
      tags: row.tags || row.etiquetas || ''
    })).filter(card => card.front.trim() && card.back.trim());
  };

  const handleImport = async () => {
    if (!user) {
      setError('Você precisa estar logado para importar cards');
      return;
    }

    if (!deckId) {
      setError('ID do deck inválido');
      return;
    }

    if (!importedCards.length) {
      setError('Não há cards para importar');
      return;
    }

    setIsUploading(true);
    setError(null);
    let imported = 0;
    let failed = 0;

    try {
      // Importar os cards um a um para mostrar progresso
      for (const card of importedCards) {
        try {
          const result = await FlashcardsService.createFlashcard({
            user_id: user.id,
            deck_id: deckId,
            front: card.front,
            back: card.back,
            tags: card.tags ? card.tags.split(',').map(tag => tag.trim()) : undefined
          });

          if (result) {
            imported++;
          } else {
            failed++;
          }

          // Atualizar o progresso
          setUploadProgress(Math.round((imported + failed) / importedCards.length * 100));
        } catch (err) {
          console.error('Erro ao importar card:', err);
          failed++;
        }
      }

      if (imported > 0) {
        toast.success(`${imported} cards importados com sucesso${failed > 0 ? ` (${failed} falhas)` : ''}`);
        setShowPreview(false);
        setImportedCards([]);
        if (onSuccess) onSuccess();
      } else {
        setError('Falha ao importar cards');
      }
    } catch (err) {
      console.error('Erro ao importar cards:', err);
      setError('Ocorreu um erro durante a importação');
    } finally {
      setIsUploading(false);
    }
  };

  const handleCancel = () => {
    setShowPreview(false);
    setImportedCards([]);
  };

  const downloadTemplate = () => {
    // Criar um workbook com uma planilha de exemplo
    const wb = XLSX.utils.book_new();
    const wsData = [
      { front: 'Frente do cartão 1', back: 'Verso do cartão 1', tags: 'tag1, tag2' },
      { front: 'Frente do cartão 2', back: 'Verso do cartão 2', tags: 'tag1, tag3' }
    ];
    const ws = XLSX.utils.json_to_sheet(wsData);
    XLSX.utils.book_append_sheet(wb, ws, 'Modelo');
    
    // Gerar o arquivo e fazer download
    XLSX.writeFile(wb, 'modelo_flashcards.xlsx');
  };

  return (
    <div className="w-full">
      {!showPreview ? (
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".xlsx,.xls"
            className="hidden"
            disabled={isUploading}
          />
          
          <FileSpreadsheet className="mx-auto h-12 w-12 text-gray-400 mb-3" />
          <h3 className="text-lg font-medium text-gray-900 mb-1">Importar de Excel</h3>
          <p className="text-sm text-gray-500 mb-4">
            Carregue um arquivo Excel com colunas "front" e "back" (ou "frente" e "verso")
          </p>
          
          <div className="flex flex-col space-y-2">
            <Button 
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="mx-auto"
            >
              <Upload className="mr-2 h-4 w-4" />
              Selecionar Arquivo
            </Button>
            
            <button 
              onClick={downloadTemplate}
              className="text-sm text-blue-600 hover:underline mt-2"
              type="button"
            >
              Baixar modelo de planilha
            </button>
          </div>
          
          {isUploading && (
            <div className="mt-4">
              <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-blue-600 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              <p className="text-sm text-gray-500 mt-1">Processando arquivo...</p>
            </div>
          )}
          
          {error && (
            <div className="mt-4 p-3 bg-red-50 border-l-4 border-red-500 text-red-700 text-sm flex items-start">
              <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>
      ) : (
        <div className="border rounded-lg p-4">
          <h3 className="text-lg font-medium mb-2">Pré-visualização ({importedCards.length} cards)</h3>
          
          <div className="max-h-60 overflow-y-auto mb-4">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs uppercase text-gray-700">
                <tr>
                  <th className="px-4 py-2 text-left">Frente</th>
                  <th className="px-4 py-2 text-left">Verso</th>
                  <th className="px-4 py-2 text-left">Tags</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {importedCards.slice(0, 5).map((card, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-4 py-2 truncate max-w-[200px]">{card.front}</td>
                    <td className="px-4 py-2 truncate max-w-[200px]">{card.back}</td>
                    <td className="px-4 py-2 text-gray-500">{card.tags || '-'}</td>
                  </tr>
                ))}
                {importedCards.length > 5 && (
                  <tr>
                    <td colSpan={3} className="px-4 py-2 text-center text-gray-500">
                      ...e mais {importedCards.length - 5} cards
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          
          {isUploading && (
            <div className="mb-4">
              <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-blue-600 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              <p className="text-sm text-gray-500 mt-1">
                Importando cards: {Math.round(uploadProgress)}%
              </p>
            </div>
          )}
          
          {error && (
            <div className="mb-4 p-3 bg-red-50 border-l-4 border-red-500 text-red-700 text-sm flex items-start">
              <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}
          
          <div className="flex justify-end space-x-2">
            <Button 
              variant="outline" 
              onClick={handleCancel}
              disabled={isUploading}
            >
              <X className="mr-2 h-4 w-4" />
              Cancelar
            </Button>
            <Button 
              onClick={handleImport}
              disabled={isUploading}
            >
              <Check className="mr-2 h-4 w-4" />
              Importar {importedCards.length} Cards
            </Button>
          </div>
        </div>
      )}
    </div>
  );
} 