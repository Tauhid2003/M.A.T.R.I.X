# M.A.T.R.I.X OS – Alternative Compilation Environments & Space Analysis

Building a custom operating system ISO from a Windows host traditionally requires virtualizing a Linux environment. However, virtual machines (VMs) introduce substantial storage and performance overhead. This document provides a full analysis of alternative compilation environments, disk space footprints, and zero-local-footprint cloud solutions.

---

## 💾 Storage & Performance Comparison

The table below contrasts compilation methods by their host resource usage:

| Compilation Method | Local Disk Space | Host CPU/RAM Load | Setup Complexity | Best For |
| :--- | :--- | :--- | :--- | :--- |
| **VirtualBox + Vagrant VM** | **~5.5 GB** | **High** (Runs full OS stack) | Medium | Offline standalone development |
| **WSL2 (Windows Subsystem for Linux)** | **~2.5 GB** | **Medium** (Dynamic host resources) | Medium | Fast local terminal debugging |
| **Docker Container** | **~2.0 GB** | **Low-Medium** | Medium | Isolated automated local runs |
| **GitHub Actions (Cloud)** | **0 MB** | **None** (Cloud resources) | **Low** | Production builds, zero-footprint |
| **Local Windows Simulation** | **~100 MB** | **Minimal** (Runs Python/Vite only) | **Very Low** | App/UI development and testing |

---

## ☁️ Zero-Local-Footprint Option: GitHub Actions Cloud Build

Since your repository is hosted on GitHub, you can outsource the heavy compilation process to the cloud. A GitHub runner (running Ubuntu) will execute the bootstrap process, compile the bootable ISO, and upload it as a downloadable release asset.

### GitHub Actions Configuration
To enable this, create a new workflow file at `.github/workflows/build_iso_cloud.yml` with the following contents:

```yaml
name: Compile Bootable M.A.T.R.I.X OS ISO

on:
  workflow_dispatch: # Allows manual trigger from the GitHub Actions UI
  push:
    branches:
      - main
    paths:
      - "iso_build/**"

permissions:
  contents: write

jobs:
  build:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout Repository
        uses: actions/checkout@v4

      - name: Install System Compilation Dependencies
        run: |
          sudo apt-get update
          sudo apt-get install -y debootstrap squashfs-tools xorriso grub-pc-bin grub-common

      - name: Make Scripts Executable & Fix Line Endings
        run: |
          chmod +x iso_build/build_iso.sh
          chmod +x iso_build/chroot_setup.sh
          # Convert CRLF (Windows format) to LF (Linux format) just in case
          sed -i 's/\r$//' iso_build/build_iso.sh
          sed -i 's/\r$//' iso_build/chroot_setup.sh

      - name: Compile M.A.T.R.I.X OS ISO
        run: |
          sudo ./iso_build/build_iso.sh

      - name: Upload Bootable ISO Artifact
        uses: actions/upload-artifact@v4
        with:
          name: matrix-os-alpha-iso
          path: iso_build/build/matrix-os-alpha.iso
          if-no-files-found: error
          retention-days: 7
```

### How to use the Cloud Builder:
1. Push this file to GitHub.
2. Go to your repository on GitHub and navigate to the **Actions** tab.
3. Select **Compile Bootable M.A.T.R.I.X OS ISO** on the left menu.
4. Click **Run workflow** -> Select your branch -> Click **Run workflow**.
5. Once completed (approx. 3-4 minutes), the compiled `matrix-os-alpha-iso` will appear at the bottom of the run dashboard as a zip file containing the bootable `.iso` file.

---

## 🐳 Container-Based Option: Docker Local Build

If you have **Docker Desktop** installed on Windows, you can compile the ISO inside a lightweight Debian container without spawning a heavy VirtualBox VM:

1. **Run compiler container**:
   ```bash
   docker run --rm --privileged -v "d:\My Own OS:/workspace" -w /workspace debian:bookworm-slim bash -c "
     apt-get update && \
     apt-get install -y debootstrap squashfs-tools xorriso grub-pc-bin grub-common && \
     bash iso_build/build_iso.sh
   "
   ```
2. **Result**: The compiled ISO will be written directly into your `iso_build/build/` directory on Windows. No virtual disk allocation is required, and the temporary container layer is discarded immediately after compile.

---

## 💻 Local Simulation Option (No Compilation Needed)

If your goal is to experience and test the M.A.T.R.I.X environment, you do not need to run VirtualBox or compile an ISO. You can run the entire desktop console and daemon locally on Windows:

1. **Start the Scheduler Daemon**:
   ```powershell
   # Run the simulator python script directly in Windows PowerShell
   python src/scheduler/scheduler_prototype.py
   ```
2. **Start the Operator UI**:
   ```bash
   cd src/ui
   npm install
   npm run dev
   ```
   Open `http://localhost:5173` in your browser. This provides the full glassmorphic interactive console, system logs, and shell utilities.

---

## 🧹 VirtualBox Disk Space Cleanup Guide

If you want to remove the current builder setup and reclaim **~5 GB** of space on your hard drive, run the following commands on your host Windows PowerShell terminal:

```powershell
# 1. Unregister and delete the DebianBuilder VM from VirtualBox
& "C:\Program Files\Oracle\VirtualBox\VBoxManage.exe" unregistervm "DebianBuilder" --delete

# 2. Delete the builder workspace folder
Remove-Item -Path "d:\My Own OS\debian12_vm" -Recurve -Force

# 3. Delete the cached Vagrant box image
Remove-Item -Path "d:\My Own OS\vagrant.box" -Force
```
