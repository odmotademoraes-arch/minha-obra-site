import { useEffect, useRef } from 'react'

const blocos = [
  {
    plano: 'Plano Profissional',
    planoBadge: 'bg-laranja text-white',
    titulo: 'Ajuda com IA',
    icon: '🤖',
    descricao:
      'Um assistente inteligente sempre à mão para tirar dúvidas técnicas, gerar relatórios automáticos e sugerir cronogramas otimizados com base no histórico das suas obras.',
    items: [
      'Respostas a dúvidas técnicas e normativas',
      'Geração automática de relatórios e RDOs',
      'Sugestão de cronogramas realistas',
      'Análise de inconsistências nos dados',
    ],
  },
  {
    plano: 'Plano Corporativo',
    planoBadge: 'bg-amarelo text-grafite',
    titulo: 'Gestão com IA',
    icon: '🧠',
    descricao:
      'IA preditiva que analisa seus dados históricos para antecipar problemas de prazo e custo antes que aconteçam, com alertas automáticos e dashboards gerados pela própria inteligência artificial.',
    items: [
      'Análise preditiva de prazos e custos',
      'Alertas inteligentes de desvio',
      'Dashboards automáticos por obra',
      'Visão consolidada multiempresa',
      'Acesso à API para integrações',
    ],
  },
]

export default function IADestaque() {
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
    <section id="ia" className="bg-grafite py-20" ref={ref}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <h2 className="fade-in titulo-italico text-white text-3xl sm:text-4xl lg:text-5xl mb-4">
            Inteligência artificial dentro do{' '}
            <span className="text-laranja">canteiro de obras</span>
          </h2>
          <p className="fade-in fade-in-delay-1 font-corpo text-gray-400 text-lg max-w-2xl mx-auto">
            A IA do Minha Obra não é um chatbot genérico — ela conhece a construção civil e trabalha com os dados reais das suas obras.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {blocos.map((b, i) => (
            <div
              key={b.titulo}
              className={`fade-in fade-in-delay-${i + 1} bg-white/5 border border-white/10 rounded-2xl p-8 hover:bg-white/10 transition-colors`}
            >
              <div className="flex items-center gap-3 mb-4">
                <span className="text-4xl">{b.icon}</span>
                <span className={`font-corpo text-xs font-bold px-3 py-1 rounded-full ${b.planoBadge}`}>
                  {b.plano}
                </span>
              </div>
              <h3 className="titulo-italico text-white text-2xl mb-3">{b.titulo}</h3>
              <p className="font-corpo text-gray-400 text-sm leading-relaxed mb-6">{b.descricao}</p>

              <ul className="space-y-3">
                {b.items.map((item) => (
                  <li key={item} className="flex items-start gap-3 font-corpo text-gray-300 text-sm">
                    <div className="w-5 h-5 rounded-full bg-laranja/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <svg className="w-3 h-3 text-laranja" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                    {item}
                  </li>
                ))}
              </ul>

              <a
                href="#planos"
                className="mt-8 inline-flex items-center gap-2 font-corpo text-sm font-semibold text-laranja hover:text-orange-400 transition-colors group"
              >
                Ver plano {b.plano.replace('Plano ', '')}
                <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </a>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
