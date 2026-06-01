# M.A.T.R.I.X AI System Upgrade

## Objective

Upgrade M.A.T.R.I.X from a UI-only assistant into a local-first AI-controlled operating layer. The AI should be able to route safe system actions, report core status, and prepare for stronger local models without adding runtime internet dependency.

## Default Model Profile

Default target model: `qwen3:8b`

Reason:
- Official Ollama model listing shows `qwen3:8b` as a practical local model profile at about 5.2 GB.
- It is much stronger than the previous small `qwen-2.5-3b` profile while still being realistic for local desktop hardware.
- It gives M.A.T.R.I.X a stronger default for system orchestration, planning, command routing, and code-aware assistance.

## Optional Power Profiles

- `qwen3:30b` for high-power reasoning and long-context planning.
- `qwen3-coder:30b` for coding-heavy OS development and repository automation.
- `llama3.3:70b` for large general reasoning on machines with enough memory.

These are intentionally optional because they are too large for many local systems.

## Runtime Rule

Runtime internet is not required.

Model weights must be:
- bundled into the image,
- copied into the local Ollama store,
- or pulled during image build with `MATRIX_PULL_MODELS_AT_BUILD=1`.

## New Core Layer

Added `src/core/matrix_core/ai_orchestrator.py`.

Responsibilities:
- List available local AI model profiles.
- Report local AI control status.
- Convert plain language prompts into structured local actions.
- Mark risky actions as requiring confirmation.

Allowed safe actions:
- Open app
- Run diagnostics
- Schedule agent task
- Change scheduler policy
- Query core status
- Start service
- Stop service

Confirmation-gated actions:
- Build ISO
- Install package
- Modify boot config
- Start network service

## UI Upgrade

The Matrix AI tab now:
- Shows `qwen3:8b` as the default target AI.
- Keeps `matrix-local-synapse` as the offline fallback.
- Displays optional stronger AI profiles.
- Explains the upgraded AI control layer through local responses.

## Build-Time Model Control

`iso_build/chroot_setup.sh` now writes `/etc/matrix-ai-models.json`.

To bake the default model during ISO build:

```bash
MATRIX_PULL_MODELS_AT_BUILD=1 sudo ./iso_build/build_iso.sh
```

To skip Ollama installer during build:

```bash
MATRIX_ENABLE_OLLAMA_INSTALL=0 sudo ./iso_build/build_iso.sh
```

## Sources

- Ollama Qwen3 model library
- Ollama tool-calling documentation
- Ollama Llama 3.3 model library
