export async function preloadImage(url) {
  try {
    if (!url) return;
    // Warm up the HTTP cache
    await fetch(url, { mode: "cors", cache: "force-cache" });
    // Additionally add to Cache Storage (persisted) if available
    if (typeof window !== "undefined" && "caches" in window) {
      const cache = await caches.open("fs-image-cache-v1");
      const res = await cache.match(url);
      if (!res) {
        const fetched = await fetch(url, { mode: "cors", cache: "reload" });
        if (fetched.ok) {
          await cache.put(url, fetched.clone());
        }
      }
    }
  } catch {
    // Ignore caching errors
  }
}