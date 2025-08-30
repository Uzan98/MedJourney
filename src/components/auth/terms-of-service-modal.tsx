'use client';

import { useState, useEffect } from 'react';
import { X, FileText, Check } from 'lucide-react';
import { termsOfService } from '@/data/terms-of-service';

interface TermsOfServiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAccept: () => void;
  onReject: () => void;
}

export default function TermsOfServiceModal({
  isOpen,
  onClose,
  onAccept,
  onReject
}: TermsOfServiceModalProps) {
  const [hasScrolledToEnd, setHasScrolledToEnd] = useState(false);
  const [isAccepted, setIsAccepted] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setHasScrolledToEnd(false);
      setIsAccepted(false);
    }
  }, [isOpen]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    const isAtBottom = scrollTop + clientHeight >= scrollHeight - 10;
    
    if (isAtBottom && !hasScrolledToEnd) {
      setHasScrolledToEnd(true);
    }
  };

  const handleAccept = () => {
    if (isAccepted && hasScrolledToEnd) {
      onAccept();
      onClose();
    }
  };

  const handleReject = () => {
    onReject();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <FileText className="h-6 w-6 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900">
              {termsOfService.title}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div 
          className="flex-1 p-6 overflow-y-auto"
          onScroll={handleScroll}
        >
          <div className="prose prose-sm max-w-none">
            <div className="mb-4 text-sm text-gray-600">
              <p><strong>Versão:</strong> {termsOfService.version}</p>
              <p><strong>Data de vigência:</strong> {termsOfService.effectiveDate}</p>
            </div>
            
            <div className="whitespace-pre-wrap text-gray-800 leading-relaxed">
              {termsOfService.content}
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        {!hasScrolledToEnd && (
          <div className="px-6 py-2 bg-yellow-50 border-t border-yellow-200">
            <p className="text-sm text-yellow-800 text-center">
              ⬇️ Role até o final para habilitar a opção de aceitar os termos
            </p>
          </div>
        )}

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 bg-gray-50">
          {/* Checkbox */}
          <div className="mb-4">
            <label className="flex items-start space-x-3 cursor-pointer">
              <div className="relative">
                <input
                  type="checkbox"
                  checked={isAccepted}
                  onChange={(e) => setIsAccepted(e.target.checked)}
                  disabled={!hasScrolledToEnd}
                  className="sr-only"
                />
                <div className={`
                  w-5 h-5 border-2 rounded flex items-center justify-center transition-all
                  ${
                    hasScrolledToEnd
                      ? isAccepted
                        ? 'bg-blue-600 border-blue-600'
                        : 'border-gray-300 hover:border-blue-400'
                      : 'border-gray-200 bg-gray-100 cursor-not-allowed'
                  }
                `}>
                  {isAccepted && (
                    <Check className="h-3 w-3 text-white" />
                  )}
                </div>
              </div>
              <span className={`text-sm ${
                hasScrolledToEnd ? 'text-gray-900' : 'text-gray-400'
              }`}>
                Li e aceito os Termos de Uso do Genoma
              </span>
            </label>
          </div>

          {/* Buttons */}
          <div className="flex justify-end space-x-3">
            <button
              onClick={handleReject}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              Recusar
            </button>
            <button
              onClick={handleAccept}
              disabled={!isAccepted || !hasScrolledToEnd}
              className={`
                px-4 py-2 text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors
                ${
                  isAccepted && hasScrolledToEnd
                    ? 'text-white bg-blue-600 hover:bg-blue-700'
                    : 'text-gray-400 bg-gray-200 cursor-not-allowed'
                }
              `}
            >
              Aceitar e Continuar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}