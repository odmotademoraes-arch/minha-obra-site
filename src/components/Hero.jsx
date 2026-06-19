import { useEffect, useRef } from 'react'

function MockupDashboard() {
  return (
    <div className="w-full max-w-sm mx-auto">
      <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-4 shadow-2xl">
        {/* Header bar */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-laranja"></div>
            <span className="text-white/70 text-xs font-corpo font-medium">Obra: Residencial Alphaville</span>
          </div>
          <span className="bg-amarelo text-grafite text-[10px] font-corpo font-bold px-2 py-0.5 rounded-full">AO VIVO</span>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          {[
            { label: 'Funcionários', value: '24', icon: '👷' },
            { label: 'Progresso', value: '67%', icon: '📊' },
            { label: 'Orçamento', value: 'R$ 1,2M', icon: '💰' },
            { label: 'Prazo', value: '48 dias', icon: '📅' },
          ].map((s) => (
            <div key={s.label} className="bg-white/10 rounded-xl p-3">
              <div className="text-lg mb-1">{s.icon}</div>
              <div className="text-white font-corpo font-bold text-base leading-none">{s.value}</div>
              <div className="text-white/50 text-[10px] font-corpo mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Progress bar */}
        <div className="bg-white/10 rounded-xl p-3 mb-3">
          <div className="flex justify-between items-center mb-2">
            <span className="text-white/70 text-xs font-corpo">Cronograma físico</span>
            <span className="text-amarelo text-xs font-corpo font-bold">67%</span>
          </div>
          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
            <div className="h-2 bg-laranja rounded-full" style={{ width: '67%' }}></div>
          </div>
        </div>

        {/* RDO row */}
        <div className="bg-laranja/20 border border-laranja/40 rounded-xl p-3">
          <div className="flex items-center gap-2">
            <span className="text-lg">📋</span>
            <div>
              <div className="text-white text-xs font-corpo font-semibold">RDO de hoje enviado</div>
              <div className="text-white/50 text-[10px] font-corpo">06/19/2026 às 17:42</div>
            </div>
            <div className="ml-auto w-5 h-5 bg-green-400 rounded-full flex items-center justify-center">
              <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function Hero() {
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
    <section id="hero" className="bg-grafite pt-16 min-h-screen flex items-center" ref={ref}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 w-full">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left */}
          <div>
            <div className="fade-in inline-flex items-center gap-2 bg-amarelo/20 border border-amarelo/40 text-amarelo text-sm font-corpo font-semibold px-4 py-2 rounded-full mb-6">
              <span className="w-2 h-2 bg-amarelo rounded-full animate-pulse"></span>
              Novo: IA de análise de EPI e materiais
            </div>

            <h1 className="fade-in fade-in-delay-1 titulo-italico text-white text-4xl sm:text-5xl lg:text-6xl leading-tight mb-6">
              Gerencie suas obras com{' '}
              <span className="text-laranja">inteligência</span>
            </h1>

            <p className="fade-in fade-in-delay-2 font-corpo text-gray-300 text-lg sm:text-xl leading-relaxed mb-8 max-w-lg">
              Do canteiro à prefeitura, tudo em um só lugar —{' '}
              <span className="text-white font-semibold">funciona 100% offline</span>
            </p>

            <div className="fade-in fade-in-delay-3 flex flex-wrap gap-4">
              <a
                href="#download"
                className="inline-flex items-center gap-2 bg-laranja hover:bg-orange-600 text-white font-corpo font-bold text-base px-7 py-3.5 rounded-xl transition-all hover:scale-105 shadow-lg shadow-laranja/30"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Baixar Grátis
              </a>
              <a
                href="#planos"
                className="inline-flex items-center border-2 border-white/50 hover:border-white text-white font-corpo font-semibold text-base px-7 py-3.5 rounded-xl transition-all hover:bg-white/10"
              >
                Ver Planos
              </a>
            </div>

            {/* Trust badges */}
            <div className="fade-in fade-in-delay-4 flex flex-wrap gap-6 mt-10">
              {['100% Offline', 'Windows / Mac / Linux', 'Grátis por 30 dias'].map((b) => (
                <div key={b} className="flex items-center gap-2 text-gray-400 text-sm font-corpo">
                  <svg className="w-4 h-4 text-green-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  {b}
                </div>
              ))}
            </div>
          </div>

          {/* Right – mockup */}
          <div className="fade-in fade-in-delay-2">
            <MockupDashboard />
          </div>
        </div>
      </div>
    </section>
  )
}
