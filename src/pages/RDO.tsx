import React, { useEffect, useState } from 'react'
import { Plus, Cloud, Sun, CloudRain, CloudSnow } from 'lucide-react'
import { useApp } from '../store/AppContext'
import { PageHeader } from '../components/layout/Layout'
import { Button } from '../components/ui/Button'
import { Input, Select, Textarea } from '../components/ui/Input'
import { Modal } from '../components/ui/Modal'
import { Card } from '../components/ui/Card'
import { formatDate, today } from '../lib/utils'

const CLIMA_ICONS: Record<string, React.ReactNode> = {
  sol: <Sun size={16} className="text-yellow-500" />,
  nublado: <Cloud size={16} className="text-gray-400" />,
  chuva: <CloudRain size={16} className="text-blue-500" />,
  frio: <CloudSnow size={16} className="text-blue-300" />,
}

export function RDO() {
  const { invoke, user } = useApp()
  const [rdos, setRdos] = useState<any[]>([])
  const [obras, setObras] = useState<any[]>([])
  const [funcionarios, setFuncionarios] = useState<any[]>([])
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState<any>({ data: today(), clima: 'sol', atividades: '' })
  const [presentes, setPresentes] = useState<number[]>([])
  const [loading, setLoading] = useState(false)
  const [filterObra, setFilterObra] = useState('')

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    setRdos(await invoke('rdos:list-all'))
    setObras(await invoke('obras:list'))
    setFuncionarios(await invoke('funcionarios:list'))
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault(); setLoading(true)
    try {
      await invoke('rdos:create', { ...form, engenheiro_id: user?.id, funcionarios_presentes: presentes })
      await loadAll()
      setModal(false)
      setForm({ data: today(), clima: 'sol', atividades: '' })
      setPresentes([])
    } finally { setLoading(false) }
  }

  const filtered = rdos.filter(r => !filterObra || String(r.obra_id) === filterObra)

  return (
    <div>
      <PageHeader title="RDO" subtitle="Relatório Diário de Obra"
        actions={<Button onClick={() => setModal(true)}><Plus size={16} />Novo RDO</Button>} />
      <div className="p-6">
        <div className="mb-6">
          <select value={filterObra} onChange={e => setFilterObra(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:border-[#E85D04] outline-none">
            <option value="">Todas as obras</option>
            {obras.map(o => <option key={o.id} value={String(o.id)}>{o.nome}</option>)}
          </select>
        </div>

        <div className="space-y-4">
          {filtered.map(r => (
            <Card key={r.id}>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="font-bold text-[#E85D04]">{formatDate(r.data)}</span>
                    <span className="flex items-center gap-1 text-sm text-gray-500">
                      {CLIMA_ICONS[r.clima]}{r.clima}
                    </span>
                    {r.obra_nome && <span className="text-xs bg-gray-100 px-2 py-0.5 rounded-full text-gray-600">{r.obra_nome}</span>}
                  </div>
                  <p className="text-sm text-gray-700 whitespace-pre-line">{r.atividades}</p>
                  {r.ocorrencias && <p className="text-xs text-amber-700 bg-amber-50 rounded p-2 mt-2">Ocorrências: {r.ocorrencias}</p>}
                  {r.total_presentes > 0 && <p className="text-xs text-gray-400 mt-2">{r.total_presentes} funcionário(s) presentes</p>}
                </div>
              </div>
            </Card>
          ))}
          {filtered.length === 0 && <p className="text-sm text-gray-400 text-center py-8">Nenhum RDO registrado.</p>}
        </div>
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title="Novo Relatório Diário (RDO)" size="lg">
        <form onSubmit={handleCreate} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="Data *" type="date" value={form.data} onChange={e => setForm({ ...form, data: e.target.value })} required />
            <Select label="Clima" value={form.clima} onChange={e => setForm({ ...form, clima: e.target.value })}
              options={[{ value: 'sol', label: 'Ensolarado' }, { value: 'nublado', label: 'Nublado' }, { value: 'chuva', label: 'Chuvoso' }, { value: 'frio', label: 'Frio' }]} />
          </div>
          <Select label="Obra *" value={form.obra_id || ''} onChange={e => setForm({ ...form, obra_id: parseInt(e.target.value) })}
            options={[{ value: '', label: 'Selecione...' }, ...obras.map(o => ({ value: String(o.id), label: o.nome }))]} />
          <Textarea label="Atividades Realizadas *" value={form.atividades} onChange={e => setForm({ ...form, atividades: e.target.value })} rows={4} required placeholder="Descreva as atividades realizadas no dia..." />
          <Textarea label="Ocorrências / Observações" value={form.ocorrencias || ''} onChange={e => setForm({ ...form, ocorrencias: e.target.value })} rows={2} />
          <div>
            <p className="text-sm font-medium text-[#1A1A2E] mb-2">Presença dos Funcionários</p>
            <div className="grid grid-cols-2 gap-1 max-h-40 overflow-y-auto border border-gray-200 rounded-lg p-3">
              {funcionarios.filter(f => f.status === 'ativo').map(f => (
                <label key={f.id} className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={presentes.includes(f.id)}
                    onChange={ev => setPresentes(ev.target.checked ? [...presentes, f.id] : presentes.filter(x => x !== f.id))}
                    className="accent-[#E85D04]" />
                  {f.nome}
                </label>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => setModal(false)}>Cancelar</Button>
            <Button type="submit" loading={loading}>Salvar RDO</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
