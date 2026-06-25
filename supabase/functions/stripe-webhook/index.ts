import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14.0.0?target=deno'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
})

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPA_SERVICE_ROLE_KEY')!
)

serve(async (req) => {
  const sig  = req.headers.get('stripe-signature')!
  const body = await req.text()
  let event: Stripe.Event

  try {
    event = await stripe.webhooks.constructEventAsync(
      body, sig, Deno.env.get('STRIPE_WEBHOOK_SECRET')!
    )
  } catch (err) {
    console.error('Webhook error:', err)
    return new Response('Webhook Error', { status: 400 })
  }

  const planoMap: Record<string, string> = {
    [Deno.env.get('STRIPE_PRICE_INDIVIDUAL')  || '']: 'individual',
    [Deno.env.get('STRIPE_PRICE_PROFISSIONAL')|| '']: 'profissional',
    [Deno.env.get('STRIPE_PRICE_CORPORATIVO') || '']: 'corporativo',
    [Deno.env.get('STRIPE_PRICE_GOV')         || '']: 'gov',
  }

  if (event.type === 'checkout.session.completed') {
    const session  = event.data.object as Stripe.Checkout.Session
    const userId   = session.metadata?.usuario_id
    if (!userId) return new Response('ok', { status: 200 })

    if (session.mode === 'subscription') {
      const lineItems = await stripe.checkout.sessions.listLineItems(session.id, { limit: 1 })
      const priceId   = lineItems.data[0]?.price?.id || ''
      const plano     = planoMap[priceId] || 'individual'

      await supabase.from('assinaturas').upsert({
        usuario_id: userId,
        plano,
        status: 'ativa',
        stripe_subscription_id: session.subscription as string,
        stripe_customer_id: session.customer as string,
        data_inicio: new Date().toISOString(),
        data_vencimento: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      }, { onConflict: 'usuario_id' })
    } else if (session.mode === 'payment') {
      const qtd = parseInt(session.metadata?.quantidade || '10')
      await supabase.from('pacotes_avulsos').insert({
        usuario_id: userId,
        quantidade_comprada: qtd,
        stripe_payment_id: session.payment_intent as string,
      })
    }
  }

  if (event.type === 'customer.subscription.deleted') {
    const sub = event.data.object as Stripe.Subscription
    await supabase.from('assinaturas')
      .update({ status: 'cancelada' })
      .eq('stripe_subscription_id', sub.id)
  }

  if (event.type === 'invoice.payment_failed') {
    const invoice = event.data.object as Stripe.Invoice
    await supabase.from('assinaturas')
      .update({ status: 'vencida' })
      .eq('stripe_subscription_id', invoice.subscription as string)
  }

  if (event.type === 'customer.subscription.updated') {
    const sub    = event.data.object as Stripe.Subscription
    const priceId = sub.items.data[0]?.price?.id || ''
    const plano   = planoMap[priceId] || 'individual'
    await supabase.from('assinaturas')
      .update({ plano, status: 'ativa' })
      .eq('stripe_subscription_id', sub.id)
  }

  return new Response(JSON.stringify({ ok: true }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
