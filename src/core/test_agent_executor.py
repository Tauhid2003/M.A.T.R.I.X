import unittest
import os
import sys

sys.path.append(os.path.dirname(__file__))

from agent_executor import AgentExecutor

class TestAgentExecutor(unittest.TestCase):

    def test_security_audit_step(self):
        res1 = AgentExecutor.execute_task_step("Security Auditor", "Scan", 1, 3)
        self.assertIn("File Integrity", res1)

        res2 = AgentExecutor.execute_task_step("Security Auditor", "Scan", 2, 3)
        self.assertIn("Socket Audit", res2)

    def test_filesystem_cleanup_step(self):
        res1 = AgentExecutor.execute_task_step("Filesystem Stripper", "Clean", 1, 2)
        self.assertIn("Storage Inspection", res1)

        res2 = AgentExecutor.execute_task_step("Filesystem Stripper", "Clean", 2, 2)
        self.assertIn("Purge Complete", res2)

    def test_network_guard_step(self):
        res = AgentExecutor.execute_task_step("Network Guard", "Inspect", 1, 2)
        self.assertIn("Interface Verification", res)

    def test_code_builder_step(self):
        res = AgentExecutor.execute_task_step("Code Builder", "Build", 1, 2)
        self.assertIn("AST Syntax Analysis", res)

    def test_data_analyst_step(self):
        res = AgentExecutor.execute_task_step("Data Analyst", "Analyze", 1, 1)
        self.assertIn("Telemetry Processing", res)

if __name__ == '__main__':
    unittest.main()
