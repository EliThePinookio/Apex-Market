import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, Session, AuthChangeEvent } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '../supabase';
import { UserProfile, AppUserRole } from '../types';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  businessId: string | null;
  role: AppUserRole;
  isLoading: boolean;
  isConfigured: boolean;
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signUp: (
    email: string,
    password: string,
    fullName?: string,
    businessName?: string
  ) => Promise<{ success: boolean; error?: string; message?: string }>;
  resetPassword: (email: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [role, setRole] = useState<AppUserRole>('owner');
  const [isLoading, setIsLoading] = useState(true);

  // Load or create business profile in Supabase
  const loadOrCreateProfile = useCallback(async (currentUser: User) => {
    if (!currentUser) return;
    try {
      // 1. Try to fetch profile from Supabase 'profiles' table
      const { data: profData, error: profErr } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', currentUser.id)
        .maybeSingle();

      if (profData) {
        setProfile({
          id: profData.id,
          email: profData.email || currentUser.email || '',
          fullName: profData.full_name || currentUser.user_metadata?.full_name || '',
          businessId: profData.business_id,
          role: (profData.role as AppUserRole) || 'owner',
          createdAt: profData.created_at || new Date().toISOString(),
        });
        setBusinessId(profData.business_id || currentUser.id);
        setRole((profData.role as AppUserRole) || 'owner');
        return;
      }

      // If no profile exists yet (new registration), create one
      let bId = currentUser.id;
      const bName = currentUser.user_metadata?.business_name || 'BEANNEL';
      const fName = currentUser.user_metadata?.full_name || currentUser.email?.split('@')[0] || 'Store Owner';

      // Check if business exists or create it
      const { data: bData } = await supabase
        .from('businesses')
        .select('id')
        .eq('owner_id', currentUser.id)
        .maybeSingle();

      if (bData?.id) {
        bId = bData.id;
      } else {
        const { data: newB, error: newBErr } = await supabase
          .from('businesses')
          .insert({
            name: bName,
            owner_name: fName,
            owner_id: currentUser.id,
            currency_symbol: '$',
          })
          .select('id')
          .maybeSingle();
        if (newB?.id) {
          bId = newB.id;
        }
      }

      // Upsert profile
      const newProfile: UserProfile = {
        id: currentUser.id,
        email: currentUser.email || '',
        fullName: fName,
        businessId: bId,
        role: 'owner',
        createdAt: new Date().toISOString(),
      };

      await supabase.from('profiles').upsert({
        id: currentUser.id,
        email: currentUser.email,
        full_name: fName,
        business_id: bId,
        role: 'owner',
        updated_at: new Date().toISOString(),
      });

      setProfile(newProfile);
      setBusinessId(bId);
      setRole('owner');
    } catch (err) {
      console.warn('Profile initialization note:', err);
      // Set resilient default from user metadata
      const fallbackProfile: UserProfile = {
        id: currentUser.id,
        email: currentUser.email || '',
        fullName: currentUser.user_metadata?.full_name || currentUser.email?.split('@')[0] || 'Owner',
        businessId: currentUser.id,
        role: 'owner',
        createdAt: new Date().toISOString(),
      };
      setProfile(fallbackProfile);
      setBusinessId(currentUser.id);
      setRole('owner');
    }
  }, []);

  // Initialize and listen to Supabase auth state changes
  useEffect(() => {
    let isMounted = true;

    async function initAuth() {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) {
          console.warn('Supabase getSession error:', error.message);
        }

        if (isMounted) {
          if (data?.session?.user) {
            setSession(data.session);
            setUser(data.session.user);
            await loadOrCreateProfile(data.session.user);
          } else {
            setSession(null);
            setUser(null);
            setProfile(null);
            setBusinessId(null);
          }
          setIsLoading(false);
        }
      } catch (e) {
        console.warn('Auth initialization fallback:', e);
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    initAuth();

    // Supabase auth subscription for real-time auth changes
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event: AuthChangeEvent, currentSession: Session | null) => {
        if (!isMounted) return;

        setSession(currentSession);
        setUser(currentSession?.user ?? null);

        if (currentSession?.user) {
          await loadOrCreateProfile(currentSession.user);
        } else {
          setProfile(null);
          setBusinessId(null);
          setRole('owner');
        }

        setIsLoading(false);
      }
    );

    return () => {
      isMounted = false;
      authListener?.subscription.unsubscribe();
    };
  }, [loadOrCreateProfile]);

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      if (data.user) {
        setUser(data.user);
        setSession(data.session);
        await loadOrCreateProfile(data.user);
        return { success: true };
      }

      return { success: false, error: 'Failed to authenticate user.' };
    } catch (err: any) {
      return { success: false, error: err?.message || 'An unexpected error occurred during login.' };
    }
  };

  const signUp = async (
    email: string,
    password: string,
    fullName?: string,
    businessName?: string
  ) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            full_name: fullName?.trim() || 'Store Owner',
            business_name: businessName?.trim() || 'BEANNEL',
          },
        },
      });

      if (error) {
        return { success: false, error: error.message };
      }

      if (data.user) {
        // If session was immediately returned (auto confirm enabled in project)
        if (data.session) {
          setUser(data.user);
          setSession(data.session);
          await loadOrCreateProfile(data.user);
          return { success: true, message: 'Account registered and logged in successfully!' };
        } else {
          return {
            success: true,
            message: 'Account registered! Please check your email to confirm registration or sign in.',
          };
        }
      }

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'An unexpected error occurred during sign up.' };
    }
  };

  const resetPassword = async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: window.location.origin,
      });
      if (error) {
        return { success: false, error: error.message };
      }
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Failed to send password reset email.' };
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.warn('Sign out warning:', e);
    } finally {
      setUser(null);
      setSession(null);
      setProfile(null);
      setBusinessId(null);
    }
  };

  const refreshProfile = async () => {
    if (user) {
      await loadOrCreateProfile(user);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        businessId,
        role,
        isLoading,
        isConfigured: isSupabaseConfigured,
        signIn,
        signUp,
        resetPassword,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
