import React, { createContext, useContext, useState, useCallback, useEffect } from 'react'

declare global {
  interface Window {
    api: {
      invoke: (channel: string, ...args: any[]) => Promise<any>
      openExternal?: (url: string) => void
    }
  }
}

export const invoke = (channel: string, ...args: any[]) => window.api.invoke(channel, ...args)

interface User {
  id: number
  nome: string
  email: string
  perfil: string
  cargo?: string
  foto_url?: string
}

interface Assinatura {
  id: number; plano_id: number; plano_nome: string
  data_inicio: string; data_vencimento: string | null; status: string
}

interface LoginExtras {
  supabaseUserId?: string
  cargo?: string            // 'dono' | 'engenheiro_chefe' | 'engenheiro' | 'tecnico' | 'rh' | 'visualizador'
  donoSupabaseId?: string   // UUID do dono (se membro)
  planoCloud?: string       // 'individual' | 'profissional' | 'corporativo'
}

interface AppContextType {
  user: User | null
  plano: 'FREE' | 'PLUS'
  planoCloud: string
  cargo: string
  supabaseUserId: string | null
  donoSupabaseId: string | null
  assinatura: Assinatura | null
  login: (user: User, plano: string, assinatura: any, extras?: LoginExtras) => void
  logout: () => void
  updateUser: (patch: Partial<User>) => void
  alertasCount: number
  refreshAlertas: () => void
  refreshPlano: () => Promise<void>
  invoke: (channel: string, ...args: any[]) => Promise<any>
}

const AppContext = createContext<AppContextType | null>(null)

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('minha-obra-user')
    return saved ? JSON.parse(saved) : null
  })
  const [plano, setPlano] = useState<'FREE' | 'PLUS'>(() => {
    return (localStorage.getItem('minha-obra-plano') as 'FREE' | 'PLUS') || 'FREE'
  })
  const [planoCloud, setPlanoCloud] = useState(() =>
    localStorage.getItem('minha-obra-plano-cloud') || 'individual'
  )
  const [cargo, setCargo] = useState(() =>
    localStorage.getItem('minha-obra-cargo') || 'dono'
  )
  const [supabaseUserId, setSupabaseUserId] = useState<string | null>(() =>
    localStorage.getItem('minha-obra-suid')
  )
  const [donoSupabaseId, setDonoSupabaseId] = useState<string | null>(() =>
    localStorage.getItem('minha-obra-dono-id')
  )
  const [assinatura, setAssinatura] = useState<Assinatura | null>(() => {
    const saved = localStorage.getItem('minha-obra-assinatura')
    return saved ? JSON.parse(saved) : null
  })
  const [alertasCount, setAlertasCount] = useState(0)

  const login = useCallback((u: User, p: string, a: any, extras?: LoginExtras) => {
    const planoLocal = (p || 'FREE') as 'FREE' | 'PLUS'
    setUser(u)
    setPlano(planoLocal)
    setAssinatura(a || null)
    setPlanoCloud(extras?.planoCloud || 'individual')
    setCargo(extras?.cargo || 'dono')
    setSupabaseUserId(extras?.supabaseUserId || null)
    setDonoSupabaseId(extras?.donoSupabaseId || null)

    localStorage.setItem('minha-obra-user', JSON.stringify(u))
    localStorage.setItem('minha-obra-plano', planoLocal)
    localStorage.setItem('minha-obra-assinatura', JSON.stringify(a || null))
    localStorage.setItem('minha-obra-plano-cloud', extras?.planoCloud || 'individual')
    localStorage.setItem('minha-obra-cargo', extras?.cargo || 'dono')
    if (extras?.supabaseUserId) localStorage.setItem('minha-obra-suid', extras.supabaseUserId)
    else localStorage.removeItem('minha-obra-suid')
    if (extras?.donoSupabaseId) localStorage.setItem('minha-obra-dono-id', extras.donoSupabaseId)
    else localStorage.removeItem('minha-obra-dono-id')
  }, [])

  const logout = useCallback(() => {
    setUser(null)
    setPlano('FREE')
    setAssinatura(null)
    setPlanoCloud('individual')
    setCargo('dono')
    setSupabaseUserId(null)
    setDonoSupabaseId(null)
    ;['minha-obra-user','minha-obra-plano','minha-obra-assinatura',
      'minha-obra-plano-cloud','minha-obra-cargo','minha-obra-suid','minha-obra-dono-id'
    ].forEach(k => localStorage.removeItem(k))
  }, [])

  const updateUser = useCallback((patch: Partial<User>) => {
    setUser(prev => {
      if (!prev) return prev
      const updated = { ...prev, ...patch }
      localStorage.setItem('minha-obra-user', JSON.stringify(updated))
      return updated
    })
  }, [])

  const refreshPlano = useCallback(async () => {
    if (!user) return
    const result = await invoke('assinaturas:get-plano', user.id)
    setPlano(result.plano || 'FREE')
    setAssinatura(result.assinatura || null)
    localStorage.setItem('minha-obra-plano', result.plano || 'FREE')
    localStorage.setItem('minha-obra-assinatura', JSON.stringify(result.assinatura || null))
  }, [user])

  const refreshAlertas = useCallback(async () => {
    if (!user) return
    const alertas = await invoke('alertas:list')
    setAlertasCount(alertas.filter((a: any) => !a.lido).length)
  }, [user])

  useEffect(() => {
    if (user) {
      invoke('alertas:verificar-vencimentos')
      refreshAlertas()
      refreshPlano()
      const interval = setInterval(() => {
        invoke('alertas:verificar-vencimentos')
        refreshAlertas()
      }, 5 * 60 * 1000)
      return () => clearInterval(interval)
    }
  }, [user, refreshAlertas, refreshPlano])

  return (
    <AppContext.Provider value={{
      user, plano, planoCloud, cargo, supabaseUserId, donoSupabaseId,
      assinatura, login, logout, updateUser,
      alertasCount, refreshAlertas, refreshPlano, invoke
    }}>
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
