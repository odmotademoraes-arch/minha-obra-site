import React, { useEffect, useState } from 'react'
import { Search, Plus, Truck, Phone, Mail, MapPin, Edit2, Trash2 } from 'lucide-react'
import { useApp } from '../store/AppContext'
import { PageHeader } from '../components/layout/Layout'
import { Button } from '../components/ui/Button'
import { Input, Select } from '../components/ui/Input'
import { Modal } from '../components/ui/Modal'
import { Card, Badge, EmptyState } from '../components/ui/Card'

const CATEGORIAS = [
  { value: 'material', label: 'Material de Construção' },
  { value: 'servico', label: 'Serviço / Mão de Obra' },
  { value: 'equipamento', label: 'Equipamento / Locação' },
  { value: 'transportadora', label: 'Transportadora' },
  { value: 'epi', label: 'EPI / Segurança' },
  { value: 'outro', label: 'Outro' },
]

const CAT_COLORS: Record<string, string> = {
  material: 'bg-blue-100 text-blue-700',
  servico: 'bg-green-100 text-green-700',
  equipamento: 'bg-yellow-100 text-yellow-700',
  transportadora: 'bg-purple-100 text-purple-700',
  epi: 'bg-orange-100 text-orange-700',
  outro: 'bg-gray-100 text-gray-600',
}

function formatCNPJ(v: string) {
  const n = v.replace(/\D/g, '').slice(0, 14)
  if (n.length <= 2) return n
  if (n.length <= 5) return `${n.slice(0,2)}.${n.slice(2)}`
  if (n.length <= 8) return `${n.slice(0,2)}.${n.slice(2,5)}.${n.slice(5)}`
  if (n.length <= 12) return `${n.slice(0,2)}.${n.slice(2,5)}.${n.slice(5,8)}/${n.slice(8)}`
  return `${n.slice(0,2)}.${n.slice(2,5)}.${n.slice(5,8)}/${n.slice(8,12)}-${n.slice(12)}`
}

function formatTel(v: string) {
  const n = v.replace(/\D/g, '').slice(0, 11)
  if (n.length <= 2) return n
  if (n.length <= 6) return `(${n.slice(0,2)}) ${n.slice(2)}`
  if (n.length <= 10) return `(${n.slice(0,2)}) ${n.slice(2,6)}-${n.slice(6)}`
  return `(${n.slice(0,2)}) ${n.slice(2,7)}-${n.slice(7)}`
}

const FORM_VAZIO = { categoria: 'material', ativo: 1 }

export function Fornecedores() {
  const { invoke } = useApp()
  const [fornecedores, setFornecedores] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [filterCat, setFilterCat] = useState('')
  const [modal, setModal] = useState(false)
  const [editando, setEditando] = useState<any>(null)
  const [form, setForm] = useState<any>(FORM_VAZIO)
  const [loading, setLoading] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<any>(null)

  useEffect(() => { load() }, [])

  async function load() {
    setFornecedores(await invoke('fornecedores:list'))
  }

  function abrirNovo() {
    setEditando(null)
    setForm(FORM_VAZIO)
    setModal(true)
  }

  function abrirEditar(f: any) {
    setEditando(f)
    setForm({ ...f })
    setModal(true)
  }

  async function handleSalvar(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      if (editando) {
        await invoke('fornecedores:update', { id: editando.id, ...form })
      } else {
        await invoke('fornecedores:create', form)
      }
      await load()
      setModal(false)
    } finally { setLoading(false) }
  }

  async function handleDelete(id: number) {
    await invoke('fornecedores:delete', id)
    await load()
    setConfirmDelete(null)
  }

  const filtered = fornecedores.filter(f => {
    const q = search.toLowerCase()
    const match = f.nome.toLowerCase().includes(q) ||
      (f.cnpj_cpf || '').includes(q) ||
      (f.cidade || '').toLowerCase().includes(q) ||
      (f.contato || '').toLowerCase().includes(q)
    return match && (!filterCat || f.categoria === filterCat)
  })

  const catLabel = (cat: string) => CATEGORIAS.find(c => c.value === cat)?.label || cat

  return (
    <div>
      <PageHeader title="Fornecedores" subtitle={`${fornecedores.length} cadastrados`}
        actions={<Button onClick={abrirNovo}><Plus size={16} />Novo Fornecedor</Button>} />

      <div className="p-6">
        {/* Filtros */}
        <div className="flex gap-3 mb-6 flex-wrap">
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por nome, CNPJ, cidade..."
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:border-[#E85D04] outline-none" />
          </div>
          <select value={filterCat} onChange={e => setFilterCat(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:border-[#E85D04] outline-none">
            <option value="">Todas as categorias</option>
            {CATEGORIAS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </div>

        {/* Cards */}
        {filtered.length === 0 ? (
          <EmptyState icon={<Truck size={32} />} title="Nenhum fornecedor encontrado"
            action={<Button onClick={abrirNovo}>Novo Fornecedor</Button>} />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map(f => (
              <Card key={f.id}>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-10 h-10 rounded-lg bg-[#E85D04]/10 flex items-center justify-center text-[#E85D04] font-bold text-lg flex-shrink-0">
                      {f.nome.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-[#1A1A2E] truncate">{f.nome}</p>
                      {f.cnpj_cpf && <p className="text-xs text-gray-400">{f.cnpj_cpf}</p>}
                    </div>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${CAT_COLORS[f.categoria] || 'bg-gray-100 text-gray-600'}`}>
                    {catLabel(f.categoria)}
                  </span>
                </div>

                <div className="space-y-1.5 text-xs text-gray-500 mb-3">
                  {f.telefone && (
                    <div className="flex items-center gap-1.5">
                      <Phone size={11} className="text-gray-400" />
                      <span>{f.telefone}</span>
                      {f.contato && <span className="text-gray-400">· {f.contato}</span>}
                    </div>
                  )}
                  {f.email && (
                    <div className="flex items-center gap-1.5">
                      <Mail size={11} className="text-gray-400" />
                      <span className="truncate">{f.email}</span>
                    </div>
                  )}
                  {(f.cidade || f.estado) && (
                    <div className="flex items-center gap-1.5">
                      <MapPin size={11} className="text-gray-400" />
                      <span>{[f.cidade, f.estado].filter(Boolean).join(' – ')}</span>
                    </div>
                  )}
                </div>

                {f.observacoes && (
                  <p className="text-xs text-gray-400 italic border-t border-gray-50 pt-2 mt-2 line-clamp-2">{f.observacoes}</p>
                )}

                <div className="flex gap-2 mt-3 pt-3 border-t border-gray-50">
                  <button onClick={() => abrirEditar(f)}
                    className="flex items-center gap-1 text-xs text-gray-500 hover:text-[#E85D04] transition-colors">
                    <Edit2 size={12} /> Editar
                  </button>
                  <button onClick={() => setConfirmDelete(f)}
                    className="flex items-center gap-1 text-xs text-gray-500 hover:text-red-500 transition-colors ml-auto">
                    <Trash2 size={12} /> Remover
                  </button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Modal criar/editar */}
      <Modal open={modal} onClose={() => setModal(false)}
        title={editando ? 'Editar Fornecedor' : 'Novo Fornecedor'} size="lg">
        <form onSubmit={handleSalvar} className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <Input label="Nome / Razão Social *" value={form.nome || ''} required
              onChange={e => setForm({ ...form, nome: e.target.value })} />
          </div>
          <Input label="CNPJ / CPF" value={form.cnpj_cpf || ''}
            onChange={e => setForm({ ...form, cnpj_cpf: formatCNPJ(e.target.value) })}
            placeholder="00.000.000/0000-00" maxLength={18} />
          <Select label="Categoria" value={form.categoria || 'material'}
            onChange={e => setForm({ ...form, categoria: e.target.value })}
            options={CATEGORIAS} />
          <Input label="Telefone" value={form.telefone || ''}
            onChange={e => setForm({ ...form, telefone: formatTel(e.target.value) })}
            placeholder="(00) 00000-0000" maxLength={15} />
          <Input label="Nome do Contato" value={form.contato || ''}
            onChange={e => setForm({ ...form, contato: e.target.value })}
            placeholder="Pessoa responsável" />
          <div className="col-span-2">
            <Input label="E-mail" type="email" value={form.email || ''}
              onChange={e => setForm({ ...form, email: e.target.value })}
              placeholder="contato@empresa.com.br" />
          </div>
          <div className="col-span-2">
            <Input label="Endereço" value={form.endereco || ''}
              onChange={e => setForm({ ...form, endereco: e.target.value })} />
          </div>
          <Input label="Cidade" value={form.cidade || ''}
            onChange={e => setForm({ ...form, cidade: e.target.value })} />
          <Input label="Estado" value={form.estado || ''}
            onChange={e => setForm({ ...form, estado: e.target.value })}
            placeholder="SP" maxLength={2} />
          <Input label="CEP" value={form.cep || ''}
            onChange={e => setForm({ ...form, cep: e.target.value })}
            placeholder="00000-000" maxLength={9} />
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Observações</label>
            <textarea value={form.observacoes || ''} rows={2}
              onChange={e => setForm({ ...form, observacoes: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:border-[#E85D04] outline-none resize-none"
              placeholder="Condições de pagamento, prazo de entrega..." />
          </div>
          <div className="col-span-2 flex justify-end gap-3 mt-2">
            <Button type="button" variant="outline" onClick={() => setModal(false)}>Cancelar</Button>
            <Button type="submit" loading={loading}>{editando ? 'Salvar' : 'Cadastrar'}</Button>
          </div>
        </form>
      </Modal>

      {/* Confirmar exclusão */}
      <Modal open={!!confirmDelete} onClose={() => setConfirmDelete(null)} title="Remover Fornecedor">
        <p className="text-sm text-gray-600 mb-6">
          Deseja remover <strong>{confirmDelete?.nome}</strong>? O fornecedor será desativado mas não excluído permanentemente.
        </p>
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => setConfirmDelete(null)}>Cancelar</Button>
          <Button onClick={() => handleDelete(confirmDelete.id)}
            className="bg-red-500 hover:bg-red-600 text-white">Remover</Button>
        </div>
      </Modal>
    </div>
  )
}
