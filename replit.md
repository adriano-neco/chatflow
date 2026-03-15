# ChatFlow - Sistema de Atendimento

## Overview

Monorepo simples com frontend em `./client`, backend em `./server` e uploads em `./data`. Sem pnpm workspaces — único `node_modules` na raiz.

## Stack

- **Node.js**: 24
- **Package manager**: pnpm (sem workspaces)
- **TypeScript**: 5.9
- **API**: Express 5 + Socket.io
- **Database**: PostgreSQL + Drizzle ORM (pg)
- **Frontend**: React + Vite + TailwindCSS + shadcn/ui + framer-motion

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
│   └── vite.config.ts      # Vite config with proxy /api → :3000
├── server/                 # Express API server
│   ├── db/
│   │   ├── index.ts        # drizzle + pg pool connection
│   │   └── schema/         # DB schema tables
│   ├── lib/auth.ts         # requireAuth middleware
│   ├── routes/             # Express route handlers
│   ├── app.ts              # Express + Socket.io setup
│   └── index.ts            # Entry point (reads PORT env)
├── data/
│   └── uploads/            # Uploaded files served at /api/uploads/
├── package.json            # All dependencies in one place
├── tsconfig.json           # Single tsconfig covering server + client
└── drizzle.config.ts       # Drizzle schema path + DATABASE_URL
```

## Database Schema

- `users` — Platform agents/admins (argon2 password hashing)
- `sessions` — Token-based sessions
- `contacts` — Customer contacts
- `conversations` — Support conversations (status, channel, priority, labels)
- `messages` — Conversation messages (replyToId, isForwarded)
- `attachments` — Media files with metadata
- `message_reactions` — Emoji reactions per message per user

## Auth

- Login: `admin@chatflow.com` / `admin123`
- Or: `carlos@chatflow.com` / `agent123`

## Development Commands

- Backend: `PORT=3000 node_modules/.bin/tsx server/index.ts`
- Frontend: `PORT=5000 node_modules/.bin/vite --config client/vite.config.ts --host 0.0.0.0`
- DB push: `pnpm run db:push`

## Features

### Pages
1. `/login` — Login (2-column: branding left, form right)
2. `/register` — Register
3. `/conversations` — Main inbox (3-panel: list | chat | details)
4. `/contacts` — Contacts with CRUD
5. `/settings` — Settings with inner sidebar

### Conversation Features
- Reply, react (emoji), forward to multiple conversations
- Attachments: images, videos, audio, music (MP3 + ID3), documents
- Voice recording with waveform visualization
- Real-time via Socket.io at `/api/socket.io`
- Multipart uploads via multer → `./data/uploads/`
