# Harness: spec-driven AI-in-the-SDLC

Six tasks, each one logically separate outcome. You implement them yourself (VS Code + your AI agent). The harness keeps the agent on rails and records every phase in the task doc. Each task ends in one commit.

## Pieces
| Piece | Where | Purpose |
|---|---|---|
| Context | `AGENTS.md` (loaded via `CLAUDE.md` → `@AGENTS.md`) | Repo map, API + UI contract, commands, constraints, gotchas |
| Long-term memory | `tasks/NN-*.md`, then `tasks/done/NN-*.md` when finished (committed) | Plan, spec (acceptance criteria), implementation guide, verify, review checklist, decisions, status log |
| Handoff | `scripts/handoff.sh`, hooks in `.claude/settings.json` | Works out the next action from repo state and passes it to the next agent |
| Short-term memory | `CURRENT_TASK.md` (git-ignored, from `tasks/CURRENT_TASK.template.md`) | Active task, phase, next steps, open questions, scratch notes |
| Phase commands | `.claude/commands/plan.md`, `implement.md`, `review.md` | `/plan NN`, `/implement NN`, `/review NN` in Claude Code |
| Gate | `scripts/gate.sh NN` | BRANCH (rebase on main + branch checks), PLAN, SPEC trace, BUILD (red→green), TEST (+ independent probes), REVIEW, HYGIENE |
| Probes | `scripts/probes/` | Harness-owned acceptance checks: contract shape, API behaviour vs OpenAPI, Playwright journey on the real app |

## Lifecycle per task
| Phase | Who | How | Output |
|---|---|---|---|
| 0. Branch | script | automatic (hooks), or `scripts/handoff.sh branch` | `task/NN-name` created from `main`. The task's work stays uncommitted on it until Done |
| 1. Plan | agent proposes, **you decide** | `/plan 02-api` | Questions (`- Q:` / `A:`) and a short plan in the task doc's Plan section. The agent **stops and asks** when anything is unclear. |
| 2. Spec | you | Edit the ACs in the task doc if your answers changed scope | Updated task doc (not committed yet) |
| 3. Implement (red) | agent or you | `/implement 02-api` | Failing tests that carry AC ids. `evidence/NN-red.txt` and a `red:` line in the Status log |
| 3. Implement (green) | agent or you | same command | Minimal code to pass. `evidence/NN-green.txt` and a `green:` line in the Status log |
| 4. Verify | script | `scripts/gate.sh 02-api` | Every check green. If `main` moved, the gate rebases the branch on it first (it stops on conflicts). The result is added to the task doc's Status log |
| 5. Review | agent reviews, **you triage** | `/review 02-api` | `reviews/NN.md` with findings and a verdict. Agreed fixes are made in the working tree, then it is reviewed again |
| 6. Done | script, then you | gate passes | The task doc moves to `tasks/done/` and the board below is ticked. **You make the task's one commit** `feat(NN): ...`, **fast-forward `main`** to the branch and **push** both. Copy notable agent challenges into APPROACH.md |

One commit per task, on `task/NN-name`: `feat(NN): <summary>`, made after the final gate passes. Test-first is proven by the Status log (`red:` before `green:`) and the two evidence files. The gate's BRANCH step checks that you're on the task branch, that it is rebased on `main` (it rebases if needed) with no merge commits, and that any commit on it is named `type(NN): ...`. Tasks 01 and 02 were started under the older one-commit-per-phase flow, and the gate still accepts their history.

## Automatic handoff
`scripts/handoff.sh status` works out the next action from the task docs, `CURRENT_TASK.md`, `reviews/` and the current branch.
- **New session:** a SessionStart hook gives the agent the brief: active task, next action, decisions so far, recent status.
- **Phase finished:** a Stop hook hands off once when the next action changes. `/implement` and `/review` go to a fresh agent. `/plan` and the gate stay in the current session. If nothing changed, it does nothing, so ordinary chat and repeated failures never loop.
- **Approvals:** the chain stops at plan answers, review triage and the one commit and push at the end of each task, and the agent gives you the exact commands. `.claude/settings.json` also makes Claude Code prompt on `git commit` and `git push`.
- **After you act:** tell the agent to continue. A session cannot start itself.

## Task board
| # | Task | Outcome | Verified by | Status |
|---|---|---|---|---|
| 01 | [contract](done/01-contract.md) | OpenAPI contract drafted before any code | contract probe | Done |
| 02 | [api](done/02-api.md) | FastAPI validates input and serves the 3 scenarios from the CSV fixture | pytest + API probe | Done |
| 03 | [search](done/03-search.md) | Traveller types a request, picks a demo scenario, sees progress | Vitest + journey `search` | Done |
| 04 | [results](done/04-results.md) | Traveller reviews message + cards; empty and recoverable error states | Vitest + journey `results` | Done |
| 05 | [choose](05-choose.md) | Traveller chooses one hotel by mouse or keyboard and sees a summary | Vitest + journey `choose` | Todo |
| 06 | [evidence-docs](06-evidence-docs.md) | 360px + keyboard evidence, README, APPROACH, agent-context evidence | journey `all` + doc checks | Todo |

## Brief → task traceability (every submission criterion has an owner)
| Brief criterion | Task | Checked by |
|---|---|---|
| Accept a message like the Wellington example; validate non-empty | 02 (API 422), 03 (UI guard) | pytest, API probe, Vitest, journey search |
| Show progress while the API responds | 03 | Vitest, journey search |
| Assistant message + cards: name, nightly price, currency, breakfast, explanation | 04 | Vitest, journey results |
| Select one hotel and show a clear summary | 05 | Vitest, journey choose |
| Empty result | 02 (API), 04 (UI) | pytest, probes |
| Recoverable API failure (503 + useful message) | 02 (API), 04 (UI retry) | pytest, probes |
| Scenario demo control success/empty/error; success after short delay | 01, 02, 03 | contract probe, API probe |
| Fixture CSV: number price, boolean breakfast; response labelled fixture | 01, 02, 04 | probes |
| Usable small-screen layout | 06 (built in 03–05) | journey all (360px overflow + screenshot) |
| Keyboard access | 05, 06 | journey choose (Tab/Enter, focus outline), manual notes |
| Next.js App Router + TS + Tailwind; FastAPI; public packages | starter, 03–05 | typecheck, lint |
| Focused component/state checks (Vitest + Testing Library) | 03–05 | gate SPEC trace + vitest |
| API validation/contract checks | 02 | pytest + API probe vs OpenAPI |
| OpenAPI drafted first, revisions recorded, checked against behaviour | 01, 02, 06 | gate: spec commit before feat(02); API probe; APPROACH "Contract revisions" |
| Evidence for main journey + an important failure case | 06 | `evidence/06-evidence-docs-probe.txt` + screenshots |
| README: versions, install/run/check, .env.example, fixture/demo path, branch + commit | 06 | gate doc checks |
| APPROACH: scope, assumptions, decisions, trade-offs, checks/evidence, mock boundaries, manual keyboard checks, limitations, unverified, time, 2–3 agent interactions labelled, contract revisions | 06 | gate doc checks |
| AGENTS.md actually loaded by the agent | starter, 06 | `CLAUDE.md` import + `evidence/agent-context-loaded.txt` |
| No secrets / personal data | every task | gate HYGIENE |
| 4-hour cap; stop and explain what remains | every task | Time log in APPROACH |
