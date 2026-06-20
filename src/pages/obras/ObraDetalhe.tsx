import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, DollarSign, Edit, FileText, Upload,
  Image, Ruler, File, Trash2, FolderOpen, Plus, Eye
} from 'lucide-react'
import { useApp } from '../../store/AppContext'
import { PageHeader } from '../../components/layout/Layout'
import { Button } from '../../components/ui/Button'
import { Input, Select } from '../../components/ui/Input'
import { Modal } from '../../components/ui/Modal'
import { Card, Badge, ProgressBar, StatCard } from '../../components/ui/Card'
import { formatCurrency, formatDate, statusLabel, statusVariant } from '../../lib/utils'

const CATEGORIA_ARQ: Record<string, { label: string; color: string }> = {
  planta:    { label: 'Planta',    color: 'bg-blue-100 text-blue-700' },
  foto:      { label: 'Foto',      color: 'bg-green-100 text-green-700' },
  documento: { label: 'Documento', color: 'bg-purple-100 text-purple-700' },
  outro:     { label: 'Outro',     color: 'bg-gray-100 text-gray-600' },
}

function fileIcon(arquivo_url: string) {
  const ext = (arquivo_url || '').split('.').pop()?.toLowerCase() || ''
  if (['dwg', 'dxf'].includes(ext)) return <Ruler size={20} className="text-blue-500" />
  if (ext === 'pdf') return <FileText size={20} className="text-red-500" />
  if (['jpg', 'jpeg', 'png', 'webp'].includes(ext)) return <Image size={20} className="text-green-500" />
  return <File size={20} className="text-gray-400" />
}

export function ObraDetalhe() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { invoke, user } = useApp()
  const [obra, setObra] = useState<any>(null)
  const [tab, setTab] = useState<'info' | 'equipe' | 'financeiro' | 'cronograma' | 'arquivos'>('info')
  const [alocacoes, setAlocacoes] = useState<any[]>([])
  const [despesas, setDespesas] = useState<any[]>([])
  const [etapas, setEtapas] = useState<any[]>([])
  const [funcionarios, setFuncionarios] = useState<any[]>([])
  const [arquivos, setArquivos] = useState<any[]>([])
  const [editModal, setEditModal] = useState(false)
  const [editForm, setEditForm] = useState<any>({})
  const [despesaModal, setDespesaModal] = useState(false)
  const [despesaForm, setDespesaForm] = useState<any>({})
  const [nfPath, setNfPath] = useState<string>('')
  const [fornecedores, setFornecedores] = useState<any[]>([])
  const [arquivoModal, setArquivoModal] = useState(false)
  const [arquivoForm, setArquivoForm] = useState<any>({ nome: '', categoria: 'planta', versao: 'v1' })
  const [arquivoPath, setArquivoPath] = useState<string>('')
  const [filtroArq, setFiltroArq] = useState<string>('todos')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadAll()
    invoke('fornecedores:list').then(setFornecedores)
    loadArquivos()
  }, [id])

  async function loadAll() {
    const o = await invoke('obras:get', Number(id))
    setObra(o)
    setEditForm(o || {})
    setAlocacoes(await invoke('alocacoes:by-obra', Number(id)))
    setDespesas(await invoke('despesas:list', Number(id)))
    setEtapas(await invoke('cronograma:list', Number(id)))
    setFuncionarios(await invoke('funcionarios:list'))
  }

  async function loadArquivos() {
    setArquivos(await invoke('projetos:list', Number(id)))
  }

  async function handleSaveObra(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      await invoke('obras:update', { id: Number(id), ...editForm })
      await loadAll()
      setEditModal(false)
    } finally { setLoading(false) }
  }

  async function handlePickNF() {
    const filePath = await invoke('dialog:open-file', {
      title: 'Selecionar Nota Fiscal (PDF)',
      filters: [{ name: 'PDF', extensions: ['pdf'] }]
    })
    if (!filePath) return
    const dest = await invoke('file:save-copy', { sourcePath: filePath, destName: `nf-${Date.now()}.pdf` })
    setNfPath(dest)
    setDespesaForm((f: any) => ({ ...f, nota_fiscal: dest }))
  }

  async function handleAddDespesa(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      await invoke('despesas:create', { ...despesaForm, obra_id: Number(id), usuario_id: user?.id })
      await loadAll()
      setDespesaModal(false)
      setDespesaForm({})
      setNfPath('')
    } finally { setLoading(false) }
  }

  async function handleUpdateEtapa(etapaId: number, progresso: number) {
    await invoke('cronograma:update-etapa', { id: etapaId, progresso })
    const list = await invoke('cronograma:list', Number(id))
    setEtapas(list)
    const o = await invoke('obras:get', Number(id))
    setObra(o)
  }

  async function handlePickArquivo() {
    const filePath = await invoke('dialog:open-file', {
      title: 'Selecionar Arquivo',
      filters: [
        { name: 'Todos os formatos', extensions: ['dwg', 'dxf', 'pdf', 'jpg', 'jpeg', 'png', 'webp', 'doc', 'docx'] },
        { name: 'Plantas (DWG/DXF)', extensions: ['dwg', 'dxf'] },
        { name: 'PDF', extensions: ['pdf'] },
        { name: 'Imagens', extensions: ['jpg', 'jpeg', 'png', 'webp'] },
        { name: 'Documentos Word', extensions: ['doc', 'docx'] },
      ]
    })
    if (!filePath) return
    const fileName = filePath.split(/[\\/]/).pop() || 'arquivo'
    setArquivoPath(filePath)
    const nameNoExt = fileName.replace(/\.[^.]+$/, '')
    const ext = fileName.split('.').pop()?.toLowerCase() || ''
    // Sugerir categoria com base na extensão
    const catSugerida = ['dwg', 'dxf'].includes(ext) ? 'planta'
      : ['jpg', 'jpeg', 'png', 'webp'].includes(ext) ? 'foto'
      : ['pdf', 'doc', 'docx'].includes(ext) ? 'documento'
      : 'outro'
    setArquivoForm((f: any) => ({ ...f, nome: f.nome || nameNoExt, categoria: catSugerida }))
  }

  async function handleSaveArquivo(e: React.FormEvent) {
    e.preventDefault()
    if (!arquivoPath) return
    setLoading(true)
    try {
      const ext = arquivoPath.slice(arquivoPath.lastIndexOf('.'))
      const dest = await invoke('file:save-copy', {
        sourcePath: arquivoPath,
        destName: `obra-${id}-${arquivoForm.categoria}-${Date.now()}${ext}`
      })
      await invoke('projetos:create', {
        obra_id: Number(id),
        nome: arquivoForm.nome,
        categoria: arquivoForm.categoria,
        versao: arquivoForm.versao || 'v1',
        arquivo_url: dest,
        usuario_id: user?.id
      })
      await loadArquivos()
      setArquivoModal(false)
      setArquivoForm({ nome: '', categoria: 'planta', versao: 'v1' })
      setArquivoPath('')
    } finally { setLoading(false) }
  }

  async function handleDeleteArquivo(arqId: number) {
    if (!confirm('Remover este arquivo da obra?')) return
    await invoke('projetos:delete', arqId)
    await loadArquivos()
  }

  if (!obra) return <div className="p-8 text-center text-gray-400">Carregando...</div>

  const tabs = [
    { key: 'info',       label: 'Informações' },
    { key: 'equipe',     label: 'Equipe' },
    { key: 'financeiro', label: 'Financeiro' },
    { key: 'cronograma', label: 'Cronograma' },
    { key: 'arquivos',   label: `Arquivos${arquivos.length > 0 ? ` (${arquivos.length})` : ''}` },
  ]

  const categoriasColor: Record<string, string> = {
    material:    'bg-blue-100 text-blue-700',
    mao_de_obra: 'bg-green-100 text-green-700',
    equipamento: 'bg-yellow-100 text-yellow-700',
    servico:     'bg-purple-100 text-purple-700',
    outros:      'bg-gray-100 text-gray-600',
  }

  const arquivosFiltrados = filtroArq === 'todos'
    ? arquivos
    : arquivos.filter(a => a.categoria === filtroArq)

  return (
    <div>
      <PageHeader title={obra.nome}
        subtitle={[obra.cidade, obra.estado].filter(Boolean).join(', ') || obra.endereco || ''}
        actions={
          <div className="flex items-center gap-2">
            <Badge variant={statusVariant(obra.status)}>{statusLabel(obra.status)}</Badge>
            <Button variant="outline" size="sm" onClick={() => navigate(-1)}><ArrowLeft size={14} />Voltar</Button>
            <Button size="sm" onClick={() => setEditModal(true)}><Edit size={14} />Editar</Button>
          </div>
        } />

      {/* Tabs */}
      <div className="flex border-b border-gray-100 bg-white px-6">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key as any)}
            className={`py-3 px-4 text-sm font-medium border-b-2 transition-colors ${tab === t.key ? 'border-[#E85D04] text-[#E85D04]' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="p-6">
        {/* ── Informações ── */}
        {tab === 'info' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <h3 className="font-semibold text-[#1A1A2E] mb-4">Dados Gerais</h3>
              <dl className="space-y-2 text-sm">
                {[
                  ['Endereço', obra.endereco], ['Cidade', obra.cidade], ['Estado', obra.estado],
                  ['CEP', obra.cep], ['Área', obra.area_m2 ? `${obra.area_m2} m²` : '—'],
                  ['Início', formatDate(obra.data_inicio)], ['Previsão', formatDate(obra.data_prevista)],
                  obra.data_conclusao ? ['Conclusão', formatDate(obra.data_conclusao)] : null,
                ].filter(Boolean).map(([k, v]: any) => (
                  <div key={k} className="flex justify-between">
                    <dt className="text-gray-500">{k}</dt>
                    <dd className="font-medium text-[#1A1A2E]">{v || '—'}</dd>
                  </div>
                ))}
              </dl>
            </Card>
            <div className="space-y-4">
              <Card>
                <h3 className="font-semibold text-[#1A1A2E] mb-3">Progresso</h3>
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-gray-500">Conclusão geral</span>
                  <span className="font-bold text-[#E85D04]">{obra.progresso?.toFixed(0) ?? 0}%</span>
                </div>
                <ProgressBar value={obra.progresso || 0} />
              </Card>
              <div className="grid grid-cols-2 gap-4">
                <StatCard label="Planejado" value={formatCurrency(obra.orcamento_planejado)} icon={<DollarSign size={20} />} />
                <StatCard label="Realizado" value={formatCurrency(obra.orcamento_realizado)} icon={<DollarSign size={20} />}
                  color={obra.orcamento_realizado > obra.orcamento_planejado ? '#EF4444' : '#22C55E'} />
              </div>
            </div>
          </div>
        )}

        {/* ── Equipe ── */}
        {tab === 'equipe' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold text-[#1A1A2E]">{alocacoes.length} funcionários alocados</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {alocacoes.map(a => (
                <Card key={a.id}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#E85D04]/10 flex items-center justify-center font-bold text-[#E85D04]">
                      {a.funcionario_nome?.charAt(0)}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{a.funcionario_nome}</p>
                      <p className="text-xs text-gray-500">{a.cargo} {a.funcao ? `· ${a.funcao}` : ''}</p>
                    </div>
                  </div>
                </Card>
              ))}
              {alocacoes.length === 0 && <p className="text-sm text-gray-400">Nenhum funcionário alocado.</p>}
            </div>
          </div>
        )}

        {/* ── Financeiro ── */}
        {tab === 'financeiro' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <div>
                <p className="text-sm text-gray-500">Total de despesas</p>
                <p className="text-2xl font-bold text-[#E85D04]">{formatCurrency(despesas.reduce((s, d) => s + d.valor, 0))}</p>
              </div>
              <Button onClick={() => setDespesaModal(true)}><DollarSign size={16} />Nova Despesa</Button>
            </div>
            <div className="space-y-2">
              {despesas.map(d => (
                <Card key={d.id}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">{d.descricao}</p>
                      <p className="text-xs text-gray-500">{formatDate(d.data)} {d.fornecedor ? `· ${d.fornecedor}` : ''}</p>
                      {d.nota_fiscal && (
                        <button onClick={() => invoke('shell:open', d.nota_fiscal)}
                          className="flex items-center gap-1 text-xs text-[#E85D04] hover:underline mt-0.5">
                          <FileText size={12} /> Ver NF
                        </button>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${categoriasColor[d.categoria] || 'bg-gray-100 text-gray-600'}`}>{d.categoria}</span>
                      <p className="font-bold text-[#E85D04]">{formatCurrency(d.valor)}</p>
                    </div>
                  </div>
                </Card>
              ))}
              {despesas.length === 0 && <p className="text-sm text-gray-400">Nenhuma despesa lançada.</p>}
            </div>
          </div>
        )}

        {/* ── Cronograma ── */}
        {tab === 'cronograma' && (
          <div className="space-y-3">
            {etapas.map(e => (
              <Card key={e.id}>
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <p className="font-medium text-sm">{e.nome}</p>
                      <span className="text-sm font-bold text-[#E85D04]">{e.progresso?.toFixed(0) ?? 0}%</span>
                    </div>
                    <ProgressBar value={e.progresso || 0} />
                  </div>
                  <input type="range" min={0} max={100} step={5} value={e.progresso || 0}
                    onChange={ev => handleUpdateEtapa(e.id, parseFloat(ev.target.value))}
                    className="w-24 accent-[#E85D04]" />
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* ── Arquivos ── */}
        {tab === 'arquivos' && (
          <div>
            <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
              {/* Filtros por categoria */}
              <div className="flex gap-2 flex-wrap">
                {['todos', 'planta', 'foto', 'documento', 'outro'].map(cat => (
                  <button key={cat} onClick={() => setFiltroArq(cat)}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${filtroArq === cat
                      ? 'bg-[#E85D04] text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                    {cat === 'todos' ? 'Todos' : CATEGORIA_ARQ[cat]?.label}
                    {cat !== 'todos' && (
                      <span className="ml-1 opacity-60">
                        ({arquivos.filter(a => a.categoria === cat).length})
                      </span>
                    )}
                  </button>
                ))}
              </div>
              <Button onClick={() => { setArquivoModal(true); setArquivoForm({ nome: '', categoria: 'planta', versao: 'v1' }); setArquivoPath('') }}>
                <Plus size={14} /> Adicionar Arquivo
              </Button>
            </div>

            {arquivosFiltrados.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                <FolderOpen size={48} className="mb-3 text-gray-200" />
                <p className="text-sm font-medium">Nenhum arquivo nesta categoria</p>
                <p className="text-xs mt-1">Adicione plantas (.dwg), fotos ou documentos da obra</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {arquivosFiltrados.map(arq => {
                  const cat = CATEGORIA_ARQ[arq.categoria] || CATEGORIA_ARQ.outro
                  return (
                    <Card key={arq.id}>
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center flex-shrink-0">
                          {fileIcon(arq.arquivo_url || '')}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm text-[#1A1A2E] truncate" title={arq.nome}>{arq.nome}</p>
                          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${cat.color}`}>{cat.label}</span>
                            {arq.versao && arq.versao !== 'v1' && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500">{arq.versao}</span>
                            )}
                            {arq.versao === 'v1' && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500">v1</span>
                            )}
                          </div>
                          <p className="text-[10px] text-gray-400 mt-1">{formatDate(arq.created_at?.slice(0, 10))}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-50">
                        <button onClick={() => invoke('shell:open', arq.arquivo_url)}
                          className="flex items-center gap-1 text-xs text-[#E85D04] hover:text-[#c94d02] font-medium transition-colors">
                          <Eye size={12} /> Abrir
                        </button>
                        <button onClick={() => handleDeleteArquivo(arq.id)}
                          className="flex items-center gap-1 text-xs text-gray-400 hover:text-red-500 ml-auto transition-colors">
                          <Trash2 size={12} /> Remover
                        </button>
                      </div>
                    </Card>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Modal Editar Obra ── */}
      <Modal open={editModal} onClose={() => setEditModal(false)} title="Editar Obra" size="lg">
        <form onSubmit={handleSaveObra} className="grid grid-cols-2 gap-4">
          <div className="col-span-2"><Input label="Nome" value={editForm.nome || ''} onChange={e => setEditForm({ ...editForm, nome: e.target.value })} required /></div>
          <Input label="Cidade" value={editForm.cidade || ''} onChange={e => setEditForm({ ...editForm, cidade: e.target.value })} />
          <Input label="Estado" value={editForm.estado || ''} onChange={e => setEditForm({ ...editForm, estado: e.target.value })} />
          <Select label="Status" value={editForm.status || ''} onChange={e => setEditForm({ ...editForm, status: e.target.value })}
            options={[{ value: 'planejamento', label: 'Planejamento' }, { value: 'em_andamento', label: 'Em Andamento' }, { value: 'pausada', label: 'Pausada' }, { value: 'concluida', label: 'Concluída' }]} />
          <Input label="Orçamento Planejado" type="number" step="0.01" value={editForm.orcamento_planejado || ''} onChange={e => setEditForm({ ...editForm, orcamento_planejado: parseFloat(e.target.value) })} />
          <Input label="Data Início" type="date" value={editForm.data_inicio || ''} onChange={e => setEditForm({ ...editForm, data_inicio: e.target.value })} />
          <Input label="Data Prevista" type="date" value={editForm.data_prevista || ''} onChange={e => setEditForm({ ...editForm, data_prevista: e.target.value })} />
          <div className="col-span-2 flex justify-end gap-3 mt-2">
            <Button type="button" variant="outline" onClick={() => setEditModal(false)}>Cancelar</Button>
            <Button type="submit" loading={loading}>Salvar</Button>
          </div>
        </form>
      </Modal>

      {/* ── Modal Nova Despesa ── */}
      <Modal open={despesaModal} onClose={() => setDespesaModal(false)} title="Nova Despesa">
        <form onSubmit={handleAddDespesa} className="flex flex-col gap-4">
          <Input label="Descrição *" value={despesaForm.descricao || ''} onChange={e => setDespesaForm({ ...despesaForm, descricao: e.target.value })} required />
          <Select label="Categoria *" value={despesaForm.categoria || ''} onChange={e => setDespesaForm({ ...despesaForm, categoria: e.target.value })}
            options={[{ value: '', label: 'Selecione...' }, { value: 'material', label: 'Material' }, { value: 'mao_de_obra', label: 'Mão de Obra' }, { value: 'equipamento', label: 'Equipamento' }, { value: 'servico', label: 'Serviço' }, { value: 'outros', label: 'Outros' }]} />
          <Input label="Valor (R$) *" type="number" step="0.01" value={despesaForm.valor || ''} onChange={e => setDespesaForm({ ...despesaForm, valor: parseFloat(e.target.value) })} required />
          <Input label="Data *" type="date" value={despesaForm.data || ''} onChange={e => setDespesaForm({ ...despesaForm, data: e.target.value })} required />
          <Select label="Fornecedor"
            value={despesaForm.fornecedor || ''}
            onChange={e => setDespesaForm({ ...despesaForm, fornecedor: e.target.value })}
            options={[
              { value: '', label: 'Selecione ou deixe em branco' },
              ...fornecedores.map(f => ({ value: f.nome, label: f.nome }))
            ]} />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nota Fiscal (PDF)</label>
            <div className="flex items-center gap-2">
              <button type="button" onClick={handlePickNF}
                className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:border-[#E85D04] hover:text-[#E85D04] transition-colors">
                <Upload size={14} /> Selecionar PDF
              </button>
              {nfPath && (
                <button type="button" onClick={() => invoke('shell:open', nfPath)}
                  className="flex items-center gap-1 text-sm text-[#E85D04] hover:underline">
                  <FileText size={14} /> Abrir PDF
                </button>
              )}
            </div>
            {nfPath && <p className="text-xs text-gray-400 mt-1 truncate">{nfPath.split(/[\\/]/).pop()}</p>}
          </div>
          <div className="flex justify-end gap-3 mt-2">
            <Button type="button" variant="outline" onClick={() => setDespesaModal(false)}>Cancelar</Button>
            <Button type="submit" loading={loading}>Salvar</Button>
          </div>
        </form>
      </Modal>

      {/* ── Modal Adicionar Arquivo ── */}
      <Modal open={arquivoModal} onClose={() => setArquivoModal(false)} title="Adicionar Arquivo à Obra">
        <form onSubmit={handleSaveArquivo} className="flex flex-col gap-4">
          {/* Seletor de arquivo */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Arquivo *</label>
            <button type="button" onClick={handlePickArquivo}
              className={`w-full flex items-center justify-center gap-2 px-4 py-6 border-2 border-dashed rounded-xl text-sm transition-colors
                ${arquivoPath ? 'border-[#E85D04] bg-orange-50 text-[#E85D04]' : 'border-gray-200 text-gray-400 hover:border-[#E85D04] hover:text-[#E85D04]'}`}>
              <Upload size={18} />
              {arquivoPath
                ? arquivoPath.split(/[\\/]/).pop()
                : 'Clique para selecionar (.dwg, .dxf, .pdf, .jpg, .png...)'}
            </button>
          </div>

          <Input label="Nome do arquivo *"
            value={arquivoForm.nome}
            onChange={e => setArquivoForm({ ...arquivoForm, nome: e.target.value })}
            required placeholder="Ex: Planta Baixa Térreo" />

          <div className="grid grid-cols-2 gap-3">
            <Select label="Categoria *"
              value={arquivoForm.categoria}
              onChange={e => setArquivoForm({ ...arquivoForm, categoria: e.target.value })}
              options={[
                { value: 'planta',    label: 'Planta' },
                { value: 'foto',      label: 'Foto' },
                { value: 'documento', label: 'Documento' },
                { value: 'outro',     label: 'Outro' },
              ]} />
            <Input label="Versão"
              value={arquivoForm.versao}
              onChange={e => setArquivoForm({ ...arquivoForm, versao: e.target.value })}
              placeholder="v1" />
          </div>

          <div className="flex justify-end gap-3 mt-2">
            <Button type="button" variant="outline" onClick={() => setArquivoModal(false)}>Cancelar</Button>
            <Button type="submit" loading={loading} disabled={!arquivoPath || !arquivoForm.nome}>Salvar</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
