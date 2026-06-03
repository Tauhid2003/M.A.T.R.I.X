#!/bin/bash
# M.A.T.R.I.X. AI-OS QEMU Boot Test Script
# Runs the compiled ISO in a virtual machine.

ISO_PATH="$(dirname "$0")/build/matrix-os-alpha.iso"

if [ ! -f "$ISO_PATH" ]; then
  echo "Error: ISO not found at $ISO_PATH"
  echo "Please build the ISO first using build_iso.sh"
  exit 1
fi

# Check if KVM is available for hardware acceleration
KVM_FLAG=""
CPU_FLAG="-cpu max"
if [ -e /dev/kvm ] && [ -w /dev/kvm ]; then
  KVM_FLAG="-enable-kvm"
  CPU_FLAG="-cpu host"
  echo "[*] KVM acceleration enabled."
else
  echo "[!] KVM acceleration not available. Running in emulated mode (slower)."
fi

echo "Launching QEMU for M.A.T.R.I.X. AI-OS boot verification..."
qemu-system-x86_64 \
  $KVM_FLAG \
  -m 4G \
  -smp 4 \
  $CPU_FLAG \
  -drive file="$ISO_PATH",media=cdrom,readonly=on \
  -vga virtio \
  -net nic -net user
