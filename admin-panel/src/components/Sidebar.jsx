import React from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { LayoutDashboard, Users, BrainCircuit, DollarSign, Settings, LogOut, HardHat } from 'lucide-react'
import { useAuth } from './AuthContext'

const NAV = [
  { to: '/',             icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/clientes',     icon: Users,           label: 'Clientes' },
  { to: '/uso-ia',       icon: BrainCircuit,    label: 'Uso de IA' },
  { to: '/financeiro',   icon: DollarSign,      label: 'Financeiro' },
  { to: '/configuracoes',icon: Settings,        label: 'Configurações' },
]

export default function Sidebar({ aguardando = 0 }) {
  const { signOut } = useAuth()
  const navigate    = useNavigate()

  async function handleSair() {
    await signOut()
    navigate('/login')
  }

  return (
    <aside className="w-64 flex-shrink-0 bg-[#1E3A5F] text-white flex flex-col h-screen sticky top-0">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-white/10">
        <div className="w-10 h-10 rounded-xl bg-[#F97316] flex items-center justify-center flex-shrink-0">
          <HardHat size={22} className="text-white" />
        </div>
        <div>
          <p className="font-titulo italic text-white text-lg leading-tight">MINHA OBRA</p>
          <p className="text-white/50 text-[11px]">Painel Administrativo</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 scrollable overflow-y-auto">
        {NAV.map(({ to, icon: Icon, label }) => (
          <NavLink key={to} to={to} end={to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-6 py-3 text-sm transition-colors relative
               ${isActive ? 'bg-[#F97316] text-white font-semibold' : 'text-white/70 hover:bg-white/10 hover:text-white'}`
            }>
            <Icon size={18} className="flex-shrink-0" />
            <span>{label}</span>
            {label === 'Clientes' && aguardando > 0 && (
              <span className="ml-auto bg-[#F5C518] text-[#1F2937] text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                {aguardando > 9 ? '9+' : aguardando}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Sair */}
      <div className="border-t border-white/10 p-4">
        <button onClick={handleSair}
          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
          <LogOut size={16} />
          <span>Sair</span>
        </button>
      </div>
    </aside>
  )
}
