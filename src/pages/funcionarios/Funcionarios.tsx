import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, Users } from 'lucide-react'
import { useApp } from '../../store/AppContext'
import { PageHeader } from '../../components/layout/Layout'
import { Button } from '../../components/ui/Button'
import { Input, Select } from '../../components/ui/Input'
import { Modal } from '../../components/ui/Modal'
import { Card, Badge, EmptyState } from '../../components/ui/Card'
import { formatDate, statusLabel, statusVariant, today } from '../../lib/utils'

function formatCPF(v: string) {
  const n = v.replace(/\D/g, '').slice(0, 11)
  if (n.length <= 3) return n
  if (n.length <= 6) return `${n.slice(0,3)}.${n.slice(3)}`
  if (n.length <= 9) return `${n.slice(0,3)}.${n.slice(3,6)}.${n.slice(6)}`
  return `${n.slice(0,3)}.${n.slice(3,6)}.${n.slice(6,9)}-${n.slice(9)}`
}

function formatRG(v: string) {
  const n = v.replace(/\D/g, '').slice(0, 9)
  if (n.length <= 2) return n
  if (n.length <= 5) return `${n.slice(0,2)}.${n.slice(2)}`
  if (n.length <= 8) return `${n.slice(0,2)}.${n.slice(2,5)}.${n.slice(5)}`
  return `${n.slice(0,2)}.${n.slice(2,5)}.${n.slice(5,8)}-${n.slice(8)}`
}

export function Funcionarios() {
  const { invoke } = useApp()
  const navigate = useNavigate()
  const [funcionarios, setFuncionarios] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState<any>({ categoria: 'operacional', horas_diarias: 8, hora_extra_percentual: 50 })
  const [loading, setLoading] = useState(false)

  useEffect(() => { invoke('funcionarios:list').then(setFuncionarios) }, [])

  const filtered = funcionarios.filter(f => {
    const match = f.nome.toLowerCase().includes(search.toLowerCase()) ||
      (f.cargo || '').toLowerCase().includes(search.toLowerCase()) ||
      (f.cpf || '').includes(search)
    return match && (!filterStatus || f.status === filterStatus)
  })

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      await invoke('funcionarios:create', form)
      setFuncionarios(await invoke('funcionarios:list'))
      setModal(false)
      setForm({ categoria: 'operacional', horas_diarias: 8, hora_extra_percentual: 50 })
    } finally { setLoading(false) }
  }

  return (
    <div>
      <PageHeader title="Funcionários" subtitle={`${funcionarios.length} cadastrados`}
        actions={<Button onClick={() => setModal(true)}><Plus size={16} />Novo Funcionário</Button>} />
      <div className="p-6">
        <div className="flex gap-3 mb-6">
          <div className="relative flex-1 max-w-xs">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar funcionários..."
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:border-[#E85D04] outline-none" />
          </div>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:border-[#E85D04] outline-none">
            <option value="">Todos os status</option>
            <option value="ativo">Ativo</option>
            <option value="afastado">Afastado</option>
            <option value="desligado">Desligado</option>
          </select>
        </div>

        {filtered.length === 0 ? (
          <EmptyState icon={<Users size={32} />} title="Nenhum funcionário encontrado"
            action={<Button onClick={() => setModal(true)}>Novo Funcionário</Button>} />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map(f => (
              <Card key={f.id} hover onClick={() => navigate(`/funcionarios/${f.id}`)}>
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-full bg-[#E85D04]/10 flex items-center justify-center text-lg font-bold text-[#E85D04] flex-shrink-0">
                    {f.nome.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="font-semibold text-[#1A1A2E] truncate">{f.nome}</p>
                      <Badge variant={statusVariant(f.status)}>{statusLabel(f.status)}</Badge>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">{f.cargo}</p>
                    {f.cpf && <p className="text-xs text-gray-400 mt-0.5">CPF: {f.cpf}</p>}
                    {f.data_admissao && <p className="text-xs text-gray-400">Admissão: {formatDate(f.data_admissao)}</p>}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title="Novo Funcionário" size="lg">
        <form onSubmit={handleCreate} className="grid grid-cols-2 gap-4">
          {/* Identificação */}
          <div className="col-span-2 text-xs font-semibold text-gray-500 uppercase tracking-wide pt-1">Identificação</div>
          <div className="col-span-2"><Input label="Nome Completo *" value={form.nome || ''} onChange={e => setForm({ ...form, nome: e.target.value })} required /></div>
          <Input label="CPF" value={form.cpf || ''} onChange={e => setForm({ ...form, cpf: formatCPF(e.target.value) })} placeholder="000.000.000-00" maxLength={14} />
          <Input label="RG" value={form.rg || ''} onChange={e => setForm({ ...form, rg: formatRG(e.target.value) })} placeholder="00.000.000-0" maxLength={12} />
          <Input label="Data de Nascimento" type="date" value={form.data_nascimento || ''} onChange={e => setForm({ ...form, data_nascimento: e.target.value })} />
          <Select label="Tipo Sanguíneo" value={form.tipo_sanguineo || ''} onChange={e => setForm({ ...form, tipo_sanguineo: e.target.value })}
            options={[{ value: '', label: '—' }, ...['A+','A-','B+','B-','AB+','AB-','O+','O-'].map(v => ({ value: v, label: v }))]} />

          {/* Função */}
          <div className="col-span-2 text-xs font-semibold text-gray-500 uppercase tracking-wide pt-1">Função</div>
          <Input label="Cargo *" value={form.cargo || ''} onChange={e => setForm({ ...form, cargo: e.target.value })} required />
          <Select label="Categoria" value={form.categoria || 'operacional'} onChange={e => setForm({ ...form, categoria: e.target.value })}
            options={[
              { value: 'operacional', label: 'Operacional' },
              { value: 'tecnico', label: 'Técnico' },
              { value: 'administrativo', label: 'Administrativo' },
              { value: 'seguranca', label: 'Segurança / Vigilância' },
              { value: 'terceirizado', label: 'Terceirizado' },
            ]} />
          <Input label="Matrícula" value={form.matricula || ''} onChange={e => setForm({ ...form, matricula: e.target.value })} />
          <Input label="Data de Admissão" type="date" value={form.data_admissao || ''} onChange={e => setForm({ ...form, data_admissao: e.target.value })} />

          {/* Contato */}
          <div className="col-span-2 text-xs font-semibold text-gray-500 uppercase tracking-wide pt-1">Contato</div>
          <Input label="E-mail" type="email" value={form.email || ''} onChange={e => setForm({ ...form, email: e.target.value })} />
          <Input label="Celular" value={form.celular || ''} onChange={e => setForm({ ...form, celular: e.target.value })} />

          {/* Salário e Benefícios */}
          <div className="col-span-2 text-xs font-semibold text-gray-500 uppercase tracking-wide pt-1">Salário e Benefícios</div>
          <Input label="Salário Base (R$)" type="number" step="0.01" min="0" value={form.salario_base || ''} onChange={e => setForm({ ...form, salario_base: parseFloat(e.target.value) || 0 })} placeholder="0,00" />
          <Input label="Vale Transporte (R$/dia)" type="number" step="0.01" min="0" value={form.vale_transporte || ''} onChange={e => setForm({ ...form, vale_transporte: parseFloat(e.target.value) || 0 })} placeholder="0,00" />
          <Input label="Vale Refeição (R$/dia)" type="number" step="0.01" min="0" value={form.vale_refeicao || ''} onChange={e => setForm({ ...form, vale_refeicao: parseFloat(e.target.value) || 0 })} placeholder="0,00" />
          <Input label="Plano de Saúde (R$/mês)" type="number" step="0.01" min="0" value={form.plano_saude || ''} onChange={e => setForm({ ...form, plano_saude: parseFloat(e.target.value) || 0 })} placeholder="0,00" />
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Outros Benefícios</label>
            <input value={form.outros_beneficios || ''} onChange={e => setForm({ ...form, outros_beneficios: e.target.value })}
              placeholder="Ex: auxílio combustível, seguro de vida, PLR..."
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:border-[#E85D04] outline-none" />
          </div>

          {/* Jornada */}
          <div className="col-span-2 text-xs font-semibold text-gray-500 uppercase tracking-wide pt-1">Jornada de Trabalho</div>
          <Input label="Horas diárias" type="number" step="0.5" min="1" max="24" value={form.horas_diarias ?? 8} onChange={e => setForm({ ...form, horas_diarias: parseFloat(e.target.value) })} />
          <Select label="% Hora Extra" value={String(form.hora_extra_percentual ?? 50)} onChange={e => setForm({ ...form, hora_extra_percentual: parseInt(e.target.value) })}
            options={[
              { value: '50', label: '50% (padrão CLT)' },
              { value: '100', label: '100% (domingos/feriados)' },
              { value: '75', label: '75%' },
            ]} />

          <div className="col-span-2 flex justify-end gap-3 mt-2">
            <Button type="button" variant="outline" onClick={() => setModal(false)}>Cancelar</Button>
            <Button type="submit" loading={loading}>Cadastrar</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
