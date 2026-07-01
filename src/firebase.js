import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';

// Mengambil config dari .env file
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Cloud Messaging and get a reference to the service
export const messaging = getMessaging(app);

export const requestNotificationPermission = async () => {
  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      const currentToken = await getToken(messaging, { 
        vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY 
      });
      if (currentToken) {
        console.log('Firebase FCM Token berhasil didapatkan:', currentToken);
        return currentToken;
      } else {
        console.log('Tidak ada Registration Token yang tersedia. Minta izin notifikasi terlebih dahulu.');
      }
    } else {
      console.log('Izin Notifikasi ditolak oleh pengguna.');
    }
  } catch (error) {
    console.error('Terjadi kesalahan saat mengambil token FCM:', error);
  }
  return null;
};

// Fungsi untuk mendengarkan pesan saat aplikasi sedang terbuka di layar (Foreground)
export const onForegroundMessage = () => {
  return onMessage(messaging, (payload) => {
    console.log('Pesan diterima saat aplikasi terbuka: ', payload);
    // Di sini Anda bisa memunculkan Toast / Alert tambahan jika mau
  });
};
