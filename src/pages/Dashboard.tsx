import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Building2, Users, DollarSign, Bell, AlertTriangle, CheckCircle } from 'lucide-react'
import { useApp } from '../store/AppContext'
import { PageHeader } from '../components/layout/Layout'
import { StatCard, Card, Badge, ProgressBar } from '../components/ui/Card'
import { formatCurrency, formatDate, statusLabel, statusVariant } from '../lib/utils'

export function Dashboard() {
  const { invoke, user } = useApp()
  const navigate = useNavigate()
  const [stats, setStats] = useState<any>(null)
  const [obras, setObras] = useState<any[]>([])
  const [alertas, setAlertas] = useState<any[]>([])

  useEffect(() => {
    invoke('dashboard:stats').then(setStats)
    invoke('obras:list').then(d => setObras(d.slice(0, 6)))
    invoke('alertas:list').then(d => setAlertas(d.filter((a: any) => !a.lido).slice(0, 5)))
  }, [])

  const prioridadeColor: Record<string, string> = {
    critica: 'text-red-700 bg-red-50 border-red-200',
    alta: 'text-orange-700 bg-orange-50 border-orange-200',
    media: 'text-yellow-700 bg-yellow-50 border-yellow-200',
    info: 'text-blue-700 bg-blue-50 border-blue-200',
  }

  return (
    <div>
      <PageHeader title={`Bom dia, ${user?.nome?.split(' ')[0]}`} subtitle="Resumo geral das suas obras" />
      <div className="p-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          <StatCard label="Total de Obras" value={stats?.obras ?? '—'} icon={<Building2 size={22} />} />
          <StatCard label="Em Andamento" value={stats?.obrasEmAndamento ?? '—'} icon={<Building2 size={22} />} color="#22C55E" />
          <StatCard label="Funcionários Ativos" value={stats?.funcionarios ?? '—'} icon={<Users size={22} />} color="#3B82F6" />
          <StatCard label="Alertas Pendentes" value={stats?.alertas ?? '—'} icon={<Bell size={22} />} color={stats?.alertas > 0 ? '#EF4444' : '#22C55E'} />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Obras */}
          <div className="xl:col-span-2">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-semibold text-[#1A1A2E]">Obras Recentes</h2>
              <button onClick={() => navigate('/obras')} className="text-sm text-[#E85D04] hover:underline">Ver todas</button>
            </div>
            <div className="space-y-3">
              {obras.length === 0 && (
                <Card><p className="text-sm text-gray-400 text-center py-4">Nenhuma obra cadastrada</p></Card>
              )}
              {obras.map(o => (
                <Card key={o.id} hover onClick={() => navigate(`/obras/${o.id}`)}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-semibold text-[#1A1A2E] truncate">{o.nome}</p>
                        <Badge variant={statusVariant(o.status)}>{statusLabel(o.status)}</Badge>
                      </div>
                      <p className="text-xs text-gray-500">{[o.cidade, o.estado].filter(Boolean).join(', ') || o.endereco || '—'}</p>
                      <div className="mt-2 flex items-center gap-3">
                        <ProgressBar value={o.progresso} showLabel className="flex-1" />
                        <span className="text-xs text-gray-500 whitespace-nowrap">{formatCurrency(o.orcamento_realizado)} / {formatCurrency(o.orcamento_planejado)}</span>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>

          {/* Alertas */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-semibold text-[#1A1A2E]">Alertas</h2>
              <button onClick={() => navigate('/alertas')} className="text-sm text-[#E85D04] hover:underline">Ver todos</button>
            </div>
            <div className="space-y-2">
              {alertas.length === 0 && (
                <Card>
                  <div className="flex items-center gap-3 py-4 justify-center text-gray-400">
                    <CheckCircle size={20} />
                    <span className="text-sm">Nenhum alerta pendente</span>
                  </div>
                </Card>
              )}
              {alertas.map(a => (
                <div key={a.id} className={`rounded-xl border px-4 py-3 ${prioridadeColor[a.prioridade] || prioridadeColor.info}`}>
                  <div className="flex items-start gap-2">
                    <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-semibold">{a.titulo}</p>
                      <p className="text-xs mt-0.5 opacity-80">{a.mensagem}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Orçamento */}
        {stats && (
          <Card>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-semibold text-[#1A1A2E]">Financeiro Geral</h2>
              <DollarSign size={18} className="text-gray-400" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500">Total Planejado</p>
                <p className="text-lg font-bold text-[#1A1A2E]">{formatCurrency(stats.valorTotal)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Total Realizado</p>
                <p className="text-lg font-bold text-[#E85D04]">{formatCurrency(stats.gastosTotal)}</p>
              </div>
            </div>
            {stats.valorTotal > 0 && (
              <div className="mt-3">
                <ProgressBar value={stats.gastosTotal} max={stats.valorTotal} showLabel />
              </div>
            )}
          </Card>
        )}
      </div>
    </div>
  )
}
