-- ═══════════════════════════════════════════════════════════
-- MINHA OBRA — Schema Supabase
-- Rodar no SQL Editor do Supabase: https://supabase.com/dashboard
-- ═══════════════════════════════════════════════════════════

-- ── Config do sistema ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS config_sistema (
  chave TEXT PRIMARY KEY,
  valor TEXT,
  descricao TEXT
);

INSERT INTO config_sistema (chave, valor, descricao) VALUES
  ('whatsapp_suporte',  '5587981198083',              'WhatsApp de suporte exibido na tela de espera'),
  ('email_dono',        'admminhaobra@gmail.com',     'E-mail do dono — recebe notificações de novos cadastros'),
  ('email_remetente',   'noreply@minhaobra.app',      'E-mail remetente para notificações'),
  ('mensagem_espera',   'Seu acesso está sendo configurado. Em breve você receberá a confirmação.', 'Mensagem na tela de espera'),
  ('nome_sistema',      'Minha Obra',                 'Nome do sistema'),
  ('versao',            '1.0.0',                      'Versão atual')
ON CONFLICT (chave) DO NOTHING;

-- ── Clientes pendentes ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS clientes_pendentes (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id       UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  nome             TEXT NOT NULL,
  email            TEXT NOT NULL,
  telefone         TEXT,
  empresa          TEXT,
  status           TEXT NOT NULL DEFAULT 'aguardando',
  -- 'aguardando' | 'ativo' | 'suspenso' | 'recusado'
  supabase_url     TEXT,
  supabase_anon_key TEXT,
  observacao_admin TEXT,
  ativado_em       TIMESTAMPTZ,
  criado_em        TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ── Licenças HWID (1 PC por vez) ─────────────────────────────
CREATE TABLE IF NOT EXISTS licencas (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  hwid           TEXT NOT NULL,
  pc_nome        TEXT,
  ultimo_acesso  TIMESTAMPTZ DEFAULT NOW(),
  ativo          BOOLEAN DEFAULT TRUE
);

-- ── Assinaturas / Planos ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS assinaturas (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id             UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  plano                  TEXT NOT NULL DEFAULT 'individual',
  -- 'individual' | 'profissional' | 'corporativo'
  status                 TEXT NOT NULL DEFAULT 'ativa',
  -- 'ativa' | 'cancelada' | 'vencida' | 'trial'
  analises_usadas_mes    INT DEFAULT 0,
  mes_referencia         TEXT,
  data_inicio            TIMESTAMPTZ DEFAULT NOW(),
  data_vencimento        TIMESTAMPTZ,
  stripe_subscription_id TEXT,
  stripe_customer_id     TEXT,
  criado_em              TIMESTAMPTZ DEFAULT NOW(),
  updated_at             TIMESTAMPTZ DEFAULT NOW()
);

-- ── Pacotes avulsos de análises IA ───────────────────────────
CREATE TABLE IF NOT EXISTS pacotes_avulsos (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id          UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  quantidade_comprada INT NOT NULL,
  quantidade_usada    INT DEFAULT 0,
  stripe_payment_id   TEXT,
  comprado_em         TIMESTAMPTZ DEFAULT NOW()
);

-- ── Registro de uso de IA ────────────────────────────────────
CREATE TABLE IF NOT EXISTS uso_ia (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id      UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  tipo            TEXT NOT NULL,
  -- 'epi' | 'materiais' | 'relatorio'
  tokens_usados   INT,
  custo_estimado  DECIMAL(10,4),
  obra_id         UUID,
  criado_em       TIMESTAMPTZ DEFAULT NOW()
);

-- ── Empresas (Plano Corporativo) ─────────────────────────────
CREATE TABLE IF NOT EXISTS empresas (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome      TEXT NOT NULL,
  cnpj      TEXT,
  dono_id   UUID REFERENCES auth.users(id),
  criado_em TIMESTAMPTZ DEFAULT NOW()
);

-- ── Membros da empresa ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS membros_empresa (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id       UUID REFERENCES empresas(id) ON DELETE CASCADE,
  usuario_id       UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  cargo_na_empresa TEXT DEFAULT 'engenheiro',
  -- 'dono' | 'engenheiro_chefe' | 'engenheiro' | 'tecnico' | 'rh' | 'visualizador'
  ativo            BOOLEAN DEFAULT TRUE,
  criado_em        TIMESTAMPTZ DEFAULT NOW()
);

-- ── Convites ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS convites (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id      UUID REFERENCES empresas(id) ON DELETE CASCADE,
  email_convidado TEXT NOT NULL,
  cargo           TEXT DEFAULT 'engenheiro',
  token           TEXT UNIQUE DEFAULT gen_random_uuid()::TEXT,
  status          TEXT DEFAULT 'pendente',
  expira_em       TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
  criado_em       TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY
-- ═══════════════════════════════════════════════════════════

ALTER TABLE clientes_pendentes  ENABLE ROW LEVEL SECURITY;
ALTER TABLE licencas             ENABLE ROW LEVEL SECURITY;
ALTER TABLE assinaturas          ENABLE ROW LEVEL SECURITY;
ALTER TABLE pacotes_avulsos      ENABLE ROW LEVEL SECURITY;
ALTER TABLE uso_ia               ENABLE ROW LEVEL SECURITY;
ALTER TABLE empresas             ENABLE ROW LEVEL SECURITY;
ALTER TABLE membros_empresa      ENABLE ROW LEVEL SECURITY;
ALTER TABLE config_sistema       ENABLE ROW LEVEL SECURITY;

-- config_sistema: leitura pública (anon pode ler), escrita apenas service_role
CREATE POLICY "config_leitura_publica" ON config_sistema
  FOR SELECT USING (true);

-- clientes_pendentes: usuário vê/edita apenas o próprio
CREATE POLICY "cliente_proprio_select" ON clientes_pendentes
  FOR SELECT USING (auth.uid() = usuario_id);

CREATE POLICY "cliente_proprio_insert" ON clientes_pendentes
  FOR INSERT WITH CHECK (auth.uid() = usuario_id);

-- licencas: usuário gerencia a própria licença
CREATE POLICY "licenca_propria" ON licencas
  FOR ALL USING (auth.uid() = usuario_id);

-- assinaturas: usuário vê a própria
CREATE POLICY "assinatura_propria" ON assinaturas
  FOR SELECT USING (auth.uid() = usuario_id);

-- pacotes_avulsos: usuário vê os próprios
CREATE POLICY "pacotes_proprios" ON pacotes_avulsos
  FOR SELECT USING (auth.uid() = usuario_id);

-- uso_ia: usuário registra e vê o próprio uso
CREATE POLICY "uso_ia_proprio" ON uso_ia
  FOR ALL USING (auth.uid() = usuario_id);

-- empresas: dono gerencia
CREATE POLICY "empresa_dono" ON empresas
  FOR ALL USING (auth.uid() = dono_id);

-- membros: membros ativos veem a empresa
CREATE POLICY "membro_ve_empresa" ON membros_empresa
  FOR SELECT USING (
    auth.uid() = usuario_id
    OR EXISTS (
      SELECT 1 FROM empresas WHERE id = empresa_id AND dono_id = auth.uid()
    )
  );

-- ═══════════════════════════════════════════════════════════
-- FUNÇÕES AUXILIARES
-- ═══════════════════════════════════════════════════════════

-- Reseta análises mensais no dia 1 (rodar como cron no Supabase)
CREATE OR REPLACE FUNCTION resetar_analises_mensais()
RETURNS void AS $$
BEGIN
  UPDATE assinaturas
  SET analises_usadas_mes = 0,
      mes_referencia = TO_CHAR(NOW(), 'YYYY-MM')
  WHERE mes_referencia != TO_CHAR(NOW(), 'YYYY-MM')
     OR mes_referencia IS NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ═══════════════════════════════════════════════════════════
-- ADDENDUM v2 — Sistema de Convites e Membros
-- Rodar APÓS o schema principal
-- ═══════════════════════════════════════════════════════════

-- Remove tabelas antigas com empresa_id (substitui pelas v2 com dono_id)
DROP TABLE IF EXISTS convites CASCADE;
DROP TABLE IF EXISTS membros_empresa CASCADE;

-- ── Membros da equipe (estrutura simplificada com dono_id) ────
CREATE TABLE IF NOT EXISTS membros_empresa (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dono_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  usuario_id  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cargo       TEXT NOT NULL DEFAULT 'engenheiro',
  -- 'engenheiro_chefe' | 'engenheiro' | 'tecnico' | 'rh' | 'visualizador'
  ativo       BOOLEAN DEFAULT TRUE,
  entrou_em   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(dono_id, usuario_id)
);

-- ── Convites de equipe ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS convites (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dono_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email_convidado TEXT NOT NULL,
  cargo           TEXT NOT NULL DEFAULT 'engenheiro',
  token           TEXT UNIQUE NOT NULL DEFAULT gen_random_uuid()::TEXT,
  status          TEXT NOT NULL DEFAULT 'pendente',
  -- 'pendente' | 'aceito' | 'expirado'
  criado_em       TIMESTAMPTZ DEFAULT NOW(),
  expira_em       TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days')
);

-- RLS ────────────────────────────────────────────────────────
ALTER TABLE membros_empresa ENABLE ROW LEVEL SECURITY;
ALTER TABLE convites         ENABLE ROW LEVEL SECURITY;

-- membros_empresa: dono gerencia todos os membros da sua equipe
CREATE POLICY "membro_dono_all" ON membros_empresa
  FOR ALL USING (auth.uid() = dono_id);

-- membros_empresa: membro vê o próprio registro
CREATE POLICY "membro_proprio_select" ON membros_empresa
  FOR SELECT USING (auth.uid() = usuario_id);

-- membros_empresa: permite INSERT no aceite de convite (qualquer autenticado)
CREATE POLICY "membro_insert_convite" ON membros_empresa
  FOR INSERT WITH CHECK (auth.uid() = usuario_id);

-- convites: dono gerencia os seus
CREATE POLICY "convite_dono_all" ON convites
  FOR ALL USING (auth.uid() = dono_id);

-- convites: qualquer autenticado pode ler pelo token (para aceitar o convite)
CREATE POLICY "convite_leitura_token" ON convites
  FOR SELECT USING (true);

-- convites: usuário autenticado pode atualizar status ao aceitar
CREATE POLICY "convite_aceitar" ON convites
  FOR UPDATE USING (true);

-- Limites de membros por plano (helper function)
CREATE OR REPLACE FUNCTION limite_membros(p_plano TEXT)
RETURNS INT AS $$
BEGIN
  RETURN CASE p_plano
    WHEN 'profissional' THEN 2
    WHEN 'corporativo'  THEN 999
    ELSE 1
  END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;
