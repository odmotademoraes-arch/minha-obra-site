import React, { useEffect, useState } from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { useApp } from '../store/AppContext'
import { PageHeader } from '../components/layout/Layout'
import { Card, ProgressBar } from '../components/ui/Card'
import { Select } from '../components/ui/Input'

export function Cronograma() {
  const { invoke } = useApp()
  const [obras, setObras] = useState<any[]>([])
  const [obraId, setObraId] = useState<number | null>(null)
  const [etapas, setEtapas] = useState<any[]>([])

  useEffect(() => {
    invoke('obras:list').then(list => {
      setObras(list)
      if (list.length > 0) { setObraId(list[0].id); loadEtapas(list[0].id) }
    })
  }, [])

  async function loadEtapas(id: number) {
    const list = await invoke('cronograma:list', id)
    setEtapas(list)
  }

  async function handleChange(id: number, progresso: number) {
    await invoke('cronograma:update-etapa', { id, progresso })
    if (obraId) loadEtapas(obraId)
  }

  const pieData = [
    { name: 'Concluído', value: etapas.reduce((s, e) => s + (e.progresso || 0), 0) / Math.max(etapas.length, 1) },
    { name: 'Restante', value: 100 - (etapas.reduce((s, e) => s + (e.progresso || 0), 0) / Math.max(etapas.length, 1)) },
  ]

  return (
    <div>
      <PageHeader title="Cronograma" subtitle="Progresso das etapas por obra" />
      <div className="p-6">
        <div className="mb-6">
          <Select label="Obra" value={obraId ? String(obraId) : ''} onChange={e => { const id = parseInt(e.target.value); setObraId(id); loadEtapas(id) }}
            options={obras.map(o => ({ value: String(o.id), label: o.nome }))} />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2 space-y-3">
            {etapas.map(e => (
              <Card key={e.id}>
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium">{e.nome}</span>
                      <span className="font-bold text-[#E85D04]">{e.progresso?.toFixed(0) ?? 0}%</span>
                    </div>
                    <ProgressBar value={e.progresso || 0} />
                  </div>
                  <input type="range" min={0} max={100} step={5} value={e.progresso || 0}
                    onChange={ev => handleChange(e.id, parseFloat(ev.target.value))}
                    className="w-24 accent-[#E85D04]" />
                </div>
              </Card>
            ))}
            {etapas.length === 0 && <p className="text-sm text-gray-400">Selecione uma obra para ver o cronograma.</p>}
          </div>

          {etapas.length > 0 && (
            <Card>
              <h3 className="font-semibold text-[#1A1A2E] mb-4 text-center">Progresso Geral</h3>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value">
                    <Cell fill="#E85D04" /><Cell fill="#F3F4F6" />
                  </Pie>
                  <Tooltip formatter={(v: number) => `${v.toFixed(1)}%`} />
                </PieChart>
              </ResponsiveContainer>
              <p className="text-center text-2xl font-bold text-[#E85D04]">
                {pieData[0].value.toFixed(0)}%
              </p>
              <p className="text-center text-sm text-gray-500">concluído</p>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
