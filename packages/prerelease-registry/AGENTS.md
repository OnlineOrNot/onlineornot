# Prerelease Registry

Cloudflare Pages Function serving CLI prerelease artifacts from GitHub Actions.

## Purpose

Enables installing PR builds via npm:
```bash
npm install https://prerelease-registry.onlineornot.workers.dev/prs/<PR#>/onlineornot
```

## Structure

```
packages/prerelease-registry/
├── functions/routes/
│   ├── _middleware.ts        # CORS headers
│   ├── index.ts              # Landing page
│   ├── prs/[[path]].ts       # /prs/:prId/:name
│   └── runs/[[path]].ts      # /runs/:runId/:name
├── functions/utils/
│   ├── getArtifactForWorkflowRun.ts  # Artifact extraction
│   └── gitHubFetch.ts                # GitHub API client
└── wrangler.toml             # CF config
```

## Routes

| Route | Purpose |
|-------|---------|
| `GET /` | HTML landing page |
| `GET /prs/:prId/:name` | Fetch artifact by PR number |
| `GET /runs/:runId/:name` | Fetch artifact by workflow run ID |

## How It Works

1. Request hits `/prs/123/onlineornot`
2. Fetches PR info from GitHub API to get branch SHA
3. Finds workflow run (ID: 19014954)
4. Downloads artifact ZIP from GitHub Actions
5. Extracts `.tgz` using JSZip
6. Returns tarball (cached 1 week)

## Environment

| Variable | Source |
|----------|--------|
| `GITHUB_USER` | wrangler.toml ("onlineornot") |
| `GITHUB_API_TOKEN` | Secret |

## Commands

```bash
npm run start    # Local dev
npm run build    # wrangler pages functions build
npm run publish  # Deploy to CF
```
