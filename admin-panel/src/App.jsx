import React from 'react'
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './components/AuthContext'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Clientes from './pages/Clientes'
import UsoIA from './pages/UsoIA'
import Financeiro from './pages/Financeiro'
import Configuracoes from './pages/Configuracoes'

function AppRoutes() {
  const { user, loading } = useAuth()

  if (loading) return (
    <div className="min-h-screen bg-[#1E3A5F] flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-3 border-white/30 border-t-white rounded-full animate-spin" style={{ borderWidth: 3 }} />
        <p className="text-white/60 text-sm">Carregando painel...</p>
      </div>
    </div>
  )

  if (!user) return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/"             element={<Dashboard />} />
        <Route path="/clientes"     element={<Clientes />} />
        <Route path="/uso-ia"       element={<UsoIA />} />
        <Route path="/financeiro"   element={<Financeiro />} />
        <Route path="/configuracoes" element={<Configuracoes />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <HashRouter>
        <AppRoutes />
      </HashRouter>
    </AuthProvider>
  )
}
