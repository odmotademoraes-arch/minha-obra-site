import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../store/AppContext'
import { supabase, hasSupabase } from '../lib/supabase'
import { Building2, Lock, Mail, Eye, EyeOff, User, Phone, AlertCircle, Clock, CheckCircle, RefreshCw, UserPlus } from 'lucide-react'

type Tela = 'login' | 'cadastro' | 'aguardando' | 'esqueci' | 'esqueci-enviado' | 'hwid-conflito'

interface HwidConflito {
  pc_nome: string
  ultimo_acesso: string
}

export default function Login() {
  const { login } = useApp()
  const navigate = useNavigate()
  const [tela, setTela] = useState<Tela>('login')
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')
  const [senhaVis, setSenhaVis] = useState(false)
  const [hwidConflito, setHwidConflito] = useState<HwidConflito | null>(null)
  const [supabaseUser, setSupabaseUser] = useState<any>(null)
  const [configSistema, setConfigSistema] = useState<Record<string, string>>({})

  const [loginForm, setLoginForm] = useState({ email: '', senha: '' })
  const [cadastroForm, setCadastroForm] = useState({ nome: '', email: '', senha: '', confirmar: '', telefone: '', empresa: '' })
  const [esqueciEmail, setEsqueciEmail] = useState('')

  useEffect(() => {
    if (!hasSupabase) return
    supabase.from('config_sistema').select('chave,valor').then(({ data }) => {
      if (data) setConfigSistema(Object.fromEntries(data.map((r: any) => [r.chave, r.valor])))
    })
  }, [])

  // ── Login ──────────────────────────────────────────────────────────────────
  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setErro('')
    setLoading(true)
    try {
      if (hasSupabase) {
        await loginSupabase(loginForm.email, loginForm.senha)
      } else {
        await loginLocal(loginForm.email, loginForm.senha)
      }
    } catch (err: any) {
      setErro(err.message || 'Erro ao entrar')
    } finally {
      setLoading(false)
    }
  }

  async function loginLocal(email: string, senha: string) {
    const res = await window.api.invoke('auth:login', { email, senha })
    if (!res.success) throw new Error(res.message)
    login(res.user, res.plano, res.assinatura)
  }

  async function loginSupabase(email: string, senha: string) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password: senha })
    if (error) {
      if (error.message.includes('Invalid login credentials') || error.message.includes('not found')) {
        try { return await loginLocal(email, senha) } catch {}
      }
      throw new Error(traduzirErro(error.message))
    }
    setSupabaseUser(data.user)
    await verificarStatusEHwid(data.user, email)
  }

  async function verificarStatusEHwid(user: any, email: string) {
    const { data: cliente } = await supabase
      .from('clientes_pendentes')
      .select('status')
      .eq('usuario_id', user.id)
      .single()

    if (cliente && cliente.status !== 'ativo') {
      setTela('aguardando')
      iniciarPolling(user)
      return
    }

    const hwid: string = await window.api.invoke('hwid:get')
    const pcNome: string = await window.api.invoke('hwid:pc-nome')

    const { data: licenca } = await supabase
      .from('licencas')
      .select('*')
      .eq('usuario_id', user.id)
      .single()

    if (!licenca) {
      await supabase.from('licencas').insert({ usuario_id: user.id, hwid, pc_nome: pcNome })
    } else if (licenca.hwid !== hwid) {
      setHwidConflito({ pc_nome: licenca.pc_nome, ultimo_acesso: licenca.ultimo_acesso })
      setTela('hwid-conflito')
      return
    } else {
      await supabase.from('licencas')
        .update({ ultimo_acesso: new Date().toISOString(), pc_nome: pcNome })
        .eq('usuario_id', user.id)
    }

    await finalizarLogin(email, user)
  }

  async function finalizarLogin(email: string, supaUser: any) {
    const nome = supaUser?.user_metadata?.nome || email.split('@')[0]
    const res = await window.api.invoke('auth:sync-supabase', { email, nome })
    if (!res.success) throw new Error(res.message || 'Erro ao sincronizar usuário local')

    let cargo = 'dono'
    let donoSupabaseId: string | undefined
    let planoCloud = 'individual'

    if (hasSupabase && supaUser?.id) {
      const [membroRes, assinaturaRes] = await Promise.all([
        supabase.from('membros_empresa').select('cargo, dono_id').eq('usuario_id', supaUser.id).eq('ativo', true).single(),
        supabase.from('assinaturas').select('plano').eq('usuario_id', supaUser.id).eq('status', 'ativa').single(),
      ])
      if (membroRes.data) {
        cargo = membroRes.data.cargo
        donoSupabaseId = membroRes.data.dono_id
      }
      if (assinaturaRes.data) planoCloud = assinaturaRes.data.plano
    }

    await window.api.invoke('session:save', { email, nome, ts: Date.now() })
    login(res.user, res.plano, res.assinatura, {
      supabaseUserId: supaUser?.id,
      cargo,
      donoSupabaseId,
      planoCloud,
    })
  }

  function iniciarPolling(user: any) {
    const interval = setInterval(async () => {
      const { data } = await supabase
        .from('clientes_pendentes')
        .select('status')
        .eq('usuario_id', user.id)
        .single()
      if (data?.status === 'ativo') {
        clearInterval(interval)
        await verificarStatusEHwid(user, user.email)
      }
    }, 30_000)
  }

  // ── Cadastro ───────────────────────────────────────────────────────────────
  async function handleCadastro(e: React.FormEvent) {
    e.preventDefault()
    setErro('')
    if (cadastroForm.senha !== cadastroForm.confirmar) { setErro('As senhas não conferem'); return }
    if (cadastroForm.senha.length < 6) { setErro('Senha deve ter pelo menos 6 caracteres'); return }
    setLoading(true)
    try {
      const { data, error } = await supabase.auth.signUp({
        email: cadastroForm.email,
        password: cadastroForm.senha,
        options: { data: { nome: cadastroForm.nome, telefone: cadastroForm.telefone, empresa: cadastroForm.empresa } }
      })
      if (error) throw new Error(traduzirErro(error.message))
      if (data.user?.id) {
        await supabase.from('clientes_pendentes').insert({
          usuario_id: data.user.id,
          nome: cadastroForm.nome,
          email: cadastroForm.email,
          telefone: cadastroForm.telefone,
          empresa: cadastroForm.empresa,
          status: 'aguardando',
        })
        supabase.functions.invoke('notificar-novo-cliente', {
          body: { nome: cadastroForm.nome, email: cadastroForm.email, telefone: cadastroForm.telefone, empresa: cadastroForm.empresa }
        }).catch(() => {})
        setSupabaseUser(data.user)
        iniciarPolling(data.user)
      }
      setTela('aguardando')
    } catch (err: any) {
      setErro(err.message)
    } finally {
      setLoading(false)
    }
  }

  // ── Esqueci senha ──────────────────────────────────────────────────────────
  async function handleEsqueci(e: React.FormEvent) {
    e.preventDefault()
    setErro('')
    setLoading(true)
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(esqueciEmail)
      if (error) throw new Error(traduzirErro(error.message))
      setTela('esqueci-enviado')
    } catch (err: any) {
      setErro(err.message)
    } finally {
      setLoading(false)
    }
  }

  // ── Transferir HWID ────────────────────────────────────────────────────────
  async function handleTransferirHwid() {
    if (!supabaseUser) return
    setLoading(true)
    setErro('')
    try {
      const hwid: string = await window.api.invoke('hwid:get')
      const pcNome: string = await window.api.invoke('hwid:pc-nome')
      await supabase.from('licencas')
        .update({ hwid, pc_nome: pcNome, ultimo_acesso: new Date().toISOString() })
        .eq('usuario_id', supabaseUser.id)
      setHwidConflito(null)
      await finalizarLogin(supabaseUser.email, supabaseUser)
    } catch (err: any) {
      setErro(err.message)
    } finally {
      setLoading(false)
    }
  }

  function traduzirErro(msg: string): string {
    if (msg.includes('Invalid login credentials')) return 'E-mail ou senha incorretos'
    if (msg.includes('Email not confirmed')) return 'Confirme seu e-mail antes de entrar'
    if (msg.includes('User already registered')) return 'Este e-mail já está cadastrado'
    if (msg.includes('Password should be')) return 'Senha muito curta (mínimo 6 caracteres)'
    if (msg.includes('Unable to validate') || msg.includes('fetch')) return 'Verifique sua conexão com a internet'
    return msg
  }

  const inp = (extra = '') =>
    `w-full px-4 py-3 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition text-sm ${extra}`

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-amber-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-amber-500 rounded-2xl shadow-xl mb-4">
            <Building2 size={32} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">Minha Obra</h1>
          <p className="text-slate-400 text-sm mt-1">Gestão de obras para engenheiros</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">

          {/* LOGIN */}
          {tela === 'login' && (
            <form onSubmit={handleLogin} className="p-8 space-y-5">
              <h2 className="text-xl font-bold text-slate-800">Entrar</h2>
              {erro && <Alerta>{erro}</Alerta>}

              <Campo label="E-mail">
                <div className="relative">
                  <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input type="email" required value={loginForm.email}
                    onChange={e => setLoginForm(f => ({ ...f, email: e.target.value }))}
                    className={inp('pl-10')} placeholder="seu@email.com" />
                </div>
              </Campo>

              <Campo label="Senha">
                <div className="relative">
                  <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input type={senhaVis ? 'text' : 'password'} required value={loginForm.senha}
                    onChange={e => setLoginForm(f => ({ ...f, senha: e.target.value }))}
                    className={inp('pl-10 pr-10')} placeholder="••••••••" />
                  <button type="button" tabIndex={-1}
                    onClick={() => setSenhaVis(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    {senhaVis ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </Campo>

              {hasSupabase && (
                <button type="button" onClick={() => { setErro(''); setTela('esqueci') }}
                  className="text-xs text-amber-600 hover:text-amber-700 font-medium">
                  Esqueci minha senha
                </button>
              )}

              <button type="submit" disabled={loading}
                className="w-full bg-amber-500 hover:bg-amber-600 disabled:opacity-60 text-white font-semibold py-3 rounded-xl transition shadow-md">
                {loading ? 'Entrando...' : 'Entrar'}
              </button>

              {hasSupabase && (
                <div className="space-y-2">
                  <p className="text-center text-sm text-slate-500">
                    Não tem conta?{' '}
                    <button type="button" onClick={() => { setErro(''); setTela('cadastro') }}
                      className="text-amber-600 hover:text-amber-700 font-semibold">
                      Solicitar acesso
                    </button>
                  </p>
                  <p className="text-center text-sm text-slate-500">
                    <button type="button"
                      onClick={() => navigate('/convite')}
                      className="inline-flex items-center gap-1.5 text-blue-600 hover:text-blue-700 font-medium">
                      <UserPlus size={14} /> Tenho um convite
                    </button>
                  </p>
                </div>
              )}
            </form>
          )}

          {/* CADASTRO */}
          {tela === 'cadastro' && (
            <form onSubmit={handleCadastro} className="p-8 space-y-4">
              <div>
                <h2 className="text-xl font-bold text-slate-800">Solicitar acesso</h2>
                <p className="text-sm text-slate-500 mt-1">Liberado em até 24h após análise.</p>
              </div>
              {erro && <Alerta>{erro}</Alerta>}

              <Campo label="Nome completo *">
                <div className="relative">
                  <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input required value={cadastroForm.nome}
                    onChange={e => setCadastroForm(f => ({ ...f, nome: e.target.value }))}
                    className={inp('pl-9')} placeholder="Seu nome completo" />
                </div>
              </Campo>

              <Campo label="E-mail *">
                <div className="relative">
                  <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input type="email" required value={cadastroForm.email}
                    onChange={e => setCadastroForm(f => ({ ...f, email: e.target.value }))}
                    className={inp('pl-9')} placeholder="seu@email.com" />
                </div>
              </Campo>

              <div className="grid grid-cols-2 gap-3">
                <Campo label="Senha *">
                  <div className="relative">
                    <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input type={senhaVis ? 'text' : 'password'} required value={cadastroForm.senha}
                      onChange={e => setCadastroForm(f => ({ ...f, senha: e.target.value }))}
                      className={inp('pl-9')} placeholder="••••••" />
                  </div>
                </Campo>
                <Campo label="Confirmar *">
                  <div className="relative">
                    <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input type={senhaVis ? 'text' : 'password'} required value={cadastroForm.confirmar}
                      onChange={e => setCadastroForm(f => ({ ...f, confirmar: e.target.value }))}
                      className={inp('pl-9')} placeholder="••••••" />
                  </div>
                </Campo>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Campo label="Telefone">
                  <div className="relative">
                    <Phone size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input value={cadastroForm.telefone}
                      onChange={e => setCadastroForm(f => ({ ...f, telefone: e.target.value }))}
                      className={inp('pl-9')} placeholder="(87) 9 9999-9999" />
                  </div>
                </Campo>
                <Campo label="Empresa">
                  <input value={cadastroForm.empresa}
                    onChange={e => setCadastroForm(f => ({ ...f, empresa: e.target.value }))}
                    className={inp()} placeholder="Nome da empresa" />
                </Campo>
              </div>

              <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer select-none"
                onClick={() => setSenhaVis(v => !v)}>
                {senhaVis ? <EyeOff size={14} /> : <Eye size={14} />}
                {senhaVis ? 'Ocultar' : 'Mostrar'} senhas
              </label>

              <button type="submit" disabled={loading}
                className="w-full bg-amber-500 hover:bg-amber-600 disabled:opacity-60 text-white font-semibold py-3 rounded-xl transition shadow-md">
                {loading ? 'Enviando...' : 'Solicitar acesso'}
              </button>

              <p className="text-center text-sm text-slate-500">
                Já tem conta?{' '}
                <button type="button" onClick={() => { setErro(''); setTela('login') }}
                  className="text-amber-600 hover:text-amber-700 font-semibold">
                  Entrar
                </button>
              </p>
            </form>
          )}

          {/* AGUARDANDO */}
          {tela === 'aguardando' && (
            <div className="p-8 text-center space-y-5">
              <div className="flex items-center justify-center w-16 h-16 mx-auto bg-amber-100 rounded-full">
                <Clock size={32} className="text-amber-500" />
              </div>
              <h2 className="text-xl font-bold text-slate-800">Aguardando aprovação</h2>
              <p className="text-sm text-slate-500 leading-relaxed">
                {configSistema.mensagem_espera || 'Seu acesso está sendo configurado. Em breve você receberá a confirmação.'}
              </p>
              <div className="flex items-center gap-2 justify-center bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-700">
                <RefreshCw size={14} className="animate-spin shrink-0" />
                Verificando automaticamente a cada 30 segundos...
              </div>
              {configSistema.whatsapp_suporte && (
                <a href={`https://wa.me/${configSistema.whatsapp_suporte}`}
                  target="_blank" rel="noreferrer"
                  className="inline-block text-sm text-green-600 hover:text-green-700 font-medium">
                  Falar no WhatsApp para agilizar →
                </a>
              )}
              <button type="button" onClick={() => { setTela('login'); setSupabaseUser(null) }}
                className="block mx-auto text-xs text-slate-400 hover:text-slate-600 mt-2">
                ← Voltar ao login
              </button>
            </div>
          )}

          {/* ESQUECI */}
          {tela === 'esqueci' && (
            <form onSubmit={handleEsqueci} className="p-8 space-y-5">
              <div>
                <h2 className="text-xl font-bold text-slate-800">Recuperar senha</h2>
                <p className="text-sm text-slate-500 mt-1">Enviaremos um link para seu e-mail.</p>
              </div>
              {erro && <Alerta>{erro}</Alerta>}
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input type="email" required value={esqueciEmail}
                  onChange={e => setEsqueciEmail(e.target.value)}
                  className={inp('pl-10')} placeholder="seu@email.com" />
              </div>
              <button type="submit" disabled={loading}
                className="w-full bg-amber-500 hover:bg-amber-600 disabled:opacity-60 text-white font-semibold py-3 rounded-xl transition">
                {loading ? 'Enviando...' : 'Enviar link de recuperação'}
              </button>
              <button type="button" onClick={() => setTela('login')}
                className="w-full text-sm text-slate-500 hover:text-slate-700">
                ← Voltar
              </button>
            </form>
          )}

          {/* ESQUECI ENVIADO */}
          {tela === 'esqueci-enviado' && (
            <div className="p-8 text-center space-y-4">
              <div className="flex items-center justify-center w-16 h-16 mx-auto bg-green-100 rounded-full">
                <CheckCircle size={32} className="text-green-500" />
              </div>
              <h2 className="text-xl font-bold text-slate-800">E-mail enviado!</h2>
              <p className="text-sm text-slate-500">
                Verifique sua caixa de entrada e siga as instruções para redefinir sua senha.
              </p>
              <button type="button" onClick={() => setTela('login')}
                className="w-full bg-amber-500 hover:bg-amber-600 text-white font-semibold py-3 rounded-xl transition">
                Voltar ao login
              </button>
            </div>
          )}

          {/* HWID CONFLITO */}
          {tela === 'hwid-conflito' && hwidConflito && (
            <div className="p-8 space-y-5">
              <div className="flex items-center justify-center w-16 h-16 mx-auto bg-red-100 rounded-full">
                <AlertCircle size={32} className="text-red-500" />
              </div>
              <h2 className="text-xl font-bold text-slate-800 text-center">Licença em outro computador</h2>
              <p className="text-sm text-slate-500 text-center">
                Sua licença está registrada em outro PC. Você pode transferir o acesso para este computador.
              </p>
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">PC registrado:</span>
                  <span className="font-medium">{hwidConflito.pc_nome || 'Desconhecido'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Último acesso:</span>
                  <span className="font-medium">
                    {hwidConflito.ultimo_acesso
                      ? new Date(hwidConflito.ultimo_acesso).toLocaleString('pt-BR')
                      : '—'}
                  </span>
                </div>
              </div>
              {erro && <Alerta>{erro}</Alerta>}
              <button type="button" onClick={handleTransferirHwid} disabled={loading}
                className="w-full bg-red-500 hover:bg-red-600 disabled:opacity-60 text-white font-semibold py-3 rounded-xl transition">
                {loading ? 'Transferindo...' : 'Transferir licença para este PC'}
              </button>
              <p className="text-xs text-slate-400 text-center">
                O acesso no outro computador será desativado imediatamente.
              </p>
              <button type="button"
                onClick={() => { setTela('login'); setSupabaseUser(null); setHwidConflito(null) }}
                className="w-full text-sm text-slate-500 hover:text-slate-700">
                ← Cancelar
              </button>
            </div>
          )}
        </div>

        <p className="text-center text-xs text-slate-500 mt-6">
          Minha Obra © {new Date().getFullYear()} — Todos os direitos reservados
        </p>
      </div>
    </div>
  )
}

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-slate-600 uppercase tracking-wide">{label}</label>
      {children}
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
