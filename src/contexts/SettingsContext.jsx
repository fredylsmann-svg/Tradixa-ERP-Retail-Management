import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { api } from '@/api/client';

const SettingsContext = createContext({});

export const useSettings = () => useContext(SettingsContext);

const DEFAULT_SETTINGS = {
  fontSize: 'Standard', 
  modalSize: 'Lebar', 
  soundEnabled: true,
  soundVolume: 'Sedang', 
  soundType: 'Modern', 
  theme: 'light', 
  negotiationMode: 'Item', 
  warehouseApprovalMode: 'Single' 
};

// Standalone helper for instant sound
export const playGlobalNotificationSound = (type = 'success', overrideSoundType = null) => {
  try {
    const storageKey = `tradixa_settings_active`;
    const saved = localStorage.getItem(storageKey);
    let settings = { ...DEFAULT_SETTINGS };
    if (saved) { try { settings = { ...settings, ...JSON.parse(saved) }; } catch (e) {} }

    if (!settings.soundEnabled) return;
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    let maxVolume = settings.soundVolume === 'Kecil' ? 0.3 : settings.soundVolume === 'Maksimal' ? 2.0 : 1.0;

    const playTone = (freq, waveType, startTime, duration, vol) => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = waveType;
      osc.frequency.setValueAtTime(freq, startTime);
      osc.connect(gain); gain.connect(audioCtx.destination);
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(vol, startTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
      osc.start(startTime); osc.stop(startTime + duration);
    };

    const soundType = overrideSoundType || settings.soundType || 'Modern';
    const now = audioCtx.currentTime;
    if (type === 'success') {
      if (soundType === 'Modern') { playTone(392, 'sine', now, 0.4, maxVolume * 1.5); playTone(523, 'sine', now + 0.1, 0.6, maxVolume * 1.8); }
      else if (soundType === 'Soft') { playTone(587, 'sine', now, 0.6, maxVolume * 2.0); playTone(880, 'sine', now + 0.15, 0.9, maxVolume * 1.0); }
      else if (soundType === 'Classic') { playTone(440, 'square', now, 0.15, maxVolume * 0.5); playTone(659, 'square', now + 0.3, 0.4, maxVolume * 0.5); }
    }
  } catch (e) {}
};

export const SettingsProvider = ({ children }) => {
  const { user } = useAuth();
  const userId = user?.id;
  const storeId = user?.current_store_id || 'global';
  // Key is scoped per-user AND per-store so each user has independent preferences
  const storageKey = userId ? `tradixa_settings_${userId}_${storeId}` : `tradixa_settings_guest`;
  const isInitialMount = useRef(true);

  const [settings, setSettings] = useState(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) { try { return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) }; } catch (e) {} }
    return { ...DEFAULT_SETTINGS };
  });

  // Reload settings when user/store changes (e.g. after login or store switch)
  useEffect(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try { setSettings(prev => ({ ...DEFAULT_SETTINGS, ...JSON.parse(saved) })); } catch (e) {}
    } else {
      setSettings({ ...DEFAULT_SETTINGS });
    }
    isInitialMount.current = true; // Reset so DB load doesn't trigger save
  }, [storageKey]);

  // Load from DB when store/user changes
  useEffect(() => {
    const loadFromDb = async () => {
      if (!userId || storeId === 'global') return;
      const dbSettings = await api.preferences.get(userId, storeId);
      if (dbSettings) {
        setSettings(prev => ({ ...prev, ...dbSettings }));
        localStorage.setItem(storageKey, JSON.stringify({ ...DEFAULT_SETTINGS, ...dbSettings }));
      }
    };
    loadFromDb();
  }, [userId, storeId, storageKey]);

  // Save to DB and LocalStorage
  useEffect(() => {
    // Avoid saving on first mount to prevent overwriting DB with default local state
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    localStorage.setItem(storageKey, JSON.stringify(settings));
    // Also save to 'active' key for standalone functions (e.g. notification sounds)
    localStorage.setItem('tradixa_settings_active', JSON.stringify(settings));
    if (storeId && storeId !== 'global') {
      localStorage.setItem('tradixa_last_store_id', storeId);
    }

    // Sync to DB (debounce slightly or just run)
    if (userId && storeId !== 'global') {
      const timer = setTimeout(() => {
        api.preferences.save(userId, storeId, settings);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [settings, userId, storeId, storageKey]);

  // Apply Side-effects (Font/Theme)
  useEffect(() => {
    const html = document.documentElement;
    const sizes = { Compact: '14px', Comfortable: '18px', Standard: '16px' };
    html.style.fontSize = sizes[settings.fontSize] || '16px';

    const applyTheme = (val) => {
      html.classList.remove('light', 'dark');
      if (val === 'system') {
        html.classList.add(window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
      } else {
        html.classList.add(val || 'light');
      }
    };
    applyTheme(settings.theme);
  }, [settings.fontSize, settings.theme]);

  const updateSetting = useCallback((key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  }, []);

  const getModalSizeClasses = useCallback(() => {
    switch (settings.modalSize) {
      case 'Standar': return 'max-w-3xl';
      case 'Fullscreen': return 'max-w-[95vw] w-[95vw] h-[95vh]';
      default: return 'max-w-5xl';
    }
  }, [settings.modalSize]);

  return (
    <SettingsContext.Provider value={{
      settings,
      updateSetting,
      getModalSizeClasses,
      playNotificationSound: (t, o) => playGlobalNotificationSound(t, o)
    }}>
      {children}
    </SettingsContext.Provider>
  );
};
