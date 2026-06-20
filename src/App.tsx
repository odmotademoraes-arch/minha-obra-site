import React from 'react'
import { HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AppProvider, useApp } from './store/AppContext'
import { Layout } from './components/layout/Layout'
import Login from './pages/Login'
import Convite from './pages/Convite'
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

function AppRoutes() {
  const { user } = useApp()
  const location = useLocation()

  // /convite é acessível sem login (aceite de convite)
  if (!user) {
    if (location.pathname.startsWith('/convite')) return <Convite />
    return <Login />
  }

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/obras" element={<Obras />} />
        <Route path="/obras/:id" element={<ObraDetalhe />} />
        <Route path="/funcionarios" element={<Funcionarios />} />
        <Route path="/funcionarios/:id" element={<FuncionarioDetalhe />} />
        <Route path="/financeiro" element={<Financeiro />} />
        <Route path="/cronograma" element={<Cronograma />} />
        <Route path="/seguranca" element={<Seguranca />} />
        <Route path="/rdo" element={<RDO />} />
        <Route path="/ponto" element={<Ponto />} />
        <Route path="/materiais" element={<Materiais />} />
        <Route path="/fornecedores" element={<Fornecedores />} />
        <Route path="/ia" element={<IAAnalise />} />
        <Route path="/alertas" element={<Alertas />} />
        <Route path="/relatorios" element={<Relatorios />} />
        <Route path="/configuracoes" element={<Configuracoes />} />
        <Route path="/convite" element={<Navigate to="/configuracoes" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
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
