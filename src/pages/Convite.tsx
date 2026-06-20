import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { supabase, hasSupabase } from '../lib/supabase'
import { useApp } from '../store/AppContext'
import { Building2, Lock, User, AlertCircle, CheckCircle, Eye, EyeOff, Key } from 'lucide-react'
import { CARGO_LABELS } from '../hooks/usePermissoes'

type Etapa = 'token' | 'verificando' | 'formulario' | 'erro' | 'sucesso'

interface ConviteData {
  id: string
  dono_id: string
  email_convidado: string
  cargo: string
  expira_em: string
  donNome?: string
}

export default function Convite() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { login } = useApp()

  const [etapa, setEtapa] = useState<Etapa>('token')
  const [token, setToken] = useState(searchParams.get('token') || '')
  const [convite, setConvite] = useState<ConviteData | null>(null)
  const [form, setForm] = useState({ nome: '', senha: '', confirmar: '' })
  const [senhaVis, setSenhaVis] = useState(false)
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')

  // Auto-verificar se o token veio pela URL
  useEffect(() => {
    const t = searchParams.get('token')
    if (t) { setToken(t); verificarToken(t) }
  }, [])

  async function verificarToken(t: string) {
    if (!t.trim()) { setErro('Informe o código do convite'); return }
    setEtapa('verificando')
    setErro('')
    try {
      const { data, error } = await supabase
        .from('convites')
        .select('*')
        .eq('token', t.trim())
        .single()

      if (error || !data) { setEtapa('erro'); setErro('Convite inválido ou não encontrado.'); return }
      if (data.status !== 'pendente') { setEtapa('erro'); setErro(`Este convite já foi ${data.status === 'aceito' ? 'aceito' : 'cancelado/expirado'}.`); return }
      if (new Date(data.expira_em) < new Date()) {
        await supabase.from('convites').update({ status: 'expirado' }).eq('id', data.id)
        setEtapa('erro'); setErro('Este convite expirou. Peça ao administrador para reenviar.'); return
      }

      // Busca nome do dono
      const { data: donoCliente } = await supabase
        .from('clientes_pendentes')
        .select('nome')
        .eq('usuario_id', data.dono_id)
        .single()

      setConvite({ ...data, donNome: donoCliente?.nome })
      setEtapa('formulario')
    } catch {
      setEtapa('erro')
      setErro('Erro ao verificar o convite. Verifique sua conexão.')
    }
  }

  async function handleCriarConta(e: React.FormEvent) {
    e.preventDefault()
    if (!convite) return
    setErro('')

    if (form.senha !== form.confirmar) { setErro('As senhas não conferem'); return }
    if (form.senha.length < 6) { setErro('Senha deve ter pelo menos 6 caracteres'); return }

    setLoading(true)
    try {
      // 1. Cria conta no Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: convite.email_convidado,
        password: form.senha,
        options: { data: { nome: form.nome } }
      })
      if (authError) throw new Error(traduzirErro(authError.message))

      const userId = authData.user?.id
      if (!userId) throw new Error('Erro ao criar usuário')

      // 2. Insere na tabela membros_empresa
      const { error: membroError } = await supabase.from('membros_empresa').insert({
        dono_id: convite.dono_id,
        usuario_id: userId,
        cargo: convite.cargo,
        ativo: true,
      })
      if (membroError) throw new Error('Erro ao vincular membro: ' + membroError.message)

      // 3. Marca convite como aceito
      await supabase.from('convites').update({ status: 'aceito' }).eq('id', convite.id)

      // 4. Notifica o dono
      supabase.functions.invoke('notificar-dono-aceite', {
        body: {
          donoId: convite.dono_id,
          nomeConvidado: form.nome,
          emailConvidado: convite.email_convidado,
          cargo: convite.cargo,
        }
      }).catch(() => {})

      // 5. Cria/sincroniza usuário local SQLite
      const res = await window.api.invoke('auth:sync-supabase', {
        email: convite.email_convidado,
        nome: form.nome,
      })
      if (!res.success) throw new Error('Erro ao configurar acesso local')

      // 6. Login direto (sem tela de espera)
      login(res.user, res.plano, res.assinatura, {
        supabaseUserId: userId,
        cargo: convite.cargo,
        donoSupabaseId: convite.dono_id,
        planoCloud: 'individual',
      })

      setEtapa('sucesso')
    } catch (err: any) {
      setErro(err.message)
    } finally {
      setLoading(false)
    }
  }

  function traduzirErro(msg: string): string {
    if (msg.includes('User already registered')) return 'Este e-mail já tem uma conta. Entre pelo login normal.'
    if (msg.includes('Password should be')) return 'Senha muito curta'
    return msg
  }

  const inp = (extra = '') =>
    `w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition ${extra}`

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-amber-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-amber-500 rounded-2xl shadow-xl mb-4">
            <Building2 size={32} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">Minha Obra</h1>
          <p className="text-slate-400 text-sm mt-1">Aceitar convite de equipe</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">

          {/* INSERIR TOKEN */}
          {(etapa === 'token') && (
            <div className="p-8 space-y-5">
              <div>
                <h2 className="text-xl font-bold text-slate-800">Código de convite</h2>
                <p className="text-sm text-slate-500 mt-1">
                  Cole o código que você recebeu no e-mail de convite.
                </p>
              </div>
              {erro && <Alerta>{erro}</Alerta>}
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-600 uppercase tracking-wide">Código do convite</label>
                <div className="relative">
                  <Key size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input value={token} onChange={e => setToken(e.target.value)}
                    className={inp('pl-9 font-mono text-xs')}
                    placeholder="Cole o código aqui..." />
                </div>
              </div>
              <button onClick={() => verificarToken(token)}
                className="w-full bg-amber-500 hover:bg-amber-600 text-white font-semibold py-3 rounded-xl transition shadow-md">
                Verificar convite
              </button>
              <button onClick={() => navigate(-1)}
                className="w-full text-sm text-slate-500 hover:text-slate-700">
                ← Voltar ao login
              </button>
            </div>
          )}

          {/* VERIFICANDO */}
          {etapa === 'verificando' && (
            <div className="p-8 text-center space-y-4">
              <div className="w-10 h-10 border-4 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-slate-500 text-sm">Verificando convite...</p>
            </div>
          )}

          {/* ERRO */}
          {etapa === 'erro' && (
            <div className="p-8 text-center space-y-4">
              <div className="flex items-center justify-center w-16 h-16 mx-auto bg-red-100 rounded-full">
                <AlertCircle size={32} className="text-red-500" />
              </div>
              <h2 className="text-xl font-bold text-slate-800">Convite inválido</h2>
              <p className="text-sm text-slate-500">{erro}</p>
              <button onClick={() => { setEtapa('token'); setErro('') }}
                className="w-full bg-amber-500 hover:bg-amber-600 text-white font-semibold py-3 rounded-xl transition">
                Tentar outro código
              </button>
              <button onClick={() => navigate(-1)}
                className="w-full text-sm text-slate-500 hover:text-slate-700">
                ← Voltar ao login
              </button>
            </div>
          )}

          {/* FORMULÁRIO */}
          {etapa === 'formulario' && convite && (
            <form onSubmit={handleCriarConta} className="p-8 space-y-5">
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <p className="text-sm text-amber-800 font-medium">
                  {convite.donNome || 'Um usuário'} convidou você como{' '}
                  <strong>{CARGO_LABELS[convite.cargo] || convite.cargo}</strong>
                </p>
              </div>

              {erro && <Alerta>{erro}</Alerta>}

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-600 uppercase tracking-wide">Nome completo *</label>
                <div className="relative">
                  <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input required value={form.nome}
                    onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
                    className={inp('pl-9')} placeholder="Seu nome completo" />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-600 uppercase tracking-wide">E-mail (do convite)</label>
                <input value={convite.email_convidado} disabled
                  className={inp('bg-slate-50 text-slate-400 cursor-not-allowed')} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-600 uppercase tracking-wide">Senha *</label>
                  <div className="relative">
                    <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input type={senhaVis ? 'text' : 'password'} required value={form.senha}
                      onChange={e => setForm(f => ({ ...f, senha: e.target.value }))}
                      className={inp('pl-9')} placeholder="••••••" />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-600 uppercase tracking-wide">Confirmar *</label>
                  <div className="relative">
                    <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input type={senhaVis ? 'text' : 'password'} required value={form.confirmar}
                      onChange={e => setForm(f => ({ ...f, confirmar: e.target.value }))}
                      className={inp('pl-9')} placeholder="••••••" />
                  </div>
                </div>
              </div>

              <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer select-none"
                onClick={() => setSenhaVis(v => !v)}>
                {senhaVis ? <EyeOff size={14} /> : <Eye size={14} />}
                {senhaVis ? 'Ocultar' : 'Mostrar'} senhas
              </label>

              <button type="submit" disabled={loading}
                className="w-full bg-amber-500 hover:bg-amber-600 disabled:opacity-60 text-white font-semibold py-3 rounded-xl transition shadow-md">
                {loading ? 'Criando conta...' : 'Criar conta e entrar'}
              </button>
            </form>
          )}

          {/* SUCESSO */}
          {etapa === 'sucesso' && (
            <div className="p-8 text-center space-y-4">
              <div className="flex items-center justify-center w-16 h-16 mx-auto bg-green-100 rounded-full">
                <CheckCircle size={32} className="text-green-500" />
              </div>
              <h2 className="text-xl font-bold text-slate-800">Bem-vindo à equipe!</h2>
              <p className="text-sm text-slate-500">Sua conta foi criada com sucesso. Redirecionando...</p>
            </div>
          )}
        </div>

        <p className="text-center text-xs text-slate-500 mt-6">
          Minha Obra © {new Date().getFullYear()}
        </p>
      </div>
    </div>
  )
}

function Alerta({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
      <AlertCircle size={16} className="shrink-0" />
      <span>{children}</span>
    </div>
  )
}
