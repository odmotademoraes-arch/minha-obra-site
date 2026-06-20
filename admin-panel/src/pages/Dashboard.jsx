import React, { useEffect, useState } from 'react'
import { Users, Clock, BrainCircuit, DollarSign, TrendingUp } from 'lucide-react'
import { supabase } from '../lib/supabase'
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend
} from 'recharts'

function Card({ icon: Icon, label, value, sub, cor = '#1E3A5F', badge }) {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex items-start gap-4">
      <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${cor}15` }}>
        <Icon size={22} style={{ color: cor }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-500">{label}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <p className="text-2xl font-bold text-[#1F2937]">{value ?? '—'}</p>
          {badge && (
            <span className="bg-[#F97316] text-white text-xs font-bold px-2 py-0.5 rounded-full">{badge}</span>
          )}
        </div>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

const PLANO_PRECOS = { individual: 49.99, profissional: 99.99, corporativo: 249.99, gov: 800 }

export default function Dashboard() {
  const [stats, setStats]     = useState({})
  const [recentes, setRecentes] = useState([])
  const [barData, setBarData] = useState([])
  const [lineData, setLineData] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const inicio = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()

      const [
        { count: ativos },
        { count: aguardando },
        { count: analises },
        { data: assinaturas },
        { data: recentes },
        { data: usoSemana },
      ] = await Promise.all([
        supabase.from('clientes_pendentes').select('*', { count: 'exact', head: true }).eq('status', 'ativo'),
        supabase.from('clientes_pendentes').select('*', { count: 'exact', head: true }).eq('status', 'aguardando'),
        supabase.from('uso_ia').select('*', { count: 'exact', head: true }).gte('criado_em', inicio),
        supabase.from('assinaturas').select('plano, status'),
        supabase.from('clientes_pendentes').select('*').order('criado_em', { ascending: false }).limit(5),
        supabase.from('uso_ia').select('criado_em').gte('criado_em', new Date(Date.now() - 7 * 86400000).toISOString()),
      ])

      const mrr = (assinaturas ?? [])
        .filter(a => a.status === 'ativa')
        .reduce((s, a) => s + (PLANO_PRECOS[a.plano] ?? 0), 0)

      // Receita por mês (últimos 6 meses simulada com assinaturas ativas)
      const meses = Array.from({ length: 6 }, (_, i) => {
        const d = new Date()
        d.setMonth(d.getMonth() - (5 - i))
        return d.toLocaleString('pt-BR', { month: 'short' })
      })
      setBarData(meses.map((m, i) => ({ mes: m, receita: (mrr * (0.7 + i * 0.06)).toFixed(0) * 1 })))

      // IA por dia (últimos 7 dias)
      const diasMap = {}
      ;(usoSemana ?? []).forEach(r => {
        const d = new Date(r.criado_em).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
        diasMap[d] = (diasMap[d] || 0) + 1
      })
      const hoje = new Date()
      setLineData(Array.from({ length: 7 }, (_, i) => {
        const d = new Date(hoje)
        d.setDate(d.getDate() - (6 - i))
        const key = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
        return { dia: key, analises: diasMap[key] || 0 }
      }))

      setStats({ ativos, aguardando, analises, mrr })
      setRecentes(recentes ?? [])
      setLoading(false)
    }
    load()
  }, [])

  function fmtData(iso) {
    if (!iso) return '—'
    return new Date(iso).toLocaleDateString('pt-BR')
  }

  function statusBadge(s) {
    const map = {
      ativo:      'bg-green-100 text-green-700',
      aguardando: 'bg-yellow-100 text-yellow-700',
      recusado:   'bg-red-100 text-red-700',
    }
    const labels = { ativo: 'Ativo', aguardando: 'Aguardando', recusado: 'Recusado' }
    return (
      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${map[s] || 'bg-gray-100 text-gray-600'}`}>
        {labels[s] || s}
      </span>
    )
  }

  if (loading) return (
    <div className="flex items-center justify-center h-full text-gray-400 text-sm">Carregando...</div>
  )

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="font-titulo italic text-[#1E3A5F] text-2xl">Dashboard</h1>
        <p className="text-gray-400 text-sm mt-0.5">Visão geral do sistema</p>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card icon={Users}       label="Clientes Ativos"      value={stats.ativos}   cor="#1E3A5F" />
        <Card icon={Clock}       label="Aguardando Ativação"  value={stats.aguardando} cor="#F97316"
          badge={stats.aguardando > 0 ? stats.aguardando : null} />
        <Card icon={BrainCircuit} label="Análises IA (mês)"  value={stats.analises}  cor="#7C3AED" />
        <Card icon={DollarSign}  label="MRR Estimado"
          value={`R$ ${(stats.mrr ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} cor="#059669" />
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 mb-4">
            <DollarSign size={16} className="text-[#1E3A5F]" />
            <h2 className="font-semibold text-[#1F2937] text-sm">Receita últimos 6 meses</h2>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={barData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
              <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={v => [`R$ ${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 'Receita']} />
              <Bar dataKey="receita" fill="#1E3A5F" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={16} className="text-purple-600" />
            <h2 className="font-semibold text-[#1F2937] text-sm">Análises IA — últimos 7 dias</h2>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={lineData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
              <XAxis dataKey="dia" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip />
              <Line type="monotone" dataKey="analises" stroke="#7C3AED" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Últimos cadastros */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-[#1F2937] text-sm">Últimos 5 Cadastros</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-400 border-b border-gray-100">
                <th className="px-5 py-3 font-medium">Nome</th>
                <th className="px-5 py-3 font-medium">E-mail</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">Cadastro</th>
              </tr>
            </thead>
            <tbody>
              {recentes.map(c => (
                <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3 font-medium text-[#1F2937]">{c.nome}</td>
                  <td className="px-5 py-3 text-gray-500">{c.email}</td>
                  <td className="px-5 py-3">{statusBadge(c.status)}</td>
                  <td className="px-5 py-3 text-gray-400">{fmtData(c.criado_em)}</td>
                </tr>
              ))}
              {!recentes.length && (
                <tr><td colSpan={4} className="px-5 py-8 text-center text-gray-400">Nenhum cadastro ainda.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
