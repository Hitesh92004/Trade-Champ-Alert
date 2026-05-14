// Service Worker for Push Notifications
self.addEventListener("push", (e) => {
  const d = e.data.json();
  self.registration.showNotification(d.title, {
    body: d.body,
    icon: "/vite.svg",
    badge: "/vite.svg",
    vibrate: [200, 100, 200],
    data: d,
  });
});

self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  e.waitUntil(clients.openWindow("/alerts"));
});
