import { useEffect, useRef } from 'react'

const produtos = [
  {
    icon: '🏗️',
    nome: 'Obras em Geral',
    publico: 'Para engenheiros, construtoras e prefeituras',
    descricao:
      'Gestão completa de obras civis com controle de funcionários, financeiro integrado, saúde e segurança do trabalho, Diário de Obra (RDO) digital e inteligência artificial para análise de EPI e estimativa de materiais.',
    features: [
      'Gestão de obras civis',
      'Controle de funcionários',
      'Financeiro e orçamento',
      'SST / NR-18',
      'RDO digital',
      'IA de EPI e materiais',
    ],
    color: 'border-laranja',
    badgeColor: 'bg-laranja',
  },
  {
    icon: '🏘️',
    nome: 'Conjuntos Habitacionais',
    publico: 'Para incorporadoras e gestores habitacionais',
    descricao:
      'Plataforma dedicada à gestão de conjuntos habitacionais com controle de unidades, compradores e contratos, cronograma de entrega por unidade e financeiro individualizado por lote.',
    features: [
      'Gestão de unidades/lotes',
      'Compradores e contratos',
      'Cronograma de entrega',
      'Financeiro por unidade',
      'Relatórios de progresso',
      'IA de cronograma',
    ],
    color: 'border-amarelo',
    badgeColor: 'bg-amarelo',
  },
]

export default function Produtos() {
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
      { threshold: 0.1 }
    )
    targets.forEach((t) => observer.observe(t))
    return () => observer.disconnect()
  }, [])

  return (
    <section id="produtos" className="bg-cinza py-20" ref={ref}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <h2 className="fade-in titulo-italico text-grafite text-3xl sm:text-4xl lg:text-5xl mb-4">
            Dois produtos, uma só plataforma
          </h2>
          <p className="fade-in fade-in-delay-1 font-corpo text-gray-600 text-lg max-w-2xl mx-auto">
            Escolha o produto ideal para sua operação. Cada um conta com os mesmos 3 planos, contratados separadamente.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {produtos.map((p, i) => (
            <div
              key={p.nome}
              className={`fade-in fade-in-delay-${i + 1} bg-white rounded-2xl border-t-4 ${p.color} shadow-sm hover:shadow-xl transition-shadow duration-300 p-8 flex flex-col`}
            >
              <div className="text-5xl mb-4">{p.icon}</div>
              <div className={`inline-block ${p.badgeColor} ${p.badgeColor === 'bg-amarelo' ? 'text-grafite' : 'text-white'} text-xs font-corpo font-bold px-3 py-1 rounded-full mb-3 self-start`}>
                {p.publico}
              </div>
              <h3 className="titulo-italico text-grafite text-2xl mb-3">{p.nome}</h3>
              <p className="font-corpo text-gray-600 text-sm leading-relaxed mb-6">{p.descricao}</p>

              <ul className="space-y-2 mb-8 flex-1">
                {p.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 font-corpo text-gray-700 text-sm">
                    <svg className="w-4 h-4 text-laranja flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>

              <a
                href="#planos"
                className="block text-center bg-grafite hover:bg-gray-700 text-white font-corpo font-semibold text-sm px-6 py-3 rounded-xl transition-colors"
              >
                Ver planos para {p.nome}
              </a>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
