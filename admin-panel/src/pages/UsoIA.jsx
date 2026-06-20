import React, { useEffect, useState } from 'react'
import { BrainCircuit, ShieldCheck, Calculator, DollarSign, Loader2 } from 'lucide-react'
import { supabase } from '../lib/supabase'

function Card({ icon: Icon, label, value, cor = '#1E3A5F' }) {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex items-center gap-4">
      <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${cor}15` }}>
        <Icon size={22} style={{ color: cor }} />
      </div>
      <div>
        <p className="text-sm text-gray-500">{label}</p>
        <p className="text-xl font-bold text-[#1F2937] mt-0.5">{value ?? '—'}</p>
      </div>
    </div>
  )
}

const MESES = [
  { value: '', label: 'Todos' },
  ...Array.from({ length: 12 }, (_, i) => {
    const d = new Date()
    d.setMonth(d.getMonth() - i)
    return {
      value: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      label: d.toLocaleString('pt-BR', { month: 'long', year: 'numeric' }),
    }
  }),
]

export default function UsoIA() {
  const [dados,    setDados]   = useState([])
  const [loading,  setLoading] = useState(true)
  const [mesFiltro, setMes]   = useState(MESES[1].value)

  useEffect(() => {
    async function load() {
      setLoading(true)
      let q = supabase.from('uso_ia').select('*, clientes_pendentes(nome, email)').order('criado_em', { ascending: false })
      if (mesFiltro) {
        const ini = `${mesFiltro}-01T00:00:00Z`
        const [y, m] = mesFiltro.split('-').map(Number)
        const fim = new Date(y, m, 1).toISOString()
        q = q.gte('criado_em', ini).lt('criado_em', fim)
      }
      const { data } = await q
      setDados(data ?? [])
      setLoading(false)
    }
    load()
  }, [mesFiltro])

  const totalAnalises = dados.length
  const totalEpi      = dados.filter(d => d.tipo === 'analise_epi').length
  const totalMat      = dados.filter(d => d.tipo === 'estimativa_materiais').length
  const custoTotal    = dados.reduce((s, d) => s + (d.custo_estimado ?? 0), 0)

  function fmtData(iso) {
    return iso ? new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—'
  }

  const tipoLabel = { analise_epi: 'Análise EPI', estimativa_materiais: 'Estimativa Mat.' }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-titulo italic text-[#1E3A5F] text-2xl">Uso de IA</h1>
          <p className="text-gray-400 text-sm mt-0.5">Monitoramento de análises e custos</p>
        </div>
        <select value={mesFiltro} onChange={e => setMes(e.target.value)}
          className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none bg-white">
          {MESES.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card icon={BrainCircuit}  label="Total Análises"         value={totalAnalises} cor="#7C3AED" />
        <Card icon={ShieldCheck}   label="Análises EPI"           value={totalEpi}      cor="#F97316" />
        <Card icon={Calculator}    label="Estimativas Materiais"  value={totalMat}      cor="#1E3A5F" />
        <Card icon={DollarSign}    label="Custo Estimado"
          value={`R$ ${custoTotal.toLocaleString('pt-BR', { minimumFractionDigits: 4 })}`} cor="#059669" />
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
                  <th className="px-5 py-3 font-medium">Cliente</th>
                  <th className="px-5 py-3 font-medium">Tipo</th>
                  <th className="px-5 py-3 font-medium">Tokens</th>
                  <th className="px-5 py-3 font-medium">Custo Est.</th>
                  <th className="px-5 py-3 font-medium">Data</th>
                </tr>
              </thead>
              <tbody>
                {dados.map(d => (
                  <tr key={d.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                    <td className="px-5 py-3">
                      <p className="font-medium text-[#1F2937]">{d.clientes_pendentes?.nome || '—'}</p>
                      <p className="text-xs text-gray-400">{d.clientes_pendentes?.email || ''}</p>
                    </td>
                    <td className="px-5 py-3">
                      <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
                        {tipoLabel[d.tipo] || d.tipo || '—'}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-gray-600">{(d.tokens_usados ?? 0).toLocaleString('pt-BR')}</td>
                    <td className="px-5 py-3 font-medium text-green-700">
                      R$ {(d.custo_estimado ?? 0).toFixed(4)}
                    </td>
                    <td className="px-5 py-3 text-gray-400 text-xs">{fmtData(d.criado_em)}</td>
                  </tr>
                ))}
                {!dados.length && (
                  <tr><td colSpan={5} className="px-5 py-10 text-center text-gray-400">Nenhum uso registrado no período.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
