# SRTmap

**DJI SRT GPS viewer, fixer and flight track visualizer.**

View and fix GPS tracks from DJI subtitle (`.SRT`) files directly in your browser. Zero-coordinate repair, interactive map, GPX export, multi-file support, measure tools, and optional cloud storage.

> Live at **[srtmap.online](https://srtmap.online)** &middot; MIT License &middot; Open Source

SRTmap — GPS Track Viewer

---

## Features

- **GPS Track Viewer** — OpenStreetMap + satellite layers, start/end/max-altitude markers
- **Zero-Coordinate Fixer** — Nearest-neighbor, first valid, last valid, map-click or manual coordinate modes
- **Multi-File Support** — Load multiple SRT files simultaneously, view all tracks on one map with distinct colors
- **Distance & Area Ruler** — Two-point ruler and polygon measurement tools with draggable handles
- **GPX Export** — Export any flight as a standard GPX file
- **Auth + Cloud Storage** — Sign up for Starter or Pro to save files to the cloud
- **Self-hostable** — MIT licensed, Docker + PostgreSQL, deploy anywhere in minutes

---

## Quick Start (Railway)

The fastest way to deploy SRTmap publicly:

1. Fork this repository
2. Click **Deploy to Railway** below
3. Add a PostgreSQL database in Railway
4. Set the required environment variables (see table below)
5. Deploy — Railway runs `prisma migrate deploy` automatically

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/template/srtmap)

---

## Self-host with Docker

```yaml
# docker-compose.yml
version: '3.9'
services:
  app:
    image: ghcr.io/srtmap/srtmap:latest
    ports: ["3000:3000"]
    environment:
      DATABASE_URL: postgresql://srtmap:srtmap@db:5432/srtmap
      JWT_SECRET: change-me-in-production
      # Optional Stripe keys for paid tiers:
      # STRIPE_SECRET_KEY: sk_live_...
      # STRIPE_WEBHOOK_SECRET: whsec_...
      # STRIPE_PRICE_STARTER: price_...
      # STRIPE_PRICE_PRO: price_...
    depends_on: [db]
    volumes:
      - ./uploads:/app/uploads

  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: srtmap
      POSTGRES_USER: srtmap
      POSTGRES_PASSWORD: srtmap
    volumes:
      - pgdata:/var/lib/postgresql/data

volumes:
  pgdata:
```

```bash
docker-compose up -d
# Open http://localhost:3000
```

---

## Self-host Manually

### Prerequisites

- Node.js 20+
- PostgreSQL 14+

### Steps

```bash
# 1. Clone
git clone https://github.com/srtmap/srtmap.git
cd srtmap

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.example .env
# Edit .env with your database URL, JWT secret, and (optionally) Stripe keys

# 4. Run database migrations
npx prisma migrate deploy

# 5. Start the server
npm start
# or for development with auto-reload:
npm run dev
```

Open `http://localhost:3000` in your browser.

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `JWT_SECRET` | Yes | Secret key for JWT signing (min 32 chars in production) |
| `PORT` | No | HTTP port to listen on (default: `3000`) |
| `STORAGE_PATH` | No | Path to store uploaded SRT files (default: `./uploads`) |
| `APP_URL` | No | Public URL of the app — used for Stripe redirects (default: `http://localhost:3000`) |
| `STRIPE_SECRET_KEY` | No | Stripe secret key (required for paid tiers) |
| `STRIPE_WEBHOOK_SECRET` | No | Stripe webhook signing secret |
| `STRIPE_PRICE_STARTER` | No | Stripe price ID for the Starter plan |
| `STRIPE_PRICE_PRO` | No | Stripe price ID for the Pro plan |

> The app runs fully without Stripe — paid features are simply unavailable. Free tier works with or without a database.

---

## Pricing

| | Free | Starter | Pro |
|---|---|---|---|
| **Price** | $0 | $1/month | $5/month |
| **Files** | 100 | 1,000 | Unlimited |
| **Storage** | 10 MB (local) | 200 MB cloud | 2 GB cloud |
| **History** | Session only | 30 days | 1 year |
| **API access** | — | — | Yes |
| **Account required** | No | Yes | Yes |

---

## Architecture

```
srtmap/
├── src/
│   ├── index.js              # Express app entry point
│   ├── middleware/
│   │   └── auth.js           # JWT auth + plan limit checks
│   ├── routes/
│   │   ├── auth.js           # POST /register, /login, GET /me
│   │   ├── files.js          # Upload, list, delete, download, fix
│   │   └── billing.js        # Stripe checkout, webhook, portal
│   └── public/
│       ├── index.html        # Landing page
│       └── app.html          # Main app (GPS viewer + auth layer)
├── prisma/
│   └── schema.prisma         # User + File models
├── Dockerfile
├── railway.toml
└── docker-compose.yml        # (create from snippet above)
```

---

## API Reference (Pro)

All API endpoints require `Authorization: Bearer <token>`.

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/auth/register` | Create account, returns JWT |
| `POST` | `/api/auth/login` | Login, returns JWT |
| `GET` | `/api/auth/me` | Current user + usage stats |
| `POST` | `/api/files/upload` | Upload SRT file (multipart) |
| `GET` | `/api/files` | List your files |
| `DELETE` | `/api/files/:id` | Delete a file |
| `GET` | `/api/files/:id/download` | Download original or fixed SRT |
| `POST` | `/api/files/:id/fix` | Apply GPS fix (mode: nearest/first/last/custom) |
| `POST` | `/api/billing/checkout` | Create Stripe checkout session |
| `GET` | `/api/billing/portal` | Open Stripe billing portal |
| `GET` | `/api/health` | Health check |

### Fix endpoint example

```bash
curl -X POST https://srtmap.online/api/files/clxxxxx/fix \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"mode": "nearest"}'
```

Fix modes: `nearest` (default), `first`, `last`, `custom` (requires `lat` + `lon` in body).

---

## Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch: `git checkout -b feat/my-feature`
3. Commit your changes: `git commit -m 'feat: add my feature'`
4. Push and open a Pull Request

Please keep PRs focused — one feature or fix per PR. Bug reports and feature requests are welcome as GitHub issues.

---

## License

MIT &copy; 2024 SRTmap contributors

See [LICENSE](LICENSE) for the full text.
