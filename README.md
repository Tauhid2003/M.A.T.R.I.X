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
│   ├── matrix-daemon.service  # Systemd service daemon config
│   └── sys_spec.json          # System specification configuration matrix
├── src/                       # OS logic and UI application components
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

### 2. Simulating the Task Scheduler
Run the scheduler simulation suite locally using Python:
```bash
python src/scheduler/scheduler_prototype.py
```

### 3. Compiling the Live ISO (Linux Host only)
Run the ISO build script with root privileges:
```bash
sudo ./iso_build/build_iso.sh
```

### 4. Compiling the Live ISO (Windows Host via VirtualBox VM)
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

