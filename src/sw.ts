/// <reference lib="webworker" />
import { cleanupOutdatedCaches, precacheAndRoute, createHandlerBoundToURL } from 'workbox-precaching';
import { registerRoute, NavigationRoute } from 'workbox-routing';

declare const self: ServiceWorkerGlobalScope & { __WB_MANIFEST: Array<{ url: string; revision: string | null }> };
precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();
registerRoute(new NavigationRoute(createHandlerBoundToURL('index.html')));
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));
self.addEventListener('push', event => {
  let payload: { title?: string; body?: string } = {};
  try {
    const data: unknown = event.data?.json();
    if (data && typeof data === 'object') {
      const candidate = data as Record<string, unknown>;
      payload = {
        title: typeof candidate.title === 'string' ? candidate.title : undefined,
        body: typeof candidate.body === 'string' ? candidate.body : undefined,
      };
    }
  } catch { payload.body = event.data?.text(); }
  event.waitUntil(self.registration.showNotification(payload.title || 'Pocket', {
    body: payload.body || 'Your everyday lists are ready.',
    icon: new URL('icon-192.png', self.registration.scope).href,
    badge: new URL('icon-192.png', self.registration.scope).href,
  }));
});
self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const existing = windows.find(client => client.url.startsWith(self.registration.scope));
    if (existing) await existing.focus();
    else await self.clients.openWindow(self.registration.scope);
  })());
});
