import React, { useEffect, useState } from 'react'
import { Plus, AlertTriangle, Shield, ClipboardList, FileText, Upload, ExternalLink } from 'lucide-react'
import { useApp } from '../../store/AppContext'
import { PageHeader } from '../../components/layout/Layout'
import { Button } from '../../components/ui/Button'
import { Input, Select, Textarea } from '../../components/ui/Input'
import { Modal } from '../../components/ui/Modal'
import { Card, Badge } from '../../components/ui/Card'
import { formatDate, today } from '../../lib/utils'

export function Seguranca() {
  const { invoke } = useApp()
  const [tab, setTab] = useState<'acidentes' | 'epis' | 'checklists'>('acidentes')
  const [acidentes, setAcidentes] = useState<any[]>([])
  const [epis, setEpis] = useState<any[]>([])
  const [checklists, setChecklists] = useState<any[]>([])
  const [obras, setObras] = useState<any[]>([])
  const [funcionarios, setFuncionarios] = useState<any[]>([])
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState<any>({ data_hora: today(), tipo: 'leve' })
  const [catPath, setCatPath] = useState('')
  const [epiModal, setEpiModal] = useState(false)
  const [epiForm, setEpiForm] = useState<any>({})
  const [loading, setLoading] = useState(false)

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    setAcidentes(await invoke('acidentes:list'))
    setEpis(await invoke('epis:list'))
    setChecklists(await invoke('checklists:list-all'))
    setObras(await invoke('obras:list'))
    setFuncionarios(await invoke('funcionarios:list'))
  }

  async function handlePickCAT() {
    const filePath = await invoke('dialog:open-file', {
      title: 'Selecionar CAT (PDF)',
      filters: [{ name: 'PDF', extensions: ['pdf'] }]
    })
    if (!filePath) return
    const dest = await invoke('file:save-copy', { sourcePath: filePath, destName: `cat-${Date.now()}.pdf` })
    setCatPath(dest)
    setForm((f: any) => ({ ...f, arquivo_cat_url: dest, cat_gerada: 1 }))
  }

  async function handleAnexarCATExistente(acidenteId: number) {
    const filePath = await invoke('dialog:open-file', {
      title: 'Selecionar CAT (PDF)',
      filters: [{ name: 'PDF', extensions: ['pdf'] }]
    })
    if (!filePath) return
    const dest = await invoke('file:save-copy', { sourcePath: filePath, destName: `cat-${Date.now()}.pdf` })
    await invoke('acidentes:update-cat', { id: acidenteId, arquivo_cat_url: dest })
    await loadAll()
  }

  async function handleCreateAcidente(e: React.FormEvent) {
    e.preventDefault(); setLoading(true)
    try {
      await invoke('acidentes:create', form)
      await loadAll()
      setModal(false)
      setForm({ data_hora: today(), tipo: 'leve' })
      setCatPath('')
    }
    finally { setLoading(false) }
  }

  async function handleCreateEpi(e: React.FormEvent) {
    e.preventDefault(); setLoading(true)
    try { await invoke('epis:create', epiForm); await loadAll(); setEpiModal(false); setEpiForm({ estoque_minimo: 5 }) }
    finally { setLoading(false) }
  }

  const gravBadge: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'info' | 'primary'> = { leve: 'warning', moderado: 'primary', grave: 'danger', fatal: 'danger' }

  return (
    <div>
      <PageHeader title="Segurança do Trabalho" subtitle="Acidentes, EPIs e checklists de segurança"
        actions={
          tab === 'acidentes'
            ? <Button onClick={() => setModal(true)}><Plus size={16} />Registrar Acidente</Button>
            : tab === 'epis'
            ? <Button onClick={() => setEpiModal(true)}><Plus size={16} />Novo EPI</Button>
            : null
        } />

      <div className="flex border-b border-gray-100 bg-white px-6">
        {[{ key: 'acidentes', label: 'Acidentes', icon: <AlertTriangle size={14} /> },
          { key: 'epis', label: 'EPIs', icon: <Shield size={14} /> },
          { key: 'checklists', label: 'Checklists', icon: <ClipboardList size={14} /> },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key as any)}
            className={`flex items-center gap-1.5 py-3 px-4 text-sm font-medium border-b-2 transition-colors ${tab === t.key ? 'border-[#E85D04] text-[#E85D04]' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      <div className="p-6">
        {tab === 'acidentes' && (
          <div className="space-y-3">
            {acidentes.map(a => (
              <Card key={a.id}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-[#1A1A2E]">{a.descricao?.slice(0, 80)}{a.descricao?.length > 80 ? '...' : ''}</p>
                    <div className="flex gap-3 mt-1 text-xs text-gray-500 flex-wrap">
                      <span>{formatDate(a.data_hora)}</span>
                      {a.obra_nome && <span>· {a.obra_nome}</span>}
                      {a.funcionario_nome && <span>· {a.funcionario_nome}</span>}
                    </div>
                    {a.medidas_corretivas && <p className="text-xs text-gray-500 mt-1">Medidas: {a.medidas_corretivas}</p>}
                    <div className="flex items-center gap-3 mt-2">
                      {a.arquivo_cat_url ? (
                        <button onClick={() => invoke('shell:open', a.arquivo_cat_url)}
                          className="flex items-center gap-1 text-xs text-[#E85D04] hover:underline font-medium">
                          <FileText size={12} /> Ver CAT
                        </button>
                      ) : (
                        <button onClick={() => handleAnexarCATExistente(a.id)}
                          className="flex items-center gap-1 text-xs text-gray-400 hover:text-[#E85D04] transition-colors">
                          <Upload size={12} /> Anexar CAT
                        </button>
                      )}
                    </div>
                  </div>
                  <Badge variant={gravBadge[a.tipo] || 'warning'}>{a.tipo}</Badge>
                </div>
              </Card>
            ))}
            {acidentes.length === 0 && <p className="text-sm text-gray-400 text-center py-8">Nenhum acidente registrado.</p>}
          </div>
        )}

        {tab === 'epis' && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {epis.map(e => (
              <Card key={e.id}>
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-[#E85D04]/10 flex items-center justify-center flex-shrink-0">
                    <Shield size={16} className="text-[#E85D04]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-[#1A1A2E] leading-snug">{e.nome}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {e.ca ? `CA ${e.ca}` : 'Sem CA'}
                      {e.fabricante ? ` · ${e.fabricante}` : ''}
                    </p>
                    {e.data_validade_ca && (
                      <p className="text-xs text-gray-400 mt-0.5">Val CA: {formatDate(e.data_validade_ca)}</p>
                    )}
                  </div>
                </div>
              </Card>
            ))}
            {epis.length === 0 && <p className="text-sm text-gray-400">Nenhum EPI cadastrado.</p>}
          </div>
        )}

        {tab === 'checklists' && (
          <div className="space-y-3">
            {checklists.map(c => (
              <Card key={c.id}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-[#1A1A2E]">{c.titulo}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{formatDate(c.data)} {c.obra_nome ? `· ${c.obra_nome}` : ''}</p>
                  </div>
                  <Badge variant={c.status === 'aprovado' ? 'success' : c.status === 'reprovado' ? 'danger' : 'warning'}>
                    {c.status || 'pendente'}
                  </Badge>
                </div>
              </Card>
            ))}
            {checklists.length === 0 && <p className="text-sm text-gray-400 text-center py-8">Nenhum checklist registrado.</p>}
          </div>
        )}
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title="Registrar Acidente" size="lg">
        <form onSubmit={handleCreateAcidente} className="flex flex-col gap-4">
          <Input label="Data/Hora *" type="datetime-local" value={form.data_hora} onChange={e => setForm({ ...form, data_hora: e.target.value })} required />
          <Select label="Tipo / Gravidade" value={form.tipo} onChange={e => setForm({ ...form, tipo: e.target.value })}
            options={[{ value: 'leve', label: 'Leve' }, { value: 'moderado', label: 'Moderado' }, { value: 'grave', label: 'Grave' }, { value: 'fatal', label: 'Fatal' }]} />
          <Select label="Obra *" value={form.obra_id || ''} onChange={e => setForm({ ...form, obra_id: parseInt(e.target.value) || null })}
            options={[{ value: '', label: 'Selecione...' }, ...obras.map(o => ({ value: String(o.id), label: o.nome }))]} />
          <Select label="Funcionário Envolvido" value={form.funcionario_id || ''} onChange={e => setForm({ ...form, funcionario_id: parseInt(e.target.value) || null })}
            options={[{ value: '', label: 'Nenhum' }, ...funcionarios.map(f => ({ value: String(f.id), label: f.nome }))]} />
          <Textarea label="Descrição *" value={form.descricao || ''} onChange={e => setForm({ ...form, descricao: e.target.value })} rows={3} required />
          <Textarea label="Medidas Corretivas" value={form.medidas_corretivas || ''} onChange={e => setForm({ ...form, medidas_corretivas: e.target.value })} rows={2} />

          {/* CAT — Comunicação de Acidente de Trabalho */}
          <div className="border border-dashed border-gray-300 rounded-lg p-3 bg-gray-50">
            <p className="text-xs font-semibold text-gray-600 mb-2">CAT — Comunicação de Acidente de Trabalho</p>
            <div className="flex items-center gap-3">
              <button type="button" onClick={handlePickCAT}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-gray-300 rounded-lg bg-white hover:border-[#E85D04] hover:text-[#E85D04] transition-colors">
                <Upload size={14} /> Anexar CAT (PDF)
              </button>
              {catPath && (
                <button type="button" onClick={() => invoke('shell:open', catPath)}
                  className="flex items-center gap-1 text-sm text-[#E85D04] hover:underline">
                  <FileText size={14} /> Ver PDF
                </button>
              )}
            </div>
            {catPath
              ? <p className="text-xs text-green-600 mt-1.5">✓ {catPath.split(/[\\/]/).pop()}</p>
              : <p className="text-xs text-gray-400 mt-1.5">Opcional — pode ser anexado depois na lista de acidentes</p>
            }
          </div>

          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => setModal(false)}>Cancelar</Button>
            <Button type="submit" loading={loading}>Registrar</Button>
          </div>
        </form>
      </Modal>

      <Modal open={epiModal} onClose={() => setEpiModal(false)} title="Novo EPI">
        <form onSubmit={handleCreateEpi} className="flex flex-col gap-4">
          <Input label="Nome *" value={epiForm.nome || ''} onChange={e => setEpiForm({ ...epiForm, nome: e.target.value })} required placeholder="Ex: Capacete Classe B" />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Número CA" value={epiForm.ca || ''} onChange={e => setEpiForm({ ...epiForm, ca: e.target.value })} placeholder="Ex: 31469" />
            <Input label="Fabricante" value={epiForm.fabricante || ''} onChange={e => setEpiForm({ ...epiForm, fabricante: e.target.value })} />
          </div>
          <Input label="Validade CA" type="date" value={epiForm.data_validade_ca || ''} onChange={e => setEpiForm({ ...epiForm, data_validade_ca: e.target.value })} />
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => setEpiModal(false)}>Cancelar</Button>
            <Button type="submit" loading={loading}>Salvar</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
