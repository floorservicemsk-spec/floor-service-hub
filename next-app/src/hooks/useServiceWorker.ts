"use client";

import { useEffect, useState } from "react";

interface ServiceWorkerState {
  isSupported: boolean;
  isRegistered: boolean;
  isOffline: boolean;
  registration: ServiceWorkerRegistration | null;
}

export function useServiceWorker() {
  const [state, setState] = useState<ServiceWorkerState>({
    isSupported: false,
    isRegistered: false,
    isOffline: false,
    registration: null,
  });

  useEffect(() => {
    // Check if service workers are supported
    const isSupported = "serviceWorker" in navigator;
    setState((prev) => ({ ...prev, isSupported }));

    if (!isSupported) return;

    // Register service worker
    const registerSW = async () => {
      try {
        const registration = await navigator.serviceWorker.register("/sw.js", {
          scope: "/",
        });

        console.log("[SW] Registered successfully");

        setState((prev) => ({
          ...prev,
          isRegistered: true,
          registration,
        }));

        // Check for updates
        registration.addEventListener("updatefound", () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener("statechange", () => {
              if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
                // New version available
                console.log("[SW] New version available");
              }
            });
          }
        });
      } catch (error) {
        console.error("[SW] Registration failed:", error);
      }
    };

    registerSW();

    // Track online/offline status
    const handleOnline = () => setState((prev) => ({ ...prev, isOffline: false }));
    const handleOffline = () => setState((prev) => ({ ...prev, isOffline: true }));

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Initial offline check
    setState((prev) => ({ ...prev, isOffline: !navigator.onLine }));

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Force update service worker
  const update = async () => {
    if (state.registration) {
      await state.registration.update();
    }
  };

  // Skip waiting and activate new worker
  const skipWaiting = () => {
    if (state.registration?.waiting) {
      state.registration.waiting.postMessage("skipWaiting");
    }
  };

  // Clear all caches
  const clearCache = async () => {
    if ("caches" in window) {
      const names = await caches.keys();
      await Promise.all(names.map((name) => caches.delete(name)));
      console.log("[SW] Caches cleared");
    }
  };

  return {
    ...state,
    update,
    skipWaiting,
    clearCache,
  };
}
