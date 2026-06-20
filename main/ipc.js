'use strict'

const { ipcMain, dialog, app } = require('electron')
const { getDb, getMateriaisPadrao } = require('./database')
const path = require('path')
const fs = require('fs')
const crypto = require('crypto')

function hashSenha(senha) {
  return crypto.createHash('sha256').update(senha + 'minha-obra-salt').digest('hex')
}

function getPlanoUsuario(db, usuarioId) {
  const assinatura = db.prepare(`
    SELECT a.*, p.nome as plano_nome FROM assinaturas a
    JOIN planos p ON a.plano_id = p.id
    WHERE a.usuario_id = ? AND a.status = 'ativa'
    ORDER BY a.created_at DESC LIMIT 1
  `).get(usuarioId)

  if (!assinatura) return { plano: 'FREE', assinatura: null }

  // Verifica vencimento
  if (assinatura.data_vencimento) {
    const hoje = new Date().toISOString().split('T')[0]
    if (assinatura.data_vencimento < hoje) {
      db.prepare(`UPDATE assinaturas SET status = 'vencida' WHERE id = ?`).run(assinatura.id)
      return { plano: 'FREE', assinatura: { ...assinatura, status: 'vencida' } }
    }
  }

  return { plano: assinatura.plano_nome, assinatura }
}

function setupIpcHandlers() {
  const db = getDb()

  // ── Auth ──────────────────────────────────────────────────────────────────
  ipcMain.handle('auth:login', (_e, { email, senha }) => {
    const hash = hashSenha(senha)
    const user = db.prepare('SELECT * FROM usuarios WHERE email = ? AND ativo = 1').get(email)
    if (!user) return { success: false, message: 'Usuário não encontrado' }
    if (user.senha_hash && user.senha_hash !== hash)
      return { success: false, message: 'Senha incorreta' }
    const { senha_hash, ...safeUser } = user

    // Garante assinatura FREE para usuário sem assinatura
    const temAssinatura = db.prepare(`SELECT id FROM assinaturas WHERE usuario_id = ?`).get(user.id)
    if (!temAssinatura) {
      const planoFree = db.prepare(`SELECT id FROM planos WHERE nome = 'FREE'`).get()
      if (planoFree) db.prepare(`INSERT INTO assinaturas (usuario_id, plano_id, status) VALUES (?, ?, 'ativa')`).run(user.id, planoFree.id)
    }

    const { plano, assinatura } = getPlanoUsuario(db, user.id)
    return { success: true, user: safeUser, plano, assinatura }
  })

  ipcMain.handle('auth:set-senha', (_e, { id, senha }) => {
    db.prepare('UPDATE usuarios SET senha_hash = ? WHERE id = ?').run(hashSenha(senha), id)
    return { success: true }
  })

  ipcMain.handle('auth:list-users', () => {
    return db.prepare('SELECT id, nome, email, perfil, ativo FROM usuarios ORDER BY nome').all()
  })

  ipcMain.handle('auth:create-user', (_e, data) => {
    const r = db.prepare(`
      INSERT INTO usuarios (nome, email, senha_hash, perfil, ativo)
      VALUES (?, ?, ?, ?, 1)
    `).run(data.nome, data.email, hashSenha(data.senha || '123456'), data.perfil)
    const userId = Number(r.lastInsertRowid)
    const planoFree = db.prepare(`SELECT id FROM planos WHERE nome = 'FREE'`).get()
    if (planoFree) db.prepare(`INSERT INTO assinaturas (usuario_id, plano_id, status) VALUES (?, ?, 'ativa')`).run(userId, planoFree.id)
    return { id: userId }
  })

  ipcMain.handle('auth:update-user', (_e, { id, ...data }) => {
    const allowed = ['nome', 'email', 'perfil', 'ativo']
    const fields = Object.keys(data).filter(k => allowed.includes(k)).map(k => `${k} = ?`).join(', ')
    const values = Object.keys(data).filter(k => allowed.includes(k)).map(k => data[k])
    if (fields) db.prepare(`UPDATE usuarios SET ${fields} WHERE id = ?`).run(...values, id)
    if (data.senha) db.prepare('UPDATE usuarios SET senha_hash = ? WHERE id = ?').run(hashSenha(data.senha), id)
    return { success: true }
  })

  // ── Planos / Assinaturas ──────────────────────────────────────────────────
  ipcMain.handle('planos:list', () => {
    return db.prepare('SELECT * FROM planos WHERE ativo = 1 ORDER BY preco_mensal').all()
  })

  ipcMain.handle('assinaturas:get-plano', (_e, usuarioId) => {
    return getPlanoUsuario(db, usuarioId)
  })

  ipcMain.handle('assinaturas:ativar-plus', (_e, usuarioId) => {
    const planoPlus = db.prepare(`SELECT id FROM planos WHERE nome = 'PLUS'`).get()
    if (!planoPlus) return { success: false, message: 'Plano PLUS não encontrado' }

    const dataVencimento = new Date()
    dataVencimento.setDate(dataVencimento.getDate() + 30)
    const vencimento = dataVencimento.toISOString().split('T')[0]

    // Cancela assinatura ativa anterior
    db.prepare(`UPDATE assinaturas SET status = 'cancelada' WHERE usuario_id = ? AND status = 'ativa'`).run(usuarioId)

    db.prepare(`
      INSERT INTO assinaturas (usuario_id, plano_id, data_inicio, data_vencimento, status)
      VALUES (?, ?, date('now'), ?, 'ativa')
    `).run(usuarioId, planoPlus.id, vencimento)

    return { success: true, plano: 'PLUS', data_vencimento: vencimento }
  })

  ipcMain.handle('assinaturas:cancelar', (_e, usuarioId) => {
    const planoFree = db.prepare(`SELECT id FROM planos WHERE nome = 'FREE'`).get()
    db.prepare(`UPDATE assinaturas SET status = 'cancelada' WHERE usuario_id = ? AND status = 'ativa'`).run(usuarioId)
    if (planoFree) db.prepare(`INSERT INTO assinaturas (usuario_id, plano_id, status) VALUES (?, ?, 'ativa')`).run(usuarioId, planoFree.id)
    return { success: true }
  })

  // ── Obras ─────────────────────────────────────────────────────────────────
  ipcMain.handle('obras:list', () => {
    return db.prepare(`
      SELECT o.*, u.nome as engenheiro_nome
      FROM obras o LEFT JOIN usuarios u ON o.engenheiro_id = u.id
      ORDER BY o.updated_at DESC
    `).all()
  })

  ipcMain.handle('obras:get', (_e, id) => {
    return db.prepare('SELECT * FROM obras WHERE id = ?').get(id)
  })

  ipcMain.handle('obras:create', (_e, data) => {
    const r = db.prepare(`
      INSERT INTO obras (nome, endereco, cidade, estado, cep, engenheiro_id, status,
        orcamento_planejado, data_inicio, data_prevista, area_m2, descricao)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      data.nome, data.endereco, data.cidade, data.estado, data.cep,
      data.engenheiro_id, data.status || 'planejamento',
      data.orcamento_planejado || 0, data.data_inicio, data.data_prevista,
      data.area_m2, data.descricao
    )
    const obraId = Number(r.lastInsertRowid)
    const etapas = ['Fundação','Estrutura','Alvenaria','Cobertura','Elétrica','Hidráulica','Revestimento','Pintura','Acabamento']
    etapas.forEach((nome, i) => {
      db.prepare('INSERT INTO cronograma_etapas (obra_id, nome, ordem) VALUES (?, ?, ?)').run(obraId, nome, i)
    })
    // Materiais padrão
    const insertMat = db.prepare(`INSERT INTO materiais_estoque (obra_id, nome, codigo, unidade, estoque_minimo, preco_unitario) VALUES (?, ?, ?, ?, ?, ?)`)
    getMateriaisPadrao(obraId).forEach(m => insertMat.run(m.obra_id, m.nome, m.codigo, m.unidade, m.estoque_minimo, m.preco_unitario))
    return { id: obraId }
  })

  ipcMain.handle('obras:update', (_e, { id, ...data }) => {
    const allowed = ['nome','endereco','cidade','estado','cep','engenheiro_id','status','progresso',
      'orcamento_planejado','data_inicio','data_prevista','data_conclusao','area_m2','descricao']
    const fields = Object.keys(data).filter(k => allowed.includes(k)).map(k => `${k} = ?`).join(', ')
    const values = Object.keys(data).filter(k => allowed.includes(k)).map(k => data[k])
    if (fields) db.prepare(`UPDATE obras SET ${fields}, updated_at = datetime('now') WHERE id = ?`).run(...values, id)
    return { success: true }
  })

  ipcMain.handle('obras:delete', (_e, id) => {
    db.prepare('DELETE FROM obras WHERE id = ?').run(id)
    return { success: true }
  })

  // ── Funcionários ──────────────────────────────────────────────────────────
  ipcMain.handle('funcionarios:list', () => {
    return db.prepare('SELECT * FROM funcionarios ORDER BY nome').all()
  })

  ipcMain.handle('funcionarios:get', (_e, id) => {
    const f = db.prepare('SELECT * FROM funcionarios WHERE id = ?').get(id)
    if (!f) return null
    f.alocacoes = db.prepare(`
      SELECT a.*, o.nome as obra_nome FROM alocacoes a
      JOIN obras o ON a.obra_id = o.id WHERE a.funcionario_id = ?
    `).all(id)
    f.exames = db.prepare('SELECT * FROM exames_medicos WHERE funcionario_id = ? ORDER BY data_realizacao DESC').all(id)
    f.epis = db.prepare(`
      SELECT ee.*, e.nome as epi_nome FROM entregas_epi ee
      JOIN epis e ON ee.epi_id = e.id WHERE ee.funcionario_id = ?
    `).all(id)
    f.treinamentos = db.prepare('SELECT * FROM treinamentos WHERE funcionario_id = ? ORDER BY data_realizacao DESC').all(id)
    return f
  })

  ipcMain.handle('funcionarios:create', (_e, data) => {
    const r = db.prepare(`
      INSERT INTO funcionarios (nome, cpf, rg, data_nascimento, tipo_sanguineo, cargo, categoria,
        matricula, email, celular, contato_emergencia_nome, contato_emergencia_tel, data_admissao, status,
        salario_base, vale_transporte, vale_refeicao, plano_saude, outros_beneficios, horas_diarias, hora_extra_percentual)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      data.nome, data.cpf, data.rg, data.data_nascimento, data.tipo_sanguineo,
      data.cargo, data.categoria || 'operacional', data.matricula, data.email,
      data.celular, data.contato_emergencia_nome, data.contato_emergencia_tel,
      data.data_admissao, 'ativo',
      data.salario_base || 0, data.vale_transporte || 0, data.vale_refeicao || 0,
      data.plano_saude || 0, data.outros_beneficios,
      data.horas_diarias || 8, data.hora_extra_percentual || 50
    )
    return { id: Number(r.lastInsertRowid) }
  })

  ipcMain.handle('funcionarios:update', (_e, { id, ...data }) => {
    const allowed = ['nome','cpf','rg','data_nascimento','tipo_sanguineo','cargo','categoria',
      'matricula','email','celular','contato_emergencia_nome','contato_emergencia_tel',
      'data_admissao','status','foto_url',
      'salario_base','vale_transporte','vale_refeicao','plano_saude','outros_beneficios',
      'horas_diarias','hora_extra_percentual']
    const fields = Object.keys(data).filter(k => allowed.includes(k)).map(k => `${k} = ?`).join(', ')
    const values = Object.keys(data).filter(k => allowed.includes(k)).map(k => data[k])
    if (fields) db.prepare(`UPDATE funcionarios SET ${fields}, updated_at = datetime('now') WHERE id = ?`).run(...values, id)
    return { success: true }
  })

  ipcMain.handle('funcionarios:delete', (_e, id) => {
    db.prepare('DELETE FROM funcionarios WHERE id = ?').run(id)
    return { success: true }
  })

  // ── Alocações ─────────────────────────────────────────────────────────────
  ipcMain.handle('alocacoes:create', (_e, data) => {
    const r = db.prepare(`
      INSERT INTO alocacoes (funcionario_id, obra_id, data_inicio, funcao)
      VALUES (?, ?, ?, ?)
    `).run(data.funcionario_id, data.obra_id, data.data_inicio, data.funcao)
    return { id: Number(r.lastInsertRowid) }
  })

  ipcMain.handle('alocacoes:by-obra', (_e, obra_id) => {
    return db.prepare(`
      SELECT a.*, f.nome as funcionario_nome, f.cargo, f.foto_url
      FROM alocacoes a JOIN funcionarios f ON a.funcionario_id = f.id
      WHERE a.obra_id = ? AND a.ativo = 1
    `).all(obra_id)
  })

  ipcMain.handle('alocacoes:remove', (_e, id) => {
    db.prepare("UPDATE alocacoes SET ativo = 0, data_fim = date('now') WHERE id = ?").run(id)
    return { success: true }
  })

  // ── Exames Médicos ────────────────────────────────────────────────────────
  ipcMain.handle('exames:list', (_e, funcionario_id) => {
    if (funcionario_id)
      return db.prepare('SELECT * FROM exames_medicos WHERE funcionario_id = ? ORDER BY data_realizacao DESC').all(funcionario_id)
    return db.prepare(`
      SELECT e.*, f.nome as funcionario_nome FROM exames_medicos e
      JOIN funcionarios f ON e.funcionario_id = f.id ORDER BY e.data_validade ASC
    `).all()
  })

  ipcMain.handle('exames:create', (_e, data) => {
    const r = db.prepare(`
      INSERT INTO exames_medicos (funcionario_id, tipo, medico, crm, clinica,
        data_realizacao, data_validade, resultado, observacoes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(data.funcionario_id, data.tipo, data.medico, data.crm, data.clinica,
      data.data_realizacao, data.data_validade, data.resultado || 'apto', data.observacoes)
    return { id: Number(r.lastInsertRowid) }
  })

  ipcMain.handle('exames:delete', (_e, id) => {
    db.prepare('DELETE FROM exames_medicos WHERE id = ?').run(id)
    return { success: true }
  })

  // ── EPIs ──────────────────────────────────────────────────────────────────
  ipcMain.handle('epis:list', () => db.prepare('SELECT * FROM epis ORDER BY nome').all())

  ipcMain.handle('epis:create', (_e, data) => {
    const r = db.prepare(`
      INSERT INTO epis (nome, ca, fabricante, descricao, unidade, estoque_atual, data_validade_ca)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(data.nome, data.ca, data.fabricante, data.descricao,
      data.unidade || 'unidade', data.estoque_atual || 0, data.data_validade_ca)
    return { id: Number(r.lastInsertRowid) }
  })

  ipcMain.handle('epis:update', (_e, { id, ...data }) => {
    db.prepare(`UPDATE epis SET nome=?,ca=?,fabricante=?,descricao=?,unidade=?,estoque_atual=?,data_validade_ca=? WHERE id=?`)
      .run(data.nome, data.ca, data.fabricante, data.descricao, data.unidade, data.estoque_atual, data.data_validade_ca, id)
    return { success: true }
  })

  ipcMain.handle('entregas-epi:create', (_e, data) => {
    const r = db.prepare(`
      INSERT INTO entregas_epi (funcionario_id, epi_id, obra_id, quantidade, data_entrega, responsavel_id)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(data.funcionario_id, data.epi_id, data.obra_id,
      data.quantidade || 1, data.data_entrega || new Date().toISOString().slice(0, 10), data.responsavel_id)
    return { id: Number(r.lastInsertRowid) }
  })

  ipcMain.handle('entregas-epi:by-funcionario', (_e, funcionario_id) => {
    return db.prepare(`
      SELECT ee.*, e.nome as epi_nome, e.ca FROM entregas_epi ee
      JOIN epis e ON ee.epi_id = e.id WHERE ee.funcionario_id = ?
      ORDER BY ee.data_entrega DESC
    `).all(funcionario_id)
  })

  // ── Acidentes ─────────────────────────────────────────────────────────────
  ipcMain.handle('acidentes:list', (_e, obra_id) => {
    if (obra_id)
      return db.prepare('SELECT * FROM acidentes WHERE obra_id = ? ORDER BY data_hora DESC').all(obra_id)
    return db.prepare(`
      SELECT a.*, o.nome as obra_nome, f.nome as funcionario_nome
      FROM acidentes a
      LEFT JOIN obras o ON a.obra_id = o.id
      LEFT JOIN funcionarios f ON a.funcionario_id = f.id
      ORDER BY a.data_hora DESC
    `).all()
  })

  ipcMain.handle('acidentes:update-cat', (_e, { id, arquivo_cat_url }) => {
    db.prepare('UPDATE acidentes SET arquivo_cat_url=?, cat_gerada=1 WHERE id=?').run(arquivo_cat_url, id)
    return { success: true }
  })

  ipcMain.handle('acidentes:create', (_e, data) => {
    const r = db.prepare(`
      INSERT INTO acidentes (obra_id, funcionario_id, tipo, data_hora, descricao, causa_raiz, medidas_corretivas)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(data.obra_id, data.funcionario_id, data.tipo, data.data_hora,
      data.descricao, data.causa_raiz, data.medidas_corretivas)
    db.prepare(`INSERT INTO alertas (tipo, titulo, mensagem, prioridade, obra_id, funcionario_id)
      VALUES ('acidente', 'Acidente Registrado', ?, 'critica', ?, ?)`)
      .run(`Acidente na obra: ${data.descricao}`, data.obra_id, data.funcionario_id)
    return { id: Number(r.lastInsertRowid) }
  })

  // ── Treinamentos ──────────────────────────────────────────────────────────
  ipcMain.handle('treinamentos:list', (_e, funcionario_id) => {
    if (funcionario_id)
      return db.prepare('SELECT * FROM treinamentos WHERE funcionario_id = ? ORDER BY data_realizacao DESC').all(funcionario_id)
    return db.prepare(`
      SELECT t.*, f.nome as funcionario_nome FROM treinamentos t
      JOIN funcionarios f ON t.funcionario_id = f.id ORDER BY t.data_validade ASC
    `).all()
  })

  ipcMain.handle('treinamentos:create', (_e, data) => {
    const r = db.prepare(`
      INSERT INTO treinamentos (funcionario_id, nr, nome, instituicao, data_realizacao, data_validade, carga_horaria)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(data.funcionario_id, data.nr, data.nome, data.instituicao,
      data.data_realizacao, data.data_validade, data.carga_horaria)
    return { id: Number(r.lastInsertRowid) }
  })

  // ── Checklists ────────────────────────────────────────────────────────────
  ipcMain.handle('checklists:list', (_e, obra_id) => {
    return db.prepare('SELECT * FROM checklists WHERE obra_id = ? ORDER BY data DESC').all(obra_id)
  })

  ipcMain.handle('checklists:create', (_e, data) => {
    const itens = JSON.stringify(data.itens || [])
    const temNC = (data.itens || []).some(i => i.nao_conforme)
    const r = db.prepare(`
      INSERT INTO checklists (obra_id, data, responsavel_id, itens, tem_nao_conformidade, observacoes)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(data.obra_id, data.data, data.responsavel_id, itens, temNC ? 1 : 0, data.observacoes)
    return { id: Number(r.lastInsertRowid) }
  })

  // ── RDOs ──────────────────────────────────────────────────────────────────
  ipcMain.handle('rdos:list', (_e, obra_id) => {
    return db.prepare('SELECT * FROM rdos WHERE obra_id = ? ORDER BY data DESC').all(obra_id)
  })

  ipcMain.handle('rdos:create', (_e, data) => {
    const r = db.prepare(`
      INSERT INTO rdos (obra_id, data, clima, funcionarios_presentes, atividades,
        ocorrencias, materiais_recebidos, fotos, engenheiro_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(data.obra_id, data.data, data.clima,
      JSON.stringify(data.funcionarios_presentes || []),
      data.atividades, data.ocorrencias,
      JSON.stringify(data.materiais_recebidos || []),
      JSON.stringify(data.fotos || []),
      data.engenheiro_id)
    return { id: Number(r.lastInsertRowid) }
  })

  ipcMain.handle('rdos:get', (_e, id) => {
    return db.prepare('SELECT * FROM rdos WHERE id = ?').get(id)
  })

  // ── Cronograma ────────────────────────────────────────────────────────────
  ipcMain.handle('cronograma:list', (_e, obra_id) => {
    return db.prepare('SELECT * FROM cronograma_etapas WHERE obra_id = ? ORDER BY ordem').all(obra_id)
  })

  ipcMain.handle('cronograma:update-etapa', (_e, { id, ...data }) => {
    db.prepare(`
      UPDATE cronograma_etapas SET progresso=?,data_prevista_inicio=?,data_prevista_fim=?,
      data_real_inicio=?,data_real_fim=?,updated_at=datetime('now') WHERE id=?
    `).run(data.progresso, data.data_prevista_inicio, data.data_prevista_fim,
      data.data_real_inicio, data.data_real_fim, id)
    const etapas = db.prepare('SELECT progresso FROM cronograma_etapas WHERE obra_id = (SELECT obra_id FROM cronograma_etapas WHERE id = ?)').all(id)
    const avg = etapas.reduce((s, e) => s + (e.progresso || 0), 0) / etapas.length
    db.prepare("UPDATE obras SET progresso = ?, updated_at = datetime('now') WHERE id = (SELECT obra_id FROM cronograma_etapas WHERE id = ?)").run(avg, id)
    return { success: true }
  })

  // ── Despesas ──────────────────────────────────────────────────────────────
  ipcMain.handle('despesas:list', (_e, obra_id) => {
    return db.prepare('SELECT * FROM despesas WHERE obra_id = ? ORDER BY data DESC').all(obra_id)
  })

  ipcMain.handle('despesas:create', (_e, data) => {
    const r = db.prepare(`
      INSERT INTO despesas (obra_id, descricao, categoria, valor, data, fornecedor, nota_fiscal, usuario_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(data.obra_id, data.descricao, data.categoria, data.valor,
      data.data, data.fornecedor, data.nota_fiscal, data.usuario_id)
    db.prepare("UPDATE obras SET orcamento_realizado = orcamento_realizado + ?, updated_at = datetime('now') WHERE id = ?")
      .run(data.valor, data.obra_id)
    const obra = db.prepare('SELECT orcamento_planejado, orcamento_realizado FROM obras WHERE id = ?').get(data.obra_id)
    if (obra && obra.orcamento_planejado) {
      const pct = (obra.orcamento_realizado / obra.orcamento_planejado) * 100
      if (pct >= 100) {
        db.prepare("INSERT INTO alertas (tipo, titulo, mensagem, prioridade, obra_id) VALUES ('orcamento', 'Orçamento Estourado', ?, 'alta', ?)").run(`Obra atingiu ${pct.toFixed(0)}% do orçamento`, data.obra_id)
      } else if (pct >= 80) {
        db.prepare("INSERT INTO alertas (tipo, titulo, mensagem, prioridade, obra_id) VALUES ('orcamento', 'Orçamento 80%', ?, 'media', ?)").run(`Obra atingiu 80% do orçamento`, data.obra_id)
      }
    }
    return { id: Number(r.lastInsertRowid) }
  })

  ipcMain.handle('despesas:delete', (_e, id) => {
    const d = db.prepare('SELECT * FROM despesas WHERE id = ?').get(id)
    if (d) {
      db.prepare('DELETE FROM despesas WHERE id = ?').run(id)
      db.prepare("UPDATE obras SET orcamento_realizado = orcamento_realizado - ?, updated_at = datetime('now') WHERE id = ?").run(d.valor, d.obra_id)
    }
    return { success: true }
  })

  // ── Materiais ─────────────────────────────────────────────────────────────
  ipcMain.handle('materiais:list', (_e, obra_id) => {
    return db.prepare('SELECT * FROM materiais_estoque WHERE obra_id = ? ORDER BY nome').all(obra_id)
  })

  ipcMain.handle('materiais:create', (_e, data) => {
    const r = db.prepare(`
      INSERT INTO materiais_estoque (obra_id, nome, codigo, unidade, fornecedor_padrao, estoque_atual, estoque_minimo, preco_unitario)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(data.obra_id, data.nome, data.codigo, data.unidade || 'unidade',
      data.fornecedor_padrao, data.estoque_atual || 0, data.estoque_minimo || 0, data.preco_unitario)
    return { id: Number(r.lastInsertRowid) }
  })

  ipcMain.handle('materiais:movimentar', (_e, data) => {
    const r = db.prepare(`
      INSERT INTO movimentacoes_estoque (material_id, tipo, quantidade, nota_fiscal, responsavel, finalidade, data)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(data.material_id, data.tipo, data.quantidade, data.nota_fiscal,
      data.responsavel, data.finalidade, data.data)
    const delta = data.tipo === 'entrada' ? data.quantidade : -data.quantidade
    db.prepare("UPDATE materiais_estoque SET estoque_atual = estoque_atual + ?, updated_at = datetime('now') WHERE id = ?").run(delta, data.material_id)
    const m = db.prepare('SELECT * FROM materiais_estoque WHERE id = ?').get(data.material_id)
    if (m && m.estoque_atual <= m.estoque_minimo) {
      db.prepare("INSERT INTO alertas (tipo, titulo, mensagem, prioridade, obra_id) VALUES ('estoque', 'Estoque Mínimo', ?, 'media', ?)").run(`Material "${m.nome}" atingiu estoque mínimo`, m.obra_id)
    }
    return { id: Number(r.lastInsertRowid) }
  })

  ipcMain.handle('movimentacoes:list', (_e, material_id) => {
    return db.prepare('SELECT * FROM movimentacoes_estoque WHERE material_id = ? ORDER BY data DESC').all(material_id)
  })

  // ── Controle de Ponto ─────────────────────────────────────────────────────
  ipcMain.handle('ponto:list', (_e, { obra_id, mes }) => {
    return db.prepare(`
      SELECT cp.*, f.nome as funcionario_nome, f.cargo
      FROM controle_ponto cp JOIN funcionarios f ON cp.funcionario_id = f.id
      WHERE cp.obra_id = ? AND cp.data LIKE ?
      ORDER BY cp.data DESC, f.nome
    `).all(obra_id, `${mes}%`)
  })

  ipcMain.handle('ponto:registrar', (_e, data) => {
    const existing = db.prepare('SELECT id FROM controle_ponto WHERE funcionario_id=? AND obra_id=? AND data=?').get(data.funcionario_id, data.obra_id, data.data)
    if (existing) {
      db.prepare('UPDATE controle_ponto SET entrada=?,saida=?,horas_trabalhadas=?,horas_extras=?,falta=?,observacao=? WHERE id=?')
        .run(data.entrada, data.saida, data.horas_trabalhadas, data.horas_extras || 0, data.falta ? 1 : 0, data.observacao, existing.id)
      return { id: existing.id }
    }
    const r = db.prepare(`
      INSERT INTO controle_ponto (funcionario_id, obra_id, data, entrada, saida, horas_trabalhadas, horas_extras, falta, observacao, lancado_por)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(data.funcionario_id, data.obra_id, data.data, data.entrada, data.saida,
      data.horas_trabalhadas, data.horas_extras || 0, data.falta ? 1 : 0, data.observacao, data.lancado_por)
    return { id: Number(r.lastInsertRowid) }
  })

  // ── Projetos/Arquivos ─────────────────────────────────────────────────────
  ipcMain.handle('projetos:list', (_e, obra_id) => {
    return db.prepare('SELECT * FROM projetos_arquivos WHERE obra_id = ? ORDER BY categoria, nome').all(obra_id)
  })

  ipcMain.handle('projetos:create', (_e, data) => {
    const r = db.prepare(`
      INSERT INTO projetos_arquivos (obra_id, nome, categoria, versao, tipo, arquivo_url, link_externo, usuario_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(data.obra_id, data.nome, data.categoria, data.versao || 'v1',
      data.tipo, data.arquivo_url, data.link_externo, data.usuario_id)
    return { id: Number(r.lastInsertRowid) }
  })

  ipcMain.handle('projetos:delete', (_e, id) => {
    db.prepare('DELETE FROM projetos_arquivos WHERE id = ?').run(id)
    return { success: true }
  })

  // ── Alertas ───────────────────────────────────────────────────────────────
  ipcMain.handle('alertas:list', () => {
    return db.prepare('SELECT * FROM alertas ORDER BY created_at DESC LIMIT 100').all()
  })

  ipcMain.handle('alertas:marcar-lido', (_e, id) => {
    db.prepare('UPDATE alertas SET lido = 1 WHERE id = ?').run(id)
    return { success: true }
  })

  ipcMain.handle('alertas:marcar-todos-lidos', () => {
    db.prepare('UPDATE alertas SET lido = 1').run()
    return { success: true }
  })

  ipcMain.handle('alertas:verificar-vencimentos', () => {
    const hoje = new Date().toISOString().split('T')[0]
    const em30 = new Date(Date.now() + 30 * 864e5).toISOString().split('T')[0]
    const exames = db.prepare(`
      SELECT e.*, f.nome as funcionario_nome FROM exames_medicos e
      JOIN funcionarios f ON e.funcionario_id = f.id
      WHERE e.data_validade BETWEEN ? AND ?
    `).all(hoje, em30)
    exames.forEach(e => {
      const diasRestantes = Math.ceil((new Date(e.data_validade).getTime() - Date.now()) / 864e5)
      const existente = db.prepare("SELECT id FROM alertas WHERE tipo='aso' AND funcionario_id=? AND created_at > datetime('now', '-1 day')").get(e.funcionario_id)
      if (!existente) {
        db.prepare("INSERT INTO alertas (tipo, titulo, mensagem, prioridade, funcionario_id) VALUES ('aso', 'ASO Vencendo', ?, 'alta', ?)")
          .run(`ASO de ${e.funcionario_nome} vence em ${diasRestantes} dias`, e.funcionario_id)
      }
    })
    return { success: true }
  })

  // ── Análises IA (salvar no banco) ─────────────────────────────────────────
  ipcMain.handle('ia:analise-epi', (_e, data) => {
    const r = db.prepare(`
      INSERT INTO analises_epi_ia (obra_id, foto_url, resultado, status_geral, observacoes, usuario_id)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(data.obra_id, data.foto_url, JSON.stringify(data.resultado || []),
      data.status_geral || 'conforme', data.observacoes, data.usuario_id)
    return { id: Number(r.lastInsertRowid) }
  })

  ipcMain.handle('ia:list-epi', (_e, obra_id) => {
    if (obra_id) return db.prepare('SELECT * FROM analises_epi_ia WHERE obra_id = ? ORDER BY created_at DESC').all(obra_id)
    return db.prepare('SELECT * FROM analises_epi_ia ORDER BY created_at DESC LIMIT 50').all()
  })

  ipcMain.handle('ia:analise-materiais', (_e, data) => {
    const r = db.prepare(`
      INSERT INTO analises_materiais_ia (obra_id, foto_url, tipo_elemento, largura, altura,
        espessura, finalidade, observacoes, resultado, custo_estimado_min, custo_estimado_max, usuario_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(data.obra_id, data.foto_url, data.tipo_elemento, data.largura, data.altura,
      data.espessura, data.finalidade, data.observacoes, data.resultado,
      data.custo_estimado_min, data.custo_estimado_max, data.usuario_id)
    return { id: Number(r.lastInsertRowid) }
  })

  ipcMain.handle('ia:list-materiais', (_e, obra_id) => {
    if (obra_id) return db.prepare('SELECT * FROM analises_materiais_ia WHERE obra_id = ? ORDER BY created_at DESC').all(obra_id)
    return db.prepare('SELECT * FROM analises_materiais_ia ORDER BY created_at DESC LIMIT 50').all()
  })

  // ── Dashboard Stats ───────────────────────────────────────────────────────
  ipcMain.handle('dashboard:stats', () => {
    const obras = db.prepare('SELECT COUNT(*) as total FROM obras').get()
    const emAndamento = db.prepare("SELECT COUNT(*) as total FROM obras WHERE status = 'em_andamento'").get()
    const funcionarios = db.prepare("SELECT COUNT(*) as total FROM funcionarios WHERE status = 'ativo'").get()
    const alertasNaoLidos = db.prepare('SELECT COUNT(*) as total FROM alertas WHERE lido = 0').get()
    const valorTotal = db.prepare('SELECT SUM(orcamento_planejado) as total FROM obras').get()
    const gastosTotal = db.prepare('SELECT SUM(orcamento_realizado) as total FROM obras').get()
    return {
      obras: obras.total,
      obrasEmAndamento: emAndamento.total,
      funcionarios: funcionarios.total,
      alertas: alertasNaoLidos.total,
      valorTotal: valorTotal.total || 0,
      gastosTotal: gastosTotal.total || 0
    }
  })

  // ── RDO aliases (all obras) ────────────────────────────────────────────────
  ipcMain.handle('rdos:list-all', () => {
    return db.prepare(`
      SELECT r.*, o.nome as obra_nome FROM rdos r
      LEFT JOIN obras o ON r.obra_id = o.id ORDER BY r.data DESC LIMIT 200
    `).all()
  })

  // ── Materiais por obra ─────────────────────────────────────────────────────
  ipcMain.handle('materiais:movimentos-obra', (_e, obra_id) => {
    return db.prepare(`
      SELECT mv.*, m.nome as material_nome, m.unidade FROM movimentacoes_estoque mv
      JOIN materiais_estoque m ON mv.material_id = m.id
      WHERE m.obra_id = ? ORDER BY mv.data DESC LIMIT 200
    `).all(obra_id)
  })

  // ── Checklists sem obra_id obrigatório ─────────────────────────────────────
  ipcMain.handle('checklists:list-all', () => {
    return db.prepare(`
      SELECT c.*, o.nome as obra_nome FROM checklists c
      LEFT JOIN obras o ON c.obra_id = o.id ORDER BY c.data DESC LIMIT 200
    `).all()
  })

  // ── Sistema ───────────────────────────────────────────────────────────────
  ipcMain.handle('sistema:info', () => {
    const { app: electronApp } = require('electron')
    return {
      'Versão': electronApp.getVersion(),
      'Electron': process.versions.electron,
      'Node': process.versions.node,
      'Plataforma': process.platform,
      'Pasta de dados': electronApp.getPath('userData'),
    }
  })

  ipcMain.handle('sistema:backup', () => {
    const electronApp = require('electron').app
    const dbPath = path.join(electronApp.getPath('userData'), 'minha-obra', 'minha-obra.db')
    const backupDir = path.join(electronApp.getPath('documents'), 'Minha Obra Backups')
    if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true })
    const ts = new Date().toISOString().slice(0, 19).replace(/:/g, '-')
    const dest = path.join(backupDir, `minha-obra-${ts}.db`)
    fs.copyFileSync(dbPath, dest)
    return { caminho: dest, success: true }
  })

  // ── Usuário: perfil e senha ────────────────────────────────────────────────
  ipcMain.handle('usuarios:update-perfil', (_e, { id, nome, email, cargo }) => {
    db.prepare('UPDATE usuarios SET nome=?, email=?, cargo=?, updated_at=datetime(\'now\') WHERE id=?').run(nome, email, cargo || null, id)
    return { success: true }
  })

  ipcMain.handle('usuarios:update-foto', (_e, { id, foto_url }) => {
    db.prepare('UPDATE usuarios SET foto_url=? WHERE id=?').run(foto_url, id)
    return { success: true }
  })

  ipcMain.handle('usuarios:change-password', (_e, { id, senha_atual, nova_senha }) => {
    const user = db.prepare('SELECT senha_hash FROM usuarios WHERE id=?').get(id)
    if (!user) return { success: false, message: 'Usuário não encontrado' }
    if (user.senha_hash && user.senha_hash !== hashSenha(senha_atual))
      return { success: false, message: 'Senha atual incorreta' }
    db.prepare('UPDATE usuarios SET senha_hash=? WHERE id=?').run(hashSenha(nova_senha), id)
    return { success: true }
  })

  // ── Shell open ────────────────────────────────────────────────────────────
  ipcMain.handle('shell:open', (_e, pathOrUrl) => {
    const { shell } = require('electron')
    shell.openPath(pathOrUrl)
    return { success: true }
  })

  // ── Relatórios PDF ────────────────────────────────────────────────────────
  ipcMain.handle('relatorios:gerar-pdf', (_e, { tipo, obra_id }) => {
    const PDFDocument = require('pdfkit')
    const electronApp = require('electron').app
    const dir = path.join(electronApp.getPath('documents'), 'Minha Obra Relatórios')
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
    const ts = new Date().toISOString().slice(0, 10)
    const dest = path.join(dir, `relatorio-${tipo}-${ts}.pdf`)

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50, size: 'A4' })
      const stream = fs.createWriteStream(dest)
      doc.pipe(stream)

      const titulo = { obra: 'Relatório de Obras', funcionarios: 'Relatório de Funcionários', financeiro: 'Relatório Financeiro', acidentes: 'Relatório de Acidentes' }[tipo] || tipo

      // Cabeçalho
      doc.fontSize(20).fillColor('#d97706').text('MINHA OBRA', { align: 'center' })
      doc.fontSize(14).fillColor('#1f2937').text(titulo, { align: 'center' })
      doc.fontSize(10).fillColor('#6b7280').text(`Gerado em: ${ts}`, { align: 'center' })
      doc.moveDown(1.5)
      doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#d97706').lineWidth(2).stroke()
      doc.moveDown(1)

      // Conteúdo por tipo
      if (tipo === 'obra') {
        const query = obra_id ? 'SELECT * FROM obras WHERE id=?' : 'SELECT * FROM obras ORDER BY nome'
        const obras = obra_id ? [db.prepare(query).get(obra_id)] : db.prepare(query).all()
        obras.forEach((o, i) => {
          doc.fontSize(12).fillColor('#111827').text(`${i + 1}. ${o.nome}`)
          doc.fontSize(10).fillColor('#374151')
            .text(`   Status: ${o.status}   |   Progresso: ${(o.progresso || 0).toFixed(0)}%`)
            .text(`   Orçamento: R$ ${Number(o.orcamento_planejado || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`)
            .text(`   Realizado: R$ ${Number(o.orcamento_realizado || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`)
          if (o.data_prevista) doc.text(`   Previsão: ${o.data_prevista}`)
          doc.moveDown(0.5)
        })
        if (!obras.length) doc.fontSize(11).fillColor('#6b7280').text('Nenhuma obra encontrada.')
      } else if (tipo === 'funcionarios') {
        const funcs = db.prepare('SELECT * FROM funcionarios ORDER BY nome').all()
        funcs.forEach((f, i) => {
          doc.fontSize(12).fillColor('#111827').text(`${i + 1}. ${f.nome}`)
          doc.fontSize(10).fillColor('#374151')
            .text(`   Cargo: ${f.cargo || '-'}   |   Status: ${f.status}`)
          if (f.celular) doc.text(`   Celular: ${f.celular}`)
          doc.moveDown(0.5)
        })
        if (!funcs.length) doc.fontSize(11).fillColor('#6b7280').text('Nenhum funcionário encontrado.')
      } else if (tipo === 'financeiro') {
        const query = obra_id
          ? 'SELECT d.*,o.nome as obra_nome FROM despesas d JOIN obras o ON d.obra_id=o.id WHERE d.obra_id=? ORDER BY d.data DESC'
          : 'SELECT d.*,o.nome as obra_nome FROM despesas d JOIN obras o ON d.obra_id=o.id ORDER BY d.data DESC LIMIT 500'
        const despesas = obra_id ? db.prepare(query).all(obra_id) : db.prepare(query).all()
        let total = 0
        despesas.forEach(d => {
          total += Number(d.valor || 0)
          doc.fontSize(10).fillColor('#111827')
            .text(`${d.data}  |  ${d.descricao}  |  ${d.categoria}  |  R$ ${Number(d.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`)
        })
        doc.moveDown(1)
        doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#9ca3af').lineWidth(1).stroke()
        doc.moveDown(0.5)
        doc.fontSize(12).fillColor('#d97706').text(`Total: R$ ${total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, { align: 'right' })
        if (!despesas.length) doc.fontSize(11).fillColor('#6b7280').text('Nenhuma despesa encontrada.')
      } else if (tipo === 'acidentes') {
        const acidentes = db.prepare(`SELECT a.*,o.nome as obra_nome,f.nome as func_nome FROM acidentes a LEFT JOIN obras o ON a.obra_id=o.id LEFT JOIN funcionarios f ON a.funcionario_id=f.id ORDER BY a.data_hora DESC`).all()
        acidentes.forEach((a, i) => {
          doc.fontSize(12).fillColor('#dc2626').text(`${i + 1}. ${a.tipo || 'Acidente'}`)
          doc.fontSize(10).fillColor('#374151')
            .text(`   Data: ${a.data_hora}`)
            .text(`   Obra: ${a.obra_nome || '-'}   |   Funcionário: ${a.func_nome || '-'}`)
          if (a.descricao) doc.text(`   Descrição: ${a.descricao}`)
          if (a.medidas_corretivas) doc.text(`   Medidas: ${a.medidas_corretivas}`)
          doc.moveDown(0.5)
        })
        if (!acidentes.length) doc.fontSize(11).fillColor('#6b7280').text('Nenhum acidente registrado.')
      }

      // Rodapé
      doc.fontSize(8).fillColor('#9ca3af').text('Minha Obra — Sistema de Gestão de Obras', 50, 780, { align: 'center' })

      doc.end()
      stream.on('finish', () => resolve({ caminho: dest, success: true }))
      stream.on('error', reject)
    })
  })

  ipcMain.handle('relatorios:gerar-excel', (_e, { tipo, obra_id }) => {
    const electronApp = require('electron').app
    const dir = path.join(electronApp.getPath('documents'), 'Minha Obra Relatórios')
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
    const ts = new Date().toISOString().slice(0, 10)
    const dest = path.join(dir, `relatorio-${tipo}-${ts}.csv`)
    let linhas = []
    if (tipo === 'financeiro') {
      linhas.push('Data;Descrição;Categoria;Valor;Fornecedor;Obra')
      const query = obra_id ? 'SELECT d.*,o.nome as obra_nome FROM despesas d JOIN obras o ON d.obra_id=o.id WHERE d.obra_id=?' : 'SELECT d.*,o.nome as obra_nome FROM despesas d JOIN obras o ON d.obra_id=o.id ORDER BY d.data DESC LIMIT 2000'
      const rows = obra_id ? db.prepare(query).all(obra_id) : db.prepare(query).all()
      rows.forEach(r => linhas.push(`${r.data};${r.descricao};${r.categoria};${r.valor};${r.fornecedor||''};${r.obra_nome}`))
    } else {
      linhas.push('Dados exportados em ' + ts)
    }
    fs.writeFileSync(dest, linhas.join('\n'), 'utf8')
    return { caminho: dest, success: true }
  })

  ipcMain.handle('relatorios:estoque-baixo', () => {
    const PDFDocument = require('pdfkit')
    const electronApp = require('electron').app
    const dir = path.join(electronApp.getPath('documents'), 'Minha Obra Relatórios')
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
    const dest = path.join(dir, `estoque-baixo-${new Date().toISOString().slice(0,10)}.pdf`)
    const epis = db.prepare('SELECT * FROM epis WHERE estoque_atual <= 2').all()
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50, size: 'A4' })
      doc.pipe(fs.createWriteStream(dest))
      doc.fontSize(18).fillColor('#d97706').text('MINHA OBRA', { align: 'center' })
      doc.fontSize(13).fillColor('#1f2937').text('EPIs com Estoque Baixo', { align: 'center' })
      doc.fontSize(9).fillColor('#6b7280').text(`Gerado em: ${new Date().toISOString().slice(0,10)}`, { align: 'center' })
      doc.moveDown(1).moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#d97706').lineWidth(2).stroke().moveDown(1)
      if (epis.length) {
        epis.forEach(e => {
          doc.fontSize(11).fillColor('#111827').text(`${e.nome}`)
          doc.fontSize(10).fillColor('#374151').text(`   CA: ${e.ca||'-'}  |  Estoque atual: ${e.estoque_atual}  |  Unidade: ${e.unidade||'-'}`)
          doc.moveDown(0.4)
        })
      } else {
        doc.fontSize(11).fillColor('#6b7280').text('Nenhum EPI com estoque baixo.')
      }
      doc.end()
      doc.on('end', () => resolve({ caminho: dest }))
      doc.on('error', reject)
    })
  })

  ipcMain.handle('relatorios:exames-vencidos', () => {
    const PDFDocument = require('pdfkit')
    const electronApp = require('electron').app
    const dir = path.join(electronApp.getPath('documents'), 'Minha Obra Relatórios')
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
    const dest = path.join(dir, `exames-vencidos-${new Date().toISOString().slice(0,10)}.pdf`)
    const hoje = new Date().toISOString().slice(0,10)
    const exames = db.prepare(`SELECT e.*,f.nome as func_nome FROM exames_medicos e JOIN funcionarios f ON e.funcionario_id=f.id WHERE e.data_validade<? ORDER BY e.data_validade`).all(hoje)
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50, size: 'A4' })
      doc.pipe(fs.createWriteStream(dest))
      doc.fontSize(18).fillColor('#d97706').text('MINHA OBRA', { align: 'center' })
      doc.fontSize(13).fillColor('#dc2626').text('Exames Médicos Vencidos', { align: 'center' })
      doc.fontSize(9).fillColor('#6b7280').text(`Gerado em: ${hoje}`, { align: 'center' })
      doc.moveDown(1).moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#d97706').lineWidth(2).stroke().moveDown(1)
      if (exames.length) {
        exames.forEach(e => {
          doc.fontSize(11).fillColor('#111827').text(e.func_nome)
          doc.fontSize(10).fillColor('#374151').text(`   Tipo: ${e.tipo}  |  Venceu em: ${e.data_validade}`)
          doc.moveDown(0.4)
        })
      } else {
        doc.fontSize(11).fillColor('#6b7280').text('Nenhum exame vencido.')
      }
      doc.end()
      doc.on('end', () => resolve({ caminho: dest }))
      doc.on('error', reject)
    })
  })

  ipcMain.handle('relatorios:obras-atraso', () => {
    const PDFDocument = require('pdfkit')
    const electronApp = require('electron').app
    const dir = path.join(electronApp.getPath('documents'), 'Minha Obra Relatórios')
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
    const dest = path.join(dir, `obras-atraso-${new Date().toISOString().slice(0,10)}.pdf`)
    const hoje = new Date().toISOString().slice(0,10)
    const obras = db.prepare(`SELECT * FROM obras WHERE data_prevista<? AND status NOT IN ('concluida','cancelada')`).all(hoje)
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50, size: 'A4' })
      doc.pipe(fs.createWriteStream(dest))
      doc.fontSize(18).fillColor('#d97706').text('MINHA OBRA', { align: 'center' })
      doc.fontSize(13).fillColor('#dc2626').text('Obras em Atraso', { align: 'center' })
      doc.fontSize(9).fillColor('#6b7280').text(`Gerado em: ${hoje}`, { align: 'center' })
      doc.moveDown(1).moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#d97706').lineWidth(2).stroke().moveDown(1)
      if (obras.length) {
        obras.forEach(o => {
          doc.fontSize(11).fillColor('#111827').text(o.nome)
          doc.fontSize(10).fillColor('#374151').text(`   Previsão: ${o.data_prevista}  |  Status: ${o.status}  |  Progresso: ${(o.progresso||0).toFixed(0)}%`)
          doc.moveDown(0.4)
        })
      } else {
        doc.fontSize(11).fillColor('#6b7280').text('Nenhuma obra em atraso.')
      }
      doc.end()
      doc.on('end', () => resolve({ caminho: dest }))
      doc.on('error', reject)
    })
  })

  ipcMain.handle('relatorios:despesas-mes', () => {
    const electronApp = require('electron').app
    const dir = path.join(electronApp.getPath('documents'), 'Minha Obra Relatórios')
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
    const dest = path.join(dir, `despesas-mes-${new Date().toISOString().slice(0,7)}.csv`)
    const mes = new Date().toISOString().slice(0,7)
    const rows = db.prepare(`SELECT d.*,o.nome as obra_nome FROM despesas d JOIN obras o ON d.obra_id=o.id WHERE d.data LIKE ? ORDER BY d.data`).all(`${mes}%`)
    const lines = ['Data;Descrição;Categoria;Valor;Fornecedor;Obra']
    rows.forEach(r => lines.push(`${r.data};${r.descricao};${r.categoria};${r.valor};${r.fornecedor||''};${r.obra_nome}`))
    fs.writeFileSync(dest, lines.join('\n'), 'utf8')
    return { caminho: dest }
  })

  // ── Fornecedores ──────────────────────────────────────────────────────────
  ipcMain.handle('fornecedores:list', (_e, categoria) => {
    if (categoria) return db.prepare('SELECT * FROM fornecedores WHERE categoria=? AND ativo=1 ORDER BY nome').all(categoria)
    return db.prepare('SELECT * FROM fornecedores WHERE ativo=1 ORDER BY nome').all()
  })

  ipcMain.handle('fornecedores:create', (_e, data) => {
    const r = db.prepare(`
      INSERT INTO fornecedores (nome, cnpj_cpf, telefone, email, endereco, cidade, estado, cep, categoria, contato, observacoes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(data.nome, data.cnpj_cpf, data.telefone, data.email, data.endereco,
      data.cidade, data.estado, data.cep, data.categoria || 'material', data.contato, data.observacoes)
    return { id: Number(r.lastInsertRowid) }
  })

  ipcMain.handle('fornecedores:update', (_e, { id, ...data }) => {
    const allowed = ['nome','cnpj_cpf','telefone','email','endereco','cidade','estado','cep','categoria','contato','observacoes','ativo']
    const fields = Object.keys(data).filter(k => allowed.includes(k)).map(k => `${k} = ?`).join(', ')
    const values = Object.keys(data).filter(k => allowed.includes(k)).map(k => data[k])
    if (fields) db.prepare(`UPDATE fornecedores SET ${fields}, updated_at=datetime('now') WHERE id=?`).run(...values, id)
    return { success: true }
  })

  ipcMain.handle('fornecedores:delete', (_e, id) => {
    db.prepare('UPDATE fornecedores SET ativo=0 WHERE id=?').run(id)
    return { success: true }
  })

  // ── File dialog ────────────────────────────────────────────────────────────
  ipcMain.handle('dialog:open-file', async (_e, options) => {
    const result = await dialog.showOpenDialog({ properties: ['openFile'], ...options })
    if (result.canceled || !result.filePaths.length) return null
    return result.filePaths[0]
  })

  ipcMain.handle('file:read-base64', (_e, filePath) => {
    const data = fs.readFileSync(filePath)
    const ext = path.extname(filePath).slice(1).toLowerCase()
    const mime = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg'
      : ext === 'png' ? 'image/png'
      : ext === 'pdf' ? 'application/pdf'
      : 'application/octet-stream'
    return { base64: data.toString('base64'), mime, name: path.basename(filePath) }
  })

  ipcMain.handle('file:save-copy', (_e, { sourcePath, destName }) => {
    const destDir = path.join(app.getPath('userData'), 'minha-obra', 'files')
    if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true })
    const dest = path.join(destDir, destName)
    fs.copyFileSync(sourcePath, dest)
    return dest
  })

  // ── HWID ──────────────────────────────────────────────────────────────────
  ipcMain.handle('hwid:get', () => {
    const { gerarHWID } = require('./hwid')
    return gerarHWID()
  })

  ipcMain.handle('hwid:pc-nome', () => {
    const { getPcNome } = require('./hwid')
    return getPcNome()
  })

  // ── Auth Supabase → SQLite sync ───────────────────────────────────────────
  ipcMain.handle('auth:sync-supabase', (_e, { email, nome }) => {
    let user = db.prepare('SELECT * FROM usuarios WHERE email = ?').get(email)
    if (!user) {
      const r = db.prepare(`
        INSERT INTO usuarios (nome, email, senha_hash, perfil, ativo)
        VALUES (?, ?, NULL, 'engenheiro', 1)
      `).run(nome || email.split('@')[0], email)
      user = db.prepare('SELECT * FROM usuarios WHERE id = ?').get(Number(r.lastInsertRowid))
    }
    if (!user.ativo) return { success: false, message: 'Usuário desativado localmente' }

    const temAssinatura = db.prepare(`SELECT id FROM assinaturas WHERE usuario_id = ?`).get(user.id)
    if (!temAssinatura) {
      const planoFree = db.prepare(`SELECT id FROM planos WHERE nome = 'FREE'`).get()
      if (planoFree) db.prepare(`INSERT INTO assinaturas (usuario_id, plano_id, status) VALUES (?, ?, 'ativa')`).run(user.id, planoFree.id)
    }

    const { plano, assinatura } = getPlanoUsuario(db, user.id)
    const { senha_hash, ...safeUser } = user
    return { success: true, user: safeUser, plano, assinatura }
  })

  // ── Session criptografada em disco ────────────────────────────────────────
  const SESSION_FILE = path.join(app.getPath('userData'), 'minha-obra', '.session')
  const SESSION_KEY = crypto.scryptSync('minha-obra-session-v1', 'salt-2024', 32)

  ipcMain.handle('session:save', (_e, data) => {
    try {
      const iv = crypto.randomBytes(16)
      const cipher = crypto.createCipheriv('aes-256-cbc', SESSION_KEY, iv)
      const enc = Buffer.concat([cipher.update(JSON.stringify(data), 'utf8'), cipher.final()])
      const sessionDir = path.dirname(SESSION_FILE)
      if (!fs.existsSync(sessionDir)) fs.mkdirSync(sessionDir, { recursive: true })
      fs.writeFileSync(SESSION_FILE, JSON.stringify({ iv: iv.toString('hex'), data: enc.toString('hex') }))
      return { success: true }
    } catch { return { success: false } }
  })

  ipcMain.handle('session:load', () => {
    try {
      if (!fs.existsSync(SESSION_FILE)) return null
      const { iv, data } = JSON.parse(fs.readFileSync(SESSION_FILE, 'utf8'))
      const decipher = crypto.createDecipheriv('aes-256-cbc', SESSION_KEY, Buffer.from(iv, 'hex'))
      const dec = Buffer.concat([decipher.update(Buffer.from(data, 'hex')), decipher.final()])
      return JSON.parse(dec.toString('utf8'))
    } catch { return null }
  })

  ipcMain.handle('session:clear', () => {
    try { if (fs.existsSync(SESSION_FILE)) fs.unlinkSync(SESSION_FILE) } catch {}
    return { success: true }
  })
}

module.exports = { setupIpcHandlers }
