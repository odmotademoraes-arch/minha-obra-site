import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14.0.0?target=deno'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
})

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const PRECOS: Record<string, string> = {
  individual:   Deno.env.get('STRIPE_PRICE_INDIVIDUAL')   || '',
  profissional: Deno.env.get('STRIPE_PRICE_PROFISSIONAL') || '',
  corporativo:  Deno.env.get('STRIPE_PRICE_CORPORATIVO')  || '',
  gov:          Deno.env.get('STRIPE_PRICE_GOV')          || '',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return new Response('Unauthorized', { status: 401, headers: corsHeaders })

  const { data: { user }, error } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''))
  if (error || !user) return new Response('Unauthorized', { status: 401, headers: corsHeaders })

  const { plano, modo = 'subscription', quantidade = 10 } = await req.json()

  const appUrl = Deno.env.get('APP_URL') || 'https://app.minhaobra.com.br'

  let session: Stripe.Checkout.Session

  if (modo === 'subscription') {
    const priceId = PRECOS[plano]
    if (!priceId) {
      return new Response(
        JSON.stringify({ error: 'Plano inválido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${appUrl}/#/assinatura/sucesso`,
      cancel_url:  `${appUrl}/#/planos`,
      metadata: { usuario_id: user.id, plano },
      customer_email: user.email,
    })
  } else {
    // Pacote avulso de análises IA
    session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [{
        price_data: {
          currency: 'brl',
          product_data: { name: `${quantidade} Análises IA avulsas — Minha Obra` },
          unit_amount: Math.round((quantidade / 10) * 1990),
        },
        quantity: 1,
      }],
      success_url: `${appUrl}/#/ia/sucesso`,
      cancel_url:  `${appUrl}/#/ia`,
      metadata: { usuario_id: user.id, quantidade: String(quantidade) },
      customer_email: user.email,
    })
  }

  return new Response(
    JSON.stringify({ url: session.url }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
})
