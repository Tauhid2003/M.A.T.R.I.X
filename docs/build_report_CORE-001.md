# CORE-001 Build Report

## Build Method

Incremental offline-first build. This step adds a standard-library Python core runtime skeleton and verifies the existing scheduler and UI production bundle.

## Files Generated

- `docs/agent_prompts.md`
- `docs/tasks_CORE-001.md`
- `src/core/matrix_core/`
- `src/core/smoke_core.py`
- `src/ui/dist/` from `npm run build`

## How to Run

Core status:

```powershell
$env:PYTHONPATH='src/core'
python -m matrix_core --state-dir .matrix_state status
```

Core smoke test:

```powershell
$env:PYTHONPATH='src/core'
python src/core/smoke_core.py
```

Scheduler simulation:

```powershell
python src/scheduler/scheduler_prototype.py
```

UI production build:

```powershell
cd src/ui
npm run build
```

## System Requirements

- Python 3.10 or newer
- Node.js and npm for UI build only
- No network dependency at runtime for the new core modules

## Offline Verification

- Core runtime uses only Python standard library modules.
- State persists locally under `.matrix_state/`.
- Scheduler simulation runs locally.
- UI build emits static assets under `src/ui/dist/`.

## Debugger & Tester Results

| Check | Status | Notes |
| --- | --- | --- |
| CORE-001 smoke test | PASS | `CORE-001 smoke test PASS` |
| Core CLI status | PASS | Reports `runtime: offline` |
| Python compileall | PASS | `src/core` compiles |
| Scheduler simulation | PASS | FIFO, RR, Priority, and SJF simulations completed |
| UI production build | PASS | Vite build completed |
| UI lint | FAIL | Existing React lint debt in UI components; production build still succeeds |

## Build Status

PASS for `CORE-001` runtime and production build.

Conditional FAIL for UI lint gate. Assign `TASK-UI-001` to clean lint issues before treating the UI as release-ready.
