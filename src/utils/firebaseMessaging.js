import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, isSupported } from 'firebase/messaging';
import { supabase } from '@/lib/supabase';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

let messaging = null;

// Initialize Firebase App and Messaging
export const initFirebaseMessaging = async () => {
  if (messaging) return messaging;
  try {
    const supported = await isSupported();
    if (!supported) {
      console.warn("[FCM] Push notifications are not supported on this browser.");
      return null;
    }
    const app = initializeApp(firebaseConfig);
    messaging = getMessaging(app);
    return messaging;
  } catch (err) {
    console.error("[FCM] Failed to initialize Firebase Messaging:", err);
    return null;
  }
};

// Check if browser has granted permission
export const getNotificationPermissionState = () => {
  if (!('Notification' in window)) return 'unsupported';
  return Notification.permission;
};

// Retrieve token for the current device
export const getCurrentDeviceToken = async () => {
  try {
    const msg = await initFirebaseMessaging();
    if (!msg) return null;

    const registration = await navigator.serviceWorker.ready;
    if (!registration) return null;

    return await getToken(msg, {
      vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
      serviceWorkerRegistration: registration
    });
  } catch (err) {
    console.error("[FCM] Error getting current device token:", err);
    return null;
  }
};

// Register the device and save token to Supabase
export const registerDeviceForPush = async (user, storeId) => {
  if (!user || !storeId) {
    throw new Error("Missing user or store_id for push registration.");
  }

  try {
    const msg = await initFirebaseMessaging();
    if (!msg) {
      throw new Error("Push notifications are not supported on this browser.");
    }

    // Request notification permission with a 15-second timeout
    const permission = await Promise.race([
      Notification.requestPermission(),
      new Promise((_, reject) => setTimeout(() => reject(new Error("Permintaan izin notifikasi diblokir atau tidak direspon oleh browser Anda.")), 15000))
    ]);
    
    if (permission !== 'granted') {
      throw new Error("Izin notifikasi ditolak oleh pengguna. Silakan aktifkan izin notifikasi di pengaturan browser Anda.");
    }

    // Get VitePWA active service worker registration with a 5-second timeout
    const registration = await Promise.race([
      navigator.serviceWorker.ready,
      new Promise((_, reject) => setTimeout(() => reject(new Error("PWA Service Worker tidak merespon. Pastikan Anda mengakses melalui koneksi aman HTTPS / Production Build.")), 5000))
    ]);
    if (!registration) {
      throw new Error("PWA Service Worker registration not ready.");
    }

    // Request FCM Token from Firebase
    const token = await getToken(msg, {
      vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
      serviceWorkerRegistration: registration
    });

    if (!token) {
      throw new Error("Firebase returned an empty token.");
    }

    // Detect device type / name
    const userAgent = navigator.userAgent;
    let deviceName = 'Web Browser';
    if (/android/i.test(userAgent)) {
      deviceName = 'Android Device';
    } else if (/ipad|iphone|ipod/i.test(userAgent)) {
      deviceName = 'iOS Device';
    } else if (/macintosh/i.test(userAgent)) {
      deviceName = 'MacBook/Mac';
    } else if (/windows/i.test(userAgent)) {
      deviceName = 'Windows PC';
    } else if (/linux/i.test(userAgent)) {
      deviceName = 'Linux Device';
    }

    // Verify plan gating
    const { data: store, error: storeError } = await supabase
      .from('stores')
      .select('plan')
      .eq('id', storeId)
      .single();

    if (storeError || !store) {
      throw new Error("Gagal memverifikasi paket toko Anda.");
    }

    if (store.plan !== 'premium') {
      throw new Error("Notifikasi push eksklusif untuk toko dengan Paket Premium.");
    }

    // Save token to Supabase user_push_subscriptions table
    const { error } = await supabase
      .from('user_push_subscriptions')
      .upsert({
        user_id: user.id || user.auth_id,
        store_id: storeId,
        device_name: deviceName,
        fcm_token: token,
        updated_at: new Date().toISOString()
      }, { onConflict: 'fcm_token' });

    if (error) throw error;

    return token;
  } catch (err) {
    console.error("[FCM] Failed to register device for push notifications:", err);
    throw err;
  }
};

// Unregister device and delete token from Supabase
export const unregisterDeviceFromPush = async (token) => {
  if (!token) return;
  try {
    const { error } = await supabase
      .from('user_push_subscriptions')
      .delete()
      .eq('fcm_token', token);

    if (error) throw error;
  } catch (err) {
    console.error("[FCM] Failed to unregister device from push notifications:", err);
    throw err;
  }
};
