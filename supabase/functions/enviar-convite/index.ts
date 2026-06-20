import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  try {
    const { token, emailConvidado, cargo, nomeDonoRaw } = await req.json()

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const { data: cfg } = await supabase
      .from('config_sistema')
      .select('chave, valor')
      .in('chave', ['nome_sistema', 'email_remetente'])

    const configMap = Object.fromEntries((cfg || []).map((c: any) => [c.chave, c.valor]))
    const nomeSistema = configMap.nome_sistema || 'Minha Obra'
    const emailRemetente = configMap.email_remetente || `noreply@minhaobra.app`

    const nomeDono = nomeDonoRaw || 'Um usuário'
    const cargoLabel: Record<string, string> = {
      engenheiro_chefe: 'Engenheiro Chefe',
      engenheiro: 'Engenheiro',
      tecnico: 'Técnico de Segurança',
      rh: 'RH',
      visualizador: 'Visualizador',
    }

    // Link de convite — para app desktop o usuário copia o token
    // Para futura versão web: https://app.minhaobra.com.br/convite?token=TOKEN
    const linkConvite = `minha-obra://convite?token=${token}`
    const tokenExibido = token

    const resendKey = Deno.env.get('RESEND_API_KEY')
    if (resendKey) {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: `${nomeSistema} <${emailRemetente}>`,
          to: emailConvidado,
          subject: `Você foi convidado para o ${nomeSistema}`,
          html: `
            <div style="font-family:Inter,Arial,sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;background:#fff;border-radius:16px;border:1px solid #e5e7eb">
              <div style="text-align:center;margin-bottom:28px">
                <div style="display:inline-flex;align-items:center;justify-content:center;width:56px;height:56px;background:#F97316;border-radius:14px;margin-bottom:12px">
                  <span style="font-size:24px">🏗️</span>
                </div>
                <h1 style="font-size:22px;font-weight:700;color:#1e293b;margin:0">${nomeSistema}</h1>
              </div>

              <h2 style="font-size:18px;color:#1e293b;margin:0 0 8px">Você foi convidado!</h2>
              <p style="color:#64748b;font-size:15px;margin:0 0 24px;line-height:1.6">
                <strong>${nomeDono}</strong> convidou você para colaborar no <strong>${nomeSistema}</strong>
                como <strong>${cargoLabel[cargo] || cargo}</strong>.
              </p>

              <p style="color:#64748b;font-size:14px;margin:0 0 12px">
                Abra o <strong>${nomeSistema}</strong> e clique em <strong>"Tenho um convite"</strong>
                na tela de login, depois cole o código abaixo:
              </p>

              <div style="background:#f8fafc;border:2px dashed #e2e8f0;border-radius:12px;padding:16px;text-align:center;margin:0 0 24px">
                <p style="font-size:11px;color:#94a3b8;margin:0 0 6px;text-transform:uppercase;letter-spacing:.08em">Seu código de convite</p>
                <code style="font-size:13px;color:#1e3a5f;word-break:break-all;font-weight:600">${tokenExibido}</code>
              </div>

              <p style="color:#94a3b8;font-size:12px;text-align:center;margin:0">
                Este convite expira em 7 dias. Se você não esperava este e-mail, pode ignorá-lo.
              </p>
            </div>
          `
        })
      })
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...cors, 'Content-Type': 'application/json' }
    })
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...cors, 'Content-Type': 'application/json' }
    })
  }
})
