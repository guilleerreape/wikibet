import Stripe from 'https://esm.sh/stripe@14?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2?target=deno';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2024-06-20',
  httpClient: Stripe.createFetchHttpClient(),
});

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

Deno.serve(async (req) => {
  const signature = req.headers.get('stripe-signature');
  if (!signature) {
    return new Response('No signature', { status: 400 });
  }

  let event: Stripe.Event;
  try {
    const body = await req.text();
    event = await stripe.webhooks.constructEventAsync(
      body,
      signature,
      Deno.env.get('STRIPE_WEBHOOK_SECRET')!,
    );
  } catch (err) {
    console.error('Webhook signature error:', err);
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }

  console.log('Stripe event:', event.type);

  // ─── Pago completado ───────────────────────────────────────────────────────
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId = session.client_reference_id; // ID de Supabase que pasamos en la URL
    const customerId = session.customer as string;
    const subscriptionId = session.subscription as string;

    if (!userId) {
      console.error('No client_reference_id in session');
      return new Response('Missing user ID', { status: 400 });
    }

    // Calcular fecha de expiración (1 mes)
    const premiumUntil = new Date();
    premiumUntil.setMonth(premiumUntil.getMonth() + 1);

    const { error } = await supabase
      .from('profiles')
      .update({
        is_premium: true,
        premium_until: premiumUntil.toISOString(),
        stripe_customer_id: customerId,
      })
      .eq('id', userId);

    if (error) {
      console.error('Error updating profile:', error);
      return new Response('DB error', { status: 500 });
    }

    console.log(`✅ Premium activado para usuario ${userId}`);
  }

  // ─── Suscripción cancelada ─────────────────────────────────────────────────
  if (event.type === 'customer.subscription.deleted') {
    const subscription = event.data.object as Stripe.Subscription;
    const customerId = subscription.customer as string;

    const { error } = await supabase
      .from('profiles')
      .update({ is_premium: false, premium_until: null })
      .eq('stripe_customer_id', customerId);

    if (error) {
      console.error('Error revoking premium:', error);
      return new Response('DB error', { status: 500 });
    }

    console.log(`❌ Premium cancelado para customer ${customerId}`);
  }

  // ─── Renovación de suscripción ─────────────────────────────────────────────
  if (event.type === 'invoice.payment_succeeded') {
    const invoice = event.data.object as any;
    const customerId = invoice.customer as string;

    if (invoice.billing_reason === 'subscription_cycle') {
      const premiumUntil = new Date();
      premiumUntil.setMonth(premiumUntil.getMonth() + 1);

      await supabase
        .from('profiles')
        .update({ is_premium: true, premium_until: premiumUntil.toISOString() })
        .eq('stripe_customer_id', customerId);

      console.log(`🔄 Premium renovado para customer ${customerId}`);
    }
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
