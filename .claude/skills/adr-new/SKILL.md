---
name: adr-new
description: Auto-generate a new Architecture Decision Record with correct numbering
---

# Create New ADR

Auto-generates a new Architecture Decision Record with the next available number and fills in the template.

## Usage

```
/adr-new
```

Then describe the decision you want to document (or I'll prompt for title and decision details).

## What it does

1. Scans `.claude/docs/adr/` for all existing ADR files
2. Finds the next available four-digit number
3. Creates a new file: `.claude/docs/adr/XXXX-title.md`
4. Copies structure from `0000-template.md`
5. Pre-fills **Date** and asks for title, decision text
6. Leaves **Status** as `proposed` (you edit to `accepted` when ready)

## Example

```
Input: "We should adopt OpenTofu instead of Terraform for better license alignment"

Output: Creates `.claude/docs/adr/0002-adopt-opentofu.md` with:
- Filename: 0002-adopt-opentofu.md (next number after 0001)
- Status: proposed
- Date: today
- Sections: Context (left blank for you), Decision, Consequences (left blank for you)
```

## Then

1. Fill in **Context**: Why was this decision needed?
2. Fill in **Decision**: What was decided?
3. Fill in **Consequences**: What impact does this have?
4. Update **Status** to `accepted` if the decision is final
5. Commit the file
