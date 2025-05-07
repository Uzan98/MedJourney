// Versão do cache - altere isso ao atualizar o sw.js
const CACHE_VERSION = 'v1';
const CACHE_NAME = `medjourney-${CACHE_VERSION}`;
const OFFLINE_URL = '/offline.html';
const SUPABASE_URL = self.location.origin.includes('localhost') 
  ? 'https://ipfjehdwmenpaeuefntd.supabase.co' 
  : 'https://ipfjehdwmenpaeuefntd.supabase.co';

// Recursos estáticos para cache
const STATIC_RESOURCES = [
  '/',
  '/index.html',
  '/manifest.json',
  '/globals.css',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/offline.html'  // Página offline quando não há conexão
];

// Recursos da API para cache
const API_URLS = [
  '/api/metrics',
  '/api/study-sessions',
  '/api/tasks',
  '/api/notes',
  '/api/study-plans',
  '/api/disciplines'
];

// Recursos que serão cacheados na instalação
const CACHE_ASSETS = [
  '/',
  '/offline.html',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  // Adicione outros recursos estáticos aqui
];

// Instalar o service worker e pré-cachear recursos estáticos
self.addEventListener('install', event => {
  console.log('[Service Worker] Instalando...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[Service Worker] Cacheando recursos');
        return cache.addAll(CACHE_ASSETS);
      })
      .then(() => self.skipWaiting())
  );
});

// Limpar caches antigos ao ativar
self.addEventListener('activate', event => {
  console.log('[Service Worker] Ativando...');
  
  const cacheAllowlist = [CACHE_NAME];

  event.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(keyList.map((key) => {
        if (cacheAllowlist.indexOf(key) === -1) {
          console.log('[Service Worker] Removendo cache antigo:', key);
          return caches.delete(key);
        }
      }));
    })
    .then(() => self.clients.claim())
  );
});

// Estratégia de cache: Stale While Revalidate (servir do cache enquanto atualiza)
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Verificar se é uma solicitação para a API REST do Supabase que pode falhar por RLS
  if (url.origin === SUPABASE_URL && url.pathname.includes('/rest/v1/')) {
    const isDataModification = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method);
    
    // Para operações de modificação de dados, tente redirecionar para nossa API personalizada
    if (isDataModification) {
      console.log('[Service Worker] Interceptando solicitação Supabase:', request.url);
      
      // Deixar a solicitação original passar primeiro
    event.respondWith(
        fetch(request.clone())
      .then(response => {
        if (response.ok) {
              return response;
            }
            
            // Se falhar (provavelmente por RLS), tente usar nossa API
            console.log('[Service Worker] Redirecionando para API interna após falha na REST API');
            
            // Determinar o endpoint da API com base no caminho da REST API
            let apiEndpoint = '';
            if (url.pathname.includes('/rest/v1/disciplines')) {
              apiEndpoint = '/api/disciplines';
            } else if (url.pathname.includes('/rest/v1/subjects')) {
              apiEndpoint = '/api/subjects';
            } else if (url.pathname.includes('/rest/v1/users')) {
              apiEndpoint = '/api/users';
            } else {
              // Se não tivermos um endpoint correspondente, devolvemos o erro original
              return response;
            }
            
            // Extrair o corpo da solicitação original
            return request.clone().json()
              .then(body => {
                // Enviar para nossa API interna
                return fetch(apiEndpoint, {
                  method: request.method,
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify(body),
                  credentials: 'same-origin'
                });
              })
              .catch(error => {
                console.error('[Service Worker] Erro ao redirecionar para API:', error);
                return response; // Retornar a resposta original em caso de erro
              });
          })
          .catch(error => {
            console.error('[Service Worker] Erro na solicitação:', error);
            return caches.match(OFFLINE_URL);
          })
      );
      return;
    }
  }
  
  // Para outras solicitações, use estratégia de cache primeiro, depois rede
  event.respondWith(
    caches.match(request)
      .then((cachedResponse) => {
        // Se o recurso estiver em cache, retorne-o
  if (cachedResponse) {
    return cachedResponse;
  }

        // Caso contrário, busque da rede
        return fetch(request)
          .then((networkResponse) => {
            // Se a solicitação falhar, exibir página offline
            if (!networkResponse || networkResponse.status !== 200) {
              if (request.mode === 'navigate') {
                return caches.match(OFFLINE_URL);
              }
              return networkResponse;
            }
            
            // Armazenar em cache recursos não-API para uso futuro
            if (!url.pathname.includes('/api/') && !url.pathname.includes('/rest/v1/')) {
              const responseToCache = networkResponse.clone();
              caches.open(CACHE_NAME)
                .then((cache) => {
                  cache.put(request, responseToCache);
                });
            }
            
            return networkResponse;
          })
          .catch(() => {
            // Se a solicitação falhar, exibir página offline para navegação
            if (request.mode === 'navigate') {
              return caches.match(OFFLINE_URL);
            }
            return new Response('Erro de rede', { status: 408, headers: { 'Content-Type': 'text/plain' } });
          });
      })
  );
});

// Sincronizar dados quando a conexão estiver de volta
self.addEventListener('sync', event => {
  if (event.tag === 'sync-pending-data') {
    event.waitUntil(syncPendingData());
  }
});

// Função para sincronizar dados pendentes
async function syncPendingData() {
  // Aqui você buscaria dados armazenados localmente pelo IndexedDB
  const db = await openDatabase();
  const pendingRequests = await db.getAll('pendingRequests');
  
  // Processar cada request pendente
  for (const request of pendingRequests) {
    try {
      const response = await fetch(request.url, {
        method: request.method,
        headers: request.headers,
        body: request.body
      });
      
      if (response.ok) {
        // Remover da fila de pendentes após sucesso
        await db.delete('pendingRequests', request.id);
      }
    } catch (err) {
      console.error('Falha ao sincronizar dados pendentes:', err);
    }
  }
}

// Função de helper para abrir o IndexedDB
function openDatabase() {
  return new Promise((resolve, reject) => {
    const dbRequest = indexedDB.open('medjourney-offline', 1);
    
    dbRequest.onupgradeneeded = event => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('pendingRequests')) {
        db.createObjectStore('pendingRequests', { keyPath: 'id', autoIncrement: true });
      }
    };
    
    dbRequest.onsuccess = event => resolve({
      db: event.target.result,
      
      getAll: storeName => {
        return new Promise((resolve, reject) => {
          const transaction = this.db.transaction(storeName, 'readonly');
          const store = transaction.objectStore(storeName);
          const request = store.getAll();
          
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
        });
      },
      
      delete: (storeName, key) => {
        return new Promise((resolve, reject) => {
          const transaction = this.db.transaction(storeName, 'readwrite');
          const store = transaction.objectStore(storeName);
          const request = store.delete(key);
          
          request.onsuccess = () => resolve();
          request.onerror = () => reject(request.error);
        });
      }
    });
    
    dbRequest.onerror = event => reject(event.target.error);
  });
}

// Receber mensagens da aplicação
self.addEventListener('message', event => {
  if (event.data.action === 'skipWaiting') {
    self.skipWaiting();
  }
}); 