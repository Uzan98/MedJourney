'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { privacyPolicy } from '@/data/privacy-policy';

interface PrivacyPolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAccept?: () => void;
  showAcceptButton?: boolean;
}

export function PrivacyPolicyModal({ 
  isOpen, 
  onClose, 
  onAccept, 
  showAcceptButton = false 
}: PrivacyPolicyModalProps) {
  const [isAccepting, setIsAccepting] = useState(false);

  const handleAccept = async () => {
    if (onAccept) {
      setIsAccepting(true);
      try {
        await onAccept();
        onClose();
      } catch (error) {
        console.error('Erro ao aceitar política de privacidade:', error);
      } finally {
        setIsAccepting(false);
      }
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>{privacyPolicy.title}</DialogTitle>
        </DialogHeader>
        
        <div className="h-[60vh] overflow-y-auto pr-4">
          <div 
            className="prose prose-sm max-w-none"
            dangerouslySetInnerHTML={{ __html: privacyPolicy.content }}
          />
          
          <div className="mt-6 text-sm text-muted-foreground">
            <p>Versão: {privacyPolicy.version}</p>
            <p>Última atualização: {privacyPolicy.lastUpdated}</p>
          </div>
        </div>
        
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={onClose}>
            Fechar
          </Button>
          {showAcceptButton && (
            <Button 
              onClick={handleAccept}
              disabled={isAccepting}
            >
              {isAccepting ? 'Aceitando...' : 'Aceitar'}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default PrivacyPolicyModal;