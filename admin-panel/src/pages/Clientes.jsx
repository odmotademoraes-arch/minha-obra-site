import React, { useEffect, useState } from 'react'
import { Search, X, ChevronRight, Loader2, AlertCircle } from 'lucide-react'
import { supabase } from '../lib/supabase'

const FILTROS = ['todos', 'aguardando', 'ativo', 'recusado']

function StatusBadge({ s }) {
  const map = {
    ativo:      { cls: 'bg-green-100 text-green-700', label: '✅ Ativo' },
    aguardando: { cls: 'bg-yellow-100 text-yellow-700', label: '🟡 Aguardando' },
    recusado:   { cls: 'bg-red-100 text-red-700', label: '❌ Recusado' },
  }
  const { cls, label } = map[s] || { cls: 'bg-gray-100 text-gray-500', label: s }
  return <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${cls}`}>{label}</span>
}

function ModalAtivar({ cliente, onClose, onSuccess }) {
  const [url, setUrl]         = useState('')
  const [anon, setAnon]       = useState('')
  const [loading, setLoading] = useState(false)
  const [erro, setErro]       = useState('')

  async function ativar() {
    if (!url || !anon) { setErro('Preencha todos os campos.'); return }
    setLoading(true); setErro('')
    const { error } = await supabase
      .from('clientes_pendentes')
      .update({ status: 'ativo', supabase_url: url, supabase_anon_key: anon, ativado_em: new Date().toISOString() })
      .eq('id', cliente.id)
    setLoading(false)
    if (error) { setErro(error.message); return }

    // Notificar cliente (edge function)
    await supabase.functions.invoke('notificar-cliente-ativo', {
      body: { clienteId: cliente.id, email: cliente.email, nome: cliente.nome }
    }).catch(() => {})

    onSuccess()
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-[#1F2937]">Ativar cliente</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div className="bg-[#1E3A5F]/5 rounded-xl p-3 text-sm">
            <p className="font-medium text-[#1E3A5F]">{cliente.nome}</p>
            <p className="text-gray-500 text-xs mt-0.5">{cliente.email}</p>
          </div>
          {erro && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg px-3 py-2">
              <AlertCircle size={13} />{erro}
            </div>
          )}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">URL do Supabase do cliente</label>
            <input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://xxx.supabase.co"
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/30" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Anon Key</label>
            <input value={anon} onChange={e => setAnon(e.target.value)} placeholder="eyJhb..."
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/30" />
          </div>
        </div>
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-200 rounded-xl">Cancelar</button>
          <button onClick={ativar} disabled={loading}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-[#F97316] hover:bg-orange-600 text-white rounded-xl disabled:opacity-60">
            {loading && <Loader2 size={14} className="animate-spin" />}
            Ativar e Notificar
          </button>
        </div>
      </div>
    </div>
  )
}

function PainelDetalhe({ cliente, onClose, onUpdate }) {
  const [loading, setLoading] = useState(false)
  const [plano, setPlano]     = useState(cliente.assinaturas?.[0]?.plano || '')

  async function suspender() {
    if (!confirm(`Suspender ${cliente.nome}?`)) return
    setLoading(true)
    await supabase.from('clientes_pendentes').update({ status: 'recusado' }).eq('id', cliente.id)
    setLoading(false)
    onUpdate()
  }

  async function reativar() {
    setLoading(true)
    await supabase.from('clientes_pendentes').update({ status: 'ativo' }).eq('id', cliente.id)
    setLoading(false)
    onUpdate()
  }

  async function alterarPlano() {
    if (!plano) return
    const { data: sub } = await supabase.from('assinaturas').select('id').eq('usuario_id', cliente.usuario_id).single()
    if (sub) await supabase.from('assinaturas').update({ plano }).eq('id', sub.id)
    alert('Plano atualizado!')
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-end">
      <div className="bg-white h-full w-full max-w-sm shadow-2xl flex flex-col overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 sticky top-0 bg-white">
          <h3 className="font-semibold text-[#1F2937]">Detalhes do cliente</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>
        <div className="p-5 space-y-4 flex-1">
          <div className="bg-[#1E3A5F] rounded-xl p-4 text-white">
            <p className="font-bold text-lg">{cliente.nome}</p>
            <p className="text-white/60 text-sm">{cliente.email}</p>
            {cliente.empresa && <p className="text-white/60 text-sm mt-1">{cliente.empresa}</p>}
          </div>
          <div className="space-y-2 text-sm">
            {[
              ['Status',    <StatusBadge s={cliente.status} />],
              ['Telefone',  cliente.telefone || '—'],
              ['Cadastro',  cliente.criado_em ? new Date(cliente.criado_em).toLocaleDateString('pt-BR') : '—'],
              ['Ativação',  cliente.ativado_em ? new Date(cliente.ativado_em).toLocaleDateString('pt-BR') : '—'],
              ['Plano',     cliente.assinaturas?.[0]?.plano || '—'],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between items-center py-2 border-b border-gray-50">
                <span className="text-gray-400">{k}</span>
                <span className="font-medium text-[#1F2937]">{v}</span>
              </div>
            ))}
          </div>

          {/* Alterar plano */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Alterar Plano</label>
            <div className="flex gap-2">
              <select value={plano} onChange={e => setPlano(e.target.value)}
                className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none">
                <option value="">Selecionar...</option>
                {['individual','profissional','corporativo','gov'].map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
              <button onClick={alterarPlano}
                className="px-3 py-2 text-sm font-medium bg-[#1E3A5F] text-white rounded-xl">OK</button>
            </div>
          </div>
        </div>
        <div className="p-5 border-t border-gray-100 space-y-2">
          {cliente.status === 'ativo' && (
            <button onClick={suspender} disabled={loading}
              className="w-full py-2 text-sm font-medium text-red-600 border border-red-200 hover:bg-red-50 rounded-xl">
              Suspender cliente
            </button>
          )}
          {cliente.status !== 'ativo' && (
            <button onClick={reativar} disabled={loading}
              className="w-full py-2 text-sm font-medium text-green-700 border border-green-200 hover:bg-green-50 rounded-xl">
              Reativar cliente
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default function Clientes() {
  const [clientes, setClientes] = useState([])
  const [filtro,   setFiltro]   = useState('todos')
  const [busca,    setBusca]    = useState('')
  const [loading,  setLoading]  = useState(true)
  const [modalAtiv, setModalAtiv] = useState(null)
  const [painel,   setPainel]   = useState(null)

  async function carregar() {
    setLoading(true)
    const { data } = await supabase
      .from('clientes_pendentes')
      .select('*, assinaturas(plano, status, trial_fim)')
      .order('criado_em', { ascending: false })
    setClientes(data ?? [])
    setLoading(false)
  }

  useEffect(() => { carregar() }, [])

  const filtrados = clientes.filter(c => {
    if (filtro !== 'todos' && c.status !== filtro) return false
    if (busca) {
      const q = busca.toLowerCase()
      return (c.nome || '').toLowerCase().includes(q) || (c.email || '').toLowerCase().includes(q)
    }
    return true
  })

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="font-titulo italic text-[#1E3A5F] text-2xl">Clientes</h1>
        <p className="text-gray-400 text-sm mt-0.5">Gerencie todos os usuários cadastrados</p>
      </div>

      {/* Filtros + busca */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="flex gap-2 flex-wrap">
          {FILTROS.map(f => (
            <button key={f} onClick={() => setFiltro(f)}
              className={`px-4 py-1.5 text-sm rounded-full font-medium transition-colors capitalize
                ${filtro === f ? 'bg-[#1E3A5F] text-white' : 'bg-white text-gray-500 border border-gray-200 hover:bg-gray-50'}`}>
              {f}
            </button>
          ))}
        </div>
        <div className="relative sm:ml-auto">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={busca} onChange={e => setBusca(e.target.value)}
            placeholder="Buscar por nome ou e-mail..."
            className="w-full sm:w-64 pl-8 pr-4 py-1.5 text-sm border border-gray-200 rounded-full bg-white focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/30" />
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-gray-400">
            <Loader2 size={20} className="animate-spin mr-2" /> Carregando...
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-400 border-b border-gray-100 bg-gray-50/50">
                  <th className="px-5 py-3 font-medium">Nome / E-mail</th>
                  <th className="px-5 py-3 font-medium hidden md:table-cell">Empresa</th>
                  <th className="px-5 py-3 font-medium hidden sm:table-cell">Plano</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium hidden lg:table-cell">Cadastro</th>
                  <th className="px-5 py-3 font-medium">Ação</th>
                </tr>
              </thead>
              <tbody>
                {filtrados.map(c => (
                  <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                    <td className="px-5 py-3">
                      <p className="font-medium text-[#1F2937]">{c.nome}</p>
                      <p className="text-xs text-gray-400">{c.email}</p>
                    </td>
                    <td className="px-5 py-3 text-gray-500 hidden md:table-cell">{c.empresa || '—'}</td>
                    <td className="px-5 py-3 hidden sm:table-cell">
                      <span className="text-xs bg-[#1E3A5F]/10 text-[#1E3A5F] px-2 py-0.5 rounded-full capitalize">
                        {c.assinaturas?.[0]?.plano || '—'}
                      </span>
                    </td>
                    <td className="px-5 py-3"><StatusBadge s={c.status} /></td>
                    <td className="px-5 py-3 text-gray-400 hidden lg:table-cell">
                      {c.criado_em ? new Date(c.criado_em).toLocaleDateString('pt-BR') : '—'}
                    </td>
                    <td className="px-5 py-3">
                      {c.status === 'aguardando' ? (
                        <button onClick={() => setModalAtiv(c)}
                          className="px-3 py-1.5 text-xs font-semibold bg-[#F97316] hover:bg-orange-600 text-white rounded-lg transition-colors">
                          Ativar
                        </button>
                      ) : (
                        <button onClick={() => setPainel(c)}
                          className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-gray-600 border border-gray-200 hover:bg-gray-50 rounded-lg transition-colors">
                          Detalhes <ChevronRight size={12} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {!filtrados.length && (
                  <tr><td colSpan={6} className="px-5 py-10 text-center text-gray-400">Nenhum cliente encontrado.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modalAtiv && (
        <ModalAtivar cliente={modalAtiv} onClose={() => setModalAtiv(null)}
          onSuccess={() => { setModalAtiv(null); carregar() }} />
      )}
      {painel && (
        <PainelDetalhe cliente={painel} onClose={() => setPainel(null)}
          onUpdate={() => { setPainel(null); carregar() }} />
      )}
    </div>
  )
}
