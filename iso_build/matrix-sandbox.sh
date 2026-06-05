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
if [ ! -e "$SANDBOX_HOME" ]; then
  echo "Error: sandbox home $SANDBOX_HOME is missing. Refusing to run."
  exit 1
fi

SANDBOX_UID="$(stat -c '%u' "$SANDBOX_HOME")"
SANDBOX_GID="$(stat -c '%g' "$SANDBOX_HOME")"
if [ "$SANDBOX_UID" -eq 0 ] || [ "$SANDBOX_GID" -eq 0 ]; then
  if [ "${MATRIX_SANDBOX_ALLOW_ROOT:-}" = "1" ]; then
    echo "Warning: sandbox home is owned by root; privilege drop overridden."
  else
    echo "Error: sandbox home is root-owned. Refusing to run without privilege drop."
    echo "Set MATRIX_SANDBOX_ALLOW_ROOT=1 to override this check."
    exit 1
  fi
fi

SANDBOX_HOME_BIND=(--ro-bind "$SANDBOX_HOME" "$SANDBOX_HOME")
if [ "${MATRIX_SANDBOX_ALLOW_HOME_WRITE:-}" = "1" ]; then
  SANDBOX_HOME_BIND=(--bind "$SANDBOX_HOME" "$SANDBOX_HOME")
fi

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
  "${SANDBOX_HOME_BIND[@]}" \
  --unshare-all \
  --unshare-user \
  --uid "$SANDBOX_UID" \
  --gid "$SANDBOX_GID" \
  --cap-drop ALL \
  -- \
  "${COMMAND[@]}"
