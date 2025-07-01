/**
 * Utilitário para reproduzir sons no aplicativo
 */

// Armazenar o contexto de áudio globalmente para reutilização
let audioContext: AudioContext | null = null;

/**
 * Inicializa o contexto de áudio (deve ser chamado após interação do usuário)
 */
export const initAudioContext = (): void => {
  try {
    if (!audioContext) {
      audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    
    // Se o contexto estiver suspenso (comum em Safari/iOS), retomar
    if (audioContext.state === 'suspended') {
      audioContext.resume();
    }
  } catch (error) {
    console.error('Erro ao inicializar contexto de áudio:', error);
  }
};

/**
 * Reproduz o som de notificação usando o arquivo MP3
 */
export const playNotificationSound = (): void => {
  try {
    // Reproduzir apenas o arquivo de áudio MP3
    playWithAudioElement();
    
    // Mostrar notificação do sistema (sem som)
    showSystemNotification('MedJourney', 'Sua sessão de estudo foi concluída!');
  } catch (error) {
    console.error('Erro ao reproduzir som de notificação:', error);
  }
};

/**
 * Reproduz o som usando elemento de áudio tradicional
 */
const playWithAudioElement = (): void => {
  try {
    // Criar elemento de áudio
    const audio = new Audio('/notification.mp3');
    
    // Configurar volume
    audio.volume = 0.7;
    
    // Tentar reproduzir o som
    const playPromise = audio.play();
    
    if (playPromise !== undefined) {
      playPromise.catch(error => {
        console.error('Erro ao reproduzir som com elemento de áudio:', error);
      });
    }
  } catch (error) {
    console.error('Erro ao criar elemento de áudio:', error);
  }
};

/**
 * Mostra uma notificação do sistema
 */
const showSystemNotification = (title: string, body: string): void => {
  try {
    // Verificar se o navegador suporta notificações
    if (!('Notification' in window)) {
      return;
    }
    
    // Verificar se já temos permissão
    if (Notification.permission === 'granted') {
      new Notification(title, { body });
    } 
    // Se não foi negado, solicitar permissão
    else if (Notification.permission !== 'denied') {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          new Notification(title, { body });
        }
      });
    }
  } catch (error) {
    console.error('Erro ao mostrar notificação do sistema:', error);
  }
};

/**
 * Reproduz o som de notificação com configurações personalizadas
 * @param volume Volume do som (0.0 a 1.0)
 * @param loop Se o som deve ser reproduzido em loop
 * @returns O elemento de áudio criado (útil para parar o som posteriormente)
 */
export const playCustomNotificationSound = (volume: number = 0.7, loop: boolean = false): HTMLAudioElement | null => {
  try {
    // Criar elemento de áudio
    const audio = new Audio('/notification.mp3');
    
    // Configurar volume e loop
    audio.volume = Math.min(1, Math.max(0, volume)); // Garantir que o volume está entre 0 e 1
    audio.loop = loop;
    
    // Reproduzir o som
    audio.play().catch(error => {
      console.error('Erro ao reproduzir som de notificação:', error);
    });
    
    return audio;
  } catch (error) {
    console.error('Erro ao criar elemento de áudio:', error);
    return null;
  }
}; 