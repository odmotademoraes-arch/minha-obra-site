'use strict'

const { Notification, ipcMain } = require('electron')
const path = require('path')

function enviarNotificacao(titulo, corpo, urgente = false) {
  if (!Notification.isSupported()) return
  new Notification({
    title: `Minha Obra — ${titulo}`,
    body: corpo,
    icon: path.join(__dirname, '..', 'resources', 'icon.png'),
  }).show()
}

// Verificar alertas com dados vindos do renderer (via Supabase no front)
function setupAlertasIpc() {
  ipcMain.handle('alertas:notificar', (_e, { titulo, corpo, urgente }) => {
    enviarNotificacao(titulo, corpo, urgente)
    return { ok: true }
  })
}

// Verificação periódica usando DB local (better-sqlite3)
function iniciarVerificacaoPeriodica(getDb) {
  const INTERVALO = 60 * 60 * 1000 // 1 hora

  function verificar() {
    try {
      const db  = getDb()
      const hoje = new Date().toISOString().split('T')[0]

      // Exames médicos (ASO) vencendo em até 30 dias
      const vencendo30 = new Date()
      vencendo30.setDate(vencendo30.getDate() + 30)
      const limite30 = vencendo30.toISOString().split('T')[0]

      let exames = []
      try {
        exames = db.prepare(`
          SELECT e.tipo, e.data_validade, f.nome
          FROM exames_medicos e
          JOIN funcionarios f ON e.funcionario_id = f.id
          WHERE e.data_validade BETWEEN ? AND ?
        `).all(hoje, limite30)
      } catch {}

      exames.forEach(e => {
        const dias = Math.ceil(
          (new Date(e.data_validade).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
        )
        const urgente = dias <= 5
        enviarNotificacao(
          urgente ? 'ASO Vencendo!' : 'ASO Próximo do Vencimento',
          `${e.nome} — ${e.tipo} vence em ${dias} dia${dias !== 1 ? 's' : ''}`,
          urgente
        )
      })

      // Obras com data prevista ultrapassada
      let atrasadas = []
      try {
        atrasadas = db.prepare(`
          SELECT nome FROM obras
          WHERE status = 'andamento' AND data_prevista < ?
        `).all(hoje)
      } catch {}

      atrasadas.forEach(o => {
        enviarNotificacao('Obra Atrasada!', `${o.nome} — prazo previsto ultrapassado`, true)
      })

      // Materiais abaixo do estoque mínimo
      let criticos = []
      try {
        criticos = db.prepare(`
          SELECT nome, estoque_atual, estoque_minimo FROM materiais_estoque
          WHERE estoque_atual <= estoque_minimo AND estoque_minimo > 0
          LIMIT 5
        `).all()
      } catch {}

      if (criticos.length > 0) {
        enviarNotificacao(
          'Estoque Crítico',
          `${criticos.length} material(is) abaixo do mínimo: ${criticos.map(m => m.nome).join(', ')}`,
          false
        )
      }
    } catch (err) {
      console.error('[alertas] Erro na verificação periódica:', err.message)
    }
  }

  // Primeira verificação após 5 minutos do início
  setTimeout(verificar, 5 * 60 * 1000)
  // Depois a cada hora
  setInterval(verificar, INTERVALO)
}

module.exports = { setupAlertasIpc, iniciarVerificacaoPeriodica, enviarNotificacao }
