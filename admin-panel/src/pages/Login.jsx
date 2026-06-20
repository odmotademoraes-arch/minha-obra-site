import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff, HardHat, Mail, Lock, AlertCircle, Loader2 } from 'lucide-react'
import { useAuth } from '../components/AuthContext'

export default function Login() {
  const { signIn, error, setError } = useAuth()
  const navigate = useNavigate()
  const [email,    setEmail]    = useState('')
  const [senha,    setSenha]    = useState('')
  const [mostrar,  setMostrar]  = useState(false)
  const [loading,  setLoading]  = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    const ok = await signIn(email, senha)
    setLoading(false)
    if (ok) navigate('/')
  }

  return (
    <div className="min-h-screen bg-[#1E3A5F] flex items-center justify-center px-4 relative overflow-hidden">
      {/* Círculos decorativos */}
      <div className="absolute top-[-80px] right-[-80px] w-80 h-80 rounded-full bg-white/5 pointer-events-none" />
      <div className="absolute bottom-[-60px] left-[-60px] w-64 h-64 rounded-full bg-[#F97316]/10 pointer-events-none" />
      <div className="absolute top-1/3 left-[-40px] w-40 h-40 rounded-full bg-white/5 pointer-events-none" />

      <div className="w-full max-w-md">
        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          {/* Logo */}
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-[#1E3A5F] flex items-center justify-center mb-4 shadow-lg">
              <HardHat size={32} className="text-[#F97316]" />
            </div>
            <h1 className="font-titulo italic text-[#1E3A5F] text-2xl tracking-wide">MINHA OBRA</h1>
            <p className="text-gray-400 text-sm mt-1">Painel Administrativo</p>
          </div>

          {/* Erro */}
          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3 mb-6">
              <AlertCircle size={16} className="flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* E-mail */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">E-mail</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={e => { setEmail(e.target.value); setError('') }}
                  placeholder="admin@exemplo.com"
                  required
                  className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/30 focus:border-[#1E3A5F] transition"
                />
              </div>
            </div>

            {/* Senha */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Senha</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type={mostrar ? 'text' : 'password'}
                  value={senha}
                  onChange={e => { setSenha(e.target.value); setError('') }}
                  placeholder="••••••••"
                  required
                  className="w-full pl-9 pr-10 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/30 focus:border-[#1E3A5F] transition"
                />
                <button type="button" onClick={() => setMostrar(!mostrar)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {mostrar ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-[#1E3A5F] hover:bg-[#163050] text-white font-semibold py-3 rounded-xl transition-colors disabled:opacity-60">
              {loading ? <Loader2 size={18} className="animate-spin" /> : null}
              {loading ? 'Entrando...' : 'Entrar no painel'}
            </button>
          </form>
        </div>

        <p className="text-center text-white/40 text-xs mt-6">
          © {new Date().getFullYear()} Minha Obra — Tecnologia para quem constrói
        </p>
      </div>
    </div>
  )
}
