const express = require('express');
const cors    = require('cors');
const path    = require('path');

const app = express();

// Stripe webhook needs raw body — register before json middleware
app.use('/api/billing/webhook', express.raw({ type: 'application/json' }));

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/api/sync', require('./routes/sync'));
if (process.env.STRIPE_SECRET_KEY) {
  app.use('/api/billing', require('./routes/billing'));
}

app.get('/api/health', (_, res) => res.json({ ok: true }));
app.get('/app', (_, res) => res.sendFile(path.join(__dirname, 'public/app.html')));
app.get('*',   (_, res) => res.sendFile(path.join(__dirname, 'public/index.html')));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🛸  SRTmap → http://localhost:${PORT}`));
