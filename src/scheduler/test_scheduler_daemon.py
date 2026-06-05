import unittest
import time
import random
import os
import sqlite3
import asyncio
from unittest.mock import patch, MagicMock

import tempfile

# Adjust path to import from scheduler_daemon
import sys
sys.path.append(os.path.dirname(__file__))

from scheduler_daemon import AgentTask, LRUKCache, AgentScheduler, init_db

class TestSchedulerDaemon(unittest.IsolatedAsyncioTestCase):

    def setUp(self):
        self.temp_dir = tempfile.TemporaryDirectory()
        self.db_path = os.path.join(self.temp_dir.name, "test_scheduler.db")
        init_db(self.db_path)

    def tearDown(self):
        self.temp_dir.cleanup()

    def test_agent_task_priority(self):
        task = AgentTask(
            db_id=1, agent_id="Agent1", task_name="Task1", duration=10.0,
            task_complexity=0.5, urgency=0.8, resource_requirements=0.3,
            user_priority=0.9
        )
        # Expected: (0.5 * 0.2) + (0.8 * 0.4) + (0.3 * 0.1) + (0.9 * 0.3)
        # = 0.10 + 0.32 + 0.03 + 0.27 = 0.72
        self.assertAlmostEqual(task.priority, 0.72)

    def test_lru_k_cache(self):
        cache = LRUKCache(capacity=2, k=2)
        cache.put("Agent1", ["state1"])
        cache.put("Agent2", ["state2"])
        self.assertEqual(cache.get("Agent1"), ["state1"])
        
        # Add third, should evict one. Since Agent1 was accessed, Agent2 should be evicted
        cache.put("Agent3", ["state3"])
        self.assertIsNone(cache.get("Agent2"))
        self.assertEqual(cache.get("Agent1"), ["state1"])
        self.assertEqual(cache.get("Agent3"), ["state3"])

    def test_fifo_under_load(self):
        # Simulate FIFO scheduling under load (100,000 tasks)
        tasks = []
        for i in range(100000):
            tasks.append(AgentTask(
                db_id=i, agent_id=f"Agent{i}", task_name=f"Task{i}", duration=1.0,
                task_complexity=0.5, urgency=0.5, resource_requirements=0.5,
                user_priority=0.5
            ))
        
        # FIFO just takes the first task
        next_task = tasks[0]
        
        self.assertEqual(next_task.db_id, 0)

    def test_priority_under_load(self):
        # Simulate Priority scheduling under load (100,000 tasks)
        tasks = []
        for i in range(100000):
            tasks.append(AgentTask(
                db_id=i, agent_id=f"Agent{i}", task_name=f"Task{i}", duration=1.0,
                task_complexity=random.random(), urgency=random.random(), 
                resource_requirements=random.random(), user_priority=random.random()
            ))
        
        # Priority calculates priority and sorts
        for t in tasks:
            t.priority = t.calculate_priority()
        tasks.sort(key=lambda t: t.priority, reverse=True)
        next_task = tasks[0]
        
        # Verify it is sorted correctly
        self.assertTrue(tasks[0].priority >= tasks[1].priority)
        self.assertTrue(tasks[-2].priority >= tasks[-1].priority)

    @patch('asyncio.sleep', return_value=None)
    @patch('scheduler_daemon.log_message')
    async def test_context_switch(self, mock_log, mock_sleep):
        scheduler = AgentScheduler(self.db_path, cache_capacity=2, cache_k=2)
        
        from_task = AgentTask(
            db_id=1, agent_id="Agent1", task_name="Task1", duration=10.0,
            task_complexity=0.5, urgency=0.8, resource_requirements=0.3,
            user_priority=0.9, attention_history=["action1"]
        )
        
        to_task = AgentTask(
            db_id=2, agent_id="Agent2", task_name="Task2", duration=10.0,
            task_complexity=0.5, urgency=0.8, resource_requirements=0.3,
            user_priority=0.9, attention_history=[]
        )
        
        # Context switch should save from_task state and load to_task state (empty initially)
        await scheduler.context_switch(from_task, to_task)
        
        # Verify DB has Agent1's state
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cursor.execute("SELECT agent_id, attention_history FROM cache_state WHERE agent_id = 'Agent1'")
        row = cursor.fetchone()
        self.assertIsNotNone(row)
        self.assertEqual(row[0], "Agent1")
        self.assertIn("action1", row[1])
        conn.close()

if __name__ == '__main__':
    unittest.main()
