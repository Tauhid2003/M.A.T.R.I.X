#!/bin/bash
# M.A.T.R.I.X. AI-OS QEMU Headless Boot Verification Script
# Verifies that the compiled live ISO successfully boots and starts system services.

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ISO_PATH="${SCRIPT_DIR}/build/matrix-os-alpha.iso"
LOG_FILE="${SCRIPT_DIR}/qemu_boot.log"
TIMEOUT=60

if [ ! -f "$ISO_PATH" ]; then
  echo "Error: ISO not found at $ISO_PATH"
  echo "Please build the ISO first using build_iso.sh"
  exit 1
fi

if ! command -v qemu-system-x86_64 &> /dev/null; then
  echo "[!] Warning: qemu-system-x86_64 is not installed. Skipping virtual boot test."
  exit 0
fi

echo "[*] Cleaning old boot logs..."
rm -f "$LOG_FILE"

# Determine acceleration support
ACCEL_ARGS=""
if [ -e /dev/kvm ] && [ -w /dev/kvm ]; then
  ACCEL_ARGS="-enable-kvm -cpu host"
  echo "[*] KVM hardware acceleration enabled."
else
  ACCEL_ARGS="-cpu max"
  echo "[*] Virtualization hardware acceleration not available. Running in emulation mode."
fi

echo "[*] Launching headless QEMU instance (Timeout: ${TIMEOUT}s)..."
# Launch QEMU headlessly, redirecting serial output to LOG_FILE
qemu-system-x86_64 \
  $ACCEL_ARGS \
  -m 2G \
  -smp 2 \
  -display none \
  -nographic \
  -serial file:"$LOG_FILE" \
  -drive file="$ISO_PATH",media=cdrom,readonly=on &
QEMU_PID=$!

cleanup() {
  if kill -0 $QEMU_PID 2>/dev/null; then
    echo "[*] Terminating QEMU process (PID: $QEMU_PID)..."
    kill $QEMU_PID || true
    wait $QEMU_PID 2>/dev/null || true
  fi
}
trap cleanup EXIT ERR INT TERM

echo "[*] Waiting for system boot signals in console log..."
START_TIME=$(date +%s)
BOOT_SUCCESS=0

while [ $(($(date +%s) - START_TIME)) -lt $TIMEOUT ]; do
  if [ -f "$LOG_FILE" ]; then
    # Scan for common success indicators in the serial log
    if grep -q "Started matrix-api.service" "$LOG_FILE" || \
       grep -q "Started matrix-daemon.service" "$LOG_FILE" || \
       grep -q "M.A.T.R.I.X API Daemon active" "$LOG_FILE" || \
       grep -q "matrix-os login:" "$LOG_FILE"; then
      BOOT_SUCCESS=1
      break
    fi
  fi
  sleep 2
done

if [ $BOOT_SUCCESS -eq 1 ]; then
  echo "=========================================================="
  echo " [+] BOOT VERIFICATION SUCCESSFUL!"
  echo "     Successfully detected system services starting up."
  echo "=========================================================="
  exit 0
else
  echo "=========================================================="
  echo " [-] BOOT VERIFICATION FAILED: TIMEOUT REACHED"
  echo "     System did not start services within ${TIMEOUT} seconds."
  echo "=========================================================="
  echo "--- Last 30 lines of boot log ---"
  if [ -f "$LOG_FILE" ]; then
    tail -n 30 "$LOG_FILE"
  else
    echo "(Log file is empty or missing)"
  fi
  exit 1
fi
