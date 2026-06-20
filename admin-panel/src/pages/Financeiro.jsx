import React, { useEffect, useState } from 'react'
import { DollarSign, TrendingUp, Package, Loader2 } from 'lucide-react'
import { supabase } from '../lib/supabase'

const PRECOS = { individual: 49.99, profissional: 99.99, corporativo: 249.99, gov: 800 }

function Card({ icon: Icon, label, value, sub, cor = '#1E3A5F' }) {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex items-center gap-4">
      <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${cor}15` }}>
        <Icon size={22} style={{ color: cor }} />
      </div>
      <div>
        <p className="text-sm text-gray-500">{label}</p>
        <p className="text-xl font-bold text-[#1F2937] mt-0.5">{value ?? '—'}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

export default function Financeiro() {
  const [assinaturas, setAssinaturas] = useState([])
  const [pacotes,     setPacotes]     = useState([])
  const [loading,     setLoading]     = useState(true)

  useEffect(() => {
    async function load() {
      const [{ data: subs }, { count: packs }] = await Promise.all([
        supabase.from('assinaturas').select('plano, status, usuario_id, clientes_pendentes(nome, email)').in('status', ['ativa', 'trial']),
        supabase.from('pacotes_avulsos').select('*', { count: 'exact', head: true }),
      ])
      setAssinaturas(subs ?? [])
      setPacotes(packs ?? 0)
      setLoading(false)
    }
    load()
  }, [])

  const ativas = assinaturas.filter(a => a.status === 'ativa')
  const mrr    = ativas.reduce((s, a) => s + (PRECOS[a.plano] ?? 0), 0)
  const arr    = mrr * 12

  const porPlano = Object.entries(PRECOS).map(([plano, preco]) => ({
    plano,
    preco,
    qtd: ativas.filter(a => a.plano === plano).length,
    receita: ativas.filter(a => a.plano === plano).reduce((s) => s + preco, 0),
  })).filter(p => p.qtd > 0)

  function fmtR(v) {
    return `R$ ${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="font-titulo italic text-[#1E3A5F] text-2xl">Financeiro</h1>
        <p className="text-gray-400 text-sm mt-0.5">Receita e assinaturas</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-gray-400">
          <Loader2 size={20} className="animate-spin mr-2" /> Carregando...
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            <Card icon={DollarSign}  label="MRR" value={fmtR(mrr)} sub="Receita Mensal Recorrente" cor="#059669" />
            <Card icon={TrendingUp}  label="ARR Estimado" value={fmtR(arr)} sub="MRR × 12" cor="#1E3A5F" />
            <Card icon={Package}     label="Pacotes Avulsos" value={pacotes} sub="Total vendidos" cor="#F97316" />
          </div>

          {/* Por plano */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 mb-6">
            <div className="px-5 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-[#1F2937] text-sm">Receita por Plano</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-gray-400 border-b border-gray-100 bg-gray-50/50">
                    <th className="px-5 py-3 font-medium">Plano</th>
                    <th className="px-5 py-3 font-medium">Preço/mês</th>
                    <th className="px-5 py-3 font-medium">Clientes ativos</th>
                    <th className="px-5 py-3 font-medium">Receita mensal</th>
                  </tr>
                </thead>
                <tbody>
                  {porPlano.map(p => (
                    <tr key={p.plano} className="border-b border-gray-50 hover:bg-gray-50/50">
                      <td className="px-5 py-3">
                        <span className="text-xs bg-[#1E3A5F]/10 text-[#1E3A5F] px-2 py-0.5 rounded-full capitalize">
                          {p.plano}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-gray-600">{fmtR(p.preco)}</td>
                      <td className="px-5 py-3 font-bold text-[#1F2937]">{p.qtd}</td>
                      <td className="px-5 py-3 font-bold text-green-700">{fmtR(p.receita)}</td>
                    </tr>
                  ))}
                  {!porPlano.length && (
                    <tr><td colSpan={4} className="px-5 py-8 text-center text-gray-400">Nenhuma assinatura ativa.</td></tr>
                  )}
                  {porPlano.length > 0 && (
                    <tr className="bg-gray-50 font-semibold">
                      <td className="px-5 py-3" colSpan={2}>Total</td>
                      <td className="px-5 py-3">{ativas.length}</td>
                      <td className="px-5 py-3 text-green-700">{fmtR(mrr)}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Clientes em trial */}
          {assinaturas.filter(a => a.status === 'trial').length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
              <div className="px-5 py-4 border-b border-gray-100">
                <h2 className="font-semibold text-[#1F2937] text-sm">Em Trial</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-gray-400 border-b border-gray-100">
                      <th className="px-5 py-3 font-medium">Cliente</th>
                      <th className="px-5 py-3 font-medium">Plano</th>
                    </tr>
                  </thead>
                  <tbody>
                    {assinaturas.filter(a => a.status === 'trial').map(a => (
                      <tr key={a.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                        <td className="px-5 py-3">
                          <p className="font-medium">{a.clientes_pendentes?.nome || '—'}</p>
                          <p className="text-xs text-gray-400">{a.clientes_pendentes?.email || ''}</p>
                        </td>
                        <td className="px-5 py-3 capitalize text-gray-600">{a.plano}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
