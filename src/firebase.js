import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage, isSupported } from 'firebase/messaging';
import { toast } from 'sonner';

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

// Initialize Firebase Cloud Messaging safely
export let messaging = null;

isSupported().then((supported) => {
  if (supported) {
    messaging = getMessaging(app);
  } else {
    console.warn('Firebase Messaging tidak didukung di browser ini (harus HTTPS atau localhost).');
  }
}).catch(err => console.error("Error checking FCM support:", err));

export const requestNotificationPermission = async () => {
  if (!messaging) return null;
  
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
  if (!messaging) return;
  
  return onMessage(messaging, (payload) => {
    console.log('Pesan FCM diterima saat aplikasi terbuka: ', payload);
    
    // KITA MATIKAN TOAST FCM DI DESKTOP AGAR TIDAK DOUBLE DENGAN NOTIFICATIONS.JSX
    // Notifikasi FCM akan tetap masuk ke HP secara native!
    
    // Dispatch event agar Notifikasi Hitam (Notifications.jsx) bisa me-refresh data secara realtime
    window.dispatchEvent(new CustomEvent('fcm-received', { detail: payload }));
    
    /*
    toast.success(payload.notification?.title || 'Notifikasi Baru', {
      description: payload.notification?.body,
      duration: 5000,
      position: 'top-right'
    });
    */
  });
};
