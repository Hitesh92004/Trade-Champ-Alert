import api from "./api";

/**
 * Convert a base64 string to a Uint8Array (for applicationServerKey).
 */
function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Register service worker and subscribe to push notifications.
 * Gracefully degrades if push is not supported or fails.
 */
export async function registerPush() {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    return; // Silent — push not supported
  }

  try {
    const registration = await navigator.serviceWorker.register("/sw.js");

    // Check if notifications are already granted
    if (Notification.permission === "denied") {
      return;
    }

    // Only request permission if not already granted
    if (Notification.permission !== "granted") {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        return;
      }
    }

    const vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
    if (!vapidKey) {
      return; // No VAPID key configured
    }

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidKey),
    });

    // Send subscription to backend
    await api.post("/subscribe", {
      subscription: subscription.toJSON(),
    });
  } catch {
    // Silently fail — push is a nice-to-have, not critical
  }
}
