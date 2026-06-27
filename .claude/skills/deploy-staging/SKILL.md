---
name: deploy-staging
description: Deploy backend services to the staging environment. Builds Docker images, pushes to registry, runs migrations, restarts containers.
---

# Deploy to Staging

## Steps

1. **Verify working tree is clean**
   ```bash
   git status --short
   ```
   Abort if there are uncommitted changes — staging should always reflect committed code.

2. **Run pre-deploy checks**
   ```bash
   bash .claude/skills/deploy-staging/scripts/pre-deploy-check.sh
   ```
   This validates: `.env.example` is up to date, Docker builds succeed, no secrets in code.

3. **Build and push Docker images**
   ```bash
   docker-compose -f docker/docker-compose.prod.yml build
   docker-compose -f docker/docker-compose.prod.yml push
   ```

4. **Run database migrations on staging**
   ```bash
   supabase db push --db-url "$STAGING_DATABASE_URL"
   ```

5. **Restart staging containers**
   ```bash
   bash .claude/skills/deploy-staging/scripts/restart-staging.sh
   ```

6. **Verify health checks**
   ```bash
   bash .claude/skills/deploy-staging/scripts/health-check.sh
   ```

7. Report deployment summary: which services restarted, migration output, health check results.
