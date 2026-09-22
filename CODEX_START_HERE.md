# Codex session prompts

## First session: plan only

Read AGENTS.md, ROADMAP.md and PROJECT_STATUS.md. We are starting Forkd Slice 0. Inspect the project, then consult DATA_MODEL.md, SEED_DATA_GUIDE.md and ENVIRONMENT.md. Do not write application code yet. Propose the smallest step-by-step plan covering app setup, migrations/RLS, email auth, verified manual seed data, a public database-backed list and an early Vercel preview. Identify affected files, dependencies and acceptance checks F1–F4. State assumptions and ask only questions that materially block this slice. Do not implement later slices or any non-goals.

## After reviewing the plan

Proceed with the reviewed Slice 0 plan. Implement only that slice. Run the configured checks and verify its acceptance criteria; distinguish passed checks from those blocked by credentials or unavailable verified seed data. Summarize what changed, why, security behavior and manual checks. Update PROJECT_STATUS.md with evidence and a concise next step. Do not fabricate restaurant data or mark untested work complete.

## Subsequent slice

Read AGENTS.md, ROADMAP.md and PROJECT_STATUS.md. The current target is Slice [number/name]. Inspect relevant code and propose the smallest plan that satisfies its acceptance IDs. Identify files and database/auth changes. Do not write code yet or begin later features. Use relevant spec sections instead of re-reading unrelated context.

## Review prompt

Review this slice against its acceptance criteria and non-goals. Check failure paths, auth/RLS, aggregate correctness, N+1 queries and phone usability. Report concrete issues, explain the changes in plain language and provide a short manual test sequence. Fix in-scope defects already authorized, rerun affected checks and update PROJECT_STATUS.md.

## Handoff discipline

Keep a current status note instead of pasting the entire conversation into each new task. Include slice, completed acceptance IDs, files changed, tests actually run, unresolved blockers and next action. This reduces repeated context; it does not guarantee a particular token allowance. Plan-first and human review remain the default workflow.
