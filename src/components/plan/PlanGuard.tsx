import React, { useState } from 'react'
import { Zap, Lock } from 'lucide-react'
import { useApp } from '../../store/AppContext'
import { UpgradeModal } from './UpgradeModal'
import { Button } from '../ui/Button'

interface PlanGuardProps {
  children: React.ReactNode
  feature?: string
}

export function PlanGuard({ children, feature }: PlanGuardProps) {
  const { plano } = useApp()
  const [showModal, setShowModal] = useState(false)

  if (plano === 'PLUS') return <>{children}</>

  return (
    <>
      <div className="flex flex-col items-center justify-center h-full min-h-[400px] p-8 text-center">
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#E85D04]/10 to-[#FF7622]/10 flex items-center justify-center mb-6">
          <Lock size={36} className="text-[#E85D04]" />
        </div>
        <h2 className="text-xl font-bold text-gray-800 mb-2">Recurso exclusivo PLUS</h2>
        <p className="text-sm text-gray-500 max-w-sm mb-6">
          {feature
            ? `"${feature}" está disponível apenas para assinantes do plano PLUS.`
            : 'Este módulo está disponível apenas para assinantes do plano PLUS.'
          }
        </p>

        <div className="bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 rounded-xl p-4 mb-6 max-w-sm w-full text-left">
          <div className="flex items-center gap-2 mb-2">
            <Zap size={16} className="text-[#E85D04]" />
            <span className="text-sm font-semibold text-[#E85D04]">O que você terá com PLUS:</span>
          </div>
          <ul className="text-xs text-gray-600 space-y-1">
            <li>✓ IA de Detecção de EPI em fotos de canteiro</li>
            <li>✓ IA de Estimativa de Materiais por imagem</li>
            <li>✓ Análises automáticas via Claude Vision</li>
            <li>✓ Histórico de análises salvo no banco local</li>
          </ul>
        </div>

        <Button variant="plus" size="lg" onClick={() => setShowModal(true)}>
          <Zap size={18} />
          Ver planos e assinar PLUS
        </Button>
      </div>

      <UpgradeModal open={showModal} onClose={() => setShowModal(false)} feature={feature} />
    </>
  )
}
