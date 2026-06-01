# M.A.T.R.I.X Package and Driver Baseline

## Objective

Add the practical baseline packages a lightweight Debian Bookworm-based offline OS needs for booting, live media support, hardware enablement, desktop operation, networking, audio, Bluetooth, printing, filesystems, power management, and diagnostics.

## Source Notes

- Debian 12 uses the `non-free-firmware` repository component for firmware that can be included with official installation media.
- Debian's installation guide documents that some hardware requires separate firmware packages.
- Debian Live documentation recommends `live-boot` and `live-config` for live systems.
- Debian PipeWire guidance recommends `pipewire-audio` with WirePlumber and related ALSA/Pulse/Bluetooth compatibility packages.
- Debian community/forum discussion consistently points to enabling `non-free-firmware` and installing relevant firmware packages for Wi-Fi, graphics, and other modern hardware.

## Added Package Groups

### Boot and Live System

- `linux-image-amd64`
- `live-boot`
- `live-config`
- `live-config-systemd`
- `initramfs-tools`
- `grub-pc-bin`
- `grub-efi-amd64-bin`

### Firmware and Microcode

- `firmware-linux-free`
- `firmware-linux-nonfree`
- `firmware-misc-nonfree`
- `firmware-iwlwifi`
- `firmware-realtek`
- `firmware-atheros`
- `firmware-brcm80211`
- `firmware-amd-graphics`
- `firmware-sof-signed`
- `intel-microcode`
- `amd64-microcode`

### Network and Security

- `network-manager`
- `wpasupplicant`
- `wireless-tools`
- `isc-dhcp-client`
- `iproute2`
- `iputils-ping`
- `dnsutils`
- `nftables`
- `openssh-client`
- `openssh-server`

### Graphics, Audio, and Desktop Hardware

- `xserver-xorg-input-libinput`
- `libglx-mesa0`
- `mesa-utils`
- `mesa-vulkan-drivers`
- `va-driver-all`
- `vdpau-driver-all`
- `pipewire-audio`
- `wireplumber`
- `alsa-utils`
- `pavucontrol`
- `bluez`
- `blueman`

### Printing, Scanning, Storage, and Power

- `cups`
- `cups-bsd`
- `printer-driver-all`
- `sane-airscan`
- `e2fsprogs`
- `dosfstools`
- `exfatprogs`
- `ntfs-3g`
- `btrfs-progs`
- `xfsprogs`
- `squashfs-tools`
- `lvm2`
- `cryptsetup`
- `acpi`
- `acpid`
- `upower`
- `power-profiles-daemon`
- `brightnessctl`

### Admin Utilities

- `pciutils`
- `usbutils`
- `lshw`
- `htop`
- `less`
- `nano`
- `vim-tiny`
- `rsync`
- `zip`
- `unzip`
- `bash-completion`
- `locales`
- `tzdata`

## Runtime Offline Rule

These packages are installed into the image during build time. The resulting OS must not require internet access at runtime for boot, desktop, local AI fallback, core scheduling, local storage, or hardware support.

## Notes for Later Optimization

- `printer-driver-all` and firmware metapackages increase image size but improve first-boot hardware coverage.
- Proprietary NVIDIA driver packages were not added by default because they are hardware-specific, heavy, and can complicate Secure Boot. The baseline uses kernel/Mesa/Nouveau-compatible support.
- Wine and Ollama still use build-time network download paths in the existing scripts; they should become offline bundle inputs in a later Package Agent task.
