---
name: factory
description: Run the software factory. Use when the user types /factory <feature>, /factory next, /factory approve <job-id>, or /factory rework <job-id> <note>. The session that runs it becomes the orchestrator of the spec → build → gate → review → approve loop.
---

# Factory

You are the orchestrator for one job. You run the loop below, spawn every agent,
and are the only writer of your job's `job.json`. You never write code, specs,
reviews or decisions yourself. Agents do the work and each writes one file; you
move the job along and keep `job.json` current.

The same loop also exists as a script, `factory/bin/factory`, for headless runs
(`factory run "<feature>"`). It spawns each agent below with `claude -p --agent
<name>` and the same prompts. Use this skill when you want to orchestrate from a
Claude Code session; use the script when you want a one-command run or a CI job.
Both write the same files, so the dashboard shows either.

## The loop

```
feature → spec-writer → builder → gate (checks.sh) → [security, ux, ui, code] → WAIT FOR ALL
                           ▲             │ FAIL                                      │
                           └─────────────┴──── any CHANGES: resume builder ◄─────────┤
                                                                                     ▼ all PASS
                                                        merge to main ◄─ APPROVE ─ approver ─ ESCALATE → needs-human
```

| Step         | Agent (`subagent_type`) | Writes                                      |
| ------------ | ----------------------- | ------------------------------------------- |
| spec         | `spec-writer`           | `spec.md`                                   |
| build        | `builder`               | `build.md` + commits on `factory/<job-id>`  |
| gate         | you, running `factory/checks.sh` | `round-N/checks.md`                |
| review       | `reviewer-security`     | `round-N/review-security.md`                |
|              | `reviewer-ux`           | `round-N/review-ux.md`                      |
|              | `reviewer-ui`           | `round-N/review-ui.md`                      |
|              | `reviewer-code`         | `round-N/review-code.md`                    |
| approve      | `approver`              | `decision.md`                               |

`MAX_RESUMES = 2`: after round 1 the builder can be resumed at most twice, so a
run has at most 3 review rounds. To change the factory, edit this file and the
agent files in `.claude/agents/`.

Every agent reads `AGENTS.md` for the repo's setup, dev server, validation
commands and conventions. Nothing repo-specific lives in these files.

## Parallel jobs

Every job runs in its own git worktree on its own branch, so several jobs can run
at once, one per Claude session. To run three features, open three sessions in
this repo and start `/factory` in each. Your session orchestrates only the job it
started or was handed.

- Your session stays in the main checkout. Agents work in the job's worktree.
  The main checkout is the user's, and it may be dirty or on another branch.
  Only **Merge** touches it.
- Job state lives in `factory/jobs/<job-id>/` in the main checkout, never in a
  worktree. Each job has its own `job.json`, so sessions never write the same
  file.
- Each job gets its own dev server ports, so reviewers of different jobs never
  see each other's pages.

## Files

`<repo>` is the git checkout (`git rev-parse --show-toplevel` from your session)
and `<name>` is its folder name. This factory may live at the repo root or in a
subfolder; `<project>` is the folder holding `AGENTS.md`, `apps/` and
`factory/`, and `<project-in-worktree>` is the same folder inside the worktree.
`factory/jobs/` is runtime state; only the example job is committed.

```
<project>/factory/backlog.md                      queue for /factory next
<project>/factory/jobs/<job-id>/job.json          the job's state (you write it, the dashboard reads it)
<project>/factory/jobs/<job-id>/spec.md
<project>/factory/jobs/<job-id>/build.md
<project>/factory/jobs/<job-id>/rework-<k>.md     written by you, from /factory rework
<project>/factory/jobs/<job-id>/round-<N>/checks.md
<project>/factory/jobs/<job-id>/round-<N>/review-{security,ux,ui,code}.md
<project>/factory/jobs/<job-id>/decision.md
<repo>/../<name>-factory/<job-id>/                 the job's worktree, on factory/<job-id>
```

### job.json

```json
{ "id": "002-liability-quote", "feature": "General liability premium quote for SMEs",
  "branch": "factory/002-liability-quote",
  "worktree": "/Users/tamer/code/insurtech-apps-factory/002-liability-quote",
  "stage": "review", "round": 2, "gate": "PASS",
  "reviews": { "security": "CHANGES", "ux": "PASS", "ui": "pending", "code": "PASS" } }
```

- `stage` is one of `spec`, `build`, `review`, `approve`, `merged`,
  `needs-human`. Worktree setup counts as `spec`; the gate counts as `review`.
- `round` is the current review round (0 until the first round starts).
- `gate` is `PASS`, `FAIL` or `null` for the current round.
- `reviews` holds the current round only. Each value is `pending`, `PASS` or
  `CHANGES`. Earlier rounds live in their `round-<N>/` folders, which the
  dashboard reads directly.
- Rewrite the whole file on every change. `worktree` is always an absolute path.

### Prompts

Every agent prompt starts with the job's absolute paths:
`Job folder: <project>/factory/jobs/<job-id>/. Worktree: <worktree>. Project: <project-in-worktree>. Branch: factory/<job-id>.`
Below, `<paths>` stands for that sentence.

Agents that open pages also get a port. With `n` the job number (`003` → 3),
the builder gets `5100 + 10n`, `reviewer-ux` gets `5101 + 10n` and `reviewer-ui`
gets `5102 + 10n`, appended as ` Port: <port>.`

## /factory <feature>

1. **Create the job.** `mkdir -p factory/jobs`, then pick the next 3-digit number
   after the highest numbered folder in `factory/jobs/` (`001` if there are
   none) and a 2–4 word kebab-case slug of the feature: `002-liability-quote`.
   Claim it with `mkdir factory/jobs/<job-id>` (no `-p`). If that fails because
   another session took the number, pick the next number and try again.
   The worktree path is `$(cd .. && pwd)/$(basename "$PWD")-factory/<job-id>`,
   run from `<repo>`. Write `job.json` with that `worktree`, `stage: "spec"`,
   `round: 0`, `gate: null` and all reviews `pending`.
2. **Worktree.** Create the branch and its worktree from `main`:
   ```bash
   git worktree add -b factory/<job-id> <worktree> main
   ```
   Then, in `<project-in-worktree>`, run the setup AGENTS.md gives for a fresh
   checkout. If any of it fails, stop and tell the user.
3. **Spec.** Spawn `spec-writer` with the prompt
   `<paths> Feature: <feature, verbatim>`.
   Wait for it to finish, then check that `spec.md` exists.
4. **Build.** Set `stage: "build"`. Spawn `builder` **with the name
   `builder-<job-id>`** and the prompt `<paths> Build round 1. Port: <port>.`
   Wait for it to finish, then go to **Build check**.

### Build check

Read the first line of `build.md`.

- `STATUS: READY`: go to **Gate**.
- `STATUS: BLOCKED`: go to **Needs human**.

### Gate

Set `stage: "review"`, `round: N` (one more than before), `gate: null` and all
four reviews to `pending`. Create `round-<N>/`. Run the main checkout's copy of
the checks inside the worktree:

```bash
bash <project>/factory/checks.sh   # with cwd = <project-in-worktree>
```

Write `round-<N>/checks.md`: first line `GATE: PASS` or `GATE: FAIL`, then
`COMMIT: <sha>`, a blank line, and the command output in a code block. Set
`gate` in `job.json`.

- `PASS`: go to **Review round N**.
- `FAIL`, resumes left: set `stage: "build"` and resume the builder:
  `The gate failed in round N; see factory/jobs/<job-id>/round-<N>/checks.md. Fix it, commit, and update build.md for round N+1.`
  Then go to **Build check**.
- `FAIL`, no resumes left: write `decision.md` yourself, reading `ESCALATE`, a
  blank line, then `The gate failed in round <N>, the last allowed round.` Go
  to **Needs human**.

### Review round N

1. Spawn all four reviewers **in one message**, so they run in parallel. Each
   gets the prompt `<paths> Review round N.`, plus its port for `reviewer-ux`
   and `reviewer-ui`.
2. **WAIT FOR ALL.** Each time a reviewer finishes, read the first line of its
   file (`VERDICT: PASS` or `VERDICT: CHANGES`) and write that verdict to
   `job.json` straight away, so the dashboard chips fill in as they land. The
   round is done only when all four `review-*.md` files exist in `round-<N>/`.
   Never resume the builder mid-round. If a reviewer finishes without writing
   its file, or writes a first line that isn't a verdict, stop and tell the user.
3. Decide:
   - **All PASS**: go to **Approve**.
   - **Any CHANGES, resumes left**: set `stage: "build"`, then resume the same
     builder with `SendMessage` to `builder-<job-id>`:
     `Round N reviews are in factory/jobs/<job-id>/round-<N>/. Address every review with VERDICT: CHANGES, commit, and update build.md for round N+1.`
     Wait for it to finish, then go to **Build check**.
   - **Any CHANGES, no resumes left**: write `decision.md` yourself, reading
     `ESCALATE`, then a blank line, then
     `Review rounds exhausted. Outstanding CHANGES in round-<N>/ from: <reviewers>.`
     Go to **Needs human**.

### Approve

Set `stage: "approve"`. Spawn `approver` with the prompt `<paths> Final round: N.`
When it finishes, read the first line of `decision.md`:

- `APPROVE`: go to **Merge**.
- `ESCALATE`: go to **Needs human**.

### Merge

The merge happens in the main checkout, so it must be clean and on `main`:
`git status --porcelain -- . ':!<project>/factory/backlog.md' ':!<project>/factory/jobs'`
prints nothing and `git branch --show-current` prints `main`. The backlog is
exempt because every `/factory next` edits it, and `factory/jobs/` because it is
runtime state; job branches never touch either, so they cannot conflict with
the merge. If not, set `stage: "needs-human"` and tell the user the job is
approved but the main checkout is busy; they run `/factory approve <job-id>`
once it is clean. Otherwise:

```bash
git merge --no-ff factory/<job-id> -m "Merge factory/<job-id>"
git worktree remove <worktree>
git branch -d factory/<job-id>
```

Set `stage: "merged"`. If the merge fails, run `git merge --abort` (when a merge
is in progress), set `stage: "needs-human"` and tell the user why. If removing the
worktree fails, the job is still merged: tell the user what `git worktree remove`
printed. Never push, never deploy.

### Needs human

Set `stage: "needs-human"`. The branch and its worktree stay for the human to
inspect. Tell the user which job is waiting, give the worktree path, and quote
`decision.md` (or the BLOCKED reason from `build.md`).

## /factory next

Read `factory/backlog.md` and take the first `- [ ]` item. Claim it with one
Edit that replaces its exact line with `- [x] <item> → claimed`. If the Edit
fails because the line changed, another session claimed it: re-read the backlog
and try the next `- [ ]` item. If none is left, say so and stop.

Run `/factory <item>`, and once step 1 has given it a job id, replace `claimed`
on its backlog line with the job id.

## /factory approve <job-id>

The job must be in `needs-human`. Run **Merge** with that job id.

## /factory rework <job-id> <note>

The job must be in `needs-human`.

1. Write the note, verbatim, to `factory/jobs/<job-id>/rework-<k>.md`, where `k`
   is the next unused number.
2. Set `stage: "build"`.
3. Spawn a fresh `builder` named `builder-<job-id>` with the prompt
   `<paths> Rework: read rework-<k>.md and address it, then update build.md for round N+1. Port: <port>.`
   (`N` is the job's last round.) A rework run gets a fresh `MAX_RESUMES`.
4. Continue from **Build check**, exactly like a new job.

## Reporting

Keep the user posted with one short line per transition, for example
`002-liability-quote: round 2, gate PASS, security CHANGES, ux/ui/code PASS → resuming builder`.
When the job ends, say whether it merged or needs a human, and why.
