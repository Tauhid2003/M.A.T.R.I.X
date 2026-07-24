import unittest
import os
import sys

src_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if src_dir not in sys.path:
    sys.path.append(src_dir)
project_root = os.path.abspath(os.path.join(src_dir, ".."))
if project_root not in sys.path:
    sys.path.append(project_root)

from benchmarks.matrix_bench import BenchmarkWorkloadGenerator, MATRIXBenchmarkEngine

class TestMATRIXBenchmarkSuite(unittest.TestCase):

    def test_workload_generator(self):
        tasks = BenchmarkWorkloadGenerator.generate_task_set(20, seed=123)
        self.assertEqual(len(tasks), 20)
        self.assertTrue(1.0 <= tasks[0].task_complexity <= 10.0)

    def test_jains_fairness_index(self):
        # Equal allocations -> fairness == 1.0
        fair1 = MATRIXBenchmarkEngine.calculate_jains_fairness([10.0, 10.0, 10.0, 10.0])
        self.assertEqual(fair1, 1.0)

        # Skewed allocations -> fairness < 1.0
        fair2 = MATRIXBenchmarkEngine.calculate_jains_fairness([1.0, 100.0, 1.0, 1.0])
        self.assertTrue(fair2 < 0.6)

    def test_algorithm_benchmark_run(self):
        tasks = BenchmarkWorkloadGenerator.generate_task_set(10, seed=42)
        res = MATRIXBenchmarkEngine.simulate_algorithm_run("matrix_adaptive", tasks)
        self.assertEqual(res["algorithm"], "matrix_adaptive")
        self.assertEqual(res["tasks_simulated"], 10)
        self.assertTrue(res["joules_per_task"] > 0)

    def test_full_benchmark_suite(self):
        report = MATRIXBenchmarkEngine.run_benchmark_suite(num_tasks=10, runs=1)
        self.assertIn("benchmark_results", report)
        self.assertEqual(len(report["benchmark_results"]), 5)

if __name__ == '__main__':
    unittest.main()
