---
description: Rules for AI agent code in src/agents/
globs: ["src/agents/**/*.ts", "src/agents/**/*.py"]
---

# AI Agent Rules

## Model Selection

> **Per-job model routing is governed by [ADR-0015](../docs/adr/0015-ai-model-provider-strategy.md).**
> That ADR is `proposed`: its routing table is a hypothesis under evaluation, not a plan of record.
> This project deliberately runs two providers — `.claude/rules/chatbot.md` defaults to
> `claude-haiku-4-5` for parent-facing turns while this file defaults to `gpt-4o-mini` for
> extraction. Once build step 12 lands the provider seam, **no model may be hardcoded outside
> `src/Chatbot/lib/ai/provider.ts`**. The defaults below are the current values, not a settled
> decision.

- Default to `gpt-4o-mini` for classification/extraction (cheap, fast)
- Use `gpt-4o` only for complex reasoning tasks where output quality matters
- Always pass `model` as a named constant at the top of the file, not hardcoded in the call

## Prompt Design
- System prompts live in `src/agents/prompts/` as `.txt` files — never inline in code
- Include output format instructions in every system prompt (JSON schema or example)
- Add a `temperature: 0` for deterministic extraction tasks

## Error Handling
- All OpenAI calls must have retry logic with exponential backoff
- Log token usage (`prompt_tokens`, `completion_tokens`) for cost tracking
- If the model returns malformed JSON, log the raw response and throw — do not silently skip

## Structure
Each agent file exports a single async function: `async function run(input: AgentInput): Promise<AgentOutput>`
Never make an agent file do more than one logical task.
