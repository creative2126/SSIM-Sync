// ── Service Worker for SSIM Sync ──────────────────────────────────────────────

// Install: take control of all clients immediately without waiting
self.addEventListener('install', function(event) {
    self.skipWaiting();
});

// Activate: claim all existing clients so the SW is active on first load
self.addEventListener('activate', function(event) {
    event.waitUntil(self.clients.claim());
});

// Fetch: passthrough handler (required for PWA installability)
self.addEventListener('fetch', function(event) {
    // Passthrough — no caching strategy needed
});

// Push: handle incoming push notifications
self.addEventListener('push', function(event) {
    if (!event.data) return;

    const data = event.data.json();
    const options = {
        body: data.body || 'You have a new notification',
        icon: '/icon.png',
        badge: '/icon.png',
        vibrate: [200, 100, 200],
        tag: data.tag || 'ssim-sync-alert',
        renotify: true,
        data: {
            url: data.url || '/matches'
        }
    };

    event.waitUntil(
        self.registration.showNotification(data.title || 'SSIM Sync', options)
    );
});

// Notification click: open the linked page
self.addEventListener('notificationclick', function(event) {
    event.notification.close();
    const targetUrl = event.notification.data?.url || '/';

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
            // If the app is already open, focus it
            for (const client of clientList) {
                if (client.url.includes(self.location.origin) && 'focus' in client) {
                    client.navigate(targetUrl);
                    return client.focus();
                }
            }
            // Otherwise open a new window
            if (clients.openWindow) {
                return clients.openWindow(targetUrl);
            }
        })
    );
});
