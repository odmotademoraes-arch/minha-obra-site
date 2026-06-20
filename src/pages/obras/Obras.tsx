import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, Building2 } from 'lucide-react'
import { useApp } from '../../store/AppContext'
import { PageHeader } from '../../components/layout/Layout'
import { Button } from '../../components/ui/Button'
import { Input, Select } from '../../components/ui/Input'
import { Modal } from '../../components/ui/Modal'
import { Card, Badge, ProgressBar, EmptyState } from '../../components/ui/Card'
import { formatCurrency, formatDate, statusLabel, statusVariant, today } from '../../lib/utils'

export function Obras() {
  const { invoke } = useApp()
  const navigate = useNavigate()
  const [obras, setObras] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState<any>({ status: 'planejamento' })
  const [loading, setLoading] = useState(false)
  const [engenheiros, setEngenheiros] = useState<any[]>([])

  useEffect(() => {
    invoke('obras:list').then(setObras)
    invoke('auth:list-users').then(setEngenheiros)
  }, [])

  const filtered = obras.filter(o => {
    const match = o.nome.toLowerCase().includes(search.toLowerCase()) ||
      (o.cidade || '').toLowerCase().includes(search.toLowerCase())
    return match && (!filterStatus || o.status === filterStatus)
  })

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      await invoke('obras:create', form)
      const list = await invoke('obras:list')
      setObras(list)
      setModal(false)
      setForm({ status: 'planejamento' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <PageHeader title="Obras" subtitle={`${obras.length} obras cadastradas`}
        actions={<Button onClick={() => setModal(true)}><Plus size={16} />Nova Obra</Button>} />
      <div className="p-6">
        <div className="flex gap-3 mb-6">
          <div className="relative flex-1 max-w-xs">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar obras..."
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:border-[#E85D04] focus:ring-2 focus:ring-orange-100 outline-none" />
          </div>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:border-[#E85D04] outline-none">
            <option value="">Todos os status</option>
            <option value="planejamento">Planejamento</option>
            <option value="em_andamento">Em Andamento</option>
            <option value="pausada">Pausada</option>
            <option value="concluida">Concluída</option>
          </select>
        </div>

        {filtered.length === 0 ? (
          <EmptyState icon={<Building2 size={32} />} title="Nenhuma obra encontrada"
            description="Crie sua primeira obra clicando em Nova Obra."
            action={<Button onClick={() => setModal(true)}>Nova Obra</Button>} />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map(o => (
              <Card key={o.id} hover onClick={() => navigate(`/obras/${o.id}`)}>
                <div className="flex items-start justify-between mb-2">
                  <div className="w-10 h-10 rounded-xl bg-[#E85D04]/10 flex items-center justify-center flex-shrink-0">
                    <Building2 size={20} className="text-[#E85D04]" />
                  </div>
                  <Badge variant={statusVariant(o.status)}>{statusLabel(o.status)}</Badge>
                </div>
                <h3 className="font-semibold text-[#1A1A2E] mt-2 truncate">{o.nome}</h3>
                <p className="text-xs text-gray-500 mt-0.5">{[o.cidade, o.estado].filter(Boolean).join(', ') || '—'}</p>
                <div className="mt-3">
                  <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                    <span>Progresso</span><span>{o.progresso?.toFixed(0) ?? 0}%</span>
                  </div>
                  <ProgressBar value={o.progresso || 0} />
                </div>
                <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                  <span>{formatCurrency(o.orcamento_realizado)} gastos</span>
                  <span>Prev. {formatDate(o.data_prevista)}</span>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title="Nova Obra" size="lg">
        <form onSubmit={handleCreate} className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <Input label="Nome da Obra *" value={form.nome || ''} onChange={e => setForm({ ...form, nome: e.target.value })} required />
          </div>
          <Input label="Endereço" value={form.endereco || ''} onChange={e => setForm({ ...form, endereco: e.target.value })} />
          <Input label="Cidade" value={form.cidade || ''} onChange={e => setForm({ ...form, cidade: e.target.value })} />
          <Input label="Estado" value={form.estado || ''} onChange={e => setForm({ ...form, estado: e.target.value })} />
          <Input label="CEP" value={form.cep || ''} onChange={e => setForm({ ...form, cep: e.target.value })} />
          <Select label="Status" value={form.status || 'planejamento'} onChange={e => setForm({ ...form, status: e.target.value })}
            options={[{ value: 'planejamento', label: 'Planejamento' }, { value: 'em_andamento', label: 'Em Andamento' }, { value: 'pausada', label: 'Pausada' }]} />
          <Input label="Orçamento Planejado (R$)" type="number" step="0.01" value={form.orcamento_planejado || ''} onChange={e => setForm({ ...form, orcamento_planejado: parseFloat(e.target.value) })} />
          <Input label="Data Início" type="date" value={form.data_inicio || ''} onChange={e => setForm({ ...form, data_inicio: e.target.value })} />
          <Input label="Data Prevista" type="date" value={form.data_prevista || ''} onChange={e => setForm({ ...form, data_prevista: e.target.value })} />
          <Input label="Área (m²)" type="number" step="0.01" value={form.area_m2 || ''} onChange={e => setForm({ ...form, area_m2: parseFloat(e.target.value) })} />
          <select className="col-span-2 px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:border-[#E85D04] outline-none"
            value={form.engenheiro_id || ''} onChange={e => setForm({ ...form, engenheiro_id: parseInt(e.target.value) || null })}>
            <option value="">Engenheiro responsável (opcional)</option>
            {engenheiros.map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}
          </select>
          <div className="col-span-2 flex justify-end gap-3 mt-2">
            <Button type="button" variant="outline" onClick={() => setModal(false)}>Cancelar</Button>
            <Button type="submit" loading={loading}>Criar Obra</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
