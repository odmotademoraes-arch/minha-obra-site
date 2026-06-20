import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { nome, email, telefone, empresa } = await req.json()

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Busca configs do sistema
    const { data: configs } = await supabase
      .from('config_sistema')
      .select('chave, valor')
      .in('chave', ['email_dono', 'nome_sistema'])

    const cfg = Object.fromEntries((configs || []).map((c: any) => [c.chave, c.valor]))
    const emailDono = cfg.email_dono || 'admminhaobra@gmail.com'
    const nomeSistema = cfg.nome_sistema || 'Minha Obra'

    // Envia e-mail via Resend (configurar RESEND_API_KEY nas secrets do Supabase)
    const resendKey = Deno.env.get('RESEND_API_KEY')
    if (resendKey) {
      const dataHora = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: `${nomeSistema} <noreply@minhaobra.app>`,
          to: emailDono,
          subject: `[${nomeSistema}] Novo cadastro aguardando ativação`,
          html: `
            <h2>Novo cadastro no ${nomeSistema}</h2>
            <table style="border-collapse:collapse;width:100%;max-width:500px">
              <tr><td style="padding:8px;font-weight:bold;background:#f4f4f4">Nome</td><td style="padding:8px">${nome}</td></tr>
              <tr><td style="padding:8px;font-weight:bold;background:#f4f4f4">E-mail</td><td style="padding:8px">${email}</td></tr>
              <tr><td style="padding:8px;font-weight:bold;background:#f4f4f4">Telefone</td><td style="padding:8px">${telefone || '—'}</td></tr>
              <tr><td style="padding:8px;font-weight:bold;background:#f4f4f4">Empresa</td><td style="padding:8px">${empresa || '—'}</td></tr>
              <tr><td style="padding:8px;font-weight:bold;background:#f4f4f4">Data/Hora</td><td style="padding:8px">${dataHora}</td></tr>
            </table>
            <p style="margin-top:20px">
              <a href="https://admin.minhaobra.app/clientes" style="background:#F97316;color:white;padding:10px 20px;text-decoration:none;border-radius:6px">
                Ativar no Painel Admin
              </a>
            </p>
          `
        })
      })
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
