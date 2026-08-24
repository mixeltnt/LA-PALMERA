/* LA PALMERA - Service Worker
 *
 * Estrategia de seguridad:
 * - SOLO se cachean assets estáticos de la aplicación (JS/CSS/fuentes/íconos)
 *   y el app shell (index.html).
 * - NUNCA se cachea /api/* (ventas, stock, clientes, fiado, cuentas por
 *   cobrar, compras, usuarios, reportes ni ningún dato privado).
 * - Las navegaciones usan NETWORK-FIRST: online siempre se sirve la última
 *   versión; el app shell cacheado solo se usa como respaldo sin conexión.
 * - Los assets estáticos (hasheados por Vite) usan cache-first con
 *   actualización en segundo plano; al cambiar de versión de build, la
 *   activación limpia las cachés antiguas.
 * - No se altera el funcionamiento online actual.
 */

const CACHE_NAME = "lapalmera-cache-v2";
const CACHE_PREFIX = "lapalmera-cache-";
const CORE_ASSETS = ["/", "/manifest.json", "/favicon.svg"];
const STATIC_EXT = /\.(js|css|woff2?|png|jpe?g|gif|svg|ico)$/;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => Promise.allSettled(CORE_ASSETS.map((url) => cache.add(url))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // PROHIBIDO cachear la API: ventas, stock, fiado, cuentas por cobrar,
  // compras, usuarios, reportes y cualquier dato privado.
  if (url.pathname.startsWith("/api")) return;

  // Navegaciones (SPA): network-first, respaldo solo con el app shell.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() => caches.match("/")),
    );
    return;
  }

  // Assets estáticos: cache-first con actualización en segundo plano.
  if (STATIC_EXT.test(url.pathname)) {
    event.respondWith(
      caches.match(request).then((cached) => {
        const update = fetch(request)
          .then((response) => {
            if (response && response.ok) {
              const clone = response.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
            }
            return response;
          })
          .catch(() => cached);
        return cached || update;
      }),
    );
  }
});