import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { api } from '@/api/client';

const QuickAccessContext = createContext();

export const QuickAccessProvider = ({ children }) => {
  const [quickAccessItems, setQuickAccessItems] = useState([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load quick access items from the user's database record
  useEffect(() => {
    const loadQuickAccess = async () => {
      try {
        const user = await api.auth.me();
        if (user?.quick_access_modules && Array.isArray(user.quick_access_modules)) {
          setQuickAccessItems(user.quick_access_modules);
        }
      } catch (e) {
        // Fallback to localStorage if database read fails
        try {
          const stored = localStorage.getItem('tradixa_quick_access');
          if (stored) {
            setQuickAccessItems(JSON.parse(stored));
          }
        } catch (_) {
          // Silently ignore
        }
      }
      setIsLoaded(true);
    };
    loadQuickAccess();
  }, []);

  // Persist to database and localStorage
  const persistQuickAccess = useCallback(async (items) => {
    // Always save to localStorage as fallback
    localStorage.setItem('tradixa_quick_access', JSON.stringify(items));

    // Save to database
    try {
      await api.auth.updateMe({ quick_access_modules: items });
    } catch (e) {
      console.warn('[Tradixa] Failed to save quick access to database:', e);
    }
  }, []);

  const toggleQuickAccess = useCallback((pageName) => {
    setQuickAccessItems(prev => {
      const exists = prev.includes(pageName);
      const newItems = exists
        ? prev.filter(p => p !== pageName)
        : [...prev, pageName];
      
      persistQuickAccess(newItems);
      return newItems;
    });
  }, [persistQuickAccess]);

  const isQuickAccess = useCallback((pageName) => {
    return quickAccessItems.includes(pageName);
  }, [quickAccessItems]);

  return (
    <QuickAccessContext.Provider value={{
      quickAccessItems,
      toggleQuickAccess,
      isQuickAccess,
      isLoaded
    }}>
      {children}
    </QuickAccessContext.Provider>
  );
};

export const useQuickAccess = () => {
  const context = useContext(QuickAccessContext);
  if (!context) {
    // Return a safe fallback if used outside provider
    return {
      quickAccessItems: [],
      toggleQuickAccess: () => {},
      isQuickAccess: () => false,
      isLoaded: false
    };
  }
  return context;
};
