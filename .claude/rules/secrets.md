# Secrets & Credentials Policy

## What counts as a secret
- API keys, tokens, passwords, private keys (any format)
- Connection strings containing credentials or hostnames
- Project references / resource IDs that identify live infrastructure (e.g. Supabase project ref)
- Webhook URLs with embedded tokens
- Any value from `.env.local`, `.env`, `supabase/.temp/`

## Where secrets live
| Location | Purpose | Committed? |
|---|---|---|
| `.env.local` | Runtime secrets for local development | **No** — gitignored |
| `supabase/.temp/` | Supabase CLI runtime state (project ref, pooler URL) | **No** — gitignored + claudeignored |
| `.env.example` | Documents required var names with placeholder values | **Yes** — no real values |

## Rules for Claude

1. **Never read credential files into context** unless the user explicitly says "you can read `.env.local`" in this session. `.env.local` and `supabase/.temp/` are excluded via `.claudeignore`.

2. **Never write secrets to committed files.** If a task requires a real value, write a placeholder and instruct the user to fill it in manually.

3. **Never log or print secrets.** Do not run commands that would print secret values to stdout (e.g. `cat .env.local`, `echo $SUPABASE_SERVICE_KEY`).

4. **Reference pattern.** In any config, workflow, or code file: use `$env.VAR_NAME`, `env(VAR_NAME)`, or `${VAR_NAME}`. Never inline the value.

5. **Project refs and resource IDs** are treated as sensitive — do not hardcode them in committed documentation. Use `<your-project-ref>` as a placeholder.

## User grant
If the user explicitly says "you may access [file/secret]" in the current session, that grants one-session permission for that specific resource. It does not grant permanent access to all secrets.

## Pre-bash hook
`.claude/hooks/pre-bash-safety.sh` blocks commands that would print credential files. If you need to add a new dangerous pattern, edit that file — do not bypass the hook.
