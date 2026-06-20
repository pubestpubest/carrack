# Technical Design — BDO Carrack Tracker

Companion to `PRD.md` and `erd.mermaid`. Covers infrastructure, deployment, and tech stack decisions.

---

## 1. Requirements Recap

**Functional** (from PRD): multi-user workspaces, recipe/inventory/todo/tracking CRUD, auth, image-bearing item/ship catalogue.

**Non-functional**:
- Scale: small-to-medium — single guild/community usage, not internet-scale (hundreds to low thousands of users)
- Availability: best-effort, brief downtime on deploy is acceptable
- Cost: minimize — single VPS, free-tier-friendly services where possible
- Team: solo/small team, prioritize low operational overhead over horizontal scalability

**Constraints**: stack is pre-decided by the user — Supabase, Docker/Docker Hub, GitHub, GitHub Actions, VPS, Cloudflare Tunnel. This doc designs around those choices and validates Next.js as the app framework.

---

## 2. Can Next.js handle this stack? — Yes

Next.js fits cleanly:

- **Frontend + backend in one app** — React UI plus API Routes / Server Actions cover all PRD endpoints (goal selection, inventory CRUD, gap analysis, todo generation) without a separate backend service.
- **Supabase integration is first-class** — `@supabase/ssr` and `@supabase/supabase-js` handle auth cookies, session refresh, and typed Postgres queries from both server components and client components.
- **Dockerizes well** — `next.config.js` has an `output: 'standalone'` mode that bundles a minimal Node server with only the dependencies actually used, producing a small, self-contained image.
- **No vendor lock to Vercel** — standalone output runs as a plain Node process, so it's portable to any VPS/Docker setup; none of the requested infra (Docker Hub, VPS, Cloudflare Tunnel) requires Vercel.
- **Image handling** — `next/image` can point at Supabase Storage public URLs directly with a remote-patterns config entry.

The only thing to watch: Next.js's built-in image optimizer needs a Node runtime (not static export) since Carrack/item images come from Supabase Storage at runtime — standalone Docker mode satisfies this.

---

## 3. High-Level Architecture

```
                              ┌─────────────────────┐
                              │      Cloudflare      │
                              │  (DNS + Tunnel edge)  │
                              └──────────┬───────────┘
                                         │ outbound-only
                                         │ tunnel connection
                              ┌──────────▼───────────┐
                              │         VPS           │
                              │  ┌─────────────────┐  │
                              │  │   cloudflared    │  │
                              │  │   (tunnel agent) │  │
                              │  └────────┬────────┘  │
                              │           │ localhost  │
                              │  ┌────────▼────────┐  │
                              │  │  Next.js app     │  │
                              │  │  (Docker         │  │
                              │  │   container)     │  │
                              │  └────────┬────────┘  │
                              └───────────┼───────────┘
                                          │ HTTPS (REST/Postgres)
                              ┌───────────▼───────────┐
                              │        Supabase        │
                              │  Postgres │ Auth │     │
                              │  Storage  │ Realtime   │
                              └────────────────────────┘
```

No inbound ports are opened on the VPS — `cloudflared` makes an outbound connection to Cloudflare's edge, which then proxies public traffic to it. This avoids exposing the VPS's IP and removes the need for manual TLS cert management (Cloudflare terminates TLS).

---

## 4. Component Breakdown

| Component | Role |
|---|---|
| **Next.js app** | UI + API routes/Server Actions for goal selection, inventory, gap analysis, todos, catalogue |
| **Supabase Postgres** | Primary datastore — implements the ERD (ITEM, SHIP, RECIPE, USER_INVENTORY, etc.) |
| **Supabase Auth** | Username/password (and optionally OAuth) auth; issues JWTs consumed by Next.js middleware for session checks |
| **Supabase Storage** | Hosts item/ship images referenced by `image_url` columns |
| **Docker** | Packages the Next.js standalone build into a portable image |
| **Docker Hub** | Stores tagged images (`yourname/carrack-tracker:sha-xxxxx`, `:latest`) pulled by the VPS |
| **GitHub** | Source of truth for app code, SQL migrations, Dockerfile, CI workflow |
| **GitHub Actions** | Build → test → image build/push → SSH deploy trigger |
| **VPS (Docker Compose)** | Runs the app container + `cloudflared` container, pulls new images on deploy |
| **Cloudflare Tunnel** | Exposes the app to the internet over HTTPS without open inbound ports; also provides DNS |

---

## 5. Data Layer — Supabase

- **Postgres** implements every entity in `erd.mermaid` directly as tables; Row Level Security (RLS) policies enforce workspace isolation (a user can only read/write rows where their `user_id` is a member of the workspace).
- **Auth** stores credentials; `USER.password_hash` in the ERD maps to Supabase's built-in `auth.users` table rather than a hand-rolled column — the app's `public.users` (or `profiles`) table holds a foreign key to `auth.users.id` plus app-specific fields, instead of storing password hashes itself.
- **Storage** buckets: `item-images/`, `ship-images/` — public-read buckets, since assets aren't sensitive. `image_url` columns store the public Storage URL.
- **Realtime** (optional, future): Supabase's realtime subscriptions could push live inventory updates to all workspace members without polling — listed as a v2 enhancement, not required for v1.

---

## 6. Containerization

**Dockerfile strategy** — multi-stage build:

```
Stage 1 (deps):    install node_modules
Stage 2 (builder): next build (output: standalone)
Stage 3 (runner):  copy only .next/standalone + .next/static + public/
                    run as non-root user, expose port 3000
```

This keeps the final image small (no dev dependencies, no source maps unless needed) and avoids shipping the full `node_modules`.

Environment variables (`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`) are injected at container runtime via Docker Compose `env_file`, never baked into the image.

---

## 7. CI/CD Pipeline (GitHub Actions)

```
push to main
   │
   ▼
[lint + typecheck + test]
   │
   ▼
[docker build]  ──tag──>  sha-<commit>, latest
   │
   ▼
[docker push]  ───────>  Docker Hub
   │
   ▼
[ssh to VPS]  ─────────> docker compose pull && docker compose up -d
```

- Secrets stored in GitHub repo settings: `DOCKERHUB_USERNAME`, `DOCKERHUB_TOKEN`, `VPS_SSH_KEY`, `VPS_HOST`.
- Deploy step uses an SSH action to run a short remote script: `docker compose pull app && docker compose up -d app` — Compose handles container replacement with minimal downtime.
- Database migrations (SQL files versioned in `/supabase/migrations`) run via Supabase CLI as a separate CI step before the app deploy step, so schema changes land before the new app code that depends on them.

---

## 8. VPS Layout

Single `docker-compose.yml` on the VPS:

```yaml
services:
  app:
    image: yourname/carrack-tracker:latest
    restart: unless-stopped
    env_file: .env
    expose:
      - "3000"

  cloudflared:
    image: cloudflare/cloudflared:latest
    restart: unless-stopped
    command: tunnel run
    environment:
      - TUNNEL_TOKEN=${CF_TUNNEL_TOKEN}
```

No reverse proxy (Nginx/Caddy) is needed since `cloudflared` connects directly to the `app` service over the Compose network and Cloudflare handles TLS termination at the edge.

---

## 9. Trade-offs

| Decision | Why | Revisit if... |
|---|---|---|
| Supabase over self-hosted Postgres | Auth + Storage + DB in one managed service, near-zero ops | Cost grows past free/low tier at scale, or RLS policies become too complex |
| Single VPS, no orchestration | Team size of 1, traffic is low | Need horizontal scaling — migrate to a small Swarm/Nomad/K8s setup |
| Docker Hub over private registry | Free public/private repos, simplest GitHub Actions integration | Need private hosting compliance — switch to GHCR or self-hosted registry |
| Cloudflare Tunnel over exposed ports + reverse proxy | No firewall/cert management, free DDoS protection | Need fine-grained edge routing rules beyond what Tunnel config supports |
| Next.js standalone in Docker over Vercel | Full control, avoids vendor lock + serverless cold starts on writes | Traffic grows enough that managed edge deployment becomes worth the cost |

---

## 10. What to Revisit as It Grows

- **Realtime sync** — move from manual inventory refresh to Supabase Realtime subscriptions.
- **Multi-instance app** — if traffic grows, run 2+ `app` replicas behind Cloudflare load balancing or a lightweight reverse proxy with sticky sessions disabled (app is stateless, sessions live in Supabase Auth cookies).
- **Image CDN caching** — Supabase Storage URLs can be fronted by Cloudflare's cache rules to reduce origin load.
- **Migrations workflow** — as the schema stabilizes, consider a staging Supabase project + promotion flow instead of applying migrations directly against production.
- **Observability** — add structured logging + a lightweight uptime check (e.g., Cloudflare's own health checks or a simple cron-based ping) once user count justifies it.
