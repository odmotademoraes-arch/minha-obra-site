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
    const { clienteId, email, nome } = await req.json()

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const { data: configs } = await supabase
      .from('config_sistema')
      .select('chave, valor')
      .in('chave', ['nome_sistema', 'email_remetente', 'whatsapp_suporte'])

    const cfg = Object.fromEntries((configs || []).map((c: any) => [c.chave, c.valor]))
    const nomeSistema = cfg.nome_sistema || 'Minha Obra'
    const remetente   = cfg.email_remetente || 'noreply@minhaobra.app'
    const whatsapp    = cfg.whatsapp_suporte || '5500000000000'

    const resendKey = Deno.env.get('RESEND_API_KEY')
    if (resendKey && email) {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: `${nomeSistema} <${remetente}>`,
          to: email,
          subject: `✅ Seu acesso ao ${nomeSistema} foi ativado!`,
          html: `
            <div style="font-family:Inter,sans-serif;max-width:520px;margin:0 auto;padding:32px;color:#1F2937">
              <div style="text-align:center;margin-bottom:32px">
                <div style="display:inline-block;background:#1E3A5F;padding:16px;border-radius:16px;margin-bottom:16px">
                  <span style="color:#F97316;font-size:28px">⛑️</span>
                </div>
                <h1 style="color:#1E3A5F;font-size:24px;font-weight:700;margin:0">${nomeSistema}</h1>
              </div>

              <h2 style="color:#059669;font-size:20px;margin-bottom:8px">Acesso ativado! 🎉</h2>
              <p style="margin-bottom:16px">Olá, <strong>${nome}</strong>!</p>
              <p style="margin-bottom:16px">
                Seu acesso ao <strong>${nomeSistema}</strong> foi ativado com sucesso.
                Você já pode entrar no sistema com o seu e-mail e senha.
              </p>

              <div style="background:#F5F7FA;border-radius:12px;padding:16px;margin-bottom:24px">
                <p style="margin:0;font-size:14px;color:#6B7280">
                  📲 Precisa de ajuda? Fale conosco no WhatsApp:<br/>
                  <a href="https://wa.me/${whatsapp}" style="color:#F97316;font-weight:600">wa.me/${whatsapp}</a>
                </p>
              </div>

              <p style="color:#9CA3AF;font-size:12px;margin:0">
                © ${new Date().getFullYear()} ${nomeSistema} — Tecnologia para quem constrói
              </p>
            </div>
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
