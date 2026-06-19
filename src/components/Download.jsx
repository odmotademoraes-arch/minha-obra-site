import { useEffect, useRef } from 'react'

const plataformas = [
  {
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
        <path d="M0 3.449L9.75 2.1v9.451H0m10.949-9.602L24 0v11.4H10.949M0 12.6h9.75v9.451L0 20.699M10.949 12.6H24V24l-12.9-1.801" />
      </svg>
    ),
    nome: 'Windows',
    extensao: '.exe',
    href: '#',
  },
  {
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm-1 14.5v-9l7 4.5-7 4.5z" />
      </svg>
    ),
    nome: 'macOS',
    extensao: '.dmg',
    href: '#',
  },
  {
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12.504 0c-.155 0-.315.008-.48.021-4.226.333-3.105 4.807-3.17 6.298-.076 1.092-.3 1.953-1.05 3.02-.885 1.051-2.127 2.75-2.716 4.521-.278.832-.41 1.684-.287 2.489a.424.424 0 00.11.092c1.357-.524 2.903-.85 4.49-.85 2.747 0 5.23 1.026 7.097 2.706.15.134.321.17.494.134.5-.118.965-.28 1.395-.48.143-.067.284-.138.424-.214.154-.082.306-.17.455-.262 2.072-1.275 3.497-3.588 3.497-6.23 0-4.05-3.286-7.334-7.337-7.334l-.023-.001zm3.96 20.055c.033-.023.066-.046.097-.07a.394.394 0 01-.097.07z" />
      </svg>
    ),
    nome: 'Linux',
    extensao: '.AppImage',
    href: '#',
  },
]

export default function Download() {
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
    <section id="download" className="bg-laranja py-20" ref={ref}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="fade-in titulo-italico text-white text-3xl sm:text-4xl lg:text-5xl mb-4">
          Disponível para Windows, Mac e Linux
        </h2>
        <p className="fade-in fade-in-delay-1 font-corpo text-white/80 text-lg mb-3">
          Instale em qualquer computador e comece a usar agora mesmo
        </p>
        <div className="fade-in fade-in-delay-2 inline-flex items-center gap-2 bg-white/20 text-white font-corpo font-semibold text-sm px-4 py-2 rounded-full mb-10">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
          </svg>
          Versão 1.0 — Plano Individual grátis por 30 dias
        </div>

        <div className="flex flex-wrap justify-center gap-4 mb-12">
          {plataformas.map((p, i) => (
            <a
              key={p.nome}
              href={p.href}
              className={`fade-in fade-in-delay-${i + 1} group flex items-center gap-3 bg-white text-grafite hover:bg-gray-100 font-corpo font-bold text-base px-8 py-4 rounded-xl transition-all hover:scale-105 shadow-lg`}
            >
              <span className="text-grafite/70 group-hover:text-grafite transition-colors">
                {p.icon}
              </span>
              <div className="text-left">
                <div className="leading-none">{p.nome}</div>
                <div className="text-gray-400 text-xs font-normal mt-0.5">{p.extensao}</div>
              </div>
              <svg className="w-4 h-4 text-gray-400 group-hover:translate-y-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
            </a>
          ))}
        </div>

        <p className="fade-in font-corpo text-white/60 text-sm">
          Funciona 100% offline • Sem assinatura obrigatória • Dados armazenados localmente
        </p>
      </div>
    </section>
  )
}
