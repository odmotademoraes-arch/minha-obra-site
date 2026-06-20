import React, { useEffect, useState } from 'react'
import { HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AppProvider, useApp } from './store/AppContext'
import { Layout } from './components/layout/Layout'
import Login from './pages/Login'
import Convite from './pages/Convite'
import TrialExpirado from './pages/TrialExpirado'
import Onboarding from './components/Onboarding'
import { Dashboard } from './pages/Dashboard'
import { Obras } from './pages/obras/Obras'
import { ObraDetalhe } from './pages/obras/ObraDetalhe'
import { Funcionarios } from './pages/funcionarios/Funcionarios'
import { FuncionarioDetalhe } from './pages/funcionarios/FuncionarioDetalhe'
import { Financeiro } from './pages/financeiro/Financeiro'
import { Cronograma } from './pages/Cronograma'
import { Seguranca } from './pages/seguranca/Seguranca'
import { RDO } from './pages/RDO'
import { Ponto } from './pages/Ponto'
import { Materiais } from './pages/Materiais'
import { IAAnalise } from './pages/ia/IAAnalise'
import { Alertas } from './pages/Alertas'
import { Relatorios } from './pages/Relatorios'
import { Configuracoes } from './pages/Configuracoes'
import { Fornecedores } from './pages/Fornecedores'
import { supabase } from './lib/supabase'

// Inicializa dark mode a partir do localStorage antes de qualquer render
const temaDark = localStorage.getItem('tema') === 'escuro'
if (temaDark) document.documentElement.classList.add('dark')
else document.documentElement.classList.remove('dark')

function AppRoutes() {
  const { user, supabaseUserId, logout } = useApp()
  const location                          = useLocation()

  const [trialExpirado, setTrialExpirado]     = useState(false)
  const [mostraOnboarding, setOnboarding]     = useState(false)
  const [onboardingChecked, setOBChecked]     = useState(false)

  // Verifica status de trial/assinatura no Supabase
  useEffect(() => {
    if (!user || !supabaseUserId) { setOBChecked(true); return }

    let cancelado = false
    ;(async () => {
      const { data: assinatura } = await supabase
        .from('assinaturas')
        .select('status, trial_fim')
        .eq('usuario_id', supabaseUserId)
        .single()

      if (cancelado) return

      if (assinatura) {
        const emTrial  = assinatura.status === 'trial'
        const trialFim = assinatura.trial_fim ? new Date(assinatura.trial_fim) : null
        const expirou  = emTrial && trialFim && trialFim < new Date()
        setTrialExpirado(Boolean(expirou))
      }

      // Onboarding: só mostra se nunca concluído
      const concluido = localStorage.getItem('onboarding_concluido')
      setOnboarding(!concluido)
      setOBChecked(true)
    })()
    return () => { cancelado = true }
  }, [user, supabaseUserId])

  if (!user) {
    if (location.pathname.startsWith('/convite')) return <Convite />
    return <Login />
  }

  if (trialExpirado) return <TrialExpirado onLogout={logout} />

  if (onboardingChecked && mostraOnboarding && supabaseUserId) {
    return (
      <Onboarding
        usuarioId={supabaseUserId}
        onConcluir={() => setOnboarding(false)}
      />
    )
  }

  return (
    <Layout>
      <Routes>
        <Route path="/"                    element={<Dashboard />} />
        <Route path="/obras"               element={<Obras />} />
        <Route path="/obras/:id"           element={<ObraDetalhe />} />
        <Route path="/funcionarios"        element={<Funcionarios />} />
        <Route path="/funcionarios/:id"    element={<FuncionarioDetalhe />} />
        <Route path="/financeiro"          element={<Financeiro />} />
        <Route path="/cronograma"          element={<Cronograma />} />
        <Route path="/seguranca"           element={<Seguranca />} />
        <Route path="/rdo"                 element={<RDO />} />
        <Route path="/ponto"               element={<Ponto />} />
        <Route path="/materiais"           element={<Materiais />} />
        <Route path="/fornecedores"        element={<Fornecedores />} />
        <Route path="/ia"                  element={<IAAnalise />} />
        <Route path="/alertas"             element={<Alertas />} />
        <Route path="/relatorios"          element={<Relatorios />} />
        <Route path="/configuracoes"       element={<Configuracoes />} />
        <Route path="/convite"             element={<Navigate to="/configuracoes" replace />} />
        <Route path="*"                    element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  )
}

export default function App() {
  return (
    <AppProvider>
      <HashRouter>
        <AppRoutes />
      </HashRouter>
    </AppProvider>
  )
}
