import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const LIMITES: Record<string, number> = {
  individual: 0,
  profissional: 100,
  corporativo: 500,
  gov: 999999,
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-hwid',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const authHeader = req.headers.get('Authorization')
  const hwid       = req.headers.get('X-HWID')
  if (!authHeader) return new Response('Unauthorized', { status: 401, headers: corsHeaders })

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPA_SERVICE_ROLE_KEY')!
  )

  const { data: { user }, error } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''))
  if (error || !user) return new Response('Unauthorized', { status: 401, headers: corsHeaders })

  // Validar HWID (pular se não enviado — permite uso via web admin)
  if (hwid) {
    const { data: licenca } = await supabase
      .from('licencas').select('hwid').eq('usuario_id', user.id).single()
    if (!licenca || licenca.hwid !== hwid) {
      return new Response('Licença inválida', { status: 403, headers: corsHeaders })
    }
  }

  // Verificar plano e saldo
  const { data: assinatura } = await supabase
    .from('assinaturas')
    .select('plano, status, analises_usadas_mes, mes_referencia, trial_fim')
    .eq('usuario_id', user.id)
    .single()

  const agora    = new Date()
  const mesAtual = `${agora.getFullYear()}-${agora.getMonth() + 1}`
  const emTrial  = assinatura?.status === 'trial' && new Date(assinatura.trial_fim) > agora
  const plano    = assinatura?.plano || 'individual'
  const limite   = emTrial ? 10 : (LIMITES[plano] ?? 0)

  if (limite === 0) {
    return new Response(
      JSON.stringify({ error: 'Plano sem acesso à IA' }),
      { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  // Reset mensal
  let usados = assinatura?.analises_usadas_mes || 0
  if (assinatura?.mes_referencia !== mesAtual) {
    usados = 0
    await supabase.from('assinaturas')
      .update({ analises_usadas_mes: 0, mes_referencia: mesAtual })
      .eq('usuario_id', user.id)
  }

  if (usados >= limite) {
    // Tentar pacote avulso
    const { data: pacotes } = await supabase
      .from('pacotes_avulsos')
      .select('*')
      .eq('usuario_id', user.id)
      .filter('quantidade_usada', 'lt', 'quantidade_comprada')
      .order('comprado_em', { ascending: true })
      .limit(1)

    if (!pacotes?.length) {
      return new Response(
        JSON.stringify({ error: 'Saldo de análises esgotado' }),
        { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    await supabase.from('pacotes_avulsos')
      .update({ quantidade_usada: pacotes[0].quantidade_usada + 1 })
      .eq('id', pacotes[0].id)
  } else {
    await supabase.from('assinaturas')
      .update({ analises_usadas_mes: usados + 1 })
      .eq('usuario_id', user.id)
  }

  const { tipo, imagemBase64, mediaType, campos } = await req.json()

  const prompt = tipo === 'epi'
    ? `Você é especialista em segurança do trabalho (NR-6). Analise a foto e identifique os trabalhadores e seus EPIs.
Retorne SOMENTE JSON válido sem markdown:
{"trabalhadores":[{"id":1,"descricao":"","epis":{"capacete":true,"colete_refletivo":true,"bota_seguranca":true,"luvas":true,"oculos_protecao":true,"mascara":true,"cinto_seguranca":true},"status":"CONFORME","observacoes":""}],"status_geral":"CONFORME","recomendacoes":""}`
    : tipo === 'materiais'
    ? `Você é engenheiro civil especialista em orçamentos no Brasil. Analise a foto e os dados fornecidos.
DADOS: Tipo: ${campos?.tipo_elemento}, Largura: ${campos?.largura}m, Altura: ${campos?.altura}m, Espessura: ${campos?.espessura || 'não informada'}, Finalidade: ${campos?.finalidade}, Observações: ${campos?.observacoes || 'nenhuma'}
Retorne SOMENTE JSON válido sem markdown:
{"elemento_identificado":"","area_bruta_m2":0,"area_liquida_m2":0,"materiais":[{"nome":"","quantidade":0,"unidade":"","observacao":""}],"custo_estimado_min":0,"custo_estimado_max":0,"observacoes_tecnicas":""}`
    : `Você é engenheiro civil redator técnico. Redija um relatório técnico formal em português do Brasil.
DADOS DA OBRA: ${JSON.stringify(campos)}
Inclua: identificação, resumo executivo, status por etapa, situação financeira, equipe, ocorrências e próximas etapas.`

  const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': Deno.env.get('ANTHROPIC_API_KEY')!,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 2000,
      messages: [{
        role: 'user',
        content: imagemBase64 ? [
          { type: 'image', source: { type: 'base64', media_type: mediaType || 'image/jpeg', data: imagemBase64 } },
          { type: 'text', text: prompt },
        ] : [{ type: 'text', text: prompt }],
      }],
    }),
  })

  const resultado = await anthropicRes.json()
  const tokens    = (resultado.usage?.input_tokens || 0) + (resultado.usage?.output_tokens || 0)
  const custo     = tokens * 0.000003

  await supabase.from('uso_ia').insert({
    usuario_id: user.id,
    tipo,
    tokens_usados: tokens,
    custo_estimado: custo,
    obra_id: campos?.obra_id || null,
  })

  return new Response(JSON.stringify(resultado), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
