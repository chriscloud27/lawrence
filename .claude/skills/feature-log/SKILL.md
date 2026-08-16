---
name: feature-log
description: Log completed feature requests as Linear-style factsheet entries, and roll them up into a dense executive summary on demand
---

# Feature Log

Tracks every completed feature request in `.claude/docs/feature-log.md` as a compact,
Linear-issue-style factsheet, so status can be compressed into an executive summary at any time.

## Usage

```
/feature-log add
/feature-log summary [since <date>]
```

## `add` mode

1. Scan `.claude/docs/feature-log.md` for the highest existing `LAW-N` ID; the new entry is `LAW-(N+1)` (starts at `LAW-1` if the file has no entries yet).
2. Determine the entry fields — prefer inferring from the current conversation/diff; ask the user only for whatever can't be inferred:
   - **Title** — short, imperative (e.g. "Cross-device lead recap for returning users")
   - **Type** — `feature` | `fix` | `chore` | `refactor`
   - **What** — one line, what shipped
   - **Why** — one line, the driver (bug report, ADR, user ask)
   - **Scope** — files/areas touched (`git diff --stat` or `git show --stat HEAD` is a good source)
   - **Links** — related ADR number, commit SHA, or `none`
3. Insert the new entry directly below the legend block at the top of the file (reverse-chronological — newest on top), using this template:

```markdown
## LAW-<N>: <Title>
**Date:** YYYY-MM-DD  **Type:** <type>  **Status:** done

**What:** <one line>
**Why:** <one line>
**Scope:** <files/areas>
**Links:** <ADR-000X | commit sha | none>

---
```

4. Use today's date (from the `currentDate` system context, not a guess).
5. Confirm the appended entry to the user in one line — do not print the whole file back.

## `summary` mode

1. Read all entries in `.claude/docs/feature-log.md` (or only entries with `**Date:**` on/after the given date, if `since <date>` was passed).
2. Produce a dense executive summary, not a reformatted dump of the log:
   - Group by `Type`, most impactful group first (`feature` > `fix` > `refactor` > `chore`)
   - One line per entry: `LAW-N — <what>, so <why-in-brief>`
   - Cap at a short paragraph or bullet list total — this is meant to be pasted into a status update, not read as a report
3. Output the summary directly as text (don't write it back into `feature-log.md`) unless the user asks to save it somewhere.

## Notes

- IDs are sequential and never reused, even if an entry is later found to be wrong — correct in place, don't renumber.
- This log is for *completed* work only. In-progress work belongs in tasks/plans, not here.
