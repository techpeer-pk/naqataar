importScripts("https://www.gstatic.com/firebasejs/10.7.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.7.0/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyDDiCgRVkqK10JEiSubAeIE6abkVSqc9Qg",
  authDomain: "qunjee-com.firebaseapp.com",
  projectId: "qunjee-com",
  storageBucket: "qunjee-com.firebasestorage.app",
  messagingSenderId: "519086565319",
  appId: "1:519086565319:web:12462ae47be1d7d78d1be2",
});

const messaging = firebase.messaging();

// Cloud Functions send DATA-ONLY messages (title/body/url in payload.data) so
// this handler is the single display path — a notification payload would get
// auto-displayed by the SDK too, duplicating every push.
messaging.onBackgroundMessage((payload) => {
  const d = payload.data || payload.notification || {};
  // self.registration.showNotification(d.title || "Qunjee", {
  self.registration.showNotification(d.title || "Naqatar", {
    body: d.body || "",
    // icon: "/icons/icon-192x192.png",
    // icon: "/icons-qufree/icon-192x192.png",
    icon: "/icons-naqatar/icon-192x192.png",
    // ?v=2 cache-busts the fixed badge — the old file was served with a
    // 30-day Cache-Control (firebase.json) and had no real "Q" silhouette in
    // its alpha channel, so Android painted a plain white square instead of
    // masking the letterform. Bump this again if the badge asset changes.
    // badge: "/icons/badge-monochrome.png?v=2",
    // badge: "/icons-qufree/badge-monochrome.png?v=3",
    badge: "/icons-naqatar/badge-monochrome.png?v=1",
    // data: { url: d.url || "/index" },
    data: { url: d.url || "/" },
  });
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";
  event.waitUntil(clients.openWindow(url));
});
