# M.A.T.R.I.X Multi-Agent Workflow System Overview

## Purpose
The M.A.T.R.I.X agent workflow system uses chained GitHub Actions to split OS development into specialized, automatable stages. It helps contributors and automated agents coordinate design, implementation, testing, packaging, and continuous improvement through task handoffs.

## Agents and Triggers

| Agent | Workflow file | Trigger | Main output |
|---|---|---|---|
| Master Orchestrator Agent | `.github/workflows/master.yml` | `workflow_dispatch` (manual run) | `tasks/architect_task.md` |
| System Architect Agent | `.github/workflows/architect.yml` | Push changes to `tasks/architect_task.md` | `design/architecture.md` |
| Core OS Developer Agent | `.github/workflows/dev.yml` | Push changes to `design/architecture.md` | `src/core/file_system.py`, `src/core/process_manager.py` |
| UI/UX Agent | `.github/workflows/ui.yml` | Push changes to `design/architecture.md` | `docs/ui_design.md`, `src/ui/*` placeholders |
| Package & Dependency Agent | `.github/workflows/package.yml` | Push changes to `design/architecture.md`, `src/core/**`, `src/ui/**` | `docs/dependencies.md` |
| Debugger & Tester Agent | `.github/workflows/debug.yml` | Push changes to `src/core/**`, `src/ui/**` | `docs/test_report.md` |
| Build & Export Agent | `.github/workflows/build.yml` | Push changes to `docs/test_report.md`, `src/core/**`, `src/ui/**` | `build/matrix_executable.bin`, `iso_build/matrix_boot.iso`, `docs/build_instructions.md` |
| Updater Agent (optional) | `.github/workflows/updater.yml` | `schedule` + `workflow_dispatch` | `docs/updater_report.md` |
| Learning Agent (optional) | `.github/workflows/learning.yml` | `workflow_run` after Debugger & Tester or Build & Export, only on `failure` | `docs/learning_agent_report.md` |

## High-Level Flow

```text
Manual Start
    |
    v
Master Orchestrator Agent
    |
    v
System Architect Agent
    |
    +------------------------------+
    v                              v
Core OS Developer Agent        UI/UX Agent
    |                              |
    +---------------+--------------+
                    v
        Package & Dependency Agent
                    |
                    v
         Debugger & Tester Agent
                    |
                    v
            Build & Export Agent

Optional side-loop agents:
- Updater Agent (scheduled/manual system improvement review)
- Learning Agent (post-failure analysis from Debug/Test or Build)
```

## End-to-End Task Flow
1. A maintainer manually runs **Master Orchestrator Agent**.
2. The master workflow creates `tasks/architect_task.md` for architecture planning.
3. **System Architect Agent** reads that task and writes `design/architecture.md`.
4. Architecture output triggers both **Core OS Developer Agent** and **UI/UX Agent**.
5. Changes from architecture/core/UI trigger **Package & Dependency Agent** to refresh dependency docs.
6. Core/UI changes trigger **Debugger & Tester Agent** to produce a test report.
7. Test report and code changes trigger **Build & Export Agent** to generate build artifacts/docs.
8. Optionally, **Updater Agent** proposes periodic improvements, and **Learning Agent** documents lessons from failed debug/build runs.

## Quickstart: Add New Agents or Modify Triggers

### Add a new agent
1. Create `.github/workflows/<agent-name>.yml`.
2. Set `on:` triggers (for example file-path-based `push`, `workflow_run`, `schedule`, or `workflow_dispatch`).
3. Add one job that:
   - Reads upstream artifacts/files from previous stages.
   - Produces a clear output file/artifact for downstream agents.
   - Commits outputs with bot identity (`GitHub Actions`).
4. Update this overview table/flow so contributors can discover the new stage.

### Modify an existing trigger
1. Open the target workflow in `.github/workflows/`.
2. Edit its `on:` block (commonly `push.paths` patterns).
3. Confirm that upstream outputs still match downstream trigger paths.
4. Commit and run the relevant workflow manually (or trigger with a matching file change) to verify behavior.

## Customization and Extension Notes
- Prefer explicit file-based handoffs (for example `tasks/*.md`, `design/*.md`, `docs/*.md`) so workflow dependencies remain visible.
- Keep each agent single-purpose; add new agents instead of overloading one workflow with many responsibilities.
- If replacing placeholders with real AI/tooling, keep output paths stable to avoid breaking downstream triggers.
- Consider adding guardrails over time (branch filters, concurrency groups, artifact retention, and permissions hardening) as automation complexity grows.
