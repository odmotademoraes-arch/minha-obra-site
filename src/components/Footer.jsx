export default function Footer() {
  return (
    <footer id="footer" className="bg-grafite border-t border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid md:grid-cols-3 gap-10 mb-10">
          {/* Brand */}
          <div className="md:col-span-1">
            <a href="#hero" className="flex items-center gap-2 mb-4">
              <img src="/logo.png" alt="Minha Obra" className="h-10 w-10 object-contain" />
              <span className="titulo-italico text-white text-xl">Minha Obra</span>
            </a>
            <p className="font-corpo text-gray-400 text-sm leading-relaxed">
              Tecnologia para quem constrói.<br />
              Gestão inteligente do canteiro à prefeitura.
            </p>
          </div>

          {/* Links */}
          <div>
            <h4 className="titulo-italico text-white text-base mb-4">Produto</h4>
            <ul className="space-y-2">
              {[
                { label: 'Funcionalidades', href: '#funcionalidades' },
                { label: 'Produtos', href: '#produtos' },
                { label: 'Planos', href: '#planos' },
                { label: 'Download', href: '#download' },
                { label: 'IA no Minha Obra', href: '#ia' },
              ].map((l) => (
                <li key={l.href}>
                  <a href={l.href} className="font-corpo text-gray-400 hover:text-white text-sm transition-colors">
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="titulo-italico text-white text-base mb-4">Legal</h4>
            <ul className="space-y-2">
              {[
                { label: 'Política de Privacidade', href: '#' },
                { label: 'Termos de Uso', href: '#' },
                { label: 'Contato', href: '#' },
              ].map((l) => (
                <li key={l.label}>
                  <a href={l.href} className="font-corpo text-gray-400 hover:text-white text-sm transition-colors">
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="border-t border-white/10 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="font-corpo text-gray-500 text-sm">
            © 2025 Minha Obra. Todos os direitos reservados.
          </p>
          <div className="flex items-center gap-3">
            <span className="font-corpo text-gray-500 text-xs">Feito com</span>
            <span className="text-laranja">♥</span>
            <span className="font-corpo text-gray-500 text-xs">para a construção civil brasileira</span>
          </div>
        </div>
      </div>
    </footer>
  )
}
