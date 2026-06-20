'use strict'

const Database = require('better-sqlite3')
const { app } = require('electron')
const path = require('path')
const fs = require('fs')

let db

function setupDatabase() {
  const userDataPath = app.getPath('userData')
  const dbDir = path.join(userDataPath, 'minha-obra')
  if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true })

  const dbPath = path.join(dbDir, 'minha-obra.db')
  db = new Database(dbPath)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')

  runMigrations()
}

function getDb() {
  return db
}

function runMigrations() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS planos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL UNIQUE,
      preco_mensal REAL NOT NULL DEFAULT 0,
      descricao TEXT,
      ativo INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS assinaturas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      usuario_id INTEGER NOT NULL REFERENCES usuarios(id),
      plano_id INTEGER NOT NULL REFERENCES planos(id),
      data_inicio TEXT NOT NULL DEFAULT (date('now')),
      data_vencimento TEXT,
      status TEXT NOT NULL DEFAULT 'ativa',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS usuarios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      senha_hash TEXT,
      perfil TEXT NOT NULL DEFAULT 'visitante',
      ativo INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS obras (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      endereco TEXT,
      cidade TEXT,
      estado TEXT,
      cep TEXT,
      engenheiro_id INTEGER REFERENCES usuarios(id),
      status TEXT NOT NULL DEFAULT 'planejamento',
      progresso REAL NOT NULL DEFAULT 0,
      orcamento_planejado REAL NOT NULL DEFAULT 0,
      orcamento_realizado REAL NOT NULL DEFAULT 0,
      data_inicio TEXT,
      data_prevista TEXT,
      data_conclusao TEXT,
      area_m2 REAL,
      descricao TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS funcionarios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      cpf TEXT UNIQUE,
      rg TEXT,
      data_nascimento TEXT,
      tipo_sanguineo TEXT,
      cargo TEXT NOT NULL,
      categoria TEXT NOT NULL DEFAULT 'operacional',
      matricula TEXT,
      email TEXT,
      celular TEXT,
      contato_emergencia_nome TEXT,
      contato_emergencia_tel TEXT,
      foto_url TEXT,
      data_admissao TEXT,
      status TEXT NOT NULL DEFAULT 'ativo',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS alocacoes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      funcionario_id INTEGER NOT NULL REFERENCES funcionarios(id),
      obra_id INTEGER NOT NULL REFERENCES obras(id),
      data_inicio TEXT NOT NULL,
      data_fim TEXT,
      funcao TEXT,
      ativo INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS exames_medicos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      funcionario_id INTEGER NOT NULL REFERENCES funcionarios(id),
      tipo TEXT NOT NULL,
      medico TEXT,
      crm TEXT,
      clinica TEXT,
      data_realizacao TEXT NOT NULL,
      data_validade TEXT,
      resultado TEXT NOT NULL DEFAULT 'apto',
      observacoes TEXT,
      arquivo_url TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS epis (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      ca TEXT,
      fabricante TEXT,
      descricao TEXT,
      unidade TEXT NOT NULL DEFAULT 'unidade',
      estoque_atual INTEGER NOT NULL DEFAULT 0,
      data_validade_ca TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS entregas_epi (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      funcionario_id INTEGER NOT NULL REFERENCES funcionarios(id),
      epi_id INTEGER NOT NULL REFERENCES epis(id),
      obra_id INTEGER REFERENCES obras(id),
      quantidade INTEGER NOT NULL DEFAULT 1,
      data_entrega TEXT NOT NULL,
      data_devolucao TEXT,
      assinatura TEXT,
      responsavel_id INTEGER REFERENCES usuarios(id),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS acidentes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      obra_id INTEGER NOT NULL REFERENCES obras(id),
      funcionario_id INTEGER REFERENCES funcionarios(id),
      tipo TEXT NOT NULL,
      data_hora TEXT NOT NULL,
      descricao TEXT NOT NULL,
      causa_raiz TEXT,
      medidas_corretivas TEXT,
      cat_gerada INTEGER NOT NULL DEFAULT 0,
      arquivo_cat_url TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS treinamentos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      funcionario_id INTEGER NOT NULL REFERENCES funcionarios(id),
      nr TEXT NOT NULL,
      nome TEXT NOT NULL,
      instituicao TEXT,
      data_realizacao TEXT NOT NULL,
      data_validade TEXT,
      carga_horaria INTEGER,
      certificado_url TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS checklists (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      obra_id INTEGER NOT NULL REFERENCES obras(id),
      data TEXT NOT NULL,
      responsavel_id INTEGER REFERENCES usuarios(id),
      itens TEXT NOT NULL DEFAULT '[]',
      tem_nao_conformidade INTEGER NOT NULL DEFAULT 0,
      observacoes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS rdos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      obra_id INTEGER NOT NULL REFERENCES obras(id),
      data TEXT NOT NULL,
      clima TEXT NOT NULL DEFAULT 'ensolarado',
      funcionarios_presentes TEXT NOT NULL DEFAULT '[]',
      atividades TEXT,
      ocorrencias TEXT,
      materiais_recebidos TEXT,
      fotos TEXT NOT NULL DEFAULT '[]',
      assinatura_engenheiro TEXT,
      engenheiro_id INTEGER REFERENCES usuarios(id),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS projetos_arquivos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      obra_id INTEGER NOT NULL REFERENCES obras(id),
      nome TEXT NOT NULL,
      categoria TEXT NOT NULL,
      versao TEXT NOT NULL DEFAULT 'v1',
      tipo TEXT,
      arquivo_url TEXT,
      link_externo TEXT,
      tamanho INTEGER,
      usuario_id INTEGER REFERENCES usuarios(id),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS cronograma_etapas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      obra_id INTEGER NOT NULL REFERENCES obras(id),
      nome TEXT NOT NULL,
      ordem INTEGER NOT NULL DEFAULT 0,
      data_prevista_inicio TEXT,
      data_prevista_fim TEXT,
      data_real_inicio TEXT,
      data_real_fim TEXT,
      progresso REAL NOT NULL DEFAULT 0,
      responsavel_id INTEGER REFERENCES funcionarios(id),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS despesas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      obra_id INTEGER NOT NULL REFERENCES obras(id),
      descricao TEXT NOT NULL,
      categoria TEXT NOT NULL,
      valor REAL NOT NULL,
      data TEXT NOT NULL,
      fornecedor TEXT,
      nota_fiscal TEXT,
      comprovante_url TEXT,
      usuario_id INTEGER REFERENCES usuarios(id),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS materiais_estoque (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      obra_id INTEGER NOT NULL REFERENCES obras(id),
      nome TEXT NOT NULL,
      codigo TEXT,
      unidade TEXT NOT NULL DEFAULT 'unidade',
      fornecedor_padrao TEXT,
      estoque_atual REAL NOT NULL DEFAULT 0,
      estoque_minimo REAL NOT NULL DEFAULT 0,
      preco_unitario REAL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS movimentacoes_estoque (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      material_id INTEGER NOT NULL REFERENCES materiais_estoque(id),
      tipo TEXT NOT NULL,
      quantidade REAL NOT NULL,
      nota_fiscal TEXT,
      responsavel TEXT,
      finalidade TEXT,
      data TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS analises_epi_ia (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      obra_id INTEGER REFERENCES obras(id),
      foto_url TEXT NOT NULL,
      resultado TEXT NOT NULL DEFAULT '[]',
      status_geral TEXT NOT NULL DEFAULT 'conforme',
      observacoes TEXT,
      usuario_id INTEGER REFERENCES usuarios(id),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS analises_materiais_ia (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      obra_id INTEGER REFERENCES obras(id),
      foto_url TEXT NOT NULL,
      tipo_elemento TEXT NOT NULL,
      largura REAL,
      altura REAL,
      espessura REAL,
      finalidade TEXT,
      observacoes TEXT,
      resultado TEXT,
      custo_estimado_min REAL,
      custo_estimado_max REAL,
      usuario_id INTEGER REFERENCES usuarios(id),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS controle_ponto (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      funcionario_id INTEGER NOT NULL REFERENCES funcionarios(id),
      obra_id INTEGER NOT NULL REFERENCES obras(id),
      data TEXT NOT NULL,
      entrada TEXT,
      saida TEXT,
      horas_trabalhadas REAL,
      horas_extras REAL NOT NULL DEFAULT 0,
      falta INTEGER NOT NULL DEFAULT 0,
      atraso INTEGER NOT NULL DEFAULT 0,
      observacao TEXT,
      lancado_por INTEGER REFERENCES usuarios(id),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS alertas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tipo TEXT NOT NULL,
      titulo TEXT NOT NULL,
      mensagem TEXT NOT NULL,
      prioridade TEXT NOT NULL DEFAULT 'media',
      lido INTEGER NOT NULL DEFAULT 0,
      obra_id INTEGER REFERENCES obras(id),
      funcionario_id INTEGER REFERENCES funcionarios(id),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS audit_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      usuario_id INTEGER REFERENCES usuarios(id),
      tabela TEXT NOT NULL,
      operacao TEXT NOT NULL,
      registro_id INTEGER,
      dados_antes TEXT,
      dados_depois TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS ocorrencias_funcionarios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      funcionario_id INTEGER NOT NULL REFERENCES funcionarios(id),
      tipo TEXT NOT NULL,
      motivo TEXT NOT NULL,
      data TEXT NOT NULL,
      data_retorno TEXT,
      relatorio TEXT,
      ativo INTEGER NOT NULL DEFAULT 1,
      usuario_id INTEGER REFERENCES usuarios(id),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS fornecedores (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      cnpj_cpf TEXT,
      telefone TEXT,
      email TEXT,
      endereco TEXT,
      cidade TEXT,
      estado TEXT,
      cep TEXT,
      categoria TEXT NOT NULL DEFAULT 'material',
      contato TEXT,
      observacoes TEXT,
      ativo INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `)

  // Migração: colunas novas em usuarios
  ;['foto_url TEXT', 'cargo TEXT'].forEach(col => {
    try { db.exec(`ALTER TABLE usuarios ADD COLUMN ${col}`) } catch {}
  })

  // Migração: adicionar colunas novas em funcionarios se não existirem
  const novasColunas = [
    'salario_base REAL DEFAULT 0',
    'vale_transporte REAL DEFAULT 0',
    'vale_refeicao REAL DEFAULT 0',
    'plano_saude REAL DEFAULT 0',
    'outros_beneficios TEXT',
    'horas_diarias REAL DEFAULT 8',
    'hora_extra_percentual INTEGER DEFAULT 50',
  ]
  novasColunas.forEach(col => {
    try { db.exec(`ALTER TABLE funcionarios ADD COLUMN ${col}`) } catch {}
  })

  // Seeds — planos
  db.prepare(`INSERT OR IGNORE INTO planos (nome, preco_mensal, descricao) VALUES ('FREE', 0, 'Acesso a todos os módulos exceto IA')`).run()
  db.prepare(`INSERT OR IGNORE INTO planos (nome, preco_mensal, descricao) VALUES ('PLUS', 49.90, 'Tudo do FREE + IA de EPI + IA de Estimativa de Materiais')`).run()

  // Seed — admin padrão (senha: admin123)
  const adminHash = require('crypto').createHash('sha256').update('admin123' + 'minha-obra-salt').digest('hex')
  db.prepare(`INSERT OR IGNORE INTO usuarios (nome, email, senha_hash, perfil) VALUES ('Administrador', 'admin@minhaobra.com', ?, 'administrador')`).run(adminHash)

  // Garante assinatura FREE para admin
  const admin = db.prepare(`SELECT id FROM usuarios WHERE email = 'admin@minhaobra.com'`).get()
  const planoFree = db.prepare(`SELECT id FROM planos WHERE nome = 'FREE'`).get()
  if (admin && planoFree) {
    const temAssinatura = db.prepare(`SELECT id FROM assinaturas WHERE usuario_id = ?`).get(admin.id)
    if (!temAssinatura) {
      db.prepare(`INSERT INTO assinaturas (usuario_id, plano_id, status) VALUES (?, ?, 'ativa')`).run(admin.id, planoFree.id)
    }
  }

  // Seeds — EPIs padrão de obra
  const episPadrao = [
    ['Capacete de Segurança Classe B', '31469', 'VONDER', 'Proteção da cabeça contra impactos e choques elétricos', 'unidade', 10],
    ['Luva de Raspa de Couro', '10.424', 'KALIPSO', 'Proteção das mãos em trabalhos com materiais abrasivos e quentes', 'par', 20],
    ['Bota de Segurança Impermeável', '12345', 'KADESH', 'Proteção dos pés com biqueira de aço e solado antiderrapante', 'par', 10],
    ['Óculos de Proteção Incolor', '35136', 'SSPLUS', 'Proteção dos olhos contra partículas e respingos', 'unidade', 15],
    ['Colete Refletivo', '40427', 'STEELFLEX', 'Visibilidade e identificação em ambientes de obra', 'unidade', 10],
    ['Protetor Auricular Tipo Plug', '36773', '3M', 'Proteção auditiva para ambientes com ruído acima de 85dB', 'unidade', 50],
    ['Máscara Respiratória PFF2', '10472', '3M', 'Proteção respiratória contra poeiras e névoas', 'unidade', 30],
    ['Cinto de Segurança Paraquedista', '43909', 'KALIPSO', 'Trabalho em altura — obrigatório acima de 2 metros', 'unidade', 5],
    ['Luva de Borracha Isolante', '12398', 'VOLK', 'Proteção em trabalhos com eletricidade', 'par', 10],
    ['Óculos de Solda', '44212', 'DANNY', 'Proteção para soldagem e corte de materiais', 'unidade', 4],
  ]
  const insertEpi = db.prepare(`INSERT OR IGNORE INTO epis (nome, ca, fabricante, descricao, unidade, estoque_atual) VALUES (?, ?, ?, ?, ?, ?)`)
  episPadrao.forEach(e => insertEpi.run(...e))

  // EPIs são lista de referência — zera qualquer estoque pré-seedado
  try { db.prepare('UPDATE epis SET estoque_atual = 0').run() } catch {}

  // Seed materiais padrão para obras que ainda não têm nenhum material
  const obrasSemMateriais = db.prepare(`
    SELECT o.id FROM obras o
    LEFT JOIN materiais_estoque m ON m.obra_id = o.id
    WHERE m.id IS NULL
  `).all()
  if (obrasSemMateriais.length > 0) {
    const insertMatSeed = db.prepare(
      `INSERT INTO materiais_estoque (obra_id, nome, codigo, unidade, estoque_minimo, preco_unitario) VALUES (?, ?, ?, ?, ?, ?)`
    )
    obrasSemMateriais.forEach(o => {
      getMateriaisPadrao(o.id).forEach(m => {
        try { insertMatSeed.run(m.obra_id, m.nome, m.codigo, m.unidade, m.estoque_minimo, m.preco_unitario) } catch {}
      })
    })
  }
}

// Lista de materiais padrão para inserir em novas obras
function getMateriaisPadrao(obra_id) {
  return [
    { obra_id, nome: 'Cimento CP-II 50kg', codigo: 'CIM-50', unidade: 'saco', estoque_minimo: 10, preco_unitario: 34.90 },
    { obra_id, nome: 'Areia Média', codigo: 'AREIA-M', unidade: 'm³', estoque_minimo: 2, preco_unitario: 120.00 },
    { obra_id, nome: 'Brita nº1', codigo: 'BRITA-1', unidade: 'm³', estoque_minimo: 2, preco_unitario: 110.00 },
    { obra_id, nome: 'Tijolo Cerâmico 9x14x19cm', codigo: 'TIJOLO-9', unidade: 'milheiro', estoque_minimo: 1, preco_unitario: 650.00 },
    { obra_id, nome: 'Bloco de Concreto 14x19x39cm', codigo: 'BLOCO-14', unidade: 'unidade', estoque_minimo: 100, preco_unitario: 4.20 },
    { obra_id, nome: 'Vergalhão CA-50 10mm (12m)', codigo: 'VERG-10', unidade: 'barra', estoque_minimo: 20, preco_unitario: 38.00 },
    { obra_id, nome: 'Vergalhão CA-50 8mm (12m)', codigo: 'VERG-8', unidade: 'barra', estoque_minimo: 20, preco_unitario: 25.00 },
    { obra_id, nome: 'Arame Recozido', codigo: 'ARAME', unidade: 'kg', estoque_minimo: 5, preco_unitario: 12.00 },
    { obra_id, nome: 'Madeira Pinus 2.5x7.5cm (m)', codigo: 'MAD-PINUS', unidade: 'metro', estoque_minimo: 50, preco_unitario: 8.50 },
    { obra_id, nome: 'Tábua 2.5x15cm (m)', codigo: 'TAB-25', unidade: 'metro', estoque_minimo: 30, preco_unitario: 14.00 },
    { obra_id, nome: 'Cal Hidratada CH-III 20kg', codigo: 'CAL-20', unidade: 'saco', estoque_minimo: 5, preco_unitario: 18.00 },
    { obra_id, nome: 'Argamassa AC-II 20kg', codigo: 'ARG-20', unidade: 'saco', estoque_minimo: 5, preco_unitario: 28.00 },
    { obra_id, nome: 'Tinta Látex Acrílica (18L)', codigo: 'TINTA-18', unidade: 'lata', estoque_minimo: 2, preco_unitario: 189.00 },
    { obra_id, nome: 'Fio Elétrico 2.5mm² (rolo 100m)', codigo: 'FIO-25', unidade: 'rolo', estoque_minimo: 1, preco_unitario: 145.00 },
    { obra_id, nome: 'Tubo PVC 100mm (6m)', codigo: 'PVC-100', unidade: 'barra', estoque_minimo: 5, preco_unitario: 42.00 },
    { obra_id, nome: 'Prego 17x27 com cabeça', codigo: 'PREGO-17', unidade: 'kg', estoque_minimo: 2, preco_unitario: 11.00 },
    { obra_id, nome: 'Lona Plástica Preta 150 micras', codigo: 'LONA-150', unidade: 'm²', estoque_minimo: 10, preco_unitario: 3.50 },
  ]
}

module.exports = { setupDatabase, getDb, getMateriaisPadrao }
