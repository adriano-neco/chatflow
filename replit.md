# ChatFlow - Sistema de Atendimento

## Overview

Monorepo simples com frontend em `./client`, backend em `./server`. Sem pnpm workspaces — único `node_modules` na raiz.

## Stack

- **Node.js**: 24
- **Package manager**: pnpm (sem workspaces)
- **TypeScript**: 5.9
- **API**: Express 5 + Socket.io
- **Database**: PostgreSQL + Drizzle ORM (pg)
- **Frontend**: React + Vite + TailwindCSS + shadcn/ui + framer-motion
- **File storage**: MinIO (S3-compatible) via `minio` npm client
- **Logging**: Redis via `ioredis` (structured JSON logs in `logs:app` list)

## Port / Routing Architecture

In Replit, external port 80 maps to local port 3000 (Express). Express acts as the single entry point:

```
Browser → port 80 / 443 (Replit external)
           ├── /api/*            → Express routes (DB, auth, WPP)
           ├── /api/socket.io    → Socket.io (WebSocket, stays in Express)
           └── everything else   → http-proxy-middleware → Vite dev server (port 5000)
```

Vite HMR WebSocket is configured with `clientPort: 443, protocol: "wss"` so it connects through the same Express entry point and is forwarded to Vite via the httpServer upgrade handler.

## Structure

```text
./
├── client/                 # React + Vite frontend
│   ├── src/
│   │   ├── components/     # UI components (shadcn/ui)
│   │   ├── pages/          # Login, Conversations, Contacts, Settings
│   │   ├── hooks/          # React hooks (use-app-data, use-toast, etc.)
│   │   └── lib/            # api.ts, utils.ts, mock-data.ts
│   ├── index.html
│   └── vite.config.ts      # Vite config; HMR via port 443 in Replit
├── server/                 # Express API server
│   ├── db/
│   │   ├── index.ts        # drizzle + pg pool connection
│   │   └── schema/         # DB schema tables
│   ├── lib/
│   │   ├── auth.ts         # requireAuth middleware
│   │   ├── storage.ts      # MinIO client + uploadFile() helper
│   │   ├── logger.ts       # Redis-backed structured logger + HTTP middleware
│   │   └── frontendProxy.ts# http-proxy-middleware to Vite dev server
│   ├── routes/             # Express route handlers
│   ├── app.ts              # Express + Socket.io + proxy setup
│   └── index.ts            # Entry point (reads PORT env, handles WS upgrade)
├── .env.example            # All required environment variables
├── docker-compose.yml      # postgres + minio + redis for local dev
├── package.json            # All dependencies in one place
├── tsconfig.json           # Single tsconfig covering server + client
└── drizzle.config.ts       # Drizzle schema path + DATABASE_URL
```

## Database Schema

- `users` — Platform agents/admins (argon2 password hashing)
- `sessions` — Token-based sessions
- `contacts` — Customer contacts (with `whatsapp_id`)
- `conversations` — Support conversations (status, channel, priority, labels, `instance_id`)
- `messages` — Conversation messages (replyToId, isForwarded, `whatsapp_msg_id`)
- `attachments` — Media files with metadata (URLs point to MinIO)
- `message_reactions` — Emoji reactions per message per user
- `wpp_instances` — WhatsApp WPP-Connect instances

## Auth

- Login: `admin@chatflow.com` / `admin123`
- Or: `carlos@chatflow.com` / `agent123`

## Development Commands

- Backend: `PORT=3000 node_modules/.bin/tsx server/index.ts`
- Frontend: `PORT=5000 node_modules/.bin/vite --config client/vite.config.ts --host 0.0.0.0`
- DB push: `pnpm run db:push`
- Infrastructure: `docker compose up -d` (postgres + minio + redis)

## Environment Variables

Copy `.env.example` to `.env` and fill in values. Key vars:
- `DATABASE_URL` — PostgreSQL connection string
- `MINIO_ENDPOINT`, `MINIO_PORT`, `MINIO_ACCESS_KEY`, `MINIO_SECRET_KEY`, `MINIO_BUCKET`, `MINIO_PUBLIC_URL`
- `REDIS_URL` — Redis connection string (default: `redis://localhost:6379`)
- `WEBHOOK_BASE_URL` — Public URL for WPP-Connect webhooks

## Features

### Pages
1. `/login` — Login (2-column: branding left, form right)
2. `/conversations` — Main inbox (3-panel: list | chat | details)
3. `/contacts` — Contacts with CRUD
4. `/settings` — Settings with inner sidebar + WhatsApp instances manager

### Conversation Features
- Reply, react (emoji), forward to multiple conversations
- Attachments: images, videos, audio, music (MP3 + ID3), documents — stored in MinIO
- Voice recording with waveform visualization
- Real-time via Socket.io at `/api/socket.io`
- WhatsApp integration via WPP-Connect Server (QR code pairing, send/receive messages + media)

### Logging
- All HTTP requests and application events are logged as JSON to Redis list `logs:app`
- Falls back gracefully to console when Redis is unavailable
- Max 10,000 entries kept (LTRIM)
