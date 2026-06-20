import React, { useEffect, useState } from 'react'
import { FileText, Table, Download } from 'lucide-react'
import { useApp } from '../store/AppContext'
import { PageHeader } from '../components/layout/Layout'
import { Button } from '../components/ui/Button'
import { Select, Input } from '../components/ui/Input'
import { Card } from '../components/ui/Card'
import { formatCurrency, formatDate } from '../lib/utils'

export function Relatorios() {
  const { invoke } = useApp()
  const [obras, setObras] = useState<any[]>([])
  const [obraId, setObraId] = useState<string>('')
  const [tipo, setTipo] = useState<'obra' | 'funcionarios' | 'financeiro' | 'acidentes'>('obra')
  const [dataInicio, setDataInicio] = useState('')
  const [dataFim, setDataFim] = useState('')
  const [gerando, setGerando] = useState(false)

  useEffect(() => { invoke('obras:list').then(setObras) }, [])

  async function gerarPDF() {
    setGerando(true)
    try {
      const result = await invoke('relatorios:gerar-pdf', { tipo, obra_id: obraId ? parseInt(obraId) : null, data_inicio: dataInicio, data_fim: dataFim })
      if (result?.caminho) {
        await invoke('shell:open', result.caminho)
      }
    } finally { setGerando(false) }
  }

  async function gerarExcel() {
    setGerando(true)
    try {
      const result = await invoke('relatorios:gerar-excel', { tipo, obra_id: obraId ? parseInt(obraId) : null, data_inicio: dataInicio, data_fim: dataFim })
      if (result?.caminho) {
        await invoke('shell:open', result.caminho)
      }
    } finally { setGerando(false) }
  }

  const tipoLabels: Record<string, string> = {
    obra: 'Relatório de Obra',
    funcionarios: 'Relatório de Funcionários',
    financeiro: 'Relatório Financeiro',
    acidentes: 'Relatório de Acidentes',
  }

  const tiposCards = [
    { key: 'obra', icon: <FileText size={24} />, title: 'Obra', desc: 'Progresso, equipe e cronograma' },
    { key: 'funcionarios', icon: <FileText size={24} />, title: 'Funcionários', desc: 'ASO, EPIs e treinamentos' },
    { key: 'financeiro', icon: <Table size={24} />, title: 'Financeiro', desc: 'Despesas, orçamento e saldo' },
    { key: 'acidentes', icon: <FileText size={24} />, title: 'Acidentes', desc: 'Registro de acidentes do trabalho' },
  ]

  return (
    <div>
      <PageHeader title="Relatórios" subtitle="Gerar relatórios em PDF e Excel" />
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {tiposCards.map(t => (
            <Card key={t.key} hover onClick={() => setTipo(t.key as any)}
              className={tipo === t.key ? 'ring-2 ring-[#E85D04]' : ''}>
              <div className={`mb-2 ${tipo === t.key ? 'text-[#E85D04]' : 'text-gray-400'}`}>{t.icon}</div>
              <p className="font-semibold text-sm text-[#1A1A2E]">{t.title}</p>
              <p className="text-xs text-gray-500 mt-0.5">{t.desc}</p>
            </Card>
          ))}
        </div>

        <Card>
          <h3 className="font-semibold text-[#1A1A2E] mb-4">{tipoLabels[tipo]}</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {(tipo === 'obra' || tipo === 'financeiro') && (
              <Select label="Obra (opcional)" value={obraId} onChange={e => setObraId(e.target.value)}
                options={[{ value: '', label: 'Todas as obras' }, ...obras.map(o => ({ value: String(o.id), label: o.nome }))]} />
            )}
            <Input label="Data Início" type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} />
            <Input label="Data Fim" type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} />
          </div>

          <div className="flex gap-3">
            <Button onClick={gerarPDF} loading={gerando} disabled={gerando}>
              <FileText size={16} />Gerar PDF
            </Button>
            <Button variant="outline" onClick={gerarExcel} loading={gerando} disabled={gerando}>
              <Table size={16} />Exportar Excel
            </Button>
          </div>

          <p className="text-xs text-gray-400 mt-4">
            Os arquivos serão salvos na pasta Documentos do sistema e abertos automaticamente.
          </p>
        </Card>

        <Card>
          <h3 className="font-semibold text-[#1A1A2E] mb-4">Relatórios Rápidos</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[
              { label: 'EPIs com estoque baixo', desc: 'Lista EPIs abaixo do estoque mínimo', cmd: 'relatorios:estoque-baixo' },
              { label: 'Exames vencidos', desc: 'ASOs e exames com validade expirada', cmd: 'relatorios:exames-vencidos' },
              { label: 'Obras em atraso', desc: 'Obras com data prevista ultrapassada', cmd: 'relatorios:obras-atraso' },
              { label: 'Despesas do mês', desc: 'Todas as despesas do mês atual', cmd: 'relatorios:despesas-mes' },
            ].map(r => (
              <div key={r.cmd} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-[#1A1A2E]">{r.label}</p>
                  <p className="text-xs text-gray-500">{r.desc}</p>
                </div>
                <Button size="sm" variant="outline" onClick={async () => {
                  setGerando(true)
                  try {
                    const res = await invoke(r.cmd)
                    if (res?.caminho) await invoke('shell:open', res.caminho)
                  } finally { setGerando(false) }
                }}>
                  <Download size={14} />PDF
                </Button>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}
