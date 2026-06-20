-- ═══════════════════════════════════════════════════════════
-- MINHA OBRA — Schema Supabase COMPLETO v2.0
-- Rodar no SQL Editor: https://supabase.com/dashboard/project/nylhawkjfbbeoqbmczmm/sql
-- ═══════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════
-- CONFIGURAÇÕES DO SISTEMA
-- ═══════════════════════════════════════════
CREATE TABLE IF NOT EXISTS config_sistema (
  chave     TEXT PRIMARY KEY,
  valor     TEXT,
  descricao TEXT
);

INSERT INTO config_sistema VALUES
('whatsapp_suporte', '5587981198083', 'WhatsApp exibido na tela de espera'),
('email_dono', 'admminhaobra@gmail.com', 'E-mail que recebe notificações'),
('mensagem_espera', 'Seu acesso está sendo configurado. Em breve você receberá a confirmação.', 'Mensagem da tela de espera'),
('email_remetente', 'noreply@minhaobra.com.br', 'E-mail remetente'),
('nome_sistema', 'Minha Obra', 'Nome do sistema'),
('versao', '1.0.0', 'Versão atual')
ON CONFLICT (chave) DO NOTHING;

-- ═══════════════════════════════════════════
-- CLIENTES E ATIVAÇÃO
-- ═══════════════════════════════════════════
CREATE TABLE IF NOT EXISTS clientes_pendentes (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id     UUID REFERENCES auth.users(id),
  nome           TEXT NOT NULL,
  email          TEXT NOT NULL,
  telefone       TEXT,
  empresa        TEXT,
  status         TEXT DEFAULT 'aguardando',
  supabase_url   TEXT,
  supabase_anon_key TEXT,
  criado_em      TIMESTAMPTZ DEFAULT NOW(),
  ativado_em     TIMESTAMPTZ
);

-- ═══════════════════════════════════════════
-- ASSINATURAS E PLANOS
-- ═══════════════════════════════════════════
CREATE TABLE IF NOT EXISTS assinaturas (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id             UUID REFERENCES auth.users(id),
  plano                  TEXT,
  status                 TEXT DEFAULT 'trial',
  analises_usadas_mes    INT DEFAULT 0,
  mes_referencia         TEXT,
  trial_inicio           TIMESTAMPTZ DEFAULT NOW(),
  trial_fim              TIMESTAMPTZ DEFAULT NOW() + INTERVAL '15 days',
  data_inicio            TIMESTAMPTZ,
  data_vencimento        TIMESTAMPTZ,
  stripe_subscription_id TEXT,
  stripe_customer_id     TEXT
);

CREATE TABLE IF NOT EXISTS pacotes_avulsos (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id          UUID REFERENCES auth.users(id),
  quantidade_comprada INT,
  quantidade_usada    INT DEFAULT 0,
  stripe_payment_id   TEXT,
  comprado_em         TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════
-- LICENÇAS (1 PC POR VEZ)
-- ═══════════════════════════════════════════
CREATE TABLE IF NOT EXISTS licencas (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id    UUID REFERENCES auth.users(id) UNIQUE,
  hwid          TEXT NOT NULL,
  pc_nome       TEXT,
  ultimo_acesso TIMESTAMPTZ DEFAULT NOW(),
  ativo         BOOLEAN DEFAULT TRUE
);

-- ═══════════════════════════════════════════
-- EMPRESAS E EQUIPE
-- ═══════════════════════════════════════════
CREATE TABLE IF NOT EXISTS empresas (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome       TEXT NOT NULL,
  cnpj       TEXT,
  dono_id    UUID REFERENCES auth.users(id),
  criado_em  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS membros_empresa (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id  UUID REFERENCES empresas(id),
  usuario_id  UUID REFERENCES auth.users(id),
  cargo       TEXT,
  ativo       BOOLEAN DEFAULT TRUE,
  entrou_em   TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS convites (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id       UUID REFERENCES empresas(id),
  dono_id          UUID REFERENCES auth.users(id),
  email_convidado  TEXT NOT NULL,
  cargo            TEXT NOT NULL,
  token            TEXT UNIQUE NOT NULL,
  status           TEXT DEFAULT 'pendente',
  criado_em        TIMESTAMPTZ DEFAULT NOW(),
  expira_em        TIMESTAMPTZ DEFAULT NOW() + INTERVAL '7 days'
);

-- ═══════════════════════════════════════════
-- OBRAS
-- ═══════════════════════════════════════════
CREATE TABLE IF NOT EXISTS obras (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id            UUID REFERENCES auth.users(id),
  empresa_id            UUID REFERENCES empresas(id),
  nome                  TEXT NOT NULL,
  tipo                  TEXT,
  endereco              TEXT,
  cidade                TEXT,
  estado                TEXT,
  cep                   TEXT,
  art_rrt               TEXT,
  area_m2               DECIMAL(10,2),
  valor_contratado      DECIMAL(15,2),
  orcamento_total       DECIMAL(15,2),
  engenheiro_responsavel TEXT,
  cliente_contratante   TEXT,
  status                TEXT DEFAULT 'planejamento',
  progresso_pct         INT DEFAULT 0,
  data_inicio           DATE,
  data_prevista         DATE,
  data_conclusao        DATE,
  descricao             TEXT,
  criado_em             TIMESTAMPTZ DEFAULT NOW(),
  atualizado_em         TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════
-- FUNCIONÁRIOS
-- ═══════════════════════════════════════════
CREATE TABLE IF NOT EXISTS funcionarios (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id          UUID REFERENCES auth.users(id),
  nome                TEXT NOT NULL,
  cpf                 TEXT,
  rg                  TEXT,
  data_nascimento     DATE,
  tipo_sanguineo      TEXT,
  cargo               TEXT NOT NULL,
  cargo_personalizado TEXT,
  matricula           TEXT,
  email               TEXT,
  celular             TEXT,
  contato_emergencia  TEXT,
  telefone_emergencia TEXT,
  foto_url            TEXT,
  data_admissao       DATE,
  status              TEXT DEFAULT 'ativo',
  criado_em           TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS alocacoes (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  funcionario_id UUID REFERENCES funcionarios(id),
  obra_id        UUID REFERENCES obras(id),
  data_inicio    DATE,
  data_fim       DATE,
  ativo          BOOLEAN DEFAULT TRUE
);

-- ═══════════════════════════════════════════
-- CONTROLE DE PONTO
-- ═══════════════════════════════════════════
CREATE TABLE IF NOT EXISTS registros_ponto (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  funcionario_id    UUID REFERENCES funcionarios(id),
  obra_id           UUID REFERENCES obras(id),
  data              DATE NOT NULL,
  entrada           TIME,
  saida             TIME,
  horas_trabalhadas DECIMAL(4,2),
  horas_extras      DECIMAL(4,2),
  observacao        TEXT,
  criado_em         TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════
-- FINANCEIRO
-- ═══════════════════════════════════════════
CREATE TABLE IF NOT EXISTS despesas (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  obra_id         UUID REFERENCES obras(id),
  usuario_id      UUID REFERENCES auth.users(id),
  categoria       TEXT,
  descricao       TEXT NOT NULL,
  fornecedor      TEXT,
  valor           DECIMAL(15,2) NOT NULL,
  data_lancamento DATE DEFAULT CURRENT_DATE,
  nota_fiscal     TEXT,
  comprovante_url TEXT,
  criado_em       TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════
-- CRONOGRAMA
-- ═══════════════════════════════════════════
CREATE TABLE IF NOT EXISTS cronograma_etapas (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  obra_id              UUID REFERENCES obras(id),
  nome                 TEXT NOT NULL,
  ordem                INT,
  progresso_pct        INT DEFAULT 0,
  data_inicio_prevista DATE,
  data_fim_prevista    DATE,
  data_inicio_real     DATE,
  data_fim_real        DATE,
  status               TEXT DEFAULT 'pendente'
);

-- ═══════════════════════════════════════════
-- DIÁRIO DE OBRA (RDO)
-- ═══════════════════════════════════════════
CREATE TABLE IF NOT EXISTS rdos (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  obra_id            UUID REFERENCES obras(id),
  usuario_id         UUID REFERENCES auth.users(id),
  data               DATE NOT NULL,
  clima              TEXT,
  atividades         TEXT,
  ocorrencias        TEXT,
  materiais_recebidos TEXT,
  assinatura_url     TEXT,
  bloqueado          BOOLEAN DEFAULT FALSE,
  criado_em          TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS rdo_funcionarios (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rdo_id         UUID REFERENCES rdos(id),
  funcionario_id UUID REFERENCES funcionarios(id)
);

CREATE TABLE IF NOT EXISTS rdo_fotos (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rdo_id    UUID REFERENCES rdos(id),
  url       TEXT NOT NULL,
  legenda   TEXT,
  criado_em TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════
-- PROJETOS E PLANTAS
-- ═══════════════════════════════════════════
CREATE TABLE IF NOT EXISTS projetos_arquivos (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  obra_id    UUID REFERENCES obras(id),
  nome       TEXT NOT NULL,
  categoria  TEXT,
  tipo       TEXT,
  url        TEXT,
  versao     TEXT DEFAULT 'v1',
  criado_em  TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════
-- SAÚDE E SEGURANÇA
-- ═══════════════════════════════════════════
CREATE TABLE IF NOT EXISTS exames_medicos (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  funcionario_id UUID REFERENCES funcionarios(id),
  tipo           TEXT NOT NULL,
  medico         TEXT,
  clinica        TEXT,
  data_realizacao DATE,
  data_validade  DATE,
  resultado      TEXT,
  arquivo_url    TEXT,
  criado_em      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS epis (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id       UUID REFERENCES auth.users(id),
  nome             TEXT NOT NULL,
  numero_ca        TEXT,
  fabricante       TEXT,
  tipos_risco      TEXT[],
  quantidade_estoque INT DEFAULT 0,
  validade_ca      DATE,
  foto_url         TEXT,
  status           TEXT DEFAULT 'ativo',
  criado_em        TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS entregas_epi (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  epi_id         UUID REFERENCES epis(id),
  funcionario_id UUID REFERENCES funcionarios(id),
  quantidade     INT NOT NULL,
  data_entrega   DATE DEFAULT CURRENT_DATE,
  numero_serie   TEXT,
  observacoes    TEXT,
  assinatura_url TEXT,
  criado_em      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS acidentes (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  obra_id             UUID REFERENCES obras(id),
  tipo                TEXT,
  data_ocorrencia     TIMESTAMPTZ,
  local               TEXT,
  descricao           TEXT,
  causa_raiz          TEXT,
  medidas_corretivas  TEXT,
  criado_em           TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS acidente_funcionarios (
  acidente_id    UUID REFERENCES acidentes(id),
  funcionario_id UUID REFERENCES funcionarios(id),
  PRIMARY KEY (acidente_id, funcionario_id)
);

CREATE TABLE IF NOT EXISTS treinamentos (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  funcionario_id UUID REFERENCES funcionarios(id),
  nr             TEXT NOT NULL,
  data_conclusao DATE,
  data_validade  DATE,
  certificado_url TEXT,
  criado_em      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS checklists (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  obra_id          UUID REFERENCES obras(id),
  usuario_id       UUID REFERENCES auth.users(id),
  data             DATE DEFAULT CURRENT_DATE,
  itens            JSONB,
  tem_nao_conforme BOOLEAN DEFAULT FALSE,
  criado_em        TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════
-- ESTOQUE DE MATERIAIS
-- ═══════════════════════════════════════════
CREATE TABLE IF NOT EXISTS materiais_estoque (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id       UUID REFERENCES auth.users(id),
  obra_id          UUID REFERENCES obras(id),
  nome             TEXT NOT NULL,
  codigo           TEXT,
  unidade          TEXT DEFAULT 'unidade',
  fornecedor_padrao TEXT,
  estoque_atual    INT DEFAULT 0,
  estoque_minimo   INT DEFAULT 0,
  preco_unitario   DECIMAL(15,2),
  criado_em        TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS movimentacoes_estoque (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  material_id       UUID REFERENCES materiais_estoque(id),
  obra_id           UUID REFERENCES obras(id),
  tipo              TEXT,
  quantidade        INT NOT NULL,
  responsavel       TEXT,
  finalidade        TEXT,
  nota_fiscal       TEXT,
  data_movimentacao DATE DEFAULT CURRENT_DATE,
  criado_em         TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════
-- IA
-- ═══════════════════════════════════════════
CREATE TABLE IF NOT EXISTS uso_ia (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id      UUID REFERENCES auth.users(id),
  tipo            TEXT,
  tokens_usados   INT,
  custo_estimado  DECIMAL(10,4),
  obra_id         UUID REFERENCES obras(id),
  criado_em       TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS analises_epi_ia (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id   UUID REFERENCES auth.users(id),
  obra_id      UUID REFERENCES obras(id),
  foto_url     TEXT,
  resultado    JSONB,
  status_geral TEXT,
  criado_em    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS analises_materiais_ia (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id     UUID REFERENCES auth.users(id),
  obra_id        UUID REFERENCES obras(id),
  foto_url       TEXT,
  tipo_elemento  TEXT,
  largura        DECIMAL(8,2),
  altura         DECIMAL(8,2),
  espessura      DECIMAL(8,2),
  finalidade     TEXT,
  observacoes    TEXT,
  resultado      JSONB,
  criado_em      TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════
-- GALERIA DE FOTOS
-- ═══════════════════════════════════════════
CREATE TABLE IF NOT EXISTS fotos_obra (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  obra_id   UUID REFERENCES obras(id),
  usuario_id UUID REFERENCES auth.users(id),
  url       TEXT NOT NULL,
  legenda   TEXT,
  etapa     TEXT,
  criado_em TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════
-- AUDIT LOG / SYNC
-- ═══════════════════════════════════════════
CREATE TABLE IF NOT EXISTS audit_log (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id       UUID REFERENCES auth.users(id),
  acao             TEXT,
  tabela           TEXT,
  registro_id      UUID,
  dados_anteriores JSONB,
  dados_novos      JSONB,
  criado_em        TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sync_queue (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id    UUID REFERENCES auth.users(id),
  operacao      TEXT,
  tabela        TEXT,
  dados         JSONB,
  sincronizado  BOOLEAN DEFAULT FALSE,
  criado_em     TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════
-- RLS — ROW LEVEL SECURITY
-- ═══════════════════════════════════════════
ALTER TABLE config_sistema         ENABLE ROW LEVEL SECURITY;
ALTER TABLE clientes_pendentes     ENABLE ROW LEVEL SECURITY;
ALTER TABLE assinaturas            ENABLE ROW LEVEL SECURITY;
ALTER TABLE pacotes_avulsos        ENABLE ROW LEVEL SECURITY;
ALTER TABLE licencas               ENABLE ROW LEVEL SECURITY;
ALTER TABLE empresas               ENABLE ROW LEVEL SECURITY;
ALTER TABLE membros_empresa        ENABLE ROW LEVEL SECURITY;
ALTER TABLE convites               ENABLE ROW LEVEL SECURITY;
ALTER TABLE obras                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE funcionarios           ENABLE ROW LEVEL SECURITY;
ALTER TABLE alocacoes              ENABLE ROW LEVEL SECURITY;
ALTER TABLE registros_ponto        ENABLE ROW LEVEL SECURITY;
ALTER TABLE despesas               ENABLE ROW LEVEL SECURITY;
ALTER TABLE cronograma_etapas      ENABLE ROW LEVEL SECURITY;
ALTER TABLE rdos                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE rdo_funcionarios       ENABLE ROW LEVEL SECURITY;
ALTER TABLE rdo_fotos              ENABLE ROW LEVEL SECURITY;
ALTER TABLE projetos_arquivos      ENABLE ROW LEVEL SECURITY;
ALTER TABLE exames_medicos         ENABLE ROW LEVEL SECURITY;
ALTER TABLE epis                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE entregas_epi           ENABLE ROW LEVEL SECURITY;
ALTER TABLE acidentes              ENABLE ROW LEVEL SECURITY;
ALTER TABLE treinamentos           ENABLE ROW LEVEL SECURITY;
ALTER TABLE checklists             ENABLE ROW LEVEL SECURITY;
ALTER TABLE materiais_estoque      ENABLE ROW LEVEL SECURITY;
ALTER TABLE movimentacoes_estoque  ENABLE ROW LEVEL SECURITY;
ALTER TABLE uso_ia                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE analises_epi_ia        ENABLE ROW LEVEL SECURITY;
ALTER TABLE analises_materiais_ia  ENABLE ROW LEVEL SECURITY;
ALTER TABLE fotos_obra             ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log              ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_queue             ENABLE ROW LEVEL SECURITY;

-- Config: todos leem, só admin edita
CREATE POLICY "leitura config" ON config_sistema FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin config"   ON config_sistema FOR ALL    TO authenticated USING (auth.jwt() ->> 'email' = 'admminhaobra@gmail.com');

-- Clientes pendentes
CREATE POLICY "usuario ve cadastro"     ON clientes_pendentes FOR SELECT TO authenticated USING (auth.uid() = usuario_id OR auth.jwt() ->> 'email' = 'admminhaobra@gmail.com');
CREATE POLICY "usuario insere cadastro" ON clientes_pendentes FOR INSERT TO authenticated WITH CHECK (auth.uid() = usuario_id);
CREATE POLICY "admin atualiza cliente"  ON clientes_pendentes FOR UPDATE TO authenticated USING (auth.jwt() ->> 'email' = 'admminhaobra@gmail.com');

-- Assinaturas
CREATE POLICY "usuario ve assinatura"     ON assinaturas FOR SELECT TO authenticated USING (auth.uid() = usuario_id OR auth.jwt() ->> 'email' = 'admminhaobra@gmail.com');
CREATE POLICY "usuario insere assinatura" ON assinaturas FOR INSERT TO authenticated WITH CHECK (auth.uid() = usuario_id);
CREATE POLICY "admin atualiza assinatura" ON assinaturas FOR UPDATE TO authenticated USING (auth.jwt() ->> 'email' = 'admminhaobra@gmail.com');

-- Tabelas com usuario_id direto
DO $$ DECLARE t TEXT;
BEGIN FOR t IN SELECT unnest(ARRAY[
  'pacotes_avulsos','licencas','obras','funcionarios','despesas','rdos',
  'projetos_arquivos','epis','acidentes','checklists','materiais_estoque',
  'uso_ia','analises_epi_ia','analises_materiais_ia','fotos_obra',
  'audit_log','sync_queue'
]) LOOP
  EXECUTE format('CREATE POLICY "usuario acessa proprios dados %s" ON %I FOR ALL TO authenticated USING (auth.uid() = usuario_id)', t, t);
END LOOP; END $$;

-- Empresas
CREATE POLICY "membro ve empresa" ON empresas FOR SELECT TO authenticated USING (
  dono_id = auth.uid() OR
  EXISTS (SELECT 1 FROM membros_empresa WHERE empresa_id = empresas.id AND usuario_id = auth.uid())
);
CREATE POLICY "dono cria empresa" ON empresas FOR INSERT TO authenticated WITH CHECK (dono_id = auth.uid());
CREATE POLICY "dono edita empresa" ON empresas FOR UPDATE TO authenticated USING (dono_id = auth.uid());

-- Storage bucket para fotos de obras
INSERT INTO storage.buckets (id, name, public) VALUES ('fotos-obras', 'fotos-obras', true) ON CONFLICT DO NOTHING;

CREATE POLICY "usuario faz upload fotos" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'fotos-obras' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "fotos sao publicas" ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'fotos-obras');

CREATE POLICY "usuario deleta propria foto" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'fotos-obras' AND (storage.foldername(name))[1] = auth.uid()::text);
