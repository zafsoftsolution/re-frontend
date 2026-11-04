# Deployment — Rakib Enterprise frontend

Pipeline: `.github/workflows/ci-cd.yml` (repo `zafsoftsolution/re-frontend`, branch `main`).

| Job          | Runs on                                  | What it does                                                                 |
|--------------|------------------------------------------|------------------------------------------------------------------------------|
| `ci`         | push + PR to `main`, manual              | `npm ci`, `next typegen && tsc --noEmit`, `npm run lint:site` + `npm run lint` (blocking), `npm test`; `npm run build` on PRs only (pushes build once, in Docker) |
| `build-push` | push to `main`, manual (`workflow_dispatch`) | Builds the Docker image (buildx + GHA cache) and pushes `ghcr.io/zafsoftsolution/re-frontend:latest` and `:sha-<7-char sha>` |
| `deploy`     | after `build-push`, `main` only          | Copies `docker-compose.prod.yml` to the VPS, `pull` + `up -d` + `docker image prune -f`, then health-checks `http://127.0.0.1:9085/` and POSTs every broad cache tag to `/api/revalidate` (see below) |

`deploy` uses the GitHub environment **`production`** (add required reviewers there if you want a manual approval gate).

### Build-time API calls

`next build` (CI and the Docker image build, both on GitHub's runners) must not
crawl the catalogue: the API throttles anonymous clients at 100 requests/hour.
Catalogue detail routes (`/parts/[slug]`, `/machines/[brand]/…`,
`/categories/[slug]`, `/brands/[slug]`) therefore prerender only a placeholder
param; real pages render on their first request inside the running container
and are cached from then on. Set `PRERENDER_CATALOG=1` at build time to
prerender the top entities instead (only where the build can reach the API
without being throttled; transient 429/5xx detail failures are retried).

### Post-deploy revalidation

After the health check, the deploy script reads `REVALIDATE_SECRET` from
`~/RE/re_frontend/.env.local` and POSTs all broad tags (`bootstrap`, `settings`,
`categories`, `machine-brands`, `machine-models`, `machines`, `brands`,
`products`, `sitemap`, `redirects` — keep in sync with `src/lib/api/tags.ts`)
to `http://127.0.0.1:9085/api/revalidate`, so nothing cached by the previous
build is served. If the secret is missing it logs a warning and skips.

## GitHub configuration

Settings → Secrets and variables → Actions (or on the `production` environment).

### Secrets

| Name              | Required | Value                                                                 |
|-------------------|----------|-----------------------------------------------------------------------|
| `SSH_HOST`        | yes      | `69.62.73.22`                                                         |
| `SSH_USER`        | yes      | `zahid`                                                               |
| `SSH_PRIVATE_KEY` | yes      | Private key (full PEM/OpenSSH text) whose public key is in `~zahid/.ssh/authorized_keys` |
| `SSH_PORT`        | no       | SSH port; defaults to `22`                                            |
| `GHCR_PAT`        | no       | Only if the GHCR package is **private**: a classic PAT with `read:packages`. The server then runs `docker login ghcr.io` before pulling. |

`GITHUB_TOKEN` is used automatically to push the image (the job has `packages: write`).

### Variables (public, inlined into the browser bundle at build time)

| Name                         | Example value                                   |
|------------------------------|-------------------------------------------------|
| `NEXT_PUBLIC_DJANGO_API_URL` | `https://api.rakibenterprise-bd.com/api/auth`   |
| `NEXT_PUBLIC_DJANGO_BACKEND` | `https://api.rakibenterprise-bd.com`            |

These must be **variables** (`vars.*`), not secrets: `NEXT_PUBLIC_*` values end up
in the public JS bundle anyway. They're passed to `docker build` as build args,
so changing them takes a new build (re-run the workflow); restarting the container won't pick them up.

### GHCR package visibility

The first push creates the package `re-frontend` under the `zafsoftsolution`
org. Because the repo is public, make the package public so the server can pull
without logging in:
GitHub → org **zafsoftsolution** → Packages → `re-frontend` → Package settings →
Change visibility → **Public**. Also check that the package is linked to the
`re-frontend` repo with **Actions access: write** (it normally is when GITHUB_TOKEN creates it).

If you keep it private, add the `GHCR_PAT` secret instead.

## Runtime environment on the server

Server-only values are read from `~/RE/re_frontend/.env.local` (already present;
never committed — see `.env.example` for key names). Compose loads it via
`env_file` with `required: false` (needs docker compose ≥ 2.24).

| Key                       | Notes                                                             |
|---------------------------|-------------------------------------------------------------------|
| `REVALIDATE_SECRET`       | **Required.** Shared secret for `POST /api/revalidate` (header `x-revalidate-secret`). Long random string. Empty disables the endpoint (and the post-deploy purge). |
| `INTERNAL_API_SECRET`     | **Required.** Sent as `X-Internal-Secret` on server-rendering requests so SSR isn't throttled as one anonymous visitor. Never `NEXT_PUBLIC_`. |
| `INTERNAL_DJANGO_BACKEND` | Optional; defaults to `http://backend:9086` over `rakib-enterprise-net`. |
| `JMN_JWT_SECRET`          | Legacy (removed mock API); safe to drop. |

### Matching backend environment (`re_backend` `.env`)

| Key                            | Value |
|--------------------------------|-------|
| `FRONTEND_REVALIDATE_URL`      | `http://frontend:9085/api/revalidate` (service name on `rakib-enterprise-net`; `http://rakib-enterprise-frontend:9085/...` also works) |
| `FRONTEND_REVALIDATE_SECRET`   | same value as the frontend's `REVALIDATE_SECRET` |
| `INTERNAL_API_SECRET`          | same value as the frontend's `INTERNAL_API_SECRET` |
| `TRUSTED_PROXY_IPS`            | IPs/CIDRs whose `X-Forwarded-For` Django trusts: the frontend container / Docker network (e.g. `172.18.0.0/16`) and Nginx Proxy Manager |

The frontend's form route handlers forward only the single visitor IP that
NPM saw (right-most `X-Forwarded-For` entry or `X-Real-IP`), never a
client-supplied chain.

## One-time server setup (VPS 69.62.73.22, user `zahid`)

1. Docker Engine + compose v2 (≥ 2.24), and `zahid` in the `docker` group.
2. Add the deploy public key to `~/.ssh/authorized_keys`, and put the matching private key in the `SSH_PRIVATE_KEY` secret.
3. The shared network must exist (the backend stack normally creates it):
   `docker network ls | grep rakib-enterprise-net || docker network create rakib-enterprise-net`
4. `~/RE/re_frontend/` must exist and contain `.env.local`. The workflow uploads
   `docker-compose.prod.yml` there on every deploy. The other files in that folder
   (old Dockerfile, docker-compose.yml, …) are left untouched.
5. **First deploy / takeover of the existing container.** `docker-compose.prod.yml`
   keeps the existing compose project name (`rakib-enterprise-frontend`),
   service (`frontend`), `container_name` (`rakib-enterprise-frontend`), port
   9085 and external network `rakib-enterprise-net`, so `up -d` replaces the
   old locally built container in place. If compose says the container
   name is already in use, run this once and re-run the workflow:
   ```bash
   docker rm -f rakib-enterprise-frontend
   ```

### Nginx Proxy Manager

TLS and routing are handled by Nginx Proxy Manager (`nginx-proxy-manager-app-1`).
The container keeps the same name and network. Port 9085 is published on
**127.0.0.1 only** (for the deploy health check), so the NPM proxy host must
forward to `rakib-enterprise-frontend:9085` over `rakib-enterprise-net`, not
to the server's public IP / `host.docker.internal`. Check this before the
first deploy with the loopback binding; if the proxy host still points at
`<public-ip>:9085`, switch it to the container name.

### Shared host safety

The VPS runs many unrelated projects. The deploy only touches the
`rakib-enterprise-frontend` compose project and runs `docker image prune -f`,
which removes dangling images only. Never run `docker system prune` or
`docker compose down` on other folders.

## Manual deploy / rollback

Each build is also tagged `sha-<7-char commit sha>` (see the build-push job
summary or GHCR package page).

```bash
cd ~/RE/re_frontend
# roll back (or pin) to a specific build
IMAGE_TAG=sha-abc1234 docker compose -f docker-compose.prod.yml pull
IMAGE_TAG=sha-abc1234 docker compose -f docker-compose.prod.yml up -d
curl -fsS -o /dev/null -w '%{http_code}\n' http://127.0.0.1:9085/

# back to the newest build
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d
```

Without `IMAGE_TAG`, compose uses `latest`. The next push to `main` redeploys
the new sha automatically. To redeploy without a code change: Actions → CI/CD →
**Run workflow** on `main`.

## Local

- Dev: `cp .env.example .env.local`, fill values, `npm run dev`.
- Local image: `docker compose up --build` (uses `docker-compose.yml`, which builds from the Dockerfile).
