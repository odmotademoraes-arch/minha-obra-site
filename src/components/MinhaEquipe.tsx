import { useState, useEffect, useCallback } from 'react'
import { supabase, hasSupabase } from '../lib/supabase'
import { useApp } from '../store/AppContext'
import { UserPlus, Trash2, RefreshCw, Clock, Crown, AlertCircle, CheckCircle, Send } from 'lucide-react'
import { CARGO_LABELS } from '../hooks/usePermissoes'

interface Membro {
  id: string
  usuario_id: string
  cargo: string
  ativo: boolean
  entrou_em: string
  email?: string
  nome?: string
}

interface Convite {
  id: string
  email_convidado: string
  cargo: string
  status: string
  criado_em: string
  expira_em: string
}

interface PlanoInfo {
  plano: string
  limite: number
  membrosAtivos: number
}

const CARGOS_CONVITE = [
  { value: 'engenheiro_chefe', label: 'Engenheiro Chefe' },
  { value: 'engenheiro',       label: 'Engenheiro' },
  { value: 'tecnico',          label: 'Técnico de Segurança' },
  { value: 'rh',               label: 'RH' },
  { value: 'visualizador',     label: 'Visualizador' },
]

const LIMITES: Record<string, number> = {
  individual: 1,
  profissional: 2,
  corporativo: 999,
}

export function MinhaEquipe() {
  const { supabaseUserId, planoCloud } = useApp()
  const [membros, setMembros] = useState<Membro[]>([])
  const [convites, setConvites] = useState<Convite[]>([])
  const [planoInfo, setPlanoInfo] = useState<PlanoInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [conviteForm, setConviteForm] = useState({ email: '', cargo: 'engenheiro' })
  const [enviando, setEnviando] = useState(false)
  const [msg, setMsg] = useState<{ tipo: 'ok' | 'erro'; texto: string } | null>(null)

  const carregar = useCallback(async () => {
    if (!supabaseUserId) return
    setLoading(true)

    // Limites do plano
    const planoAtual = planoCloud || 'individual'
    const limite = LIMITES[planoAtual] ?? 1

    // Membros ativos
    const { data: membrosData } = await supabase
      .from('membros_empresa')
      .select('*')
      .eq('dono_id', supabaseUserId)
      .eq('ativo', true)
      .order('entrou_em', { ascending: false })

    // Enriquece com nome/email via clientes_pendentes
    const membrosEnriquecidos: Membro[] = await Promise.all(
      (membrosData || []).map(async (m: any) => {
        const { data: cli } = await supabase
          .from('clientes_pendentes')
          .select('nome, email')
          .eq('usuario_id', m.usuario_id)
          .single()
        return { ...m, nome: cli?.nome, email: cli?.email }
      })
    )
    setMembros(membrosEnriquecidos)
    setPlanoInfo({ plano: planoAtual, limite, membrosAtivos: membrosEnriquecidos.length + 1 }) // +1 pelo dono

    // Convites pendentes
    const { data: convitesData } = await supabase
      .from('convites')
      .select('*')
      .eq('dono_id', supabaseUserId)
      .eq('status', 'pendente')
      .order('criado_em', { ascending: false })

    // Expira convites vencidos
    const agora = new Date()
    const atualizarExpirados = (convitesData || [])
      .filter((c: any) => new Date(c.expira_em) < agora)
      .map((c: any) => supabase.from('convites').update({ status: 'expirado' }).eq('id', c.id))
    if (atualizarExpirados.length) await Promise.all(atualizarExpirados)

    setConvites((convitesData || []).filter((c: any) => new Date(c.expira_em) >= agora))
    setLoading(false)
  }, [supabaseUserId, planoCloud])

  useEffect(() => { carregar() }, [carregar])

  async function enviarConvite() {
    if (!supabaseUserId || !planoInfo) return
    setMsg(null)

    if (!conviteForm.email || !conviteForm.email.includes('@')) {
      setMsg({ tipo: 'erro', texto: 'Informe um e-mail válido' }); return
    }

    // Verifica limite
    const membrosAtuais = planoInfo.membrosAtivos
    if (membrosAtuais >= planoInfo.limite) {
      setMsg({
        tipo: 'erro',
        texto: `Você atingiu o limite de ${planoInfo.limite} usuário(s) do plano ${planoInfo.plano}. Faça upgrade para o Corporativo para adicionar mais membros.`
      }); return
    }

    // Verifica se já há convite pendente para este e-mail
    const jaConvidado = convites.some(c => c.email_convidado === conviteForm.email)
    if (jaConvidado) {
      setMsg({ tipo: 'erro', texto: 'Já existe um convite pendente para este e-mail' }); return
    }

    setEnviando(true)
    try {
      const token = crypto.randomUUID()
      const { error } = await supabase.from('convites').insert({
        dono_id: supabaseUserId,
        email_convidado: conviteForm.email,
        cargo: conviteForm.cargo,
        token,
        status: 'pendente',
      })
      if (error) throw error

      // Busca nome do dono
      const { data: donoCli } = await supabase
        .from('clientes_pendentes')
        .select('nome')
        .eq('usuario_id', supabaseUserId)
        .single()

      await supabase.functions.invoke('enviar-convite', {
        body: {
          token,
          emailConvidado: conviteForm.email,
          cargo: conviteForm.cargo,
          nomeDonoRaw: donoCli?.nome || 'O administrador',
        }
      }).catch(() => {})

      setMsg({ tipo: 'ok', texto: `Convite enviado para ${conviteForm.email}!` })
      setConviteForm({ email: '', cargo: 'engenheiro' })
      setModal(false)
      carregar()
    } catch (err: any) {
      setMsg({ tipo: 'erro', texto: err.message || 'Erro ao enviar convite' })
    } finally {
      setEnviando(false)
    }
  }

  async function reenviarConvite(convite: Convite) {
    const novoToken = crypto.randomUUID()
    const novaExpiracao = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    await supabase.from('convites').update({ token: novoToken, expira_em: novaExpiracao }).eq('id', convite.id)

    const { data: donoCli } = await supabase
      .from('clientes_pendentes').select('nome').eq('usuario_id', supabaseUserId!).single()

    await supabase.functions.invoke('enviar-convite', {
      body: {
        token: novoToken,
        emailConvidado: convite.email_convidado,
        cargo: convite.cargo,
        nomeDonoRaw: donoCli?.nome,
      }
    }).catch(() => {})
    setMsg({ tipo: 'ok', texto: `Convite reenviado para ${convite.email_convidado}` })
    carregar()
  }

  async function cancelarConvite(id: string) {
    await supabase.from('convites').update({ status: 'expirado' }).eq('id', id)
    carregar()
  }

  async function removerMembro(id: string) {
    if (!window.confirm('Deseja remover este membro da equipe?')) return
    await supabase.from('membros_empresa').update({ ativo: false }).eq('id', id)
    carregar()
  }

  if (!hasSupabase) {
    return (
      <div className="p-6 text-center text-gray-500 text-sm">
        Configure o Supabase nas variáveis de ambiente para usar este recurso.
      </div>
    )
  }

  if (!supabaseUserId) {
    return (
      <div className="p-6 text-center text-gray-500 text-sm">
        Faça login com sua conta Supabase para gerenciar sua equipe.
      </div>
    )
  }

  const plano = planoCloud || 'individual'
  const podeConvidar = ['profissional', 'corporativo'].includes(plano)
  const limite = LIMITES[plano] ?? 1
  const membrosAtivos = membros.length + 1
  const pct = Math.min((membrosAtivos / limite) * 100, 100)
  const planoLabel: Record<string, string> = { individual: 'Individual', profissional: 'Profissional', corporativo: 'Corporativo' }

  return (
    <div className="space-y-6">
      {/* Cabeçalho com plano */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Crown size={18} className="text-amber-500" />
            <span className="font-semibold text-gray-800">
              Plano {planoLabel[plano] || plano}
              {' — '}
              {plano === 'corporativo'
                ? `${membrosAtivos} usuário(s) — ilimitados`
                : `${membrosAtivos} de ${limite} usuário(s) utilizados`}
            </span>
          </div>
          {podeConvidar && (
            <button onClick={() => { setModal(true); setMsg(null) }}
              className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium rounded-xl transition">
              <UserPlus size={15} /> Convidar Membro
            </button>
          )}
        </div>

        {plano !== 'corporativo' && (
          <div>
            <div className="w-full bg-gray-100 rounded-full h-2 mb-1">
              <div className="h-2 rounded-full transition-all"
                style={{ width: `${pct}%`, backgroundColor: pct >= 100 ? '#ef4444' : '#F97316' }} />
            </div>
            <p className="text-xs text-gray-400">{pct.toFixed(0)}% do limite utilizado</p>
          </div>
        )}

        {!podeConvidar && (
          <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-700">
            O plano Individual não suporta membros adicionais. Faça upgrade para o Profissional ou Corporativo.
          </div>
        )}
      </div>

      {msg && (
        <div className={`flex items-center gap-2 rounded-xl px-4 py-3 text-sm ${
          msg.tipo === 'ok'
            ? 'bg-green-50 border border-green-200 text-green-700'
            : 'bg-red-50 border border-red-200 text-red-700'
        }`}>
          {msg.tipo === 'ok' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
          {msg.texto}
        </div>
      )}

      {/* Lista de membros */}
      {loading ? (
        <div className="flex items-center justify-center h-24">
          <div className="w-7 h-7 border-4 border-amber-400 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-semibold text-gray-800">Membros ativos</h3>
              <button onClick={carregar} className="text-gray-400 hover:text-gray-600">
                <RefreshCw size={15} />
              </button>
            </div>

            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-400 text-xs uppercase tracking-wide border-b border-gray-50">
                  <th className="px-6 py-3 font-medium">Membro</th>
                  <th className="px-6 py-3 font-medium">Cargo</th>
                  <th className="px-6 py-3 font-medium">Entrou em</th>
                  <th className="px-6 py-3 font-medium" />
                </tr>
              </thead>
              <tbody>
                {/* Dono sempre aparece primeiro */}
                <tr className="border-b border-gray-50">
                  <td className="px-6 py-3">
                    <p className="font-medium text-gray-800">Você (dono)</p>
                  </td>
                  <td className="px-6 py-3">
                    <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                      Dono
                    </span>
                  </td>
                  <td className="px-6 py-3 text-gray-400 text-xs">—</td>
                  <td className="px-6 py-3" />
                </tr>

                {membros.map(m => (
                  <tr key={m.id} className="border-b border-gray-50 hover:bg-gray-50 transition">
                    <td className="px-6 py-3">
                      <p className="font-medium text-gray-800">{m.nome || 'Sem nome'}</p>
                      <p className="text-gray-400 text-xs">{m.email}</p>
                    </td>
                    <td className="px-6 py-3">
                      <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                        {CARGO_LABELS[m.cargo] || m.cargo}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-gray-400 text-xs">
                      {new Date(m.entrou_em).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-6 py-3">
                      <button onClick={() => removerMembro(m.id)}
                        className="text-gray-300 hover:text-red-500 transition">
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
                {membros.length === 0 && (
                  <tr><td colSpan={4} className="px-6 py-6 text-center text-gray-400 text-xs">
                    Nenhum membro na equipe ainda
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Convites pendentes */}
          {convites.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100">
                <h3 className="font-semibold text-gray-800">Convites pendentes</h3>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-400 text-xs uppercase tracking-wide border-b border-gray-50">
                    <th className="px-6 py-3 font-medium">E-mail</th>
                    <th className="px-6 py-3 font-medium">Cargo</th>
                    <th className="px-6 py-3 font-medium">Enviado</th>
                    <th className="px-6 py-3 font-medium">Expira</th>
                    <th className="px-6 py-3 font-medium">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {convites.map(c => {
                    const diasRestantes = Math.ceil(
                      (new Date(c.expira_em).getTime() - Date.now()) / 86400000
                    )
                    return (
                      <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50 transition">
                        <td className="px-6 py-3 text-gray-700">{c.email_convidado}</td>
                        <td className="px-6 py-3">
                          <span className="px-2 py-0.5 rounded-full text-xs bg-slate-100 text-slate-600">
                            {CARGO_LABELS[c.cargo] || c.cargo}
                          </span>
                        </td>
                        <td className="px-6 py-3 text-gray-400 text-xs">
                          {new Date(c.criado_em).toLocaleDateString('pt-BR')}
                        </td>
                        <td className="px-6 py-3">
                          <span className={`flex items-center gap-1 text-xs ${diasRestantes <= 1 ? 'text-red-500' : 'text-gray-400'}`}>
                            <Clock size={12} /> {diasRestantes}d restante{diasRestantes !== 1 ? 's' : ''}
                          </span>
                        </td>
                        <td className="px-6 py-3">
                          <div className="flex items-center gap-2">
                            <button onClick={() => reenviarConvite(c)}
                              className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium">
                              <Send size={12} /> Reenviar
                            </button>
                            <button onClick={() => cancelarConvite(c.id)}
                              className="text-xs text-red-400 hover:text-red-600">
                              Cancelar
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* Modal de convite */}
      {modal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-5">
            <h3 className="text-lg font-bold text-gray-800">Convidar novo membro</h3>

            {msg && (
              <div className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm ${
                msg.tipo === 'ok' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
              }`}>
                {msg.tipo === 'ok' ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
                {msg.texto}
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">E-mail *</label>
              <input type="email" required value={conviteForm.email}
                onChange={e => setConviteForm(f => ({ ...f, email: e.target.value }))}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition"
                placeholder="email@exemplo.com" />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Cargo *</label>
              <select value={conviteForm.cargo}
                onChange={e => setConviteForm(f => ({ ...f, cargo: e.target.value }))}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition">
                {CARGOS_CONVITE.map(c => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>

            <div className="flex gap-3">
              <button onClick={() => { setModal(false); setMsg(null) }}
                className="flex-1 py-3 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition">
                Cancelar
              </button>
              <button onClick={enviarConvite} disabled={enviando}
                className="flex-1 py-3 rounded-xl text-white text-sm font-semibold transition disabled:opacity-60 bg-amber-500 hover:bg-amber-600">
                {enviando ? 'Enviando...' : 'Enviar Convite'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
