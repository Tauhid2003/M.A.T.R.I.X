#!/bin/bash
# M.A.T.R.I.X. Bubblewrap & AppArmor Sandbox Wrapper
# Runs a command inside a restricted Bubblewrap namespace container jail under strict MAC rules.

COMMAND="$@"
if [ -z "$COMMAND" ]; then
  COMMAND="/bin/bash"
fi

if ! command -v bwrap &> /dev/null; then
  echo "Error: bubblewrap (bwrap) is not installed."
  exit 1
fi

if ! command -v aa-exec &> /dev/null; then
  echo "Warning: aa-exec not found. AppArmor MAC isolation disabled!"
  AA_PREFIX=""
else
  AA_PREFIX="aa-exec -p matrix-sandbox-profile "
fi

echo "[Sandbox] Launching command inside Bubblewrap + AppArmor jail..."
$AA_PREFIX bwrap \
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
  --bind /home/matrix /home/matrix \
  --unshare-all \
  $COMMAND
