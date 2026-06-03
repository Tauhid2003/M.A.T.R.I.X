#!/bin/bash
# M.A.T.R.I.X. Sandbox and AppArmor Profile Verification Test
# Runs inside the compiled environment (or on a test machine) to verify sandboxing.

set -e

echo "=== Running M.A.T.R.I.X Sandbox Verification ==="

# 1. Check Bubblewrap
if command -v bwrap &> /dev/null; then
  echo "[+] Bubblewrap is installed."
  # Test a simple sandbox run: check if we can write inside a read-only bind
  echo "[*] Testing Bubblewrap write restriction in read-only bind..."
  if bwrap --ro-bind /usr /usr --unshare-all touch /usr/bin/test_write 2>&1 | grep -q "Read-only file system"; then
    echo "    -> PASS: Writable check in read-only mount blocked as expected."
  else
    echo "    -> WARNING: Writable check did not raise expected read-only error."
  fi
else
  echo "[!] Bubblewrap (bwrap) not found. Skipping runtime jail test."
fi

# 2. Check AppArmor
if command -v apparmor_parser &> /dev/null; then
  echo "[+] AppArmor tools are installed."
  PROFILE_PATH="/etc/apparmor.d/matrix-sandbox-profile"
  if [ ! -f "$PROFILE_PATH" ]; then
    PROFILE_PATH="$(dirname "$0")/matrix-sandbox-profile"
  fi
  
  if [ -f "$PROFILE_PATH" ]; then
    echo "[*] Validating AppArmor profile syntax ($PROFILE_PATH)..."
    if apparmor_parser -Q "$PROFILE_PATH" 2>&1; then
      echo "    -> PASS: AppArmor profile syntax is valid."
    else
      echo "    -> FAIL: AppArmor profile validation failed!"
      exit 1
    fi
  else
    echo "[!] Profile file matrix-sandbox-profile not found."
  fi
else
  echo "[!] AppArmor parser tools not found. Skipping profile load check."
fi

echo "=== Sandbox Verification Complete ==="
