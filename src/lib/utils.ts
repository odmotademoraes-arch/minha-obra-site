export function formatCurrency(value: number | null | undefined): string {
  if (value == null) return 'R$ 0,00'
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('pt-BR')
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (isNaN(d.getTime())) return '—'
  return d.toLocaleString('pt-BR')
}

export function statusLabel(status: string): string {
  const map: Record<string, string> = {
    planejamento: 'Planejamento', em_andamento: 'Em Andamento',
    pausada: 'Pausada', concluida: 'Concluída',
    ativo: 'Ativo', afastado: 'Afastado', desligado: 'Desligado'
  }
  return map[status] || status
}

export function statusVariant(status: string): 'default' | 'success' | 'warning' | 'danger' | 'info' | 'primary' {
  const map: Record<string, any> = {
    planejamento: 'info', em_andamento: 'success', pausada: 'warning', concluida: 'default',
    ativo: 'success', afastado: 'warning', desligado: 'danger'
  }
  return map[status] || 'default'
}

export function diasRestantes(dataStr: string | null | undefined): number | null {
  if (!dataStr) return null
  return Math.ceil((new Date(dataStr).getTime() - Date.now()) / 864e5)
}

export function diasRestantesLabel(dataStr: string | null | undefined): string {
  const dias = diasRestantes(dataStr)
  if (dias === null) return '—'
  if (dias < 0) return `Vencido há ${Math.abs(dias)} dias`
  if (dias === 0) return 'Vence hoje'
  return `${dias} dias restantes`
}

export function today(): string {
  return new Date().toISOString().split('T')[0]
}

export function mesAtual(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export function calcHoras(entrada: string, saida: string): number {
  if (!entrada || !saida) return 0
  const [eh, em] = entrada.split(':').map(Number)
  const [sh, sm] = saida.split(':').map(Number)
  return Math.max(0, ((sh * 60 + sm) - (eh * 60 + em)) / 60)
}
