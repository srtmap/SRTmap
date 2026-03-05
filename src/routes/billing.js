'use strict';

const express = require('express');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) return null;
  return require('stripe')(process.env.STRIPE_SECRET_KEY);
}

const PRICE_MAP = {
  STARTER: process.env.STRIPE_PRICE_STARTER,
  PRO:     process.env.STRIPE_PRICE_PRO,
};

// ── POST /api/billing/checkout ────────────────────────────────────────────────
router.post('/checkout', requireAuth, async (req, res) => {
  const stripe = getStripe();
  if (!stripe) return res.status(503).json({ error: 'Stripe not configured' });

  const { plan } = req.body;
  const priceId  = PRICE_MAP[plan?.toUpperCase()];
  if (!priceId)
    return res.status(400).json({ error: 'Invalid plan. Choose STARTER or PRO.' });

  if (!global.prisma) return res.status(503).json({ error: 'Database not available' });

  try {
    const user = await global.prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Create or retrieve Stripe customer
    let customerId = user.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email:    user.email,
        metadata: { userId: user.id },
      });
      customerId = customer.id;
      await global.prisma.user.update({
        where: { id: user.id },
        data:  { stripeCustomerId: customerId },
      });
    }

    const appUrl = process.env.APP_URL || 'http://localhost:3000';

    const session = await stripe.checkout.sessions.create({
      customer:   customerId,
      mode:       'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${appUrl}/app?upgraded=1`,
      cancel_url:  `${appUrl}/app?upgrade_cancelled=1`,
      metadata:   { userId: user.id, plan: plan.toUpperCase() },
    });

    return res.json({ url: session.url });
  } catch (err) {
    console.error('checkout error:', err);
    return res.status(500).json({ error: 'Failed to create checkout session' });
  }
});

// ── POST /api/billing/webhook ─────────────────────────────────────────────────
router.post('/webhook', async (req, res) => {
  const stripe = getStripe();
  if (!stripe) return res.status(503).send('Stripe not configured');

  const sig     = req.headers['stripe-signature'];
  const secret  = process.env.STRIPE_WEBHOOK_SECRET;

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, secret);
  } catch (err) {
    console.error('Webhook signature error:', err.message);
    return res.status(400).send(`Webhook error: ${err.message}`);
  }

  if (!global.prisma) return res.json({ received: true });

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        if (session.mode !== 'subscription') break;

        const { userId, plan } = session.metadata || {};
        if (!userId || !plan) break;

        await global.prisma.user.update({
          where: { id: userId },
          data: {
            plan:         plan,
            stripeSubId:  session.subscription,
          },
        });
        console.log(`User ${userId} upgraded to ${plan}`);
        break;
      }

      case 'customer.subscription.deleted': {
        const sub        = event.data.object;
        const customerId = sub.customer;

        const user = await global.prisma.user.findFirst({
          where: { stripeCustomerId: customerId },
        });
        if (!user) break;

        await global.prisma.user.update({
          where: { id: user.id },
          data:  { plan: 'FREE', stripeSubId: null },
        });
        console.log(`User ${user.id} downgraded to FREE (subscription cancelled)`);
        break;
      }

      case 'customer.subscription.updated': {
        const sub        = event.data.object;
        const customerId = sub.customer;

        if (sub.status !== 'active') break;

        const user = await global.prisma.user.findFirst({
          where: { stripeCustomerId: customerId },
        });
        if (!user) break;

        // Determine plan from price
        const priceId = sub.items?.data?.[0]?.price?.id;
        let newPlan   = 'FREE';
        if (priceId === process.env.STRIPE_PRICE_STARTER) newPlan = 'STARTER';
        if (priceId === process.env.STRIPE_PRICE_PRO)     newPlan = 'PRO';

        await global.prisma.user.update({
          where: { id: user.id },
          data:  { plan: newPlan, stripeSubId: sub.id },
        });
        break;
      }

      default:
        break;
    }
  } catch (err) {
    console.error('Webhook handler error:', err);
    return res.status(500).send('Handler error');
  }

  return res.json({ received: true });
});

// ── GET /api/billing/portal ───────────────────────────────────────────────────
router.get('/portal', requireAuth, async (req, res) => {
  const stripe = getStripe();
  if (!stripe) return res.status(503).json({ error: 'Stripe not configured' });

  if (!global.prisma) return res.status(503).json({ error: 'Database not available' });

  try {
    const user = await global.prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user?.stripeCustomerId)
      return res.status(400).json({ error: 'No billing account found' });

    const appUrl  = process.env.APP_URL || 'http://localhost:3000';
    const session = await stripe.billingPortal.sessions.create({
      customer:   user.stripeCustomerId,
      return_url: `${appUrl}/app`,
    });

    return res.json({ url: session.url });
  } catch (err) {
    console.error('portal error:', err);
    return res.status(500).json({ error: 'Failed to create billing portal session' });
  }
});

module.exports = router;
