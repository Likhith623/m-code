import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase, getProfile, signIn, signUp, signOut } from '../lib/supabase';

const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      profile: null,
      session: null,
      loading: true,
      initialized: false,
      error: null,

      // Initialize auth state - optimized for speed
      initialize: async () => {
        // If already initialized, don't do it again
        if (get().initialized) {
          set({ loading: false });
          return;
        }

        try {
          // First, check if we have cached data from persist
          const cachedUser = get().user;
          const cachedProfile = get().profile;
          
          // If we have cached data, use it immediately (no loading state!)
          if (cachedUser && cachedProfile) {
            set({ loading: false, initialized: true });
            
            // Then verify session in background (don't block UI)
            supabase.auth.getSession().then(({ data: { session } }) => {
              if (session?.user) {
                // Session still valid, optionally refresh profile
                getProfile(session.user.id).then(profile => {
                  if (profile) {
                    set({ profile, session, user: session.user });
                  }
                }).catch(() => {});
              } else {
                // Session expired, clear data
                set({ user: null, profile: null, session: null });
              }
            }).catch(() => {});
            
            return;
          }
          
          // No cached data - need to fetch (show loading briefly)
          set({ loading: true });
          
          const { data: { session } } = await supabase.auth.getSession();
          
          if (session?.user) {
            // Get profile with short timeout
            let profile = null;
            try {
              const profilePromise = getProfile(session.user.id);
              const timeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error('timeout')), 3000)
              );
              profile = await Promise.race([profilePromise, timeoutPromise]);
            } catch (e) {
              // Use metadata as fallback
              profile = {
                id: session.user.id,
                email: session.user.email,
                full_name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'User',
                role: session.user.user_metadata?.role || 'customer',
              };
            }
            
            set({
              user: session.user,
              session,
              profile: profile || {
                id: session.user.id,
                email: session.user.email,
                full_name: session.user.user_metadata?.full_name || 'User',
                role: session.user.user_metadata?.role || 'customer',
              },
              loading: false,
              initialized: true,
              error: null,
            });
          } else {
            set({
              user: null,
              session: null,
              profile: null,
              loading: false,
              initialized: true,
              error: null,
            });
          }
        } catch (error) {
          console.error('Auth initialization error:', error);
          set({
            user: null,
            session: null,
            profile: null,
            loading: false,
            initialized: true,
            error: null,
          });
        }
      },

      // Sign up
      register: async (email, password, fullName, role, phone) => {
        try {
          set({ loading: true, error: null });
          
          const { user, session } = await signUp(email, password, fullName, role, phone);
          
          if (user) {
            // Set user data immediately with provided data
            set({
              user,
              session,
              profile: {
                id: user.id,
                email: email,
                full_name: fullName,
                role: role,
                phone: phone,
              },
              loading: false,
              initialized: true,
            });
            
            return { user, session };
          }
          
          set({ loading: false });
          return { user, session };
        } catch (error) {
          set({ loading: false, error: error.message });
          throw error;
        }
      },

      // Sign in - optimized for speed with role verification
      login: async (email, password, expectedRole = null) => {
        try {
          set({ loading: true, error: null });
          
          const { user, session } = await signIn(email, password, expectedRole);
          
          if (user) {
            const role = user.user_metadata?.role || expectedRole || 'customer';
            
            // Set immediately with user metadata
            set({
              user,
              session,
              profile: {
                id: user.id,
                email: user.email,
                full_name: user.user_metadata?.full_name || email.split('@')[0],
                role: role,
              },
              loading: false,
              initialized: true,
            });
            
            // Fetch actual profile in background
            getProfile(user.id).then(profile => {
              if (profile) {
                set({ profile });
              }
            }).catch(() => {});
          }
          
          return { user, session };
        } catch (error) {
          set({ loading: false, error: error.message });
          throw error;
        }
      },

      // Sign out
      logout: async () => {
        try {
          set({ loading: true });
          await signOut();
          set({
            user: null,
            session: null,
            profile: null,
            loading: false,
            error: null,
          });
        } catch (error) {
          set({ loading: false, error: error.message });
          throw error;
        }
      },

      // Update profile
      updateProfile: async (updates) => {
        try {
          const { user } = get();
          if (!user) throw new Error('Not authenticated');
          
          const { data, error } = await supabase
            .from('profiles')
            .update(updates)
            .eq('id', user.id)
            .select()
            .single();
          
          if (error) throw error;
          
          set({ profile: data });
          return data;
        } catch (error) {
          set({ error: error.message });
          throw error;
        }
      },

      // Clear error
      clearError: () => set({ error: null }),

      // Check if user is retailer
      isRetailer: () => {
        const { profile } = get();
        return profile?.role === 'retailer';
      },

      // Check if user is customer
      isCustomer: () => {
        const { profile } = get();
        return profile?.role === 'customer';
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        profile: state.profile,
        session: state.session,
      }),
    }
  )
);

// Listen for auth changes - update state quickly
supabase.auth.onAuthStateChange(async (event, session) => {
  console.log('Auth state change:', event);
  
  if (event === 'SIGNED_IN' && session?.user) {
    // Update immediately with session data
    useAuthStore.setState({
      user: session.user,
      session,
      profile: useAuthStore.getState().profile || {
        id: session.user.id,
        email: session.user.email,
        full_name: session.user.user_metadata?.full_name || 'User',
        role: session.user.user_metadata?.role || 'customer',
      },
      loading: false,
      initialized: true,
    });
    
    // Fetch profile in background
    getProfile(session.user.id).then(profile => {
      if (profile) {
        useAuthStore.setState({ profile });
      }
    }).catch(() => {});
    
  } else if (event === 'SIGNED_OUT') {
    useAuthStore.setState({
      user: null,
      session: null,
      profile: null,
      loading: false,
      initialized: true,
    });
  } else if (event === 'TOKEN_REFRESHED' && session?.user) {
    useAuthStore.setState({
      user: session.user,
      session,
      loading: false,
    });
  }
});

export default useAuthStore;
