import React from 'react'
import { Zap } from 'lucide-react'
import { useApp } from '../../store/AppContext'

export function PlanBadge() {
  const { plano, assinatura } = useApp()

  if (plano !== 'PLUS') return null

  const vencimento = assinatura?.data_vencimento
    ? new Date(assinatura.data_vencimento).toLocaleDateString('pt-BR')
    : null

  return (
    <div className="flex items-center gap-1.5 bg-gradient-to-r from-[#E85D04] to-[#FF7622] text-white px-2.5 py-1 rounded-full text-xs font-bold shadow-sm"
      title={vencimento ? `Plano PLUS ativo até ${vencimento}` : 'Plano PLUS ativo'}>
      <Zap size={11} />
      PLUS
    </div>
  )
}
