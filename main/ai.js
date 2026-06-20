'use strict'

const { ipcMain } = require('electron')
const { getDb } = require('./database')
const Anthropic = require('@anthropic-ai/sdk')

function setupAIHandlers() {
  const db = getDb()

  function verificarPlanoPlus(usuarioId) {
    const assinatura = db.prepare(`
      SELECT a.*, p.nome as plano_nome FROM assinaturas a
      JOIN planos p ON a.plano_id = p.id
      WHERE a.usuario_id = ? AND a.status = 'ativa'
      ORDER BY a.created_at DESC LIMIT 1
    `).get(usuarioId)
    if (!assinatura || assinatura.plano_nome !== 'PLUS') return false
    if (assinatura.data_vencimento) {
      const hoje = new Date().toISOString().split('T')[0]
      if (assinatura.data_vencimento < hoje) return false
    }
    return true
  }

  ipcMain.handle('ai:analisar-epi', async (_e, { apiKey, imageBase64, imageMime, observacoes, usuarioId }) => {
    if (usuarioId && !verificarPlanoPlus(usuarioId)) {
      return { error: 'PLANO_INSUFICIENTE', message: 'Esta funcionalidade é exclusiva do plano PLUS.' }
    }

    const client = new Anthropic({ apiKey })
    const EPI_TIPOS = ['Capacete', 'Colete Refletivo', 'Bota de Segurança', 'Luvas de Proteção', 'Óculos de Proteção', 'Máscara / Respirador', 'Cinto de Segurança']

    const msg = await client.messages.create({
      model: 'claude-opus-4-8',
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: imageMime, data: imageBase64 } },
          {
            type: 'text',
            text: `Você é um sistema de análise de segurança de canteiros de obras. Analise esta imagem e identifique todos os trabalhadores visíveis e os EPIs que estão usando.

Para cada trabalhador visível, retorne um JSON com:
- trabalhador: identificação (ex: "Trabalhador 1")
- epis_detectados: lista dos EPIs visíveis {tipo, presente: true/false, observacao}
- status: "CONFORME" (todos EPIs críticos presentes), "ATENÇÃO" (1-2 EPIs ausentes) ou "NÃO CONFORME" (EPIs críticos ausentes)

EPIs a verificar: ${EPI_TIPOS.join(', ')}
${observacoes ? `\nContexto: ${observacoes}` : ''}

Responda APENAS com JSON válido:
{"trabalhadores": [{...}], "resumo": "string", "status_geral": "CONFORME|ATENÇÃO|NÃO CONFORME"}`
          }
        ]
      }]
    })

    const text = msg.content[0].text
    return JSON.parse(text.match(/\{[\s\S]*\}/)?.[0] || text)
  })

  ipcMain.handle('ai:estimar-materiais', async (_e, { apiKey, imageBase64, imageMime, dados, usuarioId }) => {
    if (usuarioId && !verificarPlanoPlus(usuarioId)) {
      return { error: 'PLANO_INSUFICIENTE', message: 'Esta funcionalidade é exclusiva do plano PLUS.' }
    }

    const client = new Anthropic({ apiKey })
    const area = (parseFloat(dados.largura) * parseFloat(dados.altura)) || 0

    const msg = await client.messages.create({
      model: 'claude-opus-4-8',
      max_tokens: 2048,
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: imageMime, data: imageBase64 } },
          {
            type: 'text',
            text: `Você é um engenheiro civil especialista em orçamentos. Analise esta imagem de ${dados.tipo_elemento}.

Informações:
- Tipo: ${dados.tipo_elemento}
- Largura: ${dados.largura}m | Altura: ${dados.altura}m | Área: ${area.toFixed(2)}m²
- Espessura: ${dados.espessura || 'não informada'}
- Finalidade: ${dados.finalidade}
${dados.observacoes ? `- Obs: ${dados.observacoes}` : ''}

Forneça estimativa completa. Responda em JSON:
{
  "elemento": "string",
  "material_identificado": "string",
  "estado": "novo|bom|regular|ruim",
  "area_total": ${area.toFixed(2)},
  "materiais": [{"nome": "", "quantidade": 0, "unidade": "", "observacao": ""}],
  "custo_minimo": 0,
  "custo_maximo": 0,
  "observacoes": "string"
}`
          }
        ]
      }]
    })

    const text = msg.content[0].text
    return JSON.parse(text.match(/\{[\s\S]*\}/)?.[0] || text)
  })
}

module.exports = { setupAIHandlers }
