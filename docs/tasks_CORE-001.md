# TASK-CORE-001

## Assigned Agent

Core OS Developer Agent

## Objective

Build the smallest offline-first M.A.T.R.I.X core runtime skeleton from the approved architecture. This increment provides independent, testable modules for local filesystem access, simulated process tracking, service state management, and command-line control.

## Scope

- Add a standard-library-only Python core package under `src/core/matrix_core`.
- Keep the existing scheduler daemon separate.
- Provide a CLI entry point for smoke testing.
- Persist runtime state locally in `.matrix_state/`.
- Avoid network calls and runtime internet dependencies.

## Acceptance Criteria

- Core package imports successfully.
- CLI reports system status offline.
- Filesystem module lists a local directory.
- Process manager can spawn a simulated process.
- Service manager can register and start a simulated service.
- Smoke test exits with status code `0`.

## Next Step

After Debugger & Tester approval, hand off to UI/UX Agent for `TASK-UI-001`: expose core status in the offline dashboard.
