# M.A.T.R.I.X OS - Copilot Agent Instructions

Welcome, GitHub Agent! You are acting as the remote cloud-developer for the M.A.T.R.I.X OS project. This document contains the strict architectural rules you MUST follow when working on this repository.

## 1. Project Philosophy
- **Offline-First:** The OS is designed to operate completely offline. Do NOT introduce any code or dependencies that require internet access at runtime (e.g., pulling external CDN scripts, calling web APIs from the core daemon).
- **Dual-Agent Architecture:** You (the GitHub Agent) are responsible for repository-wide tasks (code review, CI, refactoring, UI development). The Local Agent (Ollama `qwen2.5`) is responsible for running live *inside* the OS environment for task scheduling and system monitoring.

## 2. Technology Stack Constraints
- **Core Daemons:** Python 3.11+. Use the `asyncio` library for concurrency.
- **Frontend UI:** React + Vite. All UI code lives in `src/ui/`. Build output goes to `dist/`.
- **System Packages:** The **ONLY** source of truth for installed OS packages is `iso_build/sys_spec.json`. If your code requires a new Linux package, you MUST add it to the `packages_to_include` array in that JSON file. Do not assume any package is installed unless it is listed there.
- **Sandboxing:** All background tasks run inside AppArmor and Bubblewrap. Do not try to bypass the sandbox. If a binary needs execution rights, update `iso_build/matrix-sandbox-profile`.

## 3. Pull Request Guidelines
When creating a Pull Request, you must:
1. Explain how your change respects the offline-first constraint.
2. State whether it requires updating `sys_spec.json`.
3. Provide testing instructions that can be run locally.

## 4. Banned Practices
- Do not use `gdm3` or heavy GNOME packages. We use MATE Core and LightDM.
- Do not add Docker/container dependencies. We use native Bubblewrap (`bwrap`).
- Do not write monolithic Python files. Keep logic modular in `src/core/`.

By following these rules, you will help build the world's most secure, lightweight, and truly autonomous AI Operating System.
