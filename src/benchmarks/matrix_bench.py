#!/usr/bin/env python3
# M.A.T.R.I.X. AI-OS Reproducible Benchmark Suite (matrix-bench)
# Comparative evaluation engine across FIFO, SJF, RR, Priority, and MATRIX Adaptive Energy-Aware Schedulers.

import os
import sys
import time
import json
import random
import argparse
from datetime import datetime
from typing import List, Dict, Any

# Ensure imports work from project root & src directory
src_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if src_dir not in sys.path:
    sys.path.append(src_dir)
project_root = os.path.abspath(os.path.join(src_dir, ".."))
if project_root not in sys.path:
    sys.path.append(project_root)

from scheduler.scheduler_daemon import AgentTask
from scheduler.energy_aware_scheduler import EnergyAwareSchedulerEngine, PowerStateSensor

class BenchmarkWorkloadGenerator:
    """Generates synthetic multi-agent workloads with realistic parameter distributions."""

    AGENT_TYPES = [
        "Security Auditor", "Filesystem Stripper", "Network Guard",
        "Data Analyst", "Code Builder", "Wine Translator", "Self Improver"
    ]

    @staticmethod
    def generate_task_set(num_tasks: int, seed: int = 42) -> List[AgentTask]:
        random.seed(seed)
        tasks = []
        for i in range(num_tasks):
            agent = random.choice(BenchmarkWorkloadGenerator.AGENT_TYPES)
            duration = round(random.uniform(0.5, 4.0), 2)
            complexity = round(random.uniform(1.0, 10.0), 1)
            urgency = round(random.uniform(1.0, 10.0), 1)
            resource_req = round(random.uniform(1.0, 10.0), 1)
            user_prio = round(random.uniform(1.0, 10.0), 1)

            t = AgentTask(
                db_id=i + 1,
                agent_id=agent,
                task_name=f"BenchTask-{i+1}",
                duration=duration,
                task_complexity=complexity,
                urgency=urgency,
                resource_requirements=resource_req,
                user_priority=user_prio
            )
            tasks.append(t)
        return tasks

class MATRIXBenchmarkEngine:
    """Runs reproducible benchmark sweeps across scheduling policies."""

    ALGORITHMS = ["fifo", "sjf", "rr", "priority", "matrix_adaptive"]

    @staticmethod
    def calculate_jains_fairness(allocations: List[float]) -> float:
        """Computes Jain's Fairness Index: J = (sum(x_i))^2 / (n * sum(x_i^2))."""
        if not allocations:
            return 1.0
        n = len(allocations)
        sum_x = sum(allocations)
        sum_sq_x = sum(x ** 2 for x in allocations)
        if sum_sq_x == 0:
            return 1.0
        return round((sum_x ** 2) / (n * sum_sq_x), 4)

    @staticmethod
    def simulate_algorithm_run(algorithm: str, task_set: List[AgentTask]) -> Dict[str, Any]:
        # Deep copy tasks
        tasks = []
        for t in task_set:
            ct = AgentTask(
                db_id=t.db_id, agent_id=t.agent_id, task_name=t.task_name, duration=t.duration,
                task_complexity=t.task_complexity, urgency=t.urgency, resource_requirements=t.resource_requirements,
                user_priority=t.user_priority
            )
            tasks.append(ct)

        energy_engine = EnergyAwareSchedulerEngine()
        start_time = time.time()
        completed_tasks = []
        waiting_times = []
        energy_consumed_joules = 0.0

        current_time = 0.0
        active_queue = list(tasks)

        while active_queue:
            # Sort or pick next task according to policy
            if algorithm == "fifo":
                next_task = active_queue.pop(0)
                slice_dur = next_task.remaining_time
            elif algorithm == "sjf":
                active_queue.sort(key=lambda x: x.remaining_time)
                next_task = active_queue.pop(0)
                slice_dur = next_task.remaining_time
            elif algorithm == "rr":
                next_task = active_queue.pop(0)
                slice_dur = min(1.0, next_task.remaining_time)
            elif algorithm == "priority":
                for x in active_queue:
                    x.priority = x.calculate_priority()
                active_queue.sort(key=lambda x: x.priority, reverse=True)
                next_task = active_queue.pop(0)
                slice_dur = next_task.remaining_time
            else: # matrix_adaptive
                for x in active_queue:
                    x.priority = energy_engine.calculate_adaptive_score(
                        urgency=x.urgency,
                        aging_boost=x.executed_time * 0.1,
                        user_priority=x.user_priority,
                        task_complexity=x.task_complexity,
                        duration=x.duration,
                        resource_req=x.resource_requirements
                    )
                active_queue.sort(key=lambda x: x.priority, reverse=True)
                next_task = active_queue.pop(0)
                slice_dur = next_task.remaining_time

            # Compute waiting time and execution
            waiting_time = current_time - next_task.executed_time
            waiting_times.append(max(0.0, waiting_time))
            current_time += slice_dur

            # Calculate estimated energy (Joules)
            task_energy = energy_engine.estimate_task_energy_cost(slice_dur, next_task.task_complexity, next_task.resource_requirements)
            energy_consumed_joules += task_energy

            next_task.remaining_time -= slice_dur
            next_task.executed_time += slice_dur

            if next_task.remaining_time > 0.01:
                active_queue.append(next_task)
            else:
                completed_tasks.append(next_task)

        total_elapsed = round(time.time() - start_time, 4)
        num_completed = len(completed_tasks)
        throughput = round(num_completed / max(0.001, current_time), 2)
        mean_latency = round((current_time / max(1, num_completed)) * 1000.0, 2)
        mean_waiting = round((sum(waiting_times) / max(1, len(waiting_times))) * 1000.0, 2)
        fairness = MATRIXBenchmarkEngine.calculate_jains_fairness(waiting_times)
        joules_per_task = round(energy_consumed_joules / max(1, num_completed), 2)

        return {
            "algorithm": algorithm,
            "tasks_simulated": num_completed,
            "simulated_time_sec": round(current_time, 2),
            "real_benchmark_latency_sec": total_elapsed,
            "throughput_tasks_per_sec": throughput,
            "mean_task_latency_ms": mean_latency,
            "mean_waiting_time_ms": mean_waiting,
            "jains_fairness_index": fairness,
            "total_energy_joules": round(energy_consumed_joules, 2),
            "joules_per_task": joules_per_task
        }

    @staticmethod
    def run_benchmark_suite(num_tasks: int = 50, runs: int = 3) -> Dict[str, Any]:
        print(f"==========================================================")
        print(f"Starting M.A.T.R.I.X. AI-OS Reproducible Benchmark Suite")
        print(f"Workload: {num_tasks} multi-agent tasks | Iterations: {runs}")
        print(f"==========================================================")

        results = []
        for algo in MATRIXBenchmarkEngine.ALGORITHMS:
            print(f"[*] Benchmarking scheduling policy: {algo.upper()}...")
            run_metrics = []
            for r in range(runs):
                tasks = BenchmarkWorkloadGenerator.generate_task_set(num_tasks, seed=42 + r)
                res = MATRIXBenchmarkEngine.simulate_algorithm_run(algo, tasks)
                run_metrics.append(res)

            # Average over runs
            avg_res = {
                "algorithm": algo.upper(),
                "throughput_tasks_per_sec": round(sum(m["throughput_tasks_per_sec"] for m in run_metrics) / runs, 2),
                "mean_task_latency_ms": round(sum(m["mean_task_latency_ms"] for m in run_metrics) / runs, 2),
                "mean_waiting_time_ms": round(sum(m["mean_waiting_time_ms"] for m in run_metrics) / runs, 2),
                "jains_fairness_index": round(sum(m["jains_fairness_index"] for m in run_metrics) / runs, 4),
                "total_energy_joules": round(sum(m["total_energy_joules"] for m in run_metrics) / runs, 2),
                "joules_per_task": round(sum(m["joules_per_task"] for m in run_metrics) / runs, 2)
            }
            results.append(avg_res)

        print("\n---------------------------------------------------------------------------------------------------")
        print(f"{'Algorithm':<20} | {'Throughput (t/s)':<18} | {'Latency (ms)':<14} | {'Fairness':<10} | {'Joules/Task':<12}")
        print("---------------------------------------------------------------------------------------------------")
        for r in results:
            print(f"{r['algorithm']:<20} | {r['throughput_tasks_per_sec']:<18} | {r['mean_task_latency_ms']:<14} | {r['jains_fairness_index']:<10} | {r['joules_per_task']:<12}")
        print("---------------------------------------------------------------------------------------------------\n")

        return {
            "timestamp": datetime.now().isoformat(),
            "config": {"num_tasks": num_tasks, "runs": runs},
            "benchmark_results": results
        }

def main():
    parser = argparse.ArgumentParser(description="M.A.T.R.I.X. AI-OS Reproducible Benchmark Suite")
    parser.add_argument("--tasks", type=int, default=50, help="Number of multi-agent tasks per run")
    parser.add_argument("--runs", type=int, default=3, help="Number of benchmark iterations")
    parser.add_argument("--out", type=str, default="matrix_benchmark_report.json", help="Output report JSON file path")
    args = parser.parse_args()

    report = MATRIXBenchmarkEngine.run_benchmark_suite(num_tasks=args.tasks, runs=args.runs)
    with open(args.out, "w") as f:
        json.dump(report, f, indent=4)
    print(f"[+] Benchmark report saved cleanly to: {args.out}")

if __name__ == "__main__":
    from datetime import datetime
    main()
