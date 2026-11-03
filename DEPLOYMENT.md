# Deployment — Rakib Enterprise frontend

Pipeline: `.github/workflows/ci-cd.yml` (repo `zafsoftsolution/re-frontend`, branch `main`).

| Job          | Runs on                                  | What it does                                                                 |
|--------------|------------------------------------------|------------------------------------------------------------------------------|
| `ci`         | push + PR to `main`, manual              | `npm ci`, `npm run lint` (non-blocking for now), `next typegen && tsc --noEmit`, `npm run build` |
| `build-push` | push to `main`, manual (`workflow_dispatch`) | Builds the Docker image (buildx + GHA cache) and pushes `ghcr.io/zafsoftsolution/re-frontend:latest` and `:sha-<7-char sha>` |
| `deploy`     | after `build-push`, `main` only          | Copies `docker-compose.prod.yml` to the VPS, `pull` + `up -d` + `docker image prune -f`, then health-checks `http://127.0.0.1:9085/` |

`deploy` uses the GitHub environment **`production`** (add required reviewers there if you want a manual approval gate).

> Lint currently fails on pre-existing ESLint errors, so the Lint step has
> `continue-on-error: true`. Remove that line once the errors are fixed.

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
| `JMN_JWT_SECRET`          | **Set this in production**. If it's missing, the app falls back to an insecure dev default. |
| `INTERNAL_DJANGO_BACKEND` | Optional; defaults to `http://backend:9086` over `rakib-enterprise-net`. |

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
   `9085:9085` and external network `rakib-enterprise-net`, so `up -d` replaces the
   old locally built container in place. If compose says the container
   name is already in use, run this once and re-run the workflow:
   ```bash
   docker rm -f rakib-enterprise-frontend
   ```

### Nginx Proxy Manager

TLS and routing are handled by Nginx Proxy Manager (`nginx-proxy-manager-app-1`).
**Don't change the proxy hosts.** The container keeps the same name, host port
(9085) and network, so the existing proxy host keeps working.

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
