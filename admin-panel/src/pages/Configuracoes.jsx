import React, { useEffect, useState } from 'react'
import { Save, CheckCircle, Loader2 } from 'lucide-react'
import { supabase } from '../lib/supabase'

const CAMPOS = [
  { chave: 'whatsapp_suporte',  label: 'WhatsApp de Suporte',         tipo: 'text',  desc: 'Exibido na tela de espera dos clientes' },
  { chave: 'mensagem_espera',   label: 'Mensagem da Tela de Espera',  tipo: 'textarea', desc: 'Texto exibido enquanto aguarda ativação' },
  { chave: 'email_dono',        label: 'E-mail que recebe notificações', tipo: 'email', desc: 'Endereço admin que recebe alertas' },
  { chave: 'email_remetente',   label: 'E-mail Remetente',            tipo: 'email', desc: 'E-mail usado nos envios automáticos' },
  { chave: 'nome_sistema',      label: 'Nome do Sistema',             tipo: 'text',  desc: '' },
  { chave: 'versao',            label: 'Versão Atual',                tipo: 'text',  desc: '' },
]

export default function Configuracoes() {
  const [cfg,     setCfg]     = useState({})
  const [loading, setLoading] = useState(true)
  const [saving,  setSaving]  = useState(false)
  const [toast,   setToast]   = useState(false)

  useEffect(() => {
    supabase.from('config_sistema').select('*').then(({ data }) => {
      if (data) setCfg(Object.fromEntries(data.map(r => [r.chave, r.valor])))
      setLoading(false)
    })
  }, [])

  async function salvar(e) {
    e.preventDefault()
    setSaving(true)
    await Promise.all(
      CAMPOS.map(c =>
        supabase.from('config_sistema').upsert({ chave: c.chave, valor: cfg[c.chave] ?? '' })
      )
    )
    setSaving(false)
    setToast(true)
    setTimeout(() => setToast(false), 3000)
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="font-titulo italic text-[#1E3A5F] text-2xl">Configurações</h1>
        <p className="text-gray-400 text-sm mt-0.5">Parâmetros globais do sistema</p>
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2 bg-green-600 text-white text-sm font-medium px-4 py-3 rounded-xl shadow-lg">
          <CheckCircle size={16} /> Configurações salvas!
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20 text-gray-400">
          <Loader2 size={20} className="animate-spin mr-2" /> Carregando...
        </div>
      ) : (
        <form onSubmit={salvar} className="bg-white rounded-2xl shadow-sm border border-gray-100 divide-y divide-gray-100">
          {CAMPOS.map(c => (
            <div key={c.chave} className="p-5">
              <label className="block text-sm font-medium text-[#1F2937] mb-1">{c.label}</label>
              {c.desc && <p className="text-xs text-gray-400 mb-2">{c.desc}</p>}
              {c.tipo === 'textarea' ? (
                <textarea
                  rows={3}
                  value={cfg[c.chave] ?? ''}
                  onChange={e => setCfg({ ...cfg, [c.chave]: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/30 resize-none"
                />
              ) : (
                <input
                  type={c.tipo}
                  value={cfg[c.chave] ?? ''}
                  onChange={e => setCfg({ ...cfg, [c.chave]: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/30"
                />
              )}
            </div>
          ))}
          <div className="p-5">
            <button type="submit" disabled={saving}
              className="flex items-center gap-2 px-6 py-2.5 bg-[#1E3A5F] hover:bg-[#163050] text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-60">
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              {saving ? 'Salvando...' : 'Salvar Configurações'}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
