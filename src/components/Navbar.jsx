import { useState, useEffect } from 'react'

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const links = [
    { label: 'Funcionalidades', href: '#funcionalidades' },
    { label: 'Produtos', href: '#produtos' },
    { label: 'Planos', href: '#planos' },
    { label: 'Contato', href: '#footer' },
  ]

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? 'bg-grafite shadow-lg' : 'bg-grafite/90 backdrop-blur-sm'
      }`}
    >
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
        {/* Logo */}
        <a href="#hero" className="flex items-center gap-2 flex-shrink-0">
          <img src="/logo.png" alt="Minha Obra" className="h-10 w-10 object-contain" />
          <span
            className="titulo-italico text-white text-xl leading-none"
            style={{ letterSpacing: '-0.02em' }}
          >
            Minha Obra
          </span>
        </a>

        {/* Desktop links */}
        <ul className="hidden md:flex items-center gap-8">
          {links.map((l) => (
            <li key={l.href}>
              <a
                href={l.href}
                className="font-corpo text-gray-300 hover:text-white transition-colors text-sm font-medium"
              >
                {l.label}
              </a>
            </li>
          ))}
        </ul>

        {/* CTA */}
        <a
          href="#planos"
          className="hidden md:inline-flex items-center bg-laranja hover:bg-orange-600 text-white font-corpo font-semibold text-sm px-5 py-2.5 rounded-lg transition-colors"
        >
          Começar Grátis
        </a>

        {/* Mobile burger */}
        <button
          className="md:hidden text-white p-2"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Abrir menu"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {menuOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </nav>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden bg-grafite border-t border-white/10 px-4 pb-4">
          <ul className="flex flex-col gap-3 pt-3">
            {links.map((l) => (
              <li key={l.href}>
                <a
                  href={l.href}
                  onClick={() => setMenuOpen(false)}
                  className="block font-corpo text-gray-300 hover:text-white py-1 text-sm font-medium"
                >
                  {l.label}
                </a>
              </li>
            ))}
          </ul>
          <a
            href="#planos"
            onClick={() => setMenuOpen(false)}
            className="mt-4 block text-center bg-laranja hover:bg-orange-600 text-white font-corpo font-semibold text-sm px-5 py-2.5 rounded-lg transition-colors"
          >
            Começar Grátis
          </a>
        </div>
      )}
    </header>
  )
}
