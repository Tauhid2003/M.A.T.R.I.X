#!/usr/bin/env python3
# M.A.T.R.I.X. AI-OS First-Boot Configurator
# Imports the hardware profiler, tunes system configurations, sets up ZRAM, 
# and updates the SQLite database with optimal model parameters.

import os
import sys
import sqlite3
import json
import subprocess
import platform

# Ensure we can import from the same directory
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
try:
    from hardware_profiler import profile_system, print_safe
except ImportError:
    print("Error: Could not import hardware_profiler.py.")
    sys.exit(1)

DB_PATH = "/var/lib/matrix/scheduler.db"
SENTINEL_PATH = "/var/lib/matrix/.firstboot_done"

# Cross-platform fallback paths for local testing
if platform.system() == "Windows":
    project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
    DB_PATH = os.path.join(project_root, "scheduler.db")
    SENTINEL_PATH = os.path.join(project_root, ".firstboot_done")

def init_database_defaults(profile):
    """Saves the auto-detected optimal model parameters into the scheduler DB."""
    print_safe(f"[*] Initializing database configuration targets at: {DB_PATH}")
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Initialize basic schema in case it hasn't run yet
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS system_config (
            key TEXT PRIMARY KEY,
            value TEXT
        )
    """)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS cache_metrics (
            key TEXT PRIMARY KEY,
            value INTEGER
        )
    """)
    
    # Save the recommended model parameters
    model = profile["seeder"]["recommended_llm"]
    threads = str(profile["seeder"]["ollama_threads"])
    tier = profile["classification"]["tier"]
    
    cursor.execute("INSERT OR REPLACE INTO system_config (key, value) VALUES ('algorithm', 'Priority')")
    cursor.execute("INSERT OR REPLACE INTO system_config (key, value) VALUES ('default_model', ?)", (model,))
    cursor.execute("INSERT OR REPLACE INTO system_config (key, value) VALUES ('ollama_threads', ?)", (threads,))
    cursor.execute("INSERT OR REPLACE INTO system_config (key, value) VALUES ('system_tier', ?)", (tier,))
    
    cursor.execute("INSERT OR IGNORE INTO cache_metrics (key, value) VALUES ('hits', 0)")
    cursor.execute("INSERT OR IGNORE INTO cache_metrics (key, value) VALUES ('misses', 0)")
    
    conn.commit()
    conn.close()
    print_safe(f"[+] Seeding configuration done. Model set to: {model} ({threads} threads)")

def apply_linux_optimizations(profile):
    """Applies kernel and swap modifications (Linux host only)."""
    if platform.system() != "Linux":
        print_safe("[*] Dry-Run Mode: Skipping Linux kernel optimizations on non-Linux platform.")
        return

    # 1. Update Swappiness value
    swappiness = profile["optimizations"]["vm_swappiness"]
    try:
        print_safe(f"[*] Adjusting kernel swappiness to: {swappiness}")
        with open("/proc/sys/vm/swappiness", "w") as f:
            f.write(str(swappiness))
    except Exception as e:
        print_safe(f"[!] Warning: Failed to set swappiness: {e}")

    # 2. Configure ZRAM Swapping if recommended
    if profile["optimizations"]["enable_zram"]:
        zram_gb = profile["optimizations"]["recommended_zram_gb"]
        zram_bytes = int(zram_gb * 1024 * 1024 * 1024)
        print_safe(f"[*] Allocating ZRAM Swap buffer: {zram_gb} GB")
        try:
            # Load kernel module
            subprocess.check_call(["modprobe", "zram"])
            # Set compressor algorithm
            with open("/sys/block/zram0/comp_algorithm", "w") as f:
                f.write("lz4")
            # Set size
            with open("/sys/block/zram0/disksize", "w") as f:
                f.write(str(zram_bytes))
            # Format and turn on swap
            subprocess.check_call(["mkswap", "/dev/zram0"])
            subprocess.check_call(["swapon", "/dev/zram0", "-p", "32767"])
            print_safe("[+] ZRAM dynamic compression successfully enabled.")
        except Exception as e:
            print_safe(f"[!] Error: Failed to configure ZRAM: {e}")

def create_sentinel():
    """Writes the first-boot completion sentinel file."""
    try:
        with open(SENTINEL_PATH, "w") as f:
            f.write("M.A.T.R.I.X OS Auto-Tuning Complete.\n")
        print_safe(f"[+] Sentinel created: {SENTINEL_PATH}")
    except Exception as e:
        print_safe(f"[!] Error: Failed to write sentinel: {e}")

def main():
    print_safe("==========================================================")
    print_safe("M.A.T.R.I.X. AI-OS First-Boot Auto-Tuning Execution...")
    print_safe("==========================================================")
    
    # Audit hardware
    profile = profile_system()
    
    # Seed default database variables
    init_database_defaults(profile)
    
    # Apply system swap/ZRAM settings
    apply_linux_optimizations(profile)
    
    # Flag firstboot completion
    create_sentinel()
    
    print_safe("==========================================================")
    print_safe("First-Boot Setup completed successfully!")
    print_safe("==========================================================")

if __name__ == "__main__":
    main()
