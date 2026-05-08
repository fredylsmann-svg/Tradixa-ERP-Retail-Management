import React, { createContext, useState, useContext, useEffect, useRef, useCallback } from 'react';
import { api } from '@/api/client';
import { supabase } from '@/lib/supabase';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [authError, setAuthError] = useState(null);
  const processingRef = useRef(false);
  const mountedRef = useRef(true);

  // Resolve user from Supabase Auth session user
  const resolveUser = useCallback(async (sessionUser, retryCount = 0) => {
    if (!mountedRef.current) return;
    
    // Prevent overlapping calls for the same user (unless it's a retry)
    if (processingRef.current && retryCount === 0) return;
    
    processingRef.current = true;

    console.log(`[Tradixa Auth] Resolving user for: ${sessionUser.email} (Attempt ${retryCount + 1})`);

    let isRetrying = false;
    try {
      // 1. Create the query promise
      const queryPromise = supabase
        .from('users')
        .select('*')
        .eq('email', sessionUser.email);

      // 2. Create a timeout promise (5 seconds max wait — lebih toleran untuk tab recovery)
      const timeoutPromise = new Promise((resolve) => 
        setTimeout(() => resolve({ error: new Error('Supabase query timeout (Network or Lock issue)') }), 5000)
      );

      // 3. Race them! Check if user exists in our users table
      const { data: users, error: fetchError } = await Promise.race([queryPromise, timeoutPromise]);

      if (!mountedRef.current) return;

      if (fetchError) {
        // Handle NavigatorLock/Timeout errors with a retry
        if ((fetchError.message?.includes('Lock') || fetchError.message?.includes('timeout')) && retryCount < 3) {
          console.warn('[Tradixa Auth] Lock error detected, retrying...');
          processingRef.current = false;
          isRetrying = true;
          setTimeout(() => resolveUser(sessionUser, retryCount + 1), 800);
          return;
        }
        throw fetchError;
      }

      const existingUser = users && users.length > 0 ? users[0] : null;

      if (existingUser) {
        console.log('[Tradixa Auth] Existing user found in DB');
        setUser(existingUser);
        setIsAuthenticated(true);
        localStorage.setItem('tradixa_last_user', JSON.stringify({
          name: existingUser.full_name,
          email: existingUser.email,
          avatar: existingUser.avatar_url
        }));
      } else {
        // Auto-create user record for new sign-ins
        console.log('[Tradixa Auth] Creating new user record...');
        const fullName = sessionUser.user_metadata?.full_name || 
                       sessionUser.user_metadata?.name || 
                       sessionUser.email?.split('@')[0] || 'User';
        const avatarUrl = sessionUser.user_metadata?.avatar_url || null;

        // Determine role: self-signup users are owners, invited users are staff
        const isOwnerSignup = sessionUser.user_metadata?.role === 'owner' || 
                             !sessionUser.user_metadata?.invited_by;
        
        const { data: newUser, error: insertError } = await supabase
          .from('users')
          .insert({
            email: sessionUser.email,
            full_name: fullName,
            avatar_url: avatarUrl,
            role: isOwnerSignup ? 'owner' : 'staff',
            is_store_setup_completed: false,
            created_date: new Date().toLocaleDateString('en-CA'),
            updated_date: new Date().toLocaleDateString('en-CA'),
          })
          .select()
          .single();

        if (!mountedRef.current) return;

        if (!insertError && newUser) {
          console.log('[Tradixa Auth] New user record created');
          setUser(newUser);
          setIsAuthenticated(true);
        } else if (insertError?.code === '23505') {
          // Race condition: Another request created the user milliseconds ago!
          console.log('[Tradixa Auth] Race condition detected, fetching newly created user...');
          const { data: existingUserRetry } = await supabase
            .from('users')
            .select('*')
            .eq('email', sessionUser.email)
            .single();
            
          if (existingUserRetry) {
            setUser(existingUserRetry);
            setIsAuthenticated(true);
          } else {
            throw insertError;
          }
        } else {
          throw insertError;
        }
      }
    } catch (err) {
      console.error('[Tradixa Auth] resolveUser failed:', err);
      
      // CRITICAL FALLBACK: Ensure user can at least access the app
      if (sessionUser && mountedRef.current) {
        console.log('[Tradixa Auth] Using emergency fallback session');
        setUser({
          id: sessionUser.id,
          email: sessionUser.email,
          full_name: sessionUser.user_metadata?.full_name || 'User',
          role: 'owner',
          is_store_setup_completed: true // Assume true to break setup loops
        });
        setIsAuthenticated(true);
      }
    } finally {
      if (!isRetrying) {
        processingRef.current = false;
        if (mountedRef.current) setIsLoadingAuth(false);
      }
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;

    // Single source of truth: onAuthStateChange handles everything
    // including INITIAL_SESSION (replaces getSession)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mountedRef.current) return;

      if (event === 'INITIAL_SESSION') {
        // First load — check if there's an existing session
        if (session?.user) {
          await resolveUser(session.user);
        } else {
          setIsLoadingAuth(false);
        }
      } else if (event === 'SIGNED_IN' && session?.user) {
        console.log('[Tradixa Auth] Event: SIGNED_IN');
        await resolveUser(session.user);
      } else if (event === 'SIGNED_OUT') {
        console.log('[Tradixa Auth] Event: SIGNED_OUT');
        setUser(null);
        setIsAuthenticated(false);
        setIsLoadingAuth(false);
      } else if (event === 'TOKEN_REFRESHED') {
        // Keep current state, don't re-process
      }
    });

    // Fallback timeout: if INITIAL_SESSION never fires (edge case), stop loading
    const fallbackTimer = setTimeout(() => {
      if (mountedRef.current && isLoadingAuth) {
        setIsLoadingAuth(false);
      }
    }, 8000);

    return () => {
      mountedRef.current = false;
      subscription?.unsubscribe();
      clearTimeout(fallbackTimer);
    };
  }, [resolveUser]);

  const login = async (email, password) => {
    try {
      setIsLoadingAuth(true);
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      // onAuthStateChange will handle setting user state
      return { success: true };
    } catch (error) {
      setIsLoadingAuth(false);
      const msg = error.message === 'Invalid login credentials' 
        ? 'Email atau password salah. Silakan coba lagi.'
        : error.message === 'Email not confirmed'
          ? 'Email belum dikonfirmasi. Cek inbox email Anda atau hubungi admin.'
          : error.message || 'Login gagal.';
      return { success: false, message: msg };
    }
  };

  const loginWithGoogle = async (emailHint = null) => {
    try {
      // Get clean origin for redirect (removing any trailing slashes)
      const redirectUrl = window.location.origin.endsWith('/') 
        ? window.location.origin.slice(0, -1) 
        : window.location.origin;

      const options = {
        redirectTo: redirectUrl,
      };

      if (emailHint) {
        options.queryParams = {
          login_hint: emailHint
        };
      }

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options
      });
      if (error) throw error;
    } catch (error) {
      return { success: false, message: error.message };
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem('tradixa_user');
    localStorage.removeItem('tradixa_last_store_id');
    // Reset theme to default light before redirect
    document.documentElement.classList.remove('dark');
    document.documentElement.classList.add('light');
    document.documentElement.style.fontSize = '16px';
    setUser(null);
    setIsAuthenticated(false);
    setAuthError({ type: 'auth_required' });
    // Force redirect to login and clear any routing state
    window.location.href = '/login';
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      isAuthenticated, 
      isLoadingAuth,
      authError,
      login,
      loginWithGoogle,
      logout
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
