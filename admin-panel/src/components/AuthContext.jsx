import React, { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL || 'admminhaobra@gmail.com'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState('')

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const u = data.session?.user ?? null
      if (u && u.email !== ADMIN_EMAIL) {
        supabase.auth.signOut()
        setUser(null)
      } else {
        setUser(u)
      }
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user ?? null
      if (u && u.email !== ADMIN_EMAIL) {
        supabase.auth.signOut()
        setUser(null)
      } else {
        setUser(u)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function signIn(email, password) {
    setError('')
    if (email.trim().toLowerCase() !== ADMIN_EMAIL) {
      setError('Acesso não autorizado.')
      return false
    }
    const { error: err } = await supabase.auth.signInWithPassword({ email, password })
    if (err) {
      setError('E-mail ou senha incorretos.')
      return false
    }
    return true
  }

  async function signOut() {
    await supabase.auth.signOut()
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, error, setError, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
