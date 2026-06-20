import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  try {
    const { donoId, nomeConvidado, emailConvidado, cargo } = await req.json()

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Busca email do dono
    const { data: donoData } = await supabase.auth.admin.getUserById(donoId)
    const emailDono = donoData?.user?.email
    if (!emailDono) throw new Error('Dono não encontrado')

    // Busca nome do dono
    const { data: cliente } = await supabase
      .from('clientes_pendentes')
      .select('nome')
      .eq('usuario_id', donoId)
      .single()

    const { data: cfg } = await supabase
      .from('config_sistema')
      .select('chave, valor')
      .in('chave', ['nome_sistema', 'email_remetente'])
    const configMap = Object.fromEntries((cfg || []).map((c: any) => [c.chave, c.valor]))
    const nomeSistema = configMap.nome_sistema || 'Minha Obra'
    const emailRemetente = configMap.email_remetente || 'noreply@minhaobra.app'

    const cargoLabel: Record<string, string> = {
      engenheiro_chefe: 'Engenheiro Chefe',
      engenheiro: 'Engenheiro',
      tecnico: 'Técnico de Segurança',
      rh: 'RH',
      visualizador: 'Visualizador',
    }

    const resendKey = Deno.env.get('RESEND_API_KEY')
    if (resendKey) {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: `${nomeSistema} <${emailRemetente}>`,
          to: emailDono,
          subject: `${nomeConvidado} aceitou seu convite no ${nomeSistema}`,
          html: `
            <div style="font-family:Inter,Arial,sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;background:#fff;border-radius:16px;border:1px solid #e5e7eb">
              <h2 style="font-size:18px;color:#1e293b;margin:0 0 12px">Convite aceito! 🎉</h2>
              <p style="color:#64748b;font-size:15px;margin:0 0 16px;line-height:1.6">
                <strong>${nomeConvidado}</strong> (${emailConvidado}) aceitou seu convite e entrou na sua equipe
                como <strong>${cargoLabel[cargo] || cargo}</strong>.
              </p>
              <p style="color:#64748b;font-size:14px;margin:0">
                Acesse o <strong>${nomeSistema}</strong> e vá em Configurações → Minha Equipe para gerenciar os membros.
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
