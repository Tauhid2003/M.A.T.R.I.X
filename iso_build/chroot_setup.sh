#!/bin/bash
# M.A.T.R.I.X. AI-OS chroot configuration script
# This script executes inside the debootstrap chroot environment.

set -e
export DEBIAN_FRONTEND=noninteractive

echo "=========================================================="
echo "Starting chroot configuration for M.A.T.R.I.X. AI-OS..."
echo "=========================================================="

# 0. Enable contrib, non-free, and non-free-firmware repositories
if [ -f /etc/apt/sources.list ] && ! grep -q "contrib" /etc/apt/sources.list; then
    echo "Enabling contrib, non-free, and non-free-firmware repositories..."
    sed -i 's/main/main contrib non-free non-free-firmware/g' /etc/apt/sources.list
fi

# 1. Update source repositories and install bootstrap tools
apt-get update
apt-get install -y --no-install-recommends \
    python3 \
    curl \
    ca-certificates \
    gnupg

# 2. Configure Wine Developer repositories
echo "Configuring Wine Developer repositories..."
dpkg --add-architecture i386
mkdir -pm 755 /etc/apt/keyrings
if curl -fsSL --connect-timeout 10 https://dl.winehq.org/wine-builds/winehq.key | gpg --dearmor -o /etc/apt/keyrings/winehq-archive.key 2>/dev/null; then
    echo "deb [signed-by=/etc/apt/keyrings/winehq-archive.key] https://dl.winehq.org/wine-builds/debian/ bookworm main" | tee /etc/apt/sources.list.d/winehq.list
    apt-get update
else
    echo "[!] Warning: Failed to fetch Wine key. Building offline."
fi

# 3. Read and install all specified packages from sys_spec.json (Single Source of Truth)
echo "Parsing packages to include from sys_spec.json..."
PACKAGES=$(python3 -c "
import json
with open('/sys_spec.json') as f:
    data = json.load(f)
    print(' '.join(data.get('packages_to_include', [])))
")
echo "Installing packages specified in sys_spec.json..."
apt-get install -y --no-install-recommends $PACKAGES

# 4. Download and set up Ollama AI Engine offline binary
if [ -f /usr/local/bin/ollama ]; then
    echo "Using preloaded offline Ollama binary."
else
    echo "Downloading and installing Ollama system daemon..."
    curl -fsSL https://ollama.com/install.sh | sh || true
fi

# 5. Set up system user, folders, and logger files
if ! id -u matrix &>/dev/null; then
    echo "Creating dedicated matrix system user..."
    useradd -m -s /bin/bash matrix
fi

mkdir -p /var/lib/matrix
chown -R matrix:matrix /var/lib/matrix
chmod 750 /var/lib/matrix

# Create log files with matrix user ownership
touch /var/log/matrix_scheduler.log
touch /var/log/matrix_api_audit.log
chown matrix:matrix /var/log/matrix_scheduler.log /var/log/matrix_api_audit.log
chmod 640 /var/log/matrix_scheduler.log /var/log/matrix_api_audit.log

# Ensure execution flags are set for workspace-copied daemons
chmod +x /usr/local/bin/matrix_scheduler.py
chmod +x /usr/local/bin/api_daemon.py

# 6. Enable system services
echo "Enabling systemd service profiles..."
systemctl enable matrix-firstboot || true
systemctl enable matrix-daemon || true
systemctl enable matrix-api || true

# 7. Setting up Hostname and Hosts mappings
echo "matrix-os" > /etc/hostname
cat << 'EOF' > /etc/hosts
127.0.0.1   localhost
127.0.1.1   matrix-os

# The following lines are desirable for IPv6 capable hosts
::1     localhost ip6-localhost ip6-loopback
ff02::1 ip6-allnodes
ff02::2 ip6-allrouters
EOF

# 7.5 Compile and install matrix_core Kernel Module
echo "Compiling matrix_core Kernel Module..."
if [ -d /usr/src/matrix_core ]; then
    cd /usr/src/matrix_core
    # Find the installed kernel version
    KVER=$(ls /lib/modules | sort -V | tail -n 1)
    echo "Detected kernel version for module compilation: $KVER"
    make KERNELRELEASE=$KVER
    mkdir -p /lib/modules/$KVER/kernel/drivers/char/
    cp matrix_core.ko /lib/modules/$KVER/kernel/drivers/char/
    depmod -a $KVER
    echo "matrix_core" >> /etc/modules
    cd /
fi

# 8. Perform filesystem compilation cleanup to reduce SquashFS size
echo "Performing filesystem compilation cleanup..."
apt-get clean
rm -rf /var/lib/apt/lists/*
rm -rf /tmp/*

echo "=========================================================="
echo "Chroot setup completed successfully!"
echo "=========================================================="

