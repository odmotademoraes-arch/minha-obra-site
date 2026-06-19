import Navbar from './components/Navbar'
import Hero from './components/Hero'
import Produtos from './components/Produtos'
import Funcionalidades from './components/Funcionalidades'
import Planos from './components/Planos'
import IADestaque from './components/IADestaque'
import Download from './components/Download'
import Footer from './components/Footer'

export default function App() {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <Produtos />
        <Funcionalidades />
        <Planos />
        <IADestaque />
        <Download />
      </main>
      <Footer />
    </>
  )
}
