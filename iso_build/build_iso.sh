#!/bin/bash
# M.A.T.R.I.X. AI-OS Master ISO Builder Script
# This script constructs a custom bootable Debian Live ISO.
# WARNING: Must be executed as root on a Debian/Ubuntu host.

set -e

# Configuration Directories
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORK_DIR="/tmp/matrix_build"
CHROOT_DIR="${WORK_DIR}/chroot"
IMAGE_DIR="${WORK_DIR}/image"
LIVE_DIR="${IMAGE_DIR}/live"
BOOT_DIR="${IMAGE_DIR}/boot/grub"

# Clean up mounts on exit/error
cleanup() {
  echo "Cleaning mounts..."
  if [ -d "${CHROOT_DIR}" ]; then
    umount -lf "${CHROOT_DIR}/dev/pts" 2>/dev/null || true
    umount -lf "${CHROOT_DIR}/dev" 2>/dev/null || true
    umount -lf "${CHROOT_DIR}/proc" 2>/dev/null || true
    umount -lf "${CHROOT_DIR}/sys" 2>/dev/null || true
    umount -lf "${CHROOT_DIR}/run" 2>/dev/null || true
  fi
}
trap cleanup EXIT ERR INT TERM

# Check root privilege
if [ "$EUID" -ne 0 ]; then
  echo "Error: This script must be run as root (sudo)."
  exit 1
fi

echo "=========================================================="
echo "Starting M.A.T.R.I.X. AI-OS Build Factory ISO Compiler..."
echo "=========================================================="

# 1. Clean previous build folders
echo "Cleaning working directories..."
cleanup
rm -rf "${WORK_DIR}"
mkdir -p "${CHROOT_DIR}" "${LIVE_DIR}" "${BOOT_DIR}"

# 2. Check dependencies
echo "Validating host compiler tools..."
REQUIRED_TOOLS=("debootstrap" "mksquashfs" "xorriso" "grub-mkrescue")
for tool in "${REQUIRED_TOOLS[@]}"; do
  if ! command -v "$tool" &> /dev/null; then
    echo "Dependency missing: '$tool'. Install it via: apt-get install debootstrap squashfs-tools xorriso grub-common -y"
    exit 1
  fi
done

# 3. Bootstrap minimal Debian Core base (Bookworm Suite)
echo "Bootstrapping minimal Debian system base via debootstrap..."
debootstrap --arch=amd64 --variant=minbase bookworm "${CHROOT_DIR}" http://deb.debian.org/debian/

# 4. Copy system config, UI assets & services to chroot
echo "Building the operator UI..."
if command -v npm &> /dev/null; then
  (cd "${SCRIPT_DIR}/../src/ui" && npm install && npm run build)
else
  echo "[!] Warning: npm not found on the host system. Skipping operator UI rebuild."
fi

echo "Copying service descriptors and preseeds..."
cp "${SCRIPT_DIR}/sys_spec.json" "${CHROOT_DIR}/sys_spec.json"
cp "${SCRIPT_DIR}/cx.preseed" "${IMAGE_DIR}/cx.preseed"
cp "${SCRIPT_DIR}/chroot_setup.sh" "${CHROOT_DIR}/chroot_setup.sh"
mkdir -p "${CHROOT_DIR}/etc/systemd/system"
cp "${SCRIPT_DIR}/matrix-daemon.service" "${CHROOT_DIR}/etc/systemd/system/matrix-daemon.service"
cp "${SCRIPT_DIR}/matrix-api.service" "${CHROOT_DIR}/etc/systemd/system/matrix-api.service"
cp "${SCRIPT_DIR}/matrix-firstboot.service" "${CHROOT_DIR}/etc/systemd/system/matrix-firstboot.service"

mkdir -p "${CHROOT_DIR}/usr/local/bin"
cp "${SCRIPT_DIR}/../src/core/hardware_profiler.py" "${CHROOT_DIR}/usr/local/bin/hardware_profiler.py"
cp "${SCRIPT_DIR}/../src/core/firstboot_setup.py" "${CHROOT_DIR}/usr/local/bin/firstboot_setup.py"
cp "${SCRIPT_DIR}/../src/core/api_daemon.py" "${CHROOT_DIR}/usr/local/bin/api_daemon.py"
cp "${SCRIPT_DIR}/../src/core/agent_executor.py" "${CHROOT_DIR}/usr/local/bin/agent_executor.py"
cp "${SCRIPT_DIR}/../src/core/matrix_ai.py" "${CHROOT_DIR}/usr/local/bin/matrix-ai"
cp "${SCRIPT_DIR}/../src/scheduler/scheduler_daemon.py" "${CHROOT_DIR}/usr/local/bin/matrix_scheduler.py"

# Copy kernel module source
mkdir -p "${CHROOT_DIR}/usr/src/matrix_core"
cp -r "${SCRIPT_DIR}/../src/kernel/matrix_core/"* "${CHROOT_DIR}/usr/src/matrix_core/"

# Copy Sandbox utilities and AppArmor profile
mkdir -p "${CHROOT_DIR}/etc/apparmor.d"
cp "${SCRIPT_DIR}/matrix-sandbox-profile" "${CHROOT_DIR}/etc/apparmor.d/matrix-sandbox-profile"
cp "${SCRIPT_DIR}/matrix-sandbox.sh" "${CHROOT_DIR}/usr/local/bin/matrix-sandbox.sh"

# Check for preloaded offline Ollama binary
if [ -f "${SCRIPT_DIR}/ollama" ]; then
  echo "Found preloaded offline Ollama binary. Copying to chroot..."
  cp "${SCRIPT_DIR}/ollama" "${CHROOT_DIR}/usr/local/bin/ollama"
  chmod +x "${CHROOT_DIR}/usr/local/bin/ollama"
fi

chmod +x "${CHROOT_DIR}/usr/local/bin/hardware_profiler.py"
chmod +x "${CHROOT_DIR}/usr/local/bin/firstboot_setup.py"
chmod +x "${CHROOT_DIR}/usr/local/bin/api_daemon.py"
chmod +x "${CHROOT_DIR}/usr/local/bin/agent_executor.py"
chmod +x "${CHROOT_DIR}/usr/local/bin/matrix-ai"
chmod +x "${CHROOT_DIR}/usr/local/bin/matrix_scheduler.py"
chmod +x "${CHROOT_DIR}/usr/local/bin/matrix-sandbox.sh"
chmod +x "${CHROOT_DIR}/chroot_setup.sh"

if [ -d "${SCRIPT_DIR}/../src/ui/dist" ]; then
  echo "Copying compiled UI assets to chroot..."
  mkdir -p "${CHROOT_DIR}/usr/share/matrix/ui"
  cp -r "${SCRIPT_DIR}/../src/ui/dist/"* "${CHROOT_DIR}/usr/share/matrix/ui/"
else
  echo "[!] Warning: Compiled UI dist/ directory not found."
fi


# 5. Bind mount virtual filesystems
echo "Mounting virtual system paths for chroot operation..."
mount --bind /dev "${CHROOT_DIR}/dev"
mount --bind /dev/pts "${CHROOT_DIR}/dev/pts"
mount --bind /proc "${CHROOT_DIR}/proc"
mount --bind /sys "${CHROOT_DIR}/sys"
mount --bind /run "${CHROOT_DIR}/run"

# 6. Execute customization script inside target chroot filesystem
echo "Entering chroot to compile kernel modules and setup AI runtimes..."
chroot "${CHROOT_DIR}" /bin/bash /chroot_setup.sh

# 7. Unmount virtual filesystems
echo "Cleaning chroot virtual mount tables..."
cleanup

# 8. Copy Kernel image & Initrd system out for GRUB boot staging
echo "Extracting kernel executable and ramdisk..."
KERNEL_FILE=$(find "${CHROOT_DIR}/boot" -name "vmlinuz-*" | sort -V | tail -n 1)
INITRD_FILE=$(find "${CHROOT_DIR}/boot" -name "initrd.img-*" | sort -V | tail -n 1)

if [ -z "$KERNEL_FILE" ] || [ -z "$INITRD_FILE" ]; then
  echo "Error: Failed to locate vmlinuz or initrd.img inside chroot boot directory."
  exit 1
fi

cp "$KERNEL_FILE" "${LIVE_DIR}/vmlinuz"
cp "$INITRD_FILE" "${LIVE_DIR}/initrd.img"
echo "Kernel and Initrd copied successfully."

# 9. Clean up temporary files inside chroot
rm -f "${CHROOT_DIR}/chroot_setup.sh"
rm -f "${CHROOT_DIR}/sys_spec.json"

# 10. Compress root filesystem directory into SquashFS image
echo "Creating compressed read-only SquashFS filesystem (XZ compression)..."
mksquashfs "${CHROOT_DIR}" "${LIVE_DIR}/filesystem.squashfs" -noappend -comp xz -e boot

# 11. Write custom GRUB bootloader configuration
echo "Writing GRUB menu settings..."
cat << 'EOF' > "${BOOT_DIR}/grub.cfg"
search --set=root --file /live/vmlinuz

set default="0"
set timeout=5

menuentry "M.A.T.R.I.X. AI-OS Live (Default Offline)" {
    linux /live/vmlinuz boot=live quiet splash console=tty0 console=ttyS0 ---
    initrd /live/initrd.img
}

menuentry "M.A.T.R.I.X. AI-OS Automated Installation (preseed)" {
    linux /live/vmlinuz boot=live quiet splash auto=true priority=critical file=/cdrom/cx.preseed console=tty0 console=ttyS0 ---
    initrd /live/initrd.img
}
EOF

# 12. Package everything into a bootable ISO file
echo "Packaging system folders into EFI/BIOS bootable ISO..."
grub-mkrescue -o "${WORK_DIR}/matrix-os-alpha.iso" "${IMAGE_DIR}"

# 13. Copy to host shared folder mount
echo "Copying compiled ISO to host shared folder..."
mkdir -p "${SCRIPT_DIR}/build"
cp "${WORK_DIR}/matrix-os-alpha.iso" "${SCRIPT_DIR}/build/matrix-os-alpha.iso"

echo "=========================================================="
echo "BUILD COMPLETED SUCCESSFULLY!"
echo "ISO location: ${SCRIPT_DIR}/build/matrix-os-alpha.iso"
echo "MD5 Checksum: $(md5sum ${SCRIPT_DIR}/build/matrix-os-alpha.iso | awk '{print $1}')"
echo "=========================================================="
