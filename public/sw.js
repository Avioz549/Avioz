// Only the generic app shell, icons and build assets are cached. Financial
// records stay exclusively in IndexedDB; all API requests use the network.
const CACHE = "savio-public-shell-cd3626c8203a0804";
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then(async (cache) => {
      const assetsResponse = await fetch("/offline-assets.json", {
        cache: "no-store",
      });
      if (!assetsResponse.ok)
        throw new Error("Offline asset manifest unavailable");
      const assetsManifest = await assetsResponse.json();
      await cache.addAll([
        "/",
        "/offline.html",
        "/ocean-sunset.webp",
        "/icons/icon-192.png",
        "/icons/icon-512.png",
        ...assetsManifest.assets,
      ]);
      const shell = await cache.match("/");
      const html = await shell.text();
      const assets = [...html.matchAll(/(?:src|href)="([^"]+)"/g)]
        .map((m) => m[1])
        .filter((url) => url.startsWith("/_next/static/"));
      await cache.addAll([...new Set(assets)]);
    }),
  );
  // Activate after old clients close, or after an explicit safe refresh request.
});
self.addEventListener("message", (event) => {
  if (event.data?.type === "ACTIVATE_SAVIO_UPDATE") self.skipWaiting();
});
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith("savio-") && key !== CACHE)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (
    url.origin !== self.location.origin ||
    event.request.method !== "GET" ||
    url.pathname.startsWith("/api/")
  )
    return;
  if (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname === "/ocean-sunset.webp" ||
    (url.pathname === "/_next/image" &&
      url.searchParams.get("url") === "/goal-photos.png")
  ) {
    event.respondWith(
      caches.open(CACHE).then(async (cache) => {
        const saved = await cache.match(event.request);
        if (saved) return saved;
        const fresh = await fetch(event.request);
        if (fresh.ok) await cache.put(event.request, fresh.clone());
        return fresh;
      }),
    );
    return;
  }
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request)
        .then(async (response) => {
          if (
            response.ok &&
            (url.pathname === "/" || url.pathname === "/dashboard")
          ) {
            const cache = await caches.open(CACHE);
            await cache.put("/", response.clone());
          }
          return response;
        })
        .catch(
          async () =>
            (await caches.match("/")) || (await caches.match("/offline.html")),
        ),
    );
  }
});
