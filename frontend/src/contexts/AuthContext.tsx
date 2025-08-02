import React, { createContext, useContext, useEffect, useState } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { updateApiToken } from '../lib/api'

interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  signUp: (email: string, password: string, name?: string) => Promise<{ error: any }>
  signIn: (email: string, password: string) => Promise<{ error: any }>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<{ error: any }>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

interface AuthProviderProps {
  children: React.ReactNode
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)

      // Update API token
      if (session?.access_token) {
        updateApiToken(session.access_token)
      } else {
        updateApiToken(null)
      }
    }

    getInitialSession()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session)
        setUser(session?.user ?? null)
        setLoading(false)

        // Update API token when auth state changes
        if (session?.access_token) {
          updateApiToken(session.access_token)
        } else {
          updateApiToken(null)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const signUp = async (email: string, password: string, name?: string) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name: name || 'User',
          },
        },
      })

      if (error) {
        return { error }
      }

      // If user is created successfully, create profile in our database
      if (data.user) {
        console.log('🔐 Supabase user created, calling backend to create profile...')
        try {
          const response = await fetch('http://localhost:8000/auth/signup', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              email,
              password,
              name: name || 'User',
            }),
          })

          if (!response.ok) {
            console.error('❌ Failed to create user profile:', response.status, response.statusText)
            const errorText = await response.text()
            console.error('Error details:', errorText)
          } else {
            console.log('✅ User profile created successfully in backend')
          }
        } catch (error) {
          console.error('❌ Error creating user profile:', error)
        }

        // Also update the profile with the user's real data
        try {
          await updateProfileWithUserData(data.user)
        } catch (error) {
          console.error('Failed to update profile with user data:', error)
        }
      }

      return { error: null }
    } catch (error) {
      return { error }
    }
  }

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        return { error }
      }

      // If login successful, update the user profile with real data
      if (data.user) {
        try {
          await updateProfileWithUserData(data.user)
        } catch (error) {
          console.error('Failed to update profile with user data:', error)
        }
      }

      return { error: null }
    } catch (error) {
      return { error }
    }
  }

  const updateProfileWithUserData = async (user: User) => {
    try {
      // Get the current session to access the token
      const { data: { session } } = await supabase.auth.getSession()

      const response = await fetch('http://localhost:8000/profile/', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token || ''}`,
        },
        body: JSON.stringify({
          name: user.user_metadata?.name || user.email?.split('@')[0] || 'User',
          profile_picture_url: user.user_metadata?.avatar_url || null,
        }),
      })

      if (!response.ok) {
        console.error('Failed to update profile with user data:', response.status)
      } else {
        console.log('✅ Profile updated with user data successfully')
      }
    } catch (error) {
      console.error('Error updating profile with user data:', error)
    }
  }

  const signOut = async () => {
    try {
      await supabase.auth.signOut()
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  const resetPassword = async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      })

      return { error }
    } catch (error) {
      return { error }
    }
  }

  const value = {
    user,
    session,
    loading,
    signUp,
    signIn,
    signOut,
    resetPassword,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
