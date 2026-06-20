import { useState, useEffect, useRef } from 'react'
import { Upload, X, ZoomIn, Download, Trash2, Image } from 'lucide-react'
import { supabase } from '../lib/supabase'

interface Foto {
  id: string
  url: string
  legenda: string | null
  etapa: string | null
  criado_em: string
}

interface Props {
  obraId: string
  usuarioId: string
  readonly?: boolean
}

const ETAPAS = ['Fundação', 'Estrutura', 'Alvenaria', 'Cobertura', 'Instalações', 'Acabamento', 'Outros']

export default function GaleriaFotos({ obraId, usuarioId, readonly = false }: Props) {
  const [fotos, setFotos]                 = useState<Foto[]>([])
  const [carregando, setCarregando]       = useState(true)
  const [fazendoUpload, setFazendoUpload] = useState(false)
  const [lightbox, setLightbox]           = useState<Foto | null>(null)
  const [filtroEtapa, setFiltroEtapa]     = useState('')
  const [legendaModal, setLegendaModal]   = useState({ aberto: false, url: '', legenda: '', etapa: '' })
  const inputRef                          = useRef<HTMLInputElement>(null)

  useEffect(() => { carregar() }, [obraId])

  async function carregar() {
    setCarregando(true)
    const { data } = await supabase
      .from('fotos_obra')
      .select('*')
      .eq('obra_id', obraId)
      .order('criado_em', { ascending: false })
    setFotos(data || [])
    setCarregando(false)
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || [])
    if (!files.length) return

    setFazendoUpload(true)
    try {
      for (const file of files) {
        const ext  = file.name.split('.').pop()
        const nome = `${usuarioId}/${obraId}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`

        const { error: upErr } = await supabase.storage
          .from('fotos-obras')
          .upload(nome, file, { cacheControl: '3600', upsert: false })

        if (upErr) { console.error('Upload error:', upErr); continue }

        const { data: { publicUrl } } = supabase.storage.from('fotos-obras').getPublicUrl(nome)

        await supabase.from('fotos_obra').insert({
          obra_id: obraId,
          usuario_id: usuarioId,
          url: publicUrl,
          legenda: null,
          etapa: null,
        })
      }
      await carregar()
    } finally {
      setFazendoUpload(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  async function salvarLegenda() {
    const { url, legenda, etapa } = legendaModal
    const foto = fotos.find(f => f.url === url)
    if (!foto) return
    await supabase.from('fotos_obra')
      .update({ legenda: legenda || null, etapa: etapa || null })
      .eq('id', foto.id)
    setLegendaModal({ aberto: false, url: '', legenda: '', etapa: '' })
    await carregar()
  }

  async function excluir(foto: Foto) {
    if (!confirm('Excluir esta foto?')) return
    await supabase.from('fotos_obra').delete().eq('id', foto.id)
    // Tenta excluir do storage (path é a parte após o bucket na URL pública)
    const path = foto.url.split('/fotos-obras/')[1]
    if (path) await supabase.storage.from('fotos-obras').remove([path])
    await carregar()
  }

  function download(foto: Foto) {
    const a = document.createElement('a')
    a.href     = foto.url
    a.download = `foto_obra_${obraId}_${foto.id}.jpg`
    a.target   = '_blank'
    a.click()
  }

  const fotosFiltradas = filtroEtapa
    ? fotos.filter(f => f.etapa === filtroEtapa)
    : fotos

  return (
    <div>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        {!readonly && (
          <>
            <button
              onClick={() => inputRef.current?.click()}
              disabled={fazendoUpload}
              className="flex items-center gap-2 px-4 py-2 bg-azul text-white rounded-xl text-sm font-medium hover:bg-azul/90 disabled:opacity-50 transition-colors"
            >
              <Upload className="w-4 h-4" />
              {fazendoUpload ? 'Enviando...' : 'Enviar fotos'}
            </button>
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleUpload}
            />
          </>
        )}

        <select
          className="border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-azul"
          value={filtroEtapa}
          onChange={e => setFiltroEtapa(e.target.value)}
        >
          <option value="">Todas as etapas</option>
          {ETAPAS.map(e => <option key={e} value={e}>{e}</option>)}
        </select>

        <span className="text-sm text-gray-400 ml-auto">
          {fotosFiltradas.length} foto{fotosFiltradas.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Grid */}
      {carregando ? (
        <div className="text-center py-16 text-gray-400">Carregando fotos...</div>
      ) : fotosFiltradas.length === 0 ? (
        <div className="text-center py-16">
          <Image className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">
            {filtroEtapa ? `Nenhuma foto na etapa "${filtroEtapa}"` : 'Nenhuma foto ainda'}
          </p>
          {!readonly && (
            <p className="text-gray-300 text-xs mt-1">Clique em "Enviar fotos" para adicionar</p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {fotosFiltradas.map(foto => (
            <div key={foto.id} className="group relative rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800 aspect-square">
              <img
                src={foto.url}
                alt={foto.legenda || 'Foto da obra'}
                className="w-full h-full object-cover cursor-pointer hover:opacity-90 transition-opacity"
                onClick={() => setLightbox(foto)}
                loading="lazy"
              />

              {/* Overlay com ações */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                <button
                  onClick={() => setLightbox(foto)}
                  className="w-8 h-8 bg-white/90 rounded-full flex items-center justify-center hover:bg-white transition-colors"
                  title="Ampliar"
                >
                  <ZoomIn className="w-4 h-4 text-gray-700" />
                </button>
                <button
                  onClick={() => download(foto)}
                  className="w-8 h-8 bg-white/90 rounded-full flex items-center justify-center hover:bg-white transition-colors"
                  title="Baixar"
                >
                  <Download className="w-4 h-4 text-gray-700" />
                </button>
                {!readonly && (
                  <>
                    <button
                      onClick={() => setLegendaModal({ aberto: true, url: foto.url, legenda: foto.legenda || '', etapa: foto.etapa || '' })}
                      className="w-8 h-8 bg-white/90 rounded-full flex items-center justify-center hover:bg-white transition-colors text-xs font-bold text-gray-700"
                      title="Editar legenda"
                    >
                      i
                    </button>
                    <button
                      onClick={() => excluir(foto)}
                      className="w-8 h-8 bg-red-500/90 rounded-full flex items-center justify-center hover:bg-red-500 transition-colors"
                      title="Excluir"
                    >
                      <Trash2 className="w-4 h-4 text-white" />
                    </button>
                  </>
                )}
              </div>

              {/* Badges */}
              <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                {foto.etapa && (
                  <span className="text-xs bg-white/20 text-white px-2 py-0.5 rounded-full">{foto.etapa}</span>
                )}
                {foto.legenda && (
                  <p className="text-xs text-white/90 mt-1 truncate">{foto.legenda}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <button
            className="absolute top-4 right-4 w-10 h-10 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/20 transition-colors"
            onClick={() => setLightbox(null)}
          >
            <X className="w-5 h-5 text-white" />
          </button>
          <div onClick={e => e.stopPropagation()} className="max-w-4xl w-full">
            <img
              src={lightbox.url}
              alt={lightbox.legenda || ''}
              className="max-h-[80vh] w-full object-contain rounded-xl"
            />
            {(lightbox.legenda || lightbox.etapa) && (
              <div className="mt-3 text-center">
                {lightbox.etapa && <span className="text-xs text-white/50 mr-2">{lightbox.etapa}</span>}
                {lightbox.legenda && <p className="text-white/80 text-sm">{lightbox.legenda}</p>}
              </div>
            )}
            <div className="flex justify-center mt-4">
              <button
                onClick={() => download(lightbox)}
                className="flex items-center gap-2 px-4 py-2 bg-white/10 text-white rounded-xl text-sm hover:bg-white/20 transition-colors"
              >
                <Download className="w-4 h-4" /> Baixar foto
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de legenda */}
      {legendaModal.aberto && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <h3 className="font-bold text-grafite dark:text-white mb-4">Editar informações</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Etapa da obra</label>
                <select
                  className="w-full border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-xl px-3 py-2 text-sm"
                  value={legendaModal.etapa}
                  onChange={e => setLegendaModal(s => ({ ...s, etapa: e.target.value }))}
                >
                  <option value="">— Selecione —</option>
                  {ETAPAS.map(e => <option key={e} value={e}>{e}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Legenda</label>
                <input
                  className="w-full border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-xl px-3 py-2 text-sm"
                  placeholder="Descreva a foto..."
                  value={legendaModal.legenda}
                  onChange={e => setLegendaModal(s => ({ ...s, legenda: e.target.value }))}
                />
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button
                onClick={() => setLegendaModal({ aberto: false, url: '', legenda: '', etapa: '' })}
                className="flex-1 px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-xl text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Cancelar
              </button>
              <button
                onClick={salvarLegenda}
                className="flex-1 px-4 py-2 bg-azul text-white rounded-xl text-sm font-medium hover:bg-azul/90"
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
