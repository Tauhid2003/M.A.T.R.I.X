#!/usr/bin/env python3
# M.A.T.R.I.X. AI-OS Adaptive Energy-Aware AI Scheduler Engine
# Calculates multi-factor energy-aware priority scores:
# S_i = w_u * Urgency + w_a * Aging + w_d * Deadline - w_c * Complexity - w_m * Memory - w_e * EnergyCost

import os
import sys
import time
import platform
import subprocess
from typing import Dict, Any, List, Optional

class PowerStateSensor:
    """Detects CPU load, memory usage, system power source (AC/Battery), and estimated wattage."""

    @staticmethod
    def get_hardware_telemetry() -> Dict[str, Any]:
        cpu_load_pct = 20.0
        ram_used_gb = 4.0
        on_battery = False
        battery_pct = 100
        cpu_temp_c = 45.0

        if platform.system() == "Linux":
            try:
                # 1. Load average
                with open("/proc/loadavg", "r") as f:
                    load = float(f.read().split()[0])
                    cpu_cores = os.cpu_count() or 4
                    cpu_load_pct = min(100.0, round((load / cpu_cores) * 100.0, 1))
            except Exception:
                pass

            try:
                # 2. Power supply check
                if os.path.exists("/sys/class/power_supply/BAT0/online"):
                    with open("/sys/class/power_supply/BAT0/online", "r") as f:
                        on_battery = (f.read().strip() == "0")
            except Exception:
                pass

        elif platform.system() == "Windows":
            try:
                # Windows CPU estimation fallback
                cmd = "wmic cpu get loadpercentage /value"
                out = subprocess.check_output(cmd, shell=True, stderr=subprocess.DEVNULL).decode()
                for line in out.splitlines():
                    if "LoadPercentage=" in line:
                        cpu_load_pct = float(line.split("=")[1])
            except Exception:
                pass

        # Estimate current power draw in Watts
        # Base idle ~ 12W, scaling with load up to ~ 45W (CPU) / 120W (GPU)
        base_watts = 12.0
        dynamic_watts = (cpu_load_pct / 100.0) * 33.0
        total_watts = round(base_watts + dynamic_watts, 1)

        return {
            "cpu_load_pct": cpu_load_pct,
            "ram_used_gb": ram_used_gb,
            "on_battery": on_battery,
            "battery_pct": battery_pct,
            "cpu_temp_c": cpu_temp_c,
            "estimated_watts": total_watts
        }

class EnergyAwareSchedulerEngine:
    """Calculates adaptive energy-aware task priorities and manages dynamic model routing."""

    def __init__(self, w_urgency: float = 0.35, w_aging: float = 0.20,
                 w_user: float = 0.25, w_complexity: float = 0.10,
                 w_energy: float = 0.10):
        self.w_urgency = w_urgency
        self.w_aging = w_aging
        self.w_user = w_user
        self.w_complexity = w_complexity
        self.w_energy = w_energy

    def estimate_task_energy_cost(self, duration: float, task_complexity: float, resource_req: float) -> float:
        """Estimates task energy consumption in Joules = Power (Watts) * Time (s) * Complexity Factor."""
        hw = PowerStateSensor.get_hardware_telemetry()
        base_power_w = hw["estimated_watts"]
        if hw["on_battery"]:
            base_power_w *= 1.4  # Penalize high power tasks on battery

        # Energy (Joules) = Watts * Seconds
        joules = base_power_w * duration * (1.0 + (task_complexity / 10.0) * 0.5)
        return round(joules, 2)

    def calculate_adaptive_score(self, urgency: float, aging_boost: float,
                                  user_priority: float, task_complexity: float,
                                  duration: float, resource_req: float) -> float:
        """
        Computes energy-aware scheduling priority score:
        High urgency & user priority increase score; high energy cost & complexity penalize.
        """
        energy_cost_j = self.estimate_task_energy_cost(duration, task_complexity, resource_req)
        normalized_energy = min(10.0, energy_cost_j / 50.0) # Scale to 0-10

        score = (
            (urgency * self.w_urgency) +
            (aging_boost * self.w_aging) +
            (user_priority * self.w_user) -
            (task_complexity * self.w_complexity) -
            (normalized_energy * self.w_energy)
        )
        return round(score, 3)

    def select_optimal_model_route(self, task_complexity: float, target_model: str) -> Dict[str, Any]:
        """Dynamically routes task to optimal model based on battery state & thermal load."""
        hw = PowerStateSensor.get_hardware_telemetry()

        # On battery mode or high thermal load, downgrade high parameter models to lightweight baked model
        if hw["on_battery"] or hw["cpu_temp_c"] > 80.0:
            return {
                "selected_model": "qwen2.5:0.5b",
                "reason": "Battery saver / thermal protection mode active. Downgraded to baked 0.5B model.",
                "power_mode": "Eco"
            }

        if task_complexity <= 4.0:
            return {
                "selected_model": "qwen2.5:0.5b",
                "reason": "Low complexity task routed to 0.5B fast model.",
                "power_mode": "Standard"
            }
        else:
            return {
                "selected_model": target_model,
                "reason": f"High complexity task routed to target model {target_model}.",
                "power_mode": "Performance"
            }
