# Git-driven editing of n8n workflow logic (scoring JS, questions/prompts)

## Context

`n8n/workflows/*.json` (bant-prequalify, chat-agent, link-lead, scrape-doris-school) are already
committed to git — but only as one-way UI exports. The BANT scoring regex logic
(`pre-qualifyJS` Code node in `bant-prequalify.json`) and the qualification questions/persona
(`AI Agent.systemMessage` in `chat-agent.json`) live as opaque strings inside those JSON blobs.
ADR-0006 already flagged this as a trade-off ("workflow logic lives in JSON blobs — weaker diffs
than the current typed route"). Editing either today means opening the n8n UI, hand-editing a
Code node or a giant prompt string, and manually re-exporting — no diff review, no PR, no rollback
via git.

The question: can editing that JS/questions happen *from the repo* instead, given self-hosted n8n
**Community Edition** (confirmed: no Environment Variables, no native Git Source Control — that's
Enterprise/Business-only) and ADR-0004's constraint of staying free/self-hosted for MVP. There is
currently **no existing sync plumbing** — no docker-compose.yml, no CI touching `n8n/**`, no
export/import scripts — so this is greenfield.

n8n's **Public REST API is free on Community Edition** (API-key auth, `/api/v1/workflows/:id`),
which is the key fact that makes a git-driven approach possible without a paid tier.

## Researched approaches

| # | Approach | How it works | Effort | Maintenance | Cost | Fit for "edit JS/questions from git" |
|---|----------|--------------|--------|-------------|------|---------------------------------------|
| A | **Status quo, formalized** — manual export/import | Edit in n8n UI, export JSON, commit; import manually elsewhere | Very low | Low | Free | Low — no real code-driven editing, just after-the-fact snapshotting |
| B | **REST API push script** (git → running n8n) | Script (local or GitHub Action) reads `n8n/workflows/*.json` and `PATCH`es the live workflow via n8n's public API on merge to main | Medium — build + securely store API key, map workflow IDs | Medium — n8n API/version drift can break payload shape | Free | High — true "push from git", full workflow (nodes+JS+prompts) becomes deployable from a commit |
| C | **Externalize the editable surface** — thresholds, keyword lists, and the questions/system prompt move to a small JSON/YAML/text file in the repo; an HTTP Request node fetches it (raw GitHub URL) at run time instead of the value being hardcoded in the Code/Agent node | Medium — refactor `pre-qualifyJS` to consume fetched config, replace the inline systemMessage with a fetched prompt template | Low-medium — cache/rate-limit awareness for GitHub raw requests | Free | **Highest for the actual ask** — exactly the "questions" and scoring thresholds become plain files anyone can PR without touching n8n at all; wiring stays in n8n UI |
| D | **Bind-mount the repo into the n8n container**, Code node `require()`s a local `.js` file kept in sync via `git pull` on the host | Low-medium to build, but requires a stable single-host Docker topology (doesn't exist yet — no docker-compose.yml committed) | Medium — needs an auto-pull mechanism (webhook/cron) and `NODE_FUNCTION_ALLOW_*` env config | Free | High UX (edit a real `.js` file) but couples you to one host; brittle if hosting changes later |
| E | **n8n native Git Source Control** | Built-in git push/pull + branch switching for entire workflow set | Near-zero (native feature) | Low | **Paid** — Business/Enterprise only | High capability, but violates ADR-0004 (self-hosted/free-for-MVP) |
| F | **CI lint/review gate only** (no auto-deploy) | GitHub Action validates JSON is well-formed and diffable on PR; deploy still manual | Low | Low | Free | Medium — better review trail, doesn't achieve "edit and it takes effect" |

## Recommendation

Combine **C + B**, in that order:

1. **Do C first** — it directly answers the ask with the least architectural risk. Pull the
   BANT keyword/threshold tables and the chat-agent qualification questions/persona out of
   `pre-qualifyJS` and the `AI Agent.systemMessage` into e.g. `n8n/config/bant-scoring.json` and
   `n8n/config/chat-agent-prompt.md`. Both Code/Agent nodes fetch these via HTTP Request
   (raw GitHub content, or a lightweight endpoint if you'd rather not depend on GitHub raw
   uptime/latency). Non-developers can PR wording/threshold changes with zero n8n UI
   access; diffs are plain text/JSON, reviewable and revertible via git as usual.
2. **Add B once you're touching workflow structure itself** (new nodes, rewired branches, not
   just prompt/threshold tweaks) — a small script using the n8n public API to push a workflow
   JSON file to the running instance on merge. This is the piece that makes *structural* changes
   git-deployable, but it's more machinery than needed just to solve "edit the JS/questions."
3. **Skip D** until a concrete Docker/VPS hosting decision is locked in (there's no
   docker-compose.yml yet) — it's the most host-coupled option and premature before that's settled.
4. **Skip E** — contradicts ADR-0004's explicit free/self-hosted-for-MVP decision; revisit only if
   the product moves to a paid n8n tier later.

This is an architecture decision — once confirmed, the next step is writing an ADR (`/adr-new`)
recording it, then implementing C for `bant-prequalify.json` and `chat-agent.json`.

## Verification (once implemented)

- Edit `n8n/config/bant-scoring.json` (e.g. change a keyword), commit, confirm the next webhook
  test call to `bant-prequalify` reflects the new scoring without any n8n UI edit.
- Same check for a wording change in `n8n/config/chat-agent-prompt.md` against `chat-agent`'s
  webhook.
- If B is added later: merge a workflow JSON change to main, confirm `GET
  /api/v1/workflows/:id` on the running instance shows the updated node content.
