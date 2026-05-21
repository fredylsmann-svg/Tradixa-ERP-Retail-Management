// Give the service worker access to Firebase Messaging.
// Note: We use the v10 compat SDK here because it works natively in standard browser service workers.
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js');

// Initialize the Firebase app in the service worker by passing in the messagingSenderId.
firebase.initializeApp({
  apiKey: "AIzaSyBTwCvDXR_kb_y7t91a2KEzDFThjUu_OYs",
  authDomain: "tradixa-rms--pwa-notifications.firebaseapp.com",
  projectId: "tradixa-rms--pwa-notifications",
  storageBucket: "tradixa-rms--pwa-notifications.firebasestorage.app",
  messagingSenderId: "1095140505966",
  appId: "1:1095140505966:web:7911669884eb1a9753697f",
  measurementId: "G-60027V46QQ"
});

// Retrieve an instance of Firebase Messaging so that it can handle background messages.
const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);

  const notificationTitle = payload.notification.title || "Tradixa ERP Notification";
  const notificationOptions = {
    body: payload.notification.body || "",
    icon: '/logo-tradixa.png',
    badge: '/icons/icon-72x72.png',
    data: payload.data || {}
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
