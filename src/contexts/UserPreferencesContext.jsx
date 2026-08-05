import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import { useTranslation } from 'react-i18next';

const UserPreferencesContext = createContext({});

export const UserPreferencesProvider = ({ children }) => {
  const { user } = useAuth();
  const { i18n } = useTranslation();
  const [preferences, setPreferences] = useState({
    language: 'en',
    hiddenModules: []
  });
  const [isLoading, setIsLoading] = useState(true);

  // Fetch preferences when user changes
  useEffect(() => {
    const fetchPreferences = async () => {
      if (!user?.id || !user?.current_store_id) {
        setIsLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('user_preferences')
          .select('settings')
          .eq('user_id', user.id)
          .eq('store_id', user.current_store_id)
          .maybeSingle();

        if (error) {
          console.error('Error fetching user preferences:', error);
        } else if (data && data.settings) {
          const dbPrefs = data.settings;
          setPreferences((prev) => ({
            ...prev,
            ...dbPrefs
          }));
          
          if (dbPrefs.language && dbPrefs.language !== i18n.language) {
            i18n.changeLanguage(dbPrefs.language);
          }
        }
      } catch (err) {
        console.error('Unexpected error fetching user preferences:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPreferences();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, user?.current_store_id]);

  const saveTimeoutRef = React.useRef(null);

  // Update preferences function
  const updatePreferences = async (newPrefs) => {
    if (!user?.id || !user?.current_store_id) return;

    // 1. Update local state instantly (Optimistic UI update)
    const updatedPrefs = { ...preferences, ...newPrefs };
    setPreferences(updatedPrefs);

    if (newPrefs.language && newPrefs.language !== i18n.language) {
      i18n.changeLanguage(newPrefs.language);
    }

    // 2. Persist to Supabase (Debounced by 1 second to reduce DB load)
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(async () => {
      try {
        const { error } = await supabase
          .from('user_preferences')
          .upsert({
            user_id: user.id,
            store_id: user.current_store_id,
            settings: updatedPrefs,
            updated_at: new Date().toISOString()
          }, { onConflict: 'user_id,store_id' });

        if (error) {
          console.error('Error saving user preferences to DB:', error);
        }
      } catch (err) {
        console.error('Unexpected error saving user preferences:', err);
      }
    }, 1000); // 1000ms delay
  };

  const toggleHiddenModule = async (moduleName) => {
    const isHidden = preferences.hiddenModules.includes(moduleName);
    const newHiddenModules = isHidden
      ? preferences.hiddenModules.filter(m => m !== moduleName)
      : [...preferences.hiddenModules, moduleName];
      
    await updatePreferences({ hiddenModules: newHiddenModules });
  };

  const changeLanguage = async (lang) => {
    await updatePreferences({ language: lang });
  };

  return (
    <UserPreferencesContext.Provider
      value={{
        preferences,
        isLoading,
        updatePreferences,
        toggleHiddenModule,
        changeLanguage
      }}
    >
      {children}
    </UserPreferencesContext.Provider>
  );
};

export const useUserPreferences = () => useContext(UserPreferencesContext);
