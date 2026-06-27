# lawrence

A backend data ingestion platform for efficiently scraping, validating, and storing data along defined pipelines. Built with n8n (workflow orchestration) + backend services + Supabase.

**Status:** MVP in development  
**Domain:** chat.mach2.cloud

## Quick Start

### Prerequisites

- Docker & Docker Compose
- Node.js 18+ (for backend development)
- Supabase account (or local PostgreSQL)

### Local Development

```bash
# 1. Clone and install
git clone <repo-url>
cd lawrence
npm install

# 2. Set up environment
cp .env.example .env.local
# Edit .env.local with your credentials (Supabase, OpenAI, etc.)

# 3. Start services
docker-compose up -d

# 4. Initialize database
npm run db:migrate

# 5. Access n8n UI
# → http://localhost:5678
```

## What Is This?

**lawrence** automates data acquisition pipelines:

1. **Scrape** data from external sources (APIs, websites, feeds)
2. **Validate** incoming data against schemas
3. **Enrich** with AI agents (extract entities, summarize, transform)
4. **Store** in Supabase (PostgreSQL)
5. **Serve** via REST API (optional)

Example pipeline:
```
Fetch JSON from API → Validate schema → Extract entities via OpenAI → Store in DB → Alert if anomalies
```

## Architecture

```
n8n (Orchestration)
    ↓
Backend Services (Validation, AI agents)
    ↓
Supabase (Persistent storage)
```

- **n8n** defines *when* and *how* workflows run (scheduling, webhooks, parallelism)
- **Backend** handles *what* happens (data transformation, AI enrichment, validation)
- **Database** persists results with audit trails

See [CLAUDE.md](./CLAUDE.md) for detailed architecture & design decisions.

## File Structure

```
lawrence/
├── docker-compose.yml      # Local dev environment
├── n8n/                    # Workflow definitions (JSON)
├── src/                    # Backend code (validation, agents, APIs)
├── database/               # Schema migrations
├── docs/                   # Detailed guides
└── CLAUDE.md               # Development guidelines for Claude
```

## Common Commands

| Task | Command |
|------|---------|
| Start local services | `docker-compose up -d` |
| View logs | `docker-compose logs -f` |
| Run backend locally | `npm run dev` |
| Run tests | `npm test` |
| Migrate database | `npm run db:migrate` |
| Deploy to staging | `./scripts/deploy.sh preview` |
| Deploy to production | `./scripts/deploy.sh production` |

## Key Features (Planned)

- [x] n8n workflow templates
- [x] Docker Compose for local dev
- [ ] Data validation framework
- [ ] AI agent integration (OpenAI)
- [ ] REST API for pipeline results
- [ ] Monitoring & alerting dashboard
- [ ] Airflow migration guide (when needed)

## Tech Stack

| Layer | Tech |
|-------|------|
| Orchestration | n8n (MVP) → Airflow (future) |
| Backend | Node.js + TypeScript |
| Database | Supabase (PostgreSQL) |
| AI/LLM | OpenAI GPT models |
| Deployment | Docker + Cloud (GCP/AWS/Azure) |

## Development

For detailed development guidelines, see [CLAUDE.md](./CLAUDE.md).

**Quick tips:**
- Add new pipelines by creating n8n workflows in `n8n/workflows/`
- Validation & transformation logic goes in `src/services/`
- Database schemas live in `database/migrations/`
- Environment variables in `.env.local` (never commit credentials)

## Deployment

Deployment scripts handle:
1. Building Docker images
2. Pushing to cloud registry
3. Deploying services (n8n, backend, database)
4. Running migrations
5. Health checks

```bash
./scripts/deploy.sh production
```

See `docs/DEPLOYMENT.md` for cloud-specific setup (GCP, AWS, Azure).

## Troubleshooting

**n8n won't start:**
```bash
docker-compose logs n8n
# Check port 5678 isn't in use
# Clear n8n volume: docker volume prune
```

**Database migration fails:**
```bash
# Check Supabase connection
# See database/migrations/ for error details
npm run db:migrate -- --dry-run
```

**Backend API errors:**
```bash
npm run dev  # Run with logging
# Check .env.local has all required keys
```

See `docs/TROUBLESHOOTING.md` for more.

## Contributing

1. Create a feature branch: `git checkout -b feature/your-feature`
2. Make changes (see CLAUDE.md for code guidelines)
3. Commit: `git commit -m "Add: description"`
4. Push and open a PR

## License

MIT

---

**Questions?** See the [docs/](./docs/) folder or reach out to the team.
