import React, { useEffect, useState } from 'react'
import { Clock, CalendarCheck } from 'lucide-react'
import { useApp } from '../store/AppContext'
import { PageHeader } from '../components/layout/Layout'
import { Card } from '../components/ui/Card'
import { Select } from '../components/ui/Input'

const ENTRADA_PADRAO = '07:00'
const SAIDA_PADRAO = '17:00'
const INTERVALO_MIN = 60 // 1h almoço

function calcHoras(entrada: string, saida: string): number {
  if (!entrada || !saida) return 0
  const [eh, em] = entrada.split(':').map(Number)
  const [sh, sm] = saida.split(':').map(Number)
  const mins = (sh * 60 + sm) - (eh * 60 + em) - INTERVALO_MIN
  return Math.max(0, mins / 60)
}

export function Ponto() {
  const { invoke } = useApp()
  const [funcionarios, setFuncionarios] = useState<any[]>([])
  const [obras, setObras] = useState<any[]>([])
  const [pontos, setPontos] = useState<any[]>([])
  const [obraId, setObraId] = useState<string>('')
  const [mes, setMes] = useState<string>(new Date().toISOString().slice(0, 7))
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    invoke('obras:list').then(setObras)
    invoke('funcionarios:list').then(setFuncionarios)
  }, [])

  useEffect(() => { if (obraId) loadPontos() }, [obraId, mes])

  async function loadPontos() {
    setPontos(await invoke('ponto:list', { obra_id: parseInt(obraId), mes }))
  }

  function getPonto(funcId: number, data: string) {
    return pontos.find(p => p.funcionario_id === funcId && p.data === data)
  }

  async function handleCellChange(func: any, data: string, field: 'entrada' | 'saida', value: string) {
    const ponto = getPonto(func.id, data)
    const entrada = field === 'entrada' ? value : (ponto?.entrada || '')
    const saida = field === 'saida' ? value : (ponto?.saida || '')
    const horas = calcHoras(entrada, saida)
    const jornadaDiaria = func.horas_diarias ?? 8
    const horas_extras = Math.max(0, horas - jornadaDiaria)
    await invoke('ponto:registrar', {
      funcionario_id: func.id,
      obra_id: parseInt(obraId),
      data,
      entrada,
      saida,
      horas_trabalhadas: horas,
      horas_extras,
    })
    loadPontos()
  }

  async function handlePreencherPadrao() {
    if (!obraId || funcsAtivos.length === 0) return
    setLoading(true)
    for (const f of funcsAtivos) {
      const jornadaDiaria = f.horas_diarias ?? 8
      for (const data of diasDoMes) {
        const dow = new Date(data + 'T12:00:00').getDay()
        if (dow === 0 || dow === 6) continue
        if (!getPonto(f.id, data)) {
          const horas = calcHoras(ENTRADA_PADRAO, SAIDA_PADRAO)
          await invoke('ponto:registrar', {
            funcionario_id: f.id,
            obra_id: parseInt(obraId),
            data,
            entrada: ENTRADA_PADRAO,
            saida: SAIDA_PADRAO,
            horas_trabalhadas: horas,
            horas_extras: Math.max(0, horas - jornadaDiaria),
          })
        }
      }
    }
    await loadPontos()
    setLoading(false)
  }

  const diasDoMes = (() => {
    const [y, m] = mes.split('-').map(Number)
    const tot = new Date(y, m, 0).getDate()
    return Array.from({ length: tot }, (_, i) => `${mes}-${String(i + 1).padStart(2, '0')}`)
  })()

  const funcsAtivos = obraId ? funcionarios.filter(f => f.status === 'ativo') : []

  return (
    <div>
      <PageHeader title="Controle de Ponto" subtitle="Horas normais · horas extras por funcionário"
        actions={
          <div className="flex items-center gap-3">
            {obraId && (
              <button onClick={handlePreencherPadrao} disabled={loading}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-[#E85D04] text-white rounded-lg hover:bg-[#c94d02] disabled:opacity-50 transition-colors">
                <CalendarCheck size={13} />
                {loading ? 'Preenchendo...' : 'Preencher dias úteis (07:00–17:00)'}
              </button>
            )}
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <Clock size={13} /> Auto-save
            </div>
          </div>
        } />

      <div className="p-6">
        <div className="flex gap-4 mb-6 flex-wrap">
          <Select label="Obra" value={obraId} onChange={e => setObraId(e.target.value)}
            options={[{ value: '', label: 'Selecione uma obra...' }, ...obras.map(o => ({ value: String(o.id), label: o.nome }))]} />
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Mês</label>
            <input type="month" value={mes} onChange={e => setMes(e.target.value)}
              className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:border-[#E85D04] outline-none bg-white" />
          </div>
        </div>

        {!obraId && <p className="text-sm text-gray-400 text-center py-8">Selecione uma obra para ver o ponto.</p>}

        {obraId && (
          <Card>
            {/* Legenda */}
            <div className="flex gap-4 mb-3 text-xs text-gray-500">
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-orange-100 inline-block" /> Hora extra</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-50 inline-block" /> Fim de semana</span>
            </div>
            <div className="overflow-x-auto">
              <table className="text-xs w-full border-separate border-spacing-0">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="text-left px-3 py-2 font-semibold text-gray-600 sticky left-0 bg-gray-50 min-w-[150px] border-b border-gray-200">
                      Funcionário
                    </th>
                    {diasDoMes.map(d => {
                      const dow = new Date(d + 'T00:00:00').getDay()
                      const fim = dow === 0 || dow === 6
                      return (
                        <th key={d} className={`px-1 py-2 text-center font-medium border-b border-gray-200 min-w-[60px] ${fim ? 'text-red-400 bg-red-50' : 'text-gray-500'}`}>
                          {d.slice(8)}<br />{['D','S','T','Q','Q','S','S'][dow]}
                        </th>
                      )
                    })}
                    <th className="px-2 py-2 text-center font-semibold text-gray-600 border-b border-gray-200 bg-gray-50 min-w-[55px]">Normal</th>
                    <th className="px-2 py-2 text-center font-semibold text-orange-600 border-b border-gray-200 bg-orange-50 min-w-[55px]">HExtra</th>
                  </tr>
                </thead>
                <tbody>
                  {funcsAtivos.map(f => {
                    const jornadaDiaria = f.horas_diarias ?? 8
                    let totalNormal = 0
                    let totalExtra = 0
                    const cells = diasDoMes.map(d => {
                      const dow = new Date(d + 'T00:00:00').getDay()
                      const fim = dow === 0 || dow === 6
                      const p = getPonto(f.id, d)
                      const h = calcHoras(p?.entrada || '', p?.saida || '')
                      const extra = Math.max(0, h - jornadaDiaria)
                      const normal = h - extra
                      totalNormal += normal
                      totalExtra += extra
                      const temExtra = extra > 0
                      return { d, fim, p, extra: temExtra }
                    })

                    return (
                      <tr key={f.id} className="border-t border-gray-100 hover:bg-gray-50/50">
                        <td className="px-3 py-1 sticky left-0 bg-white border-r border-gray-100">
                          <div className="font-medium text-[#1A1A2E] truncate max-w-[140px]">{f.nome}</div>
                          <div className="text-[10px] text-gray-400">{jornadaDiaria}h/dia · {f.hora_extra_percentual ?? 50}% HE</div>
                        </td>
                        {cells.map(({ d, fim, p, extra: temExtra }) => (
                          <td key={d} className={`px-0.5 py-1 ${fim ? 'bg-red-50' : temExtra ? 'bg-orange-50' : ''}`}>
                            <div className="flex flex-col gap-0.5">
                              <input type="time" defaultValue={p?.entrada || ''}
                                onBlur={ev => handleCellChange(f, d, 'entrada', ev.target.value)}
                                className={`w-[58px] text-[10px] border rounded px-1 py-0.5 outline-none focus:border-[#E85D04] ${temExtra ? 'border-orange-300' : 'border-gray-200'}`} />
                              <input type="time" defaultValue={p?.saida || ''}
                                onBlur={ev => handleCellChange(f, d, 'saida', ev.target.value)}
                                className={`w-[58px] text-[10px] border rounded px-1 py-0.5 outline-none focus:border-[#E85D04] ${temExtra ? 'border-orange-300' : 'border-gray-200'}`} />
                            </div>
                          </td>
                        ))}
                        <td className="px-2 py-1 text-center font-bold text-[#1A1A2E]">{totalNormal.toFixed(1)}</td>
                        <td className={`px-2 py-1 text-center font-bold ${totalExtra > 0 ? 'text-orange-600 bg-orange-50' : 'text-gray-300'}`}>
                          {totalExtra > 0 ? totalExtra.toFixed(1) : '—'}
                        </td>
                      </tr>
                    )
                  })}
                  {funcsAtivos.length === 0 && (
                    <tr>
                      <td colSpan={diasDoMes.length + 3} className="py-8 text-center text-gray-400">
                        Nenhum funcionário ativo.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>
    </div>
  )
}
