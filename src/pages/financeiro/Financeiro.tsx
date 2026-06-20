import React, { useEffect, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'
import { useApp } from '../../store/AppContext'
import { PageHeader } from '../../components/layout/Layout'
import { Card, StatCard } from '../../components/ui/Card'
import { formatCurrency, formatDate } from '../../lib/utils'
import { DollarSign } from 'lucide-react'

const COLORS = ['#E85D04', '#3B82F6', '#22C55E', '#F59E0B', '#8B5CF6', '#EC4899']

export function Financeiro() {
  const { invoke } = useApp()
  const [obras, setObras] = useState<any[]>([])
  const [despesas, setDespesas] = useState<any[]>([])

  useEffect(() => {
    invoke('obras:list').then(async list => {
      setObras(list)
      const allDespesas: any[] = []
      for (const o of list) {
        const d = await invoke('despesas:list', o.id)
        d.forEach((x: any) => allDespesas.push({ ...x, obra_nome: o.nome }))
      }
      setDespesas(allDespesas)
    })
  }, [])

  const totalPlanejado = obras.reduce((s, o) => s + (o.orcamento_planejado || 0), 0)
  const totalRealizado = obras.reduce((s, o) => s + (o.orcamento_realizado || 0), 0)

  const obraBarData = obras.slice(0, 6).map(o => ({
    name: o.nome.length > 12 ? o.nome.slice(0, 12) + '…' : o.nome,
    Planejado: o.orcamento_planejado || 0,
    Realizado: o.orcamento_realizado || 0,
  }))

  const categoriaMap: Record<string, number> = {}
  despesas.forEach(d => { categoriaMap[d.categoria] = (categoriaMap[d.categoria] || 0) + d.valor })
  const pieData = Object.entries(categoriaMap).map(([name, value]) => ({ name, value }))

  return (
    <div>
      <PageHeader title="Financeiro" subtitle="Visão geral do orçamento e despesas" />
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Total Planejado" value={formatCurrency(totalPlanejado)} icon={<DollarSign size={20} />} />
          <StatCard label="Total Realizado" value={formatCurrency(totalRealizado)} icon={<DollarSign size={20} />}
            color={totalRealizado > totalPlanejado ? '#EF4444' : '#22C55E'} />
          <StatCard label="Saldo" value={formatCurrency(totalPlanejado - totalRealizado)} icon={<DollarSign size={20} />}
            color={totalPlanejado - totalRealizado < 0 ? '#EF4444' : '#E85D04'} />
          <StatCard label="Nº de Despesas" value={despesas.length} icon={<DollarSign size={20} />} color="#3B82F6" />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <Card>
            <h3 className="font-semibold text-[#1A1A2E] mb-4">Orçamento por Obra</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={obraBarData}>
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tickFormatter={v => formatCurrency(v).replace('R$', '')} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
                <Bar dataKey="Planejado" fill="#E85D04" radius={[4,4,0,0]} />
                <Bar dataKey="Realizado" fill="#22C55E" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          <Card>
            <h3 className="font-semibold text-[#1A1A2E] mb-4">Despesas por Categoria</h3>
            {pieData.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">Nenhuma despesa lançada</p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => formatCurrency(v)} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </Card>
        </div>

        <Card>
          <h3 className="font-semibold text-[#1A1A2E] mb-4">Últimas Despesas</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-500 border-b border-gray-100">
                  <th className="pb-2 font-medium">Descrição</th>
                  <th className="pb-2 font-medium">Obra</th>
                  <th className="pb-2 font-medium">Categoria</th>
                  <th className="pb-2 font-medium">Data</th>
                  <th className="pb-2 font-medium text-right">Valor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {despesas.slice(0, 20).map(d => (
                  <tr key={d.id}>
                    <td className="py-2 font-medium">{d.descricao}</td>
                    <td className="py-2 text-gray-500 max-w-[120px] truncate">{d.obra_nome}</td>
                    <td className="py-2"><span className="text-xs bg-gray-100 px-2 py-0.5 rounded-full">{d.categoria}</span></td>
                    <td className="py-2 text-gray-500">{formatDate(d.data)}</td>
                    <td className="py-2 font-bold text-[#E85D04] text-right">{formatCurrency(d.valor)}</td>
                  </tr>
                ))}
                {despesas.length === 0 && (
                  <tr><td colSpan={5} className="py-8 text-center text-gray-400">Nenhuma despesa cadastrada</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  )
}
