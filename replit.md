# Workspace

## Overview

pnpm workspace monorepo using TypeScript. ChatFlow - Sistema de Atendimento ao Cliente (Chatwoot-inspired).

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5 + Socket.io
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **Frontend**: React + Vite + TailwindCSS + shadcn/ui + framer-motion

## Structure

```text
artifacts-monorepo/
├── artifacts/              # Deployable applications
│   ├── api-server/         # Express API server + Socket.io
│   └── chatwoot-app/       # React+Vite frontend (ChatFlow)
├── lib/                    # Shared libraries
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks (with JWT auth injection)
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   └── db/                 # Drizzle ORM schema + DB connection
├── scripts/                # Utility scripts
│   └── src/seed.ts         # Database seeder
├── pnpm-workspace.yaml     # pnpm workspace
├── tsconfig.base.json      # Shared TS options
├── tsconfig.json           # Root TS project references
└── package.json            # Root package with hoisted devDeps
```

## Database Schema

- `users` - Platform agents/admins with bcrypt password hashing
- `sessions` - JWT-like token sessions
- `contacts` - Customer contacts (name, email, phone, company, location)
- `conversations` - Support conversations (status, channel, priority, labels)
- `messages` - Conversation messages (replyToId, isForwarded fields added)
- `attachments` - Media files with metadata (ID3 tags for music, video dims, etc.)
- `message_reactions` - Emoji reactions per message per user

## Files Saved to Disk

- Uploads stored at `artifacts/api-server/uploads/`
- Served at `/api/uploads/<filename>`

## Features

### Pages
1. `/login` - Login (2-column: branding left, form right)
2. `/register` - Register (same 2-column layout)  
3. `/` (Conversations) - Main inbox with 3-panel layout (list | chat | details)
4. `/contacts` - Contacts with full CRUD (create, edit, delete + detail panel)
5. `/settings` - Settings with inner sidebar (profile, general, agents, etc)

### Conversation Features
- **Reply**: Right-click → Responder, or hover action button. Shows quoted message above input.
- **React**: Right-click → Reagir, or hover emoji button. Full emoji picker modal. Reactions shown below bubble.
- **Forward**: Right-click → Encaminhar. Multi-select conversations modal with search.
- **Attachments**: Images, videos, audio, music (MP3 with ID3 tags), documents — saved to DB + local storage.
- **Voice recording**: MediaRecorder with live waveform visualization.
- **Image lightbox**: Click image to view full size with download.
- **Video player**: Inline playback with duration and resolution metadata.
- **Music player**: ID3 tags (title/artist/album/year/cover art) saved in DB metadata.
- **Document download**: Colored file type icons with download link.

### Technical Features
- Real-time via Socket.io (`/api/socket.io`)
- JWT token auth stored in localStorage, auto-injected in API requests
- Multipart file upload (multer) with metadata storage
- Reactions persisted in DB with Socket.io real-time broadcast
- Forward to multiple conversations in one action
- React Query for data fetching with graceful mock fallback
- 6 conversations with messages + 10 contacts seeded in DB

## Auth

- Login: `admin@chatflow.com` / `admin123`
- Or: `carlos@chatflow.com` / `agent123`

## TypeScript & Composite Projects

Every package extends `tsconfig.base.json` which sets `composite: true`. The root `tsconfig.json` lists all packages as project references.

## Root Scripts

- `pnpm run build` — runs `typecheck` first, then recursively runs `build` in all packages
- `pnpm run typecheck` — runs `tsc --build --emitDeclarationOnly` using project references

## Development Commands

- `pnpm --filter @workspace/api-server run dev` — start API server
- `pnpm --filter @workspace/chatwoot-app run dev` — start frontend
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API client
- `pnpm --filter @workspace/db run push` — push DB schema
- `pnpm --filter @workspace/scripts run seed` — seed database
