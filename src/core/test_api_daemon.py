import unittest
import os
import sys
import json
import urllib.request
import urllib.error
import threading
import time
import tempfile

sys.path.append(os.path.dirname(__file__))

from api_daemon import MatrixAPIHandler, HTTPServer, API_TOKEN
from matrix_ai import get_api_token, post_to_scheduler

class TestAPIDaemonAuth(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        cls.temp_dir = tempfile.TemporaryDirectory()
        cls.temp_db = os.path.join(cls.temp_dir.name, "test_scheduler.db")
        os.environ["MATRIX_DB_PATH"] = cls.temp_db
        cls.server = HTTPServer(('127.0.0.1', 8888), MatrixAPIHandler)
        cls.thread = threading.Thread(target=cls.server.serve_forever)
        cls.thread.daemon = True
        cls.thread.start()
        time.sleep(0.5)

    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown()
        cls.server.server_close()
        cls.temp_dir.cleanup()

    def test_token_file_creation(self):
        token_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "matrix_api_token.txt")
        if os.path.exists(token_path):
            with open(token_path, "r", encoding="utf-8") as f:
                content = f.read().strip()
            self.assertTrue(len(content) > 0)

    def test_cli_get_api_token(self):
        token = get_api_token()
        self.assertTrue(len(token) > 0)

    def test_unauthorized_post_returns_401(self):
        url = "http://127.0.0.1:8888/api/scheduler/add-task"
        req_body = json.dumps({"agent_id": "Test", "task_name": "Test Task"}).encode("utf-8")
        req = urllib.request.Request(url, data=req_body, headers={"Content-Type": "application/json"}, method="POST")
        with self.assertRaises(urllib.error.HTTPError) as ctx:
            urllib.request.urlopen(req)
        self.assertEqual(ctx.exception.code, 401)

    def test_authorized_post_with_token(self):
        url = "http://127.0.0.1:8888/api/scheduler/add-task"
        req_body = json.dumps({"agent_id": "Security Auditor", "task_name": "UnitTest Task"}).encode("utf-8")
        headers = {
            "Content-Type": "application/json",
            "X-Matrix-Token": API_TOKEN
        }
        req = urllib.request.Request(url, data=req_body, headers=headers, method="POST")
        with urllib.request.urlopen(req) as resp:
            self.assertEqual(resp.status, 200)

if __name__ == '__main__':
    unittest.main()
