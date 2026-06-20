import React, { useEffect, useState } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import { supabase } from '../lib/supabase'

export default function Layout() {
  const [aguardando, setAguardando] = useState(0)

  useEffect(() => {
    supabase
      .from('clientes_pendentes')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'aguardando')
      .then(({ count }) => setAguardando(count ?? 0))
  }, [])

  return (
    <div className="flex h-screen bg-[#F5F7FA]">
      <Sidebar aguardando={aguardando} />
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  )
}
