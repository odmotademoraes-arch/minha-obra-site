import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus } from 'lucide-react'
import { useApp } from '../../store/AppContext'
import { PageHeader } from '../../components/layout/Layout'
import { Button } from '../../components/ui/Button'
import { Input, Select } from '../../components/ui/Input'
import { Modal } from '../../components/ui/Modal'
import { Card, Badge } from '../../components/ui/Card'
import { formatDate, statusLabel, statusVariant, diasRestantesLabel, today } from '../../lib/utils'

export function FuncionarioDetalhe() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { invoke } = useApp()
  const [funcionario, setFuncionario] = useState<any>(null)
  const [tab, setTab] = useState<'dados' | 'aso' | 'epis' | 'treinamentos' | 'obras'>('dados')
  const [epis, setEpis] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [exameModal, setExameModal] = useState(false)
  const [exameForm, setExameForm] = useState<any>({ tipo: 'admissional', resultado: 'apto' })
  const [treinForm, setTreinForm] = useState<any>({})
  const [treinModal, setTreinModal] = useState(false)
  const [epiModal, setEpiModal] = useState(false)
  const [epiForm, setEpiForm] = useState<any>({ quantidade: 1, data_entrega: today() })
  const [obras, setObras] = useState<any[]>([])
  const { user } = useApp()

  useEffect(() => { loadAll() }, [id])

  async function loadAll() {
    const f = await invoke('funcionarios:get', Number(id))
    setFuncionario(f)
    const epiList = await invoke('epis:list')
    setEpis(epiList)
    setObras(await invoke('obras:list'))
  }

  async function handleAddExame(e: React.FormEvent) {
    e.preventDefault(); setLoading(true)
    try {
      await invoke('exames:create', { ...exameForm, funcionario_id: Number(id) })
      await loadAll(); setExameModal(false); setExameForm({ tipo: 'admissional', resultado: 'apto' })
    } finally { setLoading(false) }
  }

  async function handleAddTrein(e: React.FormEvent) {
    e.preventDefault(); setLoading(true)
    try {
      await invoke('treinamentos:create', { ...treinForm, funcionario_id: Number(id) })
      await loadAll(); setTreinModal(false); setTreinForm({})
    } finally { setLoading(false) }
  }

  async function handleAddEpi(e: React.FormEvent) {
    e.preventDefault(); setLoading(true)
    try {
      await invoke('entregas-epi:create', { ...epiForm, funcionario_id: Number(id), responsavel_id: user?.id })
      await loadAll(); setEpiModal(false); setEpiForm({ quantidade: 1, data_entrega: today() })
    } finally { setLoading(false) }
  }

  if (!funcionario) return <div className="p-8 text-center text-gray-400">Carregando...</div>

  const tabs = [
    { key: 'dados', label: 'Dados' }, { key: 'aso', label: 'ASO / Exames' },
    { key: 'epis', label: 'EPIs' }, { key: 'treinamentos', label: 'Treinamentos NR' }, { key: 'obras', label: 'Obras' },
  ]

  return (
    <div>
      <PageHeader title={funcionario.nome} subtitle={funcionario.cargo}
        actions={
          <div className="flex gap-2">
            <Badge variant={statusVariant(funcionario.status)}>{statusLabel(funcionario.status)}</Badge>
            <Button variant="outline" size="sm" onClick={() => navigate(-1)}><ArrowLeft size={14} />Voltar</Button>
          </div>
        } />
      <div className="flex border-b border-gray-100 bg-white px-6">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key as any)}
            className={`py-3 px-4 text-sm font-medium border-b-2 transition-colors ${tab === t.key ? 'border-[#E85D04] text-[#E85D04]' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="p-6">
        {tab === 'dados' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <h3 className="font-semibold mb-4">Identificação</h3>
              <dl className="space-y-2 text-sm">
                {[['CPF', funcionario.cpf], ['RG', funcionario.rg], ['Nasc.', formatDate(funcionario.data_nascimento)],
                  ['Tipo Sang.', funcionario.tipo_sanguineo], ['Matrícula', funcionario.matricula],
                  ['Categoria', funcionario.categoria], ['E-mail', funcionario.email], ['Celular', funcionario.celular],
                  ['Admissão', formatDate(funcionario.data_admissao)]].map(([k, v]: any) => (
                  <div key={k} className="flex justify-between">
                    <dt className="text-gray-500">{k}</dt>
                    <dd className="font-medium">{v || '—'}</dd>
                  </div>
                ))}
              </dl>
            </Card>
            <div className="space-y-4">
              <Card>
                <h3 className="font-semibold mb-3">Remuneração</h3>
                <dl className="space-y-2 text-sm">
                  {[
                    ['Salário Base', funcionario.salario_base ? `R$ ${Number(funcionario.salario_base).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '—'],
                    ['Vale Transporte', funcionario.vale_transporte ? `R$ ${Number(funcionario.vale_transporte).toFixed(2)}/dia` : '—'],
                    ['Vale Refeição', funcionario.vale_refeicao ? `R$ ${Number(funcionario.vale_refeicao).toFixed(2)}/dia` : '—'],
                    ['Plano de Saúde', funcionario.plano_saude ? `R$ ${Number(funcionario.plano_saude).toFixed(2)}/mês` : '—'],
                  ].map(([k, v]: any) => (
                    <div key={k} className="flex justify-between">
                      <dt className="text-gray-500">{k}</dt>
                      <dd className="font-medium text-[#1A1A2E]">{v}</dd>
                    </div>
                  ))}
                  {funcionario.outros_beneficios && (
                    <div className="pt-1 border-t border-gray-50">
                      <dt className="text-gray-500 text-xs mb-0.5">Outros benefícios</dt>
                      <dd className="text-xs text-gray-700">{funcionario.outros_beneficios}</dd>
                    </div>
                  )}
                </dl>
              </Card>
              <Card>
                <h3 className="font-semibold mb-3">Jornada</h3>
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Horas diárias</dt>
                    <dd className="font-medium">{funcionario.horas_diarias ?? 8}h</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-500">% Hora extra</dt>
                    <dd className="font-medium">{funcionario.hora_extra_percentual ?? 50}%</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Contato emergência</dt>
                    <dd className="font-medium text-right">
                      {funcionario.contato_emergencia_nome || '—'}
                      {funcionario.contato_emergencia_tel ? ` · ${funcionario.contato_emergencia_tel}` : ''}
                    </dd>
                  </div>
                </dl>
              </Card>
            </div>
          </div>
        )}

        {tab === 'aso' && (
          <div>
            <div className="flex justify-between mb-4">
              <h3 className="font-semibold">Exames Médicos ({funcionario.exames?.length || 0})</h3>
              <Button size="sm" onClick={() => setExameModal(true)}><Plus size={14} />Novo Exame</Button>
            </div>
            <div className="space-y-2">
              {(funcionario.exames || []).map((e: any) => (
                <Card key={e.id}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">{e.tipo.charAt(0).toUpperCase() + e.tipo.slice(1)}</p>
                      <p className="text-xs text-gray-500">{e.medico ? `Dr. ${e.medico}` : ''} {e.clinica ? `· ${e.clinica}` : ''}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-500">Realizado: {formatDate(e.data_realizacao)}</p>
                      <p className={`text-xs font-medium mt-0.5 ${!e.data_validade ? 'text-gray-400' : new Date(e.data_validade) < new Date() ? 'text-red-500' : 'text-green-600'}`}>
                        {e.data_validade ? diasRestantesLabel(e.data_validade) : '—'}
                      </p>
                    </div>
                  </div>
                </Card>
              ))}
              {!funcionario.exames?.length && <p className="text-sm text-gray-400">Nenhum exame cadastrado.</p>}
            </div>
          </div>
        )}

        {tab === 'epis' && (
          <div>
            <div className="flex justify-between mb-4">
              <h3 className="font-semibold">EPIs Entregues ({funcionario.epis?.length || 0})</h3>
              <Button size="sm" onClick={() => setEpiModal(true)}><Plus size={14} />Registrar Entrega</Button>
            </div>
            <div className="space-y-2">
              {(funcionario.epis || []).map((e: any) => (
                <Card key={e.id}>
                  <div className="flex justify-between">
                    <div>
                      <p className="font-medium text-sm">{e.epi_nome}</p>
                      <p className="text-xs text-gray-500">CA: {e.ca || '—'} · Qtd: {e.quantidade}</p>
                    </div>
                    <p className="text-xs text-gray-500">{formatDate(e.data_entrega)}</p>
                  </div>
                </Card>
              ))}
              {!funcionario.epis?.length && <p className="text-sm text-gray-400">Nenhuma entrega registrada.</p>}
            </div>
          </div>
        )}

        {tab === 'treinamentos' && (
          <div>
            <div className="flex justify-between mb-4">
              <h3 className="font-semibold">Treinamentos NR ({funcionario.treinamentos?.length || 0})</h3>
              <Button size="sm" onClick={() => setTreinModal(true)}><Plus size={14} />Registrar</Button>
            </div>
            <div className="space-y-2">
              {(funcionario.treinamentos || []).map((t: any) => (
                <Card key={t.id}>
                  <div className="flex justify-between">
                    <div>
                      <p className="font-medium text-sm">{t.nome}</p>
                      <p className="text-xs text-gray-500">{t.nr} · {t.instituicao || '—'} · {t.carga_horaria ? `${t.carga_horaria}h` : ''}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-500">{formatDate(t.data_realizacao)}</p>
                      <p className={`text-xs font-medium ${!t.data_validade ? 'text-gray-400' : new Date(t.data_validade) < new Date() ? 'text-red-500' : 'text-green-600'}`}>
                        {t.data_validade ? diasRestantesLabel(t.data_validade) : '—'}
                      </p>
                    </div>
                  </div>
                </Card>
              ))}
              {!funcionario.treinamentos?.length && <p className="text-sm text-gray-400">Nenhum treinamento cadastrado.</p>}
            </div>
          </div>
        )}

        {tab === 'obras' && (
          <div className="space-y-2">
            {(funcionario.alocacoes || []).map((a: any) => (
              <Card key={a.id}>
                <p className="font-medium text-sm">{a.obra_nome}</p>
                <p className="text-xs text-gray-500">{a.funcao || 'Função não especificada'} · Início: {formatDate(a.data_inicio)}</p>
              </Card>
            ))}
            {!funcionario.alocacoes?.length && <p className="text-sm text-gray-400">Não alocado em obras.</p>}
          </div>
        )}
      </div>

      <Modal open={exameModal} onClose={() => setExameModal(false)} title="Novo Exame Médico">
        <form onSubmit={handleAddExame} className="flex flex-col gap-4">
          <Select label="Tipo" value={exameForm.tipo} onChange={e => setExameForm({ ...exameForm, tipo: e.target.value })}
            options={['admissional','periódico','demissional','retorno','mudança de função'].map(v => ({ value: v, label: v.charAt(0).toUpperCase() + v.slice(1) }))} />
          <Input label="Médico" value={exameForm.medico || ''} onChange={e => setExameForm({ ...exameForm, medico: e.target.value })} />
          <Input label="CRM" value={exameForm.crm || ''} onChange={e => setExameForm({ ...exameForm, crm: e.target.value })} />
          <Input label="Data de Realização *" type="date" value={exameForm.data_realizacao || ''} onChange={e => setExameForm({ ...exameForm, data_realizacao: e.target.value })} required />
          <Input label="Validade" type="date" value={exameForm.data_validade || ''} onChange={e => setExameForm({ ...exameForm, data_validade: e.target.value })} />
          <Select label="Resultado" value={exameForm.resultado} onChange={e => setExameForm({ ...exameForm, resultado: e.target.value })}
            options={[{ value: 'apto', label: 'Apto' }, { value: 'apto_com_restricao', label: 'Apto c/ Restrição' }, { value: 'inapto', label: 'Inapto' }]} />
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => setExameModal(false)}>Cancelar</Button>
            <Button type="submit" loading={loading}>Salvar</Button>
          </div>
        </form>
      </Modal>

      <Modal open={treinModal} onClose={() => setTreinModal(false)} title="Registrar Treinamento">
        <form onSubmit={handleAddTrein} className="flex flex-col gap-4">
          <Input label="Norma (NR) *" value={treinForm.nr || ''} onChange={e => setTreinForm({ ...treinForm, nr: e.target.value })} placeholder="Ex: NR-35" required />
          <Input label="Nome do Treinamento *" value={treinForm.nome || ''} onChange={e => setTreinForm({ ...treinForm, nome: e.target.value })} required />
          <Input label="Instituição" value={treinForm.instituicao || ''} onChange={e => setTreinForm({ ...treinForm, instituicao: e.target.value })} />
          <Input label="Data de Realização *" type="date" value={treinForm.data_realizacao || ''} onChange={e => setTreinForm({ ...treinForm, data_realizacao: e.target.value })} required />
          <Input label="Validade" type="date" value={treinForm.data_validade || ''} onChange={e => setTreinForm({ ...treinForm, data_validade: e.target.value })} />
          <Input label="Carga Horária (h)" type="number" value={treinForm.carga_horaria || ''} onChange={e => setTreinForm({ ...treinForm, carga_horaria: parseInt(e.target.value) })} />
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => setTreinModal(false)}>Cancelar</Button>
            <Button type="submit" loading={loading}>Salvar</Button>
          </div>
        </form>
      </Modal>

      <Modal open={epiModal} onClose={() => setEpiModal(false)} title="Registrar Entrega de EPI">
        <form onSubmit={handleAddEpi} className="flex flex-col gap-4">
          <Select label="EPI *" value={epiForm.epi_id || ''} onChange={e => setEpiForm({ ...epiForm, epi_id: parseInt(e.target.value) })}
            options={[{ value: '', label: 'Selecione...' }, ...epis.map(e => ({ value: String(e.id), label: e.ca ? `${e.nome} — CA ${e.ca}` : e.nome }))]} />
          <Input label="Quantidade" type="number" min={1} value={epiForm.quantidade} onChange={e => setEpiForm({ ...epiForm, quantidade: parseInt(e.target.value) })} />
          <Input label="Data de Entrega *" type="date" value={epiForm.data_entrega || today()} onChange={e => setEpiForm({ ...epiForm, data_entrega: e.target.value })} required />
          <Select label="Obra" value={epiForm.obra_id || ''} onChange={e => setEpiForm({ ...epiForm, obra_id: parseInt(e.target.value) || null })}
            options={[{ value: '', label: 'Nenhuma' }, ...obras.map(o => ({ value: String(o.id), label: o.nome }))]} />
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => setEpiModal(false)}>Cancelar</Button>
            <Button type="submit" loading={loading}>Registrar</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
