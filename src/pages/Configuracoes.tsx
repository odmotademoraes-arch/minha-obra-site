import React, { useEffect, useState } from 'react'
import { Zap, Crown, CheckCircle, XCircle, RefreshCw, Users, Moon, Sun, Download } from 'lucide-react'
import { useApp } from '../store/AppContext'
import { PageHeader } from '../components/layout/Layout'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Card } from '../components/ui/Card'
import { UpgradeModal } from '../components/plan/UpgradeModal'
import { MinhaEquipe } from '../components/MinhaEquipe'
import { hasSupabase } from '../lib/supabase'
import { formatDate } from '../lib/utils'

function PlanoSection() {
  const { user, plano, assinatura, refreshPlano, invoke } = useApp()
  const [upgradeModal, setUpgradeModal] = useState(false)
  const [cancelLoading, setCancelLoading] = useState(false)

  async function handleCancelar() {
    if (!window.confirm('Deseja cancelar o plano PLUS e voltar ao FREE?')) return
    setCancelLoading(true)
    try {
      await invoke('assinaturas:cancelar', user?.id)
      await refreshPlano()
    } finally { setCancelLoading(false) }
  }

  const isPlus = plano === 'PLUS' && assinatura?.status === 'ativa'
  const vencimento = assinatura?.data_vencimento
  const diasRestantes = vencimento
    ? Math.max(0, Math.ceil((new Date(vencimento).getTime() - Date.now()) / 86400000))
    : null

  return (
    <Card>
      <h3 className="font-semibold text-[#1A1A2E] mb-4">Plano e Assinatura</h3>
      <div className={`rounded-xl p-6 mb-6 ${isPlus ? 'bg-gradient-to-br from-[#E85D04] to-orange-400 text-white' : 'bg-gray-50'}`}>
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              {isPlus ? <Crown size={24} className="text-white" /> : <div className="w-6 h-6 rounded-full bg-gray-300" />}
              <h2 className={`text-2xl font-bold ${isPlus ? 'text-white' : 'text-[#1A1A2E]'}`}>
                Plano {plano}
              </h2>
            </div>
            {isPlus && vencimento && (
              <p className="text-orange-100 text-sm">
                Ativo até {formatDate(vencimento)}
                {diasRestantes !== null && ` · ${diasRestantes} dia(s) restante(s)`}
              </p>
            )}
            {!isPlus && <p className="text-gray-500 text-sm">Acesso aos módulos principais</p>}
          </div>
          {isPlus && <Zap size={40} className="text-orange-200 opacity-50" />}
        </div>

        {assinatura?.status === 'vencida' && (
          <div className="mt-3 p-3 bg-red-100 rounded-lg">
            <p className="text-red-700 text-sm font-medium">Assinatura vencida em {formatDate(vencimento)}</p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <p className="text-sm font-semibold text-[#1A1A2E] mb-3">Recursos incluídos</p>
          <ul className="space-y-2">
            {[
              { label: 'Gestão de Obras', included: true },
              { label: 'Controle de Funcionários', included: true },
              { label: 'Financeiro', included: true },
              { label: 'RDO e Cronograma', included: true },
              { label: 'Controle de Materiais', included: true },
              { label: 'Segurança do Trabalho', included: true },
              { label: 'Controle de Ponto', included: true },
              { label: 'Relatórios PDF/Excel', included: true },
              { label: 'IA: Análise de EPI', included: isPlus },
              { label: 'IA: Estimativa de Materiais', included: isPlus },
            ].map(r => (
              <li key={r.label} className={`flex items-center gap-2 text-sm ${r.included ? 'text-gray-700' : 'text-gray-400'}`}>
                {r.included
                  ? <CheckCircle size={14} className="text-green-500 flex-shrink-0" />
                  : <XCircle size={14} className="text-gray-300 flex-shrink-0" />}
                {r.label}
                {!r.included && <span className="ml-1 text-xs text-[#E85D04] font-medium">PLUS</span>}
              </li>
            ))}
          </ul>
        </div>

        <div className="flex flex-col gap-3">
          {!isPlus && (
            <button onClick={() => setUpgradeModal(true)}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-[#E85D04] to-orange-400 text-white font-bold rounded-xl hover:opacity-90 transition-opacity">
              <Zap size={18} />Assinar PLUS
            </button>
          )}
          {isPlus && (
            <>
              <button onClick={() => setUpgradeModal(true)}
                className="flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-[#E85D04] to-orange-400 text-white font-bold rounded-xl hover:opacity-90 transition-opacity">
                <RefreshCw size={16} />Renovar PLUS
              </button>
              <Button variant="outline" size="sm" onClick={handleCancelar} loading={cancelLoading}>
                Cancelar assinatura
              </Button>
            </>
          )}
          {!isPlus && (
            <div className="text-center">
              <p className="text-2xl font-bold text-[#E85D04]">R$ 49,90</p>
              <p className="text-xs text-gray-400">por mês</p>
            </div>
          )}
        </div>
      </div>

      <UpgradeModal open={upgradeModal} onClose={() => { setUpgradeModal(false); refreshPlano() }} />
    </Card>
  )
}

function PerfilSection() {
  const { user, invoke } = useApp()
  const [form, setForm] = useState({ nome: user?.nome || '', email: user?.email || '' })
  const [senhaForm, setSenhaForm] = useState({ atual: '', nova: '', confirmar: '' })
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')

  async function handleSalvar(e: React.FormEvent) {
    e.preventDefault(); setLoading(true); setMsg('')
    try {
      await invoke('usuarios:update-perfil', { id: user?.id, ...form })
      setMsg('Perfil atualizado com sucesso.')
    } finally { setLoading(false) }
  }

  async function handleSenha(e: React.FormEvent) {
    e.preventDefault()
    if (senhaForm.nova !== senhaForm.confirmar) { setMsg('As senhas não conferem.'); return }
    setLoading(true); setMsg('')
    try {
      const res = await invoke('usuarios:change-password', { id: user?.id, senha_atual: senhaForm.atual, nova_senha: senhaForm.nova })
      setMsg(res.success ? 'Senha alterada com sucesso.' : res.message || 'Erro ao alterar senha.')
      if (res.success) setSenhaForm({ atual: '', nova: '', confirmar: '' })
    } finally { setLoading(false) }
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Card>
        <h3 className="font-semibold text-[#1A1A2E] mb-4">Dados do Perfil</h3>
        <form onSubmit={handleSalvar} className="flex flex-col gap-4">
          <Input label="Nome" value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} />
          <Input label="E-mail" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
          {msg && <p className={`text-sm ${msg.includes('Erro') || msg.includes('não') ? 'text-red-500' : 'text-green-600'}`}>{msg}</p>}
          <div className="flex justify-end">
            <Button type="submit" loading={loading}>Salvar</Button>
          </div>
        </form>
      </Card>
      <Card>
        <h3 className="font-semibold text-[#1A1A2E] mb-4">Alterar Senha</h3>
        <form onSubmit={handleSenha} className="flex flex-col gap-4">
          <Input label="Senha Atual" type="password" value={senhaForm.atual} onChange={e => setSenhaForm({ ...senhaForm, atual: e.target.value })} required />
          <Input label="Nova Senha" type="password" value={senhaForm.nova} onChange={e => setSenhaForm({ ...senhaForm, nova: e.target.value })} required />
          <Input label="Confirmar Nova Senha" type="password" value={senhaForm.confirmar} onChange={e => setSenhaForm({ ...senhaForm, confirmar: e.target.value })} required />
          <div className="flex justify-end">
            <Button type="submit" loading={loading}>Alterar Senha</Button>
          </div>
        </form>
      </Card>
    </div>
  )
}

function SistemaSection() {
  const { invoke } = useApp()
  const [info, setInfo] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => { invoke('sistema:info').then(setInfo) }, [])

  async function handleBackup() {
    setLoading(true)
    try {
      const res = await invoke('sistema:backup')
      if (res?.caminho) alert(`Backup criado em:\n${res.caminho}`)
    } finally { setLoading(false) }
  }

  // Dark mode toggle
  const [temaDark, setTemaDark] = useState(localStorage.getItem('tema') === 'escuro')

  function toggleTema() {
    const novoTema = temaDark ? 'claro' : 'escuro'
    localStorage.setItem('tema', novoTema)
    document.documentElement.classList.toggle('dark', novoTema === 'escuro')
    setTemaDark(novoTema === 'escuro')
  }

  // Backup Supabase
  const [backupLoading, setBackupLoading] = useState(false)
  async function handleBackupSupabase() {
    setBackupLoading(true)
    try {
      const { supabase } = await import('../lib/supabase')
      const uid = localStorage.getItem('minha-obra-suid')
      if (!uid) { alert('Faça login com sua conta cloud para usar o backup.'); return }

      const tabelas = ['obras', 'funcionarios', 'despesas', 'rdos', 'epis', 'exames_medicos', 'materiais_estoque']
      const backup: Record<string, any> = { exportado_em: new Date().toISOString(), versao: '1.0.0' }

      for (const t of tabelas) {
        const { data } = await supabase.from(t).select('*').eq('usuario_id', uid)
        backup[t] = data || []
      }

      const json = JSON.stringify(backup, null, 2)
      const blob = new Blob([json], { type: 'application/json' })
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href     = url
      a.download = `backup_minha_obra_${new Date().toISOString().split('T')[0]}.json`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      alert('Erro ao exportar backup. Verifique sua conexão.')
    } finally {
      setBackupLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Aparência */}
      <Card>
        <h3 className="font-semibold text-[#1A1A2E] dark:text-white mb-4">Aparência</h3>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Tema escuro</p>
            <p className="text-xs text-gray-400 mt-0.5">Reduz o brilho da tela em ambientes com pouca luz</p>
          </div>
          <button
            onClick={toggleTema}
            className={`relative w-12 h-6 rounded-full transition-colors ${temaDark ? 'bg-azul' : 'bg-gray-200'}`}
          >
            <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform flex items-center justify-center ${temaDark ? 'translate-x-6' : ''}`}>
              {temaDark ? <Moon className="w-3 h-3 text-azul" /> : <Sun className="w-3 h-3 text-gray-400" />}
            </span>
          </button>
        </div>
      </Card>

      {/* Sistema */}
      <Card>
        <h3 className="font-semibold text-[#1A1A2E] dark:text-white mb-4">Sistema</h3>
        <div className="space-y-3 text-sm mb-6">
          {info && Object.entries(info).map(([k, v]) => (
            <div key={k} className="flex justify-between border-b border-gray-50 dark:border-gray-700 pb-2">
              <span className="text-gray-500">{k}</span>
              <span className="font-medium dark:text-white">{String(v)}</span>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" onClick={handleBackup} loading={loading}>Fazer Backup Local</Button>
          <Button
            variant="outline"
            onClick={handleBackupSupabase}
            loading={backupLoading}
            className="flex items-center gap-2"
          >
            <Download size={14} /> Exportar Backup Cloud (JSON)
          </Button>
        </div>
      </Card>
    </div>
  )
}

export function Configuracoes() {
  const { cargo } = useApp()
  const [tab, setTab] = useState<'plano' | 'perfil' | 'equipe' | 'sistema'>('plano')

  // Membros não têm acesso a Configurações (guard de rota)
  const podeVerConfig = ['dono', 'engenheiro_chefe'].includes(cargo)

  const abas = [
    { key: 'plano',   label: 'Plano' },
    { key: 'perfil',  label: 'Perfil' },
    ...(hasSupabase && podeVerConfig ? [{ key: 'equipe', label: 'Minha Equipe', icon: Users }] : []),
    ...(podeVerConfig ? [{ key: 'sistema', label: 'Sistema' }] : []),
  ] as { key: string; label: string; icon?: any }[]

  return (
    <div>
      <PageHeader title="Configurações" subtitle="Plano, perfil e configurações do sistema" />
      <div className="flex border-b border-gray-100 bg-white px-6">
        {abas.map(t => (
          <button key={t.key} onClick={() => setTab(t.key as any)}
            className={`flex items-center gap-1.5 py-3 px-4 text-sm font-medium border-b-2 transition-colors ${
              tab === t.key ? 'border-[#E85D04] text-[#E85D04]' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}>
            {t.icon && <t.icon size={14} />}
            {t.label}
          </button>
        ))}
      </div>
      <div className="p-6">
        {tab === 'plano'   && <PlanoSection />}
        {tab === 'perfil'  && <PerfilSection />}
        {tab === 'equipe'  && <MinhaEquipe />}
        {tab === 'sistema' && podeVerConfig && <SistemaSection />}
      </div>
    </div>
  )
}
