# M.A.T.R.I.X Agent Workflow System Overview

## Purpose
M.A.T.R.I.X uses GitHub Actions as a multi-agent automation pipeline. Each workflow acts as a specialized agent that reacts to file changes or runtime events, generates outputs, and hands off work to downstream agents.

## Agent Trigger and Output Map

| Agent | Trigger | Expected Output |
|---|---|---|
| Master Orchestrator Agent | Manual run (`workflow_dispatch`) | `tasks/architect_task.md` |
| System Architect Agent | Push to `tasks/architect_task.md` | `design/architecture.md` |
| Core OS Developer Agent | Push to `design/architecture.md` | `src/core/file_system.py`, `src/core/process_manager.py` |
| UI/UX Agent | Push to `design/architecture.md` | `docs/ui_design.md`, `src/ui/index.html`, `src/ui/style.css`, `src/ui/script.js` |
| Package & Dependency Agent | Push to `design/architecture.md`, `src/core/**`, `src/ui/**` | `docs/dependencies.md` |
| Debugger & Tester Agent | Push to `src/core/**`, `src/ui/**` | `docs/test_report.md` |
| Build & Export Agent | Push to `docs/test_report.md`, `src/core/**`, `src/ui/**` | `build/matrix_executable.bin`, `iso_build/matrix_boot.iso`, `docs/build_instructions.md` |
| Updater Agent (advanced) | Daily schedule (`cron`) and manual run (`workflow_dispatch`) | `docs/updater_report.md` |
| Learning Agent (advanced) | Completed `workflow_run` for Debugger/Build agents, only when run conclusion is `failure` | `docs/learning_agent_report.md` |

## Pipeline Diagram (Core + Advanced Agents)

```text
Manual Trigger
   │
   ▼
[Master Orchestrator Agent]
   │ writes tasks/architect_task.md
   ▼
[System Architect Agent]
   │ writes design/architecture.md
   ├───────────────────────────────┐
   ▼                               ▼
[Core OS Developer Agent]      [UI/UX Agent]
   │ writes src/core/*             │ writes docs/ui_design.md + src/ui/*
   └───────────────┬───────────────┘
                   ▼
        [Package & Dependency Agent]
                   │ writes docs/dependencies.md
                   ▼
          [Debugger & Tester Agent]
                   │ writes docs/test_report.md
                   ▼
           [Build & Export Agent]
                   │ writes build/* + iso_build/* + docs/build_instructions.md
                   │
   schedule/manual ▼                         workflow_run(failure) ▼
        [Updater Agent]                            [Learning Agent]
   writes docs/updater_report.md             writes docs/learning_agent_report.md
```

## Advanced Agent Workflows

### Updater Agent Workflow
**What it does:** Periodic health and freshness scan for generated modules and docs.

- **Triggers**
  - Scheduled run at `0 1 * * *` (daily 01:00 UTC; cron format is `minute hour day_of_month month day_of_week`)
  - Manual run from GitHub Actions (`workflow_dispatch`)
- **Expected output**
  - `docs/updater_report.md` containing stale areas, improvement ideas, and suggested owner-agent follow-up.
- **Especially useful when**
  1. You want regular module refresh recommendations without waiting for failures.
  2. Several generated areas have drifted over days and need proactive cleanup.
  3. You need periodic backlog generation for Core/UI teams.
- **Example scenario**
  - Core modules have not changed for a week while UI evolves quickly. Updater flags stale core APIs and suggests routing a follow-up task to Core OS Developer Agent.

### Learning Agent Workflow
**What it does:** Post-failure learning loop that converts failed test/build events into repeatable prevention guidance.

- **Triggers**
  - GitHub `workflow_run` completion for:
    - `Debugger & Tester Agent`
    - `Build & Export Agent`
  - Runs only if conclusion is `failure`.
- **Expected output**
  - `docs/learning_agent_report.md` with failed workflow metadata, recurring failure patterns, and prompt/process improvements.
- **Especially useful when**
  1. The same build/test failures appear repeatedly across runs.
  2. Prompt quality needs tightening (e.g., missing implementation checks).
  3. You want trend-based hardening of agent prompts and handoff criteria.
- **Example scenario**
  - Build fails repeatedly after test report updates. Learning Agent identifies a recurring missing-function pattern and recommends stricter completion criteria in Core OS Developer Agent prompts.

## Typical vs. Advanced Automation Scenarios

### Typical (core pipeline)
1. Start orchestration manually.
2. Architect defines the design.
3. Core/UI generation runs from architecture changes.
4. Dependency docs, test report, and build artifacts are generated from code updates.

### Advanced (self-improving pipeline)
1. Updater Agent runs daily and proposes proactive refresh tasks.
2. Learning Agent runs only after failed test/build workflows to capture failure trends.
3. Team updates prompts/workflow logic based on these reports, improving future automation quality.

## Developer Onboarding FAQ

### 1) How do I trigger an agent manually?
- Open **GitHub → Actions**.
- Select a workflow that supports `workflow_dispatch` (for example `master.yml` or `updater.yml`).
- Click **Run workflow**.

### 2) What files will start which agent?
Use workflow `on:` definitions in `.github/workflows/*.yml`. Current file-based triggers:
- `tasks/architect_task.md` → System Architect Agent
- `design/architecture.md` → Core OS Developer Agent, UI/UX Agent, Package & Dependency Agent
- `src/core/**` or `src/ui/**` → Package & Dependency Agent, Debugger & Tester Agent, Build & Export Agent
- `docs/test_report.md` → Build & Export Agent
- Debugger/Build workflow failure (`workflow_run`) → Learning Agent

### 3) How do I change output folders or filenames?
- Edit the `cat <<EOT > ...` target paths and `git add` paths in the workflow YAML that owns that output.
- Keep downstream triggers synchronized (if output path changes, update any workflow that listens to the old path).

### 4) How do I add a new agent?
1. Add a new `.github/workflows/<agent>.yml` file.
2. Define trigger strategy (`push` paths, `schedule`, `workflow_dispatch`, or `workflow_run`).
3. Generate deterministic outputs (docs/artifacts/code) in known paths.
4. Commit generated outputs in the workflow (if this repo pattern is retained).
5. Update this overview document with the new agent’s trigger/output row and diagram branch.

### 5) How do I make an agent run only on failures?
- Use `on: workflow_run` and job-level condition:
  - `if: ${{ github.event.workflow_run.conclusion == 'failure' }}`

### 6) How do I test trigger wiring safely?
- Use manual dispatch where available.
- For `push` path triggers, create a small controlled change in the watched file path.
- Confirm output files were generated and that follow-up workflows triggered as expected.

### 7) Where should extension rules live?
- Workflow behavior lives in `.github/workflows/*.yml`.
- System-level orientation and contributor guidance should be updated in `docs/agent_system_overview.md`.

---
This overview is designed to help contributors understand both the baseline delivery chain and the advanced feedback loops that keep M.A.T.R.I.X automation improving over time.
