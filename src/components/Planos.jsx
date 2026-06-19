import { useState, useEffect, useRef } from 'react'

const planos = [
  {
    nome: 'Individual',
    preco: 'R$ 49,99',
    periodo: '/mês',
    descricao: 'Ideal para autônomos e pequenos empreendedores.',
    obras: 'até 10',
    usuarios: '1',
    ia: false,
    features: [
      'Gestão de até 10 obras/conjuntos',
      '1 usuário',
      'RDO digital',
      'Controle de funcionários',
      'Financeiro básico',
      'Relatórios em PDF',
      'Suporte por e-mail',
    ],
    destaque: false,
    cta: 'Começar Individual',
  },
  {
    nome: 'Profissional',
    preco: 'R$ 99,99',
    periodo: '/mês',
    descricao: 'Para construtoras e equipes que precisam de IA.',
    obras: 'Ilimitadas',
    usuarios: '2',
    ia: 'Ajuda com IA',
    features: [
      'Obras/conjuntos ilimitados',
      '2 usuários',
      'Tudo do Individual',
      'Assistente IA para dúvidas',
      'Relatórios automáticos com IA',
      'Sugestão de cronogramas por IA',
      'SST / NR-18 completo',
      'Suporte prioritário',
    ],
    destaque: true,
    cta: 'Começar Profissional',
  },
  {
    nome: 'Corporativo',
    preco: 'R$ 249,99',
    periodo: '/mês',
    descricao: 'Para grandes operações e multiempresas.',
    obras: 'Ilimitadas',
    usuarios: 'Ilimitados',
    ia: 'Gestão com IA',
    features: [
      'Obras/conjuntos ilimitados',
      'Usuários ilimitados',
      'Tudo do Profissional',
      'IA preditiva de prazos e custos',
      'Alertas inteligentes',
      'Dashboards automáticos',
      'Multiempresa',
      'Acesso à API',
      'Gerente de conta dedicado',
    ],
    destaque: false,
    cta: 'Falar com Vendas',
  },
]

const produtos = ['Obras em Geral', 'Conjuntos Habitacionais']

export default function Planos() {
  const [produtoAtivo, setProdutoAtivo] = useState(0)
  const ref = useRef(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const targets = el.querySelectorAll('.fade-in')
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('visible')
            observer.unobserve(e.target)
          }
        })
      },
      { threshold: 0.08 }
    )
    targets.forEach((t) => observer.observe(t))
    return () => observer.disconnect()
  }, [])

  return (
    <section id="planos" className="bg-cinza py-20" ref={ref}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <h2 className="fade-in titulo-italico text-grafite text-3xl sm:text-4xl lg:text-5xl mb-4">
            Um plano para cada tamanho de operação
          </h2>
          <p className="fade-in fade-in-delay-1 font-corpo text-gray-600 text-base max-w-2xl mx-auto">
            Os mesmos planos valem para{' '}
            <span className="font-semibold text-grafite">Obras em Geral</span> e{' '}
            <span className="font-semibold text-grafite">Conjuntos Habitacionais</span> — contratados separadamente
          </p>
        </div>

        {/* Toggle */}
        <div className="fade-in fade-in-delay-2 flex justify-center mb-10">
          <div className="bg-white border border-gray-200 rounded-xl p-1 flex gap-1 shadow-sm">
            {produtos.map((p, i) => (
              <button
                key={p}
                onClick={() => setProdutoAtivo(i)}
                className={`font-corpo text-sm font-semibold px-5 py-2.5 rounded-lg transition-all ${
                  produtoAtivo === i
                    ? 'bg-grafite text-white shadow'
                    : 'text-gray-500 hover:text-grafite'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Cards */}
        <div className="grid md:grid-cols-3 gap-6 items-start">
          {planos.map((p, i) => (
            <div
              key={p.nome}
              className={`fade-in fade-in-delay-${i + 1} relative bg-white rounded-2xl p-8 flex flex-col shadow-sm transition-all duration-300 hover:shadow-xl ${
                p.destaque ? 'border-2 border-laranja ring-4 ring-laranja/10 scale-105' : 'border border-gray-100'
              }`}
            >
              {p.destaque && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <span className="bg-laranja text-white text-xs font-corpo font-bold px-4 py-1.5 rounded-full shadow">
                    ⭐ Mais Popular
                  </span>
                </div>
              )}

              <div className="mb-6">
                <h3 className="titulo-italico text-grafite text-2xl mb-1">{p.nome}</h3>
                <p className="font-corpo text-gray-500 text-sm mb-4">{p.descricao}</p>

                <div className="flex items-end gap-1 mb-1">
                  <span className="titulo-italico text-grafite text-4xl">{p.preco}</span>
                  <span className="font-corpo text-gray-400 text-sm mb-1">{p.periodo}</span>
                </div>
                <p className="font-corpo text-gray-400 text-xs">por produto • {produtos[produtoAtivo]}</p>
              </div>

              {/* Highlights */}
              <div className="grid grid-cols-3 gap-2 mb-6 bg-gray-50 rounded-xl p-3">
                {[
                  { label: 'Obras', value: p.obras },
                  { label: 'Usuários', value: p.usuarios },
                  { label: 'IA', value: p.ia || '—' },
                ].map((h) => (
                  <div key={h.label} className="text-center">
                    <div className="font-corpo font-bold text-grafite text-xs">{h.value}</div>
                    <div className="font-corpo text-gray-400 text-[10px]">{h.label}</div>
                  </div>
                ))}
              </div>

              {/* Features */}
              <ul className="space-y-2.5 mb-8 flex-1">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 font-corpo text-gray-600 text-sm">
                    <svg
                      className={`w-4 h-4 mt-0.5 flex-shrink-0 ${p.destaque ? 'text-laranja' : 'text-gray-400'}`}
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>

              <a
                href="#"
                className={`block text-center font-corpo font-bold text-sm px-6 py-3.5 rounded-xl transition-all ${
                  p.destaque
                    ? 'bg-laranja hover:bg-orange-600 text-white shadow-lg shadow-laranja/30 hover:scale-105'
                    : 'bg-grafite hover:bg-gray-700 text-white'
                }`}
              >
                {p.cta}
              </a>
            </div>
          ))}
        </div>

        <p className="fade-in text-center font-corpo text-gray-500 text-sm mt-8">
          Todos os planos incluem 30 dias grátis • Sem cartão de crédito para começar
        </p>
      </div>
    </section>
  )
}
