import React, { useEffect, useState } from 'react'
import { Bell, AlertTriangle, Info, CheckCircle } from 'lucide-react'
import { useApp } from '../store/AppContext'
import { PageHeader } from '../components/layout/Layout'
import { Button } from '../components/ui/Button'
import { Card, Badge } from '../components/ui/Card'
import { formatDate } from '../lib/utils'

const TIPO_CONFIG: Record<string, { icon: React.ReactNode; variant: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'primary' }> = {
  vencimento_exame: { icon: <AlertTriangle size={16} />, variant: 'danger' },
  vencimento_treinamento: { icon: <AlertTriangle size={16} />, variant: 'warning' },
  estoque_baixo: { icon: <Info size={16} />, variant: 'warning' },
  obra_atrasada: { icon: <AlertTriangle size={16} />, variant: 'danger' },
  orcamento_excedido: { icon: <AlertTriangle size={16} />, variant: 'danger' },
  info: { icon: <Info size={16} />, variant: 'info' },
}

export function Alertas() {
  const { invoke, refreshAlertas } = useApp()
  const [alertas, setAlertas] = useState<any[]>([])
  const [filter, setFilter] = useState<'todos' | 'pendentes' | 'lidos'>('pendentes')

  useEffect(() => { loadAlertas() }, [])

  async function loadAlertas() {
    const list = await invoke('alertas:list')
    setAlertas(list)
  }

  async function handleMarcarLido(id: number) {
    await invoke('alertas:marcar-lido', id)
    await loadAlertas()
    refreshAlertas()
  }

  async function handleMarcarTodosLidos() {
    const pendentes = alertas.filter(a => !a.lido)
    await Promise.all(pendentes.map(a => invoke('alertas:marcar-lido', a.id)))
    await loadAlertas()
    refreshAlertas()
  }

  const filtered = alertas.filter(a => {
    if (filter === 'pendentes') return !a.lido
    if (filter === 'lidos') return a.lido
    return true
  })

  const pendentesCount = alertas.filter(a => !a.lido).length

  return (
    <div>
      <PageHeader title="Alertas" subtitle={`${pendentesCount} alertas pendentes`}
        actions={
          pendentesCount > 0 && (
            <Button variant="outline" size="sm" onClick={handleMarcarTodosLidos}>
              <CheckCircle size={14} />Marcar todos como lidos
            </Button>
          )
        } />
      <div className="p-6">
        <div className="flex gap-2 mb-6">
          {[{ key: 'pendentes', label: 'Pendentes' }, { key: 'todos', label: 'Todos' }, { key: 'lidos', label: 'Lidos' }].map(f => (
            <button key={f.key} onClick={() => setFilter(f.key as any)}
              className={`px-4 py-1.5 text-sm rounded-full font-medium transition-colors ${filter === f.key ? 'bg-[#E85D04] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              {f.label}
            </button>
          ))}
        </div>

        <div className="space-y-3">
          {filtered.map(a => {
            const cfg = TIPO_CONFIG[a.tipo] || TIPO_CONFIG.info
            return (
              <Card key={a.id} className={a.lido ? 'opacity-60' : ''}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className={`mt-0.5 ${a.lido ? 'text-gray-300' : 'text-[#E85D04]'}`}>{cfg.icon}</div>
                    <div>
                      <p className={`text-sm font-medium ${a.lido ? 'text-gray-400' : 'text-[#1A1A2E]'}`}>{a.mensagem}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{formatDate(a.criado_em)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <Badge variant={a.lido ? 'default' : cfg.variant}>
                      {a.tipo?.replace(/_/g, ' ') || 'alerta'}
                    </Badge>
                    {!a.lido && (
                      <Button variant="outline" size="sm" onClick={() => handleMarcarLido(a.id)}>Lido</Button>
                    )}
                  </div>
                </div>
              </Card>
            )
          })}
          {filtered.length === 0 && (
            <div className="text-center py-12">
              <Bell size={32} className="mx-auto text-gray-200 mb-3" />
              <p className="text-sm text-gray-400">Nenhum alerta {filter === 'pendentes' ? 'pendente' : filter === 'lidos' ? 'lido' : ''}.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
