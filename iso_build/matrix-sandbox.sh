#!/bin/bash
# M.A.T.R.I.X. Bubblewrap & AppArmor Sandbox Wrapper
# Runs a command inside a restricted Bubblewrap namespace container jail under strict MAC rules.

COMMAND=("$@")
if [ ${#COMMAND[@]} -eq 0 ]; then
  COMMAND=(/bin/bash)
fi

if ! command -v bwrap &> /dev/null; then
  echo "Error: bubblewrap (bwrap) is not installed."
  exit 1
fi

if ! command -v aa-exec &> /dev/null; then
  if [ "${MATRIX_SANDBOX_ALLOW_NO_APPARMOR:-}" = "1" ]; then
    echo "Warning: aa-exec not found. AppArmor MAC isolation disabled!"
    AA_PREFIX=()
  else
    echo "Error: aa-exec not found. Refusing to run without AppArmor MAC isolation."
    echo "Set MATRIX_SANDBOX_ALLOW_NO_APPARMOR=1 to override this check."
    exit 1
  fi
else
  AA_PREFIX=(aa-exec -p matrix-sandbox-profile --)
fi

SANDBOX_HOME="/home/matrix"
SANDBOX_UID="$(stat -c '%u' "$SANDBOX_HOME" 2>/dev/null || id -u)"
SANDBOX_GID="$(stat -c '%g' "$SANDBOX_HOME" 2>/dev/null || id -g)"

echo "[Sandbox] Launching command inside Bubblewrap + AppArmor jail..."
"${AA_PREFIX[@]}" bwrap \
  --ro-bind /usr /usr \
  --ro-bind /lib /lib \
  --ro-bind /lib64 /lib64 \
  --ro-bind /bin /bin \
  --ro-bind /sbin /sbin \
  --ro-bind /etc /etc \
  --ro-bind /etc/alternatives /etc/alternatives \
  --dir /tmp \
  --proc /proc \
  --dev /dev \
  --bind /var/lib/matrix /var/lib/matrix \
  --bind "$SANDBOX_HOME" "$SANDBOX_HOME" \
  --unshare-all \
  --unshare-user \
  --uid "$SANDBOX_UID" \
  --gid "$SANDBOX_GID" \
  --cap-drop ALL \
  -- \
  "${COMMAND[@]}"
