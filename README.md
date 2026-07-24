# M.A.T.R.I.X

**M.A.T.R.I.X.** (Metaverse Artificial Technological Regenerating Intelligence eXperiment) is a next-generation custom AI-OS and reproducible research platform.

---

## 🌟 Overview & Architecture

M.A.T.R.I.X. AI-OS integrates local artificial intelligence runtimes, an **Adaptive Energy-Aware Task Scheduler**, **Capability-Based Policy Enforcement**, real system agent tool execution, and an interactive glassmorphic operator control interface.

The repository is organized into core research and system components:
1. **OS Construction (`iso_build/`)**: Scripts for compiling, installing, and bootstrapping a custom bootable Debian Live ISO.
2. **Backend Daemon & Agent Scheduler (`src/scheduler/`)**: Cross-platform Python daemons implementing energy-aware adaptive scheduling, power cost modeling ($E_i$), and attention caching.
3. **Core OS & Security Engines (`src/core/`)**: Policy engine with 4 autonomy modes (*Observe, Suggest, Approve, Autonomous*), OpenTelemetry GenAI tracer, system API daemon, and `AgentExecutor` real tool engines.
4. **Reproducible Benchmark Suite (`src/benchmarks/`)**: Executable `matrix-bench` engine for comparing scheduling policies across latency, throughput, Jain's fairness index, and Joules/task.
5. **Interactive Control Center UI (`src/ui/`)**: A premium web-based Ubuntu desktop simulator for live telemetry monitoring, sandbox configuration, and agent ingress.

---

## 📁 Repository Directory Layout

```
M.A.T.R.I.X/
├── .github/
│   └── workflows/
│       └── ci.yml                 # Automated GitHub Actions CI pipeline
├── docs/                          # Technical papers, specs, and knowledge bases
├── iso_build/                     # Live ISO compiler & systemd service profiles
│   ├── build_iso.sh               # Master Live ISO compiler script
│   ├── chroot_setup.sh            # Chroot setup & daemon registration
│   ├── matrix-api.service         # Systemd unit for API Daemon (/run/matrix)
│   ├── matrix-daemon.service      # Systemd unit for Scheduler Daemon
│   └── sys_spec.json              # OS specification & baked model configuration
├── src/
│   ├── benchmarks/                # Research Benchmark Suite (matrix-bench)
│   │   ├── matrix_bench.py        # Executable comparative benchmark CLI
│   │   └── test_matrix_bench.py   # Benchmark unit tests
│   ├── core/                      # Core OS runtime, policy & security engines
│   │   ├── agent_executor.py      # Real system tool execution engine
│   │   ├── api_daemon.py          # Unified REST backend API
│   │   ├── firstboot_setup.py     # System auto-tuning & database seeder
│   │   ├── hardware_profiler.py   # Dynamic hardware profiler & model router
│   │   ├── policy_engine.py       # Capability-based security & autonomy policy
│   │   ├── telemetry.py           # OpenTelemetry GenAI tracer & power metrics
│   │   ├── test_agent_executor.py # Isolated agent executor unit tests
│   │   └── test_api_daemon.py     # API authentication integration tests
│   ├── kernel/                    # matrix_core custom Linux kernel module
│   ├── scheduler/                 # Kernel Agent Task Scheduler
│   │   ├── energy_aware_scheduler.py # Adaptive Energy-Aware scheduling engine
│   │   ├── scheduler_daemon.py    # Active scheduler daemon & execution loop
│   │   └── test_scheduler_daemon.py # Scheduler unit test suite
│   └── ui/                        # Vite + React glassmorphic operator desktop
└── .gitignore                     # Git ignore policy
```

---

## ⚡ Key Features & Research Contributions

### 1. Adaptive Energy-Aware AI Scheduler (`src/scheduler/`)
* **Multi-Factor Priority Scoring**:
  $$S_i = w_u U_i + w_a A_i + w_d D_i - w_c C_i - w_m M_i - w_e E_i$$
  where $E_i$ models estimated task energy consumption in Joules ($E_i = P_{\text{est}} \times \text{Duration}_i \times \text{Complexity}_i$).
* **Hardware Power State Sensor (`PowerStateSensor`)**: Detects CPU load, RAM usage, AC vs Battery mode, estimated wattage draw ($P_{\text{est}}$), and thermal load.
* **Battery & Thermal Saver Routing**: Automatically defers low-priority background tasks or downgrades to lighter baked models (`qwen2.5:0.5b`) under battery or thermal load (>80°C).
* **LRU-K Attention Cache**: Tracks agent state history in memory and evicts records based on $K$-th backward reference distance to minimize disk context swaps.

### 2. Capability-Based Policy Engine (`src/core/policy_engine.py`)
* **Fine-Grained Agent Bounds**: Restricts read/write path access, command allowlists, and local/external network policies.
* **4 Autonomy Modes**:
  * **`Observe`**: Dry-run inspection only (blocks write/delete operations).
  * **`Suggest`**: Propose actions without auto-execution.
  * **`Approve`**: Requires operator confirmation for sensitive operations.
  * **`Autonomous`**: Auto-execute within verified capability bounds.

### 3. OpenTelemetry GenAI Observability (`src/core/telemetry.py`)
* Standardized telemetry following OpenTelemetry GenAI semantic conventions.
* Tracks execution traces, latency (ms), task energy (Joules), token generation rate (tokens/sec), and Joules/token ($J/\text{tok}$).

### 4. Reproducible Benchmark Suite (`matrix-bench`) (`src/benchmarks/`)
* Executable CLI benchmark engine (`python -m src.benchmarks.matrix_bench --tasks 50 --runs 3`).
* Compares 5 scheduling algorithms: **FIFO, SJF, Round Robin, Weighted Priority, and MATRIX Adaptive Energy-Aware** across:
  * Mean Latency (ms) & Throughput (tasks/sec)
  * Mean Waiting Time (ms) & **Jain's Fairness Index**
  * Total Energy (Joules) & Joules per Task

### 5. Real Agent Executor Engine (`src/core/agent_executor.py`)
* Replaces synthetic simulation with real system tool inspections:
  * **Security Auditor**: File permission integrity checks & local socket audits.
  * **Filesystem Stripper**: Temporary cache scanning and artifact purging.
  * **Network Guard**: Local loopback & network interface binding verification.
  * **Data Analyst**: Log telemetry stream parsing (`scheduler.log`).
  * **Code Builder**: AST syntax verification on Python codebase files.
  * **Wine Translator**: Win32 subsystem compatibility inspection.

---

## 🛠️ Getting Started & Commands

### 1. Running Automated Test Suites
Run all 18 unit and integration tests locally:
```bash
# Run Scheduler Tests
python -m unittest discover -s src/scheduler -p "test_*.py"

# Run Core & API Tests
python -m unittest discover -s src/core -p "test_*.py"

# Run Benchmark Suite Tests
python -m unittest discover -s src/benchmarks -p "test_*.py"
```

### 2. Running `matrix-bench` Benchmark Sweeps
Run the reproducible benchmark engine to evaluate scheduling algorithms:
```bash
python src/benchmarks/matrix_bench.py --tasks 50 --runs 3
```

### 3. Running the Unified API & Scheduler Daemons
Start the system REST API daemon and active task scheduler daemon:
```bash
# Terminal 1: REST API Daemon (Port 8000)
python src/core/api_daemon.py

# Terminal 2: Agent Task Scheduler Daemon
python src/scheduler/scheduler_daemon.py
```
Open **`http://127.0.0.1:8000`** in your browser to access the control panel.

### 4. Registering Tasks via NLP CLI
Register natural language directives using the CLI ingress:
```bash
python src/core/matrix_ai.py "Run real security audit"
```

### 5. Running the Operator UI Dev Server
Navigate to the UI directory and start Vite:
```bash
cd src/ui
npm install
npm run dev
```

### 6. Compiling the Live ISO (Linux Host only)
Build the bootable Debian Live ISO (automatically bakes `agent_executor.py` into `/usr/local/bin`):
```bash
sudo ./iso_build/build_iso.sh
```

---

## 🔒 Security Confinement & Sandboxing Architecture

1. **Token Authentication**: API endpoints require `X-Matrix-Token` headers. The authorization token is injected directly into `index.html` responses for local UI sessions and saved to `/run/matrix/api_token` (mode `0750`).
2. **Local-Only Binding**: The API Daemon binds exclusively to `127.0.0.1:8000`.
3. **Privilege Separation**: System services run under the unprivileged `matrix` system user.
4. **AppArmor Profile**: The custom `matrix-sandbox-profile` restricts execution paths and blocks write access to `/etc/passwd`, `/etc/shadow`, `/boot/`, and raw network socket creation.
5. **Bubblewrap Containment**: Terminal commands execute jailed inside Bubblewrap (`bwrap`) containers.

---

## 📄 License & Attribution

Developed as part of the M.A.T.R.I.X AI-OS project.
* **Author**: Shaik Tauhidur Rahman ([@Tauhid2003](https://github.com/Tauhid2003))
* **Website**: [strtauhid.app](https://strtauhid.app)
