// Versão do cache - altere isso ao atualizar o sw.js
const CACHE_VERSION = 'v1';
const CACHE_NAME = `medjourney-${CACHE_VERSION}`;

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

// Instalar o service worker e pré-cachear recursos estáticos
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Cache aberto');
        return cache.addAll(STATIC_RESOURCES);
      })
      .then(() => self.skipWaiting())
  );
});

// Limpar caches antigos ao ativar
self.addEventListener('activate', event => {
  const cacheAllowlist = [CACHE_NAME];

  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheAllowlist.indexOf(cacheName) === -1) {
            console.log(`Removendo cache antigo: ${cacheName}`);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Estratégia de cache: Stale While Revalidate (servir do cache enquanto atualiza)
self.addEventListener('fetch', event => {
  // Ignorar solicitações não GET
  if (event.request.method !== 'GET') return;

  // Verificar se a URL é de API
  const isApiRequest = API_URLS.some(url => event.request.url.includes(url));

  if (isApiRequest) {
    // Estratégia para API: Network First, com cache de fallback
    event.respondWith(
      networkFirstWithCache(event.request)
    );
  } else {
    // Estratégia para recursos estáticos: Cache First, com network fallback
    event.respondWith(
      cacheFirstWithNetwork(event.request)
    );
  }
});

// Cache First, fallback para network
async function cacheFirstWithNetwork(request) {
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    // Revalidar o cache em segundo plano
    fetch(request)
      .then(response => {
        if (response.ok) {
          caches.open(CACHE_NAME)
            .then(cache => cache.put(request, response.clone()));
        }
      })
      .catch(err => console.log('Falha ao atualizar o cache:', err));
    
    return cachedResponse;
  }

  // Se não estiver no cache, buscar da rede e cachear
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (err) {
    // Se a solicitação for para uma página HTML, mostrar página offline
    if (request.headers.get('Accept').includes('text/html')) {
      return caches.match('/offline.html');
    }
    // Para outros recursos, retornar erro
    return new Response('Sem conexão com a internet', { status: 503 });
  }
}

// Network First, fallback para cache
async function networkFirstWithCache(request) {
  try {
    // Tenta buscar da rede primeiro
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      // Clonar resposta para armazenar no cache
      const responseToCache = networkResponse.clone();
      caches.open(CACHE_NAME)
        .then(cache => {
          // Adicionar uma marca de timestamp para expiração do cache
          const headers = new Headers(responseToCache.headers);
          headers.append('sw-fetched-on', new Date().getTime().toString());
          
          // Criar nova resposta com headers atualizados
          const cachedResponse = new Response(
            responseToCache.body, 
            { 
              status: responseToCache.status, 
              statusText: responseToCache.statusText,
              headers: headers
            }
          );
          
          cache.put(request, cachedResponse);
        });
      
      return networkResponse;
    }
  } catch (err) {
    console.log('Falha ao buscar da rede, usando cache:', err);
    // Network falhou, tentar do cache
  }

  // Buscar do cache se a rede falhar
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    // Verificar se o cache está muito antigo
    const fetchedOn = cachedResponse.headers.get('sw-fetched-on');
    // Se cache tem mais de 1 hora, está "stale" (expirado)
    const isCacheStale = fetchedOn && (Date.now() - parseInt(fetchedOn)) > 60 * 60 * 1000;
    
    if (!isCacheStale) {
      return cachedResponse;
    } else {
      console.log('Cache está expirado, mas será usado como fallback');
    }
    
    return cachedResponse;
  }

  // Se não estiver no cache, retornar um erro amigável
  const errorResponse = {
    success: false,
    error: 'Dados não disponíveis offline'
  };
  
  return new Response(JSON.stringify(errorResponse), {
    status: 503,
    headers: { 'Content-Type': 'application/json' }
  });
}

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