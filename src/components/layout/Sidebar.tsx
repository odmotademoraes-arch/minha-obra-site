import React, { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Building2, Users, DollarSign, Calendar, Shield,
  ClipboardList, Clock, Package, Brain, BarChart3, Settings,
  ChevronLeft, ChevronRight, LogOut, Bell, Zap, Lock, Truck, Camera
} from 'lucide-react'
import { useApp } from '../../store/AppContext'
import { usePermissoes } from '../../hooks/usePermissoes'
import { PlanBadge } from '../plan/PlanBadge'

// modulo: chave em Permissoes ou null = sempre visível
const NAV_ITEMS = [
  { path: '/',              icon: LayoutDashboard, label: 'Dashboard',    plusOnly: false, modulo: null },
  { path: '/obras',         icon: Building2,       label: 'Obras',        plusOnly: false, modulo: 'obras' },
  { path: '/funcionarios',  icon: Users,           label: 'Funcionários', plusOnly: false, modulo: 'funcionarios' },
  { path: '/financeiro',    icon: DollarSign,      label: 'Financeiro',   plusOnly: false, modulo: 'financeiro' },
  { path: '/cronograma',    icon: Calendar,        label: 'Cronograma',   plusOnly: false, modulo: 'obras' },
  { path: '/seguranca',     icon: Shield,          label: 'Segurança',    plusOnly: false, modulo: 'sst' },
  { path: '/rdo',           icon: ClipboardList,   label: 'Diário de Obra', plusOnly: false, modulo: 'obras' },
  { path: '/ponto',         icon: Clock,           label: 'Ponto',        plusOnly: false, modulo: 'funcionarios' },
  { path: '/materiais',     icon: Package,         label: 'Materiais',    plusOnly: false, modulo: 'obras' },
  { path: '/fornecedores',  icon: Truck,           label: 'Fornecedores', plusOnly: false, modulo: 'obras' },
  { path: '/ia',            icon: Brain,           label: 'IA Análise',   plusOnly: true,  modulo: 'ia' },
  { path: '/relatorios',    icon: BarChart3,       label: 'Relatórios',   plusOnly: false, modulo: null },
  { path: '/alertas',       icon: Bell,            label: 'Alertas',      plusOnly: false, modulo: null },
  { path: '/configuracoes', icon: Settings,        label: 'Configurações',plusOnly: false, modulo: 'configuracoes' },
] as const

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout, alertasCount, plano, invoke, updateUser } = useApp()
  const permissoes = usePermissoes()

  async function handleChangeFoto() {
    const filePath = await invoke('dialog:open-file', {
      title: 'Selecionar Foto de Perfil',
      filters: [{ name: 'Imagens', extensions: ['jpg', 'jpeg', 'png', 'webp'] }]
    })
    if (!filePath) return
    const dest = await invoke('file:save-copy', {
      sourcePath: filePath,
      destName: `avatar-${user?.id}-${Date.now()}${filePath.slice(filePath.lastIndexOf('.'))}`
    })
    await invoke('usuarios:update-foto', { id: user?.id, foto_url: dest })
    updateUser({ foto_url: dest })
  }

  const initials = user?.nome
    ? user.nome.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()
    : '?'

  return (
    <aside className={`flex flex-col h-full bg-[#1A1A2E] text-white transition-all duration-200 ${collapsed ? 'w-16' : 'w-60'} flex-shrink-0`}>

      {/* Perfil no topo */}
      <div className={`flex items-center gap-3 px-3 py-4 border-b border-white/10 ${collapsed ? 'justify-center flex-col' : ''}`}>
        {/* Avatar — clicável para trocar foto */}
        <button onClick={handleChangeFoto} title="Clique para trocar a foto"
          className="relative flex-shrink-0 group">
          {user?.foto_url ? (
            <img
              src={`file://${user.foto_url}`}
              alt="Foto de perfil"
              className="w-10 h-10 rounded-full object-cover ring-2 ring-[#E85D04]/60 group-hover:ring-[#E85D04] transition-all"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-[#E85D04] flex items-center justify-center text-sm font-bold ring-2 ring-[#E85D04]/60 group-hover:ring-[#E85D04] transition-all">
              {initials}
            </div>
          )}
          <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-[#0F3460] rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <Camera size={9} className="text-white" />
          </span>
        </button>

        {/* Nome + profissão */}
        {!collapsed && (
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="text-sm font-bold truncate leading-tight">{user?.nome || 'Usuário'}</p>
              {plano === 'PLUS' && <PlanBadge />}
            </div>
            <p className="text-xs text-white/50 truncate mt-0.5">
              {user?.cargo || user?.perfil || 'Minha Obra'}
            </p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 scrollable">
        {NAV_ITEMS.filter(({ modulo }) => {
          if (!modulo) return true
          const nivel = permissoes[modulo as keyof typeof permissoes]
          return nivel !== false
        }).map(({ path, icon: Icon, label, plusOnly }) => {
          const active = location.pathname === path || (path !== '/' && location.pathname.startsWith(path))
          const locked = plusOnly && plano !== 'PLUS'
          return (
            <button key={path} onClick={() => navigate(path)} title={collapsed ? label : undefined}
              className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-all relative
                ${active ? 'bg-[#E85D04] text-white' : 'text-white/70 hover:bg-white/10 hover:text-white'}
                ${collapsed ? 'justify-center' : ''}`}>
              <Icon size={18} className="flex-shrink-0" />
              {!collapsed && (
                <span className="font-medium flex-1 text-left">{label}</span>
              )}
              {!collapsed && locked && <Lock size={12} className="text-white/40" />}
              {!collapsed && plusOnly && plano === 'PLUS' && <Zap size={11} className="text-yellow-300" />}
              {label === 'Alertas' && alertasCount > 0 && (
                <span className={`${collapsed ? 'absolute top-1 right-1' : 'ml-auto'} bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold`}>
                  {alertasCount > 9 ? '9+' : alertasCount}
                </span>
              )}
            </button>
          )
        })}
      </nav>

      {/* Sair */}
      <div className="border-t border-white/10">
        {!collapsed && (
          <button onClick={logout}
            className="w-full flex items-center gap-3 px-4 py-3 text-sm text-white/50 hover:text-white hover:bg-white/10 transition-colors">
            <LogOut size={16} />
            <span>Sair</span>
          </button>
        )}
        {collapsed && (
          <button onClick={logout} title="Sair"
            className="w-full flex items-center justify-center py-3 text-white/40 hover:text-white hover:bg-white/10 transition-colors">
            <LogOut size={16} />
          </button>
        )}
        <button onClick={() => setCollapsed(!collapsed)}
          className="w-full flex items-center justify-center py-2.5 text-white/40 hover:text-white hover:bg-white/10 transition-colors border-t border-white/5">
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>
    </aside>
  )
}
