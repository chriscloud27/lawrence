---
description: Rules for Docker and docker-compose files
globs: ["docker/**/*", "docker-compose*.yml", "**/Dockerfile"]
---

# Docker Rules

## docker-compose
- All services must define `restart: unless-stopped` for production compose files
- Use named volumes (not bind mounts) for persistent data (n8n data, DB data)
- Each service must have a `healthcheck` defined

## Dockerfiles
- Use specific version tags — never `latest` (e.g., `node:20-alpine`, not `node:latest`)
- Multi-stage builds for backend: `builder` stage compiles, `runner` stage is minimal
- Run as non-root user: add `USER node` (or equivalent) before `CMD`

## Environment Variables
- Never hardcode values in Dockerfiles or docker-compose
- Use `${VAR_NAME}` syntax in docker-compose.yml, sourced from `.env.local`
- Document all required vars in `.env.example`

## n8n Container
- n8n data volume must be named `n8n_data` and never deleted without backup
- n8n workflows should be imported via `/n8n/workflows/` on startup, not recreated manually
