#!/bin/bash
# M.A.T.R.I.X. Bubblewrap Sandbox Execution Wrapper
# Runs a command inside a restricted Bubblewrap namespace container jail.

COMMAND="$@"
if [ -z "$COMMAND" ]; then
  COMMAND="/bin/bash"
fi

if ! command -v bwrap &> /dev/null; then
  echo "Error: bubblewrap (bwrap) is not installed."
  exit 1
fi

echo "[Bubblewrap] Launching command in sandbox jail..."
bwrap \
  --ro-bind /usr /usr \
  --ro-bind /lib /lib \
  --ro-bind /lib64 /lib64 \
  --ro-bind /bin /bin \
  --ro-bind /sbin /sbin \
  --ro-bind /etc/alternatives /etc/alternatives \
  --dir /tmp \
  --proc /proc \
  --dev /dev \
  --bind /var/lib/matrix /var/lib/matrix \
  --bind /home/matrix /home/matrix \
  --unshare-all \
  $COMMAND
