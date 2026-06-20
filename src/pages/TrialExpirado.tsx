import { useState } from 'react'
import { CheckCircle, Zap, Building2, Shield } from 'lucide-react'
import { supabase } from '../lib/supabase'

const PLANOS = [
  {
    id: 'individual',
    nome: 'Individual',
    preco: 'R$ 49,99',
    periodo: '/mês',
    obras: 'até 10 obras',
    ia: false,
    equipe: false,
    icon: Shield,
    descricao: 'Para engenheiros autônomos',
  },
  {
    id: 'profissional',
    nome: 'Profissional',
    preco: 'R$ 99,99',
    periodo: '/mês',
    obras: 'obras ilimitadas',
    ia: true,
    equipe: false,
    icon: Zap,
    descricao: 'Para escritórios de engenharia',
    destaque: true,
  },
  {
    id: 'corporativo',
    nome: 'Corporativo',
    preco: 'R$ 249,99',
    periodo: '/mês',
    obras: 'obras ilimitadas',
    ia: true,
    equipe: true,
    icon: Building2,
    descricao: 'Para construtoras e empreiteiras',
  },
]

interface Props {
  onLogout: () => void
}

export default function TrialExpirado({ onLogout }: Props) {
  const [carregando, setCarregando] = useState<string | null>(null)

  async function assinar(plano: string) {
    setCarregando(plano)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { onLogout(); return }

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/criar-checkout`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ plano, modo: 'subscription' }),
        }
      )
      const { url } = await res.json()
      if (url && window.api?.openExternal) {
        window.api.openExternal(url)
      } else {
        window.open(url, '_blank')
      }
    } catch (err) {
      console.error('Erro ao criar checkout:', err)
    } finally {
      setCarregando(null)
    }
  }

  return (
    <div className="fixed inset-0 bg-azul z-50 flex items-center justify-center p-6 overflow-y-auto">
      <div className="max-w-3xl w-full text-center">
        <div className="mb-2 inline-block px-3 py-1 bg-laranja/20 text-laranja rounded-full text-sm font-semibold">
          Período de teste encerrado
        </div>
        <h1 className="font-display text-4xl md:text-5xl text-white italic mb-3">
          CONTINUE COM MINHA OBRA
        </h1>
        <p className="text-white/60 mb-10 max-w-lg mx-auto">
          Seu período de teste de 15 dias chegou ao fim. Escolha um plano para continuar gerenciando suas obras.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {PLANOS.map(p => {
            const Icon = p.icon
            return (
              <div
                key={p.id}
                className={`bg-white rounded-2xl p-6 text-left relative ${p.destaque ? 'ring-2 ring-laranja shadow-xl scale-105' : ''}`}
              >
                {p.destaque && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-laranja text-white text-xs font-bold px-3 py-1 rounded-full">
                    MAIS POPULAR
                  </div>
                )}

                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${p.destaque ? 'bg-laranja' : 'bg-azul/10'}`}>
                    <Icon className={`w-5 h-5 ${p.destaque ? 'text-white' : 'text-azul'}`} />
                  </div>
                  <div>
                    <h3 className="font-bold text-grafite">{p.nome}</h3>
                    <p className="text-xs text-gray-400">{p.descricao}</p>
                  </div>
                </div>

                <div className="mb-4">
                  <span className="text-3xl font-bold text-laranja">{p.preco}</span>
                  <span className="text-gray-400 text-sm">{p.periodo}</span>
                </div>

                <ul className="space-y-2 mb-6 text-sm text-gray-600">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
                    {p.obras}
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className={`w-4 h-4 shrink-0 ${p.ia ? 'text-green-500' : 'text-gray-300'}`} />
                    <span className={p.ia ? '' : 'text-gray-300'}>IA inclusa (100 análises/mês)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className={`w-4 h-4 shrink-0 ${p.equipe ? 'text-green-500' : 'text-gray-300'}`} />
                    <span className={p.equipe ? '' : 'text-gray-300'}>Gestão de equipe</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
                    Suporte via WhatsApp
                  </li>
                </ul>

                <button
                  onClick={() => assinar(p.id)}
                  disabled={carregando !== null}
                  className={`w-full py-3 rounded-xl font-semibold text-sm transition-all ${
                    p.destaque
                      ? 'bg-laranja text-white hover:bg-laranja/90'
                      : 'bg-azul text-white hover:bg-azul/90'
                  } disabled:opacity-50`}
                >
                  {carregando === p.id ? 'Redirecionando...' : `Assinar ${p.nome}`}
                </button>
              </div>
            )
          })}
        </div>

        <button
          onClick={onLogout}
          className="text-white/40 hover:text-white/70 text-sm underline transition-colors"
        >
          Sair da conta
        </button>
      </div>
    </div>
  )
}
