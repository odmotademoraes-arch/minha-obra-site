import { useState } from 'react'
import { Building2, HardHat, Users, ChevronRight, ChevronLeft, Check } from 'lucide-react'
import { supabase } from '../lib/supabase'

interface Props {
  usuarioId: string
  onConcluir: () => void
}

type Passo = 1 | 2 | 3

export default function Onboarding({ usuarioId, onConcluir }: Props) {
  const [passo, setPasso]           = useState<Passo>(1)
  const [salvando, setSalvando]     = useState(false)
  const [empresa, setEmpresa]       = useState({ nome: '', cnpj: '' })
  const [obra, setObra]             = useState({
    nome: '', tipo: 'residencial', endereco: '', engenheiro_responsavel: '',
  })
  const [conviteEmail, setConvite]  = useState('')

  async function concluir() {
    setSalvando(true)
    try {
      // Criar empresa
      let empresaId: string | null = null
      if (empresa.nome.trim()) {
        const { data: emp } = await supabase.from('empresas').insert({
          nome: empresa.nome.trim(),
          cnpj: empresa.cnpj.trim() || null,
          dono_id: usuarioId,
        }).select('id').single()
        empresaId = emp?.id || null
      }

      // Criar primeira obra
      if (obra.nome.trim()) {
        await supabase.from('obras').insert({
          nome: obra.nome.trim(),
          tipo: obra.tipo,
          endereco: obra.endereco.trim() || null,
          engenheiro_responsavel: obra.engenheiro_responsavel.trim() || null,
          usuario_id: usuarioId,
          empresa_id: empresaId,
          status: 'planejamento',
        })
      }

      localStorage.setItem('onboarding_concluido', 'true')
      onConcluir()
    } catch (err) {
      console.error('Erro no onboarding:', err)
    } finally {
      setSalvando(false)
    }
  }

  const passos = [
    { num: 1, label: 'Empresa', icon: Building2 },
    { num: 2, label: 'Obra',    icon: HardHat },
    { num: 3, label: 'Equipe',  icon: Users },
  ]

  return (
    <div className="fixed inset-0 bg-gray-50 dark:bg-gray-900 z-50 flex items-center justify-center p-6">
      <div className="max-w-lg w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="font-display text-3xl text-azul italic mb-1">MINHA OBRA</div>
          <p className="text-gray-500 text-sm">Configure seu espaço em menos de 2 minutos</p>
        </div>

        {/* Indicador de passos */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {passos.map((p, i) => {
            const Icon      = p.icon
            const ativo     = p.num === passo
            const concluido = p.num < passo
            return (
              <div key={p.num} className="flex items-center">
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                  ativo     ? 'bg-azul text-white' :
                  concluido ? 'bg-green-100 text-green-700' :
                  'bg-gray-100 text-gray-400'
                }`}>
                  {concluido
                    ? <Check className="w-4 h-4" />
                    : <Icon className="w-4 h-4" />
                  }
                  <span className="hidden sm:inline">{p.label}</span>
                </div>
                {i < passos.length - 1 && (
                  <div className={`w-8 h-0.5 mx-1 ${concluido ? 'bg-green-300' : 'bg-gray-200'}`} />
                )}
              </div>
            )
          })}
        </div>

        {/* Card */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8">
          {/* Passo 1 — Empresa */}
          {passo === 1 && (
            <div>
              <h2 className="text-xl font-bold text-grafite dark:text-white mb-1">Sua empresa</h2>
              <p className="text-gray-400 text-sm mb-6">Esses dados aparecem nos relatórios e PDFs</p>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Nome da empresa <span className="text-red-400">*</span>
                  </label>
                  <input
                    className="w-full border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-azul"
                    placeholder="Ex: Construtora Silva Ltda"
                    value={empresa.nome}
                    onChange={e => setEmpresa(s => ({ ...s, nome: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    CNPJ <span className="text-gray-400 font-normal">(opcional)</span>
                  </label>
                  <input
                    className="w-full border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-azul"
                    placeholder="00.000.000/0000-00"
                    value={empresa.cnpj}
                    onChange={e => setEmpresa(s => ({ ...s, cnpj: e.target.value }))}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Passo 2 — Obra */}
          {passo === 2 && (
            <div>
              <h2 className="text-xl font-bold text-grafite dark:text-white mb-1">Primeira obra</h2>
              <p className="text-gray-400 text-sm mb-6">Você pode adicionar mais obras depois</p>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Nome da obra <span className="text-red-400">*</span>
                  </label>
                  <input
                    className="w-full border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-azul"
                    placeholder="Ex: Residência João da Silva"
                    value={obra.nome}
                    onChange={e => setObra(s => ({ ...s, nome: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tipo de obra</label>
                  <select
                    className="w-full border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-azul"
                    value={obra.tipo}
                    onChange={e => setObra(s => ({ ...s, tipo: e.target.value }))}
                  >
                    <option value="residencial">Residencial</option>
                    <option value="comercial">Comercial</option>
                    <option value="industrial">Industrial</option>
                    <option value="publica">Pública</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Endereço</label>
                  <input
                    className="w-full border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-azul"
                    placeholder="Rua, número, bairro, cidade"
                    value={obra.endereco}
                    onChange={e => setObra(s => ({ ...s, endereco: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Engenheiro responsável</label>
                  <input
                    className="w-full border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-azul"
                    placeholder="Nome completo"
                    value={obra.engenheiro_responsavel}
                    onChange={e => setObra(s => ({ ...s, engenheiro_responsavel: e.target.value }))}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Passo 3 — Equipe */}
          {passo === 3 && (
            <div>
              <h2 className="text-xl font-bold text-grafite dark:text-white mb-1">Convidar membro</h2>
              <p className="text-gray-400 text-sm mb-6">
                Disponível nos planos Profissional e Corporativo. Você pode pular por agora.
              </p>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  E-mail do membro
                </label>
                <input
                  type="email"
                  className="w-full border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-azul"
                  placeholder="colega@empresa.com.br"
                  value={conviteEmail}
                  onChange={e => setConvite(e.target.value)}
                />
                <p className="text-xs text-gray-400 mt-2">O convite será enviado por e-mail com link de acesso</p>
              </div>
            </div>
          )}
        </div>

        {/* Botões de navegação */}
        <div className="flex justify-between mt-6">
          {passo > 1 ? (
            <button
              onClick={() => setPasso(p => (p - 1) as Passo)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 text-sm font-medium transition-colors"
            >
              <ChevronLeft className="w-4 h-4" /> Voltar
            </button>
          ) : (
            <div />
          )}

          {passo < 3 ? (
            <button
              onClick={() => setPasso(p => (p + 1) as Passo)}
              disabled={passo === 1 && !empresa.nome.trim()}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-azul text-white text-sm font-semibold hover:bg-azul/90 disabled:opacity-40 transition-colors"
            >
              Próximo <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <div className="flex gap-3">
              <button
                onClick={concluir}
                disabled={salvando}
                className="text-sm text-gray-400 hover:text-gray-600 underline transition-colors"
              >
                Pular por agora
              </button>
              <button
                onClick={concluir}
                disabled={salvando}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-laranja text-white text-sm font-semibold hover:bg-laranja/90 disabled:opacity-50 transition-colors"
              >
                {salvando ? 'Salvando...' : <><Check className="w-4 h-4" /> Concluir</>}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
