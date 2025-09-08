import { Metadata } from 'next';
import { TextParserForm } from '@/components/exam-upload/text-parser-form';

export const metadata: Metadata = {
  title: 'Parser de Texto - Provas Integra',
  description: 'Cole o texto da prova e identifique questões automaticamente'
};

export default function TextParserPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Parser de Texto - Provas Integra
          </h1>
          <p className="text-gray-600">
            Cole o texto completo da prova e o algoritmo identificará automaticamente as questões
          </p>
        </div>

        {/* Indicador de Progresso */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-4">
              <div className="flex items-center">
                <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-medium">
                  1
                </div>
                <span className="ml-2 text-sm font-medium text-blue-600">Colar Texto</span>
              </div>
              <div className="w-16 h-1 bg-gray-200 rounded"></div>
              <div className="flex items-center">
                <div className="w-8 h-8 bg-gray-200 text-gray-500 rounded-full flex items-center justify-center text-sm font-medium">
                  2
                </div>
                <span className="ml-2 text-sm font-medium text-gray-500">Processamento</span>
              </div>
              <div className="w-16 h-1 bg-gray-200 rounded"></div>
              <div className="flex items-center">
                <div className="w-8 h-8 bg-gray-200 text-gray-500 rounded-full flex items-center justify-center text-sm font-medium">
                  3
                </div>
                <span className="ml-2 text-sm font-medium text-gray-500">Revisão</span>
              </div>
            </div>
          </div>
        </div>

        {/* Formulário de Parser */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <TextParserForm />
        </div>

        {/* Dicas */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-3">
            💡 Dicas para melhor resultado
          </h3>
          <ul className="space-y-2 text-blue-800">
            <li className="flex items-start">
              <span className="text-blue-600 mr-2">•</span>
              Cole o texto completo da prova, incluindo título e instruções
            </li>
            <li className="flex items-start">
              <span className="text-blue-600 mr-2">•</span>
              Certifique-se de que as questões estão numeradas (1), 2), 3)...)
            </li>
            <li className="flex items-start">
              <span className="text-blue-600 mr-2">•</span>
              As alternativas devem estar marcadas com A), B), C), D), E)
            </li>
            <li className="flex items-start">
              <span className="text-blue-600 mr-2">•</span>
              Se houver gabarito, inclua no final do texto
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}