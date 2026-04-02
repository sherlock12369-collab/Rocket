import { precacheAndRoute } from 'workbox-precaching';

// Precaching injected by Vite PWA
precacheAndRoute(self.__WB_MANIFEST || []);

// Web Push Background Event Listener
self.addEventListener('push', (event) => {
  if (event.data) {
    try {
      const data = event.data.json();
      const title = data.title || '🚀 Rocket 시스템';
      const options = {
        body: data.body || '새로운 알림이 도착했습니다.',
        icon: '/pwa-192x192.png',
        badge: '/pwa-192x192.png',
        data: {
          url: '/'
        }
      };

      event.waitUntil(self.registration.showNotification(title, options));
    } catch (e) {
      const title = '🚀 Rocket 시스템';
      const options = {
        body: event.data.text(),
        icon: '/pwa-192x192.png'
      };
      event.waitUntil(self.registration.showNotification(title, options));
    }
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const urlToOpen = new URL(event.notification.data?.url || '/', self.location.origin).href;

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Check if there is already a window/tab open with the target URL
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        // If so, just focus it.
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      // If not, then open the target URL in a new window/tab.
      if (self.clients.openWindow) {
        return self.clients.openWindow(urlToOpen);
      }
    })
  );
});
