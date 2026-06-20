import React, { useState } from 'react'
import { Zap, Check, X, Brain, Shield, BarChart3, Star } from 'lucide-react'
import { Button } from '../ui/Button'
import { useApp } from '../../store/AppContext'

interface UpgradeModalProps {
  open: boolean
  onClose: () => void
  feature?: string
}

const FREE_FEATURES = [
  'Gestão de Obras completa',
  'Gestão de Funcionários',
  'Controle Financeiro',
  'Cronograma de Obras',
  'Segurança (SST / NR-18)',
  'Diário de Obra (RDO)',
  'Controle de Ponto',
  'Gestão de Materiais',
  'Alertas e Notificações',
  'Relatórios e Exportação PDF/Excel',
]

const PLUS_EXTRAS = [
  { icon: Brain, text: 'IA de Detecção de EPI (módulo 3.10)', highlight: true },
  { icon: Shield, text: 'IA de Estimativa de Materiais (módulo 3.11)', highlight: true },
  { icon: Star, text: 'Selo PLUS na interface', highlight: false },
  { icon: BarChart3, text: 'Análises visuais por IA com Claude', highlight: false },
]

export function UpgradeModal({ open, onClose, feature }: UpgradeModalProps) {
  const { user, refreshPlano, invoke } = useApp()
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  if (!open) return null

  async function handleUpgrade() {
    if (!user) return
    setLoading(true)
    try {
      const result = await invoke('assinaturas:ativar-plus', user.id)
      if (result.success) {
        await refreshPlano()
        setSuccess(true)
        setTimeout(() => { setSuccess(false); onClose() }, 2000)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#E85D04] to-[#FF7622] p-6 rounded-t-2xl text-white">
          <button onClick={onClose} className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-white/20 transition-colors">
            <X size={20} />
          </button>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <Zap size={22} className="text-white" />
            </div>
            <div>
              <div className="text-xs font-medium text-white/80 uppercase tracking-wide">Recurso exclusivo</div>
              <h2 className="text-xl font-bold">Plano PLUS</h2>
            </div>
          </div>
          {feature && (
            <p className="text-sm text-white/90 mt-2">
              <strong>"{feature}"</strong> está disponível apenas no plano PLUS.
            </p>
          )}
        </div>

        <div className="p-6">
          {success ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check size={32} className="text-green-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-800">Plano PLUS ativado!</h3>
              <p className="text-sm text-gray-500 mt-1">Você tem acesso a todos os recursos por 30 dias.</p>
            </div>
          ) : (
            <>
              {/* Comparativo */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                {/* FREE */}
                <div className="border border-gray-200 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-sm font-bold text-gray-600">FREE</span>
                    <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">Atual</span>
                  </div>
                  <div className="text-2xl font-bold text-gray-800 mb-3">R$ 0<span className="text-sm font-normal text-gray-400">/mês</span></div>
                  <ul className="space-y-1.5">
                    {FREE_FEATURES.map((f, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-gray-600">
                        <Check size={13} className="text-green-500 flex-shrink-0 mt-0.5" />
                        {f}
                      </li>
                    ))}
                    {PLUS_EXTRAS.map((f, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-gray-400">
                        <X size={13} className="text-gray-300 flex-shrink-0 mt-0.5" />
                        {f.text}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* PLUS */}
                <div className="border-2 border-[#E85D04] rounded-xl p-4 relative">
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-[#E85D04] text-white text-xs font-bold px-3 py-1 rounded-full">RECOMENDADO</span>
                  </div>
                  <div className="flex items-center gap-2 mb-3 mt-1">
                    <Zap size={14} className="text-[#E85D04]" />
                    <span className="text-sm font-bold text-[#E85D04]">PLUS</span>
                  </div>
                  <div className="text-2xl font-bold text-gray-800 mb-3">R$ 49,90<span className="text-sm font-normal text-gray-400">/mês</span></div>
                  <ul className="space-y-1.5">
                    {FREE_FEATURES.map((f, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-gray-600">
                        <Check size={13} className="text-green-500 flex-shrink-0 mt-0.5" />
                        {f}
                      </li>
                    ))}
                    {PLUS_EXTRAS.map((f, i) => (
                      <li key={i} className={`flex items-start gap-2 text-xs ${f.highlight ? 'text-[#E85D04] font-medium' : 'text-gray-600'}`}>
                        <Check size={13} className={`flex-shrink-0 mt-0.5 ${f.highlight ? 'text-[#E85D04]' : 'text-green-500'}`} />
                        {f.text}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={onClose}>Continuar no FREE</Button>
                <Button variant="plus" className="flex-1" loading={loading} onClick={handleUpgrade}>
                  <Zap size={16} />
                  Ativar PLUS — 30 dias grátis
                </Button>
              </div>
              <p className="text-xs text-center text-gray-400 mt-3">
                Demonstração: ativa o plano PLUS por 30 dias sem cobrança.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
