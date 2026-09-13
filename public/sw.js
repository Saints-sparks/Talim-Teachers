/* Talim Teachers — Web Push Service Worker */

const DEFAULT_URL = "/dashboard";

const absoluteUrl = (url) => new URL(url || DEFAULT_URL, self.location.origin).href;

self.addEventListener("push", (event) => {
  if (!event.data) return;

  let data;
  try {
    data = event.data.json();
  } catch {
    data = { title: "Talim", body: event.data.text() };
  }

  const payloadData = data.data || {};
  const options = {
    body: data.body || "",
    icon: data.icon || "/icons/icon-192x192.png",
    badge: data.badge || "/icons/badge-72x72.png",
    tag: data.tag || "talim-notification",
    renotify: Boolean(data.renotify && data.tag),
    data: payloadData,
    requireInteraction: data.requireInteraction || false,
    silent: false,
  };

  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        // Don't alert about a chat the user is looking at right now.
        if (payloadData.url) {
          const target = absoluteUrl(payloadData.url);
          const viewing = clientList.some(
            (client) => client.focused && client.url === target
          );
          if (viewing) return;
        }
        return self.registration.showNotification(
          data.title || "Talim Notification",
          options
        );
      })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const url = event.notification.data?.url || DEFAULT_URL;

  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if ("focus" in client) {
            // The app routes to the url itself, keeping its state and socket.
            client.postMessage({ type: "OPEN_URL", url });
            return client.focus();
          }
        }
        if (clients.openWindow) {
          return clients.openWindow(absoluteUrl(url));
        }
      })
  );
});
