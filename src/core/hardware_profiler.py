#!/usr/bin/env python3
# M.A.T.R.I.X. AI-OS Hardware Profiler & Model Seeding Engine
# Auto-detects System Hardware (CPU, RAM, GPU VRAM) and returns the optimal local AI config.
# Standard library only to ensure execution in minimal chroot/installer environments.

import os
import sys
import platform
import subprocess
import json
import re

def get_ram_bytes():
    """Detects total system physical RAM in bytes."""
    system = platform.system()
    if system == "Linux":
        try:
            with open("/proc/meminfo", "r") as f:
                for line in f:
                    if "MemTotal" in line:
                        kb = int(re.search(r'\d+', line).group())
                        return kb * 1024
        except Exception:
            pass
    elif system == "Windows":
        try:
            import ctypes
            class MEMORYSTATUSEX(ctypes.Structure):
                _fields_ = [
                    ("dwLength", ctypes.c_ulong),
                    ("dwMemoryLoad", ctypes.c_ulong),
                    ("ullTotalPhys", ctypes.c_ulonglong),
                    ("ullAvailPhys", ctypes.c_ulonglong),
                    ("ullTotalPageFile", ctypes.c_ulonglong),
                    ("ullAvailPageFile", ctypes.c_ulonglong),
                    ("ullTotalVirtual", ctypes.c_ulonglong),
                    ("ullAvailVirtual", ctypes.c_ulonglong),
                    ("ullAvailExtendedVirtual", ctypes.c_ulonglong)
                ]
            stat = MEMORYSTATUSEX()
            stat.dwLength = ctypes.sizeof(MEMORYSTATUSEX)
            ctypes.windll.kernel32.GlobalMemoryStatusEx(ctypes.byref(stat))
            return stat.ullTotalPhys
        except Exception:
            pass
    elif system == "Darwin": # macOS
        try:
            output = subprocess.check_output(["sysctl", "-n", "hw.memsize"])
            return int(output.decode().strip())
        except Exception:
            pass
    # Fallback default: 8 GB
    return 8 * 1024 * 1024 * 1024

def get_nvidia_vram_bytes():
    """Detects total NVIDIA GPU VRAM in bytes via nvidia-smi."""
    try:
        output = subprocess.check_output(
            ["nvidia-smi", "--query-gpu=memory.total", "--format=csv,noheader,nounits"],
            stderr=subprocess.DEVNULL
        )
        mbs = int(output.decode().strip().split('\n')[0])
        return mbs * 1024 * 1024
    except Exception:
        return 0

def get_cpu_cores():
    """Detects logical CPU core count."""
    cores = os.cpu_count()
    return cores if cores else 4

def profile_system():
    ram_bytes = get_ram_bytes()
    ram_gb = round(ram_bytes / (1024 ** 3), 2)
    
    vram_bytes = get_nvidia_vram_bytes()
    vram_gb = round(vram_bytes / (1024 ** 3), 2)
    
    cpu_cores = get_cpu_cores()
    has_nvidia_gpu = vram_bytes > 0
    
    # Selection Tier Decision Matrix
    # We assign scores prioritizing VRAM, falling back to System RAM.
    tier = "Low-End"
    model_name = "qwen2.5:1.5b-instruct"
    model_desc = "Qwen 1.5B (Fast, lightweight CPU execution)"
    recommended_quant = "q4_K_M"
    zram_recommended = False
    thread_count = max(1, cpu_cores - 1)
    gpu_offload_pct = 0
    swappiness = 10

    if has_nvidia_gpu:
        gpu_offload_pct = 100
        if vram_gb >= 12:
            tier = "Workstation"
            model_name = "llama3.3:70b-instruct-q4_K_M"
            model_desc = "Llama-3.3 70B (High reasoning, fully GPU offloaded)"
            recommended_quant = "q4_K_M"
        elif vram_gb >= 8:
            tier = "High-End"
            model_name = "qwen2.5:14b-instruct"
            model_desc = "Qwen 14B (High intelligence, GPU accelerated)"
            recommended_quant = "q4_K_M"
        else: # 3GB - 6GB VRAM
            tier = "Mid-Range"
            model_name = "llama3:8b-instruct"
            model_desc = "Llama-3 8B (Standard intelligence, GPU offloaded)"
            recommended_quant = "q4_K_M"
            gpu_offload_pct = int(min(100, (vram_gb / 6.0) * 100))
    else:
        # CPU Mode
        if ram_gb >= 32:
            tier = "Workstation"
            model_name = "qwen2.5:14b-instruct"
            model_desc = "Qwen 14B (Reasoning model running on high RAM CPU)"
            recommended_quant = "q4_K_M"
        elif ram_gb >= 16:
            tier = "High-End"
            model_name = "llama3:8b-instruct"
            model_desc = "Llama-3 8B (Medium parameter model on CPU)"
            recommended_quant = "q4_K_M"
        elif ram_gb >= 8:
            tier = "Mid-Range"
            model_name = "qwen2.5:3b-instruct"
            model_desc = "Qwen 3B (Highly optimized balance for 8GB RAM CPU)"
            recommended_quant = "q4_K_M"
        else: # < 8GB RAM
            tier = "Low-End"
            model_name = "qwen2.5:1.5b-instruct"
            model_desc = "Qwen 1.5B (Designed to run in ultra-low memory footprints)"
            recommended_quant = "q4_K_M"
            zram_recommended = True
            swappiness = 5

    # Synthesize natural local voice model recommendation
    # Lower-end platforms use the lightweight Piper voice; workstation tiers run expressive TTS profiles.
    tts_recommendation = {
        "engine": "Piper TTS" if tier in ["Low-End", "Mid-Range"] else "Kokoro TTS",
        "model_file": "en_US-lessac-medium.onnx" if tier in ["Low-End", "Mid-Range"] else "kokoro-v0.9.onnx",
        "quality": "medium (real-time on CPU)" if tier in ["Low-End", "Mid-Range"] else "high (neural synthesis)"
    }

    profile = {
        "hardware": {
            "platform": platform.system(),
            "platform_release": platform.release(),
            "cpu_cores": cpu_cores,
            "system_ram_gb": ram_gb,
            "gpu_detected": "NVIDIA GPU" if has_nvidia_gpu else "CPU-Only / Integrated",
            "gpu_vram_gb": vram_gb
        },
        "classification": {
            "tier": tier,
            "performance_score": round((vram_gb * 3.0) + (ram_gb * 0.5) + (cpu_cores * 0.2), 1)
        },
        "seeder": {
            "recommended_llm": model_name,
            "llm_description": model_desc,
            "quantization": recommended_quant,
            "ollama_threads": thread_count,
            "gpu_offload_percentage": gpu_offload_pct
        },
        "tts": tts_recommendation,
        "optimizations": {
            "enable_zram": zram_recommended,
            "recommended_zram_gb": round(ram_gb * 1.5, 1) if zram_recommended else 0.0,
            "vm_swappiness": swappiness,
            "page_caching_defense": True if tier == "Low-End" else False
        }
    }
    return profile

def print_safe(msg):
    try:
        print(msg)
    except UnicodeEncodeError:
        # Strip out emojis and non-ascii symbols for narrow codepage consoles
        clean_msg = msg.encode('ascii', 'ignore').decode('ascii')
        print(clean_msg)

def main():
    if hasattr(sys.stdout, 'reconfigure'):
        try:
            sys.stdout.reconfigure(encoding='utf-8')
        except Exception:
            pass

    print_safe("==========================================================")
    print_safe("M.A.T.R.I.X. AI-OS Hardware Profiler Audit Starting...")
    print_safe("==========================================================")
    
    profile = profile_system()
    
    # Save profile config to disk
    config_file = "matrix_hardware_profile.json"
    with open(config_file, "w") as f:
        json.dump(profile, f, indent=4)
        
    print_safe(f"\nAudit complete. Target classification saved to: {config_file}\n")
    print_safe("----------------------------------------------------------")
    print_safe(f"[*] Host System Type:     {profile['hardware']['platform']} ({profile['hardware']['gpu_detected']})")
    print_safe(f"[*] CPU Logical Cores:     {profile['hardware']['cpu_cores']}")
    print_safe(f"[*] Total System RAM:      {profile['hardware']['system_ram_gb']} GB")
    print_safe(f"[*] Discrete GPU VRAM:     {profile['hardware']['gpu_vram_gb']} GB")
    print_safe("----------------------------------------------------------")
    print_safe(f"[#] CLASSIFIED TIER:       {profile['classification']['tier'].upper()}")
    print_safe(f"[#] Performance Index:     {profile['classification']['performance_score']}")
    print_safe("----------------------------------------------------------")
    print_safe(f"[+] Model Seeding Profile:")
    print_safe(f"   - Target LLM:          {profile['seeder']['recommended_llm']}")
    print_safe(f"   - Type/Desc:           {profile['seeder']['llm_description']}")
    print_safe(f"   - CPU Inference Thrs:  {profile['seeder']['ollama_threads']} threads")
    print_safe(f"   - GPU Layer Offload:   {profile['seeder']['gpu_offload_percentage']}%")
    print_safe("----------------------------------------------------------")
    print_safe(f"[+] TTS Voice Engine Profile:")
    print_safe(f"   - Engine Class:        {profile['tts']['engine']}")
    print_safe(f"   - Voice Target Model:  {profile['tts']['model_file']}")
    print_safe(f"   - Synthesis Depth:     {profile['tts']['quality']}")
    print_safe("----------------------------------------------------------")
    print_safe(f"[+] Dynamic OS Optimization Tweaks:")
    print_safe(f"   - Swappiness Ratio:    {profile['optimizations']['vm_swappiness']}")
    if profile['optimizations']['enable_zram']:
        print_safe(f"   - ZRAM Virtual Swap:   ENABLED (Allocating {profile['optimizations']['recommended_zram_gb']} GB virtual buffer)")
    else:
        print_safe(f"   - ZRAM Virtual Swap:   DISABLED (Sufficient native memory available)")
    print_safe("==========================================================")

if __name__ == "__main__":
    main()
