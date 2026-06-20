import React, { useEffect, useState } from 'react'
import { Plus, Package, ArrowDown, ArrowUp } from 'lucide-react'
import { useApp } from '../store/AppContext'
import { PageHeader } from '../components/layout/Layout'
import { Button } from '../components/ui/Button'
import { Input, Select, Textarea } from '../components/ui/Input'
import { Modal } from '../components/ui/Modal'
import { Card, Badge } from '../components/ui/Card'
import { formatDate, today } from '../lib/utils'

export function Materiais() {
  const { invoke } = useApp()
  const [materiais, setMateriais] = useState<any[]>([])
  const [movimentos, setMovimentos] = useState<any[]>([])
  const [obras, setObras] = useState<any[]>([])
  const [obraId, setObraId] = useState<string>('')
  const [tab, setTab] = useState<'estoque' | 'movimentos'>('estoque')
  const [modal, setModal] = useState(false)
  const [movModal, setMovModal] = useState(false)
  const [form, setForm] = useState<any>({ unidade: 'un', estoque_minimo: 0 })
  const [movForm, setMovForm] = useState<any>({ tipo: 'entrada', data: today(), quantidade: 1 })
  const [loading, setLoading] = useState(false)

  useEffect(() => { invoke('obras:list').then(setObras) }, [])
  useEffect(() => { if (obraId) loadMateriais() }, [obraId])

  async function loadMateriais() {
    setMateriais(await invoke('materiais:list', parseInt(obraId)))
    setMovimentos(await invoke('materiais:movimentos-obra', parseInt(obraId)))
  }

  async function loadAll() {
    if (obraId) loadMateriais()
  }

  async function handleCreateMaterial(e: React.FormEvent) {
    e.preventDefault(); setLoading(true)
    try {
      await invoke('materiais:create', { ...form, obra_id: parseInt(obraId) })
      await loadAll(); setModal(false); setForm({ unidade: 'un', estoque_minimo: 0 })
    } finally { setLoading(false) }
  }

  async function handleCreateMovimento(e: React.FormEvent) {
    e.preventDefault(); setLoading(true)
    try { await invoke('materiais:movimentar', movForm); await loadAll(); setMovModal(false); setMovForm({ tipo: 'entrada', data: today(), quantidade: 1 }) }
    finally { setLoading(false) }
  }

  return (
    <div>
      <PageHeader title="Materiais" subtitle="Estoque e movimentações"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setMovModal(true)} disabled={!obraId}><ArrowDown size={16} />Movimentar</Button>
            <Button onClick={() => setModal(true)} disabled={!obraId}><Plus size={16} />Novo Material</Button>
          </div>
        } />

      <div className="px-6 py-3 border-b border-gray-100 bg-white">
        <Select label="" value={obraId} onChange={e => setObraId(e.target.value)}
          options={[{ value: '', label: 'Selecione uma obra...' }, ...obras.map(o => ({ value: String(o.id), label: o.nome }))]} />
      </div>

      <div className="flex border-b border-gray-100 bg-white px-6">
        {[{ key: 'estoque', label: 'Estoque' }, { key: 'movimentos', label: 'Movimentações' }].map(t => (
          <button key={t.key} onClick={() => setTab(t.key as any)}
            className={`py-3 px-4 text-sm font-medium border-b-2 transition-colors ${tab === t.key ? 'border-[#E85D04] text-[#E85D04]' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="p-6">
        {!obraId && <p className="text-sm text-gray-400 text-center py-8">Selecione uma obra para ver o estoque.</p>}
        {obraId && tab === 'estoque' && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {materiais.map(m => {
              const baixo = m.estoque_atual <= m.estoque_minimo
              return (
                <Card key={m.id}>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-[#E85D04]/10 flex items-center justify-center">
                        <Package size={20} className="text-[#E85D04]" />
                      </div>
                      <div>
                        <p className="font-semibold text-[#1A1A2E]">{m.nome}</p>
                        <p className="text-xs text-gray-500">{m.categoria || '—'}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-bold text-lg ${baixo ? 'text-red-500' : 'text-[#E85D04]'}`}>{m.estoque_atual}</p>
                      <p className="text-xs text-gray-400">{m.unidade}</p>
                    </div>
                  </div>
                  {baixo && <p className="text-xs text-red-500 mt-2">Estoque baixo (mín: {m.estoque_minimo} {m.unidade})</p>}
                  {m.custo_unitario && <p className="text-xs text-gray-400 mt-1">Custo unit.: R$ {m.custo_unitario.toFixed(2)}</p>}
                </Card>
              )
            })}
            {materiais.length === 0 && <p className="text-sm text-gray-400">Nenhum material cadastrado.</p>}
          </div>
        )}

        {obraId && tab === 'movimentos' && (
          <div className="space-y-2">
            {movimentos.map(m => (
              <Card key={m.id}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${m.tipo === 'entrada' ? 'bg-green-100' : 'bg-red-100'}`}>
                      {m.tipo === 'entrada'
                        ? <ArrowDown size={16} className="text-green-600" />
                        : <ArrowUp size={16} className="text-red-500" />}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{m.material_nome}</p>
                      <p className="text-xs text-gray-500">{formatDate(m.data)} {m.obra_nome ? `· ${m.obra_nome}` : ''}</p>
                      {m.observacao && <p className="text-xs text-gray-400">{m.observacao}</p>}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-bold ${m.tipo === 'entrada' ? 'text-green-600' : 'text-red-500'}`}>
                      {m.tipo === 'entrada' ? '+' : '-'}{m.quantidade} {m.unidade}
                    </p>
                  </div>
                </div>
              </Card>
            ))}
            {movimentos.length === 0 && <p className="text-sm text-gray-400 text-center py-8">Nenhuma movimentação registrada.</p>}
          </div>
        )}
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title="Novo Material">
        <form onSubmit={handleCreateMaterial} className="flex flex-col gap-4">
          <Input label="Nome *" value={form.nome || ''} onChange={e => setForm({ ...form, nome: e.target.value })} required />
          <Input label="Categoria" value={form.categoria || ''} onChange={e => setForm({ ...form, categoria: e.target.value })} placeholder="Ex: Cimento, Ferragem..." />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Unidade" value={form.unidade} onChange={e => setForm({ ...form, unidade: e.target.value })} placeholder="Ex: un, kg, m²" />
            <Input label="Estoque Inicial" type="number" min={0} value={form.estoque_atual ?? ''} onChange={e => setForm({ ...form, estoque_atual: parseFloat(e.target.value) })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Estoque Mínimo" type="number" min={0} value={form.estoque_minimo} onChange={e => setForm({ ...form, estoque_minimo: parseFloat(e.target.value) })} />
            <Input label="Custo Unitário (R$)" type="number" step="0.01" value={form.preco_unitario || ''} onChange={e => setForm({ ...form, preco_unitario: parseFloat(e.target.value) })} />
          </div>
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => setModal(false)}>Cancelar</Button>
            <Button type="submit" loading={loading}>Salvar</Button>
          </div>
        </form>
      </Modal>

      <Modal open={movModal} onClose={() => setMovModal(false)} title="Registrar Movimentação">
        <form onSubmit={handleCreateMovimento} className="flex flex-col gap-4">
          <Select label="Material *" value={movForm.material_id || ''} onChange={e => setMovForm({ ...movForm, material_id: parseInt(e.target.value) })}
            options={[{ value: '', label: 'Selecione...' }, ...materiais.map(m => ({ value: String(m.id), label: `${m.nome} (${m.estoque_atual} ${m.unidade})` }))]} />
          <Select label="Tipo *" value={movForm.tipo} onChange={e => setMovForm({ ...movForm, tipo: e.target.value })}
            options={[{ value: 'entrada', label: 'Entrada (compra/recebimento)' }, { value: 'saida', label: 'Saída (uso/consumo)' }]} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Quantidade *" type="number" min={0.01} step="0.01" value={movForm.quantidade} onChange={e => setMovForm({ ...movForm, quantidade: parseFloat(e.target.value) })} required />
            <Input label="Data *" type="date" value={movForm.data} onChange={e => setMovForm({ ...movForm, data: e.target.value })} required />
          </div>
          <Select label="Obra" value={movForm.obra_id || ''} onChange={e => setMovForm({ ...movForm, obra_id: parseInt(e.target.value) || null })}
            options={[{ value: '', label: 'Nenhuma' }, ...obras.map(o => ({ value: String(o.id), label: o.nome }))]} />
          <Textarea label="Observação" value={movForm.observacao || ''} onChange={e => setMovForm({ ...movForm, observacao: e.target.value })} rows={2} />
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => setMovModal(false)}>Cancelar</Button>
            <Button type="submit" loading={loading}>Registrar</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
