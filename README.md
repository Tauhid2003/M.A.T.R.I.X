# M.A.T.R.I.X
M.A.T.R.I.X. is an artificial intelegence create for different types of work.The full from of M.A.T.R.I.X. is Metaverse Artificial Technological Regenerating Inteligence eXperiment.

---

## 🌟 Overview & Architecture

M.A.T.R.I.X. AI-OS is a next-generation custom Linux Operating System designed to integrate local artificial intelligence runtime, specialized task scheduling architectures, application sandboxing, and a premium interactive user interface. 

The workspace is organized into three core components:
1. **OS Construction (`iso_build/`)**: Scripts and configurations for building, installing, and bootstrapping the custom Debian Live ISO.
2. **Backend Daemon & Agent Scheduler (`src/scheduler/`)**: Cross-platform Python daemons running at boot to schedule agent tasks, handle context switches, and cache agent attention states.
3. **Interactive Control Center UI (`src/ui/`)**: A premium web-based glassmorphic Ubuntu desktop simulator allowing operators to monitor live telemetry, configure sandboxes, run compiles, and interact with the AI-OS.

---

## 📁 Repository Directory Layout

The project files have been reorganized into a standardized structure:
```
M.A.T.R.I.X/
├── docs/                      # Technical papers, designs, and Word documents
│   ├── M.A.T.R.I.X.docx       # Master specifications
│   └── technical_knowledge/   # Advanced research papers & architectural blueprints
├── iso_build/                 # Custom OS compilation & installer assets
│   ├── build_iso.sh           # Main compiler script for creating bootable ISOs
│   ├── chroot_setup.sh        # Chroot environment customizer (Ollama, Wine, Mate)
│   ├── cx.preseed             # Unattended automated Debian installer config
│   ├── matrix-daemon.service  # Systemd core scheduler service config
│   ├── matrix-api.service     # Systemd web API daemon service config
│   ├── matrix-sandbox-profile # AppArmor security sandboxing profile
│   ├── matrix-sandbox.sh      # Bubblewrap system execution jail script
│   ├── run_qemu.sh            # Local QEMU emulator test script
│   ├── test_sandbox.sh        # Sandbox AppArmor / Bubblewrap parser tester
│   ├── verify_boot.sh         # Automated headless QEMU boot validation script
│   └── sys_spec.json          # System specification configuration matrix
├── src/                       # OS logic and UI application components
│   ├── core/                  # Core OS features and daemon APIs
│   │   ├── api_daemon.py          # Unified Python API Daemon (REST backend)
│   │   ├── firstboot_setup.py     # Hardware auto-tuning & OS configuration
│   │   └── hardware_profiler.py   # System hardware dynamic profiler
│   ├── scheduler/             # Agent task scheduler services
│   │   ├── scheduler_daemon.py    # Cross-platform active scheduler daemon
│   │   └── scheduler_prototype.py # Simulation suite for scheduler algorithms
│   └── ui/                    # Vite + React Ubuntu-like operator interface
└── .gitignore                 # Root level git ignore policies
```

---

## 🚀 Key Features & Components

### 1. Master ISO Compiler & Unattended Installer (`iso_build/`)
* **`build_iso.sh`**: A location-independent bash compilation script that bootstraps a minimal Debian Core base, handles system mounting, compiles Kernel models, configures GRUB BIOS/EFI boot records, and generates compressed SquashFS targets.
* **`chroot_setup.sh`**: Purges default OS telemetry & bloat, configures official Wine repositories for PE compatibility, sets up local Ollama AI endpoints, registers the task scheduler, and provisions the systemd daemons.
* **`cx.preseed`**: Pre-seeds local localization, automated disk partitioning, and pre-packaged installer suites for a zero-intervention installation flow.

### 2. Multi-Policy Agent Task Scheduler (`src/scheduler/`)
* **Dynamic Schedulers**: Implements **FIFO** (First-In-First-Out), **SJF** (Shortest Job First), **Round Robin** (Time Slice Preemptive), and **Priority-Based** scheduling policies.
* **Aging Starvation Defense**: Under the Priority algorithm, waiting tasks dynamically age to increase urgency and prevent lower-priority tasks from being starved.
* **LRU-K Attention Cache**: Tracks agent state history in memory and evicts records based on the $K$-th backward reference distance to minimize Disk/Database context swaps.

### 3. Desktop Operator Control Interface (`src/ui/`)
A fully-featured, high-fidelity Web UI mimicking an Ubuntu desktop.
* **Simulated Web Applications**:
  * **Shell Terminal**: Direct console output and mock CLI inputs.
  * **Build Factory**: Status monitoring dashboard for OS builds.
  * **Telemetry Monitor**: Visual tracking of CPU cores, Wine runtime instances, and Ollama agent caches.
  * **Bubblewrap Sandbox Manager**: Security permissions toggles for isolation and networks.
  * **Nautilus File Explorer**: Local directory crawler with file previewers (PDFs, Images, SVGs, Audio, JSON).
  * **Ingress Center**: Orchestration panel to dispatch new agent commands.
* **Desktop Controls**: Integrated battery tracking, volume sliders, brightness panels, mock lock screens, and live cyber-mesh network monitoring.

---

## 🛠️ Getting Started & Development

### 1. Running the Operator UI
Navigate to the UI directory, install dependencies, and start the Vite local dev server:
```bash
cd src/ui
npm install
npm run dev
```

### 2. Running the Unified API Daemon & Static Web Server
Start the backend REST API service (which also serves the compiled React UI static files on non-API routes):
```bash
python src/core/api_daemon.py
```
Open `http://127.0.0.1:8000` in your web browser to access the control panel.

### 3. Simulating the Task Scheduler
Run the scheduler simulation suite locally using Python:
```bash
python src/scheduler/scheduler_prototype.py
```

### 4. Compiling the Live ISO (Linux Host only)
Run the ISO build script with root privileges. The script will automatically trigger `npm run build` to compile the operator UI, bundle all services, and generate the bootable image:
```bash
sudo ./iso_build/build_iso.sh
```

### 5. Running the QEMU Boot Test VM
You can test boot the compiled live ISO using the built-in QEMU launcher script:
```bash
bash iso_build/run_qemu.sh
```

### 6. Running Automated Boot and Sandbox Verification
To run headless validation tests for system service boots and sandbox jail boundaries:
```bash
# Verify ISO boot success and service registration
bash iso_build/verify_boot.sh

# Verify Bubblewrap mounts and AppArmor profile syntax
bash iso_build/test_sandbox.sh
```

---

## 🔒 Security Confinement & Sandboxing Architecture

M.A.T.R.I.X OS enforces strict local containment layers at the daemon level:
1. **Local-Only Binding**: The API Daemon binds exclusively to `127.0.0.1:8000` to prevent unauthorized remote requests over local networks.
2. **CORS Origin Validation**: Wildcard CORS is disabled. Only the local Vite development origin (`localhost:5173`) and production API origin (`localhost:8000`) are allowed.
3. **Privilege Separation**: System API and Core Scheduler services run under the unprivileged `matrix` system user, limiting standard system exposure.
4. **AppArmor Profile**: The custom `matrix-sandbox-profile` restricts execution paths and blocks write access to `/etc/passwd`, `/etc/shadow`, `/boot/`, and raw network socket creation.
5. **Bubblewrap Containment**: Interactive terminal tasks run jailed within Bubblewrap (`bwrap`) containers, using read-only mappings for core directories (`/usr`, `/lib`, `/bin`) and isolating IPC and network spaces.
6. **Nautilus Confinement**: Folder exploration and file reading are locked to sandboxed paths (e.g. `/var/lib/matrix`, `/home/matrix`) and specific allow-listed configuration files. Attempts to escape via directory traversals are halted with `403 Forbidden`.
7. **Shell Execution Sandboxing**:
   - Safe commands (e.g. `ls`, `pwd`, `git status`) are parsed using `shlex.split` and executed with `shell=False` to prevent command chaining.
   - Any command containing chaining characters (`;`, `&`, `|`, etc.) is blocked from immediate execution and routed to the operator's pending queue.
   - An audit trail of all executed commands is persisted to `/var/log/matrix_api_audit.log`.

---

## 🛠️ Offline Debian Compiler Setup (Windows Host via VirtualBox VM)

### 6. Compiling the Live ISO (Windows Host via VirtualBox VM)
Because Windows cannot natively compile a Debian `chroot` filesystem, you can run a headless Debian Virtual Machine inside VirtualBox to serve as the compiler host:
1. **Prerequisites**: Install [VirtualBox](https://www.virtualbox.org/) and [Vagrant](https://www.vagrantup.com/).
2. **Setup Vagrant VM**: Initialize and download a minimal Debian 12 base box:
   ```bash
   vagrant box add generic/debian12
   vagrant init generic/debian12
   ```
3. **Configure Shared Folder**: Add a VirtualBox shared folder mapping `d:\My Own OS` to `/media/sf_My_Own_OS` inside your Vagrant VM settings or `Vagrantfile`.
4. **Compile the ISO**: Boot the VM and execute the build script inside `/tmp` (VirtualBox shared folders do not support device node creation):
   ```bash
   vagrant up
   vagrant ssh -c "sudo bash -c 'cd /media/sf_My_Own_OS && bash iso_build/build_iso.sh'"
   ```
5. **Storage Cleanup (Important)**: Once the build completes and `matrix-os-alpha.iso` is copied back to your Windows workspace folder, you can run this command to free up **~5 GB** of virtual disk space:
   ```bash
   vagrant destroy -f
   ```

