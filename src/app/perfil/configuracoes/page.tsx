"use client";

import React, { useState } from 'react';
import { 
  Settings, 
  HelpCircle, 
  Bug, 
  RefreshCw, 
  Mail, 
  ChevronRight,
  ArrowLeft,
  Send,
  X
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'react-hot-toast';

// Componente do Modal de FAQ
const FAQModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  const faqs = [
    {
      question: "Como posso alterar minha senha?",
      answer: "Vá para a página de perfil e clique em 'Alterar Senha'. Você receberá um email com instruções para redefinir sua senha."
    },
    {
      question: "Como funciona o sistema de assinaturas?",
      answer: "Oferecemos diferentes planos de assinatura com recursos variados. Acesse 'Minha Assinatura' no menu para ver os detalhes e fazer upgrade."
    },
    {
      question: "Posso cancelar minha assinatura a qualquer momento?",
      answer: "Sim, você pode cancelar sua assinatura a qualquer momento. O acesso aos recursos premium continuará até o final do período pago."
    },
    {
      question: "Como criar um plano de estudos?",
      answer: "Acesse a seção 'Planejamento' no menu principal e escolha entre criar um plano manual ou usar nossa IA para gerar um plano personalizado."
    },
    {
      question: "Como funciona o sistema de flashcards?",
      answer: "Você pode criar decks de flashcards personalizados ou usar os decks compartilhados pela comunidade. O sistema usa repetição espaçada para otimizar seu aprendizado."
    },
    {
      question: "Posso estudar offline?",
      answer: "Algumas funcionalidades estão disponíveis offline, como visualizar flashcards baixados e cronômetro de estudos. Para sincronizar dados, é necessária conexão com internet."
    },
    {
      question: "Como reportar um problema técnico?",
      answer: "Use a opção 'Reportar Bug' nas configurações ou entre em contato conosco através do email genomastudy@gmail.com."
    },
    {
      question: "Meus dados estão seguros?",
      answer: "Sim, utilizamos criptografia de ponta e seguimos as melhores práticas de segurança. Seus dados pessoais são protegidos conforme nossa Política de Privacidade."
    }
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center">
            <HelpCircle className="h-6 w-6 mr-3 text-blue-600" />
            Dúvidas Frequentes
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-2">{faq.question}</h3>
                <p className="text-gray-600 text-sm leading-relaxed">{faq.answer}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// Componente do Modal de Reportar Bug/Melhorias
const ReportModal = ({ 
  isOpen, 
  onClose, 
  type 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  type: 'bug' | 'improvement';
}) => {
  if (!isOpen) return null;

  const handleEmailClick = () => {
    const subject = type === 'bug' ? 'BUG' : 'MELHORIAS';
    const emailBody = `Olá,\n\n${type === 'bug' ? 'Gostaria de reportar um bug:' : 'Gostaria de sugerir uma melhoria:'}\n\n[Descreva aqui o ${type === 'bug' ? 'problema encontrado' : 'sua sugestão'} em detalhes]\n\nObrigado!`;
    
    const mailtoLink = `mailto:genomastudy@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(emailBody)}`;
    window.open(mailtoLink, '_blank');
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900 flex items-center">
            <Bug className="h-5 w-5 mr-3 text-red-600" />
            {type === 'bug' ? 'Reportar Bug' : 'Sugerir Melhoria'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>
        <div className="p-6">
          <div className="text-center mb-6">
            <Mail className="h-12 w-12 text-blue-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {type === 'bug' ? 'Reportar um Bug' : 'Enviar Sugestão'}
            </h3>
            <p className="text-gray-600 text-sm">
              Para {type === 'bug' ? 'reportar bugs' : 'enviar sugestões'}, envie um email diretamente para nossa equipe.
            </p>
          </div>
          
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-gray-700">Email:</span>
              <span className="text-sm text-gray-900 font-mono">genomastudy@gmail.com</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Assunto:</span>
              <span className="text-sm text-gray-900 font-mono">{type === 'bug' ? 'BUG' : 'MELHORIAS'}</span>
            </div>
          </div>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <h4 className="text-sm font-medium text-blue-900 mb-2">
              {type === 'bug' ? 'Informações importantes para bugs:' : 'Dicas para sugestões:'}
            </h4>
            <ul className="text-xs text-blue-800 space-y-1">
              {type === 'bug' ? (
                <>
                  <li>• Descreva o problema em detalhes</li>
                  <li>• Informe quando o erro acontece</li>
                  <li>• Inclua passos para reproduzir o bug</li>
                  <li>• Mencione seu navegador e dispositivo</li>
                </>
              ) : (
                <>
                  <li>• Descreva sua ideia claramente</li>
                  <li>• Explique como isso melhoraria a experiência</li>
                  <li>• Inclua exemplos se possível</li>
                  <li>• Seja específico sobre a funcionalidade</li>
                </>
              )}
            </ul>
          </div>
          
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Fechar
            </button>
            <button
              onClick={handleEmailClick}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center"
            >
              <Mail className="h-4 w-4 mr-2" />
              Abrir Email
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Componente do Modal de Estorno
const RefundModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  if (!isOpen) return null;

  const handleEmailClick = () => {
    const subject = 'ESTORNO';
    const emailBody = `Olá,\n\nGostaria de solicitar o estorno da minha compra.\n\nInformações da solicitação:\n\n• Motivo do estorno: [Descreva o motivo]\n• Email da conta: [Seu email cadastrado]\n• Detalhes adicionais: [Informações extras se necessário]\n\nEsta solicitação está sendo feita dentro do prazo de 7 dias conforme o Código de Defesa do Consumidor.\n\nObrigado!`;
    
    const mailtoLink = `mailto:genomastudy@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(emailBody)}`;
    window.open(mailtoLink, '_blank');
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900 flex items-center">
            <RefreshCw className="h-5 w-5 mr-3 text-green-600" />
            Solicitar Estorno
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>
        <div className="p-6">
          <div className="text-center mb-6">
            <Mail className="h-12 w-12 text-green-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Solicitar Estorno
            </h3>
            <p className="text-gray-600 text-sm">
              Para solicitar estorno, envie um email diretamente para nossa equipe.
            </p>
          </div>
          
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-yellow-800">
              <strong>Importante:</strong> Conforme o Código de Defesa do Consumidor, você tem até 7 dias para solicitar o estorno após a compra.
            </p>
          </div>
          
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-gray-700">Email:</span>
              <span className="text-sm text-gray-900 font-mono">genomastudy@gmail.com</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Assunto:</span>
              <span className="text-sm text-gray-900 font-mono">ESTORNO</span>
            </div>
          </div>
          
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <h4 className="text-sm font-medium text-green-900 mb-2">
              Informações necessárias no email:
            </h4>
            <ul className="text-xs text-green-800 space-y-1">
              <li>• Motivo do estorno</li>
              <li>• Email da conta cadastrada</li>
              <li>• Data da compra (se souber)</li>
              <li>• Detalhes adicionais relevantes</li>
            </ul>
          </div>
          
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Fechar
            </button>
            <button
              onClick={handleEmailClick}
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center"
            >
              <Mail className="h-4 w-4 mr-2" />
              Abrir Email
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function ConfiguracoesPage() {
  const [faqModalOpen, setFaqModalOpen] = useState(false);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [refundModalOpen, setRefundModalOpen] = useState(false);
  const [reportType, setReportType] = useState<'bug' | 'improvement'>('bug');

  const configOptions = [
    {
      title: 'Dúvidas Frequentes',
      description: 'Encontre respostas para as perguntas mais comuns',
      icon: HelpCircle,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      action: () => setFaqModalOpen(true)
    },
    {
      title: 'Reportar Bug',
      description: 'Encontrou um problema? Nos ajude a corrigi-lo',
      icon: Bug,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      action: () => {
        setReportType('bug');
        setReportModalOpen(true);
      }
    },
    {
      title: 'Sugerir Melhorias',
      description: 'Compartilhe suas ideias para melhorar a plataforma',
      icon: Mail,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      action: () => {
        setReportType('improvement');
        setReportModalOpen(true);
      }
    },
    {
      title: 'Solicitar Estorno',
      description: 'Solicite o estorno dentro de 7 dias da compra',
      icon: RefreshCw,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      action: () => setRefundModalOpen(true)
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-4xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <Link 
            href="/perfil" 
            className="inline-flex items-center text-blue-600 hover:text-blue-800 transition-colors mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar ao Perfil
          </Link>
          <div className="flex items-center mb-2">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mr-4">
              <Settings className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Configurações</h1>
              <p className="text-gray-600">Gerencie suas preferências e obtenha suporte</p>
            </div>
          </div>
        </div>

        {/* Options Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {configOptions.map((option, index) => {
            const IconComponent = option.icon;
            return (
              <div
                key={index}
                onClick={option.action}
                className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer group border border-gray-100"
              >
                <div className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-4">
                      <div className={`w-12 h-12 ${option.bgColor} rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform`}>
                        <IconComponent className={`h-6 w-6 ${option.color}`} />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
                          {option.title}
                        </h3>
                        <p className="text-gray-600 text-sm leading-relaxed">
                          {option.description}
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Contact Info */}
        <div className="mt-8 bg-white rounded-xl shadow-lg p-6 border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Mail className="h-5 w-5 mr-3 text-blue-600" />
            Contato Direto
          </h3>
          <p className="text-gray-600 mb-4">
            Para questões específicas ou suporte personalizado, entre em contato conosco:
          </p>
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-700">
              <strong>Email:</strong> genomastudy@gmail.com
            </p>
            <p className="text-xs text-gray-500 mt-2">
              Respondemos em até 24 horas durante dias úteis
            </p>
          </div>
        </div>
      </div>

      {/* Modals */}
      <FAQModal isOpen={faqModalOpen} onClose={() => setFaqModalOpen(false)} />
      <ReportModal 
        isOpen={reportModalOpen} 
        onClose={() => setReportModalOpen(false)} 
        type={reportType}
      />
      <RefundModal isOpen={refundModalOpen} onClose={() => setRefundModalOpen(false)} />
    </div>
  );
}