import { useEffect, useRef } from 'react'

const funcionalidades = [
  {
    icon: '🏗️',
    titulo: 'Gestão de Obras',
    descricao: 'Cadastre e gerencie múltiplas obras simultâneas com painel centralizado, etapas, prazos e progresso em tempo real.',
  },
  {
    icon: '👷',
    titulo: 'Funcionários e Ponto',
    descricao: 'Controle completo de equipe com registro de ponto, cargos, funções e histórico de presença por obra.',
  },
  {
    icon: '💰',
    titulo: 'Financeiro e Orçamento',
    descricao: 'Orçamento detalhado, controle de despesas, contas a pagar e relatórios financeiros por obra ou global.',
  },
  {
    icon: '📋',
    titulo: 'Diário de Obra (RDO)',
    descricao: 'Registro Diário de Obra digital com fotos, ocorrências, efetivo de pessoal e exportação em PDF profissional.',
  },
  {
    icon: '🩺',
    titulo: 'Saúde e Segurança (SST)',
    descricao: 'Gestão de EPIs, treinamentos NR-18, checklist de segurança e controle de vencimentos de documentos.',
    badge: null,
  },
  {
    icon: '🤖',
    titulo: 'IA de Detecção de EPI',
    descricao: 'Análise automática por inteligência artificial para verificar uso correto de EPIs nas fotos do canteiro.',
    badge: 'Profissional+',
  },
  {
    icon: '🧱',
    titulo: 'IA de Estimativa de Materiais',
    descricao: 'Calcule automaticamente a quantidade de materiais necessários com base em plantas e parâmetros da obra usando IA.',
    badge: 'Profissional+',
  },
  {
    icon: '📊',
    titulo: 'Relatórios em PDF',
    descricao: 'Gere relatórios profissionais personalizados com a identidade visual da sua empresa em poucos cliques.',
  },
]

export default function Funcionalidades() {
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
    <section id="funcionalidades" className="bg-white py-20" ref={ref}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <h2 className="fade-in titulo-italico text-grafite text-3xl sm:text-4xl lg:text-5xl mb-4">
            Tudo que sua obra precisa
          </h2>
          <p className="fade-in fade-in-delay-1 font-corpo text-gray-600 text-lg max-w-2xl mx-auto">
            Funcionalidades pensadas por quem conhece o canteiro de obras. Do simples ao avançado com IA.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {funcionalidades.map((f, i) => (
            <div
              key={f.titulo}
              className={`fade-in fade-in-delay-${(i % 4) + 1} group bg-gray-50 hover:bg-cinza border border-gray-100 hover:border-laranja/30 rounded-2xl p-6 transition-all duration-300 hover:shadow-md relative`}
            >
              {f.badge && (
                <span className="absolute top-4 right-4 bg-amarelo text-grafite text-[10px] font-corpo font-bold px-2 py-0.5 rounded-full">
                  {f.badge}
                </span>
              )}
              <div className="text-4xl mb-4">{f.icon}</div>
              <h3 className="titulo-italico text-grafite text-lg mb-2">{f.titulo}</h3>
              <p className="font-corpo text-gray-600 text-sm leading-relaxed">{f.descricao}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
