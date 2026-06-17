/* ─────────────────────────────────────────────────────────────────────────
   Service Worker — Cuniculture Pro
   Stratégie :
     • Assets statiques (_next/static, images, icons) → Cache-First
     • Pages HTML (navigate)                          → Network-First + fallback cache
     • Tout le reste                                  → Stale-While-Revalidate
   Les données métier (cheptel, reproduction, stocks) sont dans localStorage
   → elles ne transitent jamais par le réseau, donc 100 % offline nativement.
   ───────────────────────────────────────────────────────────────────────── */

const CACHE = 'elevage-v2';

// Pages à pré-cacher dès l'installation
const SHELL = [
  '/',
  '/cheptel',
  '/naissances',
  '/provende',
  '/performances',
  '/genealogie',
  '/associes',
  '/manifest.json',
];

// ── Installation : on pré-cache le shell de l'application ─────────────────
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(SHELL))
  );
  self.skipWaiting(); // Active immédiatement sans attendre la fermeture des onglets
});

// ── Activation : on supprime les anciens caches ────────────────────────────
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim(); // Prend le contrôle de tous les onglets ouverts
});

// ── Clic sur une notification : ouvre l'app sur la bonne page ─────────────────
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const lien = (e.notification.data && e.notification.data.lien) || '/';
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      // Si l'app est déjà ouverte, on focus et on navigue
      const appOuverte = clients.find(c => c.url.includes(self.location.origin));
      if (appOuverte) {
        appOuverte.focus();
        return appOuverte.navigate(lien);
      }
      // Sinon on ouvre une nouvelle fenêtre
      return self.clients.openWindow(lien);
    })
  );
});

// ── Fetch : intercepte toutes les requêtes GET ─────────────────────────────
self.addEventListener('fetch', (e) => {
  // On ignore les requêtes non-GET (POST, etc.)
  if (e.request.method !== 'GET') return;

  const url = new URL(e.request.url);

  // ── 1. Assets Next.js & ressources statiques : Cache-First ──────────────
  if (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/icons/') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.jpg') ||
    url.pathname.endsWith('.webp') ||
    url.pathname.endsWith('.ico')
  ) {
    e.respondWith(
      caches.match(e.request).then((cached) => {
        if (cached) return cached;
        return fetch(e.request).then((res) => {
          const clone = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, clone));
          return res;
        });
      })
    );
    return;
  }

  // ── 2. Navigation (pages HTML) : Network-First + fallback cache ──────────
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request)
        .then((res) => {
          const clone = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, clone));
          return res;
        })
        .catch(() =>
          caches.match(e.request).then((cached) => cached || caches.match('/'))
        )
    );
    return;
  }

  // ── 3. Tout le reste (chunks JS dynamiques, etc.) : Stale-While-Revalidate
  e.respondWith(
    caches.match(e.request).then((cached) => {
      const networkFetch = fetch(e.request)
        .then((res) => {
          if (res.ok) {
            caches.open(CACHE).then((c) => c.put(e.request, res.clone()));
          }
          return res;
        })
        .catch(() => cached); // Si réseau indisponible, on retourne le cache
      return cached || networkFetch;
    })
  );
});
