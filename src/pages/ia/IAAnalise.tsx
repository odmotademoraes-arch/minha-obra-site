import React, { useState, useRef } from 'react'
import { Zap, Camera, Package, AlertTriangle, CheckCircle, Upload, X, Key } from 'lucide-react'
import { useApp } from '../../store/AppContext'
import { PlanGuard } from '../../components/plan/PlanGuard'
import { PageHeader } from '../../components/layout/Layout'
import { Button } from '../../components/ui/Button'
import { Input, Select, Textarea } from '../../components/ui/Input'
import { Card } from '../../components/ui/Card'

const ANTHROPIC_KEY_STORAGE = 'minha-obra-anthropic-key'

function useApiKey() {
  const [apiKey, setApiKeyState] = useState<string>(() => localStorage.getItem(ANTHROPIC_KEY_STORAGE) || '')
  const setApiKey = (k: string) => { setApiKeyState(k); localStorage.setItem(ANTHROPIC_KEY_STORAGE, k) }
  return { apiKey, setApiKey }
}

function ApiKeySetup({ apiKey, setApiKey }: { apiKey: string; setApiKey: (k: string) => void }) {
  const [show, setShow] = useState(false)
  if (apiKey) return null
  return (
    <Card className="border-amber-200 bg-amber-50">
      <div className="flex items-start gap-3">
        <Key size={20} className="text-amber-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="font-semibold text-amber-800 text-sm">Chave da API Anthropic necessária</p>
          <p className="text-xs text-amber-700 mt-1 mb-3">Para usar a IA, informe sua chave da API Anthropic. Ela fica salva localmente no dispositivo.</p>
          <div className="flex gap-2">
            <Input type={show ? 'text' : 'password'} placeholder="sk-ant-..." value={apiKey}
              onChange={e => setApiKey(e.target.value)} className="flex-1 text-xs" />
            <Button type="button" size="sm" variant="outline" onClick={() => setShow(!show)}>{show ? 'Ocultar' : 'Mostrar'}</Button>
          </div>
        </div>
      </div>
    </Card>
  )
}

function ImageUpload({ onImage }: { onImage: (base64: string, mime: string, preview: string) => void }) {
  const { invoke } = useApp()
  const ref = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string>('')

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      const dataUrl = ev.target?.result as string
      setPreview(dataUrl)
      const base64 = dataUrl.split(',')[1]
      const mime = file.type as any
      onImage(base64, mime, dataUrl)
    }
    reader.readAsDataURL(file)
  }

  return (
    <div>
      <input ref={ref} type="file" accept="image/*" className="hidden" onChange={handleFile} />
      {preview ? (
        <div className="relative">
          <img src={preview} className="w-full max-h-64 object-cover rounded-lg border border-gray-200" />
          <button onClick={() => { setPreview(''); if (ref.current) ref.current.value = '' }}
            className="absolute top-2 right-2 w-7 h-7 bg-white rounded-full shadow flex items-center justify-center hover:bg-gray-50">
            <X size={14} />
          </button>
        </div>
      ) : (
        <button onClick={() => ref.current?.click()}
          className="w-full border-2 border-dashed border-gray-200 rounded-lg p-8 flex flex-col items-center gap-3 hover:border-[#E85D04] hover:bg-orange-50 transition-colors">
          <Upload size={24} className="text-gray-400" />
          <div className="text-center">
            <p className="text-sm font-medium text-gray-600">Clique para selecionar uma foto</p>
            <p className="text-xs text-gray-400 mt-1">JPG, PNG — até 5MB</p>
          </div>
        </button>
      )}
    </div>
  )
}

function EPIAnalise({ apiKey, setApiKey }: { apiKey: string; setApiKey: (k: string) => void }) {
  const { invoke, user } = useApp()
  const [imageData, setImageData] = useState<{ base64: string; mime: string } | null>(null)
  const [observacoes, setObservacoes] = useState('')
  const [resultado, setResultado] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')

  async function handleAnalisar(e: React.FormEvent) {
    e.preventDefault()
    if (!apiKey) { setErro('Configure sua chave da API Anthropic primeiro.'); return }
    if (!imageData) { setErro('Selecione uma imagem do canteiro de obras.'); return }
    setLoading(true); setErro(''); setResultado(null)
    try {
      const res = await invoke('ai:analisar-epi', {
        apiKey, imageBase64: imageData.base64, imageMime: imageData.mime,
        observacoes, usuarioId: user?.id
      })
      if (res.error) { setErro(res.message || 'Erro ao analisar.'); return }
      setResultado(res)
    } catch (err: any) { setErro(`Erro: ${err?.message || 'Falha ao conectar com a IA.'}`) }
    finally { setLoading(false) }
  }

  const statusColor = (s: string) => s === 'CONFORME' ? 'text-green-600 bg-green-50' : s === 'ATENÇÃO' ? 'text-amber-600 bg-amber-50' : 'text-red-600 bg-red-50'

  return (
    <div className="space-y-6">
      <ApiKeySetup apiKey={apiKey} setApiKey={setApiKey} />
      <Card>
        <h3 className="font-semibold text-[#1A1A2E] mb-4 flex items-center gap-2">
          <Camera size={18} className="text-[#E85D04]" />Detecção de EPIs em Foto
        </h3>
        <form onSubmit={handleAnalisar} className="flex flex-col gap-4">
          <ImageUpload onImage={(b64, mime) => setImageData({ base64: b64, mime })} />
          <Textarea label="Contexto / Observações (opcional)" value={observacoes}
            onChange={e => setObservacoes(e.target.value)} rows={2}
            placeholder="Ex: área de solda, trabalho em altura, demolição..." />
          <div className="flex items-center gap-3">
            <Button type="submit" loading={loading} disabled={loading || !imageData}>
              <Zap size={16} />Analisar EPIs com IA
            </Button>
            {loading && <p className="text-sm text-gray-400 animate-pulse">Analisando imagem...</p>}
          </div>
          {erro && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex gap-2 text-sm text-red-700">
              <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" />{erro}
            </div>
          )}
        </form>
      </Card>

      {resultado && (
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-[#1A1A2E] flex items-center gap-2">
              <CheckCircle size={18} className="text-green-500" />Resultado da Análise
            </h3>
            {resultado.status_geral && (
              <span className={`text-sm font-bold px-3 py-1 rounded-full ${statusColor(resultado.status_geral)}`}>
                {resultado.status_geral}
              </span>
            )}
          </div>
          {resultado.resumo && <p className="text-sm text-gray-600 mb-4 italic">"{resultado.resumo}"</p>}
          {(resultado.trabalhadores || []).map((t: any, i: number) => (
            <div key={i} className="mb-4 border border-gray-100 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="font-semibold text-sm text-[#1A1A2E]">{t.trabalhador}</p>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${statusColor(t.status)}`}>{t.status}</span>
              </div>
              <div className="grid grid-cols-2 gap-1">
                {(t.epis_detectados || []).map((epi: any, j: number) => (
                  <div key={j} className={`flex items-center gap-2 text-xs p-1.5 rounded ${epi.presente ? 'text-green-700' : 'text-red-600'}`}>
                    <span className="font-bold">{epi.presente ? '✓' : '✗'}</span>
                    <span>{epi.tipo}</span>
                    {epi.observacao && <span className="text-gray-400">({epi.observacao})</span>}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </Card>
      )}
    </div>
  )
}

function MateriaisAnalise({ apiKey, setApiKey }: { apiKey: string; setApiKey: (k: string) => void }) {
  const { invoke, user } = useApp()
  const [imageData, setImageData] = useState<{ base64: string; mime: string } | null>(null)
  const [dados, setDados] = useState<any>({ tipo_elemento: '', largura: '', altura: '', espessura: '', finalidade: '' })
  const [resultado, setResultado] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')

  async function handleEstimar(e: React.FormEvent) {
    e.preventDefault()
    if (!apiKey) { setErro('Configure sua chave da API Anthropic primeiro.'); return }
    if (!imageData) { setErro('Selecione uma imagem do elemento a estimar.'); return }
    setLoading(true); setErro(''); setResultado(null)
    try {
      const res = await invoke('ai:estimar-materiais', {
        apiKey, imageBase64: imageData.base64, imageMime: imageData.mime,
        dados, usuarioId: user?.id
      })
      if (res.error) { setErro(res.message || 'Erro ao estimar.'); return }
      setResultado(res)
    } catch (err: any) { setErro(`Erro: ${err?.message || 'Falha ao conectar com a IA.'}`) }
    finally { setLoading(false) }
  }

  return (
    <div className="space-y-6">
      <ApiKeySetup apiKey={apiKey} setApiKey={setApiKey} />
      <Card>
        <h3 className="font-semibold text-[#1A1A2E] mb-4 flex items-center gap-2">
          <Package size={18} className="text-[#E85D04]" />Estimativa de Materiais por IA
        </h3>
        <form onSubmit={handleEstimar} className="flex flex-col gap-4">
          <ImageUpload onImage={(b64, mime) => setImageData({ base64: b64, mime })} />
          <Select label="Tipo de Elemento *" value={dados.tipo_elemento} onChange={e => setDados({ ...dados, tipo_elemento: e.target.value })}
            options={[{ value: '', label: 'Selecione...' },
              { value: 'parede', label: 'Parede / Alvenaria' }, { value: 'laje', label: 'Laje / Piso' },
              { value: 'cobertura', label: 'Cobertura / Telhado' }, { value: 'fachada', label: 'Fachada / Revestimento' },
              { value: 'fundacao', label: 'Fundação / Piso' }, { value: 'estrutura', label: 'Estrutura / Vigas' },
            ]} />
          <div className="grid grid-cols-3 gap-4">
            <Input label="Largura (m)" type="number" step="0.01" value={dados.largura} onChange={e => setDados({ ...dados, largura: e.target.value })} placeholder="Ex: 3.5" />
            <Input label="Altura (m)" type="number" step="0.01" value={dados.altura} onChange={e => setDados({ ...dados, altura: e.target.value })} placeholder="Ex: 2.8" />
            <Input label="Espessura (m)" type="number" step="0.001" value={dados.espessura} onChange={e => setDados({ ...dados, espessura: e.target.value })} placeholder="Ex: 0.15" />
          </div>
          <Input label="Finalidade / Contexto" value={dados.finalidade} onChange={e => setDados({ ...dados, finalidade: e.target.value })} placeholder="Ex: parede externa, reforma de banheiro..." />
          <div className="flex items-center gap-3">
            <Button type="submit" loading={loading} disabled={loading || !imageData || !dados.tipo_elemento}>
              <Zap size={16} />Estimar com IA
            </Button>
          </div>
          {erro && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex gap-2 text-sm text-red-700">
              <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" />{erro}
            </div>
          )}
        </form>
      </Card>

      {resultado && (
        <Card>
          <h3 className="font-semibold text-[#1A1A2E] mb-2 flex items-center gap-2">
            <CheckCircle size={18} className="text-green-500" />{resultado.elemento || 'Estimativa de Materiais'}
          </h3>
          {resultado.material_identificado && <p className="text-sm text-gray-500 mb-4">Material: {resultado.material_identificado} · Estado: {resultado.estado}</p>}
          {resultado.materiais && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-gray-500 border-b border-gray-100">
                    <th className="pb-2 font-medium">Material</th>
                    <th className="pb-2 font-medium text-center">Qtd</th>
                    <th className="pb-2 font-medium">Un</th>
                    <th className="pb-2 font-medium text-gray-400">Obs</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {resultado.materiais.map((m: any, i: number) => (
                    <tr key={i}>
                      <td className="py-2 font-medium">{m.nome}</td>
                      <td className="py-2 text-center font-bold text-[#E85D04]">{m.quantidade}</td>
                      <td className="py-2 text-gray-500">{m.unidade}</td>
                      <td className="py-2 text-xs text-gray-400">{m.observacao}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {(resultado.custo_minimo || resultado.custo_maximo) && (
            <div className="mt-4 p-3 bg-orange-50 rounded-lg flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Custo estimado de materiais:</span>
              <span className="font-bold text-[#E85D04]">
                R$ {resultado.custo_minimo?.toLocaleString('pt-BR')} – R$ {resultado.custo_maximo?.toLocaleString('pt-BR')}
              </span>
            </div>
          )}
          {resultado.observacoes && (
            <div className="mt-3 p-3 bg-gray-50 rounded-lg text-sm text-gray-600">{resultado.observacoes}</div>
          )}
        </Card>
      )}
    </div>
  )
}

export function IAAnalise() {
  const [tab, setTab] = useState<'epi' | 'materiais'>('epi')
  const { apiKey, setApiKey } = useApiKey()

  return (
    <PlanGuard feature="IA">
      <div>
        <PageHeader title="Inteligência Artificial" subtitle="Análise de EPI e estimativa de materiais com Claude Vision"
          actions={
            <div className="flex items-center gap-2 bg-gradient-to-r from-[#E85D04] to-orange-400 text-white text-xs font-bold px-3 py-1.5 rounded-full">
              <Zap size={12} />PLUS
            </div>
          } />

        <div className="flex border-b border-gray-100 bg-white px-6">
          <button onClick={() => setTab('epi')}
            className={`flex items-center gap-2 py-3 px-4 text-sm font-medium border-b-2 transition-colors ${tab === 'epi' ? 'border-[#E85D04] text-[#E85D04]' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            <Camera size={14} />Análise de EPI
          </button>
          <button onClick={() => setTab('materiais')}
            className={`flex items-center gap-2 py-3 px-4 text-sm font-medium border-b-2 transition-colors ${tab === 'materiais' ? 'border-[#E85D04] text-[#E85D04]' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            <Package size={14} />Estimativa de Materiais
          </button>
        </div>

        <div className="p-6 max-w-3xl">
          {tab === 'epi'
            ? <EPIAnalise apiKey={apiKey} setApiKey={setApiKey} />
            : <MateriaisAnalise apiKey={apiKey} setApiKey={setApiKey} />
          }
        </div>
      </div>
    </PlanGuard>
  )
}
